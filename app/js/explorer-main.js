
/**
 * Configuration for require.js
 */
require.config({
	paths: {
		"jquery": "../externals/jquery-1.11.1.min",
		"jquery.ui": "../externals/jquery-ui-1.11.0.min",
		"underscore-min": "../externals/underscore-1.6.0.min",
		"jquery.nicescroll.min": "../externals/jquery.nicescroll-3.5.4.min",
		"fits": "../externals/fits",
		"samp": "../externals/samp",
		"gzip": "../externals/gzip",
		"crc32": "../externals/crc32",
		"deflate-js": "../externals/deflate",
		"inflate-js": "../externals/inflate",
		"wcs": "../externals/wcs",
		"jquery.ui.timepicker": "../externals/jquery.ui.timepicker",
		"gw": "../externals/GlobWeb/src/",
		"datatables": "http://cdn.datatables.net/1.10.1/js/jquery.dataTables"
	},
	shim: {
		'jquery': {
			deps: [],
			exports: 'jQuery'
		},
		'jquery.ui': {
			deps: ['jquery'],
			exports: 'jQuery'
		},
		'jquery.ui.timepicker': {
			deps: ['jquery.ui'],
			exports: 'jQuery'
		},
		'underscore-min': {
			deps: ['jquery'],
			exports: '_'
		},
		'jquery.nicescroll.min': {
			deps: ['jquery'],
			exports: ''
		}
	},
	waitSeconds: 0
});

/**
 * Mizar widget main
 */
require(["jquery", "./MizarWidget", "datatables"], function($, MizarWidget) {

	var options = {
		"nameResolver": {
			zoomFov: 2
		}
	};
	var mizar = new MizarWidget("#mizarWidget-div", options);

	var hstLayer = mizar.getLayer("HST");
	var table = $('#featureResults').DataTable( {
		"dom": '<"toolbar">frtip',
		"scrollY": "600px",
		"scrollCollapse": true,
		paging: false
	} );
	$("div.toolbar").html('Observations');
	
	// Highlight feature on hover
	$('#featureResults tbody')
        .on( 'mouseover', 'td', function () {
			var featureData = $(this).parent().data("featureData");
			if ( featureData )
				mizar.highlightObservation(featureData);
        } );
	
	// Update data table when features has been added on hstLayer
	mizar.subscribe("features:added", function(featureData){
		if ( hstLayer.name == featureData.layer.name )
		{
			// HST layer loading ended
			// Show received features
			console.log(featureData.features);
			var $tbody = $('#featureResults').find("tbody");

			for ( var i=0; i<featureData.features.length; i++ )
			{
				var feature = featureData.features[i];
				var row = table.row.add( [ feature.properties.identifier, feature.properties.Ra, feature.properties.Dec ] );
				$(row.node()).data("featureData",{feature: feature, layer: featureData.layer});
			}
			table.draw();
		}
	});
	
	// Make hstLayer visible once go to animation finished to launch the search
	mizar.subscribe("goTo:finished", function(){
		hstLayer.visible(true);
	});
	
	// Move to point of interest handler
	$('#poiTable tr td').click(function(event){
		// Clear observation results and hide hstLayer before move to animation
		hstLayer.visible(false);
		table.clear();
		// Retrive POI name and go for it
		var poiName = $(event.target).text();
		mizar.goTo(poiName);
	});
});