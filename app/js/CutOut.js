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
 * UWS CutOut service
 */
define( [ "jquery.ui" ], function($) {

var baseUrl;
var successCallback;
var failCallback;
var onloadCallback;
var resultType; // "jpg" or "fits"

var checkFn; // Interval function
var currentJob;

/**************************************************************************************************************/

/**
 *	Send GET request to know the phase of current job
 */
var checkPhase = function()
{
	$.ajax({
		type: "GET",
		url: baseUrl + "/" + currentJob,
		success: function(response, textStatus, xhr){
			var xmlDoc = $.parseXML( xhr.responseText );
			var phase = $(response).find('phase').text();
			
			if ( onloadCallback )
				onloadCallback(phase);

			if ( phase == "COMPLETED" )
			{
				$xml = $(response);
				var resultUrl;
				if ( resultType == "fits" )
				{
					resultUrl = $xml.find('results').children().first().attr('xlink:href');
				}
				else
				{
					resultUrl = $xml.find('results').children().last().attr('xlink:href');
				}

				var lastSlash = resultUrl.lastIndexOf('/');
				var name = resultUrl.substr( lastSlash );
				if ( resultUrl.search("[?]") > 0 )
				{
					//Encode special caracters(at least '?')
					resultUrl = resultUrl.substr( 0, lastSlash ) + encodeURIComponent(name);
				}
				window.clearInterval(checkFn);
				if ( successCallback )
					successCallback(resultUrl, name);
			} 
			else if ( phase == "ERROR" )
			{
				window.clearInterval(checkFn);
				if ( failCallback )
					failCallback('Internal server error');
			}
		},
		error: function (xhr, textStatus, thrownError) {
			window.clearInterval(checkFn);
			if ( failCallback )
				failCallback('CutOut service: '+thrownError);
			console.error( xhr.responseText );
		}
	});
}

/**************************************************************************************************************/

return {
	/**
	 *	Initialize CutOut service
	 */
	init: function(options)
	{
		successCallback = options.successCallback;
		onloadCallback = options.onloadCallback;
		failCallback = options.failCallback;
		resultType = options.type || "fits";
		baseUrl = options.baseUrl;
	},

	/**
	 *	Send POST request to UWS CutOut service
	 */
	post: function( url, ra, dec, radius )
	{
		window.clearInterval(checkFn);
		$.ajax({
			type: "POST",
			url: baseUrl,
			data: {
				PHASE: "RUN",
				uri: url,
				ra:  ra,
				dec: dec,
				radius: radius,
			},
			success: function(response, textStatus, xhr){
				var xmlDoc = $.parseXML( xhr.responseText );
				$xml = $(response);
				currentJob = $xml.find('jobId').text();

				// Check job phase every 500ms
				checkFn = window.setInterval( checkPhase, 500 );
			},
			error: function (xhr, textStatus, thrownError) {
				window.clearInterval(checkFn);
				if ( failCallback )
					failCallback('CutOut service: '+thrownError);
				console.error( xhr.responseText );
			}
		});
	}
}

/**************************************************************************************************************/

});