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
		"gw": "../externals/GlobWeb/src/",
		"jquerymobile": "../externals/jquery.mobile-1.3.2.min"
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
		'jquerymobile': {
			deps: ['jquery.ui.selectmenu'],
			exports: 'jQuery'
		}
	},
	waitSeconds: 0
});

/**
 * Main module
 */
require( ["jquery.ui", "gw/EquatorialCoordinateSystem", "gw/Sky", "gw/Stats", "gw/AstroNavigation", "gw/AttributionHandler", "gw/VectorLayer", "gw/TouchNavigationHandler", "gw/MouseNavigationHandler", "gw/KeyboardNavigationHandler",
	"./LayerManager", "./NameResolver", "./ReverseNameResolver", "./Utils", "./PickingManager", "./FeaturePopup", "./IFrame", "./Compass", "./MollweideViewer", "./ErrorDialog", "./AboutDialog", "./Share", "./Samp", "./AdditionalLayersMobileView", "./ImageManager", "./ImageViewer", "./UWSManager", "./PositionTracker", "./MeasureTool", "./StarProvider", "./ConstellationProvider", "./JsonProvider", "./OpenSearchProvider",
	"gw/ConvexPolygonRenderer", "gw/PointSpriteRenderer", "gw/PointRenderer", "jquerymobile"],
	function($, CoordinateSystem, Sky, Stats, AstroNavigation, AttributionHandler, VectorLayer, TouchNavigationHandler, MouseNavigationHandler, KeyboardNavigationHandler,
			LayerManager, NameResolver, ReverseNameResolver, Utils, PickingManager, FeaturePopup, IFrame, Compass, MollweideViewer, ErrorDialog, AboutDialog, Share, Samp, AdditionalLayersMobileView, ImageManager, ImageViewer, UWSManager, PositionTracker, MeasureTool) {

// Console fix	
window.console||(console={log:function(){}});
	
// Private variable
var sky = null;
var navigation = null;
var mollweideViewer = null;
var aboutShowed = false;

function hideLoading()
{
	$('#loading').hide(300);
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

$(document).on('pageinit', '#indexPage', function(){
	console.log("coucou");
});

$(function()
{
	$('.canvas, #featurePopupPanel, #sidepanel').css('display','none');
	$.mobile.touchOverflowEnabled = true;
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

	$('div.canvas').css("height", window.innerHeight);
	
	// Take into account window resize
	$(window).resize(function() {
		if ( canvas.width !=  window.innerWidth ) 
			canvas.width = window.innerWidth;
		if ( canvas.height != window.innerHeight )
		{
			canvas.height = window.innerHeight;
			$('div.canvas').css("height", window.innerHeight);
		}
		sky.renderContext.requestFrame();
	});
	
	var isMobile = (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch);
	ErrorDialog.init({isMobile: isMobile});
	// Initialize sky
	try
	{
		sky = new Sky( { 
			canvas: canvas, 
			tileErrorTreshold: 1.5,
			continuousRendering: isMobile ? false : true
		} );
	}
	catch (err)
	{
		document.getElementById('GlobWebCanvas').style.display = "none";
		document.getElementById('loading').style.display = "none";
		document.getElementById('webGLNotAvailable').style.display = "block";
	}
	
	// When base layer is ready, hide loading
	sky.subscribe("baseLayersReady", hideLoading);

	// When base layer failed to load, open error dialog
	sky.subscribe("baseLayersError", function(layer){
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
	
	$('#defaultCoordSystem').change( function(){
		var newCoordSystem = $(this).children('option:selected').val();				
		CoordinateSystem.type = newCoordSystem;
		mollweideViewer.setCoordSystem( newCoordSystem );

		// Publish modified event to update compass north
		navigation.publish('modified');
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
				console.error(e.message);
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
				new Stats( sky.renderContext, { element: "fps", verbose: data.stats.verbose });
			} else  {
				$("#fps").hide();
			}

			// Set default coordinate system
			if ( data.coordSystem )
				CoordinateSystem.type = data.coordSystem;

			data.navigation.handlers = [new TouchNavigationHandler({ inversed: true, zoomOnDblClick: true }) ];
			window.addEventListener("orientationchange", function() {
				sky.renderContext.requestFrame();
			}, false);

			data.isMobile = isMobile;


			// Initialize navigation
			navigation = new AstroNavigation(sky, data.navigation);

			// Add attribution handler
			new AttributionHandler( sky, {element: 'attributions'});

			// Add distance measure tool
			//new MeasureTool({ globe: sky, navigation: navigation, isMobile: data.isMobile } );
			
			// Initialize the name resolver
			NameResolver.init(sky, navigation, data);
		
			// Initialize the reverse name resolver
			ReverseNameResolver.init(sky, navigation, data);

			// Create layers from configuration file
			LayerManager.init(sky, navigation, data);

			// Create data manager
			PickingManager.init(sky, navigation, data);

			// Compass component(only for desktop due to performance issue on mobile)
			// if ( !isMobile )
			// {
			// 	document.getElementById('objectCompass').addEventListener('load', function(){
			// 		new Compass({
			// 			element : "objectCompass",
			// 			globe : sky,
			// 			navigation : navigation,
			// 			coordSystem : data.coordSystem,
			// 			isMobile : data.isMobile
			// 		});
			// 	});
			// 	$('#compassDiv').css("display","block");
			// }

			// Mollweide viewer
			// mollweideViewer = new MollweideViewer({ globe : sky, navigation : navigation });

			// Share configuration module init
			//Share.init({navigation : navigation, configuration: data});

			// Initialize SAMP component
			//Samp.init(sky, navigation, AdditionalLayersMobileView, ImageManager, ImageViewer, data);

			// Eye position tracker initialization
			//PositionTracker.init({ element: "posTracker", globe: sky, navigation : navigation, isMobile: data.isMobile });

			// UWS services initialization
			//UWSManager.init(data);

			// Initialization of tools useful for different modules
			Utils.init(sky);
			$('.canvas, #featurePopupPanel, #sidepanel').css('display','block');

		},
		error: function(xhr){
			ErrorDialog.open("Couldn't open : "+confURL);
		}
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