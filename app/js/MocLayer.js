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
 * Moc renderer/layer module
 */
define( [ "jquery.ui", "gw/BaseLayer", 'gw/FeatureStyle', "gw/Utils", "gw/HEALPixBase", "gw/CoordinateSystem" ],
		function($, BaseLayer, FeatureStyle, Utils, HEALPixBase, CoordinateSystem) {

/**
 * 	@constructor
 * 	@class
 * 	MocLayer
 *
 * 	@param options Configuration options
 * 		<ul>
 *			<li>serviceUrl : Url of the service providing the MOC data(necessary option)</li>
 *		</ul>
 */
var MocLayer = function(options)
{

	BaseLayer.prototype.constructor.call( this, options );

	this.serviceUrl = options.serviceUrl;

	// Set style
	if ( options && options['style'] )
	{
		this.style = new FeatureStyle(options['style']);
	}
	else
	{
		this.style = new FeatureStyle();
	}

	this.polygonRenderer = null;
	this.polygonBucket = null;
	this.featuresSet = null;
}

/**************************************************************************************************************/

Utils.inherits( BaseLayer, MocLayer );

/**************************************************************************************************************/

/**
 * 	Attach the layer to the globe
 * 
 * 	@param g The globe
 */
MocLayer.prototype._attach = function( g )
{
	BaseLayer.prototype._attach.call( this, g );
	
	this.polygonRenderer = this.globe.vectorRendererManager.getRenderer("ConvexPolygon"); 
	this.polygonBucket = this.polygonRenderer.getOrCreateBucket( this, this.style );

	var self = this;
	$.ajax({
		type: "GET",
		url: self.serviceUrl,
		dataType: 'json',
		success: function(response){
				self.handleDistribution(response);
		},
		error: function (xhr, ajaxOptions, thrownError) {
			// TODO publish event ?
			$('#addLayer_'+self.id).find('label').css("color","red");
			console.error( xhr.responseText );
		}
	});
}

/**************************************************************************************************************/

/** 
  Detach the layer from the globe
 */
MocLayer.prototype._detach = function()
{
	for ( var x in this.featuresSet )
	{
		this.polygonRenderer.removeGeometryFromTile(this.featuresSet[x].geometry, this.featuresSet[x].tile);
	}
	this.featuresSet = null;
	this.polygonRenderer = null;
	this.polygonBucket = null;

	BaseLayer.prototype._detach.call(this);
}

/**************************************************************************************************************/

/**
 *	Return children indices of order 3
 *	@param index Parent index
 *	@param order Parent order
 */
MocLayer.prototype.findChildIndices = function(index, order)
{
	var childOrder = 3;
	var orderDepth = childOrder - order;
	var numSubTiles = Math.pow(4,orderDepth); // Number of subtiles depending on order
	var firstSubTileIndex = index * numSubTiles;
	var indices = [];
	for ( var i=firstSubTileIndex; i<firstSubTileIndex + numSubTiles; i++ )
	{
		indices.push(i);
	}

	return indices;
}

/**************************************************************************************************************/

/**
 *	Return index of parent of order 3
 *	@param index Child index
 *	@param order Child order
 */
MocLayer.prototype.findParentIndex = function(index, order)
{
	var parentOrder = 3;
	var orderDepth = order - parentOrder;
	var parentIndex = Math.floor( index / (Math.pow(4,orderDepth)) );
	return parentIndex;
}

/**************************************************************************************************************/

/**
 *	Handle MOC response
 *
 *	@param response MOC response
 */
MocLayer.prototype.handleDistribution = function(response)
{	
	var gl = this.globe.tileManager.renderContext.gl;
	this.featuresSet = {};
	// For each order, compute rectangles geometry depending on the pixel index
	for (var key in response)
	{
		var order = parseInt(key);
		for(var i=0; i<response[key].length; i++)
		{
			var pixelIndex = response[key][i];

			if ( order > 3 )
			{
				var parentIndex = this.findParentIndex(pixelIndex, order);
			}
			else if ( order == 3 )
			{
				var parentIndex = pixelIndex;
			}
			else
			{
				// Handle low orders(< 3) by creating children polygons of order 3
				var indices = this.findChildIndices( pixelIndex, order );
				response["3"] = response["3"].concat( indices );
				continue;
			}

			var geometry = {
				type: "Polygon",
				gid: "moc"+this.id+"_"+order+"_"+pixelIndex,
				coordinates: [[]]
			};

			// Build the vertices
			var size = 2; // TODO
			var step = 1;

			// Tesselate only low-order tiles
			if ( order < 5 )
			{
				size = 5;
				step = 1./(size - 1);
			}
			
			var nside = Math.pow(2, order);
			var pix=pixelIndex&(nside*nside-1);
			var ix = HEALPixBase.compress_bits(pix);
			var iy = HEALPixBase.compress_bits(pix>>>1);
			var face = (pixelIndex>>>(2*order));

			var vertice, geo;

			// Horizontal boudaries
			for(var u = 0; u < 2; u++ ) {
				for(var v = 0; v < size; v++){
					vertice = HEALPixBase.fxyf((ix+u*(size-1)*step)/nside, (iy+v*step)/nside, face);
					geo = CoordinateSystem.from3DToGeo( vertice );
					if ( u == 0 )
					{
						// Invert to clockwise sense
						geometry.coordinates[0][2*u*size +(size-1)-v] = geo;
					}
					else
					{
						geometry.coordinates[0][2*u*size +v] = geo;
					}
				}
			}

			// Vertical boundaries
			for(var v = 0; v < 2; v++ ) {
				for(var u = 0; u < size; u++ ){
					vertice = HEALPixBase.fxyf((ix+u*step)/nside, (iy+v*(size-1)*step)/nside, face);
					geo = CoordinateSystem.from3DToGeo( vertice );
					if ( v==1 )
					{
						// Invert to clockwise sense
						geometry.coordinates[0][size + 2*v*size +(size-1)-u] = geo;
					}
					else
					{
						geometry.coordinates[0][size + 2*v*size +u] = geo;
					}	
				}
			}
				
			var parentTile = this.globe.tileManager.level0Tiles[parentIndex];

			this.featuresSet[ geometry.gid ] = {
				geometry: geometry,
				tile: parentTile
			};

			this.polygonRenderer.addGeometryToTile( this.polygonBucket, geometry, parentTile );
		}
	}
}

return MocLayer;

});
