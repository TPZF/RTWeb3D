
/**
 * LayerManager module
 */
define( [ "jquery.ui", "PickingManager", "underscore-min", "text!../templates/additionalLayer.html", "jquery.ui.selectmenu" ], function($, PickingManager, _, additionalLayerHTMLTemplate) {

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
*	Load files then remplies layers
* 	@param constellationLayer Layer which will contain constellation features
*	@param layer JSON layer
*/
function handleConstellationFeature(constellationLayer, layer )
{
	
	var namesFile;
	var catalogueFile;
	
	/*
	*	Asynchronous request to load constellation database composed of:
	*		1) ConstellationNames.tsv 	: containing correspondance between HR and constellation name
	*		2) bound_20.tsv 		: containing all information about each constellation
	*/
	var nameRequest = {
				type: "GET",
				url: layer.nameUrl,
				success: function(response){
					namesFile = response;
				},
				error: function (xhr, ajaxOptions, thrownError) {
					console.error( xhr.responseText );
				}
	};
	
	var catalogueRequest = {
				type: "GET",
				url: layer.catalogueUrl,
				success: function(response){
				       catalogueFile = response;
				},
				error: function (xhr, ajaxOptions, thrownError) {
					console.error( xhr.responseText );
				}
	};
	
	
	/*
	 * 	Failure function
	 */
	function failure(){
		console.error( "Failed to load files" );
	}

	// Synchronizing two asynchronious requests with the same callback
	$.when($.ajax(nameRequest), $.ajax(catalogueRequest))
		.then(createConstellations,failure);
	
	/*
	*	Create constellation names and shapes
	*/
	function createConstellations(){
		
		var constellationNames = [];
		var constellationShapes = [];
		var constellations = {};
		
		var constellationNameFeatureCollection = {};
		var constellationShapesFeatureCollection = {};
		
		extractDatabase();
		createFeatures();
		
		/**
		 *	Extract information in "constellations" variable
		 */
		function extractDatabase(){
			var constellationNamesTab = namesFile.split("\n");
			var catalogueTab = catalogueFile.split("\n");
			
			// For each constellation point
			for ( var i=0; i<catalogueTab.length; i++ )
			{
				var word = catalogueTab[i].replace("  ", " ");
				word = word.split(" "); // word = "RA Decl Abbreviation "I"/"O"(Inerpolated/Original(Corner))"
				var RA = parseFloat(word[0]);
				var Decl = parseFloat(word[1]);
				var currentAbb = word[2];
				var IO = word[3];
				
				// Convert hours to degrees
				RA*=15;
				
				// If abbreviation doesn't exist
				if ( !constellations[ currentAbb ] ){
					// Find constellation name
					for( j=0; j<constellationNamesTab.length; j++ ){
						var word = constellationNamesTab[j].split(";"); // word[0] = abbreviation, word[1] = name;
						var abb = word[0];
						
						if( abb == currentAbb ){
							var name = word[1];
							
							// Add new constellation as a property
							constellations[ currentAbb ] = {
								coord : [],
								name : name,
								
								// Values used to calculate the position of the center of constellation
								x : 0.,
								y : 0.,
								z : 0.,
								nbStars : 0
							}
							break;
						}
					}
				}
				
				// Calculate the center of constillation
				var pos3d = [];
				// Need to convert to 3D because of 0h -> 24h notation
				GlobWeb.CoordinateSystem.fromGeoTo3D([RA, Decl], pos3d);
				constellations[ currentAbb ].x+=pos3d[0];
				constellations[ currentAbb ].y+=pos3d[1];
				constellations[ currentAbb ].z+=pos3d[2];
				constellations[ currentAbb ].nbStars++;

				constellations[ currentAbb ].coord.push([RA, Decl]);
			}
		}
		
		/**
		 * 	Create geoJson features
		 */
		function createFeatures(){
			
			// Fill constellationShapes & constellationNames
			for ( var i in constellations)
			{
				var current = constellations[i];
				
				var constellationShape = {
					geometry: {
						type: "Polygon",
						coordinates: [current.coord]
					},
					properties: {
						name: current.name,
					}
				};
				
				constellationShapes.push( constellationShape );
					
				// Compute mean value to show the constellation name in the center of constellation..
				// .. sometimes out of constellation's perimeter because of the awkward constellation's shape(ex. "Hydra" or "Draco" constellations)
				var geoPos = [];
				GlobWeb.CoordinateSystem.from3DToGeo([current.x/current.nbStars, current.y/current.nbStars, current.z/current.nbStars], geoPos);
				
				var constellationName = {
					geometry: {
						type: "Point",
						coordinates: [geoPos[0], geoPos[1]]
					},
					properties: {
						name: current.name,
						style: new GlobWeb.FeatureStyle({ textColor: '#083BA8', label: current.name })
					}
				};
				constellationNames.push( constellationName );
			}
			
			// Create feature collections
			constellationShapesFeatureCollection = {
				type: "FeatureCollection",
				features : constellationShapes
			};
			constellationNameFeatureCollection = {
				type: "FeatureCollection",
				features : constellationNames
			};
			
			// Add it to the constellationLayer
			constellationLayer.addFeatureCollection( constellationShapesFeatureCollection );
			constellationLayer.addFeatureCollection( constellationNameFeatureCollection );
		}
	}
	
}

/**
*	Load files then add necessary information on layer
* 	@param starLayer Layer which will contain the data as FeatureCollection
* 	@param layer JSON layer
*/
function handleStarFeature(starLayer, layer)
{
	var namesFile;
	var catalogueFile;
		
	/*
	*	Asynchronous requests to load stars database composed of:
	*		1) Names.tsv 	 : containing couples between HR and star name
	*		2) Catalogue.tsv : containing all necessary information(as equatorial coordinates) about each star
	*/
	var nameRequest = {
				type: "GET",
				url: layer.nameUrl,
				success: function(response){
					namesFile = response;
				},
				error: function (xhr, ajaxOptions, thrownError) {
					console.error( xhr.responseText );
				}
	};
	
	var catalogueRequest = {
				type: "GET",
				url: layer.catalogueUrl,
				success: function(response){
				       catalogueFile = response;
				},
				error: function (xhr, ajaxOptions, thrownError) {
					console.error( xhr.responseText );
				}
	};
	
	// Synchronizing two asynchronious requests with the same callback
	$.when($.ajax(nameRequest), $.ajax(catalogueRequest))
		.then(createPOIs,failure);
	
	function failure()
	{
		console.error( "Failed to load files" );
	}
	
	function createPOIs()
	{
		// Extract the table data
		var tmpTab = namesFile.slice(namesFile.indexOf("897;Acamar"), namesFile.indexOf('1231;Zaurak')+11);
		var namesTab = tmpTab.split("\n");
		tmpTab = catalogueFile.slice(catalogueFile.indexOf("001."), catalogueFile.indexOf("4.98;K3Ibv")+10);
		var catalogueTab = tmpTab.split("\n");
		var pois = [];
		
		// For each known star
		for ( var i=0; i<namesTab.length; i++ )
		{
			var word = namesTab[i].split(";"); // word[0] = HR, word[1] = name;
			var HR = parseInt(word[0]);
			var starName = word[1];
				
			// Search corresponding HR in catalogue
			for ( var j=0; j<catalogueTab.length; j++ )
			{
				word = catalogueTab[j].split(";");
				if (parseInt(word[2]) == HR){
					// Star found in the catalogue
					
					var raString = word[6];   // right ascension format : "hours minutes seconds"
					var declString = word[7]; // declinaton format : "degrees minutes seconds"
					
					var geo = [];
					GlobWeb.CoordinateSystem.fromEquatorialToGeo([raString, declString], geo);
					
					// Add poi layer
					var poi = {
						geometry: {
							type: "Point",
							coordinates: [geo[0],geo[1]]
						},
						properties: {
							name: starName,
							style: new GlobWeb.FeatureStyle({ label: starName })
						}
					};
					pois.push(poi);
				}
			}
		}
		
		// Create feature collection
		var poiFeatureCollection = {
			type: "FeatureCollection",
			features : pois
		};
		
		starLayer.addFeatureCollection( poiFeatureCollection );
	}
}

/**
 * 	Recompute geometry from equatorial coordinates to geo for each feature
 */
function recomputeFeaturesGeometry(features)
{
	for ( var i in features )
	{
		var currentFeature = features[i];
		var ring = currentFeature.geometry.coordinates[0];
		for ( var j = 0; j < ring.length; j++ )
		{
			if ( ring[j][0] > 180 )
				ring[j][0] -= 360;
		}
		
	}
}


/**
 * 	Load GeoJSON file and add layer to the globe
 */
function handleGeoJSONFeature(gwLayer, layer )
{
	$.ajax({
		type: "GET",
		url: layer.url,
		success: function(response){
			
			recomputeFeaturesGeometry( response.features );
			
			gwLayer.addFeatureCollection( response );
			PickingManager.addPickableLayer( gwLayer );
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
			gwLayer = new GlobWeb.HEALPixLayer( { name: layer.name, baseUrl: layer.url, attribution: layer.attribution, visible: layer.visible} );
			break;
		case "star":
			// Create style
			var options = {};
			options.style = new GlobWeb.FeatureStyle( {opacity: layer.opacity / 100.} );
			options.name = layer.name;
			options.attribution = layer.attribution;
			options.visible = layer.visible;
			
			gwLayer = new GlobWeb.VectorLayer(options);
			handleStarFeature( gwLayer, layer );
			break;
		case "constellation":
			// Create style
			var options = {};
			options.style = new GlobWeb.FeatureStyle( { strokeColor: [0.03125, 0.23046875, 0.65625, 1.], rendererHint: "Basic", opacity: layer.opacity / 100. });
			options.name = layer.name;
			options.attribution = layer.attribution;
			options.visible = layer.visible;
			
			gwLayer = new GlobWeb.VectorLayer(options);
			handleConstellationFeature( gwLayer, layer );
			break;
		case "grid":
			gwLayer = new GlobWeb.EquatorialGridLayer( {visible: layer.visible} );
			break;
		case "healpixGrid":
			gwLayer = new GlobWeb.TileWireframeLayer( {visible: layer.visible});
			break;
		case "GeoJSON":
			// Create style
			var options = {};
			options.style = new GlobWeb.FeatureStyle({ rendererHint: "Basic", opacity: layer.opacity});
			options.name = layer.name;
			options.attribution = layer.attribution;
			options.visible = layer.visible;
			
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
	for (var i = 0, f; f = files[i]; i++) {
		
		// TODO don't work with multiple files
		var name = f.name;
		
		// TODO alert if not json
// 		if (!f.type.match('application/json')) {
// 			alert('Not a JSON file!');
// 		}

		var reader = new FileReader();
		
		reader.onloadend = function(e) {
			// Create style
			var options = {};
			options.style = new GlobWeb.FeatureStyle({ rendererHint: "Basic"});
			options.name = name;
			gwLayer = new GlobWeb.VectorLayer( options );
			
			var response = JSON.parse(this.result);
			recomputeFeaturesGeometry( response.features );
			gwLayer.addFeatureCollection( response );
			PickingManager.addPickableLayer( gwLayer );
			
			// Add to engine
			gwAdditionalLayers.push( gwLayer );
			globe.addLayer( gwLayer );
			
			var layer = {visible: true, opacity: 100., name: name}
			
			// Add HTML
			var currentIndex = nbAddLayers;
			createHtmlForLayer(layer,currentIndex);
			
			nbAddLayers++;
			
			// Create additional layers visibility button set
			$( ".layerVisibilityRadioDiv" ).buttonset()
			
		};
		reader.readAsText(f);
	}
}

/**
 * 	Drag over event
 */
function handleDragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

/**
 *	Create the Html for addtionnal layers
 */
function createHtmlForLayer(layer,currentIndex) {

	var layerDiv = additionalLayerTemplate( { layer: layer, currentIndex: currentIndex } );

	$(layerDiv)
		.appendTo('#additionalLayers');

	// Slider initialisation
	$('#slider_'+currentIndex).slider({
		value: layer.opacity,
		min: 20,
		max: 100,
		step: 20,
		slide: function( event, ui ) {
			$( "#percentInput_"+currentIndex ).val( ui.value + "%" );
			var layerIndex = parseInt( $(this).parent().index() );
			var layer = gwAdditionalLayers[ layerIndex ];
			layer.opacity( ui.value/100. );
		}
	}).slider( "option", "disabled", !layer.visible );

	// Init percent input of slider
	$( "#percentInput_"+currentIndex ).val( $( "#slider_"+currentIndex ).slider( "value" ) + "%" );
}

/**
 *	Fill the LayerManager table
 */
function initLayers(layers) {
	
	// Necessary to drag&drop option while using jQuery
	$.event.props.push('dataTransfer');
	
	for (var i=0; i<layers.length; i++) {
		var layer = layers[i];
		
		// Define default optionnal parameters
		if(!layer.opacity)
			layer.opacity = 100.;
		if(!layer.description)
			layer.description = "";
		
		gwLayer = createLayerFromConf(layer);
		
		if ( layer.background )
		{
			/***Background layer***/
			
			// Add to engine
			if ( layer.visible ) {
				globe.setBaseImagery( gwLayer );
			}
			gwBaseLayers.push( gwLayer );
			
			// Add HTML
			var currentIndex = nbBackgroundLayers;
			var currentClass;
			
			var layerDiv ='<option value="'+ currentIndex +'" class="">'+ layer.name + '</option>"';
			
			
			if ( layer.icon )
			{
				// Create icon style
				var sheet = document.createElement('style');
				sheet.innerHTML = ".backgroundLayer_" + currentIndex + " .ui-selectmenu-item-icon { background: url("+layer.icon+") 0 0 no-repeat; }";
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
			if ( layer.visible )
			{
				$('#backgroundLayers').val( $(layerDiv).val() );
			}
			
			nbBackgroundLayers++;

		}
		else
		{
			/***Additional layer***/
			
			// Add to engine
			gwAdditionalLayers.push( gwLayer );
			globe.addLayer( gwLayer );
			
			// Add HTML
			var currentIndex = nbAddLayers;
			createHtmlForLayer(layer,currentIndex);
			
			nbAddLayers++;
		}
	}
		
	// Input background layers event
	$('input[name=backgroundLayers]').click(function(){
		var layerIndex = parseInt( $(this).val() );
		if ( $(this).is(':checked') ){
			globe.setBaseImagery( gwBaseLayers[ layerIndex ] );
		}
	});
		
	// Create additional layers visibility button set
	$( ".layerVisibilityRadioDiv" ).buttonset();
	setVisibilityButtonsetLayout();

	// Init select menu
	$('select#backgroundLayers').selectmenu({
		icons: backgroundLayersIcons
	});
	
	// Background selection visibility event
	$('#backgroundLayers-menu li').click(function(){
		var layerIndex = parseInt( $(this).index() );
		globe.setBaseImagery( gwBaseLayers[ layerIndex ] );
	});

	// Input additional layers visibility event
	$('#additionalLayers').on('click', 'input.visibilityRadio', function(){
		var layerIndex = parseInt( $(this).parent().parent().index() );
		
		var layer = gwAdditionalLayers[ layerIndex ];
		var isOn = $(this).is('.inputOn');
		layer.visible( isOn );
		
		$(this).parent().siblings('.slider').slider( isOn ? "enable" : "disable" );
	});
	
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
	}
};

});
