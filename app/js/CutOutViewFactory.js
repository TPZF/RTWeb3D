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
 * 	UWS CutOutViewFactory
 *	Designed to share selectionTool & picking manager between views
 */
define( [ "jquery", "SelectionTool", "CutOutView" ],
		function($, SelectionTool, CutOutView) {

var selectionTool;
var pickingManager;
var views = [];

/**************************************************************************************************************/

return {
	init: function(gl, nav, pm, conf)
	{
		pickingManager = pm;

		// Initialize selection tool
		selectionTool = new SelectionTool({
			globe: gl,
			navigation: nav,
			onselect: function(){
				$('.cutOutService').slideDown();
				// Activate picking events
				pickingManager.activate();
				selectionTool.toggle();
			}
		});

		views = [];
	},

	addView: function(element)
	{
		var view = new CutOutView(element, selectionTool, pickingManager);
		views.push(view);
		return view;	
	},

	removeView: function(view)
	{
		var index = views.indexOf(view);
		views.splice(index, 1);		
	}


}

});