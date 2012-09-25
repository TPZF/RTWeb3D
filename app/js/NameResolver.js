
/**
 * Name resolver module : search object name and zoom to them
 */
define(["jquery.ui", "Utils"], function($,Utils) {

var astroNavigator;
var baseUrl;

function setSearchBehavior()
{
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
		var url = configuration.baseUrl + "/" + objectName +"/EQUATORIAL";
		$('#equatorialCoordinatesSearchResult').fadeOut(animationDuration);
		$.ajax({
			type: "GET",
			url: url,
			success: function(response){
				console.log(response);
				if(response.dec && response.ra)
				{
					var equatorial = [];
					GlobWeb.CoordinateSystem.fromGeoToEquatorial([response.ra, response.dec], equatorial);
			
					var equatorialString = Utils.equatorialLayout( equatorial );
					$("#equatorialCoordinatesSearchResult").html("<em>Ra:</em> " + equatorialString[0] + "<br /><em>Dec:</em> " + equatorialString[1] +"\"");

					$('#equatorialCoordinatesSearchResult').fadeIn(animationDuration);
					astroNavigator.zoomTo([response.ra, response.dec], 15, 5000 );
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

	});
	
	$('#searchClear').click(function(event){
		if(input.val() !== defaultText) {
			input.val(defaultText);
		}
		clear.fadeOut(animationDuration);
		$('#searchInput').animate({color: '#b4bdc4'}, animationDuration).parent().animate({backgroundColor: '#e8edf1'}, animationDuration).removeClass('focus');
		
	});

}

return {
	init: function(nav,conf) {
		astroNavigator = nav;
		configuration = conf;
		setSearchBehavior();
	}
};

});
