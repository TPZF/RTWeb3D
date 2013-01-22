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
			<li>featureServiceUrl : Url of the service providing the OpenSearch feature data(necessary option)</li>
			<li>clusterServiceUrl : Url of the service providing the OpenSearch cluster data(necessary option)</li>
			<li>minOrder : Starting order for OpenSearch requests</li>
			<li>displayProperties : Properties which will be shown in priority</li>
			<li>treshold : Visibility treshold</li>
			<li>maxOrder: Maximal cluster request order</li>
			<li>orderDepth: Depth of refinement order</li>
			<li>maxClusterOrder: Maximal cluster order</li>
		</ul>
 */
MixLayer = function(options)
{
	GlobWeb.BaseLayer.prototype.constructor.call( this, options );

	this.featureServiceUrl = options.featureServiceUrl;
	this.clusterServiceUrl = options.clusterServiceUrl;

	// Array containing data of tile to be requested
	this.tilesToRequest = [];

	// Set default line style
	if ( options && options['style'] )
	{
		this.style = options['style'];
	}
	else
	{
		this.style = new GlobWeb.FeatureStyle();
	}

	// Feature style
	this.featureStyle = new GlobWeb.FeatureStyle({
		iconUrl: "css/images/star.png",
		fillColor: this.style.fillColor
	});

	// Cluster style
	this.clusterStyle = new GlobWeb.FeatureStyle({
		iconUrl: "css/images/cluster.png",
		fillColor: this.style.fillColor
	});

	this.extId = "mix";

	// Used for picking management
	this.featuresSet = {};

	// Maximum two requests for now
	this.requests = [ null, null ];
	
	// For rendering
	this.featureBucket = null;
	this.clusterBucket = null;
	this.lineRenderer = null;
	this.pointRenderer = null;

	// Handle feature service
	this.minOrder = options.minOrder || 5;
	if (options.displayProperties)
		this.displayProperties = options.displayProperties;

	this.requestProperties = options.requestProperties || "";

	// Handle cluster service
	this.clusterServiceUrl = options.clusterServiceUrl + "q=*:*&rows=0&facet=true&facet.limit=-1&facet.mincount=1&wt=json&indent=true";
	this.treshold = options.treshold || 5;
	this.maxOrder = options.maxOrder || 13;
	this.orderDepth = options.orderDepth || 6;
	this.maxClusterOrder = options.maxClusterOrder || 8;

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

/**
 *	Adding cluster geometry to the <MixLayer.TileData>
 *
 *	@param pixelIndex Pixel index
 *	@param order Pixel order
 *	@param face Face of pixel
 *	@param pixelDistribution Number of features in cluster
 *	@param tileData <MixLayer.TileData>
 */
MixLayer.prototype.addCluster = function(pixelIndex, order, face, pixelDistribution, tileData)
{
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
				title: "Cluster("+pixelDistribution+")",
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

	tileData.clusters.push(pointRenderData);
	tileData.featureIds.push(identifier);
	this.featuresSet[identifier] = { feature: feature, counter: 1, renderable: pointRenderData, cluster: true };
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
	this.featureBucket = this.pointRenderer.getOrCreateBucket( this, this.featureStyle );
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

MixLayer.prototype.launchRequests = function()
{
	for ( var i = 0; i < this.tilesToRequest.length; i++ )
	{
		var requestData = this.tilesToRequest[i];
		this.launchRequest( requestData.tile, requestData.childOrder, requestData.tileData, requestData.pixelIndicesToRequest, i );
	}
}

/**
 * 	Launch request to the OpenSearch service
 */
MixLayer.prototype.launchRequest = function(tile, childOrder, tileData, pixelIndicesToRequest, requestIndex)
{
	var index = null;

	for ( var i = 0; i < this.requests.length; i++ )
	{
		if ( !this.requests[i] )
		{
			this.requests[i] = tile;
			this.tilesToRequest.splice(requestIndex,1);
			index = i;
			break;
		}
	}
	
	var self = this;
	var indices = ""
	for ( var i=0; i<pixelIndicesToRequest.length-1; i++ )
	{
		indices+=pixelIndicesToRequest[i]+",";
	}
	indices+=pixelIndicesToRequest[i];

	if (index)
	{	
		var url = self.featureServiceUrl + "order=" + childOrder + "&healpix=" + indices;

		for (var key in this.requestProperties)
		{
			url+='&'+key+'='+this.requestProperties[key];
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
					recomputeFeaturesGeometry(response.features);
	
					// Attach to the tile
					tile.extension[self.extId] = tileData;
					tile.dataIsBuilding = false;

					for ( var i=0; i<response.features.length; i++ )
					{
						self.addFeature( response.features[i], tile );
					}
				}
			},
			error: function (xhr, ajaxOptions, thrownError) {
				console.error( xhr.responseText );
			},
			complete: function(xhr){
				self.requests[index] = null;
				self.globe.publish("endLoad",self.id);
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
			color: this.featureStyle.fillColor
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
		tileData.features.push( renderable );
	}
	else if ( feature.geometry['type'] == "Polygon" )
	{
		tileData.polygons.push( renderable );
	}
}

/**************************************************************************************************************/

/**
 *	Remove feature from Mix layer
 */
MixLayer.prototype.removeFeature = function( identifier )
{
	// HACK
	if ( this.featuresSet[identifier] )
	{
		if ( this.featuresSet[identifier].counter == 1 )
		{
			// Last feature
			delete this.featuresSet[identifier];
		}
		else
		{
			// Decrease
			this.featuresSet[identifier].counter--;
		}
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
	this.clusters = [];
	this.features = [];
	this.polygons = [];
	this.complete = true;
}

/**************************************************************************************************************/

/**
 * 	Dispose renderable data from tile
 *	
 */
MixLayer.TileData.prototype.dispose = function( renderContext, tilePool )
{	
	for( var i=0; i<this.features.length; i++ )
	{
		this.layer.removeFeature( this.featureIds[i] );
	}

	this.features.length = 0;
	this.clusters.length = 0;
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

		if ( !tileData )
		{
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

			if ( !completeDataFound && !tile.dataIsBuilding )
			{
				tile.dataIsBuilding = true; // while requesting
				var pixelIndicesToRequest = [];
				var buildTileData = new MixLayer.TileData(this);
				
				var orderDepth = ( tile.order + this.orderDepth >= this.maxOrder ) ? this.maxOrder - tile.order : this.orderDepth; // clipping depth to max order
				var childOrder = tile.order + orderDepth;

				if( this.distributions[childOrder] )
				{
					// Distribution exists
					var numSubTiles = Math.pow(4,orderDepth); // Number of subtiles depending on order
					var firstSubTileIndex = tile.pixelIndex * numSubTiles;

					for ( var j=firstSubTileIndex; j<firstSubTileIndex+numSubTiles; j++ )
					{
						var pixelDistribution = this.distributions[childOrder][j];
						if ( pixelDistribution > this.treshold && tile.order < this.maxClusterOrder )
						{
							// Cluster child
							this.addCluster(j, childOrder, tile.face, pixelDistribution, buildTileData);
							buildTileData.complete = false;
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
					// Add request
					this.tilesToRequest.push({ tile: tile, tileData: buildTileData, childOrder: childOrder, pixelIndicesToRequest: pixelIndicesToRequest });
				}
				else
				{
					tile.extension[this.extId] = buildTileData;
				}
			}
		}

		// We have found some available tile data, add it to the current renderables
		if ( tileData )
		{
			if ( tileData.features.length > 0 )
			{
				features = features.concat( tileData.features );	
			}

			if ( tileData.clusters.length > 0 )
			{
				clusters = clusters.concat( tileData.clusters );
			}
				
			for ( var n = 0; n < tileData.polygons.length; n++ ) {
				lines.push( tileData.polygons[n].line );
				if ( tileData.polygons[n].style.fill ) {
					polygons.push( tileData.polygons[n].polygon );							
				}
			}
		}
	}

	this.launchRequests();
	
	this.clusterBucket.points = clusters;
	this.featureBucket.points = features;

	// Render the points
	if ( clusters.length > 0 || features.length > 0 )
	{
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
