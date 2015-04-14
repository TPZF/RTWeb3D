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
/*global clearInterval: false, clearTimeout: false, document: false, event: false, frames: false, history: false, Image: false, location: false, name: false, navigator: false, Option: false, parent: false, screen: false, setInterval: false, setTimeout: false, window: false, XMLHttpRequest: false, define: false */

/**
 *	Moc base module
 */
define( [ "jquery", "gw/FeatureStyle", "./MocLayer", "./Utils" ],
		function($, FeatureStyle, MocLayer, Utils) {

var mizar;
var coverageServiceUrl;

/**************************************************************************************************************/

/**
 *	Request moc description for the given layer
 */
function requestMocDesc(layer, successCallback, errorCallback)
{
	// Get moc template
	$.ajax({
		type: "GET",
		url: layer.serviceUrl,
		dataType: "xml",
		success: function(xml) {
			var mocdesc = $(xml).find('Url[rel="mocdesc"]');
			var describeUrl = $(mocdesc).attr("template");
			if ( describeUrl )
			{
				// Cut request parameters if exists
				var splitIndex = describeUrl.indexOf( "?q=" );
				if ( splitIndex != -1 )
				{
					describeUrl = describeUrl.substring( 0, splitIndex );
				}
				layer.describeUrl = describeUrl;
				successCallback(layer);

			}
			else
			{
				layer.describeUrl = "Not available";
				layer.coverage = "Not available";
				if( errorCallback )
					errorCallback(layer);
			}
		},
		error: function(xhr){
			layer.describeUrl = "Not available";
			layer.coverage = "Not available";
			if( errorCallback )
				errorCallback(layer);
		}
	});

}

/**************************************************************************************************************/

/**
 *	Get moc sky coverage information
 */
function getSkyCoverage(layer, successCallback, errorCallback)
{
	if ( layer.coverage != "Not available" )
	{
		var media = "?media=txt";
		if ( !layer.describeUrl )
		{
			requestMocDesc( layer, function(layer){
				if ( layer.describeUrl.lastIndexOf("?") > 0 )
					media = "&media=txt";
				requestSkyCoverage( layer, layer.describeUrl+media, successCallback );
			}, errorCallback );
		}
		else
		{
			if ( layer.describeUrl.lastIndexOf("?") > 0 )
					media = "&media=txt";
			requestSkyCoverage( layer, layer.describeUrl+media, successCallback );
		}
	}
	else
	{
		errorCallback(layer);
	}
}

/**************************************************************************************************************/

/**
 *	Create moc sublayer
 *
 *	@param layer Parent layer
 */
function createMocSublayer(layer, successCallback, errorCallback)
{
	if ( layer.describeUrl != "Not available" )
	{
		if ( !layer.describeUrl )
		{
			requestMocDesc( layer, function(layer){
				handleMocLayer( layer, layer.describeUrl );
				requestSkyCoverage( layer, layer.describeUrl+"?media=txt", successCallback );
			}, errorCallback );
		}
		else
		{
			handleMocLayer( layer, layer.describeUrl );
			requestSkyCoverage( layer, layer.describeUrl+"?media=txt", successCallback );
		}
	}
	else
	{
		errorCallback(layer);
	}
}

/**************************************************************************************************************/

/**
 *	Requesting moc sky coverage information and stock it as layer parameter
 */
function requestSkyCoverage( layer, mocServiceUrl, successCallback )
{
	if ( !layer.coverage )
	{
		// Request MOC space coverage
		$.ajax({
			type: "GET",
			url: mocServiceUrl,
			success: function(response){
				layer.coverage = Utils.roundNumber(parseFloat(response),5)+"%";
				if ( successCallback )
					successCallback(layer);
			}
		});	
	}
	else
	{
		successCallback(layer);
	}
}

/**************************************************************************************************************/

/**
 *	Handle moc layer as a sublayer
 *
 *	@param layer Parent layer
 *	@param mocServiceUrl Url to moc service
 */
function handleMocLayer(layer, mocServiceUrl)
{
	var style = layer.style;
	var serviceLayer = new MocLayer({
		serviceUrl: mocServiceUrl,
		style: layer.style,
		visible: false
	});

	serviceLayer.style.fill = true;
	serviceLayer.style.fillColor[3] = 0.3;
	// TODO: think about attachement of moc layer
	// if ( layer.globe && layer.visible() )
	// {
		// Add sublayer to engine
		layer.globe.addLayer( serviceLayer );
	// }

	if ( !layer.subLayers )
		layer.subLayers = [];

	layer.subLayers.push(serviceLayer);
}

/**************************************************************************************************************/

/**
 *	Search moc sublayer
 *	@return	Moc layer if found, null otherwise
 */
function findMocSublayer(layer)
{
	if ( layer.subLayers )
	{
		for ( var j=0; j<layer.subLayers.length; j++ )
		{
			if ( layer.subLayers[j] instanceof MocLayer )
			{
				return layer.subLayers[j];
			}
		}
	}
	return null;
}

/**************************************************************************************************************/

/**
 *	Intersect layers
 */
function intersectLayers( layersToIntersect )
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
	mizar.sky.addLayer(intersectionLayer);

	intersectionLayer.describeUrl = url;

	return intersectionLayer;
}

/**************************************************************************************************************/

return {
	init: function(m, options) {
		mizar = m;
		coverageServiceUrl = options.coverageService.baseUrl;
	},
	createMocSublayer: createMocSublayer,
	findMocSublayer: findMocSublayer,
	getSkyCoverage: getSkyCoverage,
	requestSkyCoverage: requestSkyCoverage,
	intersectLayers: intersectLayers
}

});
