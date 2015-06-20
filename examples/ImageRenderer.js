/***************************************
 * Copyright 2011, 2012 GlobWeb contributors.
 *
 * This file is part of GlobWeb.
 *
 * GlobWeb is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, version 3 of the License, or
 * (at your option) any later version.
 *
 * GlobWeb is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with GlobWeb. If not, see <http://www.gnu.org/licenses/>.
 ***************************************/

define(['gw/Program'], function(Program) {
 
/**************************************************************************************************************/

/**
 *	@constructor Image Renderer
 * 	Just a render an image with WebGL
 */
var ImageRenderer = function(renderContext,image)
{
	this.vertexCode = "\
	attribute vec2 vertex; \n\
	varying vec2 texCoord; \n\
	\n\
	void main(void)  \n\
	{ \n\
		gl_Position.x = vertex.x * 2. - 1.; \n\
		gl_Position.y = vertex.y * 2. - 1.; \n\
		gl_Position.z = 0.; \n\
		gl_Position.w = 1.; \n\
		texCoord = vertex; \n\
	} \n\
	";
	
	this.defaultFragmentCode = "\
	precision lowp float; \n\
	varying vec2 texCoord; \n\
	uniform sampler2D texture;\n\
	\n\
	void main(void) \n\
	{ \n\
		gl_FragColor = texture2D(texture, texCoord); \n\
	} \n\
	";
	
	this.renderContext = renderContext;
	
	
	var vertices = [ 0., 0., 1., 0., 1., 1., 0., 1. ];
	
	var gl = renderContext.gl;
	var vb = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vb);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	this.vertexBuffer = vb;
	
	var indices = [ 0, 1, 2, 2, 3, 0 ];
	
	var ib = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	this.indexBuffer = ib;
	
	renderContext.minNear = 0.1;
	renderContext.far = 5000;
	renderContext.fov = 60;
	
	renderContext.canvas.width = image.width;
	renderContext.canvas.height = image.height;
	
	this.image = image;
	this.fragmentCode = null;
	this.program = new Program(renderContext);
	this.program.createFromSource(this.vertexCode,this.defaultFragmentCode);
	
	renderContext.renderer = this;
	renderContext.requestFrame();	
}

/**************************************************************************************************************/

/**
 *	Main render
 */
ImageRenderer.prototype.render = function()
{
	var rc = this.renderContext;
	var gl = rc.gl;
	
	gl.disable(gl.CULL_FACE);
	gl.disable(gl.DEPTH_TEST);
	gl.activeTexture(gl.TEXTURE0);

	if ( this.fragmentCode != this.image.fragmentCode )
	{
		this.fragmentCode = this.image.fragmentCode;
		if (!this.fragmentCode )
			this.fragmentCode = this.defaultFragmentCode;
		this.program = new Program(rc);
		this.program.createFromSource(this.vertexCode,this.fragmentCode);
	}
	// Setup program
	this.program.apply();
		
	gl.uniform1i(this.program.uniforms["texture"], 0);
	gl.bindTexture(gl.TEXTURE_2D, this.image.texture);

	if (this.image.updateUniforms)
		this.image.updateUniforms(gl,this.image,this.program);
	
	// Bind the vertex buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.vertexAttribPointer(this.program.attributes['vertex'], 2, gl.FLOAT, false, 0, 0);

	// Bind the index buffer
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	
	// Draw element
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

/**************************************************************************************************************/

return ImageRenderer;

});
