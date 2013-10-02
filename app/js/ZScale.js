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
 * UWS ZScale service
 */
define( [ "jquery.ui" ], function($) {

var baseUrl;
var successCallback;
var failCallback;
var onloadCallback;
var resultType;	// "jpg" or "fits"

var checkFn;	// Interval function
var checkDelay;	// Delay in milliseconds
var currentJob;

/**************************************************************************************************************/

/**
 *	Send xhr to get the results of current job
 */
function getJobResults()
{
	$.ajax({
		type: "GET",
		url: baseUrl + "/" + currentJob + '/results?media=json',
		success: function(response, textStatus, xhr){
			
			var z1 = parseFloat(response.results.result[0]['@xlink:href']);
			var z2 = parseFloat(response.results.result[1]['@xlink:href']);
		
			if ( successCallback )
				successCallback(z1, z2);
		},
		error: function(xhr, textStatus, thrownError){
			window.clearInterval(checkFn);
			if ( failCallback )
				failCallback('Internal server error');
		}
	});
}

/**************************************************************************************************************/

/**
 *	Send GET request to know the phase of current job
 */
function checkPhase()
{
	$.ajax({
		type: "GET",
		url: baseUrl + "/" + currentJob + '/phase',
		success: function(response, textStatus, xhr){
			
			if ( onloadCallback )
				onloadCallback(phase);

			if ( response == "COMPLETED" )
			{
				window.clearInterval(checkFn);
				getJobResults();
			} 
			else if ( response == "ERROR" )
			{
				window.clearInterval(checkFn);
				if ( failCallback )
					failCallback('Internal server error');
			}
		},
		error: function (xhr, textStatus, thrownError) {
			window.clearInterval(checkFn);
			if ( failCallback )
				failCallback('Zscale service: '+thrownError);
			console.error( xhr.responseText );
		}
	});
}

/**************************************************************************************************************/

return {
	/**
	 *	Initialize ZScale service
	 */
	init: function(url, options){
		baseUrl = url;
		checkDelay = options && options.hasOwnProperty('checkDelay') ? options.checkDelay : 1000;
	},

	/**************************************************************************************************************/

	/**
	 *	Send POST request to lauch the job
	 */
	post: function( url, options )
	{
		successCallback = options.successCallback;
		onloadCallback = options.onloadCallback;
		failCallback = options.failCallback;

		window.clearInterval(checkFn);
		$.ajax({
			type: "POST",
			url: baseUrl,
			data: {
				PHASE: "RUN",
				uri: url
			},
			success: function(response, textStatus, xhr){
				var xmlDoc = $.parseXML( xhr.responseText );

				var tag;
				if ( window.chrome )
				{
					// Chrome
					tag = "jobId";
				}
				else
				{
					// Mozilla
					tag = "uws:jobId";
				}

				currentJob = xmlDoc.getElementsByTagName(tag)[0].textContent;

				// Check job phase every "checkDelay" seconds
				checkFn = window.setInterval( checkPhase, checkDelay );
			},
			error: function (xhr, textStatus, thrownError) {
				window.clearInterval(checkFn);
				if ( failCallback )
					failCallback('ZScale service: '+thrownError);
				console.error( xhr.responseText );
			}
		});
	}
}

});