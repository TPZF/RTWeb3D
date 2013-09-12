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
define( [ "jquery.ui", "gw/FeatureStyle", "gw/DynamicImage", "DynamicImageView", "SimpleProgressBar", "FitsLoader", "ImageViewer", "fits" ],
			function($, FeatureStyle, DynamicImage, DynamicImageView, SimpleProgressBar, FitsLoader, ImageViewer) {

var globe = null;
var progressBars = {};

/**********************************************************************************************/

/**
 *	Send XHR request for FITS file
 *
 *	@param featureData Feature data(layer,feature)
 *	@param url Url of fits file
 */
function computeFits(featureData, url)
{
	// Remove all spaces from identifier
	var id = "imageView_" + featureData.feature.properties.identifier.replace(/\s{1,}|\.{1,}/g, "") + "true";
	var progressBar = new SimpleProgressBar( { id: id } );

	var xhr = FitsLoader.loadFits(url, function(fitsData){
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

	// Create dynamic image view and attach it to feature
	feature.div = new DynamicImageView({
		image : image,
		activator: 'dynamicImageView',
		id: feature.properties.identifier,
		url: featureData.feature.services.download.url,
		changeShaderCallback: function(contrast){
			if ( contrast == "raw" )
			{
				var targetStyle = new FeatureStyle( feature.properties.style );
				targetStyle.fillShader = {
					fragmentCode: null,
					updateUniforms: null
				};
				layer.modifyFeatureStyle( feature, targetStyle );
			}
			else
			{
				var targetStyle = new FeatureStyle( feature.properties.style );
				targetStyle.fillShader = {
					fragmentCode: image.fragmentCode,
					updateUniforms: image.updateUniforms
				};
				layer.modifyFeatureStyle( feature, targetStyle );
			}
		},
		disable: function(){
			$('#dynamicImageView').removeClass('dynamicAvailable').addClass('dynamicNotAvailable');	
		},
		unselect: function(){
			$('#dynamicImageView').removeClass('selected');
		}
	});

	// Enable dynamic image view
	$('#dynamicImageView').addClass('dynamicAvailable').removeClass('dynamicNotAvailable');

	// Attach texture to style
	var targetStyle = new FeatureStyle( feature.properties.style );
	targetStyle.fillTexture = image.texture;
	targetStyle.uniformValues = image;
	layer.modifyFeatureStyle( feature, targetStyle );
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
	
	// Remove dynamic image view
	if ( featureData.feature.div )
	{
		featureData.feature.div.remove();
		delete featureData.feature.div;
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
	init: function(pm, g, nav)
	{
		globe = g;

		// Enable float texture extension to have higher luminance range
		var ext = globe.renderContext.gl.getExtension("OES_texture_float");
		if (!ext) {
			// TODO 
			alert("no OES_texture_float");
			return;
		}

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
			var url = "/sitools/proxy?external_url=" + encodeURIComponent(featureData.feature.services.download.url);
			computeFits(featureData, url);
			$('#quicklookFits').addClass('selected');
		}
		else
		{
			style.fillTextureUrl = "/sitools/proxy?external_url=" + featureData.feature.properties.quicklook + "&rewrite_redirection=true";
			// For DEBUG : 'upload/ADP_WFI_30DOR_RGB_V1.0_degraded.jpg';
			$('#quicklook').addClass('selected');
		}
		featureData.layer.modifyFeatureStyle( featureData.feature, style );

		// Show image viewer
		ImageViewer.show();
	}
}

/**********************************************************************************************/

});