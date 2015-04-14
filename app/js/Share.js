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
/*global clearInterval: false, clearTimeout: false, document: false, event: false, frames: false, history: false, Image: false, location: false, name: false, navigator: false, Option: false, parent: false, screen: false, setInterval: false, setTimeout: false, window: false, XMLHttpRequest: false, define: false */

/**
 * Share url module : creating url with current navigation properties
 */
define(["jquery", "./LayerManager", "./ErrorDialog"],
	function($, LayerManager, ErrorDialog) {

// Globals
var mizar;
var navigation;
var baseUrl;

/**
 *	Generate url with current navigation parameters as : fov, eye, visibility, rotation(TODO)
 */
function generateURL()
{
	var url = window.document.documentURI;

	var splitEndIndex = url.search( /[&|?]sharedParameters=/ );
	// If url is almost a shared link
	if ( splitEndIndex != -1 )
	{
		// Cut it
		url = url.substr( 0, splitEndIndex );
	}

	var splitIndex = url.indexOf( "?conf=" );
	if ( splitIndex != -1 )
	{
		// If configuration is defined by SiTools2
		if ( url != 'undefined' && url != '' ) {
			url += "&";
		}
		else
		{
			// Cut 'undefined'
			url = url.substr( 0, splitIndex );
			url += "?";
		}
	}
	else
	{
		url += "?";
	}

	// Get navigation parameters
	var geo = [];
	mizar.sky.coordinateSystem.from3DToGeo( navigation.center3d, geo );

	// Get layer visibility parameters
	var currentLayers = LayerManager.getLayers();
	var visibility = {};
	for ( var i=0; i<currentLayers.length; i++ )
	{
		visibility[currentLayers[i].name] = currentLayers[i].visible();
	}

	// Create shared parameters object to concat
	var sharedParameters = {
		initTarget: geo,
		fov: navigation.renderContext.fov,
		visibility: visibility,
		up: navigation.up
	}

	if ( baseUrl )
	{
		// Use SiTools shortener plugin
		$.ajax({
			type: "POST",
			url: baseUrl,
			async: false,
			data: { context: JSON.stringify( sharedParameters ) },
			success: function(response)
			{
				url+='sharedParameters='+response;
			},
			error: function(thrownError)
			{
				ErrorDialog.open("Shortener service: "+thrownError.statusText);
				console.error(thrownError);
			}
		});
	}
	else
	{
		// No shortener plugin, stringify shared parameters
		url+= "sharedParameters=" + JSON.stringify(sharedParameters);
	}

	return url;
}

function init(options)
{
	mizar = options.mizar;
	navigation = options.navigation;
	if ( options.configuration.hasOwnProperty('shortener') )
	{
		baseUrl = options.configuration.shortener.baseUrl;
	}

	$('#share').on('click', function(){
		var url = generateURL();
		$('#shareInput').val(url);
		$(this).fadeOut(300, function(){
			$(this).next().fadeIn();
			$('#shareInput').select();
		});
	});

	$('#shareClear').on('click', function(){
		$(this).parent().fadeOut(300, function(){
			$("#share").fadeIn();
		});
	});

	$('#share').hover(function(){
		$(this).animate({left: '-10px'}, 100);
	}, function() {
		$(this).animate({left: '-20px'}, 100);
	});
}

return {
	init: init
}

});
