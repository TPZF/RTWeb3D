
/**
 * Name resolver module : search object name and zoom to them
 */
define(["jquery.ui", "Utils"], function($,Utils) {

var globe;
var astroNavigator;
var configuration = {zoomFov: 15.};

// Target layer
var style = new GlobWeb.FeatureStyle({
	iconUrl: "css/images/target.png",
	fillColor: [1., 1., 1., 1.]
 });
var targetLayer = new GlobWeb.VectorLayer({ style: style });
// Zooming destination feature
var targetFeature;

function setSearchBehavior()
{
	globe.addLayer( targetLayer );
	globe.subscribe("startNavigation", removeTarget);

	var input = $('#searchInput');
	var clear = $('#searchClear');
	var animationDuration = 300;
	var defaultText = input.val();
	
	// Set style animations
	input.bind('focus', function() {
		if(input.val() === defaultText) {
			input.val('');
		}

		$(this).animate({color: '#000'}, animationDuration).parent().animate({backgroundColor: '#fff'}, animationDuration, function(){
			if(!(input.val() === '' || input.val() === defaultText)) 
			{
				clear.fadeIn(animationDuration);
			}
		}).addClass('focus');
	}).bind('blur', function(event) {
		
		$('#equatorialCoordinatesSearchResult').fadeOut(animationDuration);
		$(this).animate({color: '#b4bdc4'}, animationDuration, function() {
			if(input.val() === '') {
				input.val(defaultText)
			}
		}).parent().animate({backgroundColor: '#e8edf1'}, animationDuration).removeClass('focus');
	}).keyup(function() {
		if(input.val() === '') {
			clear.fadeOut(animationDuration);
		} else {
			clear.fadeIn(animationDuration);
		}
	});
	
	// Submit event
	$('#searchForm').submit(function(event){
		event.preventDefault();

		var objectName = $("#searchInput").val();
		
		// regexp used only to distinct equatorial coordinates and objects
		// TODO more accurate ( "x < 24h", "x < 60mn", etc.. )
		var coordinatesExp = new RegExp("\\d{1,2}h\\d{1,2}m\\d{1,2}([\\.]\\d+)?s\\s[-+]?[\\d]+°\\d{1,2}'\\d{1,2}([\\.]\\d+)?\"", "g");
		if ( objectName.match( coordinatesExp ) )
		{
			// Format to equatorial coordinates
			var word = objectName.split(" "); // [RA, Dec]
			word[0] = word[0].replace("h"," ");
			word[0] = word[0].replace("m"," ");
			word[0] = word[0].replace("s","");
			
			word[1] = word[1].replace("°"," ");
			word[1] = word[1].replace("'"," ");
			word[1] = word[1].replace("\"","");
			
			// Convert to geo and zoom
			var geoPos = [];
			GlobWeb.CoordinateSystem.fromEquatorialToGeo([word[0], word[1]], geoPos);
			astroNavigator.zoomTo(geoPos, configuration.zoomFov);
			addTarget(geoPos[0], geoPos[1]);
		}
		else
		{
			// Name of the object which could be potentially found by name resolver
			var url = configuration.baseUrl + "/" + objectName +"/EQUATORIAL";
			$('#equatorialCoordinatesSearchResult').fadeOut(animationDuration);
			$.ajax({
				type: "GET",
				url: url,
				success: function(response){
					if(response.dec && response.ra)
					{
						var equatorial = [];
						GlobWeb.CoordinateSystem.fromGeoToEquatorial([response.ra, response.dec], equatorial);
				
						$("#equatorialCoordinatesSearchResult").html("<em>Ra:</em> " + equatorial[0] + "<br /><em>Dec:</em> " + equatorial[1] + "<br/> Found in " + response.name + " database");

						$('#equatorialCoordinatesSearchResult').fadeIn(animationDuration);
						astroNavigator.zoomTo([response.ra, response.dec], configuration.zoomFov );
						addTarget(response.ra, response.dec);
					} else {
						$('#equatorialCoordinatesSearchResult').html("Enter object name");
						$('#equatorialCoordinatesSearchResult').fadeIn(animationDuration);
					}
				},
				error: function (xhr, ajaxOptions, thrownError) {
					$('#equatorialCoordinatesSearchResult').html("Not found");
					$('#equatorialCoordinatesSearchResult').fadeIn(animationDuration);
					console.error( xhr.responseText );
				}
			});
		}
	});
	
	$('#searchClear').click(function(event){
		if(input.val() !== defaultText) {
			input.val(defaultText);
		}
		clear.fadeOut(animationDuration);
		$('#searchInput').animate({color: '#b4bdc4'}, animationDuration).parent().animate({backgroundColor: '#e8edf1'}, animationDuration).removeClass('focus');
		
	});
}

/**
 *	Delete target image
 */
function removeTarget()
{
	if ( targetFeature )
	{
		targetLayer.removeFeature( targetFeature );
		targetFeature = null;
	}
}

/**
 *	Update targetFeature and add it to the target layer
 *
 *	@param lon Destination longitude/right ascension in degrees
 *	@param lat Destination latitude/declination in degrees
 */
function addTarget(lon, lat)
{
	targetFeature = {
		"geometry": {
			"coordinates": [
				lon,
				lat
			],
			"type": "Point"
		},
	"type": "Feature"
	};

	targetLayer.addFeature( targetFeature );
}

return {
	init: function(gl, nav, conf) {
		globe = gl;
		astroNavigator = nav;

		for( var x in conf )
		{
			configuration[x] = conf[x];
		}

		setSearchBehavior();
	}
};

});
