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
 * Position tracker : show mouse position formated in default coordinate system
 */
define(["gw/CoordinateSystem", "./Utils"],
	function(CoordinateSystem, Utils) {

var globe;
var navigation;
var element;

function updatePosition(event)
{
	if ( event.type.search("touch") >= 0 )
	{
		event.clientX = event.changedTouches[0].clientX;
		event.clientY = event.changedTouches[0].clientY;
	}

	var geoPos = globe.getLonLatFromPixel( event.clientX, event.clientY );
	var astro = Utils.formatCoordinates([ geoPos[0], geoPos[1] ]);
	document.getElementById(element).innerHTML = astro[0] + " x " + astro[1];
}

return {
	init: function(options)
	{
		globe = options.globe;
		navigation = options.navigation;
		element = options.element;

		globe.renderContext.canvas.addEventListener('mousemove', updatePosition);
		if ( options.isMobile )
		{
			globe.renderContext.canvas.addEventListener('touchmove', updatePosition);
		}
	}
}

});
