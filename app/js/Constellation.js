
/**
*	Load files then fill constellationShapesLayer & constellationNamesLayer
*/
function initConstellations(globe) {
	
	var constellationNameFeatureCollection = {};
	var constellationShapesFeatureCollection = {};
	var constellationShapesLayer = null;
	var constellationNamesLayer = null;
	
	var names;
	var catalogue;
	var readyNames = false;
	var readyCatalogue = false;
	var constellations = {};
	
	/*
	*	Asynchronous request to load stars database composed of:
	*		1) Names.tsv 	 : containing correspondance between HR and star name
	*		2) Catalogue.tsv : containing all information about each star
	*/
	function loadDatabase(){
		// read names.tsv
		var req = new XMLHttpRequest();
		req.crossOrigin = '';
		if ( req.overrideMimeType ) req.overrideMimeType( "text/xml" );
		req.onreadystatechange = function() {
			if( req.readyState == 4 ) {
				if( req.status == 0 || req.status == 200 ) {
					if ( req.responseText ) {
						names = req.responseText;
						readyNames = true;
						
						if( readyNames && readyCatalogue )
							extractDatabase();
						
					} else {
						console.error( "HEALPixRenderer: Empty or non-existing file (" + url + ")" );
					}
				}
			}
		}
		
		req.open( "GET", "data/ConstellationNames.tsv", true );
		req.send( null );

		// read catalogue.tsv
		var req2 = new XMLHttpRequest();
		if ( req2.overrideMimeType ) req2.overrideMimeType( "text/xml" );
		req2.onreadystatechange = function() {
			if( req2.readyState == 4 ) {
				if( req2.status == 0 || req2.status == 200 ) {
					if ( req2.responseText ) {
						catalogue = req2.responseText;
						readyCatalogue = true;
						
						if( readyNames && readyCatalogue )
							extractDatabase();
					} else {
						console.error( "HEALPixRenderer: Empty or non-existing file (" + url + ")" );
					}
				}
			}
		}
		
		req2.open( "GET", "data/bound_20.dat", true );
		req2.send( null );
	}
	
	/*
	*	Extract loaded database to the corresponding layers
	*/
	function extractDatabase(){
		
		var constellationNames = names.split("\n");
		var catalogueTab = catalogue.split("\n");
		
		// 
		for( var i=0; i<catalogueTab.length; i++ ){
			var word = catalogueTab[i].replace("  ", " ");
			word = word.split(" "); // word = "RA Decl Abbreviation "I"/"O"(Inerpolated/Original(Corner))"
			var currentAbb = word[2];
			var RA = parseFloat(word[0]);
			var Decl = parseFloat(word[1]);
			var IO = word[3];
			
			// convert hours to degrees
			RA*=15;
			
			if(!constellations[ currentAbb ]){
				// find constellation name if abbreviation don't exist
				for( j=0; j<constellationNames.length; j++ ){
					var word = constellationNames[j].split(";"); // word[0] = abbreviation, word[1] = name;
					var abb = word[0];
					
					if( abb == currentAbb ){
						var name = word[1];
						constellations[ currentAbb ] = {
							coord : [],
							name : name,
							
							// values used to calculate the position of the center of constellation
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
			// need to convert to 3D because of 0h -> 24h notation
			GlobWeb.CoordinateSystem.fromGeoTo3D([RA, Decl], pos3d);
			constellations[ currentAbb ].x+=pos3d[0];
			constellations[ currentAbb ].y+=pos3d[1];
			constellations[ currentAbb ].z+=pos3d[2];
			constellations[ currentAbb ].nbStars++;
			
			constellations[ currentAbb ].coord.push(pos3d[0]);
			constellations[ currentAbb ].coord.push(pos3d[1]);
			constellations[ currentAbb ].coord.push(pos3d[2]);
		}
		
		var constellationNames = [];
		var constellationShapes = [];
		// fill constellationShapes & constellationNames
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
				
			// compute mean value to show the constellation name in the center of constellation..
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

		// create features
		constellationShapesFeatureCollection = {
			type: "FeatureCollection",
			features : constellationShapes
		};
		
		constellationNameFeatureCollection = {
			type: "FeatureCollection",
			features : constellationNames
		};
		
		// create layers
		var options = {};
		options.style = new GlobWeb.FeatureStyle();
		options.style.label = true;
		options.style.iconUrl = null;
		
		constellationShapesLayer = new GlobWeb.VectorLayer(options);
		globe.addLayer( constellationShapesLayer );
		constellationNamesLayer = new GlobWeb.VectorLayer(options);
		globe.addLayer( constellationNamesLayer );
		
		// attach features to the layers
		constellationShapesLayer.addFeatureCollection( constellationShapesFeatureCollection );
		constellationNamesLayer.addFeatureCollection( constellationNameFeatureCollection );

	}
	
	loadDatabase();

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
