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
define(["jquery", "gw/FeatureStyle", "gw/VectorLayer", "gw/HEALPixBase", "gw/CoordinateSystem", "./Utils", "underscore-min", "text!../templates/nameResolverResult.html", "jquery.ui"],
	function($, FeatureStyle, VectorLayer, HEALPixBase, CoordinateSystem, Utils, _, nameResolverResultHTMLTemplate) {


var nameResolverHTML = '<form id="searchForm">\
				<fieldset>\
					<div class="searchInputDiv">\
						<input title="Enter an object name (e.g. m31) or coordinate (e.g 23h45m30.5s -45&#186;30\'30&rdquo;)" type="text" name="searchInput" id="searchInput" value="Object name or coordinates" />\
					</div>\
					<input type="submit" id="searchSubmit" value="" />\
					<div style="display: none" id="searchSpinner"></div>\
					<input type="button" id="searchClear" value="" style="display: none;"/>\
				</fieldset>\
			</form>\
			<div style="display: none" id="resolverSearchResult"></div>';


// Template generating the list of selected features
var nameResolverResultTemplate = _.template(nameResolverResultHTMLTemplate);

// jQuery selectors
var $nameResolver;
var $input;
var $clear;

// Name resolver globals
var sky;
var astroNavigator;
var configuration = {zoomFov: 15.};
var response;
var animationDuration = 300;

// Target layer
var style = new FeatureStyle({
	iconUrl: "css/images/target.png",
	fillColor: [1., 1., 1., 1.]
 });
var targetLayer = new VectorLayer({ style: style });
// Zooming destination feature
var targetFeature;

/**************************************************************************************************************/

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

/**************************************************************************************************************/

/**
 *	Stylized focus effect on input
 */
function _focusInput()
{
	var defaultText = $input.attr("value");
	if($input.val() === defaultText)
	{
		$input.val('');
	}

	$(this).animate({color: '#000'}, animationDuration).parent().animate({backgroundColor: '#fff'}, animationDuration, function(){
		if(!($input.val() === '' || $input.val() === defaultText)) 
		{
			$clear.fadeIn(animationDuration);
		}
	}).addClass('focus');
}

/**************************************************************************************************************/

/**
 *	Stylized blur effect on input
 */
function _blurInput(event)
{
	var defaultText = $input.attr("value");
	$(this).animate({color: '#b4bdc4'}, animationDuration, function() {
		if($input.val() === '')
		{
			$input.val(defaultText)
		}
	}).parent().animate({backgroundColor: '#e8edf1'}, animationDuration).removeClass('focus');
}

/**************************************************************************************************************/

/**
 *	Toggle visibility of clear button
 *	Designed to clear text in search input
 */
function _toggleClear()
{
	if($input.val() === '') {
		$clear.fadeOut(animationDuration);
	} else {
		$clear.fadeIn(animationDuration);
	}
}

/**************************************************************************************************************/

/**
 *	Search for object name
 *	Object name could be:
 *		* Degree in "HMS DMS" or "deg deg"
 *		* Object name as "Mars", "m31", "Mizar"
 *		* For debug : healpix(order, pixelIndex)
 */
function search(objectName)
{
	// regexp used only to distinct equatorial coordinates and objects
	// TODO more accurate ( "x < 24h", "x < 60mn", etc.. )

	objectName = objectName.replace(/\s{2,}/g, ' '); // Replace multiple spaces by a single one
	var coordinatesExp = new RegExp("\\d{1,2}[h|:]\\d{1,2}[m|:]\\d{1,2}([\\.]\\d+)?s?\\s[-+]?[\\d]+[°|:]\\d{1,2}['|:]\\d{1,2}([\\.]\\d+)?\"?", "g");
	var healpixRE = /^healpix\((\d)+,(\d+)\)/;
	var degRE = /^(\d+(\.\d+)?),?\s(-?\d+(\.\d+)?)/;
	var matchHealpix = healpixRE.exec(objectName);
	var matchDegree = degRE.exec(objectName);
	if ( matchHealpix ) 
	{
		var order = parseInt(matchHealpix[1]);
		var pixelIndex = parseInt(matchHealpix[2]);
		
		// Compute vertices
		var nside = Math.pow(2, order);
		var pix=pixelIndex&(nside*nside-1);
		var ix = HEALPixBase.compress_bits(pix);
		var iy = HEALPixBase.compress_bits(pix>>>1);
		var face = (pixelIndex>>>(2*order));

		var i = 0.5;
		var j = 0.5;
		var vert = HEALPixBase.fxyf( (ix+i)/nside, (iy+j)/nside, face);
		var geoPos = [];
		CoordinateSystem.from3DToGeo(vert, geoPos);
		zoomTo(geoPos[0],geoPos[1]);
	}
	else if ( objectName.match( coordinatesExp ) )
	{
		// Format to equatorial coordinates
		var word = objectName.split(" "); // [RA, Dec]

		word[0] = word[0].replace(/h|m|:/g," ");
		word[0] = word[0].replace("s", "");
		word[1] = word[1].replace(/°|'|:/g," ");
		word[1] = word[1].replace("\"", "");
		
		// Convert to geo and zoom
		var geoPos = [];
		CoordinateSystem.fromEquatorialToGeo([word[0], word[1]], geoPos);

		if ( CoordinateSystem.type != "EQ" )
		{
			geoPos = CoordinateSystem.convert(geoPos, CoordinateSystem.type, 'EQ');
		}

		zoomTo(geoPos[0], geoPos[1]);
	}
	else if ( matchDegree ) {
		var lon = parseFloat(matchDegree[1]);
		var lat = parseFloat(matchDegree[3]);
		var geo = [lon, lat];

		if ( CoordinateSystem.type != "EQ" )
		{
			geo = CoordinateSystem.convert(geo, CoordinateSystem.type,  'EQ');
		}

		zoomTo(geo[0], geo[1]);
	}
	else
	{
		// Name of the object which could be potentially found by name resolver
		$nameResolver.find("#searchSpinner").fadeIn(animationDuration);
		$nameResolver.find('#searchClear').fadeOut(animationDuration);
		var url = configuration.baseUrl + "/" + objectName + "/EQUATORIAL";

		var $resolverSearchResult = $('#searchDiv').find('#resolverSearchResult');
		$resolverSearchResult.fadeOut(animationDuration);
		$.ajax({
			type: "GET",
			url: url,
			success: function(data){
				response = data;
				if(response.type == "FeatureCollection")
				{
					// Zoom to the first feature
					var firstFeature = response.features[0];
					zoomTo(firstFeature.geometry.coordinates[0], firstFeature.geometry.coordinates[1]);
					
					// Fill search result field
					var output = "";
					for ( var i=0; i<response.features.length; i++)
					{
						var astro = Utils.formatCoordinates([ response.features[i].geometry.coordinates[0], response.features[i].geometry.coordinates[1] ]);
						var result = nameResolverResultTemplate( { properties: response.features[i].properties, lon: astro[0], lat: astro[1], type: CoordinateSystem.type } );
						output+=result;
					}

					$resolverSearchResult.html(output);
					$resolverSearchResult.find('div:first-child').addClass('selected');
					$resolverSearchResult.fadeIn(animationDuration);
				} else {
					$resolverSearchResult.html("Enter object name");
					$resolverSearchResult.fadeIn(animationDuration);
				}
			},
			error: function (xhr, ajaxOptions, thrownError) {
				$resolverSearchResult.html("Bad input or object not found");
				$resolverSearchResult.fadeIn(animationDuration);
				console.error( xhr.responseText );
			},
			complete: function(xhr)
			{
				$nameResolver.find("#searchSpinner").fadeOut(animationDuration);
				$nameResolver.find('#searchClear').fadeIn(animationDuration);
			}
		});
	}
}

/**************************************************************************************************************/

/**
 *	Submit request with string from input
 */
function _submitRequest(event)
{
	event.preventDefault();
	$input.blur();

	var objectName = $input.val();
	search(objectName);
}

/**************************************************************************************************************/

/**
 *	Zoom to result by clicking on item of #resolverSearchResult list
 */
function _zoomToResult(event)
{
	$('#resolverSearchResult').find('.selected').removeClass('selected');
	$(this).addClass('selected');

	var index = $(this).index();
	var selectedFeature = response.features[index];
	zoomTo(selectedFeature.geometry.coordinates[0], selectedFeature.geometry.coordinates[1]);
}

/**************************************************************************************************************/

/**
 *	Clear results list
 */
function _clearResults(){
	$('#resolverSearchResult').fadeOut(animationDuration);
}

/**************************************************************************************************************/

/**
 *	Clear search input
 */
function _clearInput()
{
	var defaultText = $input.attr("value");
	if($input.val() !== defaultText) {
		$input.val(defaultText);
	}
	$clear.fadeOut(animationDuration);
	$('#searchInput').animate({color: '#b4bdc4'}, animationDuration)
			.parent().animate({backgroundColor: '#e8edf1'}, animationDuration).removeClass('focus');
}

/**************************************************************************************************************/

/**
 *	Initialize events for name resolver
 */
function setSearchBehavior()
{
	sky.addLayer( targetLayer );
	astroNavigator.subscribe("modified", removeTarget);
	
	// Set style animations
	$input.on('focus', _focusInput)
		.on('blur', _blurInput)
		.keyup(_toggleClear);
	
	// Submit event
	$('#searchDiv').find('#searchForm').submit(_submitRequest);
	
	// Clear search result field when pan
	$('canvas').on('click', _clearResults);
	
	$('#searchDiv').find('#resolverSearchResult').on("click", '.nameResolverResult', _zoomToResult);
	$nameResolver.find('#searchClear').on('click', _clearInput);
}

/**************************************************************************************************************/

/**
 *	Zoom to the given longitude/latitude
 */
function zoomTo(lon, lat)
{
	astroNavigator.zoomTo([lon, lat], configuration.zoomFov, 3000, function() {
		addTarget(lon,lat);
	} );
}

/**************************************************************************************************************/

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

/**************************************************************************************************************/

return {
	init: function(mizar, conf) {
		if ( !$nameResolver ) {
			sky = mizar.sky;
			astroNavigator = mizar.navigation;

			// TODO : replace searchDiv by "parentElement"
			$nameResolver = $(nameResolverHTML).appendTo('#searchDiv');
			$input = $nameResolver.find('#searchInput');
			$clear = $nameResolver.find('#searchClear');

			for( var x in conf.nameResolver )
			{
				configuration[x] = conf.nameResolver[x];
			}

			setSearchBehavior();
		} else {
			console.error("Name resolver is already initialized");
		}
	},

	/**
	 *	Unregister all event handlers
	 */
	remove: function() {
		if ( $nameResolver )
		{
			sky.removeLayer( targetLayer );
			astroNavigator.unsubscribe("modified", removeTarget);
			
			// Set style animations
			$input.off('focus', _focusInput)
				.off('blur', _blurInput)
				.unbind('keyup', _toggleClear);
					
			// Clear search result field when pan
			$('canvas').off('click', _clearResults);
			
			$('#searchDiv').find('#resolverSearchResult').off("click", '.nameResolverResult', _zoomToResult);
			$nameResolver.find('#searchClear').off('click', _clearInput);
			$nameResolver.remove();
			$nameResolver = null;
		}
	}
};

});
