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
 *	Layer service view
 *	The view representing the services for each layer
 */
define( [ "jquery.ui", "PickingManager", "OpenSearchService", "MocService", "XMatchService", "UWSService" ],
			function($, PickingManager, OpenSearchService, MocService, XMatchService, UWSService) {

var layerServiceView = '<div id="layerServiceView" title="Avaliable services">\
							<div id="layerServices">\
								<ul>\
								</ul>\
							</div>\
						</div>';

// Create the div, use jQuery UI dialog
var $layerServiceView = $(layerServiceView)
					.appendTo('body')
					.dialog({
						autoOpen: false,
						resizable: false,
						width: '600px',
						show: {
							effect: "fade",
							duration: 300
						},
						hide: {
							effect: "fade",
							duration: 300
						},
						minHeight: 'auto',
						position:['middle',20],
						open: function()
						{
							// Remove auto-focus
							$(this).find('li:first-child').blur();
						}
					});

var tabs = $('#layerServices').tabs({
	collapsible: true,
	hide: { effect: "slideUp", duration: 300 },
	show: { effect: "slideDown", duration: 300 }
});

var services = [ OpenSearchService, MocService, XMatchService, UWSService ];

var currentLayer;

return {
	init: function(gl, nav, lm, configuration)
	{
		MocService.init(gl, configuration);
		UWSService.init(gl, nav, PickingManager, configuration);
		XMatchService.init(gl, lm, configuration);

		for ( var i=0; i<services.length; i++ )
		{
			services[i].addService(tabs);
		}

		tabs.tabs("refresh");
	},

	show: function(layer)
	{
		if ( currentLayer )
		{
			for ( var i=0; i<services.length; i++ )
			{
				if ( services[i].removeLayer )
					services[i].removeLayer(currentLayer);
			}
		}

		for ( var i=0; i<services.length; i++ )
		{
			if ( services[i].addLayer )
				services[i].addLayer(layer);
		}

		currentLayer = layer;

		$layerServiceView
			.dialog( "open" );
	}
}

});