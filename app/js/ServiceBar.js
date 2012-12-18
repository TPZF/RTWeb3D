
/**
 * Service bar module
 * (currently specified for OpenSearchLayer only)
 *
 */
define( [ "jquery.ui", "underscore-min", "text!../templates/openSearchForm.html" ], function($,_,openSearchFormHTMLTemplate) {

// Template generating the form of properties
var openSearchFormTemplate = _.template(openSearchFormHTMLTemplate);

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

// TODO make parameter
var openSearchFormUrl = '/sitools/ofuse/opensearch.xml';
var openSearchForm = '';

$.ajax({
	type: "GET",
	url: openSearchFormUrl,
	dataType: "xml",
	success: function(xml) {

		var mspdesc = $(xml).find('Url[rel="mspdesc"]');
		var describeUrl = $(mspdesc).attr("template");

		$.ajax({
			type: "GET",
			url: describeUrl,
			dataType: "json",
			success: function(json)
			{
				var formProperties = json.filters;
				openSearchForm = openSearchFormTemplate( { properties: formProperties });
			}
		});
	}
}); 


// TODO make generic :
// mapping between type of a layer and supported services
var serviceMapping =
{
	"DynamicOSLayer": ["OpenSearchService"]
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

$('#layerServices').on("submit", "#openSearchForm", function(event){
	event.preventDefault();

	var service = $('#layerServices ul li.ui-state-active');

	// find index of activated service
	var index = service.index();

	var layer = layers[index];
	// Get array of changed inputs
	var notEmptyInputs = $('#openSearchForm :input[value!=""]').serializeArray();
	// Create new properties
	var properties = {}
	for(var i=0; i<notEmptyInputs.length; i++)
	{
		properties[notEmptyInputs[i].name.toString()] = notEmptyInputs[i].value.toString();
	}

	// Modify the request properties of choosen layer
	layer.setRequestProperties(properties);

	tabs.tabs('select',index);

});

var layers = [];
var services = {};

/**
 *	Add OpenSearchService to the bar
 */
function addOpenSearchService()
{
	tabs.find( ".ui-tabs-nav" ).append('<li><a href="#openSearchService">OpenSearch</a></li>');
	tabs.append('<div id="openSearchService">'+openSearchForm+'</div>');
	tabs.tabs("refresh");
}

function removeService(id)
{
	// NEVER TESTED...
	var index = tabs.find( '.ui-tabs-nav li[aria-controls="'+id+'"]').index();
	tabs.tabs("remove",index);
}

function removeOpenSearchService()
{
	// NEVER TESTED...
	var index = tabs.find( '.ui-tabs-nav li[aria-controls="openSearchService"]').index();
	tabs.tabs("remove",index);
}

return {

	/**
	 *	Add layer services to the bar
	 */
	addLayer: function(layer){
		
		// TODO make generic
		// if ( isEmpty(services) )
		// {
		// 	// add all services of layer
		// }
		// else
		// {
		// 	// intersection of services
		// }


		if ( layer instanceof MixLayer )
		{
			addOpenSearchService();

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

		if( layer instanceof MixLayer )
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
					tabs.tabs("remove",i);
				}
			}

			if( layers.length == 1 )
			{
				$serviceBar.find('#layerInfo').fadeOut(function(){
					$(this).html('<b>'+layers[0].name+'</b>').fadeIn();
				});
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
