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
 * Tool designed to select areas on globe
 */

define( [ "jquery.ui", "gw/VectorLayer", "gw/Numeric", "gw/CoordinateSystem" ], function($, VectorLayer, Numeric, CoordinateSystem){

/**
 *	@constructor
 *	@param options Configuration options
 *		<ul>
 *			<li>globe: Globe</li>
 *			<li>navigation: Navigation</li>
 *			<li>onselect: On selection callback</li>
 *		</ul>
 */
var SelectionTool = function(options)
{
	// Required options
	var globe = options.globe;
	var navigation = options.navigation;
	var onselect = options.onselect;

	this.activated = false;
	this.renderContext = globe.renderContext;

	// Layer containing selection feature
	this.selectionLayer = new VectorLayer();
	globe.addLayer(this.selectionLayer);
	
	this.selectionFeature = null;

	// Selection attributes
	this.radius;	// Window radius
	this.pickPoint; // Window pick point
	this.geoRadius; // Radius in geographic reference
	this.geoPickPoint; // Pick point in geographic reference

	var self = this;
	var dragging = false;
	
	this.renderContext.canvas.addEventListener("mousedown", function(event){
		if ( !self.activated )
			return;

		self.radius = 0.;
		// Desactivate standard navigation events
		navigation.stop();

		dragging = true;
		self.pickPoint = [event.clientX, event.clientY];
		self.geoPickPoint = globe.getLonLatFromPixel(event.clientX, event.clientY);
	});

	this.renderContext.canvas.addEventListener("mousemove", function(event){
		if ( !self.activated || !dragging )
			return;

		// Update radius
		self.radius = Math.sqrt( Math.pow(event.clientX - self.pickPoint[0], 2) + Math.pow(event.clientY - self.pickPoint[1], 2) );
		self.updateSelection();
	});

	this.renderContext.canvas.addEventListener("mouseup", function(){
		if ( !self.activated )
			return;

		// Compute geo radius
		var stopPickPoint = globe.getLonLatFromPixel(event.clientX, event.clientY);
		self.geoRadius = Math.sqrt( Math.pow(stopPickPoint[0] - self.geoPickPoint[0], 2) + Math.pow(stopPickPoint[1] - self.geoPickPoint[1], 2) );

		if ( onselect )
		{
			onselect();
		}

		// Reactivate standard navigation events
		navigation.start();
		dragging = false;
	});
}

/**********************************************************************************************/

/**
 *	Compute selection for the given pick point depending on radius
 */
SelectionTool.prototype.computeSelection = function()
{
	var rc = this.renderContext;
	var tmpMat = mat4.create();
	
	// Compute eye in world space
	mat4.inverse(rc.viewMatrix, tmpMat);
	var eye = [tmpMat[12], tmpMat[13], tmpMat[14]];
	
	// Compute the inverse of view/proj matrix
	mat4.multiply(rc.projectionMatrix, rc.viewMatrix, tmpMat);
	mat4.inverse(tmpMat);
	
	// Scale to [-1,1]
	var widthScale = 2/rc.canvas.width;
	var heightScale = 2/rc.canvas.height;
	var points = [
		[ (this.pickPoint[0]-this.radius)*widthScale-1., ((rc.canvas.height-this.pickPoint[1])-this.radius)*heightScale-1., 1, 1 ],
		[ (this.pickPoint[0]-this.radius)*widthScale-1., ((rc.canvas.height-this.pickPoint[1])+this.radius)*heightScale-1., 1, 1 ],
		[ (this.pickPoint[0]+this.radius)*widthScale-1., ((rc.canvas.height-this.pickPoint[1])+this.radius)*heightScale-1., 1, 1 ],
		[ (this.pickPoint[0]+this.radius)*widthScale-1., ((rc.canvas.height-this.pickPoint[1])-this.radius)*heightScale-1., 1, 1 ]
	];	

	// Transform the four corners of selection shape into world space
	// and then for each corner compute the intersection of ray starting from the eye with the sphere
	var tmpPt = vec3.create();
	var worldCenter = [ 0, 0, 0 ];
	for ( var i = 0; i < 4; i++ )
	{
		mat4.multiplyVec4( tmpMat, points[i] );
		vec3.scale( points[i], 1.0 / points[i][3] );
		vec3.subtract(points[i], eye, points[i]);
		vec3.normalize( points[i] );
		
		var t = Numeric.raySphereIntersection( eye, points[i], worldCenter, CoordinateSystem.radius);
		if ( t < 0.0 )
			return null;

		points[i] = CoordinateSystem.from3DToGeo( Numeric.pointOnRay(eye, points[i], t, tmpPt) );
	}

	return points;
}

/**************************************************************************************************************/

/**
 *	Update selection coordinates
 */
SelectionTool.prototype.updateSelection = function()
{
	if ( this.selectionFeature )
		this.selectionLayer.removeFeature(this.selectionFeature);

	var coordinates = this.computeSelection();
	// Close the polygon
	coordinates.push(coordinates[0]);

	this.selectionFeature = {
		"geometry": {
			"gid": "selectionShape",
			"coordinates": [coordinates],
			"type": "Polygon"
		},
		"type": "Feature"
	};
	
	this.selectionLayer.addFeature( this.selectionFeature );
}

/**************************************************************************************************************/

/**
 *	Activate/desactivate the tool
 */
SelectionTool.prototype.toggle = function()
{
	this.activated = !this.activated;
	if ( this.activated )
	{
		// TODO : Find more sexy image for cursor
		$(this.renderContext.canvas).css('cursor', 'url(css/images/selectionCursor.png)');
	}
	else
	{
		$(this.renderContext.canvas).css('cursor', 'default');
	}
}

/**************************************************************************************************************/

/**
 *	Clear selection
 */
SelectionTool.prototype.clear = function()
{
	if ( this.selectionFeature )
		this.selectionLayer.removeFeature(this.selectionFeature);

	this.pickPoint = null;
	this.radius = null;
	this.geoPickPoint = null;
	this.geoRadius = null;
}

/**************************************************************************************************************/

return SelectionTool;

});