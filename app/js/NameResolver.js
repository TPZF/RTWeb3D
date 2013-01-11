
/**
 * Name resolver module : search object name and zoom to them
 */
define(["jquery.ui", "Utils", "underscore-min", "text!../templates/nameResolverResult.html"], function($, Utils, _, nameResolverResultHTMLTemplate) {

// Template generating the list of selected features
var nameResolverResultTemplate = _.template(nameResolverResultHTMLTemplate);

var globe;
var astroNavigator;
var configuration = {zoomFov: 15.};
var response;

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
		input.blur();

		var objectName = $("#searchInput").val();
		
		// regexp used only to distinct equatorial coordinates and objects
		// TODO more accurate ( "x < 24h", "x < 60mn", etc.. )

		objectName = objectName.replace(/\s{2,}/g, ' '); // Replace multiple spaces by a single one
		var coordinatesExp = new RegExp("\\d{1,2}h\\d{1,2}m\\d{1,2}([\\.]\\d+)?s\\s[-+]?[\\d]+°\\d{1,2}'\\d{1,2}([\\.]\\d+)?\"", "g");

		if ( objectName.split(" ").length == 2 )
		{
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
				$('#equatorialCoordinatesSearchResult').html("Bad input");
				$('#equatorialCoordinatesSearchResult').fadeIn(animationDuration);
			}
		}
		else
		{
			$("#searchSpinner").fadeIn(animationDuration);
			$('#searchClear').fadeOut(animationDuration);

			// Name of the object which could be potentially found by name resolver
			var url = configuration.baseUrl + "/" + objectName +"/EQUATORIAL";
			$('#equatorialCoordinatesSearchResult').fadeOut(animationDuration);
			$.ajax({
				type: "GET",
				url: url,
				success: function(data){
					response = data;
					if(response.type == "FeatureCollection")
					{
						// Zoom to the first feature
						zoomTo(response.features[0]);
						
						// Fill search result field
						var output = "";
						for ( var i=0; i<response.features.length; i++)
						{
							var equatorial = [];
							GlobWeb.CoordinateSystem.fromGeoToEquatorial([response.features[i].geometry.coordinates[0], response.features[i].geometry.coordinates[1]], equatorial);

							var result = nameResolverResultTemplate( { properties: response.features[i].properties, ra: equatorial[0], dec: equatorial[1] } );
							output+=result;
						}

						$('#equatorialCoordinatesSearchResult').html(output);
						$('#equatorialCoordinatesSearchResult div:first-child').addClass('selected');
						$('#equatorialCoordinatesSearchResult').fadeIn(animationDuration);
					} else {
						$('#equatorialCoordinatesSearchResult').html("Enter object name");
						$('#equatorialCoordinatesSearchResult').fadeIn(animationDuration);
					}
				},
				error: function (xhr, ajaxOptions, thrownError) {
					$('#equatorialCoordinatesSearchResult').html("Not found");
					$('#equatorialCoordinatesSearchResult').fadeIn(animationDuration);
					console.error( xhr.responseText );
				},
				complete: function(xhr)
				{
					$("#searchSpinner").fadeOut(animationDuration);
					$('#searchClear').fadeIn(animationDuration);
				}
			});
		}
	});
	
	// Clear search result field when pan
	$('canvas').click(function(){
		$('#equatorialCoordinatesSearchResult').fadeOut(animationDuration);
	});
	
	$('#equatorialCoordinatesSearchResult').on("click",'.nameResolverResult',function(event){
		$('#equatorialCoordinatesSearchResult').find('.selected').removeClass('selected');
		$(this).addClass('selected');

		var index = $(this).index();
		var selectedFeature = response.features[index];
		zoomTo(selectedFeature);

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
 *	Zoom to feature
 */
function zoomTo(feature)
{
	astroNavigator.zoomTo([feature.geometry.coordinates[0], feature.geometry.coordinates[1]], configuration.zoomFov );
	addTarget(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
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
