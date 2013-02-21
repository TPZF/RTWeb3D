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
 * 	OpenSearch provider module
 *
 *	Module providing JSON file in GeoJSON format from OpenSearch response
 */
define( [ "jquery.ui", "LayerManager", "JsonProcessor"], function($, LayerManager, JsonProcessor ) {

/**
 * 	Load JSON file, transform it in GeoJSON format and add to the layer
 *
 *	@param gwLayer GlobWeb layer
 *	@param url Url to JSON containing feature collection in equatorial coordinates
 */
function handleJSONFeatureFromOpenSearch( gwLayer, configuration, startIndex )
{
	$.ajax({
		type: "GET",
		url: configuration.url + "startIndex=" + startIndex + "&count=500",
		success: function(response){
			JsonProcessor.handleFeatureCollection( gwLayer, response );
			gwLayer.addFeatureCollection( response );
			if ( startIndex + response.features.length < response.totalResults ) {
				handleJSONFeatureFromOpenSearch( gwLayer, configuration.url, startIndex + response.features.length );
			}
		},
		error: function (xhr, ajaxOptions, thrownError) {
			console.error( xhr.responseText );
		}
	});
}

/***************************************************************************************************/

// Register the data provider
LayerManager.registerDataProvider("OpenSearch", function(gwLayer, configuration) {
	handleJSONFeatureFromOpenSearch( gwLayer, configuration, 1 );
});

});