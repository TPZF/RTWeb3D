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

		this.initCanvas(options.canvas, parentElement);
		
		// Initialize sky
		try
		{
			// Create the sky
			this.globe = new Sky( { 
				canvas: options.canvas, 
				tileErrorTreshold: 1.5,
				continuousRendering: options.continuousRendering,
				renderTileWithoutTexture: false,
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

		if ( options.isMobile )
		{
			this.initTouchNavigation(options);
		}
		this.navigation = new AstroNavigation(this.globe, options.navigation);

		// Eye position tracker initialization
		PositionTracker.init({ element: "posTracker", globe: this.globe, navigation : this.navigation, isMobile: this.isMobile, positionTracker: options.positionTracker });
	};
	
	/**************************************************************************************************************/

	Utils.inherits( MizarContext, SkyContext );

	/**************************************************************************************************************/
	
	/**
	 *	Get additional layers of sky context
	 */
	SkyContext.prototype.getAdditionalLayers = function() {
		return _.filter(LayerManager.getLayers(), function(layer) {
			return layer.category !== "background";
		});
	};

	/**************************************************************************************************************/

	return SkyContext;

});
