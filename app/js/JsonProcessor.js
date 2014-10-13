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
define(["gw/HEALPixLayer"], function(HEALPixLayer) {

var gid = 0;

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
				service.layer = new HEALPixLayer({ format: service.format, baseUrl: service.url, name: service.name, visible: false, coordinates: feature.geometry.coordinates[0] });
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
	 *	Handle feature services
	 *	Add gid
	 *
	 *	@param gwLayer Layer of feature
	 *	@param featureCollection GeoJSON FeatureCollection
	 *
	 */
	handleFeatureCollection: function( gwLayer, featureCollection )
	{
		var features = featureCollection['features'];

		for ( var i=0; i<features.length; i++ )
		{
			var currentFeature = features[i];
			
			var coordSystem = "EQ"; // default coordinate system of json data
			// Apply crs if defined
			if ( currentFeature.properties.crs )
			{
				var crsName = currentFeature.properties.crs.properties.name;
				coordSystem = crsName.substr(0, crsName.indexOf('.'));
				if ( coordSystem.length > 3 )
				{
					switch( coordSystem.toLowerCase() ) {
						case "equatorial":
							coordSystem = "EQ";
							break;
						case "galactic":
							coordSystem = "GAL";
							break;
						default:
							console.log("Not implemented");
							break;
					}
				}
			}
			switch ( currentFeature.geometry.type )
			{
				case "Point":
					if ( !gwLayer.dataType )
						gwLayer.dataType = "point";
					else if ( gwLayer.dataType != 'point' )
						gwLayer.dataType = "none";

					// Convert to EQUATORIAL coordinate system if needed
					if ( 'EQ' != coordSystem )
					{
						currentFeature.geometry.coordinates = gwLayer.globe.coordinateSystem.convert(currentFeature.geometry.coordinates, coordSystem, 'EQ');
					}

					// Convert to geographic representation
					if ( currentFeature.geometry.coordinates[0] > 180 )
						currentFeature.geometry.coordinates[0] -= 360;
					break;
				case "Polygon":
				case "MultiPolygon":

					if ( !gwLayer.dataType )
						gwLayer.dataType = "line";
					else if ( gwLayer.dataType != 'line' )
						gwLayer.dataType = "none";

					var rings = [];
					var geometry = currentFeature.geometry;
					if ( geometry['type'] == 'MultiPolygon' )
					{
						for ( var j=0; j<geometry['coordinates'].length; j++ )
						{
							rings.push( geometry['coordinates'][j][0] );
						}
					}
					else
					{
						rings.push( geometry['coordinates'][0] );
					}

					for ( var r=0; r<rings.length; r++ )
					{
						var coords = rings[r];
						var numPoints = coords.length;
						for ( var j=0; j<numPoints; j++ )
						{
							// Convert to default coordinate system if needed
							if ( 'EQ' != coordSystem )
							{
								coords[j] = gwLayer.globe.coordinateSystem.convert(coords[j], coordSystem, 'EQ');
							}

							// Convert to geographic representation
							if ( coords[j][0] > 180 )
								coords[j][0] -= 360;
						}
					}
					
					if ( currentFeature.properties._imageCoordinates )
					{
						// Set _imageCoordinates as geometry's property (may be modified later)
						for ( var r=0; r<currentFeature.properties._imageCoordinates[0].length; r++ )
						{
							// Convert to geographic representation
							if ( currentFeature.properties._imageCoordinates[0][r][0] > 180 )
								currentFeature.properties._imageCoordinates[0][r][0] -= 360;
							
						}
						currentFeature.geometry._imageCoordinates = currentFeature.properties._imageCoordinates;
					}

					break;
				default:
					break;
			}
			currentFeature.geometry.gid = "jsonProc_"+gid;
			gid++;

			if ( currentFeature.services )
			{
				handleServices(gwLayer, currentFeature);
			}

		}
	}
};

});