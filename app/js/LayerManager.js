
/**
 * LayerManager module
 */
define( [ "jquery.ui", "PickingManager", "StarLayer", "ConstellationLayer", "DynamicOSLayer", "underscore-min", "text!../templates/additionalLayer.html", "jquery.ui.selectmenu" ], function($, PickingManager, StarLayer, ConstellationLayer, DynamicOSLayer, _, additionalLayerHTMLTemplate) {

/**
 * Private variable for module
 */
 
 // The globe
var globe;
var gwLayer;
var gwBaseLayers = [];
var gwAdditionalLayers = [];
var backgroundLayersIcons = [];
var nbBackgroundLayers = 0;
var nbAddLayers = 0;

// Template generating the additional layer div in sidemenu
var additionalLayerTemplate = _.template(additionalLayerHTMLTemplate);

var jsonErrorDiv = '<div Title="Error">JSON parsing error : <span id="error"></span><br/> For more details see http://jsonlint.com/. </div>';

var jErrorDiv = $(jsonErrorDiv)
	.appendTo('body');
$(jErrorDiv).dialog({
	autoOpen: false,
	resizable: false,
	width: '300px',
	dialogClass: 'jsonError'
});

/**
 * Private functions
 */

/**
 * 	ON/OFF radio buttons layout
 */
function setVisibilityButtonsetLayout()
{
	$('.layerVisibilityRadioDiv').each(function(){
		var inputOn = $(this).find(".inputOn");
		if ( inputOn.is(':checked') )
		{
			inputOn.siblings('.on').addClass('ui-state-active');
		}
		else
		{
			inputOn.siblings('.off').addClass('ui-state-active');
		}
	});
}

/**
 *	Handles feature collection
 * 	Recompute geometry from equatorial coordinates to geo for each feature
 *	Adds proxy url to quicklook for each feature
 */
function handleFeatureCollection( features )
{
	var proxyUrl = "/sitools/proxy?external_url=";
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

				// Add proxy url to quicklook url
				if ( currentFeature.properties.quicklook )
					currentFeature.properties.quicklook = proxyUrl+currentFeature.properties.quicklook;
				break;
			default:
				break;
		}
	}
}

/**
 *	Adds feature collection to the layer in GeoJSON format
 *
 *	@param gwLayer GlobWeb layer
 *	@param featureCollection Feature collection in equatorial format	
 */
function handleEquatorialFeatureCollection( gwLayer, featureCollection )
{
	handleFeatureCollection( featureCollection.features );
	gwLayer.addFeatureCollection( featureCollection );
	PickingManager.addPickableLayer( gwLayer );
}

/**
 * 	Load JSON file and add layer to the globe
 *
 *	@param gwLayer GlobWeb layer
 *	@param url Url to JSON containing feature collection in equatorial coordinates
 */
function handleJSONFeature( gwLayer, url )
{
	$.ajax({
		type: "GET",
		url: url,
		success: function(response){
			handleEquatorialFeatureCollection( gwLayer, response );
		},
		error: function (xhr, ajaxOptions, thrownError) {
			console.error( xhr.responseText );
		}
	});
}

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

	switch(layer.type){
		case "healpix":
			// Add necessary option
			options.baseUrl = layer.url;
			gwLayer = new GlobWeb.HEALPixLayer(options);
			break;
			
		case "star":
			// Create style
			options.style = new GlobWeb.FeatureStyle({
				opacity: layer.opacity / 100.
			});

			// Add necessary options
			options.namesUrl = layer.nameUrl;
			options.catalogueUrl = layer.catalogueUrl;
			gwLayer = new StarLayer(options);
			break;
			
		case "constellation":
			// Create style
			options.style = new GlobWeb.FeatureStyle({
				strokeColor: [0.03125, 0.23046875, 0.65625, 1.],
				rendererHint: "Basic",
				opacity: layer.opacity / 100.,
				icon: layer.icon
			});
			
			// Add necessary options
			options.namesUrl = layer.nameUrl;
			options.catalogueUrl = layer.catalogueUrl;
			gwLayer = new ConstellationLayer(options);
			break;
			
		case "equatorialGrid":
			gwLayer = new GlobWeb.EquatorialGridLayer( {name: layer.name, visible: layer.visible} );
			break;
			
		case "healpixGrid":
			gwLayer = new GlobWeb.TileWireframeLayer( {name: layer.name, visible: layer.visible});
			break;
			
		case "JSON":
			// Create style
			options.style = new GlobWeb.FeatureStyle({ 
				rendererHint: "Basic", 
				opacity: layer.opacity/100.
			});
			
			gwLayer = new GlobWeb.VectorLayer(options);
			handleJSONFeature( gwLayer, layer.url );
			break;
			
		case "StaticOpenSearch":
			// Create style
			options.style = new GlobWeb.FeatureStyle({ 
				rendererHint: "Basic", 
				opacity: layer.opacity/100.
			});
			
			gwLayer = new GlobWeb.VectorLayer(options);
			handleJSONFeature( gwLayer, layer.url );
			break;
			
		case "DynamicOpenSearch":
			
			// Add necessary option			
			options.serviceUrl = layer.serviceUrl;
			options.minOrder = layer.minOrder;
			gwLayer = new DynamicOSLayer( options );
			PickingManager.addPickableLayer( gwLayer );
			break;
			
		default:
			console.error("Not implemented");
	}
	
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
				var response = JSON.parse(this.result);
			} catch (e) {
				$(jErrorDiv)
					.find("#error").html(e.type).end()
					.dialog( "open" );
				return false;
			}
			
			// Create style
			var options = {name: name};
			options.style = new GlobWeb.FeatureStyle({ rendererHint: "Basic", iconUrl: "css/images/star.png" });
			gwLayer = new GlobWeb.VectorLayer( options );
			
			// Add geoJson layer
			handleEquatorialFeatureCollection ( gwLayer, response );
			addAdditionalLayer( gwLayer );
			
			// Create additional layers visibility button set
			$( ".layerVisibilityRadioDiv" ).buttonset()
			
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
	var currentIndex = nbBackgroundLayers;
	var currentClass;
	
	var layerDiv ='<option value="'+ currentIndex +'" class="">'+ gwLayer.name + '</option>"';
	
	
	if ( gwLayer.icon )
	{
		// Create icon style
		var sheet = document.createElement('style');
		sheet.innerHTML = ".backgroundLayer_" + currentIndex + " .ui-selectmenu-item-icon { background: url("+gwLayer.icon+") 0 0 no-repeat; }";
		document.body.appendChild(sheet);
		
		backgroundLayersIcons.push( {find: ".backgroundLayer_" + currentIndex} );
		currentClass = 'backgroundLayer_'+ currentIndex;
	}
	else
	{
		// Use default style
		backgroundLayersIcons.push( {find: ".unknown"} );
		currentClass = 'unknown';
	}
	$(layerDiv).appendTo('#backgroundLayers').addClass(currentClass);
	
	// Set visible layer on top of selector
	if ( gwLayer.visible() )
	{
		$('#backgroundLayers').val( $(layerDiv).val() );
	}
	
	nbBackgroundLayers++;
}

