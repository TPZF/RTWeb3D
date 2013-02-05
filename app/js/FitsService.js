/**
 * Fits service
 */
define( [ "jquery.ui", "fits" ], function($) {

var globe = null;
var features = [];
var form = '<div id="fitsOptions">\
				<input name="fitsScale" type="radio" id="raw" checked="checked" /><label for="raw">Raw</label>\
				<input name="fitsScale" type="radio" id="minmax" /><label for="minmax">Min/Max</label>\
	  	 		<input name="fitsScale" type="radio" id="log" /><label for="log">Log</label>\
	  	 	</div>';

var progressBarDiv = '<div class="progressDiv contentBox" id="progress">\
						<div class="progressId"></div>\
						<div id="progressBar">\
							<div class="progress-label"></div>\
						</div>\
						<button style="margin-left: auto; display: block; margin-top: 10px;" id="cancelFitsRequest">Cancel</button>\
					</div>';

var $progress = $(progressBarDiv).appendTo('body');
$progress.find('button').button().end()
		.find('#cancelFitsRequest').click(cancelRequest);

/**
 *	Show progress bar
 *
 *	@param featureData Feature data
 */
function showProgressBar(featureData)
{
	$progress.data("feature", featureData);
	$progress.find('.progressId').html(featureData.feature.properties.identifier);
    $progress.find('#progressBar').progressbar({
    	value: false,
    	change: function() {
    		$(this).find('.progress-label').text( $(this).progressbar( "value" ) + "%");
    	},
    	complete: function() {
    		hideProgressBar();
    		$(this).find('.progress-label').text( "100%" );
    	}
    });

    $progress.animate({right: 50}, 500, function(){
    	$(this).animate({right:20});
    });
}

/**
 *	Hide progress bar
 */
function hideProgressBar()
{
	$progress.animate({right: 50}, function(){
		$(this).animate({right:-260}, 500, function(){
			$('#progress .progressId').html("");
		});
	});
}

/**
 *	Cancel the xhr request
 */
function cancelRequest()
{
	xhr.abort();
	hideProgressBar();
	
	var selectedFeature = $progress.data("feature");
 	var style = selectedFeature.feature.properties.style;
 	style.fill = false;
	selectedFeature.layer.modifyFeatureStyle( selectedFeature.feature, style );
	$('#quicklook').removeClass('selected');
}

/**
 *	Update progress bar event
 */
function updateProgressbar(evt)
{
	if (evt.lengthComputable) 
	{
		//evt.loaded the bytes browser receive
		//evt.total the total bytes seted by the header

		var percentComplete = Math.floor( (evt.loaded / evt.total)*100 );
		$('#progressBar').progressbar( "value", percentComplete );
	}
}

var layers = [];

var logFragShader= "\
	precision highp float; \n\
	uniform vec4 u_color;\n\
	varying vec2 vTextureCoord;\n\
	uniform sampler2D texture; \n\
	void main(void)\n\
	{\n\
		float color = texture2D(texture, vTextureCoord).r;\n\
		color = log(10000.0*(color/255.) + 1.)/log(10000.);\n\
		gl_FragColor = vec4(color,color,color,1.) * u_color;\n\
	}\n\
	";

var minmaxFragShader = "\
	precision highp float; \n\
	uniform vec4 u_color;\n\
	varying vec2 vTextureCoord;\n\
	uniform sampler2D texture; \n\
	uniform float min; \n\
	uniform float max; \n\
	void main(void)\n\
	{\n\
		float color = texture2D(texture, vTextureCoord).r;\n\
		color = ((color - min) / (max - min));\n\
		gl_FragColor = vec4(color,color,color,1.) * u_color;\n\
	}\n\
	";

var minmaxUniformCallback = function(gl, renderable)
{
	gl.uniform1f(renderable.program.uniforms["max"], renderable.texture.max);
	gl.uniform1f(renderable.program.uniforms["min"], renderable.texture.min);
}

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
	featureData.feature.properties.style.fillTexture = null;
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
	xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    
    xhr.responseType = 'arraybuffer';
    xhr.onprogress = updateProgressbar;
    xhr.onload = function(e) {
		handleFits(xhr.response, featureData);
    }
    xhr.send();

    showProgressBar(featureData);
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
			computeFits(context.selectedFeature, context.url);
		});

		globe.subscribe("removeFitsRequested", function( selectedFeature ){
			removeFits(selectedFeature);
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
		tabs.find( ".ui-tabs-nav" ).append('<li><a href="#FitsService">Fits</a></li>');
		tabs.append('<div id="FitsService"></div>');
		var $form = $(form).appendTo('#FitsService');
		$form.buttonset();
		$form.find('input')
				.each(function(i){
					$(this)
						.click(function(){
							
							var id = $(this).attr("id");
							switch(id){
								case "minmax":
									for ( var i=0; i<features.length; i++)
									{
										var feature = features[i].feature;
										var targetStyle = new GlobWeb.FeatureStyle( feature.properties.style );
										targetStyle.fillShader = {
											fragmentCode: minmaxFragShader,
											updateUniforms: minmaxUniformCallback
										};
										features[i].layer.modifyFeatureStyle( feature, targetStyle );
									}

									break;
								case "log":
									for ( var i=0; i<features.length; i++)
									{
										var feature = features[i].feature;
										var targetStyle = new GlobWeb.FeatureStyle( feature.properties.style );
										targetStyle.fillShader = {
											fragmentCode: logFragShader
										};
										features[i].layer.modifyFeatureStyle( feature, targetStyle );
									}
									break;
								case "raw":
									for ( var i=0; i<features.length; i++)
									{
										var feature = features[i].feature;
										var targetStyle = new GlobWeb.FeatureStyle( feature.properties.style );
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

		tabs.tabs("refresh");

	},

	/**
	 *	Remove service from jQueryUI tabs
	 *
	 *	@param tabs jQuery tabs selector
	 */
	removeService: function(tabs)
	{
		var index = tabs.find( '.ui-tabs-nav li[aria-controls="FitsService"]').index();
		tabs.tabs("remove",index);
	}
}

});
