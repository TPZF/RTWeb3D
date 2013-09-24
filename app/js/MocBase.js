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
 *	Moc base module
 */
define( [ "jquery.ui", "MocLayer", "Utils" ],
		function($, MocLayer, Utils) {

/**************************************************************************************************************/

/**
 *	Create moc sublayer
 *
 *	@param layer Parent layer
 */
function createMocSublayer(layer, successCallback, errorCallback)
{
	// Get moc template
	if ( layer.coverage != "Not available" )
	{
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
					handleMocLayer( layer, describeUrl );
					requestSkyCoverage(layer, describeUrl+"?media=txt", successCallback);

				}
				else
				{
					layer.coverage = "Not available";
					if( errorCallback )
						errorCallback(layer);
				}
			},
			error: function(xhr){
				layer.coverage = "Not available";
				if( errorCallback )
					errorCallback(layer);
			}
		});
	}
}

/**************************************************************************************************************/

/**
 *	Requesting moc sky coverage information and stock it as layer parameter
 */
function requestSkyCoverage(layer, mocServiceUrl, successCallback)
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
	if ( layer.globe )
	{
		// Add sublayer to engine
		layer.globe.addLayer( serviceLayer );
	}

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

return {
	createMocSublayer: createMocSublayer,
	findMocSublayer: findMocSublayer,
	requestSkyCoverage: requestSkyCoverage
}

});