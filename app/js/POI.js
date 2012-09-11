/**
*	Fill the Points of Interest table and render them in the sky
*/
function initPOI(globe, astroNavigator) {
	
	var namesFile;
	var catalogueFile;
		
	/*
	*	Asynchronous requests to load stars database composed of:
	*		1) Names.tsv 	 : containing couples between HR and star name
	*		2) Catalogue.tsv : containing all necessary information(as equatorial coordinates) about each star
	*/
	var nameRequest = {
				type: "GET",
				url: "data/Names.tsv",
				success: function(response){
					namesFile = response;
				},
				error: function (xhr, ajaxOptions, thrownError) {
					console.error( xhr.responseText );
				}
	};
	
	var catalogueRequest = {
				type: "GET",
				url: "data/Catalogue.tsv",
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

		
	function failure(){
		console.error( "Failed to load files" );
	}
	
	/**
	* 	Appends to the poiTable all known stars and create the stars names in the sky
	*/
	function createPOIs(){
		// Extract the table data
		var tmpTab = namesFile.slice(namesFile.indexOf("897;Acamar"), namesFile.indexOf('1231;Zaurak')+11);
		var namesTab = tmpTab.split("\n");
		tmpTab = catalogueFile.slice(catalogueFile.indexOf("001."), catalogueFile.indexOf("4.98;K3Ibv")+10);
		var catalogueTab = tmpTab.split("\n");

		var poiTable = $("#poiTable");
		// Create style
		var options = {};
		options.style = new GlobWeb.FeatureStyle();
		options.style.label = true;
		options.style.iconUrl = null;
		
		// For each known star
		for(var i=0; i<namesTab.length; i++){
			var word = namesTab[i].split(";"); // word[0] = HR, word[1] = name;
			var HR = parseInt(word[0]);
			var starName = word[1];
				
			// Search corresponding HR in catalogue
			for(var j=0; j<catalogueTab.length; j++){
				word = catalogueTab[j].split(";");
				if(parseInt(word[2]) == HR){
					// Star found in the catalogue
					
					var raString = word[6];   // right ascension format : "hours minutes seconds"
					var declString = word[7]; // declinaton format : "degrees minutes seconds"
					
					var geo = [];
					GlobWeb.CoordinateSystem.fromEquatorialToGeo([raString, declString], geo);
					
					// Append new star to the poiTable
					var li = "<li class=\"poi\" RA=\""+raString+"\" Decl=\""+declString+"\" Long="+geo[0]+" Lat="+geo[1]+">"+starName+"</li>";
					poiTable.append(li);
					
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
					
					poiLayer = new GlobWeb.VectorLayer(options);
					poiLayer.addFeature( poi );
					
					globe.addLayer( poiLayer );
					
				}
			}
		}
		
		// Attach event to created li's
		$("#poiTable > li").click(function(event){
			astroNavigator.zoomTo([parseFloat($(this).attr("long")), parseFloat($(this).attr("lat"))], 15, 5000 );
		});
	}
}