
/**
 * Configuration for require.js
 */
require.config({
    paths: {
        "jquery": "jquery-1.8.2.min",
		"jquery.ui": "jquery-ui-1.8.23.custom.min",
		"GlobWeb": "GlobWeb.min"
   },
	shim: {
		'jquery': {
            deps: [],
            exports: 'jQuery'
        },
		'jquery.ui': {
            deps: ['jquery'],
            exports: 'jQuery'
        },
		'GlobWeb': {
            deps: [],
            exports: 'GlobWeb'
        }
	}
  });

/**
 * Main module
 */
require( ["jquery.ui", "LayerManager", "NameResolver", "Utils"], function($, LayerManager, NameResolver, Utils) {
	
// Private variable
var globe = null;
var navigation = null;

$(function()
{	
	// Create accordeon
	$( "#accordion" ).accordion( { autoHeight: false, active: 0, collapsible: true } );
		
	var canvas = document.getElementById('GlobWebCanvas');

	// Make canvas fullscreen
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	
	// Take into account window resize
	$(window).resize(function() {
		if ( canvas.width !=  window.innerWidth ) 
			canvas.width = window.innerWidth;
		if ( canvas.height != window.innerHeight )
			canvas.height = window.innerHeight;
	});
	
	// Initialize globe
	try
	{
		globe = new GlobWeb.Globe( { 
			canvas: canvas, 
			continuousRendering: true
		} );
	}
	catch (err)
	{
		document.getElementById('HEALPixCanvas').style.display = "none";
		document.getElementById('webGLNotAvailable').style.display = "block";
	}
	
	
	// Initialize navigation
	navigation = new GlobWeb.AstroNavigation(globe);
	
	// Click event to show equatorial coordinates
	$("#HEALPixCanvas").click(function(event){
		if(event.ctrlKey){
			var equatorial = [];
			geo = globe.getLonLatFromPixel(event.pageX, event.pageY);
			
			GlobWeb.CoordinateSystem.fromGeoToEquatorial ( geo, equatorial );
			
			var equatorialString = Utils.equatorialLayout(equatorial);
			$("#equatorialCoordinates").html("<em>Right ascension:</em> <br/>&nbsp&nbsp&nbsp&nbsp" + equatorialString[0] +"<br /><em>Declination :</em> <br/>&nbsp&nbsp&nbsp&nbsp" + equatorialString[1] +"\"");
		}
	});
	
	// Retreive configuration
	$.getJSON("js/conf.json", function(data) {
	
		// Add stats
		if ( data.stats.visible ) {
			new GlobWeb.Stats( globe, { element: "fps", verbose: data.stats.verbose });
		} else  {
			$("#fps").hide();
		}
		
		// Initialize the name resolver
		NameResolver.init(navigation,data.nameResolver);
	
		// Create layers from configuration file
		LayerManager.init(globe,data.layers);
	});
	
	
});

});
