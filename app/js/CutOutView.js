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
 * UWS CutOut View
 */
define( [ "jquery.ui", "SelectionTool", "PickingManager", "CutOut", "gw/CoordinateSystem", "underscore-min", "text!../templates/cutOut.html" ],
		function($, SelectionTool, PickingManager, CutOut, CoordinateSystem, _, cutOutHTMLTemplate) {

var selectionTool;
var stopped = true;
// Template generating UWS services div
var cutOutTemplate = _.template(cutOutHTMLTemplate);

/**************************************************************************************************************/

/**
 *	Show message
 */
function showMessage(message)
{
	$('#jobInfo').html(message).stop().slideDown(300).delay(2000).slideUp();
}

/**************************************************************************************************************/

/**
 *	Start animation
 */
function startAnimation()
{
	stopped = false;
	iterateAnimation();
}

/**************************************************************************************************************/

/**
 *	Loading animation
 */
var iterateAnimation = function()
{
	$( '#runJob > span' ).animate({ backgroundColor: "rgb(255, 165, 0);" }, 300, function(){
		$(this).animate({ backgroundColor: "transparent" }, 300, function(){
			if ( !stopped )
			{
				iterateAnimation();
			}
		});
	});
}

/**************************************************************************************************************/

/**
 *	Toggle
 */
function toggleSelectionTool()
{
	// Deactivate picking events
	PickingManager.deactivate();
    selectionTool.toggle();
    $('#layerServices').slideUp();
}

/**************************************************************************************************************/

/**
 *	Find url to cut
 *
 *	@return url of image to cut if it's inside the selection and feature is selected, null otherwise
 */
function findUrl()
{
	var url = null;
	if ( selectionTool.pickPoint )
	{
		// Area selected
		var selectedData = PickingManager.getSelectedData();
		if ( selectedData )
		{
			// Data selected
		    url = selectedData.feature.services.download.url
		}
		else
		{
			showMessage('Please select observation to cut');
		}
	}
	else
	{
		showMessage('Please select area to cut');
	}
	return url;
}

/**************************************************************************************************************/

/**
 *	Run job
 */
function runJob()
{	
	var url = findUrl();
	if ( url )
	{
		// Convert to equatorial due to CutOut protocol
		if ( CoordinateSystem.type != "EQ" )
		{
			selectionTool.geoPickPoint = CoordinateSystem.convertFromDefault(selectionTool.geoPickPoint, "EQ");
		}
		startAnimation();
		var parameters = {
			url: url,
			ra: selectionTool.geoPickPoint[0],
			dec: selectionTool.geoPickPoint[1],
			radius: selectionTool.geoRadius
		};
		CutOut.post(parameters, {
			successCallback: function(url, name)
			{
				showMessage('Completed');
				stopped = true;
				$('<li style="display: none;">'+name+' <a href="' + url +'" download><img style="vertical-align: middle; width: 20px; height: 20px;" title="Download" src="css/images/download1.png"></a></li>')
					.appendTo($('#cutoutResults').find('ul'))
					.fadeIn(400);
			},
			failCallback: function(error)
			{
				stopped = true;
				showMessage(error);
			}
		});
	}
}

/**************************************************************************************************************/

return {

	init: function(gl, nav, conf)
	{
		// Initialize cutout service
		CutOut.init(conf);

		// Initialize selection tool
		selectionTool = new SelectionTool({
			globe: gl,
			navigation: nav,
			onselect: function(){
				$('#layerServices').slideDown();
				// Activate picking events
				PickingManager.activate();
				selectionTool.toggle();
			}
		});
	},

	/**
	 *	Append HTML to the given element
	 */
	add: function(element)
	{
		var cutOutContent = cutOutTemplate();
		$(cutOutContent)
			.appendTo('#'+element)
			.parent().find('#selectionTool')
				.button()
				.click(toggleSelectionTool).end()
			.parent().find('#runJob')
				.button()
				.click(runJob).end()
			.parent().find('#clearSelection')
				.button()
				.click(function(){
					selectionTool.clear();
				});
	},

	/**
	 *	Remove view
	 */
	remove: function(){
		selectionTool.clear();
	}
}

/**************************************************************************************************************/

});