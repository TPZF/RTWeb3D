/**
*	Load files then fill constellationShapesLayer & constellationNamesLayer
*/
function initConstellations(globe) {
	
	var namesFile;
	var catalogueFile;
	
	var constellationShapesLayer = null;
	var constellationNamesLayer = null;
	var constellationNameFeatureCollection = {};
	var constellationShapesFeatureCollection = {};
	
	/*
	*	Asynchronous request to load constellation database composed of:
	*		1) ConstellationNames.tsv 	: containing correspondance between HR and constellation name
	*		2) bound_20.tsv 		: containing all information about each constellation
	*/
	var nameRequest = {
				type: "GET",
				url: "data/ConstellationNames.tsv",
				success: function(response){
					namesFile = response;
				},
				error: function (xhr, ajaxOptions, thrownError) {
					console.error( xhr.responseText );
				}
	};
	
	var catalogueRequest = {
				type: "GET",
				url: "data/bound_20.dat",
				success: function(response){
				       catalogueFile = response;
				},
				error: function (xhr, ajaxOptions, thrownError) {
					console.error( xhr.responseText );
				}
	};
	
	// Synchronizing two asynchronious requests with the same callback
	$.when($.ajax(nameRequest), $.ajax(catalogueRequest))
		.then(createConstellations,failure);

	/*
	 * 	Failure function
	 */
	function failure(){
		console.error( "Failed to load files" );
	}
	
	/*
	*	Create constellation names and shapes
	*/
	function createConstellations(){

		var constellationNames = [];
		var constellationShapes = [];
		var constellations = {};
		
		extractDatabase();
		createFeatures();
		addLayers();
		
		/**
		 *	Extract information in "constellations" variable
		 */
		function extractDatabase(){
			var constellationNamesTab = namesFile.split("\n");
			var catalogueTab = catalogueFile.split("\n");
			
			// For each constellation point
			for( var i=0; i<catalogueTab.length; i++ ){
				var word = catalogueTab[i].replace("  ", " ");
				word = word.split(" "); // word = "RA Decl Abbreviation "I"/"O"(Inerpolated/Original(Corner))"
				var RA = parseFloat(word[0]);
				var Decl = parseFloat(word[1]);
				var currentAbb = word[2];
				var IO = word[3];
				
				// Convert hours to degrees
				RA*=15;
				
				// If abbreviation doesn't exist
				if( !constellations[ currentAbb ] ){
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
			for( var i in constellations){
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
		}
		
		/**
		 * 	Add layers to the globe
		 */
		function addLayers(){
			// Create feature collections
			constellationShapesFeatureCollection = {
				type: "FeatureCollection",
				features : constellationShapes
			};
			constellationNameFeatureCollection = {
				type: "FeatureCollection",
				features : constellationNames
			};
			
			// Create style
			var options = {};
			options.style = new GlobWeb.FeatureStyle();
			options.style.label = true;
			options.style.iconUrl = null;
			
			// Create layers and attach features to the layers
			constellationShapesLayer = new GlobWeb.VectorLayer(options);
			constellationNamesLayer = new GlobWeb.VectorLayer(options);

			constellationShapesLayer.addFeatureCollection( constellationShapesFeatureCollection );
			constellationNamesLayer.addFeatureCollection( constellationNameFeatureCollection );
			
			globe.addLayer( constellationShapesLayer );
			globe.addLayer( constellationNamesLayer );
		}
	}

	// Init GUI
	$("#constellation").click(function(event){
		
		if ($("#constellation:checked").length)
		{
			constellationShapesLayer.addFeatureCollection( constellationShapesFeatureCollection );
			constellationNamesLayer.addFeatureCollection( constellationNameFeatureCollection );
		}
		else
		{
			constellationShapesLayer.removeFeatureCollection( constellationShapesFeatureCollection );
			constellationNamesLayer.removeFeatureCollection( constellationNameFeatureCollection );
		}
	});

}
