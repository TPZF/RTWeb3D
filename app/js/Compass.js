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
/*global define: false */

/**
 * Compass module : map control with "north" composant
 */
define(["jquery", "gw/glMatrix"], function($) {

/**
 *	Private variables
 */
var parentElement = null;
var globe = null;
var navigation = null;
var svgDoc;

/**
 *	Function updating the north position on compass
 */
var updateNorth = function() {

	var geo = [];
	var coordinateSystem = globe.coordinateSystem;
	coordinateSystem.from3DToGeo(navigation.center3d, geo);

	if ( coordinateSystem.type != "EQ" )
	{
		geo = coordinateSystem.convert(geo, 'EQ', 'GAL');
	}

	var LHV = [];
	coordinateSystem.getLHVTransform(geo, LHV);

	var temp = [];
	var north = [LHV[4],LHV[5],LHV[6]];
	var vertical = [LHV[8], LHV[9], LHV[10]];

	var up = vec3.create(navigation.up);
	if ( coordinateSystem.type != "EQ" )
	{
		// Compute up in galactic coordinate system
		coordinateSystem.from3DToGeo(up, temp);
		temp = coordinateSystem.convert(temp, 'EQ', 'GAL');
		coordinateSystem.fromGeoTo3D(temp, up);
		vec3.normalize(up);
	}

	// Find angle between up and north
	var cosNorth = vec3.dot(up, north) / (vec3.length(up) * vec3.length(north));
	var radNorth = Math.acos(cosNorth);
	if ( isNaN(radNorth) )
		return;
	var degNorth = radNorth * 180/Math.PI;
	
	// Find sign between up and north
	var sign;
	vec3.cross( up, north, temp );
	sign = vec3.dot( temp, [vertical[0], vertical[1], vertical[2]] );
    if ( sign < 0 )
    {
    	degNorth *= -1;
    }

    var northText = svgDoc.getElementById("NorthText");
    northText.setAttribute("transform", "rotate(" + degNorth + " 40 40)");
};

var Compass = function(options){

	parentElement = options.element;
	globe = options.globe;
	navigation = options.navigation;

	// Add compass object to parent element
	// Don't use <object> HTML tag due to cross-origin nature of svg
	document.getElementById(parentElement).innerHTML = '<div id="objectCompass"></div>';
	$.get(options.mizarBaseUrl +'css/images/compass.svg',
		function(response){
			// Import contents of the svg document into this document
			svgDoc = document.importNode(response.documentElement,true);

			// Update width/height
			svgDoc.height.baseVal.value = 100
			svgDoc.width.baseVal.value = 100
			// Append the imported SVG root element to the appropriate HTML element
			$("#objectCompass").append(svgDoc);

			initialize();
			// Publish modified event to update compass north
			navigation.publish('modified');
			$('#'+parentElement).css("display","block");
		},
	"xml");

	/**
	 *	Initialize interactive events
	 */
	var initialize = function() {
		/* Svg interactive elements */
		var compass = document.getElementById("objectCompass");
	    var east = svgDoc.getElementById("East"); //get the inner element by id
	    var west = svgDoc.getElementById("West"); //get the inner element by id
	    var south = svgDoc.getElementById("South"); //get the inner element by id
	    var north = svgDoc.getElementById("North"); //get the inner element by id
	    var northText = svgDoc.getElementById("NorthText");
	    var outerCircle = svgDoc.getElementById("OuterCircle");

	    var rotationFactor = options.rotationFactor ? options.rotationFactor : 8.;
	    var panFactor = options.panFactor ? options.panFactor : 30.;
	    
		var _lastMouseX = -1;
		var _lastMouseY = -1;
		var _dx = 0;
		var _dy = 0;
		var dragging = false;
		var _outerCircleRadius = outerCircle.ownerSVGElement.clientWidth / 2;

		var _handleMouseDown = function(event)
		{
			event.preventDefault();
			if ( event.type.search("touch") >= 0 )
			{
				event.layerX = event.changedTouches[0].clientX;
				event.layerY = event.changedTouches[0].clientY;
			}

			 dragging = true;
			_lastMouseX = event.layerX - _outerCircleRadius;
			_lastMouseY = event.layerY - _outerCircleRadius;
			_dx = 0;
			_dy = 0;
		}

	    svgDoc.addEventListener('mousedown', _handleMouseDown);


	    var _handleMouseMove = function(event)
	    {
	    	event.preventDefault();
	    	if ( event.type.search("touch") >= 0 )
			{
				event.layerX = event.changedTouches[0].clientX;
				event.layerY = event.changedTouches[0].clientY;
			}

	    	if (!dragging)
	    		return;

			var c = _lastMouseX*(event.layerY -_outerCircleRadius) - _lastMouseY*(event.layerX - _outerCircleRadius); // c>0 -> clockwise, counterclockwise otherwise
			navigation.rotate(c, 0);

			_lastMouseX = event.layerX - _outerCircleRadius;
			_lastMouseY = event.layerY - _outerCircleRadius;

	    	updateNorth();
	    }

	    svgDoc.addEventListener('mousemove', _handleMouseMove);

	    var _handleMouseUp = function(event)
	    {
	    	event.preventDefault();
	    	dragging = false;
	    	// TODO add inertia
	    }

		svgDoc.addEventListener('mouseup', _handleMouseUp);

		east.addEventListener("click", function(){
	    	navigation.pan( panFactor, 0. );
	    	updateNorth();
		});

		west.addEventListener("click", function(){
	    	navigation.pan( -panFactor, 0. );
	    	updateNorth();
		});

		north.addEventListener("click", function(){
	    	navigation.pan( 0, panFactor );
	    	updateNorth();
		});

	    south.addEventListener("click", function(){
	    	navigation.pan( 0, -panFactor );
	    	updateNorth();
		});

		var _alignWithNorth = function(event)
		{
			var up = [0,0,1];
			var coordinateSystem = globe.coordinateSystem;
			if ( coordinateSystem.type != "EQ" )
			{
				var temp = [];
				coordinateSystem.from3DToGeo(up, temp);
				temp = coordinateSystem.convert(temp, 'GAL', 'EQ');
				coordinateSystem.fromGeoTo3D(temp, up);
			}
			navigation.moveUpTo(up);
		}

		northText.addEventListener("click", _alignWithNorth);

		if ( options.isMobile )
		{
			svgDoc.addEventListener('touchstart', _handleMouseDown);
			svgDoc.addEventListener('touchup', _handleMouseUp);
			svgDoc.addEventListener('touchmove', _handleMouseMove);
			northText.addEventListener("touchstart", _alignWithNorth);
		}

	    // Update fov when moving
		navigation.subscribe("modified", updateNorth);
	}
};

/**
 *	Remove compass element
 */
Compass.prototype.remove = function() {
	navigation.unsubscribe("modified", updateNorth);
	document.getElementById(parentElement).innerHTML = '';
}

return Compass;

});
