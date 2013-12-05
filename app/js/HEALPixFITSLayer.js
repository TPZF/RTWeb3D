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

define(['gw/Utils', 'gw/HEALPixTiling', 'gw/RasterLayer', 'gw/DynamicImage', './FitsLoader', 'gzip', 'gw/ImageRequest', './FitsRequest'], 
	function(Utils, HEALPixTiling, RasterLayer, DynamicImage, FitsLoader, gZip, ImageRequest) {

/**************************************************************************************************************/

/** @export
	@constructor
	HEALPixFITSLayer constructor
*/
var HEALPixFITSLayer = function(options)
{
	RasterLayer.prototype.constructor.call( this, options );
	
	this.tilePixelSize = options.tilePixelSize || 512;
	this.tiling = new HEALPixTiling( options.baseLevel || 2, options );
	this.numberOfLevels = options.numberOfLevels || 10;
	this.type = "ImageryRaster";
	this.baseUrl = options['baseUrl'];
	this.dataType = options.dataType || "fits";
	this.coordSystem = options.coordSystem || "EQ";
	this._ready = false;
	this.fitsSupported = true;
	
	// allsky
	this.levelZeroImage = null;

	// TODO use DynamicImage shaders by unifying shader programs between TileManager and ConvexPolygonRenderer
	//		* inverse Y coordinates, some var names refactor..
	this.rawFragShader = "\
		precision lowp float; \n\
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
		precision lowp float; \n\
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
				// Unzip if g-zipped
				try {
					var data = new Uint8Array(self.imageRequest.image);
					var res = gZip.unzip( data );
					self.imageRequest.image = new Uint8Array( res ).buffer;
				}
				catch ( err )
				{
					if ( err != 'Not a GZIP file' )
					{
						// G-zip error
						console.error(err);
						this.failCallback();
						return;
					}
					// Image isn't g-zipped, handle image as fits
				}

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

	this.requestLevelZeroImage();
	var ext = gl.getExtension("OES_texture_float");

	if (!ext) {
		// TODO 
		console.error("no OES_texture_float");
		this.fitsSupported = false;
		//return;
	}
}

/**************************************************************************************************************/

/**
 *	Detach the HEALPixFits layer from the globe
 */
HEALPixFITSLayer.prototype._detach = function()
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
 *	Extract fits data from levelZeroImage.pixels to fitsPixel according to pixel index
 *
 *	@param pi Pixel index
 *	@param fitsPixel Resulting typed vector containing fits data
 *	@param sx X-offset of fitsPixel
 *	@param sy Y-offset of fitsPixel
 */
HEALPixFITSLayer.prototype.extractFitsData = function( pi, fitsPixel, sx, sy )
{
	var size = 64;
	var height = this.levelZeroImage.height;
	var width = this.levelZeroImage.width;
	var pixels = this.levelZeroImage.pixels;

	var startIndex = size * width * ( 28 - Math.floor(pi /27) ) + ( pi % 27 ) * size;

	// Extract fits data
	var typedLine;
	for ( var i=0; i<size; i++ )
	{
		typedLine = pixels.subarray( startIndex + i*width, startIndex + i*width + size );
		fitsPixel.set(typedLine, sy + i*128 + sx);
	}
}

/**************************************************************************************************************/

/**
 *	Generate the level0 texture for the tiles
 */
HEALPixFITSLayer.prototype.generateLevel0Textures = function(tiles,tilePool)
{
	if ( this.dataType != "fits" )
	{
		// Create a canvas to build the texture
		var canvas = document.createElement("canvas");
		canvas.width = 128;
		canvas.height = 128;
		
		var context = canvas.getContext("2d");
		
		for ( var i = 0; i < tiles.length; i++ )
		{
			var tile = tiles[i];
			
			// Top left
			var pi = tile.pixelIndex * 4;
			var sx = ( pi % 27) * 64;
			var sy = ( Math.floor(pi /27) ) * 64;
			context.drawImage(this.levelZeroImage,sx,sy,64,64,0,0,64,64);
			
			// Top right
			pi = tile.pixelIndex * 4 + 2;
			var sx = ( pi % 27) * 64;
			var sy = ( Math.floor(pi /27) ) * 64;
			context.drawImage(this.levelZeroImage,sx,sy,64,64,64,0,64,64);
			
			// Bottom left
			pi = tile.pixelIndex * 4 + 1;
			var sx = ( pi % 27) * 64;
			var sy = ( Math.floor(pi /27) ) * 64;
			context.drawImage(this.levelZeroImage,sx,sy,64,64,0,64,64,64);
			
			// Bottom right
			pi = tile.pixelIndex * 4 + 3;
			var sx = ( pi % 27) * 64;
			var sy = ( Math.floor(pi /27) ) * 64;
			context.drawImage(this.levelZeroImage,sx,sy,64,64,64,64,64,64);

			var imgData = context.getImageData(0, 0, 128, 128);
			imgData.dataType = 'byte';
			
			tile.texture = tilePool.createGLTexture( imgData );
			tile.imageSize = 128;
		}
	}
	else
	{
		for ( var i = 0; i < tiles.length; i++ )
		{
			var tile = tiles[i];		
			var fitsPixel = new Float32Array(128*128);

			// Top left
			var pi = tile.pixelIndex * 4;
			this.extractFitsData(pi, fitsPixel, 0, 128*64);
			
			// Top right
			pi = tile.pixelIndex * 4 + 2;
			this.extractFitsData(pi, fitsPixel, 64, 128*64);
			
			// Bottom left
			pi = tile.pixelIndex * 4 + 1;
			this.extractFitsData(pi, fitsPixel, 0, 0);
			
			// Bottom right
			pi = tile.pixelIndex * 4 + 3;
			this.extractFitsData(pi, fitsPixel, 64, 0);

			var imgData = {
				typedArray : fitsPixel,
				width : 128,
				height : 128,
				dataType : 'float'
			}
			
			tile.texture = tilePool.createGLTexture( imgData );
			tile.imageSize = 128;
		}
	}
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
	// Set dataType always to jpg if fits isn't supported by graphic card
	if ( !this.fitsSupported )
	{
		this.dataType = 'jpg';
	}

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

/**
 *	Set datatype
 */
HEALPixFITSLayer.prototype.setDatatype = function(isFits)
{
	// Abort image request if in progress
	if ( !this._ready )
	{
		this.imageRequest.abort();
	}
	this._ready = false;
	//this.disposeResources();

	this.dataType = (isFits) ? 'fits' : 'jpg';
	//this.requestLevelZeroImage();
}

/**************************************************************************************************************/

return HEALPixFITSLayer;

});