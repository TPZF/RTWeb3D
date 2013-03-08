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
 *	Progress bar module
 */
define([ "underscore-min", "text!../templates/progressBar.html" ], function(_, progressBarHTMLTemplate){

// Template generating the progress bar div
var progressBarTemplate = _.template(progressBarHTMLTemplate);

var ProgressBar = function(globe, featureData, xhr)
{
	var self = this;
	var progressDiv = progressBarTemplate( { featureId: featureData.feature.properties.identifier });
	this.jProgress = $(progressDiv)
		.appendTo('#progressBars')
		.find('.progressBar').progressbar({
			value: 0,
			create: function(){
				$(this).find('.progress-label').text( "0%" );
			},
			change: function() {
				$(this).find('.progress-label').text( $(this).progressbar( "value" ) + "%");
			},
			complete: function() {
				self.hide();
				$(this).find('.progress-label').text( "100%" );
			}	
		}).end()
		.find('button').button().end()
		.find('#cancelFitsRequest').click(function(){
			self.cancel();
			globe.publish("removeFitsRequested", featureData);
		}).end();

	this.xhr = xhr;
	xhr.onprogress = function(evt)
	{
		if (evt.lengthComputable) 
		{
			//evt.loaded the bytes browser receive
			//evt.total the total bytes seted by the header

			var percentComplete = Math.floor( (evt.loaded / evt.total)*100 );
			self.jProgress.find(".progressBar").progressbar( "value", percentComplete );
		}
	};

	this.show();
}

ProgressBar.prototype.show = function()
{
	this.jProgress.show().animate({right: 50}, 500, function(){
		$(this).animate({right:0});
	});
}

ProgressBar.prototype.hide = function()
{
	this.jProgress.animate({right: 50}, function(){
		$(this).animate({right:-360}, 500, function(){
			$(this).remove();
		});
	});
}

ProgressBar.prototype.cancel = function()
{
	this.xhr.abort();
	this.hide();
}

return ProgressBar;

});