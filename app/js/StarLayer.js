/**
 * StarLayer module
 */
define( [ "jquery.ui" ], function($) {

var layerToFill;

var namesFile;
var catalogueFile;

function loadFiles( layer )
{
		
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
		.then(handleFeatures,failure);
		
	function failure()
	{
		console.error( "Failed to load files" );
	}
}

/**
 * 	Handle features on layer
 */
function handleFeatures()
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
	
	layerToFill.addFeatureCollection( poiFeatureCollection );
}

return {
	fillLayer: function( gwLayer, layer ) 
	{
		layerToFill = gwLayer;
		loadFiles( layer );
	}
};

});