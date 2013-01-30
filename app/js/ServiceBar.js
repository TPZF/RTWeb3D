
/**
 * Service bar module
 * (currently specified for OpenSearchLayer & Mix only)
 *
 */
define( [ "jquery.ui", "OpenSearchService", "FitsService", "MocService" ], function($, OpenSearchService, FitsService, MocService) {

// Create selected feature div
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


function removeAllHTML()
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
			removeAllHTML();

			// Compute available services
			if ( services.length == 0 )
			{
				services = layerServices;
			}
			else
			{
				// Intersection of services
				services = _.intersection(services, layerServices);
			}

			// Add services to the tab
			for ( var i=0; i<services.length; i++ )
			{
				services[i].addLayer(layer);
				services[i].addService(tabs);
			}

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
			removeAllHTML();

			// Remove layer
			for(var i=0; i<layers.length; i++)
			{
				if(layers[i].id == layer.id)
				{
					layers.splice(i,1);
				}
			}

			// Remove layer from services
			for ( var i=0; i<services.length; i++ )
			{
				services[i].removeLayer(layer);
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
				
				for ( var i=0; i<services.length; i++ )
				{
					services[i].addService(tabs);
				}
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
