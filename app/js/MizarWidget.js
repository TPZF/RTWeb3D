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
 * Mizar widget
 */
define( ["jquery.ui", "underscore-min", "gw/EquatorialCoordinateSystem", "gw/Sky", "gw/Stats", "gw/AstroNavigation", "gw/AttributionHandler", "gw/VectorLayer", "gw/TouchNavigationHandler", "gw/MouseNavigationHandler", "gw/KeyboardNavigationHandler", "text!../templates/mizarCore.html",
	"./LayerManager", "./NameResolver", "./ReverseNameResolver", "./Utils", "./PickingManager", "./FeaturePopup", "./IFrame", "./Compass", "./MollweideViewer", "./ErrorDialog", "./AboutDialog", "./Share", "./Samp", "./AdditionalLayersView", "./ImageManager", "./ImageViewer", "./UWSManager", "./PositionTracker", "./MeasureTool", "./StarProvider", "./ConstellationProvider", "./JsonProvider", "./OpenSearchProvider", "./PlanetProvider",
	"gw/ConvexPolygonRenderer", "gw/PointSpriteRenderer", "gw/PointRenderer"],
	function($, _, CoordinateSystem, Sky, Stats, AstroNavigation, AttributionHandler, VectorLayer, TouchNavigationHandler, MouseNavigationHandler, KeyboardNavigationHandler, mizarCoreHTML,
			LayerManager, NameResolver, ReverseNameResolver, Utils, PickingManager, FeaturePopup, IFrame, Compass, MollweideViewer, ErrorDialog, AboutDialog, Share, Samp, AdditionalLayersView, ImageManager, ImageViewer, UWSManager, PositionTracker, MeasureTool) {

	/**
	 *	Private functions
	 */
	var aboutShowed = false;
	var parentElement;

	/**
	 *	Retrueve SiTools2 configuration from URI
	 *	(to be removed ?)
	 */
	var _retrieveConfiguration = function() {
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
				var confURLLength = splitEndIndex - splitStartIndex - "?conf=".length;
			}

			var url = documentURI.substr( splitStartIndex + "?conf=".length, confURLLength );
			if ( url != 'undefined' && url != '' ) {
				confURL = url;
			}
		}
		return confURL;
	}

	/**************************************************************************************************************/

	/**
	 *	Hide loading and show about first connection
	 */
	var _hideLoading = function()
	{
		// Show about information only at the end of first loading
		if ( localStorage.showAbout == undefined && !aboutShowed )
		{
			AboutDialog.show();
			aboutShowed = true;
		}

		$(parentElement).find('#loading').hide(300);
	}

	/**************************************************************************************************************/

	/**
	 *	Remove "C"-like comment lines from string
	 */
	var _removeComments = function(string)
	{
		var starCommentRe = new RegExp("/\\\*(.|[\r\n])*?\\\*/", "g");
		var slashCommentRe = new RegExp("[^:]//.*[\r\n]", "g");
		string = string.replace(slashCommentRe, "");
		string = string.replace(starCommentRe, "");

		return string;
	}

	/**************************************************************************************************************/

	/**
	 *	Modify data according to shared parameters
	 */
	var _setSharedParameters = function(data, sharedParameters)
	{
		// Init navigation parameters
		data.navigation.initTarget = sharedParameters.initTarget;
		data.navigation.initFov = sharedParameters.fov;
		data.navigation.up = sharedParameters.up;

		// Set visibility of layers
		if ( data.layers ) {
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
	}

	/**************************************************************************************************************/

	/**
	 *	Mizar widget constructor
	 */
	var MizarWidget = function(div, userOptions) {
		parentElement = div;
		var options = {
			"navigation" : {
				"initTarget": [85.2500, -2.4608],
				"initFov": 20,
				"inertia": true,
				"minFov": 0.001,
				"zoomFactor": 0,
				"handlers": [
					new MouseNavigationHandler({
						zoomOnDblClick: true
					}),
					new KeyboardNavigationHandler()
				]
			}
		};

		// Merge default navigation options with user ones
		$.extend(options.navigation, userOptions.navigation);

		// Create mizar core HTML
		// TODO: generate only core parts
		var mizarContent = _.template(mizarCoreHTML,{});
		$(mizarContent).appendTo(div);

		var sky = null;
		var navigation = null;
		var mollweideViewer = null;

		var confURL = _retrieveConfiguration();

		var canvas = $(div).find('#GlobWebCanvas')[0];
		// TODO: Make canvas have the same size as parent div
		//var width = $(div).attr("width");
		//var height = $(div).attr("height");

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
		
		var isMobile = (('ontouchstart' in window && window.ontouchstart != null) || window.DocumentTouch && document instanceof DocumentTouch);
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
		sky.subscribe("baseLayersReady", _hideLoading);

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
		
		// Select default coordinate system event
		$('#defaultCoordSystem').selectmenu({
			select: function(e)
			{
				var newCoordSystem = $(this).children('option:selected').val();				
				CoordinateSystem.type = newCoordSystem;
				mollweideViewer.setCoordSystem( newCoordSystem );

				// Publish modified event to update compass north
				navigation.publish('modified');
			},
			width: 100
		});
		var self = this;
		// Retrieve configuration
		$.ajax({
			type: "GET",
			url: confURL,
			dataType: "text",
			success: function(response) {
				response = _removeComments(response);
				try
				{
					var data = $.parseJSON(response);
				}
				catch (e) {
					ErrorDialog.open("Configuration parsing error<br/> For more details see http://jsonlint.com/.");
					console.error(e.message);
					return false;
				}
				
				var documentURI =  window.document.documentURI;
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
							async: false, // TODO: create callback
							success: function(sharedConf)
							{
								_setSharedParameters(options, sharedConf);
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
						_setSharedParameters(options, sharedParameters);
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

				// Add touch navigation handler if client supports touch events
				if( isMobile ) {
				    // Mobile
					options.navigation.handlers = [ new TouchNavigationHandler({ inversed: true, zoomOnDblClick: true }) ];
					window.addEventListener("orientationchange", function() {
						sky.renderContext.requestFrame();
					}, false);
					data.isMobile = isMobile;
				}

				// Initialize navigation
				navigation = new AstroNavigation(sky, options.navigation);

				// Add attribution handler
				new AttributionHandler( sky, {element: 'attributions'});

				// Add distance measure tool
				new MeasureTool({ globe: sky, navigation: navigation, isMobile: data.isMobile } );
				
				// Initialize the name resolver
				NameResolver.init(sky, navigation, data);
			
				// Initialize the reverse name resolver
				ReverseNameResolver.init(sky, navigation, data);

				// Create layers from configuration file
				LayerManager.init(sky, navigation, data);

				// Create data manager
				PickingManager.init(sky, navigation, data);

				// Compass component(only for desktop due to performance issue on mobile)
				if ( !isMobile )
				{
					document.getElementById('objectCompass').addEventListener('load', function(){
						new Compass({
							element : "objectCompass",
							globe : sky,
							navigation : navigation,
							coordSystem : data.coordSystem,
							isMobile : data.isMobile
						});
						// Publish modified event to update compass north
						navigation.publish('modified');
					});
					$('#compassDiv').css("display","block");
				}

				// Mollweide viewer
				mollweideViewer = new MollweideViewer({ globe : sky, navigation : navigation });

				// Share configuration module init
				Share.init({navigation : navigation, configuration: data});

				// Initialize SAMP component
				Samp.init(sky, navigation, AdditionalLayersView, ImageManager, ImageViewer, data);

				// Eye position tracker initialization
				PositionTracker.init({ element: "posTracker", globe: sky, navigation : navigation, isMobile: data.isMobile });

				// UWS services initialization
				UWSManager.init(data);

				// Initialization of tools useful for different modules
				Utils.init(sky);

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
	}

	/**************************************************************************************************************/

	/**
	 *	Set a predefined background survey
	 */
	MizarWidget.prototype.setBackgroundSurvey = function(survey) {
		//TODO
	}

	/**************************************************************************************************************/

	/**
	 *	Set a custom background survey
	 */
	MizarWidget.prototype.setCustomBackgroundSurvey = function(id, url, coordinateSystem, options) {
		//TODO
	}

	/**************************************************************************************************************/

	/**
	 *	Add additional layer(OpenSearch, GeoJSON, HIPS, background, grid coordinates)
	 */
	MizarWidget.prototype.addLayer = function(layer) {
		// TODO
	}

	/**************************************************************************************************************/

	/**
	 *	Remove layer with the given id
	 */
	MizarWidget.prototype.removeLayer = function(layerId) {
		// TODO
	}

	/**************************************************************************************************************/

	/**
	 *	Set opacity for the given layer
	 */
	MizarWidget.prototype.setOpacity = function(layerId, opacity) {
		// TODO
	}

	/**************************************************************************************************************/

	/**
	 *	Get opacity of the given layer
	 */
	MizarWidget.prototype.getOpacity = function(layerId) {
		// TODO
	}

	/**************************************************************************************************************/

	/**
	 *	Point to a given location
	 *
	 *	@param location
	 *		Could be:
	 *			1) Coordinates in hms/dms : "0:42:14.33 41:16:7.5"
	 *			2) Coordinates in decimal degree : "11.11 41.3"
	 *			3) Astronomical object name : m31, Mars, Polaris
	 */
	MizarWidget.prototype.goTo = function(location) {
		// TODO
	}

	/**************************************************************************************************************/

	/**
	 *	Return current fov
	 */
	MizarWidget.prototype.getCurrentFov = function() {
		// TODO
	}

	/**************************************************************************************************************/

	/**
	 *	Set zoom(in other words fov)
	 */
	MizarWidget.prototype.setZoom = function(fovInDegrees) {
		// TODO
	}

	/**************************************************************************************************************/

	/**
	 *	Set visibility of the given layer
	 */
	MizarWidget.prototype.setVisibility = function(layer, visibility) {
		// TODO
	}

	/**************************************************************************************************************/

	/**
	 *	Get visibility of the given layer
	 */
	MizarWidget.prototype.getVisibility = function(layer) {
		// TODO
	}

	/**************************************************************************************************************/

	return MizarWidget;

});