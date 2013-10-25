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
 * Tool designed to measure the distance between two points
 */

define( [ "jquery.ui", "gw/VectorLayer", "gw/Numeric", "gw/CoordinateSystem", "gw/FeatureStyle", "gw/glMatrix" ],
		function($, VectorLayer, Numeric, CoordinateSystem, FeatureStyle){

/**
 *	@constructor
 *	@param options Configuration options
 *		<ul>
 *			<li>globe: Globe</li>
 *			<li>navigation: Navigation</li>
 *			<li>onselect: On select callback</li>
 *		</ul>
 */
var MeasureTool = function(options)
{
	// Required options
	var globe = options.globe;
	var navigation = options.navigation;
	var onselect = options.onselect;

	this.activated = false;
	this.renderContext = globe.renderContext;

	// Layer containing measure feature
	this.measureLayer = new VectorLayer();
	globe.addLayer(this.measureLayer);
	
	this.measureFeature = null;

	// Measure attributes
	this.distance;
	this.pickPoint; // Window pick point
	this.secondPickPoint; // Window second pick point
	this.geoDistance;
	this.geoPickPoint; // Pick point in geographic reference
	this.secondGeoPickPoint; // Pick point in geographic reference

	this.measureLabel;

	var self = this;
	var dragging = false;
	
	this.renderContext.canvas.addEventListener("mousedown", function(event){
		if ( !self.activated )
			return;

		self.distance = 0.;
		// Desactivate standard navigation events
		navigation.stop();

		dragging = true;
		self.pickPoint = [event.clientX, event.clientY];
		self.geoPickPoint = globe.getLonLatFromPixel(event.clientX, event.clientY);
	});

	this.renderContext.canvas.addEventListener("mousemove", function(event){
		if ( !self.activated || !dragging )
			return;

		self.secondPickPoint = [ event.clientX, event.clientY ];
		self.secondGeoPickPoint = globe.getLonLatFromPixel(event.clientX, event.clientY);
		// Update radius
		self.distance = Math.sqrt( Math.pow(event.clientX - self.pickPoint[0], 2) + Math.pow(event.clientY - self.pickPoint[1], 2) );
		var dotProduct = vec3.dot( CoordinateSystem.fromGeoTo3D(self.secondGeoPickPoint), CoordinateSystem.fromGeoTo3D(self.geoPickPoint) );
		var theta = Math.acos(dotProduct);
		self.geoDistance = Numeric.toDegree(theta);

		self.updateMeasure();
	});

	this.renderContext.canvas.addEventListener("mouseup", function(event){
		if ( !self.activated )
			return;

		// Compute geo radius
		var stopPickPoint = globe.getLonLatFromPixel(event.clientX, event.clientY);

		// Find angle between start and stop vectors which is in fact the radius
		var dotProduct = vec3.dot( CoordinateSystem.fromGeoTo3D(stopPickPoint), CoordinateSystem.fromGeoTo3D(self.geoPickPoint) );
		var theta = Math.acos(dotProduct);
		self.geoDistance = Numeric.toDegree(theta);

		if ( onselect )
		{
			onselect();
		}

		// Reactivate standard navigation events
		navigation.start();
		dragging = false;
	});

	// TODO : change UI
	document.addEventListener("keydown", function(event){
		if ( event.keyCode == 77 )
		{
			// M
			self.toggle();
		}
	});	
}

MeasureTool.prototype.computeIntersection = function(points)
{
	var rc = this.renderContext;
	var tmpMat = mat4.create();
	
	// Compute eye in world space
	mat4.inverse(rc.viewMatrix, tmpMat);
	var eye = [tmpMat[12], tmpMat[13], tmpMat[14]];
	
	// Compute the inverse of view/proj matrix
	mat4.multiply(rc.projectionMatrix, rc.viewMatrix, tmpMat);
	mat4.inverse(tmpMat);

	// Transform the four corners of measure shape into world space
	// and then for each corner compute the intersection of ray starting from the eye with the sphere
	var tmpPt = vec3.create();
	var worldCenter = [ 0, 0, 0 ];
	for ( var i = 0; i < points.length; i++ )
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

/**********************************************************************************************/

function rotateVector2D(vec, theta)
{
	theta = theta * Math.PI/ 180;
	var cs = Math.cos(theta);
	var sn = Math.sin(theta);

	return [ vec[0] * cs - vec[1]*sn, vec[0] * sn + vec[1]*cs ];
}

function normalize2D(vec, dest)
{
	if ( !dest )
	{
		dest = vec;
	}

	var length = Math.sqrt( vec[0]*vec[0] + vec[1]*vec[1] );
	dest[0] = vec[0]/length;
	dest[1] = vec[1]/length;
	return dest;
}

/**********************************************************************************************/

/**
 *	Compute measure for the given pick point depending on second point
 */
MeasureTool.prototype.computeMeasure = function()
{
	var rc = this.renderContext;
	// Scale to [-1,1]
	var widthScale = 2/rc.canvas.width;
	var heightScale = 2/rc.canvas.height;

	var diff = [this.secondPickPoint[0] - this.pickPoint[0], this.secondPickPoint[1] - this.pickPoint[1]];
	normalize2D(diff);

	// First arrow
	var arrow = rotateVector2D(diff, 30);
	var arrow2 = rotateVector2D(diff, -30);
	arrow = [ this.pickPoint[0] + 10*arrow[0], this.pickPoint[1] + 10*arrow[1] ];
	arrow2 = [ this.pickPoint[0] + 10*arrow2[0], this.pickPoint[1] + 10*arrow2[1] ];

	var diff2 = [-diff[0], -diff[1]];
	var arrow3 = rotateVector2D(diff2, 30);
	var arrow4 = rotateVector2D(diff2, -30);
	arrow3 = [ this.secondPickPoint[0] + 10*arrow3[0], this.secondPickPoint[1] + 10*arrow3[1] ];
	arrow4 = [ this.secondPickPoint[0] + 10*arrow4[0], this.secondPickPoint[1] + 10*arrow4[1] ];

	var points = [
		[ this.pickPoint[0]*widthScale-1., (rc.canvas.height-this.pickPoint[1])*heightScale-1., 1, 1 ],
		[ arrow[0]*widthScale-1., (rc.canvas.height-arrow[1])*heightScale-1., 1, 1 ],
		[ this.pickPoint[0]*widthScale-1., (rc.canvas.height-this.pickPoint[1])*heightScale-1., 1, 1 ],
		[ arrow2[0]*widthScale-1., (rc.canvas.height-arrow2[1])*heightScale-1., 1, 1 ],
		[ this.pickPoint[0]*widthScale-1., (rc.canvas.height-this.pickPoint[1])*heightScale-1., 1, 1 ],
		[ this.secondPickPoint[0]*widthScale-1., (rc.canvas.height-this.secondPickPoint[1])*heightScale-1., 1, 1 ],
		[ arrow3[0]*widthScale-1., (rc.canvas.height-arrow3[1])*heightScale-1., 1, 1 ],
		[ this.secondPickPoint[0]*widthScale-1., (rc.canvas.height-this.secondPickPoint[1])*heightScale-1., 1, 1 ],
		[ arrow4[0]*widthScale-1., (rc.canvas.height-arrow4[1])*heightScale-1., 1, 1 ],
		[ this.secondPickPoint[0]*widthScale-1., (rc.canvas.height-this.secondPickPoint[1])*heightScale-1., 1, 1 ]
	];

	this.computeIntersection(points);
	return points;
}

/**************************************************************************************************************/

/**
 *	Update measure coordinates
 */
MeasureTool.prototype.updateMeasure = function()
{
	if ( this.measureFeature )
	{
		this.measureLayer.removeFeature(this.measureFeature);
	}

	if ( this.measureLabel )
	{
		this.measureLayer.removeFeature(this.measureLabel);
	}

	var coordinates = this.computeMeasure();
	// Close the polygon
	coordinates.push(coordinates[0]);

	this.measureFeature = {
		"geometry": {
			"gid": "measureShape",
			"coordinates": [coordinates],
			"type": "Polygon"
		},
		"type": "Feature"
	};

	var center = [ (this.secondPickPoint[0] + this.pickPoint[0])/2, (this.secondPickPoint[1] + this.pickPoint[1])/2 ];
	var center3d = this.renderContext.get3DFromPixel(center[0],center[1]);
	var geoCenter = CoordinateSystem.from3DToGeo(center3d);
	this.measureLabel = {
		geometry: {
			type: "Point",
			gid: "measureShape",
			coordinates: geoCenter
		},
		properties: {
			style: new FeatureStyle({ label: this.geoDistance, fillColor: [1.,1.,1.,1.] })
		}
	};
	
	this.measureLayer.addFeature( this.measureFeature );
	this.measureLayer.addFeature( this.measureLabel );
}

/**************************************************************************************************************/

/**
 *	Activate/desactivate the tool
 */
MeasureTool.prototype.toggle = function()
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
 *	Clear measure
 */
MeasureTool.prototype.clear = function()
{
	if ( this.measureFeature )
		this.measureLayer.removeFeature(this.measureFeature);

	this.pickPoint = null;
	this.geoPickPoint = null;
}

/**************************************************************************************************************/

return MeasureTool;

});