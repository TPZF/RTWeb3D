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
 * Mollweider viewer module : Sky representation in mollweide coordinate system
 */
define(["gw/CoordinateSystem", "gw/glMatrix"], function(CoordinateSystem) {

var MollweideViewer = function(options) {

	var canvas = document.getElementById('mollweideProjection');
    var context = canvas.getContext('2d');

    var globe = options.globe;
    var navigation = options.navigation;

    // TODO create list of renderables(center3d, fov..)
    /*var center3d = {
    	x: 30,
    	y: 30
    }*/

    var imageObj = new Image();
    imageObj.onload = function() {
        context.drawImage(imageObj, 0, 0);
        updateMollweideFov();
    };
    //imageObj.src = 'css/images/Milky_Way_infrared_200x100.png';
    imageObj.src = 'css/images/MollweideGrid.png';

    /**
     *	Newton-Raphson method to find theta needed for mollweide x/y computation
     *	@see https://en.wikipedia.org/wiki/Mollweide_projection
     */
    function findTheta( lat )
    {
    	// Avoid divide by zero
    	if ( lat == Math.PI || lat == -Math.PI )
    		return lat;

    	var epsilon = 0.01;
    	var thetaN = lat;
    	var thetaN1 = lat+epsilon;

    	while( Math.abs( thetaN - thetaN1 ) >= epsilon )
    	{
    		var twoThetaN = 2*thetaN;
    		thetaN = thetaN1;
    		thetaN1 = twoThetaN/2 - (twoThetaN + Math.sin(twoThetaN) - Math.PI*Math.sin(lat)) / (2 + 2*Math.cos(twoThetaN));
    	}

    	return thetaN1;
    }

    var demiHeight = 50;
    var demiWidth = 100;
    var pointSize = 6;

    /**
     *	Function updating the position of center of camera on mollweide element
     */
    function updateMollweideFov()
    {

    	var geoPos = [];
    	CoordinateSystem.from3DToGeo(navigation.center3d, geoPos);

    	var lambda = geoPos[0] * Math.PI/180 ; // longitude
    	var theta0 = geoPos[1] * Math.PI/180;  // latitude

    	var theta = findTheta( theta0 );

   		var x = 2*Math.sqrt(2)/Math.PI * lambda * Math.cos(theta);
		var y = Math.sqrt(2) * Math.sin(theta);

		context.clearRect(0,0, context.canvas.width, context.canvas.height);
		context.drawImage(imageObj, 0, 0);
		context.fillStyle = "rgb(255,0,0)";

		// Normalize
		// 2.63: max x value in Mollweide projection
		// 1.41: max y value in Mollweide projection
		x*=-demiWidth/2.63;
		y*=-demiHeight/1.41;

		context.fillRect(x+demiWidth-pointSize/2,y+demiHeight-pointSize/2,pointSize,pointSize);
    }

	$('#slideArrow').on('click', function(){
		if ( parseFloat($(this).parent().css('right')) < -100 )
		{
			// Slide left
			$(this).parent().animate({right: '0px'}, 300);
		}
		else
		{
			// Slide right
			$(this).parent().animate({right: '-210px'}, 300);
		}
	});

	// Update fov when navigation modified
	navigation.subscribe("modified", updateMollweideFov);
}

return MollweideViewer;

});