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
 * Tool designed to select regions on globe
 */

define( [ "jquery.ui", "gw/VectorLayer" ], function($, VectorLayer){

/**
 *	@constructor
 *	@param options Configuration options
 *		<ul>
 *			<li>globe: Globe</li>
 *			<li>navigation: Navigation</li>
 *		</ul>
 */
var SelectionTool = function(options)
{
	// Required options
	var globe = options.globe;
	var navigation = options.navigation;

	this.activated = false;
	this.renderContext = globe.renderContext;

	// Layer containing selection feature
	this.selectionLayer = new VectorLayer();
	globe.addLayer(this.selectionLayer);
	
	this.selectionFeature = null;

	// Selection attributes
	this.radius;
	this.pickPoint;

	var self = this;
	var dragging = false;
	
	this.renderContext.canvas.addEventListener("mousedown", function(event){
		if ( !self.activated )
			return;

		self.radius = 0.;
		// Desactivate standard navigation events
		navigation.stop();

		dragging = true;
		self.pickPoint = globe.getLonLatFromPixel(event.clientX, event.clientY);
	});

	this.renderContext.canvas.addEventListener("mousemove", function(event){
		// Modify radius and feature
		if ( !self.activated || !dragging )
			return;

		mPickPoint = globe.getLonLatFromPixel(event.clientX, event.clientY);
		self.radius = Math.sqrt( Math.pow(mPickPoint[0] - self.pickPoint[0], 2) + Math.pow(mPickPoint[1] - self.pickPoint[1], 2) );
		self.updateSelection();
	});

	this.renderContext.canvas.addEventListener("mouseup", function(){

		if ( !self.activated )
			return;

		// Reactivate standard navigation events
		navigation.start();
		dragging = false;
	});
}

/**
 *	Update selection coordinates
 */
SelectionTool.prototype.updateSelection = function()
{
	if ( this.selectionFeature )
		this.selectionLayer.removeFeature(this.selectionFeature);

	this.selectionFeature = {
		"geometry": {
			"gid": "selectionShape",
			"coordinates": [[
				[ this.pickPoint[0]-this.radius, this.pickPoint[1]-this.radius ],
				[ this.pickPoint[0]-this.radius, this.pickPoint[1]+this.radius ],
				[ this.pickPoint[0]+this.radius, this.pickPoint[1]+this.radius ],
				[ this.pickPoint[0]+this.radius, this.pickPoint[1]-this.radius ],
				[ this.pickPoint[0]-this.radius, this.pickPoint[1]-this.radius ]
			]],
			"type": "Polygon"
		},
		"type": "Feature"
	};
	this.selectionLayer.addFeature( this.selectionFeature );
}

/**
 *	
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
		// Remove feature from renderer(maybe specify "Clear" method)
		if ( this.selectionFeature )
			this.selectionLayer.removeFeature(this.selectionFeature);
		this.pickPoint = null;
		this.radius = null;
	}
}

return SelectionTool;

});