/**
 *	Create the Html for addtionnal layers
 */
function createHtmlForAdditionalLayer( gwLayer )
{
	var currentIndex = nbAddLayers;
	var layerDiv = additionalLayerTemplate( { layer: gwLayer, currentIndex: currentIndex } );

	$(layerDiv)
		.appendTo('#additionalLayers');
	
	var temp = gwLayer.opacity();
		
	// Slider initialisation
	$('#slider_'+currentIndex).slider({
		value: gwLayer.opacity()*100,
		min: 20,
		max: 100,
		step: 20,
		slide: function( event, ui ) {
			$( "#percentInput_"+currentIndex ).val( ui.value + "%" );
			var layerIndex = parseInt( $(this).parent().index() );
			var layer = gwAdditionalLayers[ layerIndex ];
			layer.opacity( ui.value/100. );
		}
	}).slider( "option", "disabled", !gwLayer.visible() );

	// Init percent input of slider
	$( "#percentInput_"+currentIndex ).val( $( "#slider_"+currentIndex ).slider( "value" ) + "%" );
	
	nbAddLayers++;
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
	gwBaseLayers.push( gwLayer );
	
	// Add HTML
	createHtmlForBackgroundLayer( gwLayer );
}

/**
 * 	Add additional layer to HTML and to the engine
 */
function addAdditionalLayer ( gwLayer )
{
	// Add to engine
	gwAdditionalLayers.push( gwLayer );
	globe.addLayer( gwLayer );
	
	// Add HTML
	createHtmlForAdditionalLayer( gwLayer );
}

function initGuiEvents ()
{
	
	// Background selection visibility event
	$('#backgroundLayers-menu li').click(function(){
		var layerIndex = parseInt( $(this).index() );
		globe.setBaseImagery( gwBaseLayers[ layerIndex ] );
	});

	// Input additional layers visibility event
	$('#additionalLayers').on("click", 'input.visibilityRadio', function(){
		var layerIndex = parseInt( $(this).parent().parent().index() );
		
		var layer = gwAdditionalLayers[ layerIndex ];
		var isOn = $(this).is('.inputOn');
		layer.visible( isOn );
		
		$(this).parent().siblings('.slider').slider( isOn ? "enable" : "disable" );
	});
	
	// Delete layer event
	$('#additionalLayers').on("click",'.deleteLayer', function(){
		
		$(this).parent().fadeOut(300, function(){
			$(this).remove();
		});
		var layerIndex = parseInt( $(this).parent().index() );
		var layer = gwAdditionalLayers[ layerIndex ];
		globe.removeLayer(layer);
		PickingManager.removePickableLayer( layer );
		gwAdditionalLayers.splice( layerIndex, 1 );
	});
}

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
	
		gwLayer = createLayerFromConf(layer);
		if( layer.background )
		{
			addBackgroundLayer( gwLayer );
		}
		else
		{
			addAdditionalLayer( gwLayer );
		}
	}
	
	// Create additional layers visibility button set
	$( ".layerVisibilityRadioDiv" ).buttonset();
	setVisibilityButtonsetLayout();
	
	// Init select menu
	$('select#backgroundLayers').selectmenu({
		icons: backgroundLayersIcons
	});
	
	initGuiEvents();
	
	// Setup the drag & drop listeners.
	$('canvas').on('dragover', handleDragOver);
	$('canvas').on('drop', handleDrop);
}

return {
	init: function(gl,layers) {
		// Store the globe in the global module variable
		globe = gl;
		
		// Call init layers
		initLayers(layers);
	},
	
	addAdditionalLayer: function( gwLayer ) {
		addAdditionalLayer( gwLayer );
	}
};

});
