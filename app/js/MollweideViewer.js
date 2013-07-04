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

/**
 *  Newton-Raphson method to find auxiliary theta needed for mollweide x/y computation
 *  @see https://en.wikipedia.org/wiki/Mollweide_projection
 */
function _findTheta( lat )
{
    // Avoid divide by zero
    if ( lat == Math.PI || lat == -Math.PI )
        return lat;

    var epsilon = 0.001;
    var thetaN = lat;  // n
    var thetaN1;       // n+1

    do
    {
        var twoThetaN = 2*thetaN;
        thetaN = thetaN1;
        thetaN1 = twoThetaN/2 - (twoThetaN + Math.sin(twoThetaN) - Math.PI*Math.sin(lat)) / (2 + 2*Math.cos(twoThetaN));
    } while( Math.abs( thetaN1 - thetaN ) >= epsilon );

    return thetaN1;
}

var MollweideViewer = function(options) {

    // Init options
    var globe = options.globe;
    var navigation = options.navigation;

    // Image background dimensions
    var halfHeight;
    var halfWidth;

    // Interaction parameters
    var _lastMouseX = -1;
    var _lastMouseY = -1;
    var dragging = false;

    // Fov shape (only center3d for now)
    // TODO add fov points
    var center3d = {
    	x: 0,
    	y: 0,
        pointSize: 6,
        /**
         *  Determine if a point is inside the fov shape bounds
         */
        contains : function(mx, my) {
            return (this.x <= mx && this.y <= my &&
             this.x + this.pointSize >= mx && this.y + this.pointSize >= my);
        }
    }

    // Init image background
    var canvas = document.getElementById('mollweideProjection');
    var context = canvas.getContext('2d');
    var imageObj = new Image();
    imageObj.onload = function() {
        context.drawImage(imageObj, 0, 0);
        halfHeight = imageObj.height / 2;
        halfWidth = imageObj.width / 2;
        updateMollweideFov();
    };
    //imageObj.src = 'css/images/Milky_Way_infrared_200x100.png';
    imageObj.src = 'css/images/MollweideGrid.png';

    /**
     *	Function updating the position of center of camera on mollweide element
     */
    function updateMollweideFov()
    {

    	var geoPos = [];
    	CoordinateSystem.from3DToGeo(navigation.center3d, geoPos);

    	var lambda = geoPos[0] * Math.PI/180 ; // longitude
    	var theta0 = geoPos[1] * Math.PI/180;  // latitude

    	var auxTheta = _findTheta( theta0 );

        // Transfrom to Mollweide coordinate system
   		var mollX = 2*Math.sqrt(2)/Math.PI * lambda * Math.cos(auxTheta);
		var mollY = Math.sqrt(2) * Math.sin(auxTheta);

		context.clearRect(0,0, context.canvas.width, context.canvas.height);
		context.drawImage(imageObj, 0, 0);
		context.fillStyle = "rgb(255,0,0)";

		// Transform to image space
		//    2.63: max x value in Mollweide projection
		//    1.41: max y value in Mollweide projection
		center3d.x = -mollX * halfWidth/2.63 + halfWidth;
		center3d.y = -mollY * halfHeight/1.41 + halfHeight;

		context.fillRect(center3d.x-center3d.pointSize/2,center3d.y-center3d.pointSize/2,center3d.pointSize,center3d.pointSize);
    }

    // Interact with mollweide projection
    canvas.addEventListener('mousedown', function(event){

        // Difference between chrome and firefox
        var offX = (event.offsetX) ? event.offsetX : (event.layerX - event.target.offsetLeft);
        var offY = (event.offsetY) ? event.offsetY : (event.layerY - event.target.offsetTop);

        if ( center3d.contains( offX, offY ) ) 
        {
            dragging = true;
            _lastMouseX = offX;
            _lastMouseY = offY;
        }

        return true;
    });

    canvas.addEventListener('mousemove', function(event){

        if (!dragging)
            return;

        // Difference between chrome and firefox;
        var offX = (event.offsetX) ? event.offsetX : (event.layerX - event.target.offsetLeft);
        var offY = (event.offsetY) ? event.offsetY : (event.layerY - event.target.offsetTop);

        // Transform to Mollweide space
        center3d.x = - ( offX - halfWidth ) * 2.63 / halfWidth;
        center3d.y = - ( offY - halfHeight ) * 1.41 / halfHeight;
        
        // Transform to geographic coordinate system
        // http://mathworld.wolfram.com/MollweideProjection.html
        var auxTheta = Math.asin( center3d.y / Math.sqrt(2) );

        var phi = Math.asin( (2*auxTheta + Math.sin(2*auxTheta))/Math.PI );
        var lambda = (Math.PI * center3d.x) / ( 2 * Math.sqrt(2) * Math.cos(auxTheta));

        // Update navigation
        CoordinateSystem.fromGeoTo3D([lambda*180/Math.PI, phi*180/Math.PI], navigation.center3d);
        navigation.computeViewMatrix();

        _lastMouseX = offX;
        _lastMouseY = offY;
    });

    canvas.addEventListener('mouseup', function(){
        dragging = false;
    })

    // Show/hide mollweide projection
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

	// Fix for Google Chrome : avoid dragging
    canvas.addEventListener("dragstart", function(event){event.preventDefault(); return false;});

	// Update fov when navigation modified
	navigation.subscribe("modified", updateMollweideFov);
}

return MollweideViewer;

});