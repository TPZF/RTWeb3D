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
 define([], function() {

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

/*
FL : check if it is used?
function RGBColor(color_string)
{

    // some getters
    this.toRGB = function () {
       return 'rgb(' + this.r + ', ' + this.g + ', ' + this.b + ')';
    }
    this.toHex = function () {
       var r = this.r.toString(16);
       var g = this.g.toString(16);
       var b = this.b.toString(16);
       if (r.length == 1) r = '0' + r;
       if (g.length == 1) g = '0' + g;
       if (b.length == 1) b = '0' + b;
       return '#' + r + g + b;
    }
}
*/
return {
  
	roundNumber : function (num, dec) {
		var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
		return result;
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

};

});
