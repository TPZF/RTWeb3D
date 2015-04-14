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
 * Planet renderer/layer module
 */
define( [ "jquery", "underscore-min", "gw/BaseLayer", "gw/WMSLayer", "gw/WCSElevationLayer", "gw/Utils" ],
		function($, _, BaseLayer, WMSLayer, WCSElevationLayer, Utils) {

/**
 * 	@constructor
 * 	@class
 * 	PlanetLayer
 */
var PlanetLayer = function(options)
{
	BaseLayer.prototype.constructor.call( this, options );
	this.name = options.name;
	this.baseImageries = [];
	this.layers = [];
	this.category = "Planets";
	this.nameResolverURL = options.nameResolverURL;

	for ( var i=0; i<options.baseImageries.length; i++ )
	{
		var planetDesc = options.baseImageries[i];
		planetDesc = $.extend( {}, options, planetDesc );
		var gwLayer = new WMSLayer( planetDesc );
		gwLayer.background = true;
		gwLayer.category = "background";
		this.baseImageries.push(gwLayer);
	}
	if ( options.elevation )
	{
		this.elevationLayer = new WCSElevationLayer(options.elevation);
	}
};

/**************************************************************************************************************/

Utils.inherits( BaseLayer, PlanetLayer );

/**************************************************************************************************************/

PlanetLayer.prototype._attach = function( g )
{
	BaseLayer.prototype._attach.call( this, g );
	var baseImagery = _.findWhere(this.baseImageries, {_visible: true});
	// Set first WMS layer as base imagery
	if ( !baseImagery )
	{
		baseImagery = this.baseImageries[0];
	}
	this.globe.setBaseImagery(baseImagery);
	// Set elevation if exists
	if ( this.elevationLayer )
	{
		this.globe.setBaseElevation( this.elevationLayer );
	}
	baseImagery.visible(true)

	for ( var i=0; i<this.layers.length; i++ )
	{
		this.globe.addLayer(this.layers[i]);
	}
};

/**************************************************************************************************************/

PlanetLayer.prototype._detach = function() {
	this.globe.setBaseImagery(null);
	for ( var i=0; i<this.layers.length; i++ )
	{
		this.globe.removeLayer(this.layers[i]);
	}
	BaseLayer.prototype._detach.call(this);
};

/**************************************************************************************************************/

return PlanetLayer;

});
