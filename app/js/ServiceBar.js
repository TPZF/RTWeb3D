
/**
 * Service bar module
 * (currently specified for OpenSearchLayer & Mix only)
 *
 */
define( [ "jquery.ui", "OpenSearchService", "FitsService", "MocService" ], function($, OpenSearchService, FitsService, MocService) {

// Create service bar div
var serviceBar = '<div id="serviceBar" class="ui-widget-content">\
						<div id="layerInfo"></div>\
						<div id="layerServices">\
						    <ul>\
						    </ul>\
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
	"Mix" : [OpenSearchService],
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
	},

	/**
	 *	Add layer services to the bar
	 */
	addLayer: function(layer){
		
		var layerServices = serviceMapping[layer.type]
		if ( layerServices )
		{
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
				services = _.intersection(services, layerServices);
			}

			addServicesHTML();

			if ( layers.length == 0 )
			{
				// Information about layer + services
				$serviceBar.find('#layerInfo').html('<b>'+layer.name+'</b>').fadeIn();
				tabs.tabs( "select", 0 );
			}
			else
			{
				// Common services visible
				if( layers.length == 1 )
				$serviceBar.find('#layerInfo').fadeOut(function(){
					$(this).html('<b>Common services</b>').fadeIn();
				});
			}
			layers.push(layer);
			this.show();
		}

	},

	/**
	 *	Remove layer services from the bar
	 */
	removeLayer: function(layer){

		if( layer instanceof MixLayer || layer instanceof GlobWeb.OpenSearchLayer )
		{
			removeServicesHTML();

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
				// Compute services
				if( layers.length == 1 )
				{
					// Only one layer remains
					$serviceBar.find('#layerInfo').fadeOut(function(){
						$(this).html('<b>'+layers[0].name+'</b>').fadeIn();
					});

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
						services = _.intersection(services, layerServices);
					}
				}
				
				addServicesHTML();
			}
			else
			{
				this.hide();
			}
		}
	},

	/**
	 *	Show service bar
	 */
	show: function(){
		$serviceBar.slideDown();
	},

	/**
	 *	Hide service bar
	 */
	hide: function()
	{
		$serviceBar.slideUp();	
	}

};

});
