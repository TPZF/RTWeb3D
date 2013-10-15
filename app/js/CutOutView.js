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

define( [ "jquery.ui", "SelectionTool", "UWSManager", "gw/CoordinateSystem", "AnimatedButton", "underscore-min", "text!../templates/cutOut.html" ],
		function($, SelectionTool, UWSManager, CoordinateSystem, AnimatedButton, _, cutOutHTMLTemplate) {

// Template generating UWS services div
var cutOutTemplate = _.template(cutOutHTMLTemplate);

/**
 * UWS CutOut View
 */
var CutOutView = function(element, selectionTool, pickingManager)
{
	this.url;
	this.pickingManager = pickingManager;
	// Initialize selection tool
	this.selectionTool = selectionTool;

	var cutOutContent = cutOutTemplate();
	var self = this;
	$('#'+element).html("");
	this.$content = $(cutOutContent)
		.appendTo('#'+element)
		.find('#selectionTool')
			.button()
			.click(function(){
				self.$content.slideUp();
				// Deactivate picking events
				self.pickingManager.deactivate();
				self.selectionTool.toggle();
			}).end()
		.find('#clearSelection')
			.button()
			.click(function(){
				self.selectionTool.clear();
			}).end();

	this.runButton = new AnimatedButton( $('#'+element).find('#runJob')[0], {
		onclick: $.proxy(this.runJob, this)
	} );
}

/**************************************************************************************************************/

/**
 *	Run job
 */
CutOutView.prototype.runJob = function()
{	
	this.runButton.startAnimation();

	var parameters = {
		PHASE: "RUN",
		uri: this.url,
		ra: this.selectionTool.geoPickPoint[0],
		dec: this.selectionTool.geoPickPoint[1],
		radius: this.selectionTool.geoRadius
	};
	var self = this;
	UWSManager.post('cutout', parameters, {
		successCallback: function(results)
		{
			self.showMessage('Completed');
			for ( var x in results )
			{
				var proxyIndex = x.search('file_id=');

				var shortName;
				if ( proxyIndex >= 0 )
				{
					shortName = x.substr(proxyIndex+8);
				}
				else
				{
					shortName = x;
				}
				self.runButton.stopAnimation();
				$('<li style="display: none;">'+shortName+' <a href="' + results[x] +'" download="'+shortName+'"><img style="vertical-align: middle; width: 20px; height: 20px;" title="Download" src="css/images/download1.png"></a></li>')
					.appendTo(self.$content.find('.cutoutResults').find('ul'))
					.fadeIn(400);
			}
		},
		failCallback: function(error)
		{
			self.runButton.stopAnimation();
			self.showMessage(error);
		}
	});
}

/**************************************************************************************************************/

CutOutView.prototype.showMessage = function(message)
{
	this.$content.find('.jobStatus').html(message).stop().slideDown(300).delay(2000).slideUp();
}

/**************************************************************************************************************/

CutOutView.prototype.setUrl = function(url)
{
	this.url = url;
}

/**************************************************************************************************************/

return CutOutView;

});