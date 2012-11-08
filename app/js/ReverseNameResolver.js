
/**
 * Name resolver module : search object name and zoom to them
 */
define(["jquery.ui", "underscore-min", "text!../templates/featureDescription.html", "text!../templates/descriptionTable.html"], function($, _, featureDescriptionHTMLTemplate, descriptionTableHTMLTemplate) {

var globe;
var navigation;
var configuration = {};
// var maxOrder = 3;

// Template generating the detailed description of choosen feature
var featureDescriptionTemplate = _.template(featureDescriptionHTMLTemplate);

// Template generating the table of properties of choosen feature
var descriptionTableTemplate = _.template(descriptionTableHTMLTemplate);

var reverseNameResolverHTML =
	'<div id="reverseNameResolver" class="contentBox ui-widget-content" style="display: none;">\
		<div id="reverseSearchField">\
			<input type="submit" value="Find Names" /><span style="margin-left: 10px;">CDS</span>\
		</div>\
		<div id="reverseSearchResult"></div>\
		<div class="closeBtn">\
			<img src="css/images/close_button.png" alt="" class="defaultImg" />\
			<img src="css/images/close_buttonHover.png" alt="" class="hoverImg" />\
		</div>\
	</div>';

$(reverseNameResolverHTML).appendTo('body');
$( "#reverseNameResolver input[type=submit]")
	.button()
	.click(function( event ) {
		event.preventDefault();
		var pickPoint = globe.getLonLatFromPixel(event.clientX, event.clientY);
		var equatorialCoordinates = [];
		GlobWeb.CoordinateSystem.fromGeoToEquatorial( pickPoint, equatorialCoordinates );

		// Format to equatorial coordinates
		equatorialCoordinates[0] = equatorialCoordinates[0].replace("h ",":");
		equatorialCoordinates[0] = equatorialCoordinates[0].replace("m ",":");
		equatorialCoordinates[0] = equatorialCoordinates[0].replace("s","");
		
		equatorialCoordinates[1] = equatorialCoordinates[1].replace("° ",":");
		equatorialCoordinates[1] = equatorialCoordinates[1].replace("' ",":");
		equatorialCoordinates[1] = equatorialCoordinates[1].replace("\"","");

		var decDegree = parseInt(equatorialCoordinates[1]);
		if ( decDegree > 0 )
			equatorialCoordinates[1] = "+" + equatorialCoordinates[1];

		// Find max order
		var maxOrder = 3;
		globe.tileManager.visitTiles( function( tile ){ if ( maxOrder < tile.order ) maxOrder = tile.order} );
		console.log(maxOrder);

		var requestUrl = configuration.baseUrl + equatorialCoordinates[0] + " " + equatorialCoordinates[1] + ";" + maxOrder;

		$.ajax({
			type: "GET",
			url: requestUrl,
			success: function(response){
				console.log(response);
				// Only one feature for the moment
				showFeature( response.features[0] );
			},
			error: function (xhr, ajaxOptions, thrownError) {
				console.error( xhr.responseText );
			}
		});
	});

function setBehavior()
{
	var timeStart;
	var timeEnd;
	var mouseXStart;
	var mouseYStart;
	var epsilon = 5;

	$('canvas').on("mousedown",function(event){
		timeStart = new Date();
		mouseXStart = event.clientX;
		mouseYStart = event.clientY;
		// $('#reverseNameResolver').fadeOut(100);
	});

	$('canvas').mouseup(function(event){
		timeEnd = new Date();
		diff = timeEnd - timeStart;

		// More than 2 seconds and the mouse position is approximatively the same
		if ( diff > 2000 && Math.abs(mouseXStart - event.clientX) < epsilon && Math.abs(mouseYStart - event.clientY) < epsilon )
		{
			$('#reverseSearchResult').css("display","none");
			$('#reverseSearchField').css("display","block");
			$('#reverseNameResolver')
				.css({
					position: 'absolute',
					left: event.clientX + 'px',
					top: event.clientY + 'px'
			}).fadeIn(100);
		}
	});

	$('#reverseNameResolver').on("click", '.propertiesTable a', function(event){
		event.preventDefault();
		
		$("#externalIFrame iframe").attr('src', "/sitools/proxy?external_url=" + event.target.innerHTML);
		$("#externalIFrame").animate({top: 100}, 800);
	});

	globe.subscribe("startNavigation", function(){ if ($('#reverseNameResolver').css('display') != 'none'){ $(this).fadeOut(300); } } );
}

function showFeature( feature )
{
	var output = featureDescriptionTemplate( { feature: feature, descriptionTableTemplate: descriptionTableTemplate } );
	var title = ( feature.properties.title ) ? feature.properties.title : feature.properties.identifier;
	output = '<div class="title">'+ title +'</div>' + output;
	$('#reverseSearchResult').html( output );
	$('#reverseSearchField').fadeOut(300 , function(){
		$('#reverseSearchResult').fadeIn(300);
	});
}

return {
	init: function(gl,nav,conf) {
		astroNavigator = nav;
		globe = gl;
		for( var x in conf )
		{
			configuration[x] = conf[x];
		}

		setBehavior();
	}
};

});
