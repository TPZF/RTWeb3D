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
				service.layer = new GlobWeb.HEALPixLayer({ baseUrl: service.url, name: service.name, visible: false, coordinates: feature.geometry.coordinates[0] });
				gwLayer.subLayers.push(service.layer);
				if ( gwLayer.globe && gwLayer.visible() )
				{
					// Add sublayer to engine
					gwLayer.globe.addLayer( service.layer );
				}
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
					if ( !gwLayer.dataType )
						gwLayer.dataType = "point";
					else if ( gwLayer.dataType != 'point' )
						gwLayer.dataType = "none";


					if ( currentFeature.geometry.coordinates[0] > 180 )
						currentFeature.geometry.coordinates[0] -= 360;
					break;
				case "Polygon":
					if ( !gwLayer.dataType )
						gwLayer.dataType = "line";
					else if ( gwLayer.dataType != 'line' )
						gwLayer.dataType = "none";
					
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