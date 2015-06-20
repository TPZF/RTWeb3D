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

/*global define: false */

define( [ "jquery", "./SelectionTool", "./UWSManager", "./Samp", "./AnimatedButton", "./ErrorDialog", "underscore-min", "text!../templates/cutOut.html", "text!../templates/cutResultItem.html", "jquery.ui" ],
		function($, SelectionTool, UWSManager, Samp, AnimatedButton, ErrorDialog, _, cutOutHTMLTemplate, cutResultHTMLTemplate) {

// Template generating UWS services div
var cutOutTemplate = _.template(cutOutHTMLTemplate);

// Template generating the cutOut result li
var cutResultTemplate = _.template(cutResultHTMLTemplate);

/**
 * UWS CutOut View
 */
var CutOutView = function(element, selectionTool, pickingManager)
{
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

	this.$content.on('click', '.sampExport', function(event){
		if ( Samp.isConnected() )
		{
			Samp.sendImage( $(this).data('url') );
		}
		else
		{
			ErrorDialog.open('You must be connected to SAMP Hub');
		}			
	});

	this.$content.on('click', '.deleteResult', function(event){
		var $job = $(this).parent();
		var jobId = $job.data('jobid');

		UWSManager.delete( 'cutout', jobId, {
			successCallback: function()
			{
				// Remove all job-related results
				$job.parent().find('li[data-jobid='+$job.data('jobid')+']').each(function(){
					$(this).fadeOut(function(){
						$(this).remove();
					});
				});
			},
			failCallback: function(thrownError)
			{
				console.error(thrownError);
				// Fade out anyway
				$job.parent().find('li[data-jobid='+$job.data('jobid')+']').each(function(){
					$(this).fadeOut(function(){
						$(this).remove();
					});
				});
			}
		} );
	});
};

/**************************************************************************************************************/

/**
 *	Run job
 */
CutOutView.prototype.runJob = function()
{	
	if ( this.selectionTool.selectionFeature )
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
			successCallback: function(response, jobId)
			{
				self.showMessage('Completed');
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

					var proxyIndex = name.search('file_id=');
					var shortName;
					if ( proxyIndex >= 0 )
					{
						shortName = name.substr(proxyIndex+8);
					}
					else
					{
						shortName = name;
					}
					self.runButton.stopAnimation();

					result = {
						name: shortName,
						url: url,
						jobId: jobId
					};

					var cutOutResult = cutResultTemplate({result: result});
					$(cutOutResult)
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
	else
	{
		this.showMessage('Please, select area to cut');
	}
};

/**************************************************************************************************************/

CutOutView.prototype.showMessage = function(message)
{
	this.$content.find('.jobStatus').html(message).stop().slideDown(300).delay(2000).slideUp();
};

/**************************************************************************************************************/

CutOutView.prototype.setUrl = function(url)
{
	this.url = url;
};

/**************************************************************************************************************/

return CutOutView;

});
