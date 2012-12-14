/**
 * Static cluster renderer module
 */
define( [ "jquery.ui" ], function($) {

/**
 * 	@constructor
 * 	@class
 * 	Cluster dynamic layer
 * 	
 * 	@param tileManager Tile manager
 * 	@param options Configuration options
 * 		<ul>
			<li>serviceUrl : Url of the service providing the OpenSearch data(necessary option)</li>
			<li>treshold : Visibility treshold</li>
			<li>maxOrder: Maximal cluster refinement order</li>
			<li>orderDepth: Depth of refinement order</li>
		</ul>
 */
ClusterLayer = function(options)
{
	// var serviceUrl = 'http://localhost:8182/sitools/solr/fuse/select?q=*:*&rows=0&facet=true&facet.field=order3&facet.field=order4&facet.field=order5&facet.field=order6&facet.limit=-1&facet.mincount=1&wt=json&indent=true';
	this.serviceUrl = options.serviceUrl + "q=*:*&rows=0&facet=true&facet.limit=-1&facet.mincount=1&wt=json&indent=true";
	this.treshold = options.treshold || 10;
	this.maxOrder = options.maxOrder || 10;
	this.orderDepth = options.orderDepth || 2;
	GlobWeb.BaseLayer.prototype.constructor.call( this, options );

	// Compute url from order 3
	for(var i=3; i<=this.maxOrder; i++)
		this.serviceUrl+='&facet.field=order'+i;

	// Set style
	if ( options && options['style'] )
	{
		this.style = options['style'];
	}
	else
	{
		this.style = new GlobWeb.FeatureStyle({
			iconUrl: "css/images/cluster.png"
		});
	}
	
	this.extId = "cluster";

	this.pointRenderer = null;

	this.response = null;
	this.distributions = [];
	var self = this;
	$.ajax({
		type: "GET",
		url: self.serviceUrl,
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

GlobWeb.inherits( GlobWeb.BaseLayer, ClusterLayer );

/**************************************************************************************************************/

/**
 *	Handle SOLR distribution response
 *
 *	@param response SOLR response
 *	@param distributions Distributions ClusterManager variable
 */
ClusterLayer.prototype.handleDistribution = function(response)
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
 * 	Attach the layer to the globe
 * 
 * 	@param g The globe
 */
ClusterLayer.prototype._attach = function( g )
{
	GlobWeb.BaseLayer.prototype._attach.call( this, g );

	this.extId += this.id;
	
	this.pointRenderer = new GlobWeb.PointRenderer( g.tileManager );
	this.bucket = this.pointRenderer.getOrCreateBucket( this, this.style );
	g.tileManager.addPostRenderer(this);
}

/**************************************************************************************************************/

/** 
  Detach the layer from the globe
 */
ClusterLayer.prototype._detach = function()
{
	this.globe.tileManager.removePostRenderer(this);
	this.pointRenderer = null;
	this.bucket = null;
	
	GlobWeb.BaseLayer.prototype._detach.call(this);
}

/**************************************************************************************************************/

/**
 *	Recursive function computing tile data for the first called pixelIndex
 *
 *	@param	pixelIndex	Current pixel index
 *	@param	order		Current order
 *	@param	face		Current face
 *	@param 	depth		Current order depth
 *	@param	tileData	TileData of first pixel to compute	
 */
ClusterLayer.prototype.computeTileData = function(pixelIndex, order, face, depth, tileData)
{
	var pixelDistribution = this.distributions[order][pixelIndex];
	if ( pixelDistribution > this.treshold )
	{
		if ( order < this.maxOrder && depth != 0 )
		{
			// Recursive call
			this.computeTileData(pixelIndex*4, order + 1, face, depth - 1, tileData);
			this.computeTileData(pixelIndex*4+2, order + 1, face, depth - 1, tileData);
			this.computeTileData(pixelIndex*4+1, order + 1, face, depth - 1, tileData);
			this.computeTileData(pixelIndex*4+3, order + 1, face, depth - 1, tileData);
		}
		else
		{
			var nside = Math.pow(2, order);
			var pix=pixelIndex&(nside*nside-1);
			var ix = GlobWeb.HEALPixBase.compress_bits(pix);
			var iy = GlobWeb.HEALPixBase.compress_bits(pix>>>1);
			var center = GlobWeb.HEALPixBase.fxyf((ix+0.5)/nside, (iy+0.5)/nside, face);

			var pos3d = center;
			var vertical = vec3.create();
			vec3.normalize(pos3d, vertical);
			
			var pointRenderData = {
				pos3d: pos3d,
				vertical: vertical,
				color: this.style.fillColor
			};
			tileData.points.push(pointRenderData);
		}
	}
}

/**************************************************************************************************************/

/*
	Render function
	
	@param tiles The array of tiles to render
 */
ClusterLayer.prototype.render = function( tiles )
{
	if (!this._visible)
		return;
		
	// Traverse the tiles to find all available data
	var points = [];
	
	for ( var i = 0; i < tiles.length; i++ )
	{
		var tile = tiles[i];
		if( !tile.extension[this.extId] && tile.order <= this.maxOrder )
		{
			tile.extension[this.extId] = new ClusterLayer.TileData();
			this.computeTileData(tile.pixelIndex, tile.order, tile.face, this.orderDepth, tile.extension[this.extId]);
		}

		if( tile.extension[this.extId] && tile.extension[this.extId].points.length > 0)
			points = points.concat( tile.extension[this.extId].points );

	}

	// Render the points
	if ( points.length > 0 )
	{
		this.bucket.points = points;
		this.pointRenderer.render();
	}
} 

/**************************************************************************************************************/

/**
 *	@constructor
 *	ClusterLayer.TileData constructor
 *
 *	Cluster renderable
 */
ClusterLayer.TileData = function()
{
	this.points = [];
}

ClusterLayer.TileData.prototype.dispose = function()
{
	this.points.length = 0;
}

/**************************************************************************************************************/

return ClusterLayer;

});