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
/*global define: false */
/**
 * Name resolver module : API allowing to search object name and zoom to it
 */
define(["jquery", "underscore-min", "gw/FeatureStyle", "gw/VectorLayer", "gw/HEALPixBase", "text!../data/mars_resolver.json", "jquery.ui"],
	function($, _, FeatureStyle, VectorLayer, HEALPixBase, marsResolverJSON) {

// Name resolver globals
var mizar;
var context;
var dictionary;

// Name resolver properties
var duration;
var zoomFov;

var nameResolverLayer = null; // Layer containing labels from dictionary
var targetLayer; 			  // Layer containing target feature(cross) on zoom
var targetFeature;			  // Zooming destination feature

/**************************************************************************************************************/

/**
 *	Update targetFeature and add it to the target layer
 *
 *	@param lon Destination longitude/right ascension in degrees
 *	@param lat Destination latitude/declination in degrees
 */
function addTarget(lon, lat)
{
	targetFeature = {
		"geometry": {
			"coordinates": [
				lon,
				lat
			],
			"type": "Point"
		},
		"type": "Feature"
	};

	targetLayer.addFeature( targetFeature );
}

/**************************************************************************************************************/

/**
 *	Search for object name
 *	Object name could be:
 *		* Degree in "HMS DMS" or "deg deg"
 *		* Object name as "Mars", "m31", "Mizar"
 *		* For debug : healpix(order, pixelIndex)
 */
function search(objectName, onSuccess, onError, onComplete)
{
	var globe = context.globe;
	// regexp used only to distinct equatorial coordinates and objects
	// TODO more accurate ( "x < 24h", "x < 60mn", etc.. )
	objectName = objectName.replace(/\s{2,}/g, ' '); // Replace multiple spaces by a single one
	var coordinatesExp = new RegExp("\\d{1,2}[h|:]\\d{1,2}[m|:]\\d{1,2}([\\.]\\d+)?s?\\s[-+]?[\\d]+[°|:]\\d{1,2}['|:]\\d{1,2}([\\.]\\d+)?\"?", "g");
	var healpixRE = /^healpix\((\d)+,(\d+)\)/;
	var degRE = /^(\d+(\.\d+)?),?\s(-?\d+(\.\d+)?)/;
	var matchHealpix = healpixRE.exec(objectName);
	var matchDegree = degRE.exec(objectName);
	if ( matchHealpix ) 
	{
		var order = parseInt(matchHealpix[1]);
		var pixelIndex = parseInt(matchHealpix[2]);
		
		// Compute vertices
		var nside = Math.pow(2, order);
		/*jslint bitwise: true */
		var pix=pixelIndex&(nside*nside-1);
		var ix = HEALPixBase.compress_bits(pix);
		/*jslint bitwise: true */
		var iy = HEALPixBase.compress_bits(pix>>>1);
		/*jslint bitwise: true */
		var face = (pixelIndex>>>(2*order));

		var i = 0.5;
		var j = 0.5;
		var vert = HEALPixBase.fxyf( (ix+i)/nside, (iy+j)/nside, face);
		var geoPos = [];
		globe.coordinateSystem.from3DToGeo(vert, geoPos);
		zoomTo(geoPos[0],geoPos[1], onSuccess);
	}
	else if ( objectName.match( coordinatesExp ) )
	{
		// Format to equatorial coordinates
		var word = objectName.split(" "); // [RA, Dec]

		word[0] = word[0].replace(/h|m|:/g," ");
		word[0] = word[0].replace("s", "");
		word[1] = word[1].replace(/°|'|:/g," ");
		word[1] = word[1].replace("\"", "");
		
		// Convert to geo and zoom
		var geoPos = [];
		globe.coordinateSystem.fromEquatorialToGeo([word[0], word[1]], geoPos);

		if ( globe.coordinateSystem.type !== "EQ" )
		{
			geoPos = globe.coordinateSystem.convert(geoPos, globe.coordinateSystem.type, 'EQ');
		}

		zoomTo(geoPos[0], geoPos[1], onSuccess);
	}
	else if ( matchDegree ) {
		var lon = parseFloat(matchDegree[1]);
		var lat = parseFloat(matchDegree[3]);
		var geo = [lon, lat];

		if ( globe.coordinateSystem.type !== "EQ" && mizar.mode === "sky" )
		{
			geo = globe.coordinateSystem.convert(geo, globe.coordinateSystem.type,  'EQ');
		}

		zoomTo(geo[0], geo[1], onSuccess);
	}
	else
	{
		if ( dictionary )
		{
			// Planet resolver(Mars only currently)
			var feature = _.find(dictionary.features, function(f){
				return f.properties.Name.toLowerCase() === objectName.toLowerCase();
			});

			if ( feature )
			{
				var lon = parseFloat(feature.properties.center_lon);
				var lat = parseFloat(feature.properties.center_lat);
				zoomTo(lon, lat, onSuccess, {features: [feature]});
			}
			else
			{
				if( onError ) {	onError();}
			}
		}
		else
		{
			// Service
			// Name of the object which could be potentially found by name resolver
			var url = context.configuration.nameResolver.baseUrl + "/" + objectName + "/EQUATORIAL";

			$.ajax({
				type: "GET",
				url: url,
				success: function(response){
					// Check if response contains features
					if(response.type === "FeatureCollection")
					{
						var firstFeature = response.features[0];
						zoomTo(firstFeature.geometry.coordinates[0], firstFeature.geometry.coordinates[1], onSuccess, response);

					} else {
						onError();
					}
				},
				error: function (xhr) {
					if( onError ) {onError();}
					console.error( xhr.responseText );
				},
				complete: function(xhr)
				{
					if ( onComplete ){onComplete(xhr);}
				}
			});
		}
	}
}

/**************************************************************************************************************/

/**
 *	Zoom to the given longitude/latitude and add target at the end
 *	@param lon Longitude
 *	@param lat Latitude
 *	@param callback Callback once animation is over
 *	@param args Callback arguments
 */
function zoomTo(lon, lat, callback, args)
{
	// Add target feature on animation stop
	var addTargetCallback = function() {
		addTarget(lon,lat);
		if ( callback ) {
			callback.call(this, args);
		}
	};

	if ( mizar.mode === "sky" )
	{
		context.navigation.zoomTo([lon, lat], zoomFov, duration, addTargetCallback);
	}
	else
	{
		context.navigation.zoomTo([lon, lat], zoomFov, duration, null, addTargetCallback);
	}
}

/**************************************************************************************************************/

/**
 *	Delete target image
 */
function removeTarget()
{
	if ( targetFeature )
	{
		targetLayer.removeFeature( targetFeature );
		targetFeature = null;
	}
}

/**************************************************************************************************************/

/**
 *	In case if base url isn't a service but a json containing all known places
 *	this method allows to retrieve it
 */
var retrieveDictionary = function()
{
	var containsDictionary = context.configuration.nameResolver.baseUrl.indexOf("json") >= 0;
	if ( containsDictionary )
	{
		// Dictionary as json
		$.ajax({
			type: "GET",
			url: context.configuration.nameResolver.baseUrl,
			success: function(response)
			{
				dictionary = response;
				nameResolverLayer = new VectorLayer();
				for ( var i=0; i<response.features.length; i++ )
				{
					var feature = response.features[i];
					feature.properties.style = new FeatureStyle({
						label : feature.properties.Name,
						fillColor: [1,0.7,0,1]
					});
				}
				nameResolverLayer.addFeatureCollection(response);
				context.globe.addLayer(nameResolverLayer);
			},
			error: function(thrownError)
			{
				console.error(thrownError);
			}
		});
	}
	else
	{
		dictionary = null;
	}
};

/**************************************************************************************************************/

return {
	init: function(m, ctx) {
		if ( !context ) {
			mizar = m;
			this.setContext(ctx);
		} else {
			console.error("Name resolver is already initialized");
		}
	},

	/**
	 *	Unregister all event handlers
	 */
	remove: function() {
		if ( context )
		{
			context.globe.removeLayer( targetLayer );
			if ( nameResolverLayer )
			{
				context.globe.removeLayer( nameResolverLayer );
				nameResolverLayer = null;
			}
			context.navigation.unsubscribe("modified", removeTarget);
			context = null;
			dictionary = null;
		}
	},

	goTo: search,
	zoomTo: zoomTo,

	/**
	 *	Set context
	 */
	setContext: function(ctx)
	{
		// Remove previous context
		this.remove();
		context = ctx;
		
		retrieveDictionary();
		var style = new FeatureStyle({
			iconUrl: ctx.configuration.mizarBaseUrl + "css/images/target.png",
			fillColor: [1, 1, 1, 1]
		});
		targetLayer = new VectorLayer({ style: style });

		ctx.globe.addLayer( targetLayer );

		// Update name resolver properties
		duration = ctx.configuration.nameResolver.duration ? context.configuration.nameResolver.duration : 3000;
		zoomFov = ctx.configuration.nameResolver.zoomFov ? context.configuration.nameResolver.zoomFov : 15;

		ctx.navigation.subscribe("modified", removeTarget);
	}
};

});
