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
/*global define: false */

/**
 * Mizar widget
 */
define( [ "jquery", "underscore-min", "./PlanetContext", "./SkyContext", "gw/TileWireframeLayer", "gw/Stats", "gw/AttributionHandler", "gw/Event",  "gw/TouchNavigationHandler", "gw/MouseNavigationHandler", "gw/KeyboardNavigationHandler", "text!../templates/mizarCore.html", "text!../data/backgroundSurveys.json",
	"./LayerManager", "./LayerManagerView", "./BackgroundLayersView", "./NameResolver", "./NameResolverView", "./ReverseNameResolver", "./ReverseNameResolverView", "./MocBase", "./Utils", "./PickingManager", "./FeaturePopup", "./IFrame", "./Compass", "./MollweideViewer", "./ErrorDialog", "./AboutDialog", "./Share", "./Samp", "./AdditionalLayersView", "./ImageManager", "./ImageViewer", "./UWSManager", "./MeasureTool", "./StarProvider", "./ConstellationProvider", "./JsonProvider", "./OpenSearchProvider", "./PlanetProvider",
	"gw/ConvexPolygonRenderer", "gw/PointSpriteRenderer", "gw/LineStringRenderable", "gw/PointRenderer", "jquery.ui"],
	function($, _, PlanetContext, SkyContext, TileWireframeLayer, Stats, AttributionHandler, Event, TouchNavigationHandler, MouseNavigationHandler, KeyboardNavigationHandler, mizarCoreHTML, backgroundSurveys,
			LayerManager, LayerManagerView, BackgroundLayersView, NameResolver, NameResolverView, ReverseNameResolver, ReverseNameResolverView, MocBase, Utils, PickingManager, FeaturePopup, IFrame, Compass, MollweideViewer, ErrorDialog, AboutDialog, Share, Samp, AdditionalLayersView, ImageManager, ImageViewer, UWSManager, MeasureTool) {

	/**
	 *	Private variables
	 */
	var parentElement;
	var options;
	var planetContext;
	var skyContext;

	/**************************************************************************************************************/

	/**
	 *	Apply shared parameters to options if exist
	 */
	var _applySharedParameters = function() {
		var documentURI =  window.document.documentURI;
		// Retrieve shared parameters
		var sharedParametersIndex = documentURI.indexOf( "sharedParameters=" );
		if ( sharedParametersIndex !== -1 )
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
						_mergeWithOptions(sharedConf);
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
				var sharedParameters = JSON.parse( decodeURI(sharedString) );
				_mergeWithOptions(sharedParameters);
			}
		}
	};

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
	};

	/**************************************************************************************************************/

	/**
	 *	Merge retrieved shared parameters with Mizar configuration
	 */
	var _mergeWithOptions = function(sharedParameters)
	{
		// Navigation
		options.navigation.initTarget = sharedParameters.initTarget;
		options.navigation.initFov = sharedParameters.fov;
		options.navigation.up = sharedParameters.up;

		// Layer visibility
		options.layerVisibility = sharedParameters.visibility;
	};

	/**************************************************************************************************************/

	/**
	 *	Store the mizar base url
	 *	Used to access to images(Compass, Mollweide, Target icon for name resolver)
	 *	Also used to define "star" icon for point data on-fly
	 *	NB: Not the best solution of my life.... TODO: think how to improve it..
	 */
	// Search throught all the loaded scripts for minified version
	var scripts= document.getElementsByTagName('script');
	var mizarSrc = _.find(scripts, function(script){
		return script.src.indexOf("MizarWidget.min") !== -1;
	});
	
	// Depending on its presence decide if Mizar is used on prod or on dev
	var mizarBaseUrl;
	if ( mizarSrc )
	{
		// Prod
		// Extract mizar's url
		mizarBaseUrl = mizarSrc.src.split('/').slice(0, -1).join('/')+'/';
	}
	else
	{
		// Dev
		// Basically use the relative path from index page
		mizarSrc = _.find(scripts, function(script){
			return script.src.indexOf("MizarWidget") !== -1;
		});
		mizarBaseUrl = mizarSrc.src.split('/').slice(0, -1).join('/')+'/../';
	}

	/**
	 *	Mizar widget constructor
	 */
	var MizarWidget = function(div, userOptions) {
		Event.prototype.constructor.call( this );
		
		// Sky mode by default
		this.mode = "sky";

		parentElement = div;
		var sitoolsBaseUrl = userOptions.sitoolsBaseUrl ? userOptions.sitoolsBaseUrl : "http://demonstrator.telespazio.com/sitools";
		this.isMobile = ('ontouchstart' in window || (window.DocumentTouch && document instanceof DocumentTouch));
		options = {
			"sitoolsBaseUrl" : sitoolsBaseUrl,
			"mizarBaseUrl": mizarBaseUrl,
			"continuousRendering" : userOptions.hasOwnProperty('continuousRendering') ? userOptions.continuousRendering : !this.isMobile,
			"coordSystem" : userOptions.hasOwnProperty('coordSystem') ? userOptions.coordSystem : "EQ",
			"debug" : userOptions.hasOwnProperty('debug') ? userOptions.debug : false,
			"nameResolver" : {
				"baseUrl" : sitoolsBaseUrl + '/project/mizar/plugin/nameResolver',
				"zoomFov": 15,
				"duration": 3000
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
				"isMobile" : this.isMobile,
				"mouse" : {
					"zoomOnDblClick" : true
				}
			},
			"stats": {
				"verbose": false,
				"visible": false
			},
			"positionTracker": {
				"position": "bottom"
			},
			"isMobile" : this.isMobile
		};

		var extendableOptions = [ "navigation", "nameResolver", "stats", "positionTracker" ];
		// Merge default options with user ones
		for ( var i=0; i<extendableOptions.length; i++ ) {
			var option = extendableOptions[i];
			$.extend(options[option], userOptions[option]);
		}

		// Create mizar core HTML
		var mizarContent = _.template(mizarCoreHTML,{});
		$(mizarContent).appendTo(div);

		this.sky = null;
		this.navigation = null;

		_applySharedParameters();
		
		// Initialize sky&globe contexts
		skyContext = new SkyContext(div, $.extend({canvas: $(div).find('#GlobWebCanvas')[0]}, options));
		this.activatedContext = skyContext;
		
		// TODO : Extend GlobWeb base layer to be able to publish events by itself
		// to avoid the following useless call
		var self = this;
		skyContext.globe.subscribe("features:added", function(featureData) {
			self.publish("features:added", featureData);
		});

		this.sky = skyContext.globe;
		this.navigation = skyContext.navigation;

		// Add stats
		if ( options.stats.visible ) {
			new Stats( this.sky.renderContext, { element: "fps", verbose: options.stats.verbose });
			$("#fps").show();
		}
		
		// TODO : Extend GlobWeb base layer to be able to publish events by itself
		// to avoid the following useless call
		
		this.sky.coordinateSystem.type = options.coordSystem;

		// Add attribution handler
		new AttributionHandler( this.sky, {element: 'attributions'});
		
		// Initialize name resolver
		NameResolver.init(this, skyContext, options);

		// Initialize reverse name resolver
		ReverseNameResolver.init(this, skyContext);

		// Create layers from configuration file
		LayerManager.init(this, options);
		
		// Create data manager
		PickingManager.init(this, options);

		// Share configuration module init
		Share.init({mizar: this, navigation : this.navigation, configuration: options});

		// Initialize SAMP component
		// TODO : Bear in mind that a website may already implement specific SAMP logics, so check that
		// current samp component doesn't break existing SAMP functionality
		if ( !this.isMobile )
		{
			Samp.init(this, LayerManager, ImageManager, options);
		}

		// UWS services initialization
		UWSManager.init(options);

		// Initialization of tools useful for different modules
		Utils.init(this);

		// Initialize moc base
		MocBase.init(this, options);

		// Get background surveys only
		// Currently in background surveys there are not only background layers but also catalog ones
		// TODO : Refactor it !
		var layers = [];
		if ( userOptions.backgroundSurveys )
		{
			// Use user defined background surveys
			layers = userOptions.backgroundSurveys;
		}
		else
		{
			// // Use built-in background surveys
			// backgroundSurveys = _removeComments(backgroundSurveys);
			// try
			// {
			// 	layers = $.parseJSON(backgroundSurveys);
			// }
			// catch (e) {
			// 	ErrorDialog.open("Background surveys parsing error<br/> For more details see http://jsonlint.com/.");
			// 	console.error(e.message);
			// 	return false;
			// }
			$.ajax({
				type: "GET",
				async: false, // Deal with it..
				url: mizarBaseUrl + "data/backgroundSurveys.json",
				dataType: "text",
				success: function(response) {
					response = _removeComments(response);
					try
					{
						layers = $.parseJSON(response);
					}
					catch (e) {
						ErrorDialog.open("Background surveys parsing error<br/> For more details see http://jsonlint.com/.");
						console.error(e.message);
						return false;
					}
				},
				error: function(thrownError) {
					console.error(thrownError);
				}
			});
		}

		// Add surveys
		for( var i=0; i<layers.length; i++ ) {
			var layer = layers[i];
			var gwLayer = self.addLayer( layer );
			
			// Update layer visibility according to options
			if ( options.layerVisibility && options.layerVisibility.hasOwnProperty(layer.name) )
			{
				gwLayer.visible( options.layerVisibility[layer.name] );
			}

			self.publish("backgroundSurveysReady");
		}
		
		// Fullscreen mode
		document.addEventListener("keydown", function(event){
			// Ctrl + Space
			if ( event.ctrlKey === true && event.keyCode === 32 )
			{
				$('.canvas > canvas').siblings(":not(canvas)").each(function(){
					$(this).fadeToggle();
				});
			}
		});
		
		/*** Refactor into common ? ***/
		// Fade hover styled image effect
		$("body").on("mouseenter", "span.defaultImg", function () {
			//stuff to do on mouseover
			$(this).stop().animate({"opacity": "0"}, 100);
			$(this).siblings('.hoverImg').stop().animate({"opacity": "1"}, 100);
		});
		$("body").on("mouseleave", "span.defaultImg", function () {
			//stuff to do on mouseleave
			$(this).stop().animate({"opacity": "1"}, 100);
			$(this).siblings('.hoverImg').stop().animate({"opacity": "0"}, 100);
		});

		// Close button event
		$('body').on("click",'.closeBtn', function(){
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
	};

	/**************************************************************************************************************/

	Utils.inherits( Event, MizarWidget );

	/**************************************************************************************************************/

	/**
	 *	Set a predefined background survey
	 */
	MizarWidget.prototype.setBackgroundSurvey = function(survey) {
		LayerManager.setBackgroundSurvey(survey);
	};

	/**************************************************************************************************************/

	/**
	 *	Set a custom background survey
	 */
	MizarWidget.prototype.setCustomBackgroundSurvey = function(layerDesc) {
		layerDesc.background = true; // Ensure that background option is set to true
		var layer = LayerManager.addLayerFromDescription(layerDesc);
		LayerManager.setBackgroundSurvey(layerDesc.name);
		return layer;
	};

	/**************************************************************************************************************/

	/**
	 *	Add additional layer(OpenSearch, GeoJSON, HIPS, grid coordinates)
	 *	@param layerDesc
	 *		Layer description
	 *	@param planetLayer
	 *		Planet layer, if described layer must be added to planet (optional)
	 *	@return
	 *		The created layer
	 */
	MizarWidget.prototype.addLayer = function(layerDesc, planetLayer) {

		if ( layerDesc.fitsSupported ) {
			// TODO : Move it..
			layerDesc.onready = function( fitsLayer ) {
				if ( fitsLayer.format === "fits" && fitsLayer.levelZeroImage )
				{
					if ( fitsLayer.div )
					{
						// Additional layer
						// Using name as identifier, because we must know it before attachment to globe
						// .. but identfier is assigned after layer creation.
						var shortName = Utils.formatId( fitsLayer.name );
						$('#addFitsView_'+shortName).button("enable");
						fitsLayer.div.setImage(fitsLayer.levelZeroImage);
					}
					else
					{
						// Background fits layer
						$('#fitsView').button("enable");
						var backgroundDiv = BackgroundLayersView.getDiv();
						backgroundDiv.setImage(fitsLayer.levelZeroImage);
					}
				}
			};
		}

		return LayerManager.addLayerFromDescription(layerDesc, planetLayer);
	};

	/**************************************************************************************************************/

	/**
	 *	Remove the given layer
	 *	@param layer
	 *		Layer returned by addLayer()
	 */
	MizarWidget.prototype.removeLayer = function(layer) {
		LayerManager.removeLayer(layer);
	};

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
	MizarWidget.prototype.goTo = function(location, callback) {
		NameResolver.goTo(location, callback);
	};

	/**************************************************************************************************************/

	/**
	 *	Return current fov
	 */
	MizarWidget.prototype.getCurrentFov = function() {
		return this.navigation.getFov();
	};

	/**************************************************************************************************************/

	/**
	 *	Set zoom(in other words fov)
	 */
	MizarWidget.prototype.setZoom = function(fovInDegrees, callback) {
		var geoPos = this.sky.coordinateSystem.from3DToGeo(this.navigation.center3d);
		this.navigation.zoomTo(geoPos, fovInDegrees, 1000, callback);
	};

	/**************************************************************************************************************/

	/**
	 *	Set the credits popup
	 */
	MizarWidget.prototype.setShowCredits = function(visible) {
		skyContext.showCredits(visible);	
	};

	/**************************************************************************************************************/

	/**
	 *	Add/remove compass GUI
	 *	Only on desktop due performance issues
	 */
	MizarWidget.prototype.setCompassGui = function(visible) {
		if ( !options.isMobile )
		{
			if ( visible ) {
				this.compass = new Compass({
					element : "compassDiv",
					globe : this.sky,
					navigation : this.navigation,
					coordSystem : this.sky.coordinateSystem.type,
					isMobile : options.isMobile,
					mizarBaseUrl : options.mizarBaseUrl
				});
			} else {
				this.compass.remove();
			}
			skyContext.setComponentVisibility("compassDiv", visible);
		}
	};

	/**************************************************************************************************************/

	/**
	 *	Add/remove angle distance GUI
	 */
	MizarWidget.prototype.setAngleDistanceGui = function(visible) {
	 	if ( visible ) {
	 		// Distance measure tool lazy initialization
	 		if ( !this.measureTool ) {
				this.measureTool = new MeasureTool({ globe: this.sky, navigation: this.navigation, isMobile: this.isMobile } );
			}
	 	}
		skyContext.setComponentVisibility("measureContainer", visible);
	};

	 /**************************************************************************************************************/

	/**
	 *	Add/remove samp GUI
	 *	Only on desktop
	 */
	MizarWidget.prototype.setSampGui = function(visible) {
		if ( !options.isMobile )
		{
			skyContext.setComponentVisibility("sampContainer", visible);
		}
	};

	 /**************************************************************************************************************/
	 
	/**
	 *	Add/remove shortener GUI
	 */
	MizarWidget.prototype.setShortenerUrlGui = function(visible) {
		skyContext.setComponentVisibility("shareContainer", visible);
	};

	/**************************************************************************************************************/

	/**
	 *	Add/remove 2d map GUI
	 */
	MizarWidget.prototype.set2dMapGui = function(visible) {
	 	if ( visible ) {
	 		// Mollweide viewer lazy initialization
	 		if ( !this.mollweideViewer ) {
				this.mollweideViewer = new MollweideViewer({ globe : this.sky, navigation : this.navigation, mizarBaseUrl: mizarBaseUrl });
			}
	 	}
	 	skyContext.setComponentVisibility("2dMapContainer", visible);
	 	
	};

	/**************************************************************************************************************/

	/**
	 *	Add/remove reverse name resolver GUI
	 */
	MizarWidget.prototype.setReverseNameResolverGui = function(visible) {
	 	if ( visible ) {
	 		ReverseNameResolverView.init(this, skyContext);
	 	} else {
	 		ReverseNameResolverView.remove();
	 	}
	};

	/**************************************************************************************************************/

	/**
	 *	Add/remove name resolver GUI
	 */
	MizarWidget.prototype.setNameResolverGui = function(visible) {
	 	if ( visible ) {
	 		NameResolverView.init(this);
	 	} else {
	 		NameResolverView.remove();
	 	}
	 	skyContext.setComponentVisibility("searchDiv", visible);
	};

	/**************************************************************************************************************/

	/**
	 *	Add/remove jQueryUI layer manager view
	 */
	MizarWidget.prototype.setCategoryGui = function(visible) {
		if ( visible ) {
	 		LayerManagerView.init(this, $.extend({element: $(parentElement).find("#categoryDiv")}, options));
	 	} else {
	 		LayerManagerView.remove();
	 	}
	 	skyContext.setComponentVisibility("categoryDiv", visible);
	};

	/**************************************************************************************************************/

	/**
	 *	Add/remove jQueryUI image viewer GUI
	 */
	MizarWidget.prototype.setImageViewerGui = function(visible) {
		if ( !options.isMobile )
		{
			if ( visible ) {
				ImageViewer.init(this);
		 	} else {
		 		ImageViewer.remove();
		 	}
		 	skyContext.setComponentVisibility("imageViewerDiv", visible);
		 }
	};

	/**************************************************************************************************************/

	/**
	 *	Add/remove position tracker GUI
	 */
	MizarWidget.prototype.setPositionTrackerGui = function(visible) {
		skyContext.setComponentVisibility("posTracker", visible);
	};

	/**************************************************************************************************************/
	
	/**
	 *	Set coordinate system
	 *	@param newCoordSystem
	 *		"EQ" or "GAL"(respectively equatorial or galactic)
	 */
	MizarWidget.prototype.setCoordinateSystem = function(newCoordSystem) {
		this.sky.coordinateSystem.type = newCoordSystem;

		if (this.mollweideViewer) {
			this.mollweideViewer.setCoordSystem( newCoordSystem );
		}

		// Publish modified event to update compass north
		this.navigation.publish('modified');
	};
	
	/**************************************************************************************************************/
	
	/**
	 *	Get all layers
	 */
	MizarWidget.prototype.getLayers = function() {
		return LayerManager.getLayers();
	};
	
	/**************************************************************************************************************/
	
	/**
	 *	Get layer with the given name
	 */
	MizarWidget.prototype.getLayer = function(layerName) {
		var layers = this.getLayers();
		return _.findWhere(layers, {name: layerName});
	};
	
	/**************************************************************************************************************/
	
	/**
	 *	Highlight the given feature
	 *
	 *	@param featureData
	 *		Feature data is an object composed by feature and its layer
	 *	@param options
	 *		Focus feature options(isExclusive and color)
	 *
	 *	// TODO : maybe it's more intelligent to store layer reference on feature ?
	 */
	MizarWidget.prototype.highlightObservation = function(featureData, options) {
		PickingManager.focusFeature(featureData, options);
	};

	/**************************************************************************************************************/

	/**
	 *	Add fits image to the given feature data
	 */
	MizarWidget.prototype.requestFits = function(featureData) {
		featureData.isFits = true; // TODO: Refactor it
		ImageManager.addImage(featureData);
	};

	/**************************************************************************************************************/

	/**
	 *	Remove fits image to the given feature data
	 */
	MizarWidget.prototype.removeFits = function(featureData) {
		ImageManager.removeImage(featureData);
	};

	/**************************************************************************************************************/

	/**
	 *	Convert votable to json from url
	 */
	MizarWidget.prototype.convertVotable2JsonFromURL = function(url, callback) {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url);
		var self = this;
		xhr.onload = function() {
		    var xml = xhr.responseXML;
		    if (xml) {
		    	self.convertVotable2JsonFromXML(xhr.responseText, callback);
		    }
		    else {
		        console.log("No XML response");
		    }
		};
		xhr.onerror = function(err) {
		    console.log("Error getting table " + url + "\n" +
		                    "(" + err + ")");
		};
		xhr.send(null);
	};

	/**************************************************************************************************************/

	/**
	 *	Convert votable to json from xml
	 */
	MizarWidget.prototype.convertVotable2JsonFromXML = function(xml, callback)
	{
		try {
            // Send response of xml to SiTools2 to convert it to GeoJSON
            $.ajax({
            	type: "POST",
            	url: options.votable2geojson.baseUrl,
            	data: {
            		votable: xml,
					coordSystem: "EQUATORIAL"
            	},
            	success: function(response)
            	{
         			callback(response);
            	},
            	error: function(thrownError)
            	{
            		console.error(thrownError);
            	}
            });
        }
        catch (e) {
            console.log("Error displaying table:\n" +
            e.toString());
        }
	};

	/**************************************************************************************************************/

	/**
	 *	Request moc layer for the given layer
	 *	TODO: Refactor MocBase !
	 */
	MizarWidget.prototype.requestMoc = function(layer, callback)
	{
		var mocLayer = MocBase.findMocSublayer(layer);

		// Create if doesn't exist
		if ( !mocLayer )
		{
			MocBase.createMocSublayer( layer, function(layer){
				callback( MocBase.findMocSublayer(layer) );
			}, function(layer){
				callback( MocBase.findMocSublayer(layer) );
			} );
		}
		else
		{
			callback(mocLayer);
		}
	};

	/**************************************************************************************************************/

	/**
	 *	Request sky coverage based on moc
	 *	TODO: Refactor MocBase !
	 */
	MizarWidget.prototype.requestSkyCoverage = function(layer, callback)
	{
		MocBase.getSkyCoverage(layer, function(layer) {
			callback(layer.coverage);
		}, function(layer) {
			callback(layer.coverage);
		});
	};

	/**************************************************************************************************************/

	/**
	 *	Intersect the given layers
	 */
	MizarWidget.prototype.xMatch = function( layers )
	{
		return MocBase.intersectLayers(layers);
	};

	/**************************************************************************************************************/

	/**
	 *	View planet with the given name
	 */
	MizarWidget.prototype.viewPlanet = function( planetName )
	{
		var planetLayer = this.getLayer( planetName );
		if ( planetLayer )
		{
			// HACK : mizar must be in sky mode to be toggled to earth mode
			// TODO: think about better mode management..
			this.mode = "sky";
			this.toggleMode(planetLayer);
		}
		else
		{
			console.error("No planet with name : " + planetName + " has been found");
		}
			
	};

	/**************************************************************************************************************/

	/**
	 *	Toggle between planet/sky mode
	 */
	MizarWidget.prototype.toggleMode = function(gwLayer) {
		this.mode = (this.mode === "sky") ? "planet" : "sky";
		var self = this;
		if ( this.mode === "sky" ) {
			console.log("Change planet to sky context");
			// Hide planet
			planetContext.hide();

			this.activatedContext = skyContext;
			// Add smooth animation from planet context to sky context
			planetContext.navigation.toViewMatrix(this.oldVM, this.oldFov, 2000, function() {
				// Show all additional layers
				skyContext.showAdditionalLayers();
				self.sky.renderContext.tileErrorTreshold = 1.5;
				self.publish("mizarMode:toggle", gwLayer);
				
				// Destroy planet context
				planetContext.destroy();
				planetContext = null;
				// Show sky
				skyContext.show();
				self.sky.refresh();
			});

		} else {
			console.log("Change sky to planet context");
			// Hide sky
			skyContext.hide();

			// Hide all additional layers
			skyContext.hideAdditionalLayers();

			// Create planet context( with existing sky render context )
			var planetConfiguration = {
				planetLayer: gwLayer,
				renderContext: this.sky.renderContext,
				initTarget: options.navigation.initTarget,
				nameResolver: {
					"zoomFov": 200000, // in fact it must be distance, to be improved
					"baseUrl": gwLayer.nameResolverURL
				},
				reverseNameResolver: {
					"baseUrl": gwLayer.revereseNameResolverURL	// TODO: define protocol for reverse name resolver
				}
			};
			planetConfiguration.renderContext['shadersPath'] ="externals/GlobWeb/shaders/";
			planetConfiguration = $.extend({}, options, planetConfiguration);
			planetContext = new PlanetContext(parentElement, planetConfiguration);
			planetContext.setComponentVisibility("categoryDiv", true);
			planetContext.setComponentVisibility("searchDiv", true);
			planetContext.setComponentVisibility("posTracker",this.activatedContext.components.posTracker);
                        planetContext.setComponentVisibility("compassDiv",false);
			// Propagate user-defined wish for displaying credits window			
			planetContext.credits = skyContext.credits;

			// Planet tile error treshold is less sensetive than sky's one
			this.sky.renderContext.tileErrorTreshold = 3;

			this.activatedContext = planetContext;

			// Store old view matrix & fov to be able to rollback to sky context
			this.oldVM = this.sky.renderContext.viewMatrix;
			this.oldFov = this.sky.renderContext.fov;
			
			// Compute planet view matrix
			var planetVM = mat4.create();
			planetContext.navigation.computeInverseViewMatrix();
			mat4.inverse( planetContext.navigation.inverseViewMatrix, planetVM );
			
			// Add smooth animation from sky context to planet context
			this.navigation.toViewMatrix(planetVM, 45, 2000, function() {
				planetContext.show();
				planetContext.globe.refresh();
				self.publish("mizarMode:toggle", gwLayer);
			});
		}
	};

	return MizarWidget;

});
