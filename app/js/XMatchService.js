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
 *	Moc xMatch service
 */
define( [ "jquery.ui", "gw/FeatureStyle", "MocLayer", "MocBase", "gw/OpenSearchLayer", "ErrorDialog", "underscore-min", "text!../templates/mocServiceItem.html" ],
		function($, FeatureStyle, MocLayer, MocBase, OpenSearchLayer, ErrorDialog, _, mocServiceHTMLTemplate) {

// Template generating the services html
var mocServiceTemplate = _.template(mocServiceHTMLTemplate);

var coverageServiceUrl;
var intersectionLayer;
var globe;
var layerManager;

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
 *	Add HTML of xMatch layer
 */
function addHTMLXMatchLayer(layer)
{
	var content = mocServiceTemplate( { layer: layer, display: false } );
	$(content)
		.appendTo('#xMatchService .mocLayers')
		.data("layer",layer)
		.find('input[type="checkbox"]')
			.attr("disabled", (layer.coverage && layer.coverage != "Not available") ? false : true)
			.button({
				text:false,
				icons: {
					primary: "ui-icon-empty"
				}
			})
			.click(function(){
				$(this).button("option", {
					icons: {
	            		primary: $(this).is(':checked') ? "ui-icon-check" : "ui-icon-empty"
	            	}
	            });
			});
}

/**************************************************************************************************************/

/**
 *	Add HTML of intersection layer
 */
function addHTMLIntersectionLayer()
{
	// Add HTML
	var form = mocServiceTemplate( { layer: intersectionLayer, display: true });
	$(form)
		.appendTo('#intersectResult')
		.data("layer", intersectionLayer)
		.find(".display")
			.button()
			.click(displayClickEvent);
	$('#intersectResult').slideDown();
	$('#intersectMocBtn').removeAttr("disabled").button("refresh");
}

/**************************************************************************************************************/

/**
 *	Create & add intersection layer
 *
 *	@param layersToIntersect Layers to intersect
 */
function addIntersectionLayer(layersToIntersect)
{
	if ( coverageServiceUrl )
	{
		// Construct url & layerNames
		var url = coverageServiceUrl;
		var layerNames = "";
		for ( var i=0; i<layersToIntersect.length; i++ )
		{
			var layer = layersToIntersect[i];

			layerNames += layer.name;
			url += layer.describeUrl;
			if ( i != layersToIntersect.length-1 )
			{
				url += ';'
				layerNames += ' x ';
			}
		}

		if ( intersectionLayer )
			globe.removeLayer(intersectionLayer);

		// Create intersection MOC layer
		intersectionLayer = new MocLayer({
				name: "Intersection( "+layerNames+" )",
				serviceUrl: url + "&media=json",
				style: new FeatureStyle({
					rendererHint: "Basic",
					fill: true,
					fillColor: [1.,0.,0.,0.3]
				}),
				visible: false
			});
		globe.addLayer(intersectionLayer);

		MocBase.requestSkyCoverage( intersectionLayer, url + "&media=txt", function(layer){
			$("#xMatchService #mocLayer_"+layer.id).find('.mocCoverage').html("Sky coverage: "+layer.coverage);
		} );
		addHTMLIntersectionLayer();
	}
	else
	{
		ErrorDialog.open("Coverage service URL isn't defined in configuration file");
	}
}

/**************************************************************************************************************/

return {
	init: function(gl,lm,configuration)
	{
		globe = gl;
		layerManager = lm;
		if ( configuration.coverageService )
		{
			coverageServiceUrl = configuration.coverageService.baseUrl;
		}
	},

	/**************************************************************************************************************/

	/**
	 *	Add service to jQueryUI tabs
	 *
	 *	@param tabs jQueryUI tabs selector
	 */
	addService: function(tabs)
	{
		$('<li style="display: none;"><a href="#xMatchService">xMatch</a></li>')
			.appendTo( tabs.children( ".ui-tabs-nav" ) )
			.fadeIn(300);

		tabs.append('<div id="xMatchService">\
				<div class="mocLayers"></div>\
					<button id="intersectMocBtn">Intersect</button>\
				<div id="intersectResult"></div>\
			</div>');

		var allLayers = layerManager.getLayers();
		var allOSLayers = _.filter(allLayers, function(layer){ return (layer instanceof OpenSearchLayer) });

		for ( var i=0; i<allOSLayers.length; i++ )
		{
			var layer = allOSLayers[i];
			var serviceLayer = MocBase.findMocSublayer(layer);
			// Create if doesn't exist
			if ( !serviceLayer )
			{
				MocBase.getSkyCoverage( layer, function(layer){
					$("#xMatchService #mocLayer_"+layer.id).find('.mocCoverage').html("Sky coverage: "+layer.coverage);
					$("#xMatchService #mocLayer_"+layer.id).find('input[type="checkbox"]').removeAttr("disabled").button("refresh");
				}, function(layer){
					$("#xMatchService #mocLayer_"+layer.id).find('.mocCoverage').html("Sky coverage: Not available").end()
										.find('.mocStatus').html('(Not found)');
				});
			}

			addHTMLXMatchLayer( layer );
		}

		$( '#intersectMocBtn' )
			.button()
			.click(function(){
				$(this).attr("disabled","disabled").button("refresh");
				$('#intersectResult').clearQueue().stop().slideUp(function(){
					var checkedInputs = $(this).parent().find('.mocLayers .mocLayer input:checked');
					if ( checkedInputs.length < 2 )
					{
						$('#intersectResult').html('Check at least two layers')
								.slideDown().delay(700).slideUp(function(){
									$('#intersectMocBtn').removeAttr("disabled").button("refresh");
								});
					}
					else
					{
						$('#intersectResult').html('');
						var checkedLayers = [];
						checkedInputs.each(function(i){
							checkedLayers.push( $.data(checkedInputs[i].parentElement, "layer") );
						});

						addIntersectionLayer(checkedLayers);
					}
				});
			});
	},

	/**************************************************************************************************************/

	/**
	 *	Remove service from jQueryUI tabs
	 *
	 *	@param tabs jQueryUI tabs selector
	 */
	removeService: function(tabs)
	{
		tabs.find( '.ui-tabs-nav li[aria-controls="xMatchService"]').css("opacity", 0.);
		var index = $(this).index();
		tabs.tabs("remove",index);

		var allLayers = layerManager.getLayers();
		var allOSLayers = _.filter(allLayers, function(layer){ return (layer instanceof OpenSearchLayer) });

		for ( var i=0; i<allOSLayers.length; i++ )
		{
			var layer = allOSLayers[i];
			$( "#xMatchService #mocLayer_"+layer.id ).remove();
		}

		if ( intersectionLayer )
		{
			intersectionLayer.globe.removeLayer( intersectionLayer );
			intersectionLayer = null;
		}
	}

	/**************************************************************************************************************/
}
});
