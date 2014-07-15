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
 * Moc display & Moc xMatch services
 */
define( [ "jquery", "./MocLayer", "./MocBase", "underscore-min", "text!../templates/mocServiceItem.html" ],
		function($, MocLayer, MocBase, _, mocServiceHTMLTemplate) {

// Template generating the services html
var mocServiceTemplate = _.template(mocServiceHTMLTemplate);

var coverageServiceUrl;
var globe = null;
var layers = [];

/**************************************************************************************************************/

/**
 *	Event for display button
 */
function displayClickEvent()
{
	var layer = $(this).parent().data("layer");

	var serviceLayer;
	if ( !(layer instanceof MocLayer) )
		serviceLayer = MocBase.findMocSublayer(layer);
	else
		serviceLayer = layer; 

	// Change visibility
	if ( serviceLayer )
	{
		if ( this.checked )
		{
			serviceLayer.visible(true)
		}
		else
		{
			serviceLayer.visible(false);
		}
	}
}

/**************************************************************************************************************/

/**
 *	Add HTML of moc layer
 */
function addHTMLMocLayer(layer)
{
	var content = mocServiceTemplate( { layer: layer, display: true });
	var serviceLayer = MocBase.findMocSublayer(layer);
	$(content)
		.appendTo('#MocService .mocLayers')
		.data("layer", layer)
		.find('input[type="checkbox"]')
				.attr("checked", (serviceLayer && serviceLayer.visible()) ? true : false)
				.attr("disabled", (serviceLayer) ? false : true)
				.button()
				.click(displayClickEvent);
}

/**************************************************************************************************************/

return {

	init: function(gl, configuration)
	{
		globe = gl;
		if ( configuration.coverageService )
		{
			coverageServiceUrl = configuration.coverageService.baseUrl;
		}
	},

	/**************************************************************************************************************/

	/**
	 *	Add layer to the service
	 */
	addLayer: function(layer)
	{
		layers.push(layer);

		if ( !layer.subLayers )
		{
			layer.subLayers = [];
		}

		var serviceLayer = MocBase.findMocSublayer(layer);

		// Create if doesn't exist
		if ( !serviceLayer )
		{
			MocBase.createMocSublayer( layer, function(layer){
				$("#MocService #mocLayer_"+layer.id).find('input[type="checkbox"]').removeAttr("disabled").button("refresh");
				$("#MocService #mocLayer_"+layer.id).find('.mocCoverage').html("Sky coverage: "+layer.coverage);

			}, function(layer){
				$("#MocService #mocLayer_"+layer.id).find('.mocCoverage').html("Sky coverage: Not available").end()
										.find('.mocStatus').html('(Not found)');
			} );
		}

		addHTMLMocLayer( layer );
	},

	/**************************************************************************************************************/

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

		$( "#MocService #mocLayer_"+layer.id ).remove();
	},

	/**************************************************************************************************************/

	/**
	 *	Add service to jQueryUI tabs
	 *
	 *	@param tabs jQueryUI tabs selector
	 */
	addService: function(tabs)
	{
		// Append headers
		$('<li style="display: none;"><a href="#MocService">Moc</a></li>')
			.appendTo( tabs.children( ".ui-tabs-nav" ) )
			.fadeIn(300);		

		// Append content
		tabs.append('<div id="MocService">\
						<div class="mocLayers"></div>\
					</div>');

		for ( var i=0; i<layers.length; i++ )
		{
			var layer = layers[i];
			addHTMLMocLayer( layer );
		}
	},

	/**************************************************************************************************************/

	/**
	 *	Remove service from jQueryUI tabs
	 *
	 *	@param tabs jQueryUI tabs selector
	 */
	removeService: function(tabs)
	{
		// Remove MocService tab(content&header)
		$('li[aria-controls="MocService"]').remove();
		$( "#MocService" ).remove();
		tabs.tabs( "refresh" );
	}
}

});
