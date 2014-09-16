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
 * Planet context
 * TODO: unify with SkyContext ?
 */
define( [ "jquery", "underscore-min", "gw/Globe", "gw/Navigation", "gw/TouchNavigationHandler",
	"./ErrorDialog", "./AboutDialog", "jquery.ui"],
	function($, _, Globe, Navigation, TouchNavigationHandler,
			ErrorDialog, AboutDialog) {

	/**
	 *	Private variables
	 */
	
	var aboutShowed = false;
	var parentElement;
	var options;

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
	 *	Init canvas width/height & context-lost event
	 */
	var _initCanvas = function(canvas, parentElement) {
		// Set canvas dimensions from width/height attributes
		var width = $(parentElement).attr("width");
		if ( !width )
		{
			// Use window width by default if not defined
			width = window.innerWidth;
		}

		var height = $(parentElement).attr("height");
		if ( !height )
		{
			// Use window height if not defined
			height = window.innerHeight;
		}
		canvas.width = width;
		canvas.height = height;
		
		// Add some useful css properties to parent element
		$(parentElement).css({
			position: "relative",
			width: canvas.width,
			height: canvas.height,
			overflow: "hidden"
		});
		
		// Take into account window resize
		$(window).resize(function() {
			if ( canvas.width !=  window.innerWidth ) 
				canvas.width = window.innerWidth;
			if ( canvas.height != window.innerHeight )
				canvas.height = window.innerHeight;
		});

		// Context lost listener
		canvas.addEventListener("webglcontextlost", function(event) {
			// TODO
			event.preventDefault();
			document.getElementById('loading').style.display = "none";
			document.getElementById('webGLContextLost').style.display = "block";
		}, false);
	}

	/**************************************************************************************************************/

	/**
	 *	Initialize globe events
	 */
	var _initGlobeEvents = function(globe) {
		// When base layer is ready, hide loading
		globe.subscribe("baseLayersReady", _showAbout);

		// When base layer failed to load, open error dialog
		globe.subscribe("baseLayersError", function(layer){

			$(parentElement).find('#loading').hide();
			// TODO : handle multiple errors !
			var layerType = layer.id == 0 ? " background layer " : " additional layer ";
			ErrorDialog.open("<p>The"+ layerType + "<span style='color: orange'>"+layer.name+"</span> can not be displayed.</p>\
			 <p>First check if data source related to this layer is still accessible. Otherwise, check your Sitools2 configuration.</p>");
		});
	}

	/**************************************************************************************************************/

	/**
	 *	PlanetContext constructor
	 */
	var PlanetContext = function(canvas, div, options) {
		
		this.globe = null;
		this.navigation = null;
		this.canvas = canvas;
		parentElement = div;

		_initCanvas(canvas, div);
		
		// Initialize globe
		try
		{
			this.globe = new Globe( {
				canvas: canvas, 
				lighting: false,
				tileErrorTreshold: 3, 
				continuousRendering: true
			} );
		}
		catch (err)
		{
			document.getElementById('GlobWebCanvas').style.display = "none";
			document.getElementById('loading').style.display = "none";
			document.getElementById('webGLNotAvailable').style.display = "block";
		}
		_initGlobeEvents(this.globe);
		
		// TODO : Extend GlobWeb base layer to be able to publish events by itself
		// to avoid the following useless call
		this.globe.subscribe("features:added", function(featureData) {
			self.publish("features:added", featureData);
		});
		
		var self = this;
		// Add touch navigation handler if client supports touch events
		if( this.isMobile ) {
		    // Mobile
			options.navigation.handlers = [ new TouchNavigationHandler({ inversed: true, zoomOnDblClick: true }) ];
			window.addEventListener("orientationchange", function() {
				self.globe.renderContext.requestFrame();
			}, false);
		}
		this.navigation = new Navigation(this.globe, options.navigation);
		this.navigation.stop(); // Stopped by default
		
	}

	/**************************************************************************************************************/

	// Utils.inherits( Event, SkyContext );

	PlanetContext.prototype.show = function() {
		//$(parentElement).find('#GlobWebCanvas').hide();
		$(this.canvas).show();
		this.navigation.start();
	}

	PlanetContext.prototype.hide = function() {
		$(this.canvas).hide();
		this.navigation.stop();
	}

	return PlanetContext;

});