define( [ "jquery.ui" ],

function($) {

var globe;

function setBackgroundLayersButtonsetLayout()
{
	// Make it vertical
	$(':radio, :checkbox', '#backgroundLayers').wrap('<div style="margin: 1px"/>'); 
	$('label:first', '#backgroundLayers').removeClass('ui-corner-left').addClass('ui-corner-top');
	$('label:last', '#backgroundLayers').removeClass('ui-corner-right').addClass('ui-corner-bottom');
	
	// Make the same width for all labels
	mw = 100; // max witdh
	$('label', '#backgroundLayers').each(function(index){
		w = $(this).width();
		if (w > mw) mw = w; 
	});
	
	// Another way to find a max
	// mw = Math.max.apply(Math, $('label', '#ImageriesDiv').map(function(){ return $(this).width(); }).get());
	
	$('label', '#backgroundLayers').each(function(index){
		$(this).width(mw);
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
				
				// Add point to the chosen constellation
				constellations[ currentAbb ].coord.push(pos3d[0]);
				constellations[ currentAbb ].coord.push(pos3d[1]);
				constellations[ currentAbb ].coord.push(pos3d[2]);
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
						type: "SimpleLineCollection",
						coordinates: current.coord
					},
					properties: {
						name: current.name
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
						textColor: '#083BA8'
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
			globe.addLayer( constellationLayer );
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
							name: starName
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
		globe.addLayer( starLayer );
	}
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
			options.style = new GlobWeb.FeatureStyle();
			options.style.label = true;
			options.style.iconUrl = null;
			options.name = layer.name;
			options.attribution = layer.attribution;
			options.visible = layer.visible;
			
			gwLayer = new GlobWeb.VectorLayer(options);
			handleStarFeature( gwLayer, layer );		
			break;
		case "constellation":
			// Create style
			var options = {};
			options.style = new GlobWeb.FeatureStyle();
			options.style.label = true;
			options.style.iconUrl = null;
			options.name = layer.name;
			options.attribution = layer.attribution;
			options.visible = layer.visible;
			
			gwLayer = new GlobWeb.VectorLayer(options);
			handleConstellationFeature( gwLayer, layer );			
			break;
		case "grid":
			// TODO
/*			gwLayer = new GlobWeb.EquatorialGridLayer( {visible: visible} );
			globe.addLayer( gwLayer );*/
			break;
		case "healpixGrid":
			gwLayer = new GlobWeb.TileWireframeLayer( {visible: layer.visible});
			globe.addLayer( gwLayer );
			break;
		default:
			console.error("Not implemented");
	}
	
	return gwLayer;
}

/**
 *	Create the Html for addtionnal layers
 */
function createHtmlForLayer(layer,currentIndex) {
	var description = layer.description || "";		
	var layerDiv = 
		'<div class="ui-widget addLayer" id=addLayer_'+currentIndex+'>\
			<input id="addLayerInput_'+currentIndex+'" type="checkbox" value="'+currentIndex+'" name="showAdditionalLayer" />';
	
	// Optionnal icon
	if ( layer.icon )
		layerDiv += '<img src="'+layer.icon+'" />';
	
	layerDiv += 
			'<label title="'+description+'" for="addLayerInput_'+currentIndex+'">'+layer.name+'</label>\
			<div><label for="percentInput_'+currentIndex+'">Opacity: </label><input class="percentInput" type="text" id="percentInput_'+currentIndex+'"" /></div>\
			<div class="slider" id="slider_'+currentIndex+'"></div>\
		</div>';

	$(layerDiv)
		.appendTo('#additionalLayers')
		.find('input').attr('checked',layer.visible);
		
	// Slider initialisation
	$('#slider_'+currentIndex).slider({
		value: 100,
		min: 20,
		max: 100,
		step: 20,
		slide: function( event, ui ) {
			
			$( "#percentInput_"+currentIndex ).val( ui.value + "%" );
			
			var layerIndex = parseInt( $(this).siblings('input').val() );
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
	var tooltipIcon = "css/images/tooltip.png";

	var gwLayer;
	var gwBaseLayers = [];
	var gwAdditionalLayers = [];
	var nbBackgroundLayers = 0;
	var nbAddLayers = 0;
	for (var i=0; i<layers.length; i++) {
		var layer = layers[i];		
		gwLayer = createLayerFromConf(layer);
				
		var description = layer.description || "";
		
		if ( layer.background )
		{
			/***Background layer***/
			
			// Add to engine
			globe.setBaseImagery( gwLayer );
			gwBaseLayers.push( gwLayer );
			
			// Add HTML
			var currentIndex = nbBackgroundLayers;
			
			var layerDiv ='<input ' + (layer.visible ? 'checked="checked"': '') +' type="radio" id="backgroundLayerInput_'+currentIndex;
			layerDiv += '" name="backgroundLayers" value="'+currentIndex+'"/>';
			layerDiv += '<label title="'+description+'" for="backgroundLayerInput_'+currentIndex+'">'+layer.name+'</label>';
			$(layerDiv).appendTo('#backgroundLayers');
			
			nbBackgroundLayers++;

		}
		else
		{
			/***Additional layer***/
			
			// Add to engine
			gwAdditionalLayers.push( gwLayer );
			
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
	
	// Input additional layers event
	$('input[name=showAdditionalLayer]').click(function(){
		var layerIndex = parseInt( $(this).val() );
		
		var layer = gwAdditionalLayers[ layerIndex ];
		var isChecked = $(this).is(':checked');
		layer.visible( isChecked );
		
		$(this).siblings('.slider').slider( isChecked ? "enable" : "disable" );
	});
	
	// Create background layers button set
	$( "#backgroundLayers" ).buttonset();
	setBackgroundLayersButtonsetLayout();

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
