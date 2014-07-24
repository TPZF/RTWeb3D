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
 * Compass module : map control with "north" composant
 */
define(["jquery", "gw/CoordinateSystem", "gw/glMatrix"], function($, CoordinateSystem) {

/**
 *	Private variables
 */
var parentElement = null;
var navigation = null;

/**
 *	Function updating the north position on compass
 */
var updateNorth = function() {

	var geo = [];
	CoordinateSystem.from3DToGeo(navigation.center3d, geo);

	if ( CoordinateSystem.type != "EQ" )
	{
		geo = CoordinateSystem.convert(geo, 'EQ', 'GAL');
	}

	var LHV = [];
	CoordinateSystem.getLHVTransform(geo, LHV);

	var temp = [];
	var north = [LHV[4],LHV[5],LHV[6]];
	var vertical = [LHV[8], LHV[9], LHV[10]];

	if ( CoordinateSystem.type != "EQ" )
	{
		north = CoordinateSystem.transformVec( [LHV[4],LHV[5],LHV[6]] );
		CoordinateSystem.from3DToGeo(north, temp);
		temp = CoordinateSystem.convert(temp, 'EQ', 'GAL');
		CoordinateSystem.fromGeoTo3D(temp, north);

		vertical = CoordinateSystem.transformVec( [LHV[8],LHV[9],LHV[10]] );
		CoordinateSystem.from3DToGeo(vertical, temp);
		temp = CoordinateSystem.convert(temp, 'EQ', 'GAL');
		CoordinateSystem.fromGeoTo3D(temp, vertical);
	}

	// Find angle between up and north
	var cosNorth = vec3.dot(navigation.up, north);
	var radNorth = Math.acos(cosNorth);
	if ( isNaN(radNorth) )
		return;
	var degNorth = radNorth * 180/Math.PI;
	
	// Find sign between up and north
	var sign;
	vec3.cross( navigation.up, north, temp );
	sign = vec3.dot( temp, [vertical[0], vertical[1], vertical[2]] );
    if ( sign < 0 )
    {
    	degNorth *= -1;
    }

    var northText = document.getElementById("objectCompass").contentDocument.getElementById("NorthText");
    northText.setAttribute("transform", "rotate(" + degNorth + " 40 40)");
};

var Compass = function(options){

	parentElement = options.element;
	var globe = options.globe;
	navigation = options.navigation;

	// Add compass object to parent element
	document.getElementById(parentElement).innerHTML = '<object id="objectCompass" width="100px" height="100px" data="'+ options.mizarBaseUrl +'css/images/compass.svg" type="image/svg+xml"></object>';

	// Initialize it on load
	document.getElementById('objectCompass').addEventListener('load', function(){
		initialize();
		// Publish modified event to update compass north
		navigation.publish('modified');
		$('#'+parentElement).css("display","block");
	});

	/**
	 *	Initialize interactive events
	 */
	var initialize = function() {
		/* Svg interactive elements */
		var compass = document.getElementById("objectCompass");
		var svgDoc = compass.contentDocument; //get the inner DOM of compass.svg
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
				event.clientX = event.changedTouches[0].clientX;
				event.clientY = event.changedTouches[0].clientY;
			}

			 dragging = true;
			_lastMouseX = event.clientX - _outerCircleRadius;
			_lastMouseY = event.clientY - _outerCircleRadius;
			_dx = 0;
			_dy = 0;
		}

	    svgDoc.addEventListener('mousedown', _handleMouseDown);


	    var _handleMouseMove = function(event)
	    {
	    	event.preventDefault();
	    	if ( event.type.search("touch") >= 0 )
			{
				event.clientX = event.changedTouches[0].clientX;
				event.clientY = event.changedTouches[0].clientY;
			}

	    	if (!dragging)
	    		return;

			var c = _lastMouseX*(event.clientY -_outerCircleRadius) - _lastMouseY*(event.clientX - _outerCircleRadius); // c>0 -> clockwise, counterclockwise otherwise
			navigation.rotate(c, 0);

			_lastMouseX = event.clientX - _outerCircleRadius;
			_lastMouseY = event.clientY - _outerCircleRadius;

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
			
			if ( CoordinateSystem.type != "EQ" )
			{
				var temp = [];
				CoordinateSystem.from3DToGeo(up, temp);
				temp = CoordinateSystem.convert(temp, 'GAL', 'EQ');
				CoordinateSystem.fromGeoTo3D(temp, up);
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