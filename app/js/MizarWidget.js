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
define( [ "jquery", "underscore-min", "gw/EquatorialCoordinateSystem", "gw/Sky", "gw/Stats", "gw/AstroNavigation", "gw/AttributionHandler", "gw/VectorLayer", "gw/TouchNavigationHandler", "gw/MouseNavigationHandler", "gw/KeyboardNavigationHandler", "gw/Event", "text!../templates/mizarCore.html",
	"./LayerManager", "./NameResolver", "./ReverseNameResolver", "./Utils", "./PickingManager", "./FeaturePopup", "./IFrame", "./Compass", "./MollweideViewer", "./ErrorDialog", "./AboutDialog", "./Share", "./Samp", "./AdditionalLayersView", "./ImageManager", "./ImageViewer", "./UWSManager", "./PositionTracker", "./MeasureTool", "./StarProvider", "./ConstellationProvider", "./JsonProvider", "./OpenSearchProvider", "./PlanetProvider",
	"gw/ConvexPolygonRenderer", "gw/PointSpriteRenderer", "gw/PointRenderer", "jquery.ui"],
	function($, _, CoordinateSystem, Sky, Stats, AstroNavigation, AttributionHandler, VectorLayer, TouchNavigationHandler, MouseNavigationHandler, KeyboardNavigationHandler, Event, mizarCoreHTML,
			LayerManager, NameResolver, ReverseNameResolver, Utils, PickingManager, FeaturePopup, IFrame, Compass, MollweideViewer, ErrorDialog, AboutDialog, Share, Samp, AdditionalLayersView, ImageManager, ImageViewer, UWSManager, PositionTracker, MeasureTool) {

	/**
	 *	Private functions
	 */
	var aboutShowed = false;
	var parentElement;
	var isMobile;

	/**
	 *	Apply shared parameters to options if exist
	 */
	var _applySharedParameters = function(options) {
		var documentURI =  window.document.documentURI;
		// Retrieve shared parameters
		var sharedParametersIndex = documentURI.indexOf( "sharedParameters=" );
		if ( sharedParametersIndex != -1 )
		{
			var startIndex = sharedParametersIndex + "sharedParameters=".length;
			var sharedString = documentURI.substr(startIndex);
			if ( options.shortener )
			{
				$.ajax({
					type: "GET",
					url: options.shortener.baseUrl +'/'+ sharedString,
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
	}

	/**
	 *	Retrieve SiTools2 configuration from URI
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
	 *	Hide loading and show about on first connection
	 */
	var _showAbout = function()
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
		Event.prototype.constructor.call( this );

		parentElement = div;
		var sitoolsBaseUrl = userOptions.sitoolsBaseUrl ? userOptions.sitoolsBaseUrl : "http://demonstrator.telespazio.com/sitools";
		var options = {
			"sitoolsBaseUrl" : sitoolsBaseUrl,
			"coordSystem" : "EQ",
			"debug" : false,
			"nameResolver" : {
				"baseUrl" : sitoolsBaseUrl + '/project/mizar/plugin/nameResolver',
				"zoomFov": 15
			},
			"reverseNameResolver" : {
				"baseUrl" : sitoolsBaseUrl + '/project/mizar/plugin/reverseNameResolver',
			},
			"coverageService": {
				"baseUrl": sitoolsBaseUrl + "/project/mizar/plugin/coverage?moc="
			},
			"solarObjects": {
				"baseUrl": sitoolsBaseUrl + "/project/mizar/plugin/solarObjects/"
			},
			"votable2geojson": {
				"baseUrl": sitoolsBaseUrl + "/project/mizar/plugin/votable2geojson"
			},
			"cutOut": {
				"baseUrl": sitoolsBaseUrl + "/cutout"
			},
			"zScale": {
				"baseUrl": sitoolsBaseUrl + "/zscale"
			},
			"healpixcut": {
				"baseUrl": sitoolsBaseUrl + "/healpixcut"
			},
			"shortener": {
			 	"baseUrl": sitoolsBaseUrl + "/shortener"
			},
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
			},
			"stats": {
				"verbose": false,
				"visible": false
			},
			"isMobile" : (('ontouchstart' in window && window.ontouchstart != null) || window.DocumentTouch && document instanceof DocumentTouch)
		};

		var extendableOptions = [ "coordSystem", "navigation", "nameResolver", "stats", "debug" ];
		// Merge default options with user ones
		for ( var i=0; i<extendableOptions.length; i++ ) {
			var option = extendableOptions[i];
			$.extend(options[option], userOptions[option]);
		}

		// Create mizar core HTML
		// TODO: generate only core parts
		var mizarContent = _.template(mizarCoreHTML,{});
		$(mizarContent).appendTo(div);

		this.sky = null;
		this.navigation = null;

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
		
		isMobile = (('ontouchstart' in window && window.ontouchstart != null) || window.DocumentTouch && document instanceof DocumentTouch);
		// Initialize sky
		try
		{
			this.sky = new Sky( { 
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
		this.sky.subscribe("baseLayersReady", _showAbout);

		// When base layer failed to load, open error dialog
		this.sky.subscribe("baseLayersError", function(layer){

			$(parentElement).find('#loading').hide();
			// TODO : handle multiple errors !
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
		var self = this;
		var mollweideViewer = null;
		$('#defaultCoordSystem').selectmenu({
			select: function(e)
			{
				var newCoordSystem = $(this).children('option:selected').val();				
				CoordinateSystem.type = newCoordSystem;
				mollweideViewer.setCoordSystem( newCoordSystem );

				// Publish modified event to update compass north
				self.navigation.publish('modified');
			},
			width: 100
		});
				
		_applySharedParameters(options);

		// Add stats
		if ( options.stats.visible ) {
			new Stats( self.sky.renderContext, { element: "fps", verbose: options.stats.verbose });
			$("#fps").show();
		}

		CoordinateSystem.type = options.coordSystem;

		// Add touch navigation handler if client supports touch events
		if( isMobile ) {
		    // Mobile
			options.navigation.handlers = [ new TouchNavigationHandler({ inversed: true, zoomOnDblClick: true }) ];
			window.addEventListener("orientationchange", function() {
				self.sky.renderContext.requestFrame();
			}, false);
		}

		// Initialize navigation
		this.navigation = new AstroNavigation(self.sky, options.navigation);

		// Add attribution handler
		new AttributionHandler( this.sky, {element: 'attributions'});

		// Add distance measure tool
		new MeasureTool({ globe: this.sky, navigation: this.navigation, isMobile: isMobile } );
		
		// Initialize the name resolver
		NameResolver.init(this.sky, this.navigation, options);
	
		// Initialize the reverse name resolver
		ReverseNameResolver.init(this.sky, this.navigation, options);

		// Create layers from configuration file
		LayerManager.init(this, options);

		// Create data manager
		PickingManager.init(this.sky, this.navigation, options);

		// Compass component(only for desktop due to performance issue on mobile)
		if ( !isMobile )
		{
			self.setCompassGui(true);
		}

		// Mollweide viewer
		mollweideViewer = new MollweideViewer({ globe : this.sky, navigation : this.navigation });

		// Share configuration module init
		Share.init({navigation : this.navigation, configuration: options});

		// Initialize SAMP component
		Samp.init(this.sky, this.navigation, AdditionalLayersView, ImageManager, ImageViewer, options);

		// Eye position tracker initialization
		PositionTracker.init({ element: "posTracker", globe: this.sky, navigation : this.navigation, isMobile: isMobile });

		// UWS services initialization
		UWSManager.init(options);

		// Initialization of tools useful for different modules
		Utils.init(this.sky);
		
		// Get background surveys only
		// Currently in background surveys there are not only background layers but also catalog ones
		// TODO : Refactor it !
		$.ajax({
			type: "GET",
			url: "data/backgroundSurveys.json",
			dataType: "text",
			success: function(response) {
				response = _removeComments(response);
				try
				{
					var layers = $.parseJSON(response);
				}
				catch (e) {
					ErrorDialog.open("Background surveys parsing error<br/> For more details see http://jsonlint.com/.");
					console.error(e.message);
					return false;
				}

				// Add surveys
				for( var i=0; i<layers.length; i++ ) {
					self.addLayer( layers[i] );
				}
				self.publish("backgroundSurveysReady");
			},
			error: function(thrownError) {
				console.error(thrownError);
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

	Utils.inherits( Event, MizarWidget );

	/**************************************************************************************************************/

	/**
	 *	Set a predefined background survey
	 */
	MizarWidget.prototype.setBackgroundSurvey = function(survey) {
		LayerManager.setBackgroundSurvey(survey);
	}

	/**************************************************************************************************************/

	/**
	 *	Set a custom background survey
	 */
	MizarWidget.prototype.setCustomBackgroundSurvey = function(options) {
		//TODO
	}

	/**************************************************************************************************************/

	/**
	 *	Add additional layer(OpenSearch, GeoJSON, HIPS, background, grid coordinates)
	 */
	MizarWidget.prototype.addLayer = function(layer) {
		LayerManager.addLayer(layer);
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

	/**
	 *	Add/remove compass GUI component
	 */
	MizarWidget.prototype.setCompassGui = function(visible) {
		if ( visible ) {
			this.compass = new Compass({
				element : "compassDiv",
				globe : this.sky,
				navigation : this.navigation,
				coordSystem : CoordinateSystem.type,
				isMobile : isMobile
			});
		} else {
			this.compass.remove();
		}
	}

	return MizarWidget;

});