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
 */
define( [ "jquery", "gw/Globe", "gw/AttributionHandler", "gw/Navigation", "gw/Utils", "./MizarContext", "jquery.ui"],
	function($, Globe, AttributionHandler, Navigation, Utils, MizarContext) {

	/**************************************************************************************************************/

	/**
	 *	PlanetContext constructor
	 *
	 *	@param parentElement
	 *		Element containing the canvas
	 *	@param options Configuration properties for the Globe
	 *		<ul>
	 *			<li>planetLayer : Planet layer to set</li>
	 *			<li>renderContext : Sky <RenderContext> object</li>
	 *			<li>Same as Mizar options</li>
	 *		</ul>
	 */
	var PlanetContext = function(parentElement, options) {

		MizarContext.prototype.constructor.call( this, parentElement, options );
			
		// Initialize globe
		try
		{
			this.globe = new Globe( {
				tileErrorTreshold: 3, 
				continuousRendering: false,
				renderContext: options.renderContext
			} );
		}
		catch (err)
		{
			document.getElementById('GlobWebCanvas').style.display = "none";
			document.getElementById('loading').style.display = "none";
			document.getElementById('webGLNotAvailable').style.display = "block";
		}
		this.initGlobeEvents(this.globe);

		// Add attribution handler
		new AttributionHandler( this.globe, {element: 'globeAttributions'});

		// Initialize planet context
		this.planetLayer = options.planetLayer;
		if ( this.planetLayer )
		{
			this.globe.addLayer(this.planetLayer);
		}
		
		if ( options.isMobile )
		{
			this.initTouchNavigation(options);
		}
		// Don't update view matrix on creation, since we want to use animation on context change
		options.navigation.updateViewMatrix = false;
		this.navigation = new Navigation(this.globe, options.navigation);

		// Override position tracker visibility
		this.components.posTracker = false;
	}

	/**************************************************************************************************************/

	Utils.inherits( MizarContext, PlanetContext );

	/**************************************************************************************************************/

	/**
	 *	Get additional layers of planet context
	 */
	PlanetContext.prototype.getAdditionalLayers = function() {
		return this.planetLayer.layers;
	};

	/**************************************************************************************************************/
	/**
	 *	Destroy method
	 */
	PlanetContext.prototype.destroy = function() {
		this.globe.removeLayer(this.planetLayer);
		this.hide();
		this.globe.destroy();
		this.globe = null;
	}

	return PlanetContext;

});