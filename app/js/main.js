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
 * Configuration for require.js
 */
require.config({
	paths: {
		"jquery": "../externals/jquery-1.8.2.min",
		"jquery.ui": "../externals/jquery-ui-1.9.2.custom.min",
		"jquery.ui.selectmenu": "../externals/jquery.ui.selectmenu",
		"underscore-min": "../externals/underscore-min",
		"jquery.nicescroll.min": "../externals/jquery.nicescroll.min",
		"fits": "../externals/fits",
		"samp": "../externals/samp",
		"gzip": "../externals/gzip",
		"crc32": "../externals/crc32",
		"deflate-js": "../externals/deflate",
		"inflate-js": "../externals/inflate",
		"wcs": "../externals/wcs",
		"jquery.ui.timepicker": "../externals/jquery.ui.timepicker",
		"gw": "../externals/GlobWeb/src/"
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
		'jquery.ui.timepicker': {
			deps: ['jquery.ui'],
			exports: 'jQuery'
		},
		'underscore-min': {
			deps: ['jquery'],
			exports: '_'
		},
		'jquery.nicescroll.min': {
			deps: ['jquery'],
			exports: ''
		},
		'gzip' : {
			deps: ['deflate-js', 'inflate-js', 'crc32'],
			exports: 'gZip'
		}
	},
	waitSeconds: 0
});

/**
 * Main module
 */
