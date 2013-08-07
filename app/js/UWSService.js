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
 * UWS service
 *	- CutOut only currently
 */
define( [ "jquery.ui", "SelectionTool", "PickingManager", "CutOut", "underscore-min", "text!../templates/uwsService.html", "jquery.ui.selectmenu" ],
		function($, SelectionTool, PickingManager, CutOut, _, uwsServiceHTMLTemplate) {

var globe;

// TODO : create CutOutView
var selectionTool;
// Template generating UWS services div
var uwsServiceTemplate = _.template(uwsServiceHTMLTemplate);

var stopped = true;
function showMessage(message)
{
	$('#jobInfo').html(message).stop().slideDown(300).delay(2000).slideUp();
}

/**
 *	Loading animation
 */
var iterateAnimation = function()
{

	$( '#runJob > span' ).animate({ backgroundColor: "rgb(255, 165, 0);" }, 300, function(){
		$(this).animate({ backgroundColor: "transparent" }, 300, function(){
			if ( ! stopped )
			{
				iterateAnimation();
			}
		});
	});
}

function toggleSelectionTool()
{
	$(this).button("option", {
		icons: {
    		primary: $(this).is(':checked') ? "ui-icon-check" : "ui-icon-empty"
    	}
    });
    selectionTool.toggle();
}

return {
	init: function(gl, nav, conf)
	{
		globe = gl;
		selectionTool = new SelectionTool({globe: gl, navigation: nav});
		CutOut.init({
			successCallback: function(url, name){
				showMessage('Completed');
				stopped = true;
				$('#cutoutResults').find('ul').append(
					'<li>'+name+' <a href="' + url +'" download><img style="vertical-align: middle; width: 20px; height: 20px;" title="Download" src="css/images/download1.png"></a></li>');
			},
			failCallback: function(){
				stopped = true;
				showMessage('Error');
			},
			baseUrl: conf.cutOut.baseUrl
		});
	},

	/**
	 *	Add service to jQueryUI tabs
	 *
	 *	@param tabs jQueryUI tabs selector
	 */
	addService: function(tabs)
	{

		// Append header
		$('<li style="display: none;"><a href="#UWSService">UWS</a></li>')
			.appendTo( tabs.children( ".ui-tabs-nav" ) )
			.fadeIn(300);
		// Append content
		tabs.append('<div id="UWSService"></div>');

		var uwsServiceContent = uwsServiceTemplate();

		$(uwsServiceContent)
			.appendTo('#UWSService')
			.find('select').selectmenu({
				select: function(){
					var contentId = $(this).val();
					// Hide visible siblings
					$(this).siblings('div:visible').fadeOut(300, function(){
						// Show the choosen one J
						$('#'+contentId).fadeIn();
					});
				}
			}).end()
			.find('input[type="checkbox"]')
				.button({
					text: false,
					icons: {
						primary: "ui-icon-empty"
					}
				})
				.click(toggleSelectionTool).end()
			.find('#runJob').button().click(function(){
				
				// Selection tool selected something
				if ( selectionTool.pickPoint )
				{
					// Find feature with loaded fits
					var featureWithFits;
					var selection = PickingManager.computePickSelection( selectionTool.pickPoint );
					for ( var i=0; i<selection.length; i++ )
					{
						var feature = selection[i].feature;
						if ( feature.properties.style && feature.properties.style.fillTexture )
						{
							// Fits loaded
							featureWithFits = feature;
						}
					}

					if ( featureWithFits )
					{
						stopped = false;
						iterateAnimation();
						CutOut.post(featureWithFits.services.download.url, selectionTool.pickPoint[0], selectionTool.pickPoint[1], selectionTool.radius);
					}
					else
					{
						showMessage('Selection must contain loaded fits');
					}
				}
				else
				{
					showMessage('Please select area');
				}

			});
	},

	/**
	 *	Remove service from jQueryUI tabs
	 *
	 *	@param tabs jQueryUI tabs selector
	 */
	removeService: function(tabs)
	{
		tabs.find( '.ui-tabs-nav li[aria-controls="UWSService"]').fadeOut(300, function(){
			var index = $(this).index();
			tabs.tabs("remove",index);
		});
	}
}

});
