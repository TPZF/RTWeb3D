/**
 * OpenSearch service
 */
define( [ "jquery.ui", "underscore-min", "text!../templates/openSearchService.html", "text!../templates/openSearchForm.html" ], function($,_,openSearchServiceHTMLTemplate, openSearchFormHTMLTemplate) {

// Template generating the open search service div
var openSearchServiceTemplate = _.template(openSearchServiceHTMLTemplate);
// Template generating the form of properties
var openSearchFormTemplate = _.template(openSearchFormHTMLTemplate);
var layers = [];

// Ugly formId-layer mapping
// TODO replace by smth more .. attractive
var idMap = {};

/**
 *	Handle submit event
 */
function handleSubmit(event)
{
	event.preventDefault();

	// Get array of changed inputs
	var notEmptyInputs = $(this).find(':input[value!=""]').serializeArray();
	// Create new properties
	var properties = {}
	for(var i=0; i<notEmptyInputs.length; i++)
	{
		properties[notEmptyInputs[i].name.toString()] = notEmptyInputs[i].value.toString();
	}

	var selectOptions;
	$(this).find('select').each(function(i){
		if ( $(this).val() )
			properties[$(this).attr("name")] = $(this).val();
		
	});

	// Modify the request properties of choosen layer
	idMap[$(this).attr("id")].setRequestProperties(properties);
}

/**
 *	Attach open search form to layer
 *
 *	@param layer GlobWeb layer
 */
function attachForm(layer)
{
	$.ajax({
		type: "GET",
		url: layer.serviceUrl,
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
					layer.openSearchForm = openSearchFormTemplate( { layer: layer, properties: formProperties });
					idMap['openSearchForm_'+layer.id] = layer;
					$('#osForm_'+layer.id)
						.html(layer.openSearchForm)
						.find('.openSearchForm')
							.submit(handleSubmit).end()
						.find(".datepicker").datepicker();
					$('#openSearchTabs').tabs("refresh");
				}
			});
		}
	});
}

return {
	/**
	 *	Add layer to the service
	 */
	addLayer: function(layer)
	{
		layers.push(layer);

		if ( !layer.openSearchForm )
			attachForm(layer);
	},

	/**
	 *	Remove layer from the service
	 */
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

	/**
	 *	Add service to jQueryUI tabs
	 *
	 *	@param tabs jQueryUI tabs selector
	 */
	addService: function(tabs)
	{
		tabs.find( ".ui-tabs-nav" ).append('<li><a href="#OpenSearchService">OpenSearch</a></li>');
		tabs.append('<div id="OpenSearchService"></div>');

		var openSearchService = openSearchServiceTemplate({ layers: layers });

		$(openSearchService)
			.appendTo('#OpenSearchService')
			.tabs({
				collapsible: true,
				hide: { effect: "slideUp", duration: 300 },
				show: { effect: "slideDown", duration: 300 }
			})
			.find('.openSearchForm')
				.submit(handleSubmit).end()
			.find('.datepicker').datepicker();

		tabs.tabs("refresh");
	},

	/**
	 *	Remove service from jQueryUI tabs
	 *
	 *	@param tabs jQueryUI tabs selector
	 */
	removeService: function(tabs)
	{
		var index = tabs.find( '.ui-tabs-nav li[aria-controls="OpenSearchService"]').index();
		tabs.tabs("remove",index);
	}
}

});