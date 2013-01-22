
/**
 * Service bar module
 * (currently specified for OpenSearchLayer & Mix only)
 *
 */
define( [ "jquery.ui", "OpenSearchService", "FitsService" ], function($, OpenSearchService, FitsService) {

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

/**
 *	Intersection of two arrays using associative array
 */
function getIntersect(arr1, arr2) {
    var result = [], o = {}, length = arr2.length, i, val;
    for (i = 0; i < length; i++) {
        o[arr2[i]] = true;
    }
    length = arr1.length;
    for (i = 0; i < length; i++) {
        value = arr1[i];
        if (value in o) {
            result.push(value);
        }
    }
    return result;
}

/**
 *	Intersection of two arrays using associative array
 */
function intersectServices(arr) {
	var result = {};
    length = arr.length;
    for (i = 0; i < length; i++) {
        value = arr[i];
        if (value in services) {
            result[value] = services[value];
        }
    }
    services = result;
}

// TODO make generic :
// mapping between type of a layer and supported services
var serviceMapping =
{
	"Mix" : [OpenSearchService],
	"DynamicOpenSearch": [FitsService]
};

/**
 *	Check if object is empty
 */
function isEmpty(o){
	for(var i in o)
	{
		return false;
	}
	return true;
}

function getLayersLength()
{
	Object.keys(layers).length
}

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

	/**
	 *	Add layer services to the bar
	 */
	addLayer: function(layer){
		
		var layerServices = serviceMapping[layer.type]
		if ( layerServices )
		{
			if ( services.length == 0 )
			{
				// add all services of layer
				for ( var i=0; i<layerServices.length; i++)
				{
					var service = layerServices[i];
					// service.addLayer(layer);
					services.push(service);
				}
			}
			else
			{
				// intersection of services
				_.intersection(services, layerServices);
				// intersectServices(layerServices);
			}

			removeAllHTML();

			for ( var i=0; i<services.length; i++ )
			{
				services[i].addService(tabs);
				services[i].addLayer(layer);
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
			if ( layers.length == 1 )
			{
				this.hide();
			}

			for(var i=0; i<layers.length; i++)
			{
				if(layers[i].id == layer.id)
				{
					layers.splice(i,1);
					// tabs.tabs("remove",i);
				}
			}

			removeAllHTML();

			var length = services.length;
			for ( var i=0; i<length; i++ )
			{
				services[i].removeLayer(layer);
				services.splice(i,1);
			}


			if( layers.length == 1 )
			{
				$serviceBar.find('#layerInfo').fadeOut(function(){
					$(this).html('<b>'+layers[0].name+'</b>').fadeIn();
				});

				var layerServices = serviceMapping[layers[0].type];
				// add all services of layer
				for ( var i=0; i<layerServices.length; i++)
				{
					var service = layerServices[i];
					// service.addLayer(layer);
					services.push(service);
				}
			}
			else
			{
				// Intersection of services between layers
				for ( var i=0; i<layers.length; i++ )
				{

					var layerServices = serviceMapping[layers[i].type];
					intersectServices(layerServices);
				}
			}
			
			for ( var i=0; i<services.length; i++ )
			{
				services[i].addService(tabs);
				services[i].addLayer(layer);
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
