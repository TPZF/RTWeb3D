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
define(["jquery", "./Utils", "./NameResolver", "underscore-min", "text!../templates/nameResolverResult.html", "jquery.ui"],
	function($, Utils, NameResolver, _, nameResolverResultHTMLTemplate) {


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
var $resolverSearchResult;

// Name resolver globals
var response;
var animationDuration = 300;
var mizar;
var self;

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
 *	Show found results
 */
function _showResults(data)
{
	if (data) {
		response = data;
		// Fill search result field
		var output = "";
		for ( var i=0; i<response.features.length; i++)
		{
			var astro = Utils.formatCoordinates([ response.features[i].geometry.coordinates[0], response.features[i].geometry.coordinates[1] ]);
			var result = nameResolverResultTemplate( { properties: response.features[i].properties, lon: astro[0], lat: astro[1], type: mizar.activatedContext.globe.coordinateSystem.type } );
			output+=result;
		}
		
		// Show it
		$resolverSearchResult.html(output).fadeIn(animationDuration);
		$resolverSearchResult.find('div:first-child').addClass('selected');

		$nameResolver.find("#searchSpinner").fadeOut(animationDuration);
		$clear.fadeIn(animationDuration);
	}
}

/**************************************************************************************************************/

/**
 *	Show error message
 */
function _showError() {
	$resolverSearchResult
		.html("Bad input or object not found")
		.fadeIn(animationDuration);

	$nameResolver.find("#searchSpinner").fadeOut(animationDuration).end()
	$clear.fadeIn(animationDuration);
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

	if ( objectName != $input.attr("value") && objectName != '' )
	{
		$nameResolver
			.find("#searchSpinner").fadeIn(animationDuration).end()
			.find('#searchClear').fadeOut(animationDuration);
	
		$resolverSearchResult.fadeOut(animationDuration);
		NameResolver.goTo(objectName, _showResults, _showError);
	}
	else
	{
		$resolverSearchResult.html("Enter object name").fadeIn(animationDuration);
	}
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
	NameResolver.zoomTo(selectedFeature.geometry.coordinates[0], selectedFeature.geometry.coordinates[1]);
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
	/**
	 *	Init
	 *
	 *	@param m
	 *		Mizar
	 */
	init: function(m) {
		mizar = m;
		self = this;
		if ( !$nameResolver ) {
			
			// Update name resolver context when mizar mode has been toggled
			mizar.subscribe("mizarMode:toggle", this.onModeToggle);

			// TODO : replace searchDiv by "parentElement"
			$nameResolver = $(nameResolverHTML).appendTo('#searchDiv');
			$input = $nameResolver.find('#searchInput');
			$clear = $nameResolver.find('#searchClear');
			$resolverSearchResult = $nameResolver.siblings('#resolverSearchResult');

			setSearchBehavior();
		} else {
			console.error("Name resolver view is already initialized");
		}
	},

	/**
	 *	Unregister all event handlers
	 */
	remove: function() {
		if ( $nameResolver )
		{
			// Set style animations
			$input.off('focus', _focusInput)
				.off('blur', _blurInput)
				.unbind('keyup', _toggleClear);
					
			// Clear search result field when pan
			$('canvas').off('click', _clearResults);
			
			$resolverSearchResult.off("click", '.nameResolverResult', _zoomToResult);
			$nameResolver.find('#searchClear').off('click', _clearInput);
			$nameResolver.remove();
			$nameResolver = null;

			mizar.unsubscribe("mizarMode:toggle", this.onModeToggle);
			mizar = null;
		}
	},

	/**
	 *	Handler on mizar mode toggle
	 */
	onModeToggle: function(planetLayer)
	{
		if ( !planetLayer || planetLayer.nameResolverURL )
		{
			$nameResolver.show();
			self.setContext(mizar.activatedContext);
		}
		else
		{
			$nameResolver.hide();		
		}
	},

	/**
	 *	Set new context
	 */
	 setContext: function(ctx) {
	 	NameResolver.setContext(ctx);
	 	_clearInput();
		$resolverSearchResult.css("display", "none");
	 }
};

});
