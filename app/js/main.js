
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
	'jquery.ui.selectmenu': {
            deps: ['jquery.ui'],
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

// Console fix	
window.console||(console={log:function(){}});
	
// Private variable
var globe = null;
var navigation = null;

function hideLoading()
{
	$('#loading').hide(300);
}

/**
 *	Function updating fov box
 */
function updateFov()
{
	var fov = navigation.getFov();
	var fovx = Utils.roundNumber( fov[0], 2 ) ;
	fovx = GlobWeb.CoordinateSystem.fromDegreesToDMS( fovx, true );
	var fovy = Utils.roundNumber( fov[1], 2 ) ;
	fovy = GlobWeb.CoordinateSystem.fromDegreesToDMS( fovy, true );
	$('#fov').html( "Fov : " + fovx + " x " + fovy );
}

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
		document.getElementById('GlobWebCanvas').style.display = "none";
		document.getElementById('loading').style.display = "none";
		document.getElementById('webGLNotAvailable').style.display = "block";
	}
	
	// When level zero texture is loaded, hide loading
	globe.subscribe("levelZeroTextureLoaded", hideLoading);
	
	// Context lost listener
	canvas.addEventListener("webglcontextlost", function(event) {
		// TODO
		event.preventDefault();
		document.getElementById('loading').style.display = "none";
		document.getElementById('webGLContextLost').style.display = "block";
	}, false);
	
	// Initialize navigation
	navigation = new GlobWeb.AstroNavigation(globe, {minFov: 0.05});
	updateFov();
	
	// Click event to show equatorial coordinates
	$("#GlobWebCanvas").click(function(event){
		if(event.ctrlKey){
			var equatorial = [];
			geo = globe.getLonLatFromPixel(event.pageX, event.pageY);
			
			GlobWeb.CoordinateSystem.fromGeoToEquatorial ( geo, equatorial );

			$("#equatorialCoordinates").html("<em>Right ascension:</em> <br/>&nbsp&nbsp&nbsp&nbsp" + equatorial[0] +"<br /><em>Declination :</em> <br/>&nbsp&nbsp&nbsp&nbsp" + equatorial[1]);
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
	
	// Add wheel listeners updating fov box
	canvas.addEventListener("DOMMouseScroll",function(e) { e.preventDefault(); updateFov(); },false);
	canvas.addEventListener("mousewheel",function(e) { e.preventDefault(); updateFov(); },false);
});

});
