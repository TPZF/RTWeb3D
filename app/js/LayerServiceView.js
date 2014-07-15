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
define( [ "jquery", "./OpenSearchService", "./MocService", "./XMatchService", "./HEALPixCutService", "jquery.ui" ],
			function($, OpenSearchService, MocService, XMatchService, HEALPixCutService ) {

var layerServiceView = '<div id="layerServiceView" title="Available services">\
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

var services = [ OpenSearchService, MocService, XMatchService ];

var serviceMapping = {
	"OpenSearch" : OpenSearchService,
	"Moc": MocService,
	"XMatch": XMatchService,
	"HEALPixCut" : HEALPixCutService
};

var currentLayer;

/**
 *	Get service object from configuration
 *	(could be string or object)
 */
function getServiceFromConf(service)
{
	if ( typeof service === "string" )
	{
		return serviceMapping[service];
	}
	else
	{
		if ( service.name )
		{
			return serviceMapping[service.name];
		}
		else
		{
			console.error("Service must have name property in configuration");
			return null;
		}
	}
}

return {
	init: function(gl, nav, lm, configuration)
	{
		MocService.init(gl, configuration);
		XMatchService.init(gl, lm, configuration);
		HEALPixCutService.init(gl, nav)
	},

	show: function(layer)
	{
		var service;

		// Remove previous services
		if ( currentLayer )
		{
			for ( var i=0; i<currentLayer.availableServices.length; i++)
			{
				service = getServiceFromConf(currentLayer.availableServices[i])
				if ( service.removeLayer )
					service.removeLayer(currentLayer);
				service.removeService(tabs, currentLayer.availableServices[i]);
			}
		}

		for ( var i=0; i<layer.availableServices.length; i++ )
		{
			service = getServiceFromConf( layer.availableServices[i] );
			if ( service )
			{
				service.addService(tabs, layer.availableServices[i]);
				if ( service.addLayer )
					service.addLayer(layer);
			}
			else
			{
				// Unrecognized service, remove it
				console.error("Mapping doesn't exist, service must be = { OpenSearch, Moc, XMatch or HEALPixCut }");
				layer.availableServices.splice(i,1);
			}
		}
		currentLayer = layer;

		tabs.tabs('refresh');
		tabs.tabs("option", "active", 0);

		$layerServiceView
			.dialog( "open" );
	}
}

});