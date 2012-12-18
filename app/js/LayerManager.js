
/**
 * LayerManager module
 */
define( [ "jquery.ui", "PickingManager", "ClusterLayer", "MocLayer", "MixLayer", "Utils", "ErrorDialog", "JsonProcessor", "ServiceBar",
	"underscore-min", "text!../templates/additionalLayer.html", "jquery.ui.selectmenu", "jquery.nicescroll.min" ], 
	function($, PickingManager, ClusterLayer, MocLayer, MixLayer, Utils, ErrorDialog, JsonProcessor, ServiceBar, _, additionalLayerHTMLTemplate) {

/**
 * Private variable for module
 */
 
 // The globe
var globe;
var gwLayer;
var navigation;
var gwBaseLayers = [];
var gwAdditionalLayers = [];
var backgroundLayersIcons = [];
var nbBackgroundLayers = 0;
var nbAddLayers = 0;
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
			options.baseUrl = layer.baseUrl;
			gwLayer = new GlobWeb.HEALPixLayer(options);
			break;
				
		case "equatorialGrid":
			gwLayer = new GlobWeb.EquatorialGridLayer( {name: layer.name, visible: layer.visible} );
			break;
			
		case "healpixGrid":
			gwLayer = new GlobWeb.TileWireframeLayer( {name: layer.name, visible: layer.visible, outline: layer.outline });
			break;
			
		case "GeoJSON":

			options.style = defaultVectorStyle;
			gwLayer = new GlobWeb.VectorLayer(options);

			if ( dataProviders[layer.data.type] )
			{
				var callback = dataProviders[layer.data.type];
				var data = callback(gwLayer, layer.data);
			}

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
			gwLayer = new GlobWeb.OpenSearchLayer( options );
			PickingManager.addPickableLayer( gwLayer );
			break;
		case "Cluster":
			options.serviceUrl = layer.serviceUrl;

			// TODO modify the structure of conf.json maybe ?
			if( layer.maxOrder )
				options.maxOrder = layer.maxOrder;
			if ( layer.orderDepth )
				options.orderDepth = layer.orderDepth;
			if ( layer.treshold )
				options.treshold = layer.treshold;
			
			options.style = defaultVectorStyle;
			options.style.iconUrl = layer.iconUrl || "css/images/cluster.png";
			gwLayer = new ClusterLayer( options );
			break;

		case "Moc":
			options.style = defaultVectorStyle;
			options.serviceUrl = layer.serviceUrl;
			gwLayer = new MocLayer( options );
			break;

		case "Mix":
			// Add necessary options
			options.featureServiceUrl = layer.featureServiceUrl;
			options.clusterServiceUrl = layer.clusterServiceUrl;
			options.minOrder = layer.minOrder;
			if (layer.displayProperties)
				options.displayProperties = layer.displayProperties;
			
			options.style = defaultVectorStyle;
			gwLayer = new MixLayer( options );
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
				ErrorDialog.open("JSON parsing error : " + e.type + "<br/> For more details see http://jsonlint.com/.");
				return false;
			}
			
			// generate random color
			var rgb = Utils.generateColor();
			var rgba = rgb.concat([1]);
			
			// Create style
			var options = {name: name};
			options.style = new GlobWeb.FeatureStyle({ rendererHint: "Basic", iconUrl: "css/images/star.png", fillColor: rgba, strokeColor: rgba });
			gwLayer = new GlobWeb.VectorLayer( options );
			gwLayer.deletable = true;

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
 *	Update scroll event
 */
function updateScroll()
{
	$('#layerManager').getNiceScroll().resize();
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
	var servicesDiv = $('#addLayer_'+currentIndex+' .layerTools');
	servicesDiv.hide();
	$('#additionalLayers').on("click", '#addLayer_'+currentIndex+' label', function() {
		servicesDiv.slideToggle(updateScroll);
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
		if ( isOn )
		{
			servicesDiv.slideDown(updateScroll);
		}
		else
		{
			servicesDiv.slideUp(updateScroll);
		}
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
		
		$(this).parent().parent().fadeOut(300, function(){
			$(this).remove();
		});
		var layerIndex = parseInt( $(this).parent().parent().index() );
		var layer = gwAdditionalLayers[ layerIndex ];
		globe.removeLayer(layer);
		PickingManager.removePickableLayer( layer );
		gwAdditionalLayers.splice( layerIndex, 1 );

		updateScroll();
	});

	// Services event
	$('#additionalLayers').on("click", ".service-off, .service-on", function(){
		var layerIndex = parseInt( $(this).parent().parent().index() );
		var layer = gwAdditionalLayers[ layerIndex ];

		if( $(this).is('.service-off') )
		{
			$(this).removeClass('service-off').addClass('service-on');;
			ServiceBar.addLayer(layer);
		}
		else
		{
			$(this).removeClass('service-on').addClass('service-off');
			ServiceBar.removeLayer(layer);
		}
	});

	// ZoomTo event (available for GlobWeb.VectorLayers only)
	$('#additionalLayers').on("click", ".zoomTo", function(){
		var layerIndex = parseInt( $(this).parent().parent().index() );
		var layer = gwAdditionalLayers[ layerIndex ];

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
	
		gwLayer = createLayerFromConf(layer);
		if ( gwLayer )
		{
			if( layer.background )
			{
				addBackgroundLayer( gwLayer );
			}
			else
			{
				addAdditionalLayer( gwLayer );
			}
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
		initLayers(configuration);
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
