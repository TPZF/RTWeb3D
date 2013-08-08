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

define( [ "jquery.ui", "gw/VectorLayer" ], function($, VectorLayer){

/**
 *	@constructor
 *	@param options Configuration options
 *		<ul>
 *			<li>globe: Globe</li>
 *			<li>navigation: Navigation</li>
 *			<li>onselect: On selection callback</li>
 *			<li>type: "square" or "circle"</li>
 *		</ul>
 */
var SelectionTool = function(options)
{
	// Required options
	var globe = options.globe;
	var navigation = options.navigation;
	var onselect = options.onselect;
	this.type = options.type || "square";

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
		if ( !self.activated || !dragging )
			return;

		// Update radius
		mPickPoint = globe.getLonLatFromPixel(event.clientX, event.clientY);
		self.radius = Math.sqrt( Math.pow(mPickPoint[0] - self.pickPoint[0], 2) + Math.pow(mPickPoint[1] - self.pickPoint[1], 2) );
		self.updateSelection();
	});

	this.renderContext.canvas.addEventListener("mouseup", function(){

		if ( !self.activated )
			return;

		if ( onselect )
		{
			onselect();
		}

		// Reactivate standard navigation events
		navigation.start();
		dragging = false;
	});
}

/**************************************************************************************************************/

/**
 *	Update selection coordinates
 */
SelectionTool.prototype.updateSelection = function()
{
	if ( this.selectionFeature )
		this.selectionLayer.removeFeature(this.selectionFeature);

	var coordinates = [];
	if ( this.type == "circle" )
	{
		for ( var i=-Math.PI; i<=Math.PI; i+=0.1 )
		{
			coordinates.push([ this.pickPoint[0] + this.radius*Math.cos(i),
							   this.pickPoint[1] + this.radius*Math.sin(i) ]);
		}
	}
	else if ( this.type == "square" )
	{
		coordinates =[
			[ this.pickPoint[0]-this.radius, this.pickPoint[1]-this.radius ],
			[ this.pickPoint[0]-this.radius, this.pickPoint[1]+this.radius ],
			[ this.pickPoint[0]+this.radius, this.pickPoint[1]+this.radius ],
			[ this.pickPoint[0]+this.radius, this.pickPoint[1]-this.radius ],
			[ this.pickPoint[0]-this.radius, this.pickPoint[1]-this.radius ]
		];
	}
	else
	{
		console.error("Selection type not implemented yet");
	}

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
}

/**************************************************************************************************************/

return SelectionTool;

});