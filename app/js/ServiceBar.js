
/**
 * Service bar module
 * (currently specified for OpenSearchLayer & Mix only)
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
	"Mix" : [OpenSearchService, MocService],
	"DynamicOpenSearch": [FitsService, MocService]
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

	init: function(gl)
	{
		FitsService.init(gl);
		$( "#serviceBar" ).accordion( { autoHeight: false, active: false, collapsible: true } ).show();
	},

	/**
	 *	Add layer services to the bar
	 */
	addLayer: function(layer){
		tabs.slideUp(function(){				
			var layerServices = serviceMapping[layer.type]
			if ( layerServices )
			{
				$('#serviceBar').find('p').slideUp(function(){
					removeServicesHTML();

					// Add layer to services
					for ( var i=0; i<layerServices.length; i++ )
					{
						layerServices[i].addLayer(layer);
					}

					// Compute available services
					if ( layers.length == 0 )
					{
						services = layerServices;
					}
					else
					{
						// Intersection of services
						services = _.union(services, layerServices);
					}

					addServicesHTML();

					tabs.slideDown(function(){
					    tabs.tabs("select",0);
					    tabs.tabs("refresh");
					});
					layers.push(layer);

				});
			}
		});
	},

	/**
	 *	Remove layer services from the bar
	 */
	removeLayer: function(layer){

		tabs.slideUp(function(){			
			if( layer instanceof MixLayer || layer instanceof GlobWeb.OpenSearchLayer )
			{

				// Remove layer from services
				var layerServices = serviceMapping[layer.type];
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


				if ( layers.length > 0 )
				{
					removeServicesHTML();

					// Compute services
					if( layers.length == 1 )
					{
						var layerServices = serviceMapping[layers[0].type];
						services = layerServices;
					}
					else
					{
						services = serviceMapping[layers[0].type];
						// Intersection of services between layers
						for ( var i=1; i<layers.length; i++ )
						{
							var layerServices = serviceMapping[layers[i].type];
							services = _.union(services, layerServices);
						}
					}
					
					addServicesHTML();

					tabs.slideDown(function(){
					    tabs.tabs("select",0);
					    tabs.tabs("refresh");
					});
				}
				else
				{
					tabs.slideUp(function(){
						removeServicesHTML();
						$('#serviceBar').find('p').slideDown();
					});
				}
			}
		});
	}
};

});
