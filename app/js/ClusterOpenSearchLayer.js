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

define( [ "gw/FeatureStyle", "gw/Utils", "gw/OpenSearchLayer", "gw/HEALPixBase", "gw/CoordinateSystem", "gw/RendererTileData" ],
		function(FeatureStyle, Utils, OpenSearchLayer, HEALPixBase, CoordinateSystem, RendererTileData) {

/**************************************************************************************************************/

/**	@constructor
 * 	@class
 * 	Cluster OpenSearch layer
 * 	
 * 	@param options Configuration options
 * 		<ul>
			<li>serviceUrl : Url of OpenSearch description XML file(necessary option)</li>
			<li>minOrder : Starting order for OpenSearch requests</li>
			<li>displayProperties : Properties which will be shown in priority</li>
			<li>treshold : Visibility treshold</li>
			<li>maxClusterOrder: Maximal cluster refinement order</li>
			<li>accuracyOrder : Accuracy order</li>
		</ul>
*/
var ClusterOpenSearchLayer = function(options){

	OpenSearchLayer.prototype.constructor.call( this, options );

	// Configure cluster service options
	this.treshold = options.treshold || 5;
	this.maxClusterOrder = options.maxClusterOrder || 8;
	this.accuracyOrder = options.accuracyOrder || 10;
	this.coordSystemRequired = options.hasOwnProperty('coordSystemRequired') ? options.coordSystemRequired : true;

	// Handle distributions
	this.distributions = null;
	this.clusterServiceUrl = null;

	this.handleClusterService();

	this.clusterStyle = new FeatureStyle(this.style);
	this.clusterStyle.iconUrl = options.clusterIconUrl || "css/images/cluster.png";
	this.clusterBucket = null;
}

/**************************************************************************************************************/

Utils.inherits( OpenSearchLayer, ClusterOpenSearchLayer );

/**************************************************************************************************************/

/** 
 *	Detach the layer from the globe
 */
ClusterOpenSearchLayer.prototype._detach = function()
{
	OpenSearchLayer.prototype._detach.call( this );
	this.clusterBucket = null;
}

/**************************************************************************************************************/

/**
 *	Get cluster service url from OpenSearch description XML file
 */
ClusterOpenSearchLayer.prototype.handleClusterService = function()
{
	var xhr = new XMLHttpRequest();
	var self = this;
	xhr.onreadystatechange = function(e)
	{
		if ( xhr.readyState == 4 ) 
		{
			if ( xhr.status == 200 )
			{
				var urls = xhr.responseXML.getElementsByTagName("Url");
				// Find rel=clusterdesc url
				for ( var i=0; i<urls.length; i++ )
				{
					if ( urls[i].attributes.getNamedItem("rel") && urls[i].attributes.getNamedItem("rel").nodeValue == "clusterdesc" )
					{
						// Get clusterdesc template
						var describeUrl = urls[i].attributes.getNamedItem("template").nodeValue;
						
						if ( describeUrl )
						{
							// Cut unused data
							var splitIndex = describeUrl.indexOf( "q=" );
							if ( splitIndex != -1 )
							{
								self.clusterServiceUrl = describeUrl.substring( 0, splitIndex );
							}
							else
							{
								self.clusterServiceUrl =  describeUrl;
							}
							self.updateDistributions(self);
						}
						break;
					}
				}
				if ( i == urls.length )
				{
					// Cluster description doesn't exist, use open search without clusters
					self.prototype = OpenSearchLayer.prototype;
				}
			}
			else
			{
				// Cluster description doesn't exist, use open search without clusters
				self.prototype = OpenSearchLayer.prototype;
			}
		}
	};
	xhr.open("GET", this.serviceUrl );
	xhr.send();
}

/**************************************************************************************************************/

/**
 *	Update cluster distribution
 */
ClusterOpenSearchLayer.prototype.updateDistributions = function(layer)
{
	var xhr = new XMLHttpRequest();
	var url = layer.clusterServiceUrl + layer.requestProperties;
	xhr.onreadystatechange = function(e)
	{
		if ( xhr.readyState == 4 ) 
		{
			if ( xhr.status == 200 )
			{
				var response = JSON.parse(xhr.response);
				layer.handleDistribution(response);
			}
		}
	};
	xhr.open("GET", url );
	xhr.send();
}

/**************************************************************************************************************/

/**
 *	Handle SOLR distribution response
 *
 *	@param response SOLR response
 *	@param distributions Distributions ClusterManager variable
 */
ClusterOpenSearchLayer.prototype.handleDistribution = function(response)
{
	var distributions = {};
	var facet_fields = response.facet_counts.facet_fields;
	var order = 3;
	for (var key in facet_fields)
	{
		distributions[order] = {};
		for (var i=0; i<facet_fields[key].length; i+=2)
		{
			distributions[order][facet_fields[key][i]] = facet_fields[key][i+1];
		}
		order++;
	}
	this.distributions = distributions;
}

/**************************************************************************************************************/

/**
 *	Adding cluster geometry to renderer
 *
 *	@param pixelIndex Pixel index
 *	@param order Pixel order
 *	@param face Face of pixel
 *	@param pixelDistribution Number of features in cluster
 */
ClusterOpenSearchLayer.prototype.addCluster = function(pixelIndex, order, face, pixelDistribution, tile)
{
	
	// Create geometry
	var nside = Math.pow(2, order);
	var pix=pixelIndex&(nside*nside-1);
	var ix = HEALPixBase.compress_bits(pix);
	var iy = HEALPixBase.compress_bits(pix>>>1);
	var center = HEALPixBase.fxyf((ix+0.5)/nside, (iy+0.5)/nside, face);

	var geo = CoordinateSystem.from3DToGeo( center );
	var pos3d = center;
	var vertical = vec3.create();
	vec3.normalize(pos3d, vertical);
	
	var geometry = {
		coordinates: geo,
		type: "Point"
	};

	// Create renderable
	var identifier = order+"_"+pixelIndex;
	var feature = {
		geometry: geometry,
		properties: {
			featureNum: pixelDistribution,
			identifier: identifier,
			title: "Cluster("+pixelDistribution+")",
			order: order,
			pixelIndex: pixelIndex,
			style: new FeatureStyle(this.clusterStyle)
		},
		cluster : true
	};
	tile.extension[this.extId].containsCluster = true;
	this.addFeature( feature, tile );
}

/**************************************************************************************************************/

/**
 * 	Launch request to the OpenSearch service
 */
ClusterOpenSearchLayer.prototype.launchRequest = function(tile, url)
{
	var tileData = tile.extension[this.extId];
	var index = null;
	
	if ( this.freeRequests.length == 0 )
	{
		return;
	}
	
	// Set that the tile is loading its data for OpenSearch
	tileData.state = OpenSearchLayer.TileState.LOADING;

	// Add request properties to length
	if ( this.requestProperties != "" )
	{
		url += '&' + this.requestProperties;
	}
		
	// Publish the start load event, only if there is no pending requests
	if ( this.maxRequests == this.freeRequests.length )
	{
		this.globe.publish("startLoad",this);
	}

	var xhr = this.freeRequests.pop();

	var self = this;
	xhr.onreadystatechange = function(e)
	{
		if ( xhr.readyState == 4 ) 
		{
			if ( xhr.status == 200 )
			{
				var response = JSON.parse(xhr.response);

				if ( !tileData.containsCluster )
				{
					tileData.complete = (response.totalResults == response.features.length);
				}

				self.updateFeatures(response.features);
				
				if ( response.features.length > 0 )
				{
					for ( var i=0; i < response.features.length; i++ )
					{
						self.addFeature( response.features[i], tile );
					}
				}
			}
			else if ( xhr.status >= 400 )
			{
				console.error( xhr.responseText );
			}
			
			tileData.state = OpenSearchLayer.TileState.LOADED;
			self.freeRequests.push( xhr );
			
			// Publish the end load event, only if there is no pending requests
			if ( self.maxRequests == self.freeRequests.length )
			{
				self.globe.publish("endLoad",self);
			}
		}
	};
	xhr.open("GET", url );
	xhr.send();
}

/**************************************************************************************************************/

ClusterOpenSearchLayer.prototype.buildUrl = function( tile )
{
	if ( this.distributions && tile.order < this.maxClusterOrder  )
	{
		var pixelIndicesToRequest = [];
		var orderDepth = this.accuracyOrder - tile.order;
		var childOrder = this.accuracyOrder;

		if(  this.distributions[childOrder] )
		{
			// Distribution exists
			var numSubTiles = Math.pow(4,orderDepth); // Number of subtiles depending on order
			var firstSubTileIndex = tile.pixelIndex * numSubTiles;

			for ( var j=firstSubTileIndex; j<firstSubTileIndex+numSubTiles; j++ )
			{
				var pixelDistribution = this.distributions[childOrder][j];
				if ( pixelDistribution > this.treshold )
				{
					// Cluster child
					this.addCluster(j, this.accuracyOrder, tile.face, pixelDistribution, tile);
				}
				else if ( pixelDistribution > 0 )
				{
					// Feature containing child
					pixelIndicesToRequest.push(j);
				}
			}
		}
		
		if ( pixelIndicesToRequest.length > 0 )
		{
			var indices = "";
			for ( var i=0; i<pixelIndicesToRequest.length-1; i++ )
			{
				indices+=pixelIndicesToRequest[i]+",";
			}
			indices+=pixelIndicesToRequest[i];

			var url = this.serviceUrl + "/search?order=" + childOrder + "&healpix=" + indices;

			return url;
		}
		else 
		{
			if ( !tile.extension[this.extId].containsCluster )
			{
				// Empty tile
				tile.extension[this.extId].complete = true;
			}
			tile.extension[this.extId].state = OpenSearchLayer.TileState.LOADED;
			return null;
		}
	}
	else
	{
		return OpenSearchLayer.prototype.buildUrl.call( this, tile );
	}
}

/**************************************************************************************************************/

/**
 * 	Set new request properties
 */
ClusterOpenSearchLayer.prototype.setRequestProperties = function(properties)
{
	OpenSearchLayer.prototype.setRequestProperties.call( this, properties );
	// Reset distributions
	this.distributions = null;
	this.updateDistributions(this);
}

return ClusterOpenSearchLayer;

});