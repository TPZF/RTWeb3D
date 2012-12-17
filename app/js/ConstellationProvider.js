/**
 * ConstellationProvider module
 *
 * Specific constellation catalogue provider from VizieR database
 * @see http://vizier.cfa.harvard.edu/viz-bin/ftp-index?VI/49
 *
 */
define( [ "jquery.ui", "LayerManager" ], function($, LayerManager) {


/**************************************************************************************************************/

var namesFile;
var catalogueFile;

var constellations = {};

/**
*	Asynchronous request to load constellation data 
*
* 	@param configuration Configuration options
* 		<ul>
*			<li>nameUrl : Url providing the constellations name data(necessary option)</li>
*			<li>catalogueUrl : Url providing all information about each constellation(necessary option)</li>
*		</ul>
*	@see http://vizier.cfa.harvard.edu/viz-bin/ftp-index?VI/49
*/
function loadFiles( gwLayer, configuration )
{
	if ( configuration.nameUrl && configuration.catalogueUrl )
	{
		// loadFiles( configuration.nameUrl, configuration.catalogueUrl );
		var nameRequest = {
			type: "GET",
			url: configuration.nameUrl,
			success: function(response){
				namesFile = response;
			},
			error: function (xhr, ajaxOptions, thrownError) {
				console.error( xhr.responseText );
			}
		};
		
		var catalogueRequest = {
			type: "GET",
			url: configuration.catalogueUrl,
			success: function(response){
		       catalogueFile = response;
			},
			error: function (xhr, ajaxOptions, thrownError) {
				console.error( xhr.responseText );
			}
		};
	
		var self = this;
		// Synchronizing two asynchronious requests with the same callback
		$.when($.ajax(nameRequest), $.ajax(catalogueRequest))
			.then( function() { extractDatabase(); handleFeatures(gwLayer); },failure);
	}
	else
	{
		console.error("Not valid options");
		return false;
	}
}

/**************************************************************************************************************/

/**
*	Extract information in "constellation" variables
*/
function extractDatabase()
{
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

/**************************************************************************************************************/

/**
* 	Create geoJson features
*/
function handleFeatures(gwLayer)
{
	
	var constellationNamesFeatures = [];
	var constellationShapesFeatures = [];
	
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
		
		constellationShapesFeatures.push( constellationShape );
			
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
				style: new GlobWeb.FeatureStyle({ textColor: '#083BA8', fillColor: [1.,1.,1.,1.], label: current.name })
			}
		};
		constellationNamesFeatures.push( constellationName );
	}
	
	// Create feature collections
	var constellationShapesFeatureCollection = {
		type: "FeatureCollection",
		features : constellationShapesFeatures
	};
	var constellationNameFeatureCollection = {
		type: "FeatureCollection",
		features : constellationNamesFeatures
	};
	
	// Add shapes&names to the layer
	gwLayer.addFeatureCollection( constellationShapesFeatureCollection );
	gwLayer.addFeatureCollection( constellationNameFeatureCollection );
}

/**************************************************************************************************************/

/*
 * 	Failure function
 */
function failure(){
	console.error( "Failed to load files" );
}

/**************************************************************************************************************/

// Register the data provider

LayerManager.registerDataProvider("constellation", loadFiles);

});