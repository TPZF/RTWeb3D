/**
 * Moc renderer/layer module
 */
define( [ "jquery.ui", "Utils" ], function($, Utils) {

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
MocLayer = function(options)
{

	GlobWeb.BaseLayer.prototype.constructor.call( this, options );

	this.serviceUrl = options.serviceUrl;

	// Set style
	if ( options && options['style'] )
	{
		this.style = options['style'];
	}
	else
	{
		this.style = new FeatureStyle();
	}

	this.vertexBuffer = null;
	this.indexBuffer = null;
}

/**************************************************************************************************************/

GlobWeb.inherits( GlobWeb.BaseLayer, MocLayer );

/**************************************************************************************************************/

/**
 * 	Attach the layer to the globe
 * 
 * 	@param g The globe
 */
MocLayer.prototype._attach = function( g )
{
	GlobWeb.BaseLayer.prototype._attach.call( this, g );

	this.globe.tileManager.addPostRenderer(this);
	
	if (!this.program)
	{
		var vertexShader = "\
			attribute vec3 vertex;\n\
			uniform mat4 viewProjectionMatrix;\n\
			\n\
			void main(void)\n\
			{\n\
				gl_Position = viewProjectionMatrix * vec4(vertex, 1.0);\n\
			}\n\
		";

		var fragmentShader = "\
			precision highp float; \n\
			uniform vec4 color; \n\
			\n\
			void main(void) \n\
			{ \n\
				gl_FragColor = color; \n\
			} \n\
		";
		
		this.program = new GlobWeb.Program(this.globe.renderContext);
		this.program.createFromSource( vertexShader, fragmentShader );
	}

	// Request MOC data
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
	this.globe.tileManager.removePostRenderer(this);
		
	GlobWeb.BaseLayer.prototype._detach.call(this);
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
	this.vertexBuffer = gl.createBuffer();
	this.indexBuffer = gl.createBuffer();

	var vertices = [];
	var indices = [];
	var lastIndex = 0;

	// For each order, compute rectangles geometry depending on the pixel index
	for(var key in response)
	{
		var order = parseInt(key);
		for(var i=0; i<response[key].length; i++)
		{
			var pixelIndex = response[key][i];

			// Compute vertices
			var nside = Math.pow(2, order);
			var pix=pixelIndex&(nside*nside-1);
			var ix = GlobWeb.HEALPixBase.compress_bits(pix);
			var iy = GlobWeb.HEALPixBase.compress_bits(pix>>>1);
			var face = (pixelIndex>>>(2*order));

			var vert = GlobWeb.HEALPixBase.fxyf(ix/nside, iy/nside, face);
			vertices.push( vert[0], vert[1], vert[2] );
			vert =  GlobWeb.HEALPixBase.fxyf((ix + 1)/nside, iy/nside, face);
			vertices.push( vert[0], vert[1], vert[2] );
			vert =  GlobWeb.HEALPixBase.fxyf((ix + 1)/nside, (iy + 1)/nside, face);
			vertices.push( vert[0], vert[1], vert[2] );
			vert =  GlobWeb.HEALPixBase.fxyf(ix/nside, (iy + 1)/nside, face);
			vertices.push( vert[0], vert[1], vert[2] );

			// Compute indices
			indices.push( lastIndex, lastIndex+1, lastIndex+1, lastIndex+2, lastIndex+2, lastIndex+3, lastIndex+3, lastIndex );
			lastIndex += 4;
		}
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	this.vertexBuffer.itemSize = 3;
	this.vertexBuffer.numItems = vertices.length/3;

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	this.indexBuffer.itemSize = 1;
	this.indexBuffer.numItems = indices.length;
}

/**************************************************************************************************************/

/*
 *	Render function
 *	
 *	@param tiles The array of tiles to render
 */
MocLayer.prototype.render = function()
{
	if ( !this._visible
		|| this._opacity <= 0.0 )
		return;
		
	if( this.vertexBuffer )
	{
		var renderContext = this.globe.tileManager.renderContext;
		var gl = renderContext.gl;

		gl.disable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendEquation(gl.FUNC_ADD);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		this.program.apply();

		// The shader only needs the viewProjection matrix, use GlobWeb.modelViewMatrix as a temporary storage
		mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
		gl.uniformMatrix4fv(this.program.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);
						
		gl.uniform4f(this.program.uniforms["color"], this.style.strokeColor[0], this.style.strokeColor[1], this.style.strokeColor[2], this._opacity );
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.vertexAttribPointer(this.program.attributes['vertex'], this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);	
		gl.drawElements( gl.LINES, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		
		gl.enable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);
	}
}

return MocLayer;

});
