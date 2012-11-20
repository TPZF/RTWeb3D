/**
 * Dynamic OpenSearch renderer module
 */
define( [ "jquery.ui", "Utils" ], function($, Utils) {

/**
 * 	@constructor
 * 	@class
 * 	OpenSearch dynamic layer currently for points rendering only
 * 	
 * 	@param tileManager Tile manager
 * 	@param options Configuration options
 * 		<ul>
			<li>serviceUrl : Url of the service providing the OpenSearch data(necessary option)</li>
			<li>minOrder : Starting order for OpenSearch requests</li>
		</ul>
 */
DynamicOSLayer = function(options)
{
	GlobWeb.BaseLayer.prototype.constructor.call( this, options );
	
	this.serviceUrl = options.serviceUrl;
	this.minOrder = options.minOrder || 5;

	// Set style
	if ( options && options['style'] )
	{
		this.style = options['style'];
	}
	else
	{
		this.style = new GlobWeb.FeatureStyle({
			iconUrl: "css/images/star.png"
		});
	}
	
	// TODO "os" is overriden by BaseLayer id when attached by globe
	this.id = "os";

	// Used for picking management
	this.features = [];
	// Counter set, indicates how many times the feature has been requested
	this.featuresSet = new Set();

	// Maximum two requests for now
	this.requests = [ null, null ];
	
	// For rendering
	this.bucket = null;
	this.lineRenderer = null;
	this.pointRenderer = null;
}

/**************************************************************************************************************/

GlobWeb.inherits( GlobWeb.BaseLayer, DynamicOSLayer );

/**************************************************************************************************************/

/**
 * 	Attach the layer to the globe
 * 
 * 	@param g The globe
 */
DynamicOSLayer.prototype._attach = function( g )
{
	GlobWeb.BaseLayer.prototype._attach.call( this, g );
	
	this.pointRenderer = new GlobWeb.PointRenderer( g.tileManager );
	this.lineRenderer = new GlobWeb.SimpleLineRenderer( g.tileManager );
	this.bucket = this.pointRenderer.getOrCreateBucket( this, this.style );
	g.tileManager.addPostRenderer(this);
}

/**************************************************************************************************************/

/** 
  Detach the layer from the globe
 */
DynamicOSLayer.prototype._detach = function()
{
	this.globe.tileManager.removePostRenderer(this);
	this.pointRenderer = null;
	this.bucket = null;
	
	GlobWeb.BaseLayer.prototype._detach.call(this);
}

/**************************************************************************************************************/

/**
 * 	Launch request to the OpenSearch service
 */
DynamicOSLayer.prototype.launchRequest = function(tile)
{
	var index = null;

	for ( var i = 0; i < this.requests.length; i++ )
	{
		if ( !this.requests[i] )
		{
			this.requests[i] = tile;
			index = i;
			break;
		}
	}
	
	var self = this;
	if (index)
	{
		$.ajax({
			type: "GET",
			url: self.serviceUrl + "order=" + tile.order + "&healpix=" + tile.pixelIndex,
			success: function(response){
				tile.extension[self.id] = new DynamicOSLayer.OSData(self);
				tile.extension[self.id].complete = (response.totalResults == response.features.length);
				recomputeFeaturesGeometry(response.features);
				
				for ( var i=0; i<response.features.length; i++ )
				{
					self.addFeature( response.features[i], tile );
				}
				self.requests[index] = null;
			},
			error: function (xhr, ajaxOptions, thrownError) {
				self.requests[index] = null;
				console.error( xhr.responseText );
			}
		});
	}
}

/**************************************************************************************************************/

/*
	Add a geometry to the tile extension
 */
DynamicOSLayer.prototype.addGeometryToTile = function(geometry,tile)
{
	var posGeo = geometry['coordinates'];
	if ( geometry['type'] == "Point" )
	{
		var pos3d = GlobWeb.CoordinateSystem.fromGeoTo3D( posGeo );
		var vertical = vec3.create();
		vec3.normalize(pos3d, vertical);
		
		var pointRenderData = {
			geometry: geometry,
			pos3d: pos3d,
			vertical: vertical,
			color: this.style.fillColor
		};
		
		tile.extension[this.id].points.push( pointRenderData );
	} 
	else if ( geometry['type'] == "Polygon" )
	{
		this.lineRenderer.addGeometry(geometry,this,this.style);
		tile.extension[this.id].lines.push( this.lineRenderer.renderables[ this.lineRenderer.renderables.length-1 ] );
	}
}

/**************************************************************************************************************/

/**
 *	Add feature to the layer and to the tile extension
 */
DynamicOSLayer.prototype.addFeature = function( feature, tile )
{
	// Add feature if it doesn't exist
	if ( !this.featuresSet[feature.properties.identifier] )
	{
		this.features.push( feature );
		this.featuresSet.add( feature.properties.identifier, 1 );
	}
	else
	{
		// Increment the number of requests for current feature
		this.featuresSet[feature.properties.identifier]++;
	}

	// Add feature id
	tile.extension[this.id].featureIds.push( feature.properties.identifier );
	// Add feature geometry to the tile
	this.addGeometryToTile( feature.geometry, tile );
}

/**************************************************************************************************************/

/**
 *	Remove feature from Dynamic OpenSearch layer
 */
DynamicOSLayer.prototype.removeFeature = function( geometry, identifier )
{
	// BUG ! Children tiles don't dispose their extension resources
	if ( this.featuresSet[identifier] == 1 )
	{
		// Last feature
		this.featuresSet.remove( identifier );
		for ( var i = 0; i<this.features.length; i++ )
		{
			var currentFeature = this.features[i];
			if ( currentFeature.properties.identifier == identifier){
				this.features.splice(i, 1);
			}
		}
	}
	else
	{
		// Decrease
		this.featuresSet[identifier]--;
	}
}

/**************************************************************************************************************/

/**
 *	Modifies feature style
 */
DynamicOSLayer.prototype.modifyFeatureStyle = function( feature, style ){
	// TODO
	feature.properties.style = style;
}

/**************************************************************************************************************/


/**
 *	@constructor
 *	DynamicOSLayer.OSData constructor
 *
 *	OpenSearch renderable
 */
DynamicOSLayer.OSData = function(layer)
{
	this.layer = layer;
	this.featureIds = []; // exclusive parameter to remove from layer
	this.points = [];
	this.lines = [];
	this.complete = false;
}

/**************************************************************************************************************/

/**
 * 	Dispose renderable data from tile
 *	
 */
DynamicOSLayer.OSData.prototype.dispose = function( renderContext, tilePool )
{	
	for( var i=0; i<this.points.length; i++ )
	{
		this.layer.removeFeature(this.points[i].geometry, this.featureIds[i] );
	}
		
	this.points.length = 0;
}

/**************************************************************************************************************/

/*
	Render function
	
	@param tiles The array of tiles to render
 */
DynamicOSLayer.prototype.render = function( tiles )
{
	if (!this._visible)
		return;
		
	// Traverse the tiles to find all available data, and request data for needed tiles
	
	var points = [];
	var lines = [];
	var visitedTiles = {};
	
	for ( var i = 0; i < tiles.length; i++ )
	{
		var tile = tiles[i];
		if ( tile.order >= this.minOrder )
		{
			var tileData = tile.extension[this.id];
			if( !tileData )
			{				
				// Search for available data on tile parent
				var completeDataFound = false;
				var prevVisitTile = tile;
				var visitTile = tile.parent;
				while ( visitTile && visitTile.order >= this.minOrder )
				{
					tileData = visitTile.extension[this.id];
					if ( tileData )
					{
						var key = visitTile.order + "_" + visitTile.pixelIndex;
						if ( !visitedTiles.hasOwnProperty(key) )
						{
							if ( tileData.points.length > 0 )
								points = points.concat( tileData.points );
							if ( tileData.lines.length > 0 )
								lines = lines.concat( tileData.lines );							
						}
						visitedTiles[key] = true;
						visitTile = null;
						completeDataFound = tileData.complete;
					}
					else 
					{
						prevVisitTile = visitTile;
						visitTile = visitTile.parent;
					}
				}
				
				// Only request the file if needed, ie if a parent does not already contains all data
				if ( !completeDataFound && (prevVisitTile.state != GlobWeb.Tile.State.NONE) )
				{
					this.launchRequest(prevVisitTile);
				}
			}
			else
			{
				if ( tileData.points.length > 0 )
					points = points.concat( tileData.points );
				if ( tileData.lines.length > 0 )
					lines = lines.concat( tileData.lines );							
			}
		}
	}
	
	
	// Render the points
	if ( points.length > 0 )
	{
		this.bucket.points = points;
		this.pointRenderer.render();
	}
	
	// Render the lines
	if ( lines.length > 0 )
	{
		this.lineRenderer.renderables = lines;
		this.lineRenderer.render();
	}
}

/**************************************************************************************************************/

/**
 *	@constructor
 *
 *	To add the multiple features only once
 */
Set = function()
{
	this.length = 0;
}

/**
 *	Add the element to the set
 *
 *	@param k Key
 *	@param v Value
 */
Set.prototype.add = function(k,v)
{
	if (typeof this[k] === 'undefined')
		{
			this.length++;
			this[k] = v;
		}
}

/**
 *	Remove the element from the set
 *
 *	@param k Key
 */
Set.prototype.remove = function(k)
{
	if ( this[k])
	{
		this.length--;
		delete this[k];
	}
}

/**************************************************************************************************************/

/**
 * 	Recompute geometry from equatorial coordinates to geo for each feature
 */
function recomputeFeaturesGeometry( features )
{
	
	for ( var i=0; i<features.length; i++ )
	{
		var currentFeature = features[i];
		
		switch ( currentFeature.geometry.type )
		{
			case "Point":
				if ( currentFeature.geometry.coordinates[0] > 180 )
					currentFeature.geometry.coordinates[0] -= 360;
				break;
			case "Polygon":
				var ring = currentFeature.geometry.coordinates[0];
				for ( var j = 0; j < ring.length; j++ )
				{
					if ( ring[j][0] > 180 )
						ring[j][0] -= 360;
				}
				break;
			default:
				break;
		}
	}
}

/**************************************************************************************************************/

return DynamicOSLayer;

});
