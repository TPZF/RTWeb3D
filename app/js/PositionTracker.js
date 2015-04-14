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
/*global clearInterval: false, clearTimeout: false, document: false, event: false, frames: false, history: false, Image: false, location: false, name: false, navigator: false, Option: false, parent: false, screen: false, setInterval: false, setTimeout: false, window: false, XMLHttpRequest: false, define: false */

/**
 * Position tracker : show mouse position formated in default coordinate system
 */
define(["jquery", "./Utils"],
	function($, Utils) {

var globe;
var element;

function updatePosition(event)
{
	if ( event.type.search("touch") >= 0 )
	{
		event.clientX = event.changedTouches[0].clientX;
		event.clientY = event.changedTouches[0].clientY;
	}

	var geoPos = globe.getLonLatFromPixel( event.clientX, event.clientY );
	if ( geoPos )
	{
		var astro = Utils.formatCoordinates([ geoPos[0], geoPos[1] ]);
		document.getElementById(element).innerHTML = astro[0] + " x " + astro[1];
	}
}

return {
	init: function(options)
	{
		globe = options.globe;
		element = options.element;
		if ( options.positionTracker.position ) {
			$("#"+element).css(options.positionTracker.position, "2px");
		}

		globe.renderContext.canvas.addEventListener('mousemove', updatePosition);
		if ( options.isMobile )
		{
			globe.renderContext.canvas.addEventListener('touchmove', updatePosition);
		}
	}
}

});
