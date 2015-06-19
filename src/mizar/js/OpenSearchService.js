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
/*global define: false */

/**
 * OpenSearch service
 */
define( [ "jquery", "underscore-min", "text!../templates/openSearchService.html", "text!../templates/openSearchForm.html", "jquery.ui", "jquery.ui.timepicker" ], function($,_,openSearchServiceHTMLTemplate, openSearchFormHTMLTemplate) {

// Template generating the open search service div
var openSearchServiceTemplate = _.template(openSearchServiceHTMLTemplate);
// Template generating the form of properties
var openSearchFormTemplate = _.template(openSearchFormHTMLTemplate);
var layers = [];

/**
 *	Handle submit event
 */
function handleSubmit(event)
{
	event.preventDefault();

	var layer = $(this).data("layer");
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
	layer.setRequestProperties(properties);
}

/**
 *	Add OpenSearch form and handle jQuery stuff(events & widgets)
 */
function handleForm(layer)
{
	$('#osForm_'+layer.id)
	.html(layer.openSearchForm ? layer.openSearchForm : "Loading...")
	.find('.openSearchForm')
		.data("layer", layer)
		.submit(handleSubmit).end()
	.find(".datepicker").datetimepicker({
		showSecond: true,
		separator: 'T',
		timeSuffix: 'Z',
		timeFormat: 'HH:mm:ss'
	});
	$('#openSearchTabs').tabs("refresh");
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
					handleForm(layer);
				},
				error: function()
				{
					layer.openSearchForm = "OpenSearch parameter isn't available";
					$('#osForm_'+layer.id)
						.html(layer.openSearchForm);
				}
			});
		},
		error: function(thrownError)
		{
			$('#osForm_'+layer.id)
				.html("("+thrownError.status+") "+thrownError.statusText+"<br/>For more details, contact administrator.");
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

		$('#openSearchTabs').children( ".ui-tabs-nav" ).append('<li><a href="#osForm_'+layer.id+'">'+layer.name+'</a></li>');
		$('#openSearchTabs').append('<div id="osForm_'+layer.id+'">'+layer.openSearchForm+'</div>');
		handleForm(layer);
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

		var index = $('#openSearchTabs').find( '.ui-tabs-nav li[aria-controls="osForm_'+layer.id+'"]').index();
		$('#openSearchTabs').tabs("remove",index);
		$('#openSearchTabs').tabs("refresh");
	},

	/**
	 *	Add service to jQueryUI tabs
	 *
	 *	@param tabs jQueryUI tabs selector
	 */
	addService: function(tabs)
	{
		// Append header
		$('<li style="display: none;"><a href="#OpenSearchService">OpenSearch</a></li>')
			.appendTo( tabs.children( ".ui-tabs-nav" ) )
			.fadeIn(300);
		// Append content
		tabs.append('<div id="OpenSearchService"></div>');

		var openSearchService = openSearchServiceTemplate({ layers: layers });

		$(openSearchService)
			.appendTo('#OpenSearchService')
			.tabs({
				collapsible: true,
				hide: { effect: "fadeOut", duration: 300 },
				show: { effect: "fadeIn", duration: 300 }
			})
			.find('.openSearchForm')
				.submit(handleSubmit).end()
			.find('.datepicker').datetimepicker({
				showSecond: true,
				separator: 'T',
				timeSuffix: 'Z',
				timeFormat: 'HH:mm:ss'
			});

	},

	/**
	 *	Remove service from jQueryUI tabs
	 *
	 *	@param tabs jQueryUI tabs selector
	 */
	removeService: function(tabs)
	{
		var index = $(this).index();
		tabs.tabs("remove",index);
	}
}

});
