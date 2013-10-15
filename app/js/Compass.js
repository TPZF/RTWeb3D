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
define(["gw/CoordinateSystem", "gw/glMatrix"], function(CoordinateSystem) {

var Compass = function(options){

	var globe = options.globe;
	var navigation = options.navigation;

	/* Svg interactive elements */
	var compass = document.getElementById(options.element);
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

	/**
	 *	Function updating the north position on compass
	 */
	function updateNorth() {

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
	    northText.setAttribute("transform", "rotate(" + degNorth + " 40 40)");
	};

    outerCircle.addEventListener('mousedown', function(event){
    	if ( event.button == 0 )
		{	
			 dragging = true;
			_lastMouseX = event.clientX - _outerCircleRadius;
			_lastMouseY = event.clientY - _outerCircleRadius;
			_dx = 0;
			_dy = 0;
		}

    });

    outerCircle.addEventListener('mousemove', function(event){
    	
    	if (!dragging)
    		return;

		var c = _lastMouseX*(event.clientY -_outerCircleRadius) - _lastMouseY*(event.clientX - _outerCircleRadius); // c>0 -> clockwise, counterclockwise otherwise
		navigation.rotate(c, 0);

		_lastMouseX = event.clientX - _outerCircleRadius;
		_lastMouseY = event.clientY - _outerCircleRadius;

    	updateNorth();
    });

	svgDoc.addEventListener('mouseup', function(event){
    	dragging = false;
    	// TODO add inertia
    });

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

	northText.addEventListener("click", function(){
		navigation.setUpToNorth();
	});

    // Update fov when moving
	navigation.subscribe("modified", updateNorth);
};

return Compass;

});