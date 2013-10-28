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

define( [ "jquery.ui" ], function($) {

/**************************************************************************************************************/

/**
 * UWSBase service
 */
var UWSBase = function(name, baseUrl, options)
{
	this.name = name;
	this.baseUrl = baseUrl;

	this.successCallback = null;
	this.failCallback = null;
	this.onloadCallback = null;

	this.checkFn = null; // Interval function
	this.checkDelay = options && options.hasOwnProperty('checkDelay') ? options.checkDelay : 2000;
	this.currentJob;
}

/**************************************************************************************************************/

/**
  *	Send xhr to get results of current job
  */
UWSBase.prototype.getJobResults = function()
{
	var self = this;
	$.ajax({
		type: "GET",
		url: this.baseUrl + "/" + this.currentJob + '/results?media=json',
		success: function(response, textStatus, xhr){
			if ( self.successCallback )
				self.successCallback(response, self.currentJob);
		},
		error: function(xhr, textStatus, thrownError){
			if ( self.failCallback )
				self.failCallback('Internal server error');
		}
	});
}

/**************************************************************************************************************/

/**
  *	Send GET request to know the phase of current job
  */
UWSBase.prototype.checkPhase = function()
{
	var self = this;
	$.ajax({
		type: "GET",
		url: this.baseUrl + "/" + this.currentJob + '/phase',
		success: function(response, textStatus, xhr){
			// Response is a phase
			if ( self.onloadCallback )
				self.onloadCallback(response);

			if ( response == "COMPLETED" )
			{
				window.clearInterval(self.checkFn);;
				self.getJobResults();
			} 
			else if ( response == "ERROR" )
			{
				window.clearInterval(self.checkFn);
				if ( self.failCallback )
					self.failCallback('Internal server error');
			}
		},
		error: function (xhr, textStatus, thrownError) {
			window.clearInterval(self.checkFn);
			if ( self.failCallback )
				self.failCallback(self.name + ' service: '+ thrownError);
			console.error( xhr.responseText );
		}
	});
}

/**************************************************************************************************************/

/**
 *	Send POST request to launch the job of current service
 */
UWSBase.prototype.post = function(parameters, options)
{
	this.successCallback = options.successCallback;
	this.onloadCallback = options.onloadCallback;
	this.failCallback = options.failCallback;

	if ( !this.baseUrl )
	{
		if ( this.failCallback )	
			this.failCallback(this.name + ' service: baseUrl is undefined');
		console.error(this.name + ' service baseUrl is undefined');
	}
	else
	{
		window.clearInterval(this.checkFn);
		var self = this;
		$.ajax({
			type: "POST",
			url: this.baseUrl,
			dataType: "xml",
			data: parameters,
			success: function(response, textStatus, xhr){
				var xmlDoc = $.parseXML( xhr.responseText );
				self.currentJob = $(xmlDoc).find('uws\\:jobId, jobId').text();

				// Check job phase every "checkDelay" seconds
				self.checkFn = window.setInterval( function(){
					self.checkPhase.call(self);
				}, self.checkDelay );
			},
			error: function (xhr, textStatus, thrownError) {
				window.clearInterval(self.checkFn);
				if ( self.failCallback )
					self.failCallback(self.name + ' service: ' + thrownError);
				console.error( xhr.responseText );
			}
		});
	}
}

/**************************************************************************************************************/

/**
 *	Send DELETE request to remove the results of the given job
 */
UWSBase.prototype.delete = function(jobId, options)
{
	var successCallback = options.successCallback;
	var failCallback = options.failCallback;

	if ( !this.baseUrl )
	{
		if ( this.failCallback )	
			this.failCallback(this.name + ' service: baseUrl is undefined');
		console.error(this.name + ' service baseUrl is undefined');
	}
	else
	{
		$.ajax({
			type: "DELETE",
			url: this.baseUrl + "/" + jobId,
			success: function(response, textStatus, xhr){
				if ( successCallback )
					successCallback();
			},
			error: function (xhr, textStatus, thrownError) {
				if ( failCallback )
					failCallback(self.name + ' service: ' + thrownError);
				console.error( xhr.responseText );
			}
		});
	}
}

/**************************************************************************************************************/

return UWSBase;

/**************************************************************************************************************/

});