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
define( [ "jquery", "underscore-min", "gw/FeatureStyle", "gw/HEALPixLayer", "gw/VectorLayer", "gw/CoordinateGridLayer", "gw/TileWireframeLayer", "gw/OpenSearchLayer", "gw/WMSLayer",
		 "./ClusterOpenSearchLayer", "./MocLayer", "./PlanetLayer", "./HEALPixFITSLayer", "./PickingManager", "./Utils", "./JsonProcessor", "jquery.ui"], 
	function($, _, FeatureStyle, HEALPixLayer, VectorLayer, CoordinateGridLayer, TileWireframeLayer, OpenSearchLayer, WMSLayer,
			ClusterOpenSearchLayer, MocLayer, PlanetLayer, HEALPixFITSLayer, PickingManager, Utils, JsonProcessor) {

/**
 * Private variables
 */
var sky;
var gwLayers = [];
var planetLayers = [];
var configuration;

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
			iconUrl: configuration.mizarBaseUrl + "css/images/star.png",
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
function createLayerFromConf(layerDesc) {
	var gwLayer;

	// Ensure that the attribution link will be opened in new tab
	if ( layerDesc.attribution && layerDesc.attribution.search('<a') >= 0 && layerDesc.attribution.search('target=') < 0 )
	{
		layerDesc.attribution = layerDesc.attribution.replace(' ', ' target=_blank ');
	}

	// Default options
	var defaultOptions = {
		opacity: 100,
		visible: false,
		coordSystem: "EQ",
		dataType: (layerDesc.type == "healpix") ? "jpg" : "line"
	};
	// Merge layer options with default options
	layerDesc = $.extend( {}, defaultOptions, layerDesc );
	
	// Update layer color
	if ( layerDesc.color )
	{
		layerDesc.color = FeatureStyle.fromStringToColor( layerDesc.color );
	}
	else
	{
		// Generate random color
		var rgb = Utils.generateColor();
		layerDesc.color = rgb.concat([1]);
	}

	// HACK: it seems to be a little incoherence between opacity property on layerDesc and FeatureStyle opacity, to explore.. 
	layerDesc.opacity /= 100;

	// Create style if needed
	if ( !layerDesc.style ) {
		var defaultVectorStyle = new FeatureStyle({ 
			rendererHint: "Basic", 
			opacity: layerDesc.opacity,
			iconUrl: layerDesc.icon ? layerDesc.icon : configuration.mizarBaseUrl + "css/images/star.png",
			fillColor: layerDesc.color,
			strokeColor: layerDesc.color
		});
		layerDesc.style = defaultVectorStyle;
	}

	// Depending on type of layer, create layer
	switch(layerDesc.type){
		case "healpix":

			if ( layerDesc.fitsSupported )
			{
				gwLayer = new HEALPixFITSLayer(layerDesc);
			}
			else
			{
				gwLayer = new HEALPixLayer(layerDesc);
			}
			if ( layerDesc.availableServices )
			{
				gwLayer.availableServices = layerDesc.availableServices;
				gwLayer.healpixCutFileName = layerDesc.healpixCutFileName;
			}

			break;
		
		case "coordinateGrid":
			gwLayer = new CoordinateGridLayer( layerDesc );
			break;
			
		case "healpixGrid":
			gwLayer = new TileWireframeLayer( layerDesc );
			break;
			
		case "GeoJSON":

			gwLayer = new VectorLayer(layerDesc);
			gwLayer.dataType = layerDesc.dataType || "line";
			gwLayer.pickable = layerDesc.hasOwnProperty('pickable') ? layerDesc.pickable : true;

			break;
			
		case "DynamicOpenSearch":

			if ( layerDesc.useCluster )
			{
				gwLayer = new ClusterOpenSearchLayer( layerDesc );
			}
			else
			{
				gwLayer = new OpenSearchLayer( layerDesc );
			}

			if (layerDesc.displayProperties)
				gwLayer.displayProperties = layerDesc.displayProperties;
			gwLayer.dataType = layerDesc.dataType;
			gwLayer.pickable = layerDesc.hasOwnProperty('pickable') ? layer.pickable : true;
			gwLayer.availableServices = layerDesc.availableServices;
			break;

		case "Moc":
			layerDesc.style.fill = true;
			layerDesc.style.fillColor[3] = 0.3 // make transparent
			gwLayer = new MocLayer( layerDesc );
			gwLayer.dataType = "line";
			break;
		case "Vector":
			gwLayer = createSimpleLayer(layerDesc.name);
			gwLayer.dataType = layerDesc.dataType;
			gwLayer.pickable = layerDesc.hasOwnProperty('pickable') ? layerDesc.pickable : true;
			gwLayer.deletable = false;
			break;
		case "Planet":
			gwLayer = new PlanetLayer( layerDesc );
			break;
		default:
			console.error(layerDesc.type+" isn't not implemented");
			return null;
	}
	gwLayer.type = layerDesc.type;
	gwLayer.dataType = layerDesc.dataType;

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
	 *	@param conf
	 *		Mizar configuration
 	 */
	init: function(mizar, conf) {
		this.mizar = mizar;
		configuration = conf;
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
		if ( !gwLayer )
		{
			gwLayer = createLayerFromConf(layerDesc);
			if ( gwLayer )
			{	
				// Store planet layers to be able to set background from name
				if ( gwLayer instanceof PlanetLayer ) {
					for (var i=0; i<gwLayer.layers.length; i++) {
						planetLayers.push( gwLayer.layers[i] );
					}
				};
				if( layerDesc.background )
				{
					// Add to engine
					if ( gwLayer.visible() )
					{
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
				
				// Fill data-provider-type layer by features coming from data object
				if ( layerDesc.data && dataProviders[layerDesc.data.type] )
				{
					var callback = dataProviders[layerDesc.data.type];
					var data = callback(gwLayer, layerDesc.data);
				}

			}
		}

		if ( gwLayer.pickable )
			PickingManager.addPickableLayer(gwLayer);

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
	 	if ( gwLayer.pickable )
			PickingManager.removePickableLayer(gwLayer);

		this.mizar.publish("layer:remove", gwLayer);
	 	sky.removeLayer(gwLayer);
	 },

	 /**
	  *	Set background survey from its name
	  *	@param survey
	  *		Survey name
	  */
	 setBackgroundSurvey: function(survey) {
		
	 	if ( this.mizar.mode == "sky" )
	 	{
			// Find the layer by name among all the layers
		 	var gwLayer = _.findWhere(gwLayers, {name: survey});
		 	if ( gwLayer )
		 	{
				// Check if is not already set
			 	if ( gwLayer != this.mizar.sky.baseImagery )
			 	{
				 	// Change visibility's of previous layer, because visibility is used to know the active background layer in the layers list (layers can be shared)
				 	if ( this.mizar.sky.baseImagery )
						this.mizar.sky.baseImagery.visible(false);
					this.mizar.sky.setBaseImagery( gwLayer );
					this.mizar.sky.baseImagery = gwLayer;
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
									this.mizar.sky.removeLayer( subLayer );
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
	 	}
	 	else
	 	{
	 		// Planet mode
		 	var gwLayer = _.findWhere(planetLayers, {name: survey});
		 	var globe = this.mizar.planetContext.globe;
			globe.setBaseImagery( gwLayer );
			gwLayer.visible(true);
			this.mizar.publish("backgroundLayer:change", gwLayer);
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
		PickingManager.addPickableLayer( gwLayer );

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
		PickingManager.addPickableLayer( gwLayer );

		sky.addLayer(gwLayer);
		gwLayers.push(gwLayer);
		return gwLayer;
	 },

	 createSimpleLayer: createSimpleLayer
};

});