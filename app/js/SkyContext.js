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
define( [ "jquery", "underscore-min", "gw/Sky", "gw/AstroNavigation", "gw/Utils",
	"./MizarContext","./LayerManager", "./PositionTracker", "jquery.ui"],
	function($, _, Sky, AstroNavigation, Utils,
			MizarContext, LayerManager, PositionTracker) {

	/**************************************************************************************************************/

	/**
	 *	Sky context constructor
	 *	@param parentElement
	 *		Element containing the canvas
	 *	@param options Configuration properties for the Globe
	 *		<ul>
	 *			<li>canvas : the canvas for WebGL, can be string (id) or a canvas element</li>
	 *			<li>Same as Mizar options</li>
	 *		</ul>
	 */
	var SkyContext = function(parentElement, options) {
		MizarContext.prototype.constructor.call( this, parentElement, options );

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

		this.initCanvas(options.canvas, parentElement);
		
		// Initialize sky
		try
		{
			// Create the sky
			this.globe = new Sky( { 
				canvas: options.canvas, 
				tileErrorTreshold: 1.5,
				continuousRendering: options.continuousRendering,
				radius: 10.,
				minFar: 15		// Fix problem with far buffer, with planet rendering
			} );
		}
		catch (err)
		{
			document.getElementById('GlobWebCanvas').style.display = "none";
			document.getElementById('loading').style.display = "none";
			document.getElementById('webGLNotAvailable').style.display = "block";
		}
		this.initGlobeEvents(this.globe);
		this.navigation = new AstroNavigation(this.globe, options.navigation);

		// Eye position tracker initialization
		PositionTracker.init({ element: "posTracker", globe: this.globe, navigation : this.navigation, isMobile: this.isMobile, positionTracker: options.positionTracker });
	}
	
	/**************************************************************************************************************/

	Utils.inherits( MizarContext, SkyContext );

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
			$(this.parentElement).find("#"+componentId).show();
		}
		else
		{
			$(this.parentElement).find("#"+componentId).hide();
		}
		this.components[componentId] = isVisible;
	}

	/**************************************************************************************************************/

	/**
	 *	"Show" sky context
	 */
	SkyContext.prototype.show = function() {

		MizarContext.prototype.show.apply(this);

		// Show UI components depending on its state
		for ( var componentId in this.components )
		{
			if ( this.components[componentId] )
			{
				$(this.parentElement).find("#"+componentId).show();
			}
		}
	}

	/**************************************************************************************************************/

	/**
	 *	"Hide" sky component
	 */
	SkyContext.prototype.hide = function() {

		MizarContext.prototype.hide.apply(this);

		// Hide all the UI components
		for ( var componentId in this.components )
		{
			$(this.parentElement).find("#"+componentId).hide();
		}

		this.globe.tileManagers["EQ"].abortRequests();
		this.globe.tileManagers["GAL"].abortRequests();
	}

	/**************************************************************************************************************/

	return SkyContext;

});