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
 *	Abstract class for mizar context
 *	Implemented by SkyContext and PlanetContext
 */
define( [ "jquery", "gw/TouchNavigationHandler", "./ErrorDialog", "./AboutDialog", "jquery.ui"],
	function($, TouchNavigationHandler,	ErrorDialog, AboutDialog) {

	/**************************************************************************************************************/

	/**
	 *	Mizar context constructor
	 */
	var MizarContext = function(div, options) {

		this.components = {
			"2dMapContainer": false,
			"posTracker": false,
			"shareContainer": false,
			"sampContainer": false,
			"measureContainer": false,
			"compassDiv": false,
			"imageViewerDiv": false,
			"posTracker": true,
			"categoryDiv": false,
			"searchDiv": false
		};

		this.globe = null;	// Sky or globe
		this.navigation = null;
		this.parentElement = div;
		this.aboutShown = false;
		this.configuration = options;
		
		// Add touch navigation handler if client supports touch events
		if( options.isMobile ) {
		    var self = this;
			options.navigation.handlers = [ new TouchNavigationHandler({ inversed: true, zoomOnDblClick: true }) ];
			window.addEventListener("orientationchange", function() {
				self.sky.renderContext.requestFrame();
			}, false);
		}
	}
	
	/**************************************************************************************************************/

	MizarContext.prototype.initCanvas = function(canvas)
	{
		// Set canvas dimensions from width/height attributes
		var width = $(this.parentElement).attr("width");
		if ( !width )
		{
			// Use window width by default if not defined
			width = window.innerWidth;
		}

		var height = $(this.parentElement).attr("height");
		if ( !height )
		{
			// Use window height if not defined
			height = window.innerHeight;
		}
		canvas.width = width;
		canvas.height = height;
		
		// Add some useful css properties to parent element
		$(this.parentElement).css({
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
	 *	Hide loading and show about on first connection
	 */
	MizarContext.prototype.showAbout = function()
	{
		// Show about information only at the end of first loading
		if ( localStorage.showAbout == undefined && !this.aboutShowed )
		{
			AboutDialog.show();
			this.aboutShowed = true;
		}

		$(this.parentElement).find('#loading').hide(300);
	}

	/**************************************************************************************************************/

	/**
	 *	Initialize globe events
	 */
	MizarContext.prototype.initGlobeEvents = function()
	{
		// When base layer is ready, hide loading
		this.globe.subscribe("baseLayersReady", $.proxy(this.showAbout, this));

		// When base layer failed to load, open error dialog
		this.globe.subscribe("baseLayersError", function(layer){

			$(this.parentElement).find('#loading').hide();
			// TODO : handle multiple errors !
			var layerType = layer.id == 0 ? " background layer " : " additional layer ";
			ErrorDialog.open("<p>The"+ layerType + "<span style='color: orange'>"+layer.name+"</span> can not be displayed.</p>\
			 <p>First check if data source related to this layer is still accessible. Otherwise, check your Sitools2 configuration.</p>");
		});
	}

	/**************************************************************************************************************/

	/**
	 *	"Show" sky context
	 */
	MizarContext.prototype.show = function() {
		this.navigation.start();

		// Show UI components depending on its state
		for ( var componentId in this.components )
		{
			if ( this.components[componentId] )
			{
				$(this.parentElement).find("#"+componentId).fadeIn(1000);
			}
		}
	}

	/**************************************************************************************************************/

	/**
	 *	"Hide" sky component
	 */
	MizarContext.prototype.hide = function() {
		this.navigation.stopAnimations();
		this.navigation.stop();

		// Hide all the UI components
		for ( var componentId in this.components )
		{
			$(this.parentElement).find("#"+componentId).fadeOut();
		}
	}

	/**************************************************************************************************************/

	/**
	 *	Set UI component visibility
	 */
	MizarContext.prototype.setComponentVisibility = function(componentId, isVisible)
	{
		if ( isVisible )
		{
			$(this.parentElement).find("#"+componentId).show();
		}
		else
		{
			$(this.parentElement).find("#"+componentId).hide();
		}
		this.components[componentId] = isVisible;
	}

	/**************************************************************************************************************/

	return MizarContext;

});