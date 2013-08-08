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
 * UWS service
 *	- CutOut only currently
 */
define( [ "jquery.ui", "CutOutView", "underscore-min", "text!../templates/uwsService.html", "jquery.ui.selectmenu" ],
		function($, CutOutView, _, uwsServiceHTMLTemplate) {

// Template generating UWS services div
var uwsServiceTemplate = _.template(uwsServiceHTMLTemplate);

return {
	init: function(gl, nav, conf)
	{
		CutOutView.init({
			baseUrl: conf.cutOut.baseUrl,
			globe: gl,
			navigation: nav
		});
	},

	/**
	 *	Add service to jQueryUI tabs
	 *
	 *	@param tabs jQueryUI tabs selector
	 */
	addService: function(tabs)
	{
		// Append header
		$('<li style="display: none;"><a href="#UWSService">UWS</a></li>')
			.appendTo( tabs.children( ".ui-tabs-nav" ) )
			.fadeIn(300);
		// Append content
		tabs.append('<div id="UWSService"></div>');

		var uwsServiceContent = uwsServiceTemplate();

		$(uwsServiceContent)
			.appendTo('#UWSService')
			.find('select').selectmenu({
				select: function(){
					var contentId = $(this).val();
					// Hide visible siblings
					$(this).siblings('div:visible').fadeOut(300, function(){
						// Show the choosen one J
						$('#'+contentId).fadeIn();
					});
				}
			});

		CutOutView.add("cutOut");
	},

	/**
	 *	Remove service from jQueryUI tabs
	 *
	 *	@param tabs jQueryUI tabs selector
	 */
	removeService: function(tabs)
	{
		tabs.find( '.ui-tabs-nav li[aria-controls="UWSService"]').fadeOut(300, function(){
			var index = $(this).index();
			tabs.tabs("remove",index);
		});

		CutOutView.remove();
	}
}

});
