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
var resultType;	// "jpg" or "fits"

var checkFn;	// Interval function
var checkDelay;	// Delay in milliseconds
var currentJob;

/**************************************************************************************************************/

/**
 *	Send xhr to get results of current job
 */
var getJobResults = function()
{
	$.ajax({
		type: "GET",
		url: baseUrl + "/" + currentJob + '/results?media=json',
		success: function(response, textStatus, xhr){
			
			var results = {};
			// Handle results
			for ( var i=0; i<response.results.result.length; i++ )
			{
				var result = response.results.result[i];
				var name = result['@id'];
				var url =  result['@xlink:href'];

				//Encode special caracters(at least '?')
				if ( url.search("[?]") > 0 )
				{
					var lastSlash = url.lastIndexOf('/') + 1;
					url = url.substr( 0, lastSlash ) + encodeURIComponent(name);
				}

				results[name] = url;
			}

			if ( successCallback )
				successCallback(results);
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
var checkPhase = function()
{
	$.ajax({
		type: "GET",
		url: baseUrl + "/" + currentJob + '/phase',
		success: function(response, textStatus, xhr){
			
			if ( onloadCallback )
				onloadCallback(phase);

			if ( response == "COMPLETED" )
			{
				window.clearInterval(checkFn);;
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
	init: function(conf, options)
	{
		baseUrl = conf.baseUrl;
		checkDelay = options && options.hasOwnProperty('checkDelay') ? options.checkDelay : 1000;
	},

	/**************************************************************************************************************/

	/**
	 *	Send POST request to lauch the job
	 */
	post: function( parameters, options )
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
				uri: parameters.url,
				ra:  parameters.ra,
				dec: parameters.dec,
				radius: parameters.radius,
			},
			success: function(response, textStatus, xhr){
				var xmlDoc = $.parseXML( xhr.responseText );
				$xml = $(xmlDoc);
				currentJob = $xml.find('jobId').text();

				// Check job phase every "checkDelay" seconds
				checkFn = window.setInterval( checkPhase, checkDelay );
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