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

/*************************************************************************/

/**
 *  Canvas 2D point
 */
var Point = function(options) {
    this.x = 0;
    this.y = 0;
    this.color = "rgb(255,0,0)";
    this.size = 2;
    for ( x in options )
    {
        this[x] = options[x];
    }
}

/**
 *  Determine if a point is inside the fov shape bounds
 */
Point.prototype.contains = function(mx, my)
{
    return (this.x <= mx && this.y <= my &&
            this.x + this.size >= mx && this.y + this.size >= my);
}

/*************************************************************************/

var MollweideViewer = function(options) {

    // Init options
    var globe = options.globe;
    var navigation = options.navigation;
    var halfPaddingX = 16;
    var halfPaddingY = 8;

    // Grid background dimensions
    var halfHeight = 50;
    var halfWidth = 100;

    // Interaction parameters
    var _lastMouseX = -1;
    var _lastMouseY = -1;
    var dragging = false;

    // Level of tesselation to represent fov
    var tesselation = 9; // Must be >= 2

    // Center of fov
    var center3d = new Point({
        size: 5,
        color: "rgb(255,255,0)"
    });

    // Init image background
    var canvas = document.getElementById('mollweideProjection');
    var context = canvas.getContext('2d');
    var imageObj = new Image();
    imageObj.onload = function() {
        context.drawImage(imageObj, 0, 0);
        updateMollweideFov();
    };
    //imageObj.src = 'css/images/Milky_Way_infrared_200x100.png';
    imageObj.src = 'css/images/MollweideGrid.png';

    /**********************************************************************************************/

    /**
     *  Compute mollweide position for given 3D position
     */
    function computeMollweidePosition( pos )
    {
        var geoPos = [];
        CoordinateSystem.from3DToGeo(pos, geoPos);

        var lambda = geoPos[0] * Math.PI/180 ; // longitude
        var theta0 = geoPos[1] * Math.PI/180;  // latitude

        var auxTheta = _findTheta( theta0 );

        // Transfrom to Mollweide coordinate system
        var mollX = 2*Math.sqrt(2)/Math.PI * lambda * Math.cos(auxTheta);
        var mollY = Math.sqrt(2) * Math.sin(auxTheta);

        // Transform to image space
        //    2.8: max x value in Mollweide projection
        //    1.38: max y value in Mollweide projection
        var x = -mollX * halfWidth/2.8 + halfWidth + halfPaddingX;
        var y = -mollY * halfHeight/1.38 + halfHeight + halfPaddingY;

        return [x,y];
    }

    /**********************************************************************************************/

    /**
     *  Function updating the position of center of camera on mollweide element
     */
    function updateMollweideFov()
    {
        // Reinit canvas
        context.clearRect(0,0, context.canvas.width, context.canvas.height);
        context.drawImage(imageObj, 0, 0);

        // Draw fov
        context.fillStyle = "rgb(255,0,0)";
        var stepX = globe.renderContext.canvas.clientWidth/(tesselation - 1);
        var stepY = globe.renderContext.canvas.clientHeight/(tesselation - 1);

        for ( var i=0; i<tesselation; i++ )
        {
            // Width
            for ( var j=0; j<tesselation; j++ )
            {
                // Height
                var pos3d = globe.renderContext.get3DFromPixel(i*stepX,j*stepY);
                var mPos = computeMollweidePosition( pos3d );

                // Draw on canvas 2d
                context.fillRect(mPos[0], mPos[1], 2, 2);
            }
        }

        // Draw center
        context.fillStyle = center3d.color;
        mPos = computeMollweidePosition ( navigation.center3d );
        center3d.x = mPos[0];
        center3d.y = mPos[1];

        // Draw on canvas 2d
        context.fillRect(mPos[0] - center3d.size/2, mPos[1]-center3d.size/2, center3d.size, center3d.size);

    }

    /**********************************************************************************************/

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
        center3d.x = - ( offX - halfWidth - halfPaddingX ) * 2.8 / halfWidth;
        center3d.y = - ( offY - halfHeight - halfPaddingY ) * 1.38 / halfHeight;
        
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

    /**********************************************************************************************/

    // Show/hide mollweide projection
	$('#slideArrow').on('click', function(){
        /*$(this).parent().animate({
            right: parseInt( $(this).parent().css('right') ) == 0 ?
                -$(this).parent().outerWidth() + 10 :
                0
        });*/

		if ( parseFloat($(this).parent().css('right')) < -100 )
		{
			// Slide left
			$(this).parent().animate({right: '0px'}, 300);
		}
		else
		{
			// Slide right
			$(this).parent().animate({right: '-241px'}, 300);
		}
	});

	// Fix for Google Chrome : avoid dragging
    canvas.addEventListener("dragstart", function(event){event.preventDefault(); return false;});

	// Update fov when navigation modified
	navigation.subscribe("modified", updateMollweideFov);
}

return MollweideViewer;

});