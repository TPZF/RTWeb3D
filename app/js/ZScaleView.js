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
 * UWS ZScale View
 * TODO unify all UWS services
 */
define( [ "jquery.ui", "ZScale", "PickingManager", "AnimatedButton" ],
		function($, ZScale, PickingManager, AnimatedButton) {

var runButton;

/**************************************************************************************************************/

/**
 *	Show message
 */
function showMessage(message)
{
	$('#zscaleStatus').html(message).stop().slideDown(300).delay(2000).slideUp();
}

/**************************************************************************************************************/

function findUrl()
{
	var url = null;
	var selectedData = PickingManager.getSelectedData();
	if ( selectedData )
	{
		// Data selected
	    url = selectedData.feature.services.download.url
	}
	else
	{
		showMessage('Please select observation to zscale');
	}

	return url;
}

/**************************************************************************************************************/

function runJob()
{
	var url = findUrl();
	if ( url )
	{
		runButton.startAnimation();
		ZScale.post(url, {
			successCallback: function(z1, z2)
			{
				runButton.stopAnimation();
				$('#z1').html("z1: "+z1);
				$('#z2').html("z2: "+z2);

			},
			failCallback: function()
			{
				runButton.stopAnimation();
			}
		});
	}
}

/**************************************************************************************************************/

return {

	init: function(conf)
	{
		ZScale.init(conf.baseUrl);
	},

	/**************************************************************************************************************/

	add: function(element)
	{

		var zScaleContent = '<div style="text-align: center;">\
								<button id="runZScale">Run</button>\
								<div style="display: none;" id="zscaleStatus"></div>\
								<div style="text-align: left; margin-top: 10px;" id="zScaleResults">\
									<div style="width:200px" id="z1">z1: </div>\
									<div style="width:200px;" id="z2">z2: </div>\
								</div>\
							</div>';
		$(zScaleContent)
			.appendTo('#'+element);

		runButton = new AnimatedButton($('#'+element).find('#runZScale')[0], {
			onclick: runJob
		});
	}

	/**************************************************************************************************************/
}


});