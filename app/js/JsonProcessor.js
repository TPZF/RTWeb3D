/**
 * 	JSON processor module
 *
 *	Module processing feature collection
 *
 */
define([], function() {

/**
 *	Handle services of feature
 */
function handleServices( gwLayer, feature )
{
	for ( var x in feature.services )
	{
		var service = feature.services[x];
		if ( !gwLayer.subLayers )
		{
			gwLayer.subLayers = [];
		}
		switch (service.type)
		{
			case "healpix":
				service.layer = new GlobWeb.HEALPixLayer({ baseUrl: service.url, name: service.name, visible: true, coordinates: feature.geometry.coordinates[0] });
				gwLayer.subLayers.push(service.layer);
				break;
			default:
				break;
		}
	}
}

return {
	/**
	 *	Handles feature collection
	 * 	Recompute geometry from equatorial coordinates to geo for each feature
	 *	Add proxy url to quicklook for each feature
	 *	Handle feature services
	 *
	 *	@param gwLayer Layer of feature
	 *	@param featureCollection GeoJSON FeatureCollection
	 *
	 */
	handleFeatureCollection: function( gwLayer, featureCollection )
	{
		var proxyUrl = "/sitools/proxy?external_url=";

		var features = featureCollection['features'];

		for ( var i=0; i<features.length; i++ )
		{
			var currentFeature = features[i];
			
			switch ( currentFeature.geometry.type )
			{
				case "Point":
					if ( currentFeature.geometry.coordinates[0] > 180 )
						currentFeature.geometry.coordinates[0] -= 360;
					break;
				case "Polygon":
					var ring = currentFeature.geometry.coordinates[0];
					for ( var j = 0; j < ring.length; j++ )
					{
						if ( ring[j][0] > 180 )
							ring[j][0] -= 360;
					}

					// Add proxy url to quicklook url if not local
					if ( currentFeature.properties.quicklook && currentFeature.properties.quicklook.substring(0,4) == 'http' )
						currentFeature.properties.quicklook = proxyUrl+currentFeature.properties.quicklook;
					break;
				default:
					break;
			}

			if ( currentFeature.services )
			{
				handleServices(gwLayer, currentFeature);
			}

		}
	}
};

});