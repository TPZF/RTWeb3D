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

define(['gw/Utils', 'gw/HEALPixTiling', 'gw/RasterLayer', 'gw/DynamicImage', 'FitsLoader', 'gw/FitsTilePool', 'DynamicImageView'], 
	function(Utils, HEALPixTiling, RasterLayer, DynamicImage, FitsLoader, FitsTilePool, DynamicImageView) {

/**************************************************************************************************************/

// TODO use DynamicImage shaders by unifying shader programs between TileManager and ConvexPolygonRenderer
//		* inverse Y coordinates, some var names refactor..
var colormapFragShader = "\
		precision highp float; \n\
		varying vec2 texCoord;\n\
		uniform sampler2D colorTexture; \n\
		uniform sampler2D colormap; \n\
		uniform float min; \n\
		uniform float max; \n\
		void main(void)\n\
		{\n\
				float i = texture2D(colorTexture,vec2(texCoord.x, 1.0 - texCoord.y)).r;\n\
				float d = clamp( ( i - min ) / (max - min), 0.0, 1.0 );\n\
				vec4 cmValue = texture2D(colormap, vec2(d,0.));\n\
				gl_FragColor = vec4(cmValue.r,cmValue.g,cmValue.b,1.);\n\
		}\n\
		";

var rawFragShader = "\
		precision highp float; \n\
		varying vec2 texCoord;\n\
		uniform sampler2D colorTexture; \n\
		void main(void)\n\
		{\n\
				vec4 color = texture2D(colorTexture, vec2(texCoord.x, 1.0 - texCoord.y));\n\
				gl_FragColor = vec4(color.r,color.g,color.b,1.);\n\
		}\n\
		";		

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
	
	// allsky
	this.levelZeroImage = null;

	// TilePool containg FLOAT textures initialized from array
	this.customTilePool = null;

	var self = this;
	
	this._ready = false;

	this._handleLevelZeroImage = function(fitsData)
	{
		// Call callback if set
		if (options.onready && options.onready instanceof Function)
		{
			options.onready(self);
		}
		self._ready = true;

		// Request a frame
		if ( self.globe )
		{
			var typedArray = new Float32Array( fitsData.view.buffer, fitsData.begin, fitsData.length/4 ); // with gl.FLOAT
			// Create level zero image
			var gl = self.globe.renderContext.gl;
			self.levelZeroImage = new DynamicImage(self.globe.renderContext, typedArray, gl.LUMINANCE, gl.FLOAT, fitsData.width, fitsData.height);

			// Create dynamic image view
			if ( options.div )
			{
				// TODO make more generic
				self.div = new DynamicImageView({
					activator: 'fitsView',
					id: self.id,
					image: self.levelZeroImage,
					changeShaderCallback: function(contrast){
						if ( contrast == "raw" )
						{
							self.customShader.fragmentCode = rawFragShader;
						} else {
							self.customShader.fragmentCode = colormapFragShader;
						}
					},
					button: true
				});
			}
		}
	}

	this.customShader = {
		fragmentCode: rawFragShader,
		updateUniforms : function(gl, program){
			gl.uniform1f(program.uniforms["max"], self.levelZeroImage.tmax );
			gl.uniform1f(program.uniforms["min"], self.levelZeroImage.tmin );

			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, self.levelZeroImage.colormapTex);
			gl.uniform1i(program.uniforms["colormap"], 1);
		}
	};


}

/**************************************************************************************************************/

Utils.inherits(RasterLayer, HEALPixFITSLayer);

/**************************************************************************************************************/

/** 
  Attach the raster layer to the globe
 */
HEALPixFITSLayer.prototype._attach = function( g )
{
	RasterLayer.prototype._attach.call( this, g );

	// Launch xhr request if level zero image wasn't recieved yet
	if ( !this.levelZeroImage )
	{
		var gl = this.globe.renderContext.gl;

		// Enable float texture extension to have higher luminance range
		var ext = gl.getExtension("OES_texture_float");
		if (!ext) {
			// TODO 
			alert("no OES_texture_float");
			return;
		}

		var self = this;
		// Load level zero image now
		var _handleLevelZeroError = function()
		{
			if ( self.globe )
			{
				self.globe.publish("baseLayersError");
				self._ready = false;
				console.log( "Error while loading background");
			}
		}

		this.xhr = FitsLoader.loadFits( this.baseUrl + "/Norder3/Allsky.fits", this._handleLevelZeroImage, _handleLevelZeroError );
	}

	// Create custom tile pool
	if ( !this.customTilePool )
	{
		this.customTilePool = new FitsTilePool(self.globe.renderContext);
	}
}

/**************************************************************************************************************/

HEALPixFITSLayer.prototype._detach = function( g )
{
	// Abort xhr if in progress
	if ( this.xhr )
	{
		this.xhr.abort();
		delete this.xhr;
	}
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
	url += ".fits";
	
	return url;
}

/**************************************************************************************************************/

/**
 *	Custom load
 */
HEALPixFITSLayer.prototype.customLoad = function(tileRequest, url, successCallback, failCallback)
{
	/**
		Handle when fits is loaded
	 */
	var _handleLoadedFits = function(fitsData)
	{
		// Create new image coming from Fits
		tileRequest.image = {
			typedArray: new Float32Array( fitsData.view.buffer, fitsData.begin, fitsData.length/4 ),
			width: fitsData.width,
			height: fitsData.height
		};
		successCallback();
	}

	FitsLoader.loadFits( url, _handleLoadedFits, failCallback );

}

/**************************************************************************************************************/

/**
 *	Custom level zero texture getter
 */
HEALPixFITSLayer.prototype.getLevelZeroTexture = function()
{
	return this.levelZeroImage.texture;
}



return HEALPixFITSLayer;

});