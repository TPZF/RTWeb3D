/******************************************************************************* 
* Copyright 2012, 2013 CNES - CENTRE NATIONAL d'ETUDES SPATIALES 
* 
* This file is part of SITools2. 
* 
* SITools2 is free software: you can redistribute it and/or modify 
* it under the terms of the GNU General Public License as published by 
* the Free Software Foundation, either version 3 of the License, or 
* (at your option) any later version. 
* 
* SITools2 is distributed in the hope that it will be useful, 
* but WITHOUT ANY WARRANTY; without even the implied warranty of 
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
* GNU General Public License for more details. 
* 
* You should have received a copy of the GNU General Public License 
* along with SITools2. If not, see <http://www.gnu.org/licenses/>. 
******************************************************************************/ 

/**
 * Image manager
 */
define( [ "jquery", "gw/FeatureStyle", "gw/DynamicImage", "./SimpleProgressBar", "./FitsLoader", "./ImageViewer", "./Utils", "./ImageProcessing", "fits" ],
			function($, FeatureStyle, DynamicImage, SimpleProgressBar, FitsLoader, ImageViewer, Utils, ImageProcessing) {

var globe = null;
var progressBars = {};
var sitoolsBaseUrl;

/**********************************************************************************************/

/**
 *	Send XHR request for FITS file
 *
 *	@param featureData Feature data(layer,feature)
 *	@param url Url of fits file
 */
function computeFits(featureData, url, preprocessing)
{
	// Remove all spaces from identifier
	var id = "imageView_" + Utils.formatId(featureData.feature.properties.identifier) + "_fits";
	var progressBar = new SimpleProgressBar( { id: id } );

	var xhr = FitsLoader.loadFits(url, function(fits){
		var fitsData = fits.getHDU().data;

		if ( preprocessing )
		{
			preprocessing(featureData, fits);
		}

		handleFits(fitsData, featureData);
	}, null, progressBar.onprogress.bind(progressBar));

	// Store xhr to cancel if needed
	progressBars[ featureData.feature.properties.identifier ] = xhr;
}

/**********************************************************************************************/

/**
 *	Handle fits data on the given feature
 */
function handleFits(fitsData, featureData)
{
	// Create new image coming from Fits
	var typedArray = new Float32Array( fitsData.view.buffer, fitsData.begin, fitsData.length/4); // with gl.FLOAT
	var gl = globe.renderContext.gl;
	var image = new DynamicImage(globe.renderContext, typedArray, gl.LUMINANCE, gl.FLOAT, fitsData.width, fitsData.height);

	var feature = featureData.feature;
	var layer = featureData.layer;
	// Attach texture to style
	var targetStyle;
	if ( feature.properties.style )
	{
		targetStyle = new FeatureStyle( feature.properties.style );
	}
	else
	{
		targetStyle = new FeatureStyle( layer.style );
	}
	targetStyle.fillTexture = image.texture;
	targetStyle.uniformValues = image;
	targetStyle.fill = true;
	layer.modifyFeatureStyle( feature, targetStyle );

	// Store image url for zScale processing
	if ( feature.services )
	{
		image.url = feature.services.download.url;
	}

	// Set image on image processing popup
	ImageProcessing.setImage(image);
}

/**********************************************************************************************/

/**
 *	Remove fits
 */
function removeFits(featureData)
{
	var id = featureData.feature.properties.identifier;
	//Remove progress bar if inprogress
	var progressXhr = progressBars[id];
	if ( progressXhr )
	{
		progressXhr.abort();
		delete progressBars[id];
	}

	removeFitsFromRenderer(featureData);
}

/**********************************************************************************************/

/**
 *	Remove fits texture from feature
 */
function removeFitsFromRenderer(featureData)
{
	var gl = globe.renderContext.gl;
	if ( featureData.feature.properties.style.uniformValues )
	{
		featureData.feature.properties.style.uniformValues.dispose();
	}
	// TODO : style could still contain fillTextures, is it normal ?
	var texture = featureData.feature.properties.style.fillTexture;
	if ( texture )
	{
		gl.deleteTexture( texture );
	}
 	var targetStyle = new FeatureStyle( featureData.feature.properties.style );
	targetStyle.fillTexture = null;
	targetStyle.fill = false;

	// Remove rendering
	targetStyle.fillShader = {
		fragmentCode: null,
		updateUniforms : null
	};
	delete targetStyle.uniformValues;

	featureData.layer.modifyFeatureStyle( featureData.feature, targetStyle );
}

/**********************************************************************************************/

return {

	/**
	 *	Initialize
	 */
	init: function(pm, g, nav, configuration)
	{
		globe = g;
		sitoolsBaseUrl = configuration.sitoolsBaseUrl;
		// Enable float texture extension to have higher luminance range
		var ext = globe.renderContext.gl.getExtension("OES_texture_float");
		ImageViewer.init(g, nav, pm, this);
	},

	/**********************************************************************************************/

	/**
	 *	Hide image	
	 */
	hideImage: function(featureData)
	{
		var style = new FeatureStyle( featureData.feature.properties.style );
		style.fill = false;
		featureData.layer.modifyFeatureStyle( featureData.feature, style );
	},

	/**********************************************************************************************/

	/**
	 *	Show image	
	 */
	showImage: function(featureData)
	{
		// Attach texture to style
		var targetStyle = new FeatureStyle( featureData.feature.properties.style );
		targetStyle.fill = true;
	    featureData.layer.modifyFeatureStyle( featureData.feature, targetStyle );
	},

	/**********************************************************************************************/

	/**
	 *	Remove image from renderer
	 */
	removeImage: function(featureData, isFits)
	{
		ImageViewer.removeView(featureData, isFits);
		if ( isFits )
		{
			removeFits(featureData);
			$('#quicklookFits').removeClass('selected');
		}
		else 
		{
			var style = featureData.feature.properties.style;
			style.fill = false;
			style.fillTextureUrl = null;
			featureData.layer.modifyFeatureStyle( featureData.feature, style );
			$('#quicklook').removeClass('selected');
		}
	},

	/**********************************************************************************************/

	/**
	 *	Start download of texture
	 */
	addImage: function(featureData, isFits)
	{
		// Set fill to true while loading
		var style = new FeatureStyle( featureData.feature.properties.style );
		style.fill = true;

		ImageViewer.addView(featureData, isFits);
		if ( isFits )
		{
			var url = sitoolsBaseUrl+"/sitools/proxy?external_url=" + encodeURIComponent(featureData.feature.services.download.url);
			computeFits(featureData, url);
			$('#quicklookFits').addClass('selected');
		}
		else
		{
			style.fillTextureUrl = sitoolsBaseUrl + "/sitools/proxy?external_url=" + featureData.feature.properties.quicklook + "&rewrite_redirection=true";
			// For DEBUG : 'upload/ADP_WFI_30DOR_RGB_V1.0_degraded.jpg';
			$('#quicklook').addClass('selected');
		}
		featureData.layer.modifyFeatureStyle( featureData.feature, style );

		// Show image viewer
		ImageViewer.show();
	},
	
	computeFits: computeFits,
	handleFits: handleFits
}

/**********************************************************************************************/

});