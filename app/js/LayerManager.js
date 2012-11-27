
/**
 * LayerManager module
 */
define( [ "jquery.ui", "PickingManager", "StarLayer", "ConstellationLayer", "DynamicOSLayer", "ClusterLayer", "Utils",
	"underscore-min", "text!../templates/additionalLayer.html", "jquery.ui.selectmenu", "jquery.nicescroll.min" ], 
	function($, PickingManager, StarLayer, ConstellationLayer, DynamicOSLayer, ClusterLayer, Utils, _, additionalLayerHTMLTemplate) {

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
	dialogClass: 'errorBox'
});

/**
 * Private functions
 */

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

				// Add proxy url to quicklook url if not local
				if ( currentFeature.properties.quicklook && currentFeature.properties.quicklook.substring(0,4) == 'http' )
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
 * 	Load JSON file and add layer to the globe
 *
 *	@param gwLayer GlobWeb layer
 *	@param url Url to JSON containing feature collection in equatorial coordinates
 */
function handleJSONFeatureFromOpenSearch( gwLayer, url, startIndex )
{
	$.ajax({
		type: "GET",
		url: url + "startIndex=" + startIndex + "&count=500",
		success: function(response){
			handleFeatureCollection( response.features );
			gwLayer.addFeatureCollection( response );
			if ( startIndex + response.features.length < response.totalResults ) {
				handleJSONFeatureFromOpenSearch( gwLayer, url, startIndex + response.features.length );
			} else {
				PickingManager.addPickableLayer( gwLayer );
			}
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

	if ( layer.color )
	{
		var rgb = GlobWeb.FeatureStyle.fromStringToColor( layer.color );
	}
	else
	{
		// generate random color
		var rgb = Utils.generateColor();
	}
	var rgba = rgb.concat([1]);
	
	var defaultVectorStyle = new GlobWeb.FeatureStyle({ 
				rendererHint: "Basic", 
				opacity: layer.opacity/100.,
				iconUrl: "css/images/star.png",
				fillColor: rgba,
				strokeColor: rgba
			});

	switch(layer.type){
		case "healpix":
			// Add necessary option
			options.baseUrl = layer.url;
			gwLayer = new GlobWeb.HEALPixLayer(options);
			break;
			
		case "star":
			// Create style
			options.style = new GlobWeb.FeatureStyle({
				opacity: layer.opacity / 100.,
				fillColor: [1., 1., 1., 1.]
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
				fillColor: [0.03125, 0.23046875, 0.65625, 1.],
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
			options.style = defaultVectorStyle;
			gwLayer = new GlobWeb.VectorLayer(options);
			handleJSONFeature( gwLayer, layer.url );
			break;
			
		case "StaticOpenSearch":
			options.style = defaultVectorStyle;			
			gwLayer = new GlobWeb.VectorLayer(options);
			handleJSONFeatureFromOpenSearch( gwLayer, layer.url, 1 );
			break;
			
		case "DynamicOpenSearch":
			
			// Add necessary option			
			options.serviceUrl = layer.serviceUrl;
			options.minOrder = layer.minOrder;
			if (layer.displayProperties)
				options.displayProperties = layer.displayProperties;
			
			options.style = defaultVectorStyle;
			gwLayer = new DynamicOSLayer( options );
			PickingManager.addPickableLayer( gwLayer );
			break;
		case "ClusterLayer":
			options.serviceUrl = layer.serviceUrl;

			// TODO modify the structure of conf.json maybe ?
			if( layer.maxOrder )
				options.maxOrder = layer.maxOrder;
			if ( layer.orderDepth )
				options.orderDepth = layer.orderDepth;
			if ( layer.treshold )
				options.treshold = layer.treshold;
			
			options.style = defaultVectorStyle;
			options.style.iconUrl = "css/images/lensstar.png";
			gwLayer = new ClusterLayer( options );
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
			
			// generate random color
			var rgb = Utils.generateColor();
			var rgba = rgb.concat([1]);
			
			// Create style
			var options = {name: name};
			options.style = new GlobWeb.FeatureStyle({ rendererHint: "Basic", iconUrl: "css/images/star.png", fillColor: rgba, strokeColor: rgba });
			gwLayer = new GlobWeb.VectorLayer( options );
			
			// Add geoJson layer
			handleEquatorialFeatureCollection ( gwLayer, response );
			addAdditionalLayer( gwLayer );

			$('#layerManager').getNiceScroll().resize();
			
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
	var currentIndex = gwLayer.id;
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
	var currentIndex = gwLayer.id;
	var cssColor = "rgb(1,1,1)";

	if (gwLayer.style)
	{
		cssColor = "rgb("+Math.floor(gwLayer.style.fillColor[0]*255)+","+Math.floor(gwLayer.style.fillColor[1]*255)+","+Math.floor(gwLayer.style.fillColor[2]*255)+")";
	}

	var layerDiv = additionalLayerTemplate( { layer: gwLayer, currentIndex: currentIndex, layerColor: cssColor } );

	var $layerDiv = $(layerDiv)
		.appendTo('#additionalLayers');
			
	// Slider initialisation
	$('#slider_'+currentIndex).slider({
		value: gwLayer.opacity()*100,
		min: 20,
		max: 100,
		step: 20,
		slide: function( event, ui ) {
			$( "#percentInput_"+currentIndex ).val( ui.value + "%" );
			gwLayer.opacity( ui.value/100. );
		}
	}).slider( "option", "disabled", !gwLayer.visible() );
	
	// Init percent input of slider
	$( "#percentInput_"+currentIndex ).val( $( "#slider_"+currentIndex ).slider( "value" ) + "%" );
		
	// Hide the opacity div, open it only when the user clicks on the layer
	var opacityDiv = $('#opacity_'+currentIndex);
	opacityDiv.hide();
	$layerDiv.children().not('.deleteLayer,.ui-button').click( function() {
			opacityDiv.slideToggle();
	});
		
	// Manage 'custom' checkbox
	// jQuery UI button is not sexy enough :)
	// Toggle some classes when the user clicks on the visibility checkbox
	$('#visible_'+currentIndex).click( function() {
		var isOn = !$(this).hasClass('ui-state-active');
		gwLayer.visible( isOn );
		$layerDiv.find('.slider').slider( isOn ? "enable" : "disable" );
		if ( isOn )
			opacityDiv.slideDown();
		else
			opacityDiv.slideUp();
		$(this).toggleClass('ui-state-active');
		$(this).toggleClass('ui-state-default');
		$(this).find('span').toggleClass('ui-icon-check');
		$(this).find('span').toggleClass('ui-icon-empty');
	});
	
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

	// Spinner event
	globe.subscribe("startLoad", function(id){
		$('#addLayer_'+id).find('.spinner').stop(true,true).fadeIn('fast');
	});
	globe.subscribe("endLoad", function(id){
		$('#addLayer_'+id).find('.spinner').fadeOut(500);
	});
}

function initGuiEvents ()
{
	
	// Background selection visibility event
	$('#backgroundLayers-menu li').click(function(){
		var layerIndex = parseInt( $(this).index() );
		globe.setBaseImagery( gwBaseLayers[ layerIndex ] );
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

		$('#layerManager').getNiceScroll().resize();
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
