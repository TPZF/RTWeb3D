/**
 * OpenSearch service
 */
define( [ "jquery.ui", "underscore-min", "text!../templates/openSearchForm.html" ], function($,_,openSearchFormHTMLTemplate) {

// Template generating the form of properties
var openSearchFormTemplate = _.template(openSearchFormHTMLTemplate);
var layers = [];
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

// TODO remove body dependence
$('body').on("submit", "#openSearchForm", function(event){
	event.preventDefault();

	var service = $('#layerServices ul li.ui-state-active');

	// Get array of changed inputs
	var notEmptyInputs = $('#openSearchForm :input[value!=""]').serializeArray();
	// Create new properties
	var properties = {}
	for(var i=0; i<notEmptyInputs.length; i++)
	{
		properties[notEmptyInputs[i].name.toString()] = notEmptyInputs[i].value.toString();
	}

	// Modify the request properties of choosen layer
	for ( var i=0; i<layers.length; i++ )
	{
		layers[i].setRequestProperties(properties);
	}
	// var service = $('#layerServices ul li.ui-state-active');

	// 	// find index of activated service
	// 	var index = service.index();
	// tabs.tabs('select',index);
});

return {
	/**
	 *	Add layer to the service
	 */
	addLayer: function(layer)
	{
		layers.push(layer);
	},

	removeLayer: function(layer)
	{
		for(var i=0; i<layers.length; i++)
		{
			if(layers[i].id == layer.id)
			{
				layers.splice(i,1);
			}
		}
	},

	addService: function(tabs)
	{
		// TODO modify & attach form to FitsService
		tabs.find( ".ui-tabs-nav" ).append('<li><a href="#OpenSearchService">OpenSearchService</a></li>');
		tabs.append('<div id="OpenSearchService">'+openSearchForm+'</div>');
		tabs.tabs("refresh");
	},

	removeService: function(tabs)
	{
		var index = tabs.find( '.ui-tabs-nav li[aria-controls="OpenSearchService"]').index();
		tabs.tabs("remove",index);
	}
}

});