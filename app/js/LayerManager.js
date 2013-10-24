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
define( [ "jquery.ui", "gw/FeatureStyle", "gw/HEALPixLayer", "gw/VectorLayer", "gw/CoordinateGridLayer", "gw/TileWireframeLayer", "gw/OpenSearchLayer", "ClusterOpenSearchLayer", "MocLayer", "HEALPixFITSLayer", "Utils", "ErrorDialog", "JsonProcessor", "LayerServiceView", "BackgroundLayersView", "AdditionalLayersView", "FitsLoader", "ImageManager", "ImageViewer"], 
	function($, FeatureStyle, HEALPixLayer, VectorLayer, CoordinateGridLayer, TileWireframeLayer, OpenSearchLayer, ClusterOpenSearchLayer, MocLayer, HEALPixFITSLayer, Utils, ErrorDialog, JsonProcessor, LayerServiceView, BackgroundLayersView, AdditionalLayersView, FitsLoader, ImageManager, ImageViewer) {

/**
 * Private variables
 */
var globe;
var gwLayers = [];

// GeoJSON data providers
var dataProviders = {};

/**
 * Private functions
 */

/**************************************************************************************************************/

/**
 *	Create layer from configuration file
 */
function createLayerFromConf(layer) {
	var gwLayer;

	// default options
	var options = {
		name: layer.name,
		attribution: layer.attribution,
		visible: layer.visible,
		icon: layer.icon,
		description: layer.description
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
			// Add necessary option
			options.baseUrl = layer.baseUrl;
			options.coordSystem = layer.coordSystem || "EQ";
			options.dataType = layer.dataType || "jpg";
			if ( layer.fitsSupported )
			{
				options.onready = function( fitsLayer ) {
					if ( fitsLayer.dataType == "fits" && fitsLayer.levelZeroImage )
					{
						if ( fitsLayer.div )
						{
							// Additional layer
							// Using name as identifier, because we must know it before attachment to globe
							// .. but identfier is assigned after layer creation.
							$('#addFitsView_'+fitsLayer.name).button("enable");
							fitsLayer.div.setImage(fitsLayer.levelZeroImage);
						}
						else
						{
							// Background fits layer
							$('#fitsView').button("enable");
							var backgroundDiv = BackgroundLayersView.getDiv();
							backgroundDiv.setImage(fitsLayer.levelZeroImage);
						}
					}
				}
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
			if (layer.displayProperties)
				options.displayProperties = layer.displayProperties;
			if (layer.invertY)
				options.invertY = layer.invertY;

			options.style = defaultVectorStyle;
			if ( layer.useCluster == true )
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
 * 	Drop event
 */
function handleDrop(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	var files = evt.dataTransfer.files; // FileList object.
	
	// Files is a FileList of File objects.
	$.each( files, function(index, f) {
		
		var name = f.name;
		var reader = new FileReader();
		$('#loading').show();

		if ( f.type == "image/fits" )
		{
			// Handle fits image
			reader.onloadend = function(e) {
				var arrayBuffer = this.result;
				var fits = FitsLoader.parseFits(arrayBuffer);

				// Create vector layer
				var rgb = Utils.generateColor();
				var rgba = rgb.concat([1]);

				var options = {
					name: name,
					style: new FeatureStyle({
						fillColor: rgba,
						strokeColor: rgba
					})
				};
				var gwLayer = new VectorLayer( options );
				gwLayer.type = "GeoJSON";
				gwLayer.dataType = "line";
				gwLayer.deletable = true;
				gwLayer.pickable = true;
				globe.addLayer(gwLayer);

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

				// Add fits texture
				var featureData = {
					layer: gwLayer,
					feature: feature
				};
				var fitsData = fits.getHDU().data;
				ImageViewer.addView(featureData, true);
				ImageManager.handleFits( fitsData, featureData );
				ImageViewer.show();

				AdditionalLayersView.addView( gwLayer );
				gwLayers.push(gwLayer);
				$('#loading').hide();
			};
			reader.readAsArrayBuffer(f);
		}
		else
		{
			reader.onloadend = function(e) {
				// Handle json if possible
				try {
					var response = $.parseJSON(this.result);
				} catch (e) {
					ErrorDialog.open("JSON parsing error : " + e.type + "<br/> For more details see http://jsonlint.com/.");
					$('#loading').hide();
					return false;
				}
				
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
				globe.addLayer(gwLayer);

				// Add feature collection
				JsonProcessor.handleFeatureCollection( gwLayer, response );
				gwLayer.addFeatureCollection( response );
				
				AdditionalLayersView.addView( gwLayer );
				gwLayers.push(gwLayer);
				$('#loading').hide();
			};
			reader.readAsText(f);
		}

	});
}

/**************************************************************************************************************/

/**
 * 	Drag over event
 */
function handleDragOver(evt)
{
	evt.stopPropagation();
	evt.preventDefault();
	evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

/**************************************************************************************************************/

/**
 *	Fill the LayerManager table
 */
function initLayers(layers) 
{
	// Necessary to drag&drop option while using jQuery
	$.event.props.push('dataTransfer');
	
	for (var i=0; i<layers.length; i++) {
		var layer = layers[i];
		
		// Define default optionnal parameters
		if(!layer.opacity)
			layer.opacity = 100.;
		if (!layer.visible)
			layer.visible = false;
	
		var gwLayer = createLayerFromConf(layer);
		if ( gwLayer )
		{
			if( layer.background )
			{
				// Add to engine
				if ( gwLayer.visible() ) {
					// Change visibility's of previous layer(maybe GlobWeb should do it ?)
					if ( globe.tileManager.imageryProvider )
					{
						globe.tileManager.imageryProvider.visible(false);
					}

					globe.setBaseImagery( gwLayer );
					gwLayer.visible(true);
				}
				BackgroundLayersView.addView( gwLayer );
			}
			else
			{
				// Add to engine
				globe.addLayer( gwLayer );
				AdditionalLayersView.addView( gwLayer, layer.category );
			}

			gwLayers.push(gwLayer);
		}
	}

	// Create accordeon
	$( "#accordion" ).accordion( {
		header: "> div > h3",
		autoHeight: false,
		active: 0,
		collapsible: true,
		heightStyle: "content"
	} ).show();

	BackgroundLayersView.updateUI();
	AdditionalLayersView.updateUI();
	
	// Setup the drag & drop listeners.
	$('canvas').on('dragover', handleDragOver);
	$('canvas').on('drop', handleDrop);
}

/**************************************************************************************************************/

return {
	/**
	 *	Init
	 *
	 *	@param gl Globe
	 *	@param configuration Layers configuration 
 	 */
	init: function(gl, nav, configuration) {
		// Store the globe in the global module variable
		globe = gl;
		AdditionalLayersView.init(gl, nav);
		BackgroundLayersView.init(gl, this);

		// Call init layers
		initLayers(configuration.layers);

		LayerServiceView.init(gl, nav, this, configuration);
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
	 }
	
};

});