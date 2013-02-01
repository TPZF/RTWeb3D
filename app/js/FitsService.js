/**
 * Fits service
 */
define( [ "jquery.ui" ], function($) {

var globe = null;
var features = [];
var form = '<div id="fitsOptions">\
				<input name="fitsScale" type="radio" id="raw" checked="checked" /><label for="raw">Raw</label>\
				<input name="fitsScale" type="radio" id="minmax" /><label for="minmax">Min/Max</label>\
	  	 		<input name="fitsScale" type="radio" id="log" /><label for="log">Log</label>\
	  	 	</div>';

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

return {

	init: function(gl)
	{
		globe = gl;
		globe.subscribe("fitsAdded", function( featureData ){
			features.push(featureData);
		});
	},

	/**
	 *	Add layer to the service
	 */
	addLayer: function(layer)
	{
		layers.push(layer);
	},

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

	removeService: function(tabs)
	{
		var index = tabs.find( '.ui-tabs-nav li[aria-controls="FitsService"]').index();
		tabs.tabs("remove",index);
	}
}

});
