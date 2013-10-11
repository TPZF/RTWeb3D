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

define(['gw/Utils', 'gw/HEALPixTiling', 'gw/RasterLayer', 'gw/DynamicImage', 'FitsLoader', 'gw/FitsTilePool', 'gw/ImageRequest', './FitsRequest'], 
	function(Utils, HEALPixTiling, RasterLayer, DynamicImage, FitsLoader, FitsTilePool, ImageRequest) {

/**************************************************************************************************************/

/** @export
	@constructor
	HEALPixFITSLayer constructor
*/
var HEALPixFITSLayer = function(options)
{
	RasterLayer.prototype.constructor.call( this, options );
	
	this.tilePixelSize = options.tilePixelSize || 512;
	this.tiling = new HEALPixTiling( options.baseLevel || 3, options );
	this.numberOfLevels = options.numberOfLevels || 10;
	this.type = "ImageryRaster";
	this.baseUrl = options['baseUrl'];
	this.dataType = options.dataType || "fits";
	this._ready = false;
	
	// allsky
	this.levelZeroImage = null;

	// Customization parameters for fits rendering

	// TODO use DynamicImage shaders by unifying shader programs between TileManager and ConvexPolygonRenderer
	//		* inverse Y coordinates, some var names refactor..
	this.rawFragShader = "\
		precision highp float; \n\
		varying vec2 texCoord;\n\
		uniform sampler2D colorTexture; \n\
		uniform float opacity; \n\
		uniform float inversed; \n\
		bool isnan(float val) {\n\
				return (val <= 0.0 || 0.0 <= val) ? ((val == 5e-324) ? true : false) : true;\n\
		}\n\
		void main(void)\n\
		{\n\
			vec4 color = texture2D(colorTexture, vec2(texCoord.x, (inversed == 1.) ? 1.0 - texCoord.y : texCoord.y));\n\
			gl_FragColor = vec4(color.r,color.g,color.b, color.a*opacity);\n\
			if (isnan( (gl_FragColor.r + gl_FragColor.g + gl_FragColor.b) / 3. ) )\n\
			{\n\
				gl_FragColor.a = 0.;\n\
			}\n\
		}\n\
		";

	this.colormapFragShader = "\
		precision highp float; \n\
		varying vec2 texCoord;\n\
		uniform sampler2D colorTexture; \n\
		uniform sampler2D colormap; \n\
		uniform float min; \n\
		uniform float max; \n\
		uniform float opacity; \n\
		bool isnan(float val) {\n\
			return (val <= 0.0 || 0.0 <= val) ? false : true;\n\
		}\n\
		void main(void)\n\
		{\n\
			float i = texture2D(colorTexture,vec2(texCoord.x, 1.0 - texCoord.y)).r;\n\
			float d = clamp( ( i - min ) / (max - min), 0.0, 1.0 );\n\
			vec4 cmValue = texture2D(colormap, vec2(d,0.));\n\
			gl_FragColor = vec4(cmValue.r,cmValue.g,cmValue.b, cmValue.a*opacity);\n\
			if (isnan( i ) )\n\
			{\n\
				 gl_FragColor.a = 0.;\n\
			}\n\
		}\n\
		";

	this.customShader = {
		fragmentCode: this.rawFragShader,
		updateUniforms : function(gl, program){
			// Level zero image is required to init uniforms
			gl.uniform1f(program.uniforms["inversed"], self.inversed );
			if ( self.levelZeroImage )
			{
				gl.uniform1f(program.uniforms["max"], self.levelZeroImage.tmax );
				gl.uniform1f(program.uniforms["min"], self.levelZeroImage.tmin );

				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, self.levelZeroImage.colormapTex);
				gl.uniform1i(program.uniforms["colormap"], 1);
				gl.uniform1f(program.uniforms["opacity"], self.opacity() );
			}
		}
	}

	var self = this;
	// Request for level zero image
	this.imageRequest = new ImageRequest({
		successCallback: function(){

			self._ready = true;

			if ( self.dataType == "fits" )
			{
				self.handleImage(self.imageRequest);
				var fitsData = self.imageRequest.image;
				if ( self.globe )
				{
					// Create level zero image
					var gl = self.globe.renderContext.gl;
					self.levelZeroImage = new DynamicImage(self.globe.renderContext, fitsData.typedArray, gl.LUMINANCE, gl.FLOAT, fitsData.width, fitsData.height);
					self.getLevelZeroTexture = function()
					{
						return self.levelZeroImage.texture;
					}
				}
			}
			else
			{
				self.levelZeroImage = this.image;
				self.getLevelZeroTexture = null;
			}

			// Call callback if set
			if (options.onready && options.onready instanceof Function)
			{
				options.onready(self);
			}

			// Request a frame
			if ( self.globe )
			{
				self.globe.renderContext.requestFrame();
			}
		},
		failCallback: function(){
			if ( self.globe )
			{
				self.globe.publish("baseLayersError", self);
				self._ready = false;
				console.log( "Error while loading background");
			}
		},
		abortCallback: function(iq){
			self._ready = false;
			console.log("Background image request has been aborted");
		}
	});
}

/**************************************************************************************************************/

Utils.inherits(RasterLayer, HEALPixFITSLayer);

/**************************************************************************************************************/

/** 
 *	Attach the HEALPixFits layer to the globe
 */
HEALPixFITSLayer.prototype._attach = function( g )
{
	RasterLayer.prototype._attach.call( this, g );

	// Enable float texture extension to have higher luminance range
	var gl = this.globe.renderContext.gl;
	var ext = gl.getExtension("OES_texture_float");
	if (!ext) {
		// TODO 
		alert("no OES_texture_float");
		return;
	}

	this.requestLevelZeroImage();
}

/**************************************************************************************************************/

/**
 *	Detach the HEALPixFits layer from the globe
 */
HEALPixFITSLayer.prototype._detach = function( g )
{
	// Abort image request if in progress
	if ( !this._ready )
	{
		this.imageRequest.abort();
	}
	this._ready = false;
	this.disposeResources();

	RasterLayer.prototype._detach.call( this );

}

/**************************************************************************************************************/

/**
 *	Get url from a given tile
 */
HEALPixFITSLayer.prototype.getUrl = function(tile)
{
	var url = this.baseUrl;
	
	url += "/Norder";
	url += tile.order;
	
	url += "/Dir";
	var indexDirectory = Math.floor(tile.pixelIndex/10000) * 10000;
	url += indexDirectory;
	
	url += "/Npix";
	url += tile.pixelIndex;
	url += "."+this.dataType;
	
	return url;
}

/**************************************************************************************************************/

/**
 *	Handle fits image
 */
HEALPixFITSLayer.prototype.handleImage = function(imgRequest)
{
 	if ( !(imgRequest.image instanceof Image) )
 	{
	 	var fits = FitsLoader.parseFits( imgRequest.image );
	 	var fitsData = fits.getHDU().data;
	 	var bpe = fitsData.arrayType.BYTES_PER_ELEMENT;
	 	var float32array;
	 	if ( fitsData.arrayType.name == "Float64Array" )
	 	{
	 		var float64array = new Float64Array( fitsData.view.buffer, fitsData.begin, fitsData.length/bpe ); // bpe = 8
	 		var float32array = new Float32Array( fitsData.length/bpe );
	 		// Create Float32Array from Float64Array
	 		for ( var i=0; i<float64array.length; i++ )
	 		{
	 			float32array[i] = float64array[i];
	 		}
	 	}
	 	else
	 	{
	 		float32array = new Float32Array( fitsData.view.buffer, fitsData.begin, fitsData.length/bpe ); // with gl.FLOAT, bpe = 4
	 	}

	 	// // Handle different types/formats.. just in case.
	 	// var dataType;
	 	// var typedArray;
	 	// var gl = this.globe.renderContext.gl;
	 	// var glType;
	 	// if ( fitsData.arrayType.name == "Float32Array" )
	 	// {
	 	// 	typedArray = new Float32Array( fitsData.view.buffer, fitsData.begin, fitsData.length/fitsData.arrayType.BYTES_PER_ELEMENT );
	 	// 	dataType = "float";
	 	// 	glType = gl.FLOAT;
	 	// 	glFormat = gl.LUMINANCE;
	 	// }
	 	// else if ( fitsData.arrayType.name == "Uint8Array" )
	 	// {
	 	// 	typedArray = new Uint8Array( fitsData.view.buffer, fitsData.begin, fitsData.length/fitsData.arrayType.BYTES_PER_ELEMENT )
	 	// 	dataType = "int";
	 	// 	glType = gl.UNSIGNED_BYTE;
	 	// 	glFormat = gl.LUMINANCE;
	 	// }

	 	imgRequest.image = {
			typedArray: float32array,
			width: fitsData.width,
			height: fitsData.height,
			dataType: "float"
		};
		
	}
}

/**************************************************************************************************************/

/**
 *	Request level zero image
 */
HEALPixFITSLayer.prototype.requestLevelZeroImage = function()
{
	// Revert to raw rendering
	this.customShader.fragmentCode = this.rawFragShader;
	if ( this.dataType == "fits" )
	{
		this.inversed = 1.;
	}
	else
	{
		this.inversed = 0.;
	}

	var url = this.baseUrl + "/Norder3/Allsky."+this.dataType;
	this.imageRequest.send(url);
}

/**************************************************************************************************************/

/**
 *	Dispose the allocated resources
 */
HEALPixFITSLayer.prototype.disposeResources = function()
{
	// Dispose level zero image & texture
	if ( this.levelZeroImage && this.levelZeroImage.dispose )
		this.levelZeroImage.dispose();
	if ( this.levelZeroTexture )
		this.globe.renderContext.gl.deleteTexture(this.levelZeroTexture);
	
	this.levelZeroImage = null;
	this.levelZeroTexture = null;
}

/**************************************************************************************************************/

return HEALPixFITSLayer;

});