/**
 * 	JSON provider module
 *
 *	Module providing JSON file in GeoJSON format from equatorial
 *
 */
define( [ "jquery.ui", "LayerManager", "JsonProcessor" ], function($, LayerManager, JsonProcessor) {

/**
 * 	Load JSON file, transform it in GeoJSON format and add to the layer
 *
 *	@param gwLayer GlobWeb layer
 *	@param url Url to JSON containing feature collection in equatorial coordinates
 *
 */
function handleJSONFeature( gwLayer, configuration )
{
	$.ajax({
		type: "GET",
		url: configuration.url,
		success: function(response){
			JsonProcessor.handleFeatureCollection( gwLayer, response );
			gwLayer.addFeatureCollection( response );
		},
		error: function (xhr, ajaxOptions, thrownError) {
			console.error( xhr.responseText );
		}
	});
}

/***************************************************************************************************/

// Register the data provider
LayerManager.registerDataProvider("JSON", handleJSONFeature);

});