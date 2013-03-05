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
 * Service bar module
 * (currently specified only for OpenSearchLayer)
 *
 */
define( [ "jquery.ui", "OpenSearchService", "FitsService", "MocService" ], function($, OpenSearchService, FitsService, MocService) {

// Create service bar div

var serviceBar = '<div id="serviceBar">\
						<h3>Service manager</h3>\
						<div id="serviceManager">\
							<p>No service available for active layers</p>\
							<div id="layerServices" style="display: none;">\
								<ul>\
								</ul>\
							</div>\
						</div>\
					</div>';
var $serviceBar = $(serviceBar).prependTo('body');

var tabs = $('#layerServices').tabs({
	collapsible: true,
	hide: { effect: "slideUp", duration: 300 },
	show: { effect: "slideDown", duration: 300 }
});

// Mapping between type of a layer and supported services
var serviceMapping =
{
	"DynamicOpenSearch": [OpenSearchService, FitsService, MocService]
};

var layers = [];
var services = [];

/**
 *	Add services HTML to the tabs
 */
function addServicesHTML()
{
	for ( var i=0; i<services.length; i++ )
	{
		services[i].addService(tabs);
	}
}

/**
 *	Remove services HTML from the tabs
 */
function removeServicesHTML()
{
	for ( var i=0; i<services.length; i++ )
	{
		services[i].removeService(tabs);
	}
}

return {

	init: function(gl, configuration)
	{
		MocService.init(gl, configuration);
		FitsService.init(gl);
		$( "#serviceBar" ).accordion( { autoHeight: false, active: false, collapsible: true } ).show();
	},

	/**
	 *	Add layer services to the bar
	 */
	addLayer: function(layer){

		var layerServices = serviceMapping[layer.type]
		if ( layerServices )
		{
			$('#serviceBar').find('p').slideUp(function(){

				// Add new services
				var newServices = _.difference(layerServices, services);
				for ( var i=0; i<newServices.length; i++ )
				{
					newServices[i].addService(tabs);
				}

				// Compute available services
				services = _.union(layerServices, services);

				// Add layer to services
				for ( var i=0; i<layerServices.length; i++ )
				{
					layerServices[i].addLayer(layer);
				}

				tabs.tabs("refresh");
				tabs.slideDown();
				layers.push(layer);
			});
		}
	},

	/**
	 *	Remove layer services from the bar
	 */
	removeLayer: function(layer){

		var layerServices = serviceMapping[layer.type];
		if ( layerServices )
		{
			// Remove layer from services
			for ( var i=0; i<layerServices.length; i++ )
			{
				layerServices[i].removeLayer( layer );
			}

			// Remove layer
			for(var i=0; i<layers.length; i++)
			{
				if(layers[i].id == layer.id)
				{
					layers.splice(i,1);
				}
			}

			// Recompute services
			services = [];
			for ( var i=0; i<layers.length; i++ )
			{
				services = _.union(services, serviceMapping[layers[i].type]);
			}
			
			if ( layers.length > 0 )
			{
				// Remove inused services
				var servicesToRemove = _.difference(layerServices, services);
				for ( var i=0; i<servicesToRemove.length; i++ )
				{
					servicesToRemove[i].removeService(tabs);
				}
			}
			else
			{
				// Remove all services
				for ( var i=0; i<layerServices.length; i++ )
				{
					layerServices[i].removeService(tabs);
				}

				// Hide tabs
				tabs.slideUp(function(){
					tabs.tabs("refresh");
					$('#serviceBar').find('p').slideDown();
				});
			}
		}
	}
};

});