require( ["jquery.ui", "gw/EquatorialCoordinateSystem", "gw/Globe", "gw/Stats", "gw/AstroNavigation", "gw/AttributionHandler", "gw/VectorLayer",
	"LayerManager", "NameResolver", "ReverseNameResolver", "Utils", "PickingManager", "FeaturePopup", "IFrame", "Compass", "MollweideViewer", "ErrorDialog", "AboutDialog", "Share", "Samp", "AdditionalLayersView", "ImageManager", "ImageViewer", "UWSManager", "PositionTracker", "MeasureTool", "StarProvider", "ConstellationProvider", "JsonProvider", "OpenSearchProvider",
	"gw/ConvexPolygonRenderer", "gw/PointSpriteRenderer", "gw/PointRenderer"],
	function($, CoordinateSystem, Globe, Stats, AstroNavigation, AttributionHandler, VectorLayer, LayerManager, NameResolver, ReverseNameResolver, Utils, PickingManager, FeaturePopup, IFrame, Compass, MollweideViewer, ErrorDialog, AboutDialog, Share, Samp, AdditionalLayersView, ImageManager, ImageViewer, UWSManager, PositionTracker, MeasureTool) {

// Console fix	
window.console||(console={log:function(){}});
	
// Private variable
var globe = null;
var navigation = null;
var mollweideViewer = null;
var aboutShowed = false;

function hideLoading()
{
	// Show about information only at the end of first loading
	if ( localStorage.showAbout == undefined && !aboutShowed )
	{
		AboutDialog.show();
		aboutShowed = true;
	}

	$('#loading').hide(300);
}

function updateFov()
{
	var fov = navigation.getFov();
	var fovx = Utils.roundNumber( fov[0], 2 ) ;
	fovx = CoordinateSystem.fromDegreesToDMS( fovx );
	var fovy = Utils.roundNumber( fov[1], 2 ) ;
	fovy = CoordinateSystem.fromDegreesToDMS( fovy );
	$('#fov').html( "Fov : " + fovx + " x " + fovy );
}

/**
 *	Remove "C"-like comment lines from string
 */
function removeComments(string)
{
	var starCommentRe = new RegExp("/\\\*(.|[\r\n])*?\\\*/", "g");
	var slashCommentRe = new RegExp("[^:]//.*[\r\n]", "g");
	string = string.replace(slashCommentRe, "");
	string = string.replace(starCommentRe, "");

	return string;
}

/**
 *	Modify data according to shared parameters
 */
function setSharedParameters(data, sharedParameters)
{	
	// Init navigation parameters
	data.navigation.initTarget = sharedParameters.initTarget;
	data.navigation.initFov = sharedParameters.fov;
	data.navigation.up = sharedParameters.up;

	// Set visibility of layers
	for ( var x in sharedParameters.visibility )
	{
		var name = x;
		for ( var i=0; i<data.layers.length; i++ )
		{
			var currentLayer = data.layers[i];
			if ( name == currentLayer.name )
			{
				currentLayer.visible = sharedParameters.visibility[name];
				continue;
			}
		}
	}
}

$(function()
{
	var confURL = 'js/conf.json'; // default

	var documentURI =  window.document.documentURI;

	// If configuration is defined by SiTools2
	var splitStartIndex = documentURI.indexOf( "?conf=" );
	if ( splitStartIndex != -1 )
	{
		// Shared url exist
		var splitEndIndex = documentURI.search( /[&|?]sharedParameters=/ );
		if ( splitEndIndex != -1 )
		{
			// Compute length of configuration url
			var confURLLength = splitEndIndex - splitStartIndex - 6;
		}

		var url = documentURI.substr( splitStartIndex+6, confURLLength );
		if ( url != 'undefined' && url != '' ) {
			confURL = url;
		}
	}

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
		globe = new Globe( { 
			canvas: canvas, 
			tileErrorTreshold: 1.5,
			continuousRendering: true
		} );
	}
	catch (err)
	{
		document.getElementById('GlobWebCanvas').style.display = "none";
		document.getElementById('loading').style.display = "none";
		document.getElementById('webGLNotAvailable').style.display = "block";
	}
	
	// When base layer is ready, hide loading
	globe.subscribe("baseLayersReady", hideLoading);

	// When base layer failed to load, open error dialog
	globe.subscribe("baseLayersError", function(layer){
		var layerType = layer.id == 0 ? " background layer " : " additional layer ";
		ErrorDialog.open("<p>The"+ layerType + "<span style='color: orange'>"+layer.name+"</span> can not be displayed.</p>\
		 <p>First check if data source related to this layer is still accessible. Otherwise, check your Sitools2 configuration.</p>");
	});
	
	// Context lost listener
	canvas.addEventListener("webglcontextlost", function(event) {
		// TODO
		event.preventDefault();
		document.getElementById('loading').style.display = "none";
		document.getElementById('webGLContextLost').style.display = "block";
	}, false);
	
	// Select default coordinate system event
	$('#defaultCoordSystem').selectmenu({
		select: function(e)
		{
			var newCoordSystem = $(this).children('option:selected').val();				
			CoordinateSystem.type = newCoordSystem;
			mollweideViewer.setCoordSystem( newCoordSystem );
		}
	});

	// Retrieve configuration
	$.ajax({
		type: "GET",
		url: confURL,
		dataType: "text",
		success: function(response) {
			response = removeComments(response);
			try
			{
				var data = $.parseJSON(response);
			}
			catch (e) {
				ErrorDialog.open("Configuration parsing error<br/> For more details see http://jsonlint.com/.");
				console.error(data);
				return false;
			}

			// Retrieve shared parameters
			var sharedParametersIndex = documentURI.indexOf( "sharedParameters=" );
			if ( sharedParametersIndex != -1 )
			{
				var startIndex = sharedParametersIndex + "sharedParameters=".length;
				var sharedString = documentURI.substr(startIndex);
				if ( data.shortener )
				{
					$.ajax({
						type: "GET",
						url: data.shortener.baseUrl +'/'+ sharedString,
						async: false,
						success: function(sharedConf)
						{
							setSharedParameters(data, sharedConf);
						},
						error: function(thrownError)
						{
							console.error(thrownError);
						}
					});
				}
				else
				{
					console.log("Shortener plugin isn't defined, try to extract as a string");
					var sharedParameters = JSON.parse( unescape(sharedString) );
					setSharedParameters(data, sharedParameters);
				}
			}

			// Add stats
			if ( data.stats.visible ) {
				new Stats( globe.renderContext, { element: "fps", verbose: data.stats.verbose });
			} else  {
				$("#fps").hide();
			}

			// Set default coordinate system
			if ( data.coordSystem )
				CoordinateSystem.type = data.coordSystem;

			// Add zoom double click
			data.navigation.mouse = {
				zoomOnDblClick: true
			};

			// Initialize navigation
			navigation = new AstroNavigation(globe, data.navigation);

			// Add attribution handler
			new AttributionHandler( globe, {element: 'attributions'});

			new MeasureTool({ globe: globe, navigation: navigation } );
			
			// Initialize the name resolver
			NameResolver.init(globe, navigation, data);
		
			// Initialize the reverse name resolver
			ReverseNameResolver.init(globe, navigation, data);

			// Create layers from configuration file
			LayerManager.init(globe, navigation, data);

			// Create data manager
			PickingManager.init(globe, navigation, data);

			// Compass component
			new Compass({ element : "objectCompass", globe : globe, navigation : navigation, coordSystem : data.coordSystem });

			// Mollweide viewer
			mollweideViewer = new MollweideViewer({ globe : globe, navigation : navigation });

			// Share configuration module init
			Share.init({navigation : navigation, configuration: data});

			// Initialize SAMP component
			Samp.init(globe, navigation, AdditionalLayersView, ImageManager, ImageViewer);

			// Eye position tracker initialization
			PositionTracker.init({ element: "posTracker", globe: globe, navigation : navigation });

			// UWS services initialization
			UWSManager.init(data);

			// Initialization of tools useful for different modules
			Utils.init(globe);

			// Update fov when moving
			navigation.subscribe("modified", updateFov);
			updateFov();
		},
		error: function(xhr){
			ErrorDialog.open("Couldn't open : "+confURL);
		}
	});
	
	// Fullscreen mode
	document.addEventListener("keydown", function(event){
		// Ctrl + Space
		if ( event.ctrlKey == true && event.keyCode == 32 )
		{
			$('.canvas > canvas').siblings().each(function(){
				$(this).fadeToggle();
			});
		}
	});
	
	/*** Refactor into common ? ***/
	// Fade hover styled image effect
	$("body").on("mouseenter", "img.defaultImg", function () {
		//stuff to do on mouseover
		$(this).stop().animate({"opacity": "0"}, 100);
		$(this).siblings('.hoverImg').stop().animate({"opacity": "1"}, 100);
	});
	$("body").on("mouseleave", "img.defaultImg", function () {
		//stuff to do on mouseleave
		$(this).stop().animate({"opacity": "1"}, 100);
		$(this).siblings('.hoverImg').stop().animate({"opacity": "0"}, 100);
	});

	// Close button event
	$('body').on("click",'.closeBtn', function(event){
		switch($(this).parent().attr("id"))
		{
			case "externalIFrame":
				IFrame.hide();
				break;
			case "selectedFeatureDiv":
				FeaturePopup.hide();
				break;
			default:
				$(this).parent().fadeOut(300);	
		}
	});
	/***********************************/

});

});