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
 * Sky context
 */
define( [ "jquery", "underscore-min", "gw/Sky", "gw/AstroNavigation", "gw/TouchNavigationHandler",
	"./LayerManager", "./ErrorDialog", "./AboutDialog", "./PositionTracker", "jquery.ui"],
	function($, _, Sky, AstroNavigation, TouchNavigationHandler,
			LayerManager, ErrorDialog, AboutDialog, PositionTracker) {

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
	 *	Sky context constructor
	 */
	var SkyContext = function(canvas, div, options) {
		var self = this;
		this.components = {
			"2dMapContainer": false,
			"posTracker": false,
			"shareContainer": false,
			"sampContainer": false,
			"measureContainer": false,
			"compassDiv": false,
			"imageViewerDiv": false,
			"posTracker": true
		};
		this.sky = null;
		this.navigation = null;
		this.canvas = canvas;
		parentElement = div;

		_initCanvas(canvas, div);
		
		// Initialize sky
		try
		{
			// Create the sky
			this.sky = new Sky( { 
				canvas: canvas, 
				tileErrorTreshold: 1.5,
				continuousRendering: options.continuousRendering,
				radius: 10.,
				minFar: 15		// Fix problem with far buffer, with planet rendering
			} );
		}
		catch (err)
		{
			document.getElementById('SkyCanvas').style.display = "none";
			document.getElementById('loading').style.display = "none";
			document.getElementById('webGLNotAvailable').style.display = "block";
		}
		_initGlobeEvents(this.sky);
		
		// Add touch navigation handler if client supports touch events
		if( this.isMobile ) {
		    // Mobile
			options.navigation.handlers = [ new TouchNavigationHandler({ inversed: true, zoomOnDblClick: true }) ];
			window.addEventListener("orientationchange", function() {
				self.sky.renderContext.requestFrame();
			}, false);
		}
		this.navigation = new AstroNavigation(this.sky, options.navigation);

		// Eye position tracker initialization
		PositionTracker.init({ element: "posTracker", globe: this.sky, navigation : this.navigation, isMobile: this.isMobile, positionTracker: options.positionTracker });
	}
	
	/**************************************************************************************************************/
	
	/**
 	 *	Show additional layers
	 *	(used on context change)
	 */
	SkyContext.prototype.showAdditionalLayers = function()
	{
		_.each(this.visibleLayers, function(layer) {
			layer.visible(true);
		});
	};	

	/**************************************************************************************************************/
	
	/**
	 *	Hide additional layers
	 *	(used on context change)
	 */
	SkyContext.prototype.hideAdditionalLayers = function()
	{
		this.visibleLayers = [];
		var gwLayers = LayerManager.getLayers();
		var self = this;
		_.each(gwLayers, function(layer){
			if ( layer.category != "background" && layer.visible() )
			{
				layer.visible(false);
				self.visibleLayers.push(layer);
			}
			
		});
	};

	/**************************************************************************************************************/

	/**
	 *	Set UI component visibility
	 */
	SkyContext.prototype.setComponentVisibility = function(componentId, isVisible)
	{
		if ( isVisible )
		{
			$(parentElement).find("#"+componentId).show();
		}
		else
		{
			$(parentElement).find("#"+componentId).hide();
		}
		this.components[componentId] = isVisible;
	}

	/**************************************************************************************************************/

	/**
	 *	"Show" sky context
	 */
	SkyContext.prototype.show = function() {
		// Show UI components depending on its state
		for ( var componentId in this.components )
		{
			if ( this.components[componentId] )
			{
				$(parentElement).find("#"+componentId).show();
			}
		}

		this.navigation.start();
	}

	/**************************************************************************************************************/

	/**
	 *	"Hide" sky component
	 */
	SkyContext.prototype.hide = function() {
		// Hide all the UI components
		for ( var componentId in this.components )
		{
			$(parentElement).find("#"+componentId).hide();
		}

		this.sky.tileManagers["EQ"].abortRequests();
		this.sky.tileManagers["GAL"].abortRequests();
		this.navigation.stopAnimations();
		this.navigation.stop();
	}

	/**************************************************************************************************************/

	return SkyContext;

});