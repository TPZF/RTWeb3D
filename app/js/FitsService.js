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
 * Fits service
 */
define( [ "jquery.ui", "gw/FeatureStyle", "ProgressBar", "fits" ],
			function($, FeatureStyle, ProgressBar) {

var globe = null;
var features = [];
var form = '<div id="fitsOptions">\
				<input name="fitsScale" type="radio" id="raw" checked="checked" /><label for="raw">Raw</label>\
				<input name="fitsScale" type="radio" id="minmax" /><label for="minmax">Min/Max</label>\
	  	 		<input name="fitsScale" type="radio" id="log" /><label for="log">Log</label>\
	  	 		<div id="contrastDiv">\
	  	 			<label for="contrastValue">Contrast level:</label>\
					<input type="text" id="contrastValue" style="border: 0; background-color: transparent; width: 40px; color: #F6931F; font-weight: bold;" />\
					<div style="width: 150px" id="contrastSlider"></div>\
				</div>\
	  	 	</div>';

var progressBarsDiv = '<div id="progressBars"></div>';
var $progressBars = $(progressBarsDiv).appendTo('body');

var progressBars = {};

var layers = [];
var contrast = 1.;

var logFragShader= "\
	precision highp float; \n\
	uniform vec4 color;\n\
	varying vec2 vTextureCoord;\n\
	uniform sampler2D texture; \n\
	uniform float contrast; \n\
	void main(void)\n\
	{\n\
		float texColor = texture2D(texture, vTextureCoord).r;\n\
		texColor = log(10000.0*(texColor/255.) + 1.)/log(10000.);\n\
		gl_FragColor = ((vec4(texColor,texColor,texColor,1.) - 0.5) * contrast + 0.5 ) * color;\n\
	}\n\
	";

var minmaxFragShader = "\
	precision highp float; \n\
	uniform vec4 color;\n\
	varying vec2 vTextureCoord;\n\
	uniform sampler2D texture; \n\
	uniform float contrast; \n\
	uniform float min; \n\
	uniform float max; \n\
	void main(void)\n\
	{\n\
		float texColor = texture2D(texture, vTextureCoord).r;\n\
		texColor = ((texColor - min) / (max - min));\n\
		gl_FragColor = ((vec4(texColor,texColor,texColor,1.) - 0.5) * contrast + 0.5 ) * color;\n\
	}\n\
	";

var minmaxUniformCallback = function(gl, renderable)
{
	gl.uniform1f(renderable.polygonProgram.uniforms["max"], renderable.style.fillTexture.max);
	gl.uniform1f(renderable.polygonProgram.uniforms["min"], renderable.style.fillTexture.min);
	gl.uniform1f(renderable.polygonProgram.uniforms["contrast"], contrast);
}

var logUniformCallback = function(gl, renderable)
{
	gl.uniform1f(renderable.polygonProgram.uniforms["contrast"], contrast);
}

var minmaxFillShader = {
	fragmentCode: minmaxFragShader,
	updateUniforms: minmaxUniformCallback
}

var logFillShader = {
	fragmentCode: logFragShader,
	updateUniforms: logUniformCallback
};

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
 *	Compute min/max of fits data and stock it as texture parameters
 *
 *	@param pixels Fits data
 *	@param texture glTexture
 */
function computeMinMax(pixels, texture)
{
	var max = pixels[0];
    var min = pixels[0];
    for ( var i=1; i<pixels.length; i++ )
    {
        var val = pixels[i];

        if ( max < val )
            max = val;
        if ( min > val )
            min = val;
    }
    texture.min = min;
    texture.max = max;
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
	$('#quicklook').removeClass('selected');
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
    xhr.send();

    progressBars[ featureData.feature.properties.identifier ] = new ProgressBar(globe, featureData, xhr);
}

/**
 *	Handle fits data on selected feature
 */
function handleFits(response, selectedFeature)
{
	var fitsData = parseFits(response);

	var pixels = new Float32Array( fitsData.view.buffer, fitsData.begin, fitsData.length/4 ); // with gl.FLOAT

	// Create fits texture
	var gl = globe.renderContext.gl;
    var tex = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, 
        gl.LUMINANCE, fitsData.width, fitsData.height, 0, 
        gl.LUMINANCE, gl.FLOAT, pixels);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);


	// Attach texture to style
    var style = selectedFeature.feature.properties.style;
    style.fill = true;
    style.fillTexture = tex;
    computeMinMax(pixels, style.fillTexture);
    selectedFeature.layer.modifyFeatureStyle( selectedFeature.feature, style );
    
    features.push(selectedFeature);
}

return {

	init: function(gl)
	{
		globe = gl;
		var self = this;
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
			removeFits(selectedData);
		});
	},

	/**
	 *	Add layer to the service
	 */
	addLayer: function(layer)
	{
		layers.push(layer);
	},

	/**
	 *	Remove layer from the service
	 */
	removeLayer: function(layer)
	{
		for(var i=0; i<layers.length; i++)
		{
			if(layers[i].id == layer.id)
			{
				layers.splice(i,1);
			}
		}
	},

	/**
	 *	Add service to the jQueryUI tabs
	 *
	 *	@param tabs jQuery tabs selector
	 */
	addService: function(tabs)
	{
		// Append header
		$('<li style="display : none;"><a href="#FitsService">Fits</a></li>')
			.appendTo( tabs.children( ".ui-tabs-nav" ) )
			.fadeIn(300);
		// Append content
		tabs.append('<div id="FitsService"></div>');

		// Define click actions for inputs
		var $form = $(form).appendTo('#FitsService');
		$form.buttonset();
		$form.find('input')
				.each(function(i){
					$(this)
						.click(function(){
							
							var id = $(this).attr("id");
							switch(id){
								case "minmax":
									$( "#contrastSlider" ).slider( "enable" );
									for ( var i=0; i<features.length; i++)
									{
										var feature = features[i].feature;
										var targetStyle = new FeatureStyle( feature.properties.style );
										targetStyle.fillShader = minmaxFillShader;
										features[i].layer.modifyFeatureStyle( feature, targetStyle );
									}

									break;
								case "log":
									$( "#contrastSlider" ).slider( "enable" );
									for ( var i=0; i<features.length; i++)
									{
										var feature = features[i].feature;
										var targetStyle = new FeatureStyle( feature.properties.style );
										targetStyle.fillShader = logFillShader;
										features[i].layer.modifyFeatureStyle( feature, targetStyle );
									}
									break;
								case "raw":
									$( "#contrastSlider" ).slider( "disable" );
									for ( var i=0; i<features.length; i++)
									{
										var feature = features[i].feature;
										var targetStyle = new FeatureStyle( feature.properties.style );
										targetStyle.fillShader = {
											fragmentCode: null,
											updateUniforms: null
										};
										features[i].layer.modifyFeatureStyle( feature, targetStyle );
									}
									break;
								default:
									break;
							}
						});
				});
			
		$( "#contrastSlider" ).slider({
			value:1,
			min: 0,
			max: 10,
			step: 0.1,
			slide: function( event, ui ) {
				contrast = ui.value;
				$( "#contrastValue" ).val( ui.value );
			}
		}).slider("disable");
		$( "#contrastValue" ).val( $( "#contrastSlider" ).slider( "value" ) );
	},

	/**
	 *	Remove service from jQueryUI tabs
	 *
	 *	@param tabs jQuery tabs selector
	 */
	removeService: function(tabs)
	{
		tabs.find( '.ui-tabs-nav li[aria-controls="FitsService"]').fadeOut(300, function(){
			var index = $(this).index();
			tabs.tabs("remove",index);
		});
	}
}

});