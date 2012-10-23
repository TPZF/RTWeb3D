/**
 * StarLayer module
 */
define( [ "jquery.ui" ], function($) {

/**
 * 	@constructor
 * 	@class
 * 	Specific star layer handling the stars from catalogue of the Brightest Stars (Ochsenbein+ 1988) from VizieR database
 *	
 * 	@param options Configuration options
 * 		<ul>
			<li>namesUrl : Url providing the stars name data(necessary option)</li>
			<li>catalogueUrl : Url providing all information about each star(necessary option)</li>
		</ul>
 */
StarLayer = function(options)
{
	GlobWeb.VectorLayer.prototype.constructor.call( this, options );

	if ( options.namesUrl && options.catalogueUrl )
	{
		this.loadFiles( options.namesUrl, options.catalogueUrl );
	}
	else
	{
		console.error("Not valid options");
		return false;
	}
}


/**************************************************************************************************************/

GlobWeb.inherits( GlobWeb.VectorLayer, StarLayer );

/**************************************************************************************************************/

var namesFile;
var catalogueFile;

/**
*	Asynchronous requests to load stars database
*
*	@param namesUrl Url of file containing couples between HR and star name
*	@param catalogueUrl Url containing all necessary information(as equatorial coordinates) about each star
*
* 	@see Search Catalogue of the Brightest Stars (Ochsenbein+ 1988) in VizieR database for more details
*/
StarLayer.prototype.loadFiles = function( namesUrl, catalogueUrl )
{
		

	var nameRequest = {
				type: "GET",
				url: namesUrl,
				success: function(response){
					namesFile = response;
				},
				error: function (xhr, ajaxOptions, thrownError) {
					console.error( xhr.responseText );
				}
	};
	
	var catalogueRequest = {
				type: "GET",
				url: catalogueUrl,
				success: function(response){
				       catalogueFile = response;
				},
				error: function (xhr, ajaxOptions, thrownError) {
					console.error( xhr.responseText );
				}
	};
	
	// Synchronizing two asynchronious requests with the same callback
	var self = this;
	$.when($.ajax(nameRequest), $.ajax(catalogueRequest))
		.then(function(){ self.handleFeatures(); },failure);
		
	function failure()
	{
		console.error( "Failed to load files" );
	}
}

/**
 * 	Handle features on layer
 */
StarLayer.prototype.handleFeatures = function()
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
	
	this.addFeatureCollection( poiFeatureCollection );
}

return StarLayer;

});