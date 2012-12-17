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
			JsonProcessor.handleFeatureCollection( gwLayer, response.features );
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