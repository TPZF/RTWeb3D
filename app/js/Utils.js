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

/**
 * Utility module : contains various functions useful for differnt modules
 */
 define(["gw/CoordinateSystem", "wcs"], function( CoordinateSystem ) {

/**
 *	HSV values in [0..1[
 *	returns [r, g, b] values from 0 to 255
 */
function hsv_to_rgb(h, s, v) {
	var h_i = Math.floor(h*6);
	var f = h*6 - h_i;
	var p = v * (1 - s);
	var q = v * (1 - f*s);
	var t = v * (1 - (1 - f) * s);
	switch (h_i)
	{
		case 0:
			r = v; g = t; b = p;
			break;
		case 1:
			r = q; g = v; b = p;
			break;
		case 2:
			r = p; g = v; b = t;
			break;
		case 3:
			r = p; g = q; b = v;
			break;
		case 4:
			r = t; g = p; b = v;
			break;
		case 5:
			r = v; g = p; b = q;
			break;
		default:
			r = 1; g = 1; b = 1;
	}
	return [r, g, b];
}

/**
 *	Create geographic coordinate from x,y image pixel using WCS
 */
function createCoordinate( x, y )
{
	var coordinate = wcs.pixelToCoordinate([x,y]);
	// Convert to geographic representation
	if ( coordinate.ra > 180 )
		coordinate.ra -= 360;
	return [coordinate.ra, coordinate.dec];
}

return {
  
	roundNumber : function (num, dec) {
		var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
		return result;
	},

	inherits : function(base, sub) 
	{
		function tempCtor() {}
		tempCtor.prototype = base.prototype;
		sub.prototype = new tempCtor();
		sub.prototype.constructor = sub;
	},

	/**
	 *	Generate eye-friendly color based on hsv
	 */
	generateColor : function()
	{
		//use golden ratio
		var golden_ratio_conjugate = 0.618033988749895;
		var h = Math.random();
		h += golden_ratio_conjugate;
	  	h %= 1;
		return hsv_to_rgb(h, 0.5, 0.95);
	},

	/**
	 *	Format coordinates according to default coordinate system
	 */
	formatCoordinates : function(geo)
	{
		var astro = [];
		if ( CoordinateSystem.type == "EQ" )
		{
			CoordinateSystem.fromGeoToEquatorial([geo[0], geo[1]], astro);	
		}
		else 
		{
			geo = CoordinateSystem.convert( geo, 'EQ', CoordinateSystem.type );

			// convert longitude to positive [0..360]
			if (geo[0] < 0)
				geo[0]+=360;
			
			astro[0] = this.roundNumber(geo[0],4);
			astro[0]+="°";
			astro[1] = this.roundNumber(geo[1],4);
			astro[1]+="°";
		}
		return astro;
	},

	/**
	 *	Format the given feature identifier to remove special caracters(as ?, [, ], ., etc..) which cannot be used as HTML id's
	 */
	formatId : function(id)
	{
		return id.replace(/\s{1,}|\.{1,}|\[{1,}|\]{1,}|\~{1,}/g, "");
	},
	
	/**
	 *	Get GeoJson polygon coordinates representing fits using wcs data from header
	 */
	getPolygonCoordinatesFromFits: function(fits)
	{
		var hdu = fits.getHDU();
		var fitsData = hdu.data;
			
		// Create mapper
		wcs = new WCS.Mapper(hdu.header);
		var coords = [];

		// Find coordinates of coming fits
		coords.push( createCoordinate(0,fitsData.height) );
		coords.push( createCoordinate(fitsData.width,fitsData.height) );
		coords.push( createCoordinate(fitsData.width,0) );
		coords.push( createCoordinate(0,0) );
		// Close the polygon
		coords.push(coords[0]);
		return coords;
	}
 
};

});
