
/**
*	Fill the Points of Interest table
*/
function initPOI(globe) {
	
		
	// Initialize vector renderer manager used for stars name rendering
	var vectorRendererManager = new GlobWeb.VectorRendererManager(globe);
	var names;
	var catalogue;
	var readyCatalogue = false;
	var readyNames = false;
		
	/**
	*	Asynchronous requests to load stars database composed of:
	*		1) Names.tsv 	 : containing couples between HR and star name
	*		2) Catalogue.tsv : containing all necessary information about each star
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
		
		req.open( "GET", "data/Names.tsv", true );
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
		
		req2.open( "GET", "data/Catalogue.tsv", true );
		req2.send( null );
	}
	
	/**
	*	Appends to the poiTable all known stars
	*/
	function extractDatabase(){
		// extract the table data

		var tab = names.slice(names.indexOf("897;Acamar"), names.indexOf('1231;Zaurak')+11);
		var namesTab = tab.split("\n");
		
		tab = catalogue.slice(catalogue.indexOf("001."), catalogue.indexOf("4.98;K3Ibv")+10);
		var catalogueTab = tab.split("\n");

		// var oUl = document.getElementById("poiTable");
		var poiTable = $("#poiTable");
		
		// for each known star
		for(var i=0; i<namesTab.length; i++){
			var word = namesTab[i].split(";"); // word[0] = HR, word[1] = name;
			var HR = parseInt(word[0]);
			var starName = word[1];
				
			// search corresponding HR in catalogue
			for(var j=0; j<catalogueTab.length; j++){
				word = catalogueTab[j].split(";");
				if(parseInt(word[2]) == HR){
					// star found in catalogue
					
					var raString = word[6]; // ra format : "hours minutes seconds"
					var declString = word[7]; // decl format : "degrees minutes seconds"
					
					var geo = [];
					GlobWeb.CoordinateSystem.fromEquatorialToGeo([raString, declString], geo);
					
					// append new star to the poiTable
					// *** jQuery ***
					var li = "<li class=\"poi\" RA=\""+raString+"\" Decl=\""+declString+"\" Long="+geo[0]+" Lat="+geo[1]+">"+starName+"</li>";
					// var li = $('<li class="poi">' + starName + '</li>');
					// li.attr('RA',raString);
					// li.attr('Decl',declString);
					// li.attr('Long',geo[0]);
					// li.attr('Lat',geo[1]);
					poiTable.append(li);
					
					var style = new GlobWeb.FeatureStyle();
					
					var poi = {
						geometry: {
							type: "Point",
							coordinates: [geo[0],geo[1]]
						},
						properties: {
							name: starName
						}
					};
					
					style.label = true;
					style['iconUrl'] = null;
					vectorRendererManager.addFeature(poi,style);
					
					// *** JS ***
					// var oLi = document.createElement("li");
					
					// oLi.setAttribute("RA",raString);
					// oLi.setAttribute("Decl",declString);

					// oLi.setAttribute("Long",geo[0]);
					// oLi.setAttribute("Lat",geo[1]);
					
					// var oText = document.createTextNode(starName);
					
					// oLi.appendChild(oText);
					// oUl.appendChild(oLi);
				}
			}
		}
		
		// Attach event to created li's
		$("#poiTable > li").click(function(event){
			astroNavigator.zoomTo([parseFloat($(this).attr("long")), parseFloat($(this).attr("lat"))], 20000, 5000 );
		});
		
	}
	
	loadDatabase();
}