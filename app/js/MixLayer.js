/**
 * Mix layer module
 */
define( [ "jquery.ui", "Utils" ], function($, Utils) {

/**
 * 	@constructor
 * 	@class
 * 	Mix layer
 * 	
 * 	@param options Configuration options
 * 		<ul>
			<li>serviceUrl : Url of the service providing the OpenSearch data(necessary option)</li>
			<li>minOrder : Starting order for OpenSearch requests</li>
			<li>displayProperties : Properties which will be shown in priority</li>
		</ul>
 */
MixLayer = function(options)
{
	GlobWeb.BaseLayer.prototype.constructor.call( this, options );
	
	this.type = "MixLayer";
	this.featureServiceUrl = options.featureServiceUrl;
	this.clusterServiceUrl = options.clusterServiceUrl;
	this.minOrder = options.minOrder || 5;
	if (options.displayProperties)
		this.displayProperties = options.displayProperties;
	this.requestProperties = options.requestProperties ||
	{
		// "properties.ra": "354.059",
		// "properties.ra": "2.85292"
	};

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

	this.clusterStyle = new GlobWeb.FeatureStyle({
		iconUrl: "css/images/cluster.png",
		fillColor: this.style.fillColor
	});
	
	// TODO "os" is overriden by BaseLayer id when attached by globe
	this.extId = "mix";

	// Used for picking management
	this.featuresSet ={};

	// Maximum two requests for now
	this.requests = [ null, null ];
	
	// For rendering
	this.featureBucket = null;
	this.clusterBucket = null;
	this.lineRenderer = null;
	this.pointRenderer = null;

	this.clusterServiceUrl = options.clusterServiceUrl + "q=*:*&rows=0&facet=true&facet.limit=-1&facet.mincount=1&wt=json&indent=true";
	this.treshold = options.treshold || 5;
	this.maxOrder = options.maxOrder || 13;
	this.orderDepth = options.orderDepth || 6;

	// Compute url from order 3
	for(var i=3; i<=this.maxOrder; i++)
		this.clusterServiceUrl+='&facet.field=order'+i;

	this.distributions = [];
	var self = this;
	$.ajax({
		type: "GET",
		url: self.clusterServiceUrl,
		dataType: 'json',
		success: function(response){
			self.handleDistribution(response);
		},
		error: function (xhr, ajaxOptions, thrownError) {
			console.error( xhr.responseText );
		}
	});
}

/**************************************************************************************************************/

GlobWeb.inherits( GlobWeb.BaseLayer, MixLayer );

/**************************************************************************************************************/

/**
 *	Handle SOLR distribution response
 *
 *	@param response SOLR response
 *	@param distributions Distributions ClusterManager variable
 */
MixLayer.prototype.handleDistribution = function(response)
{
	var facet_fields = response.facet_counts.facet_fields;
	var order = 3;
	for (var key in facet_fields)
	{
		this.distributions[order] = {};
		for (var i=0; i<facet_fields[key].length; i+=2)
		{
			this.distributions[order][facet_fields[key][i]] = facet_fields[key][i+1];
		}
		order++;
	}
}

/**************************************************************************************************************/

MixLayer.prototype.addCluster = function(pixelIndex, order, face, tile, pixelDistribution)
{
	if ( !tile.extension[this.extId] )
		tile.extension[this.extId] = new MixLayer.TileData(this);
	
	var nside = Math.pow(2, order);
	var pix=pixelIndex&(nside*nside-1);
	var ix = GlobWeb.HEALPixBase.compress_bits(pix);
	var iy = GlobWeb.HEALPixBase.compress_bits(pix>>>1);
	var center = GlobWeb.HEALPixBase.fxyf((ix+0.5)/nside, (iy+0.5)/nside, face);

	var geo = GlobWeb.CoordinateSystem.from3DToGeo( center );
	var pos3d = center;
	var vertical = vec3.create();
	vec3.normalize(pos3d, vertical);
	
	var geometry = {
		coordinates: geo,
		type: "Point"
	};

	var identifier = order+"_"+pixelIndex;
	var feature = {
		geometry: geometry,
		properties:
			{
				featureNum: pixelDistribution,
				identifier: identifier,
				title: pixelIndex+"("+order+")",
				order: order,
				pixelIndex: pixelIndex
			}
	};

	var pointRenderData = {
		geometry: geometry,

		pos3d: pos3d,
		vertical: vertical,
		color: this.clusterStyle.fillColor
	};


	tile.extension[this.extId].points.push(pointRenderData);
	tile.extension[this.extId].cluster = true;
	tile.extension[this.extId].featureIds.push(identifier);
	this.featuresSet[identifier] = { feature: feature, counter: 1, renderable: pointRenderData };
}

/**************************************************************************************************************/

/**
 *	Recursive function computing tile data for the first called pixelIndex
 *
 *	@param	pixelIndex	Current pixel index
 *	@param	order		Current order
 *	@param	face		Current face
 *	@param 	depth		Current order depth
 *	@param	tile		Tile which TileData will be computed(if exist)
 */
MixLayer.prototype.computeTileData = function(pixelIndex, order, face, depth, tile)
{
	if ( this.distributions[order] )
	{
		var pixelDistribution = this.distributions[order][pixelIndex];

		if ( pixelDistribution > this.treshold && order <= this.maxOrder )
		{
			if ( depth != 0 )
			{
				// Recursive call
				for ( var i=0; i<4; i++ )
				{
					this.computeTileData(pixelIndex*4+i, order + 1, face, depth - 1, tile);
				}		
			}
			else
			{
				this.addCluster(pixelIndex, order, face, tile, pixelDistribution);
			}
		}
		else
		{
			// TODO launch request & attach the result to tile
			this.launchRequest(tile, tile.order, tile.pixelIndex);
		}
	}
	return 0;
}

/**************************************************************************************************************/

/**
 * 	Attach the layer to the globe
 * 
 * 	@param g The globe
 */
MixLayer.prototype._attach = function( g )
{
	GlobWeb.BaseLayer.prototype._attach.call( this, g );

	this.extId += this.id;
	
	this.pointRenderer = new GlobWeb.PointRenderer( g.tileManager );
	this.lineRenderer = new GlobWeb.SimpleLineRenderer( g.tileManager );
	this.polygonRenderer = new GlobWeb.SimplePolygonRenderer( g.tileManager );
	this.featureBucket = this.pointRenderer.getOrCreateBucket( this, this.style );
	this.clusterBucket = this.pointRenderer.getOrCreateBucket( this, this.clusterStyle );
	g.tileManager.addPostRenderer(this);
}

/**************************************************************************************************************/

/** 
  Detach the layer from the globe
 */
MixLayer.prototype._detach = function()
{
	this.globe.tileManager.removePostRenderer(this);
	this.pointRenderer = null;
	this.bucket = null;
	
	GlobWeb.BaseLayer.prototype._detach.call(this);
}

/**************************************************************************************************************/

/**
 * 	Set new request properties
 */
MixLayer.prototype.setRequestProperties = function(properties)
{
	// Clean old results
	var self = this;
	this.globe.tileManager.visitTiles( function(tile) {
		if( tile.extension[self.extId] )
		{
			tile.extension[self.extId].dispose();
			tile.extension[self.extId] = null;
		}
	});

	// Clean renderer buckets
	// this.clusterBucket.points.length = 0;
	this.featureBucket.points.length = 0;

	// Set properties
	this.requestProperties = properties;
}

/**************************************************************************************************************/

/**
 * 	Launch request to the OpenSearch service
 */
MixLayer.prototype.launchRequest = function(tile, o, i)
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
		var url = self.featureServiceUrl + "order=" + tile.order + "&healpix=" + tile.pixelIndex;
		for (var key in this.requestProperties)
		{
			url+='&'+key+'="'+this.requestProperties[key]+'"';
		}
		var requestProperties = this.requestProperties;
		self.globe.publish("startLoad",self.id);
		$.ajax({
			type: "GET",
			url: url,
			success: function(response){
				// If request properties didn't change
				if( self.requestProperties == requestProperties )
				{
					tile.extension[self.extId] = new MixLayer.TileData(self);
					tile.extension[self.extId].complete = (response.totalResults == response.features.length);
					// if(response.totalResults > 0)
					// 	console.log(tile.order+" "+tile.pixelIndex);
					if( o && i )
						console.log(o,i);
					recomputeFeaturesGeometry(response.features);
					
					for ( var i=0; i<response.features.length; i++ )
					{
						self.addFeature( response.features[i], tile );
					}
				}

				self.requests[index] = null;
				self.globe.publish("endLoad",self.id);
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
	Create a renderable from the geometry
 */
MixLayer.prototype.createRenderable = function(geometry)
{
	if ( geometry['type'] == "Point" )
	{
		var pos3d = GlobWeb.CoordinateSystem.fromGeoTo3D( geometry['coordinates'] );
		var vertical = vec3.create();
		vec3.normalize(pos3d, vertical);
		
		var pointRenderData = {
			geometry: geometry,
			pos3d: pos3d,
			vertical: vertical,
			color: this.style.fillColor
		};
		return pointRenderData;
	} 
	else if ( geometry['type'] == "Polygon" )
	{
		this.lineRenderer.addGeometry(geometry,this,this.style);
		var renderable = this.lineRenderer.renderables[ this.lineRenderer.renderables.length-1 ];
		return {
			line: renderable,
			polygon: null,
			style: renderable.style
		};
	}
}

/**************************************************************************************************************/

/**
 *	Add feature to the layer and to the tile extension
 */
MixLayer.prototype.addFeature = function( feature, tile )
{
	var renderable;
	
	// Add feature if it doesn't exist
	if ( !this.featuresSet[feature.properties.identifier] )
	{
		// this.features.push( feature );
		renderable = this.createRenderable( feature.geometry );
		this.featuresSet[feature.properties.identifier] = { feature: feature, counter: 1, renderable: renderable };
	}
	else
	{
		// Increment the number of requests for current feature
		var featureData = this.featuresSet[feature.properties.identifier];
		featureData.counter++;
		renderable = featureData.renderable;
	}

	var tileData = tile.extension[this.extId];
	
	// Add feature id
	tileData.featureIds.push( feature.properties.identifier );
	
	// Add feature renderable
	if ( feature.geometry['type'] == "Point" )
	{
		tileData.points.push( renderable );
	}
	else if ( feature.geometry['type'] == "Polygon" )
	{
		tileData.polygons.push( renderable );
	}
}

/**************************************************************************************************************/

/**
 *	Remove feature from Dynamic OpenSearch layer
 */
MixLayer.prototype.removeFeature = function( identifier )
{
	if ( this.featuresSet[identifier].counter == 1 )
	{
		// Last feature
		delete this.featuresSet[identifier];
	}
	else
	{
		// Decrease
		this.featuresSet[identifier]--;
	}
}

/**************************************************************************************************************/

/**
 *	Modify feature style
 */
MixLayer.prototype.modifyFeatureStyle = function( feature, style ) {

	feature.properties.style = style;
	var featureData = this.featuresSet[feature.properties.identifier];
	if ( featureData )
	{
		var renderable = featureData.renderable;
		
		// TODO : a little bit hackish, should try to merge renderable attributes in GlobWeb between PointRenderer and Simple'Line'Renderer
		if ( renderable.color ) {
			renderable.color = style.fillColor;
		}
		else if ( renderable.style ) {
			if ( style.fill ) {
				this.polygonRenderer.addGeometry(feature.geometry,this,style);
				renderable.polygon = this.polygonRenderer.renderables[ this.polygonRenderer.renderables.length-1 ];
			}
			renderable.style = style;
			renderable.line.style = style;
		}
	}
}

/**************************************************************************************************************/


/**
 *	@constructor
 *	MixLayer.TileData constructor
 *
 *	OpenSearch/Cluster renderable
 */
MixLayer.TileData = function(layer)
{
	this.layer = layer;
	this.featureIds = []; // exclusive parameter to link with render data
	this.points = [];
	this.polygons = [];
	this.cluster = false;
	this.complete = false;
}

/**************************************************************************************************************/

/**
 * 	Dispose renderable data from tile
 *	
 */
MixLayer.TileData.prototype.dispose = function( renderContext, tilePool )
{	
	for( var i=0; i<this.points.length; i++ )
	{
		this.layer.removeFeature( this.featureIds[i] );
	}
	this.points.length = 0;
}

/**************************************************************************************************************/

/*
	Render function
	
	@param tiles The array of tiles to render
 */
MixLayer.prototype.render = function( tiles )
{
	if (!this._visible)
		return;
		
	// Traverse the tiles to find all available data, and request data for needed tiles
	
	var features = [];
	var clusters = [];
	var lines = [];
	var polygons = [];
	var visitedTiles = {};
	
	for ( var i = 0; i < tiles.length; i++ )
	{
		var tile = tiles[i];

		var tileData = tile.extension[this.extId];
		if( !tileData && tile.order <= this.maxOrder )
		{
			this.computeTileData(tile.pixelIndex, tile.order, tile.face, this.orderDepth, tile);
			if ( !tile.extension[this.extId] && tile.order >= this.minOrder )
			{
				// Not a cluster!
				// Search for available data on tile parent
				var completeDataFound = false;
				var prevVisitTile = tile;
				var visitTile = tile.parent;
				while ( visitTile && visitTile.order >= this.minOrder )
				{
					tileData = visitTile.extension[this.extId];
					if ( tileData )
					{
						completeDataFound = tileData.complete;
						var key = visitTile.order + "_" + visitTile.pixelIndex;
						if ( visitedTiles.hasOwnProperty(key) )	
						{
							tileData = null;
						}
						else 
						{
							visitedTiles[key] = true;
						}
						visitTile = null;
						
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
		}
		else
		{
			// no clusterisation
		}

		// We have found some available tile data, add it to the current renderables
		if ( tileData )
		{
			if ( tileData.points.length > 0 )
			{
				if ( tileData.cluster )
				{
					clusters = clusters.concat( tileData.points );
				}
				else
				{
					features = features.concat( tileData.points );	
				}
			}
				
			for ( var n = 0; n < tileData.polygons.length; n++ ) {
				lines.push( tileData.polygons[n].line );
				if ( tileData.polygons[n].style.fill ) {
					polygons.push( tileData.polygons[n].polygon );							
				}
			}
		}
	}
	
	// Render the clusters
	if ( clusters.length > 0 )
	{
		this.clusterBucket.points = clusters;
		this.pointRenderer.render();
	}
	else
	{
		// remove previous cluster points
		this.clusterBucket.points.length = 0;
	}

	// Render the points
	if ( features.length > 0 )
	{
		this.featureBucket.points = features;
		this.pointRenderer.render();
	}
	
	// Render the lines
	if ( lines.length > 0 )
	{
		this.lineRenderer.renderables = lines;
		this.lineRenderer.render();
	}
	
	// Render the polygons
	if ( polygons.length > 0 )
	{
		this.polygonRenderer.renderables = polygons;
		this.polygonRenderer.render();
	}
}

/**************************************************************************************************************/

/**
 * 	Recompute geometry from equatorial coordinates to geo for each feature
 */
function recomputeFeaturesGeometry( features )
{
	var proxyUrl = "/sitools/proxy?external_url=";
	
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
				// Add proxy url to quicklook url if not local
				if ( currentFeature.properties.quicklook && currentFeature.properties.quicklook.substring(0,4) == 'http' )
					currentFeature.properties.quicklook = proxyUrl+currentFeature.properties.quicklook;
				break;
			default:
				break;
		}
	}
}

/**************************************************************************************************************/

return MixLayer;

});
