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
define( [ "jquery.ui", "gw/FeatureStyle", "gw/HEALPixLayer", "gw/VectorLayer", "gw/EquatorialGridLayer", "gw/TileWireframeLayer", "gw/OpenSearchLayer", "PickingManager", "ClusterOpenSearchLayer", "MocLayer", "Utils", "ErrorDialog", "JsonProcessor", "ServiceBar",
	"underscore-min", "text!../templates/additionalLayer.html", "jquery.ui.selectmenu", "jquery.nicescroll.min" ], 
	function($, FeatureStyle, HEALPixLayer, VectorLayer, EquatorialGridLayer, TileWireframeLayer, OpenSearchLayer, PickingManager, ClusterOpenSearchLayer, MocLayer, Utils, ErrorDialog, JsonProcessor, ServiceBar, _, additionalLayerHTMLTemplate) {

/**
 * Private variable for module
 */
 
var globe;
var navigation;
var gwLayers = [];

// Necessary for selectmenu initialization
var backgroundLayersIcons = []; 
var nbBackgroundLayers = 0; // required because background id is always equal to 0

// GeoJSON data providers
var dataProviders = {};

// Template generating the additional layer div in sidemenu
var additionalLayerTemplate = _.template(additionalLayerHTMLTemplate);

/**
 * Private functions
 */

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
			options.coordSystem = layer.coordSystem || "EQUATORIAL";
			gwLayer = new HEALPixLayer(options);
			break;
				
		case "equatorialGrid":
			gwLayer = new EquatorialGridLayer( {name: layer.name, visible: layer.visible} );
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

			if ( layer.pickable )
				PickingManager.addPickableLayer( gwLayer );
			break;
			
		case "DynamicOpenSearch":
			
			// Add necessary option			
			options.serviceUrl = layer.serviceUrl;
			options.minOrder = layer.minOrder;
			if (layer.displayProperties)
				options.displayProperties = layer.displayProperties;

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
			if ( layer.pickable )
				PickingManager.addPickableLayer( gwLayer );
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
		
		reader.onloadend = function(e) {
			
			try {
				var response = $.parseJSON(this.result);
			} catch (e) {
				ErrorDialog.open("JSON parsing error : " + e.type + "<br/> For more details see http://jsonlint.com/.");
				return false;
			}
			
			// generate random color
			var rgb = Utils.generateColor();
			var rgba = rgb.concat([1]);
			
			// Create style
			var options = { name: name };
			options.style = new FeatureStyle({ rendererHint: "Basic", iconUrl: "css/images/star.png", fillColor: rgba, strokeColor: rgba, visible: true });
			var gwLayer = new VectorLayer( options );
			gwLayer.deletable = true;
			globe.addLayer(gwLayer);

			// Add geoJson layer
			JsonProcessor.handleFeatureCollection( gwLayer, response );
			gwLayer.addFeatureCollection( response );

			addAdditionalLayer( gwLayer );
			PickingManager.addPickableLayer( gwLayer );

			updateScroll();
		};
		reader.readAsText(f);
	});
}

/**
 * 	Drag over event
 */
