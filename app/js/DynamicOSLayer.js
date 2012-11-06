/**
 * Dynamic OpenSearch renderer module
 */
define( [ "jquery.ui" ], function($) {

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

	// Style, probably bucket later
	this.style = new GlobWeb.FeatureStyle({ iconUrl: "css/images/star.png" });
	this.texture = null;
	
	// TODO "os" is overriden by BaseLayer id when attached by globe
	this.id = "os";

	// Used for picking management
	this.features = [];
	// Counter set, indicates how many times the feature has been requested
	this.featuresSet = new Set();

	this.requests = [];
	for ( var i=0; i<2; i++ )
	{
		this.requests[i] = null;
	}
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
	
	this.renderContext = g.tileManager.renderContext;
	this.tileConfig = g.tileManager.tileConfig;
	
	// Create texture
	var self = this;
	var poiImage = new Image();
	poiImage.crossOrigin = '';
	poiImage.onload = function () 
	{
		self.texture = self.renderContext.createNonPowerOfTwoTextureFromImage(poiImage);
		self.textureWidth = poiImage.width;
		self.textureHeight = poiImage.height;
	}
	
	poiImage.onerror = function(event) {
		console.log("Cannot load " + quicklookImage.src );
	}
	poiImage.src = this.style.iconUrl;

	if ( this._visible )
	{
		this.globe.tileManager.addPostRenderer(this);
	}
	
	if (!this.program)
	{
		var vertexShader = "\
		attribute vec3 vertex; // vertex have z = 0, spans in x,y from -0.5 to 0.5 \n\
		uniform mat4 viewProjectionMatrix; \n\
		uniform vec3 poiPosition; // world position \n\
		uniform vec2 poiScale; // x,y scale \n\
		uniform vec2 tst; \n\
		\n\
		varying vec2 texCoord; \n\
		\n\
		void main(void)  \n\
		{ \n\
			// Generate texture coordinates, input vertex goes from -0.5 to 0.5 (on x,y) \n\
			texCoord = vertex.xy + vec2(0.5) + tst; \n\
			// Invert y \n\
			texCoord.y = 1.0 - texCoord.y; \n\
			\n\
			// Compute poi position in clip coordinate \n\
			gl_Position = viewProjectionMatrix * vec4(poiPosition, 1.0); \n\
			gl_Position.xy += vertex.xy * gl_Position.w * poiScale; \n\
		} \n\
		";
		
		var fragmentShader = "\
		#ifdef GL_ES \n\
		precision highp float; \n\
		#endif \n\
		\n\
		varying vec2 texCoord; \n\
		uniform sampler2D texture; \n\
		uniform float alpha; \n\
		\n\
		void main(void) \n\
		{ \n\
			vec4 textureColor = texture2D(texture, texCoord); \n\
			gl_FragColor = vec4(textureColor.rgb, textureColor.a * alpha); \n\
			if (gl_FragColor.a <= 0.0) discard; \n\
		} \n\
		";
	
		this.program = new GlobWeb.Program(this.renderContext);
		this.program.createFromSource(vertexShader, fragmentShader);
	}
	
	var vertices = new Float32Array(
		[-0.5, -0.5, 0.0,
		-0.5,  0.5, 0.0,
		0.5,  0.5, 0.0,
		0.5, -0.5, 0.0]
	);
	
	var gl = this.renderContext.gl;
	this.vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
}

/**************************************************************************************************************/

/** 
  Detach the layer from the globe
 */
DynamicOSLayer.prototype._detach = function()
{
	this.globe.tileManager.removePostRenderer(this);
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
			tile.extension[this.id] = new DynamicOSLayer.OSData(this);
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

/**
 * 	Launch requests
 */
DynamicOSLayer.prototype.launchRequests = function( tiles )
{
	// Launch requests
	for ( var i=0; i<tiles.length; i++ )
	{
		var tile = tiles[i];
		if( !tile.extension[this.id] )
		{
			if ( tile.order >= this.minOrder )
			{
				if ( tile.state != GlobWeb.Tile.State.NONE )
				{
					this.launchRequest(tile);
				}
			}
		}
	}
}

/**************************************************************************************************************/

/*
	Add a geometry to the tile extension
 */
DynamicOSLayer.prototype.addGeometryToTile = function(geometry,tile)
{
	var posGeo = geometry['coordinates'];
	var pos3d = GlobWeb.CoordinateSystem.fromGeoTo3D( posGeo );
	var vertical = vec3.create();
	vec3.normalize(pos3d, vertical);
	
	var pointRenderData = {
		geometry: geometry,
		pos3d: pos3d,
		vertical: vertical
	};
	
	tile.extension[this.id].points.push( pointRenderData );
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
 * 	Set visibility of the layer
 */
DynamicOSLayer.prototype.visible = function( arg )
{
	if ( typeof arg == "boolean" && this._visible != arg )
	{
		this._visible = arg;
		
		if ( arg ){
			this.globe.tileManager.addPostRenderer(this);
		}
		else
		{
			this.globe.tileManager.removePostRenderer(this);
		}
	}
	
	return this._visible;
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

	this.launchRequests( tiles );

	// Render tiles
	var renderContext = this.renderContext;
	var gl = this.renderContext.gl;
	
	// Setup states
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	// Setup program
	this.program.apply();
	
	// The shader only needs the viewProjection matrix, use GlobWeb.modelViewMatrix as a temporary storage
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
	gl.uniformMatrix4fv(this.program.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);
	gl.uniform1i(this.program.uniforms["texture"], 0);

	// Compute eye direction from inverse view matrix
	mat4.inverse(renderContext.viewMatrix, renderContext.modelViewMatrix);
	var camZ = [renderContext.modelViewMatrix[8], renderContext.modelViewMatrix[9], renderContext.modelViewMatrix[10]];
	vec3.normalize(camZ);
	vec3.scale(camZ, this.tileConfig.cullSign, camZ);
	
	// Compute pixel size vector to offset the points from the earth
	var pixelSizeVector = renderContext.computePixelSizeVector();
	
	// Warning : use quoted strings to access properties of the attributes, to work correclty in advanced mode with closure compiler
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.vertexAttribPointer(this.program.attributes['vertex'], 3, gl.FLOAT, false, 0, 0);

	// Bind point texture
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this.texture);
	
	for ( var n = 0; n < tiles.length; n++ )
	{
		var tile = tiles[n];
		
		if ( !tile.extension[this.id] )
			continue;
		
		// 2.0 * because normalized device coordinates goes from -1 to 1
		var scale = [2.0 * this.textureWidth / renderContext.canvas.width,
					 2.0 * this.textureHeight / renderContext.canvas.height];
		gl.uniform2fv(this.program.uniforms["poiScale"], scale);
		gl.uniform2fv(this.program.uniforms["tst"], [ 0.5 / (this.textureWidth), 0.5 / (this.textureHeight)  ]);

		for (var i = 0; i < tile.extension[this.id].points.length; ++i)
		{
			// Poi culling
			var point = tile.extension[this.id].points[i];
			var worldPoi = point.pos3d;
			var poiVec = point.vertical;
			var scale = this.textureHeight * ( pixelSizeVector[0] * worldPoi[0] + pixelSizeVector[1] * worldPoi[1] + pixelSizeVector[2] * worldPoi[2] + pixelSizeVector[3] );
			scale *= this.tileConfig.cullSign;

			if ( vec3.dot(poiVec, camZ) > 0 
				&& renderContext.worldFrustum.containsSphere(worldPoi,scale) >= 0 )
			{
				var x = poiVec[0] * scale + worldPoi[0];
				var y = poiVec[1] * scale + worldPoi[1];
				var z = poiVec[2] * scale + worldPoi[2];
				
				gl.uniform3f(this.program.uniforms["poiPosition"], x, y, z);
				gl.uniform1f(this.program.uniforms["alpha"], this.opacity() );
				
				gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
			}
		}
	}
	gl.disable(gl.BLEND);
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
