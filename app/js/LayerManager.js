
/**
 * LayerManager module
 */
define( [ "jquery.ui", "PickingManager", "StarLayer", "ConstellationLayer", "underscore-min", "text!../templates/additionalLayer.html", "jquery.ui.selectmenu" ], function($, PickingManager, StarLayer, ConstellationLayer, _, additionalLayerHTMLTemplate) {

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
 * 	Recompute geometry from equatorial coordinates to geo for each feature
 */
function recomputeFeaturesGeometry( features )
{
	
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
				break;
			default:
				break;
		}
	}
}

function handleEquatorialFeatureCollection( gwLayer, featureCollection )
{
	
	recomputeFeaturesGeometry( featureCollection.features );
	gwLayer.addFeatureCollection( featureCollection );
	PickingManager.addPickableLayer( gwLayer );
}

/**
 * 	Load GeoJSON file and add layer to the globe
 */
function handleGeoJSONFeature( gwLayer, layer )
{
	$.ajax({
		type: "GET",
		url: layer.url,
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
	switch(layer.type){
		case "healpix":
			gwLayer = new GlobWeb.HEALPixLayer( { name: layer.name, baseUrl: layer.url, attribution: layer.attribution, visible: layer.visible, icon: layer.icon} );
			break;
		case "star":
			// Create style
			var options = {name: layer.name, attribution: layer.attribution, visible: layer.visible, icon: layer.icon, description: layer.description };
			options.style = new GlobWeb.FeatureStyle( {opacity: layer.opacity / 100.} );
			
			gwLayer = new GlobWeb.VectorLayer(options);
			StarLayer.fillLayer( gwLayer, layer );
			break;
		case "constellation":
			// Create style
			var options = { name: layer.name, attribution: layer.attribution, visible: layer.visible, icon: layer.icon, description: layer.description };
			options.style = new GlobWeb.FeatureStyle( { strokeColor: [0.03125, 0.23046875, 0.65625, 1.], rendererHint: "Basic", opacity: layer.opacity / 100., icon: layer.icon });
			
			gwLayer = new GlobWeb.VectorLayer(options);
			ConstellationLayer.fillLayer( gwLayer, layer );
			break;
		case "grid":
			gwLayer = new GlobWeb.EquatorialGridLayer( {name: layer.name, visible: layer.visible} );
			break;
		case "healpixGrid":
			gwLayer = new GlobWeb.TileWireframeLayer( {name: layer.name, visible: layer.visible});
			break;
		case "GeoJSON":
			// Create style
			var options = {name: layer.name, attribution: layer.attribution, visible: layer.visible, icon: layer.icon, description: layer.description };
			options.style = new GlobWeb.FeatureStyle({ rendererHint: "Basic", opacity: layer.opacity});
			
			gwLayer = new GlobWeb.VectorLayer(options);
			handleGeoJSONFeature( gwLayer, layer );
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
	
	// files is a FileList of File objects. List some properties.
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
			options.style = new GlobWeb.FeatureStyle({ rendererHint: "Basic"});
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
	// Input background layers event
// 	$('input[name=backgroundLayers]').click(function(){
// 		var layerIndex = parseInt( $(this).val() );
// 		if ( $(this).is(':checked') ){
// 			globe.setBaseImagery( gwBaseLayers[ layerIndex ] );
// 		}
// 	});
	
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
	
	$('#additionalLayers').on("click",'.deleteLayer', function(){
		
		$(this).parent().fadeOut(300, function(){
			$(this).remove();
		});
		var layerIndex = parseInt( $(this).parent().index() );
		gwAdditionalLayers[ layerIndex ]._detach( globe );
		PickingManager.removePickableLayer( gwAdditionalLayers[ layerIndex ] );
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
// 		if(!layer.description)
// 			layer.description = "";
// 		
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