function handleDragOver(evt)
{
	evt.stopPropagation();
	evt.preventDefault();
	evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

/**
 *	Create the Html for background layers
 */
function createHtmlForBackgroundLayer( gwLayer )
{
	// Add HTML
	var $layerDiv = $('<option>'+ gwLayer.name + '</option>')
			.appendTo('#backgroundLayers')
			.data("layer", gwLayer);

	
	if ( gwLayer.icon )
	{		
		backgroundLayersIcons.push( {find: ".backgroundLayer_" + nbBackgroundLayers} );
		$layerDiv.addClass('backgroundLayer_'+ nbBackgroundLayers)
				.data("bgImage", "url("+gwLayer.icon+")" );
	}
	else
	{
		// Use default style
		backgroundLayersIcons.push( {find: ".unknown"} );
		$layerDiv.addClass('unknown');
	}

	// Set visible layer on top of selector
	if ( gwLayer.visible() )
	{
		$('#backgroundLayers').val( $layerDiv.val() );
	}
	
	nbBackgroundLayers++;
}

/**
 *	Update scroll event
 */
function updateScroll()
{
	$('#layerManager').getNiceScroll().resize();
}

/**
 *	Generate point legend in canvas 2d
 *
 *	@param gwLayer GlobWeb layer
 *	@param canvas Canvas
 *	@param imageUrl Image source url used for point texture
 */
function generatePointLegend( gwLayer, canvas, imageUrl )
{
	var context = canvas.getContext('2d');
	var icon = new Image();
	icon.onload = function() {
		// var width = (icon.width > canvas.width) ? canvas.width : icon.width;
		// var height = (icon.height > canvas.height) ? canvas.height : icon.height;
		context.drawImage(icon, 5, 0, 10, 10);

		// colorize icon
		var data = context.getImageData(0, 0, canvas.width, canvas.height);
		for (var i = 0, length = data.data.length; i < length; i+=4) {
			data.data[i] = gwLayer.style.fillColor[0]*255;
			data.data[i+1] = gwLayer.style.fillColor[1]*255;
			data.data[i+2] = gwLayer.style.fillColor[2]*255;
		}

		context.putImageData(data, 0, 0);
	};
	icon.src = imageUrl;
}

/**
 *	Generate line legend in canvas 2d
 */
function generateLineLegend( gwLayer, canvas )
{
	var context = canvas.getContext('2d');

	var margin = 2;
	context.beginPath();
	context.moveTo(margin, canvas.height - margin);
	context.lineTo(canvas.width/2 - margin, margin);
	context.lineTo(canvas.width/2 + margin, canvas.height - margin);
	context.lineTo(canvas.width - margin, margin);
	context.lineWidth = 1;

	// set line color
	context.strokeStyle = FeatureStyle.fromColorToString(gwLayer.style.fillColor);
	context.stroke();
}

/**
 *	Create the Html for addtionnal layers
 */
function createHtmlForAdditionalLayer( gwLayer )
{
	var currentIndex = gwLayer.id;

	var layerDiv = additionalLayerTemplate( { layer: gwLayer, currentIndex: currentIndex } );
	var $layerDiv = $(layerDiv)
		.appendTo('#additionalLayers')
		.data("layer", gwLayer);

	var $canvas = $layerDiv.find('.legend');
	var canvas = $canvas[0];

	if ( gwLayer instanceof OpenSearchLayer || gwLayer instanceof MocLayer || gwLayer instanceof VectorLayer )
	{
		if ( gwLayer.dataType == "point")
		{
			generatePointLegend(gwLayer, canvas, gwLayer.style.iconUrl);
		} 
		else if ( gwLayer.dataType == "line")
		{
			generateLineLegend( gwLayer, canvas );
		} 
		else
		{
			$canvas.css("display", "none");			
		}
	}
	else
	{
		$canvas.css("display", "none");
	}
			
	// Slider initialisation
	$('#slider_'+currentIndex).slider({
		value: gwLayer.opacity()*100,
		min: 20,
		max: 100,
		step: 20,
		slide: function( event, ui ) {
			$( "#percentInput_"+currentIndex ).val( ui.value + "%" );
			gwLayer.opacity( ui.value/100. );

			if ( gwLayer.subLayers )
			{
				for ( var i=0; i<gwLayer.subLayers.length; i++ )
				{
					gwLayer.subLayers[i].opacity( ui.value/100.);
				}
			}
		}
	}).slider( "option", "disabled", !gwLayer.visible() );
	
	// Init percent input of slider
	$( "#percentInput_"+currentIndex ).val( $( "#slider_"+currentIndex ).slider( "value" ) + "%" );
		
	// Hide the tools div, open it only when the user clicks on the layer
	var toolsDiv = $('#addLayer_'+currentIndex+' .layerTools');
	toolsDiv.hide();
	$('#additionalLayers').on("click", '#addLayer_'+currentIndex+' > label', function() {
		toolsDiv.slideToggle(updateScroll);
	});

	// Manage 'custom' checkbox
	// jQuery UI button is not sexy enough :)
	// Toggle some classes when the user clicks on the visibility checkbox
	$('#visible_'+currentIndex).click( function() {
		var isOn = !$(this).hasClass('ui-state-active');
		gwLayer.visible( isOn );

		if ( gwLayer.subLayers )
		{
			if ( isOn )
			{
				for ( var i=0; i<gwLayer.subLayers.length; i++ )
				{
					globe.addLayer( gwLayer.subLayers[i] );
				}
			}
			else
			{
				for ( var i=0; i<gwLayer.subLayers.length; i++ )
				{
					globe.removeLayer( gwLayer.subLayers[i] );
				}	
			}
		}

		$layerDiv.find('.slider').slider( isOn ? "enable" : "disable" );
		
		$(this).toggleClass('ui-state-active');
		$(this).toggleClass('ui-state-default');
		$(this).find('span').toggleClass('ui-icon-check');
		$(this).find('span').toggleClass('ui-icon-empty');

		var layer = $(this).parent().data("layer");

		if ( isOn )
		{
			toolsDiv.slideDown(updateScroll);
			ServiceBar.addLayer(layer);
		}
		else
		{
			toolsDiv.slideUp(updateScroll);
			ServiceBar.removeLayer(layer);
		}

	});
	updateScroll();
}

/**
 * 	Add background layer to HTML and to the engine
 */
function addBackgroundLayer ( gwLayer )
{
	// Add to engine
	if ( gwLayer.visible() ) {
		globe.setBaseImagery( gwLayer );
	}
	
	// Add HTML
	createHtmlForBackgroundLayer( gwLayer );
}

/**
 * 	Add additional layer to HTML and to the engine
 */
function addAdditionalLayer ( gwLayer )
{
	// Add HTML
	createHtmlForAdditionalLayer( gwLayer );

	// Spinner event
	globe.subscribe("startLoad", function(layer){
		$('#addLayer_'+layer.id).find('.spinner').stop(true,true).fadeIn('fast');
	});
	globe.subscribe("endLoad", function(layer){
		$('#addLayer_'+layer.id).find('.spinner').fadeOut(500);
	});

	// Init buttons of tool bar
	$('.deleteLayer').button({
		text: false,
		icons: {
			primary: "ui-icon-trash"
		}
	});

	$('.zoomTo').button({
		text: false,
		icons: {
			primary: "ui-icon-zoomin"
		}
	});	
}

function initToolbarEvents ()
{
	
	// Delete layer event
	$('#additionalLayers').on("click",'.deleteLayer', function(){
		
		$(this).parent().parent().fadeOut(300, function(){
			$(this).remove();
		});

		var layer = $(this).parent().parent().data("layer");
		globe.removeLayer(layer);
		PickingManager.removePickableLayer( layer );

		updateScroll();
	});

	// ZoomTo event (available for GlobWeb.VectorLayers only)
	$('#additionalLayers').on("click", ".zoomTo", function(){

		var layer = $(this).parent().parent().data("layer");
		var sLon = 0;
		var sLat = 0;
		var nbPoints = 0;

		for (var i=0; i<layer.features.length; i++)
		{
			var currentGeometry = layer.features[i].geometry;
			switch (currentGeometry.type)
			{
				case "Polygon":
					for( var j=0; j<currentGeometry.coordinates[0].length; j++ )
					{
						sLon+=currentGeometry.coordinates[0][j][0];
						sLat+=currentGeometry.coordinates[0][j][1];
						nbPoints++;
					}
					break;
				case "Point":
					sLon+=currentGeometry.coordinates[0];
					sLat+=currentGeometry.coordinates[1];
					nbPoints++;
					break;
				default:
					break;
			}

		}

		navigation.zoomTo([sLon/nbPoints, sLat/nbPoints], 2.);
	});
}

/**
 *	Fill the LayerManager table
 */
function initLayers(layers) 
{
	// Nice scrollbar
	$('#layerManager').niceScroll({ autohidemode: false });
	
	// Necessary to drag&drop option while using jQuery
	$.event.props.push('dataTransfer');
	
	for (var i=0; i<layers.length; i++) {
		var layer = layers[i];
		
		// Define default optionnal parameters
		if(!layer.opacity)
			layer.opacity = 100.;
		if(typeof (layer.pickable) === 'undefined')
			layer.pickable = true;
	
		var gwLayer = createLayerFromConf(layer);
		if ( gwLayer )
		{
			if( layer.background )
			{
				addBackgroundLayer( gwLayer );
			}
			else
			{
				// Add to engine
				globe.addLayer( gwLayer );

				addAdditionalLayer( gwLayer );
			}
		}
		gwLayers.push(gwLayer);
	}
	
	// Init select menu
	$('select#backgroundLayers').selectmenu({
		icons: backgroundLayersIcons,
		bgImage: function() {
			return this.data('bgImage');
		},
		select: function(e)
		{
			var index = $(this).data('selectmenu').index();
			var layer = $(this).children().eq(index).data("layer");
			globe.setBaseImagery( layer );

			// Add all previously added layers to the new imagery
			for ( var i=0; i<gwLayers.length; i++ )
			{
				var currentLayer = gwLayers[i];
				if ( currentLayer.subLayers )
				{
					for ( var j=0; j<currentLayer.subLayers.length; j++ )
					{
						globe.addLayer( currentLayer.subLayers[j] );
					}

				}
			}
		}
	});
	
	initToolbarEvents();

	// Background spinner events
	globe.subscribe("startBackgroundLoad", function(layer){
		$('#backgroundSpinner').fadeIn('fast');
	});
	globe.subscribe("endBackgroundLoad", function(layer){
		$('#backgroundSpinner').fadeOut('fast');
	});
	
	// Setup the drag & drop listeners.
	$('canvas').on('dragover', handleDragOver);
	$('canvas').on('drop', handleDrop);
}

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
		navigation = nav;
		
		// Call init layers
		initLayers(configuration.layers);
		ServiceBar.init(gl, configuration);
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
	}
	
};

});