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
define(["jquery", "./Utils", "gw/Ray", "gw/glMatrix"], function($, Utils, Ray) {

var mizarBaseUrl;

/**
 *  Newton-Raphson method to find auxiliary theta needed for mollweide x/y computation
 *  @see https://en.wikipedia.org/wiki/Mollweide_projection
 */
function _findTheta( lat )
{
    // Avoid divide by zero
    if ( Math.abs(lat) == Math.PI/2 )
        return lat;

    var epsilon = 0.001;
    var thetaN;  // n
    var thetaN1; // n+1

    do
    {
        thetaN = thetaN1;
        if (!thetaN)
            thetaN = lat;
        var twoThetaN = 2*thetaN;
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

/*************************************************************************/

var MollweideViewer = function(options) {

    mizarBaseUrl = options.mizarBaseUrl;

    // Init options
    this.globe = options.globe;
    var navigation = options.navigation;
    var halfPaddingX = 16;
    var halfPaddingY = 8;

    // Grid background dimensions
    var halfHeight = 50;
    var halfWidth = 100;

    // Interaction parameters
    var dragging = false;

    // Level of tesselation to represent fov
    var tesselation = 9; // Must be >= 2

    // Center of fov
    var center3d = new Point({
        size: 5,
        color: "rgb(255,255,0)"
    });

    // Init image background
    var canvas = document.getElementById('mollweideCanvas');
    var context = canvas.getContext('2d');
    this.imageObj = new Image();
    var self = this;
    this.imageObj.onload = function() {
        context.drawImage(self.imageObj, 0, 0);
        updateMollweideFov();
    };

    this.setCoordSystem( this.globe.coordinateSystem.type );

    /**********************************************************************************************/

    /**
     *  Compute mollweide position for given 3D position
     */
    function computeMollweidePosition( pos )
    {
		var coordinateSystem = self.globe.coordinateSystem;
        var geoPos = coordinateSystem.from3DToGeo(pos);

        if ( coordinateSystem.type != "EQ" )
        {
            geoPos = coordinateSystem.convert(geoPos, 'EQ', coordinateSystem.type)
            // Convert to geographic
            if ( geoPos[0]>180 )
            {
                geoPos[0]-=360;
            }
        }


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
     *  Update navigation eye for the given mouse coordinates
     */
    function updateNavigation( moll )
    {
        // Transform to Mollweide space
        center3d.x = - ( moll[0] - halfWidth - halfPaddingX ) * 2.8 / halfWidth;
        center3d.y = - ( moll[1] - halfHeight - halfPaddingY ) * 1.38 / halfHeight;
        
        // Transform to geographic coordinate system
        // http://mathworld.wolfram.com/MollweideProjection.html
        var auxTheta = Math.asin( center3d.y / Math.sqrt(2) );

        var phi = Math.asin( (2*auxTheta + Math.sin(2*auxTheta))/Math.PI );
        var lambda = (Math.PI * center3d.x) / ( 2 * Math.sqrt(2) * Math.cos(auxTheta));

        var geo = [lambda*180/Math.PI, phi*180/Math.PI];
        if ( self.globe.coordinateSystem.type != "EQ" )
        {
            geo = self.globe.coordinateSystem.convert(geo, self.globe.coordinateSystem.type, "EQ");
        }

        // Update navigation
        self.globe.coordinateSystem.fromGeoTo3D(geo, navigation.center3d);

        navigation.computeViewMatrix();
    }

    /**********************************************************************************************/

    /**
     *  Function updating the position of center of camera on mollweide element
     */
    function updateMollweideFov()
    {
        // Reinit canvas
        context.clearRect(0,0, context.canvas.width, context.canvas.height);
        context.drawImage(self.imageObj, 0, 0);

        // Draw fov
        context.fillStyle = "rgb(255,0,0)";
        var stepX = self.globe.renderContext.canvas.clientWidth/(tesselation - 1);
        var stepY = self.globe.renderContext.canvas.clientHeight/(tesselation - 1);

        for ( var i=0; i<tesselation; i++ )
        {
            // Width
            for ( var j=0; j<tesselation; j++ )
            {
                // Height
                var ray = Ray.createFromPixel(self.globe.renderContext, i*stepX, j*stepY);
                var pos3d = ray.computePoint( ray.sphereIntersect( [0,0,0], self.globe.coordinateSystem.radius ) );
    
                var mPos = computeMollweidePosition( pos3d );

                // Draw on canvas 2d
                context.fillRect(mPos[0], mPos[1], 2, 2);
            }
        }

        // Draw center
        context.fillStyle = center3d.color;
        mPos = computeMollweidePosition ( navigation.center3d );
        center3d.x = mPos[0] - center3d.size/2;
        center3d.y = mPos[1] - center3d.size/2;

        // Draw on canvas 2d
        context.fillRect(mPos[0] - center3d.size/2, mPos[1]-center3d.size/2, center3d.size, center3d.size);

        // Update fov degrees
        var fov = navigation.getFov();
        var fovx = Utils.roundNumber( fov[0], 2 ) ;
        fovx = self.globe.coordinateSystem.fromDegreesToDMS( fovx );
        var fovy = Utils.roundNumber( fov[1], 2 ) ;
        fovy = self.globe.coordinateSystem.fromDegreesToDMS( fovy );
        $('#fov').html( "Fov : " + fovx + " x " + fovy );
    }

    /**********************************************************************************************/

    /**
     * Get mouse position on canvas
     */
    function getMousePos(event)
    {
        // Difference between chrome and firefox;
        var offX = (event.offsetX) ? event.offsetX : (event.layerX - event.target.offsetLeft);
        var offY = (event.offsetY) ? event.offsetY : (event.layerY - event.target.offsetTop);

        return [offX, offY];
    }

    /**********************************************************************************************/

    // Interact with mollweide projection
    canvas.addEventListener('mousedown', function(event){

        var mPos = getMousePos(event);
        updateNavigation(mPos);
        dragging = true;
        return true;
    });

    canvas.addEventListener('mousemove', function(event){

        if (!dragging)
            return;

        var mPos = getMousePos(event);
        updateNavigation(mPos);
    });

    canvas.addEventListener('mouseup', function(){
        dragging = false;
    })

    /**********************************************************************************************/

    // Show/hide mollweide projection
	$('#slideArrow').click(function(){

        if ( parseFloat($(this).parent().css('left')) < 0 )
        {
            // Show
            $('#mollweideContent').css({ boxShadow: "0px 0px 8px 1px rgba(255, 158, 82, 0.92)"});
            $(this).css('background-position', '0px 0px');
            $(this).parent().animate({left: '0px'}, 300);
            // Update fov when navigation modified
            navigation.subscribe("modified", updateMollweideFov);
			updateMollweideFov();
        }
        else
        {
            // Hide
            $('#mollweideContent').css({ boxShadow: "none"});
            $(this).css('background-position', '0px -20px');
            $(this).parent().animate({left: '-266px'}, 300);
            navigation.unsubscribe("modified", updateMollweideFov);
        }
	});

	// Fix for Google Chrome : avoid dragging
    canvas.addEventListener("dragstart", function(event){event.preventDefault(); return false;});
}

/**********************************************************************************************/

/**
 *  Change coordinate system background
 *
 *  @param coordSystem {String} Coordinate system to set
 *          <ul>
 *              <li>"EQ" : Equatorial</li>
 *              <li>"GAL" : Galactic</li>
 *          <ul>
 */
MollweideViewer.prototype.setCoordSystem = function(coordSystem)
{
    // Update mollweideViewer background image
    $(this.imageObj).attr("src", mizarBaseUrl + "css/images/MollweideSky_"+coordSystem+".png");
}

/**********************************************************************************************/

return MollweideViewer;

});