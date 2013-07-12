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
 * Fits manager
 */
define( [ "jquery.ui", "gw/FeatureStyle", "gw/DynamicImage", "DynamicImageView", "ProgressBar", "fits" ],
			function($, FeatureStyle, DynamicImage, DynamicImageView, ProgressBar) {

var globe = null;

var progressBarsDiv = '<div id="progressBars"></div>';
var $progressBars = $(progressBarsDiv).appendTo('body');

var progressBars = {};

/**
 *	Parse fits file
 *
 *	@param response XHR response containing fits
 *
 *	@return Parsed data
 */
function parseFits(response)
{
	var FITS = astro.FITS;
    // Initialize the FITS.File object using
    // the array buffer returned from the XHR
    var fits = new FITS.File(response);
    // Grab the first HDU with a data unit
    var hdu = fits.getHDU();
    var data = hdu.data;

    var uintPixels;
    var swapPixels = new Uint8Array( data.view.buffer, data.begin, data.length ); // with gl.UNSIGNED_byte

    for ( var i=0; i<swapPixels.length; i+=4 )
    {
        var temp = swapPixels[i];
        swapPixels[i] = swapPixels[i+3];
        swapPixels[i+3] = temp;

        temp = swapPixels[i+1];
        swapPixels[i+1] = swapPixels[i+2];
        swapPixels[i+2] = temp;
    }
    
    return data;
}

/**
 *	Remove fits texture from feature
 */
function removeFits(featureData)
{
	var gl = globe.renderContext.gl;
	var texture = featureData.feature.properties.style.fillTexture;
	if ( texture )
	{
		gl.deleteTexture( texture );
	}
 	var style = new FeatureStyle( featureData.feature.properties.style );
	style.fillTexture = null;
	style.fill = false;
	featureData.layer.modifyFeatureStyle( featureData.feature, style );
}

/**
 *	Send XHR request for FITS file
 *
 *	@param featureData Feature data(layer,feature)
 *	@param url Url of fits file
 */
function computeFits(featureData, url)
{
	// Enable float texture extension to have higher luminance range
	var ext = globe.renderContext.gl.getExtension("OES_texture_float");
    if (!ext) {
    	// TODO 
        alert("no OES_texture_float");
        return;
    }
	var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(e) {
    	delete progressBars[featureData.feature.properties.identifier];
		handleFits(xhr.response, featureData);
    }
    progressBars[ featureData.feature.properties.identifier ] = new ProgressBar(globe, featureData, xhr);
    xhr.send();
}

/**
 *	Handle fits data on selected feature
 */
function handleFits(response, selectedData)
{
	var fitsData = parseFits(response);

	var pixels = new Float32Array( fitsData.view.buffer, fitsData.begin, fitsData.length/4 ); // with gl.FLOAT

	// Create new image coming from Fits
	var gl = globe.renderContext.gl;
	var image = new DynamicImage(gl, pixels, gl.LUMINANCE, gl.FLOAT, fitsData.width, fitsData.height);
	
	// Create dynamic image view and attach it to feature
	new DynamicImageView({image : image, featureData: selectedData, activator: 'dynamicImageView'});

	// Attach texture to style
	var targetStyle = new FeatureStyle( selectedData.feature.properties.style );
	targetStyle.fillTexture = image.texture;
    selectedData.layer.modifyFeatureStyle( selectedData.feature, targetStyle );
}

return {

	init: function(g)
	{
		globe = g;
		globe.subscribe("fitsRequested", function( context ){
			computeFits(context.selectedData, context.url);
		});

		globe.subscribe("removeFitsRequested", function( selectedData ){
			var progress = progressBars[selectedData.feature.properties.identifier];
			if ( progress )
			{
				progress.cancel();
				delete progressBars[selectedData.feature.properties.identifier];
			}

			if ( selectedData.feature.div )
			{
				selectedData.feature.div.remove();
				delete selectedData.feature.div;
			}

			// Detach texture from style
			var targetStyle = new FeatureStyle( selectedData.feature.properties.style );

			// TODO move it
			targetStyle.fillShader = {
				fragmentCode: null,
				updateUniforms : null
			};
			delete targetStyle.uniformValues;
			targetStyle.fillTexture = null;

		    selectedData.layer.modifyFeatureStyle( selectedData.feature, targetStyle );

			removeFits(selectedData);
		});
	},
}

});