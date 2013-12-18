/******************************************************************************* 
* Copyright 2012, 2013 CNES - CENTRE NATIONAL d'ETUDES SPATIALES 
* 
* This file is part of SITools2. 
* 
* SITools2 is free software: you can redistribute it and/or modify 
* it under the terms of the GNU General Public License as published by 
* the Free Software Foundation, either version 3 of the License, or 
* (at your option) any later version. 
* 
* SITools2 is distributed in the hope that it will be useful, 
* but WITHOUT ANY WARRANTY; without even the implied warranty of 
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
* GNU General Public License for more details. 
* 
* You should have received a copy of the GNU General Public License 
* along with SITools2. If not, see <http://www.gnu.org/licenses/>. 
******************************************************************************/ 

/**
 * Name resolver module : search object name and zoom to them
 */
define(["jquery.ui", "gw/CoordinateSystem", "gw/Numeric", "./IFrame", "./Utils", "./ErrorDialog", "underscore-min", "text!../templates/featureDescription.html", "text!../templates/descriptionTable.html"],
	function($, CoordinateSystem, Numeric, IFrame, Utils, ErrorDialog, _, featureDescriptionHTMLTemplate, descriptionTableHTMLTemplate) {

var globe;
var configuration = {};
var geoPick = [];
var navigation = null;
var isMobile = false;

// Template generating the detailed description of choosen feature
var featureDescriptionTemplate = _.template(featureDescriptionHTMLTemplate);

// Template generating the table of properties of choosen feature
var descriptionTableTemplate = _.template(descriptionTableHTMLTemplate);

var timeStart;
var mouseXStart;
var mouseYStart;

var reverseNameResolverHTML =
	'<div id="reverseNameResolver" class="contentBox ui-widget-content" style="display: none;">\
		<div id="reverseSearchField">\
			<input data-role="button" data-theme="a" type="submit" value="Find Object Name" />\
			<div id="coordinatesInfo"></div>\
			<div id="healpixInfo"></div>\
		</div>\
		<div id="reverseSearchResult"></div>\
		<div class="closeBtn">\
			<img src="css/images/close_button.png" alt="" class="defaultImg" />\
			<img src="css/images/close_buttonHover.png" alt="" class="hoverImg" />\
		</div>\
	</div>';

var $reverseNameResolver = $(reverseNameResolverHTML).appendTo('body');

$( "#reverseNameResolver input[type=submit]")
	.button()
	.click(function( event ) {
		event.preventDefault();

		$('#reverseSearchField input[type="submit"]').attr('disabled', 'disabled');

		var equatorialCoordinates = [];
		CoordinateSystem.fromGeoToEquatorial( geoPick, equatorialCoordinates );

		// Format to equatorial coordinates
		equatorialCoordinates[0] = equatorialCoordinates[0].replace("h ",":");
		equatorialCoordinates[0] = equatorialCoordinates[0].replace("m ",":");
		equatorialCoordinates[0] = equatorialCoordinates[0].replace("s","");
		
		equatorialCoordinates[1] = equatorialCoordinates[1].replace("° ",":");
		equatorialCoordinates[1] = equatorialCoordinates[1].replace("' ",":");
		equatorialCoordinates[1] = equatorialCoordinates[1].replace("\"","");

		// Find max order
		var maxOrder = 3;
		globe.tileManager.visitTiles( function( tile ){ if ( maxOrder < tile.order ) maxOrder = tile.order} );

		var requestUrl = configuration.baseUrl + 'EQUATORIAL/' + equatorialCoordinates[0] + " " + equatorialCoordinates[1] + ";" + maxOrder;

		$.ajax({
			type: "GET",
			url: requestUrl,
			success: function(response){
				// Only one feature for the moment
				showFeature( response.features[0] );
			},
			error: function (xhr, ajaxOptions, thrownError) {
				switch (xhr.status)
				{
					case 503: 
						ErrorDialog.open("Please wait at least 6 seconds between each request to reverse name resolver");
						break;
					case 500:
						ErrorDialog.open("Internal server error");
						break;
					case 404:
						ErrorDialog.open("Object not found");
						break;
					case 400:
						ErrorDialog.open("Bad input");
					default:
						break;
				}
			},
			complete: function(xhr)
			{
				$('#reverseSearchField input[type="submit"]').removeAttr('disabled');
			}
		});
	});

function _handleMouseDown(event)
{
	$reverseNameResolver.fadeOut();
	timeStart = new Date();

	if ( event.type.search("touch") >= 0 )
	{
		event.clientX = event.changedTouches[0].clientX;
		event.clientY = event.changedTouches[0].clientY;
	}

	mouseXStart = event.clientX;
	mouseYStart = event.clientY;
}

function _handleMouseUp(event)
{
	var epsilon = 5;

	var timeEnd = new Date();
	var diff = timeEnd - timeStart;
	var padding = 15;

	if ( event.type.search("touch") >= 0 )
	{
		event.clientX = event.changedTouches[0].clientX;
		event.clientY = event.changedTouches[0].clientY;
	}

	var mHeight = window.innerHeight - event.clientY - padding*2;
	$('#reverseSearchField').css('max-height', mHeight);
	$('#reverseSearchResult').css('max-height', mHeight);

	// More than 0.5 second and the mouse position is approximatively the same
	if ( diff > 500 && Math.abs(mouseXStart - event.clientX) < epsilon && Math.abs(mouseYStart - event.clientY) < epsilon )
	{
		$('#reverseSearchResult').css("display","none");

		var equatorial = [];
		geoPick = globe.getLonLatFromPixel(event.clientX, event.clientY);
		var astro = Utils.formatCoordinates([ geoPick[0], geoPick[1] ]);

		if ( CoordinateSystem.type == "EQ" ) {
			$("#coordinatesInfo").html("<em>Right ascension:</em><br/>&nbsp;&nbsp;&nbsp;&nbsp;" + astro[0] +
										"<br/><em>Declination :</em><br/>&nbsp;&nbsp;&nbsp;&nbsp;" + astro[1]);
		} else if ( CoordinateSystem.type == "GAL" ) {
			$("#coordinatesInfo").html("<em>Longitude:</em><br/>&nbsp;&nbsp;&nbsp;&nbsp;" + astro[0] +
										"<br/><em>Latitude:</em><br/>&nbsp;&nbsp;&nbsp;&nbsp;" + astro[1]);
		}

		var selectedTile = globe.tileManager.getVisibleTile(geoPick[0], geoPick[1]);
		if ( configuration.debug )
			$('#reverseSearchField #healpixInfo').html('<em>Healpix index/order: </em>&nbsp;&nbsp;&nbsp;&nbsp;'+selectedTile.pixelIndex + '/' + selectedTile.order);


		$('#reverseSearchField').css("display","block");
		$reverseNameResolver.css({
				position: 'absolute',
				left: event.clientX + 'px',
				top: event.clientY + 'px'
		}).fadeIn(100);
	}
}

function setBehavior()
{
	globe.renderContext.canvas.addEventListener("mousedown", _handleMouseDown);
	globe.renderContext.canvas.addEventListener("mouseup", _handleMouseUp);

	if ( isMobile )
	{
		globe.renderContext.canvas.addEventListener("touchstart", _handleMouseDown);
		globe.renderContext.canvas.addEventListener("touchend", _handleMouseUp);
	}

	// External link event
	$reverseNameResolver.on("click", '.propertiesTable a', function(event){
		event.preventDefault();
		IFrame.show(event.target.innerHTML);
	});

	navigation.subscribe("modified", function(){
		if ($reverseNameResolver.css('display') != 'none')
		{
			$reverseNameResolver.fadeOut(300);
		}
	});
}

function showFeature( feature )
{
	var output = featureDescriptionTemplate( { dictionary: {}, services: feature.services, properties: feature.properties, descriptionTableTemplate: descriptionTableTemplate, isMobile: isMobile } );
	var title = ( feature.properties.title ) ? feature.properties.title : feature.properties.identifier;
	output = '<div class="title">'+ title +'</div><div class="credit">Found in CDS database</div>' + output;
	$('#reverseSearchResult')
		.html( output )
		.find('#sendViewport').button();
	$('#reverseSearchField').fadeOut(300 , function(){
		$('#reverseSearchResult').fadeIn(300);
	});
}

return {
	init: function(gl, nav, conf) {

		globe = gl;
		navigation = nav;

		for( var x in conf.reverseNameResolver )
		{
			configuration[x] = conf.reverseNameResolver[x];
		}
		configuration.debug = conf.debug;
		isMobile = conf.isMobile;

		setBehavior();

		if ( isMobile )
		{
			$('#reverseNameResolver').trigger('create');
		}
	}
};

});
