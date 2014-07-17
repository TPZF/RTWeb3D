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
 * LayerManager module
 */
define( [ "jquery", "underscore-min", "gw/FeatureStyle", "gw/HEALPixLayer", "gw/VectorLayer", "gw/CoordinateGridLayer", "gw/TileWireframeLayer", "gw/OpenSearchLayer", "./ClusterOpenSearchLayer", "./MocLayer", "./HEALPixFITSLayer", "./PickingManager", "./Utils", "./JsonProcessor", "jquery.ui"], 
	function($, _, FeatureStyle, HEALPixLayer, VectorLayer, CoordinateGridLayer, TileWireframeLayer, OpenSearchLayer, ClusterOpenSearchLayer, MocLayer, HEALPixFITSLayer, PickingManager, Utils, JsonProcessor) {

/**
 * Private variables
 */
var sky;
var gwLayers = [];

// GeoJSON data providers
var dataProviders = {};
var votable2geojsonBaseUrl;


/**
 * Private functions
 */

/**************************************************************************************************************/

/**
 *	Create simple vector layer
 */
function createSimpleLayer(name)
{
	// Generate random color
	var rgb = Utils.generateColor();
	var rgba = rgb.concat([1]);
	
	// Create style
	var options = {
		name: name,
		style: new FeatureStyle({
			iconUrl: "css/images/star.png",
			fillColor: rgba,
			strokeColor: rgba,
			visible: true
		})
	};

	// Create vector layer
	var gwLayer = new VectorLayer( options );
	// Add the type GeoJSON to be able to zoom on the layer ! (cf HTML generation of additional layer)
	gwLayer.type = "GeoJSON";
	gwLayer.deletable = true;
	gwLayer.pickable = true;

	return gwLayer;
}

/**************************************************************************************************************/

/**
 *	Create layer from configuration file
 */
function createLayerFromConf(layer) {
	var gwLayer;

	// Insure that the link will be opened in new tab
	if ( layer.attribution && layer.attribution.search('<a') >= 0 && layer.attribution.search('target=') < 0 )
	{
		layer.attribution = layer.attribution.replace(' ', ' target=_blank ');
	}

	// default options
	var options = {
		name: layer.name,
		attribution: layer.attribution,
		visible: layer.visible,
		icon: layer.icon,
		description: layer.description,
		onready: layer.onready
	};

	if ( layer.color )
	{
		var rgba = FeatureStyle.fromStringToColor( layer.color );
	}
	else
	{
		// generate random color
		var rgb = Utils.generateColor();
		var rgba = rgb.concat([1]);
	}
	
	var defaultVectorStyle = new FeatureStyle({ 
				rendererHint: "Basic", 
				opacity: layer.opacity/100.,
				iconUrl: layer.icon ? layer.icon : "css/images/star.png",
				fillColor: rgba,
				strokeColor: rgba
	});

	switch(layer.type){
		case "healpix":
			// Add necessary options
			options.baseUrl = layer.baseUrl;
			options.coordSystem = layer.coordSystem || "EQ";
			options.dataType = layer.dataType || "jpg";
			options.numberOfLevels = layer.numberOfLevels;

			if ( layer.fitsSupported )
			{
				gwLayer = new HEALPixFITSLayer(options);
			}
			else
			{
				gwLayer = new HEALPixLayer(options);
			}
			if ( layer.availableServices )
			{
				gwLayer.availableServices = layer.availableServices;
				gwLayer.healpixCutFileName = layer.healpixCutFileName;
			}

			break;
		
		case "coordinateGrid":
			gwLayer = new CoordinateGridLayer( {
				name: layer.name,
				visible: layer.visible,
				longFormat: layer.longFormat,
				latFormat: layer.latFormat,
				coordSystem: layer.coordSystem,
				color: rgba
			} );
			break;
			
		case "healpixGrid":
			gwLayer = new TileWireframeLayer( {name: layer.name, visible: layer.visible, outline: layer.outline });
			gwLayer.style = defaultVectorStyle;
			break;
			
		case "GeoJSON":

			options.style = defaultVectorStyle;
			gwLayer = new VectorLayer(options);

			if ( dataProviders[layer.data.type] )
			{
				var callback = dataProviders[layer.data.type];
				var data = callback(gwLayer, layer.data);
			}

			gwLayer.dataType = layer.dataType || "line";
			gwLayer.pickable = layer.hasOwnProperty('pickable') ? layer.pickable : true;

			break;
			
		case "DynamicOpenSearch":
			
			// Add necessary option			
			options.serviceUrl = layer.serviceUrl;
			options.minOrder = layer.minOrder;
			if (layer.hasOwnProperty('invertY'))
				options.invertY = layer.invertY;

			options.style = defaultVectorStyle;
			if ( layer.hasOwnProperty('coordSystemRequired') ) 
			{
				options.coordSystemRequired = layer.coordSystemRequired;
			}
			if ( layer.useCluster )
			{
				if( layer.maxClusterOrder )
					options.maxClusterOrder = layer.maxClusterOrder;
				if ( layer.treshold )
					options.treshold = layer.treshold;
				if ( layer.accuracyOrder )
					options.accuracyOrder

				gwLayer = new ClusterOpenSearchLayer( options );
			}
			else
			{
				gwLayer = new OpenSearchLayer( options );
			}

			if (layer.displayProperties)
				gwLayer.displayProperties = layer.displayProperties;
			gwLayer.dataType = layer.dataType;
			gwLayer.pickable = layer.hasOwnProperty('pickable') ? layer.pickable : true;
			gwLayer.availableServices = layer.availableServices;
			break;

		case "Moc":
			options.style = defaultVectorStyle;
			options.serviceUrl = layer.serviceUrl;
			options.style.fill = true;
			options.style.fillColor[3] = 0.3 // make transparent
			gwLayer = new MocLayer( options );
			gwLayer.dataType = "line";
			break;
			
		default:
			console.error(layer.type+" isn't not implemented");
			return null;
	}
	gwLayer.type = layer.type;

	return gwLayer;
}

/**************************************************************************************************************/

/**
 *	Fill the LayerManager table
 */
function initLayers(layers) 
{
	for (var i=0; i<layers.length; i++) {
		var layer = layers[i];
		this.addLayer(layer);
	}
}

/**************************************************************************************************************/

return {
	/**
	 *	Init
	 *
	 *	@param mizar
	 *		Mizar API object
	 *	@param configuration
	 *		Mizar configuration 
 	 */
	init: function(mizar, configuration) {
		this.mizar = mizar;
		
		// Store the sky in the global module variable
		sky = mizar.sky;

		// TODO : Call init layers
		//initLayers(configuration.layers);
	},
	
	/**
	 *	Register data provider
	 *
	 *	@param type Type of data
	 *	@param loadFunc Callback function loading and adding data to the layer
	 */
	registerDataProvider: function( type, loadFunc )
	{
		dataProviders[type.toString()] = loadFunc;
	},

	/**
	 *	Get current layers
	 */
	 getLayers: function()
	 {
	 	return gwLayers;
	 },

	 /**
	  *	Create layer from layer description and add it to corresponding LayersView
	  *
	  *	@param layer
	  *		Layer description
	  *	@return
	  *		Created layer if doesn't already exist, existing layer otherwise
	  */
	 addLayer: function(layerDesc) {

		var gwLayer = _.findWhere(gwLayers, {name: layerDesc.name});
		if ( !gwLayer ) {
			// If layer hasn't been already added
		 	// Define default optionnal parameters
			if(!layerDesc.opacity)
				layerDesc.opacity = 100.;
			if (!layerDesc.visible)
				layerDesc.visible = false;
		
			gwLayer = createLayerFromConf(layerDesc);
			if ( gwLayer )
			{
				if( layerDesc.background )
				{
					// Add to engine
					if ( gwLayer.visible() ) {
						// Change visibility's of previous layer(maybe GlobWeb should do it ?)
						if ( sky.tileManager.imageryProvider )
						{
							sky.tileManager.imageryProvider.visible(false);
						}

						sky.setBaseImagery( gwLayer );
						gwLayer.visible(true);
					}
					gwLayers.push(gwLayer);
					this.mizar.publish("backgroundLayer:add", gwLayer);

					// Store category name on GlobWeb layer object
					gwLayer.category = "background";
				}
				else
				{
					// Add to engine
					sky.addLayer( gwLayer );
					gwLayers.push(gwLayer);

					// Store category name on GlobWeb layer object
					gwLayer.category = layerDesc.category;

					this.mizar.publish("additionalLayer:add", gwLayer);
				}
			}
		}
		return gwLayer;
	 },

	 /**
	  *	Remove the given layer
	  *	@param gwLayer
	  *		GlobWeb layer
	  */
	 removeLayer: function(gwLayer) {

	 	var index = gwLayers.indexOf(gwLayer);
	 	gwLayers.splice( index, 1 );

	 	sky.removeLayer(gwLayer);
	 },

	 /**
	  *	Set background survey from its name
	  *	@param survey
	  *		Survey name
	  */
	 setBackgroundSurvey: function(survey) {
	 	var gwLayer = _.findWhere(gwLayers, {name: survey});
	 	if ( gwLayer )
	 	{
		 	if ( gwLayer != sky.baseImagery )
		 	{
			 	// Change visibility's of previous layer, because visibility is used to know the active background layer in the layers list (layers can be shared)
				sky.baseImagery.visible(false);
				sky.setBaseImagery( gwLayer );
				gwLayer.visible(true);

				// Clear selection
				PickingManager.getSelection().length = 0;

				for ( var i=0; i<gwLayers.length; i++ )
				{
					var currentLayer = gwLayers[i];
					if ( currentLayer.subLayers )
					{
						var len = currentLayer.subLayers.length;
						for ( var j=0; j<len; j++ )
						{
							var subLayer = currentLayer.subLayers[j];
							if (subLayer.name == "SolarObjectsSublayer" )
							{
								PickingManager.removePickableLayer( subLayer );
								sky.removeLayer( subLayer );
								currentLayer.subLayers.splice(j,1);
							}
						}
					}
				}
			}
			this.mizar.publish("backgroundLayer:change", gwLayer);
	 	} else {
	 		this.mizar.publish("backgroundSurveyError", "Survey " + survey + " hasn't been found");
	 	}
	},

	/**
	 *	Create layer from FITS
	 */
	createLayerFromFits: function(name, fits) {
	 	var gwLayer = createSimpleLayer(name);
		gwLayer.dataType = "line";

		// Create feature
		var coords = Utils.getPolygonCoordinatesFromFits(fits);
		var feature = {
			"geometry": {
				"gid": name,
				"coordinates": [coords],
				"type": "Polygon"
			},
			"properties": {
				"identifier": name
			},
			"type": "Feature"
		};

		gwLayer.addFeature( feature );

		sky.addLayer(gwLayer);
		gwLayers.push(gwLayer);
		return gwLayer;
	},

	/**
	 *	Create layer from GeoJSON
	 */
	createLayerFromGeoJson: function(name, geoJson) {
	 	// Add feature collection
		var gwLayer = createSimpleLayer(name);

		// Add feature collection
		JsonProcessor.handleFeatureCollection( gwLayer, geoJson );
		gwLayer.addFeatureCollection( geoJson );

		sky.addLayer(gwLayer);
		gwLayers.push(gwLayer);
		return gwLayer;
	 }
};

});