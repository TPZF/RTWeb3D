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
 * Error dialog module
 */
define(["jquery.ui"], function($) {

// The main div for error
var errorDiv = '<div id="errorDiv" style="text-align: justify" title="Error"></div>';
var mobileErrorDiv = '<div data-role="page" style="position: absolute;" id="errorDiv">\
							<div data-role="header">\
							<h2>Error</h2>\
						</div>\
						<div class="errorContent" data-role="content"></div>\
					  </div>';

var $errorDiv;
var isMobile;

return {
	
	/**
	 *	Initialize error dialog
	 */
	init: function(options)
	{
		isMobile = options.hasOwnProperty('isMobile') ? options.isMobile : false;
		if ( isMobile )
		{
			$errorDiv = $(mobileErrorDiv)
							.appendTo('body');
			$errorDiv.trigger("create");
		}
		else
		{
			$errorDiv = $(errorDiv)
					.appendTo('body')
					.dialog({
						autoOpen: false,
						resizable: false,
						draggable: false,
						width: '300px',
						minHeight: 'auto',
						dialogClass: 'errorBox'
					});
		}
	},
	/**
	 *	Open dialog
	 *
	 *	@param html HTML text
	 */
	open: function( html ){
		if ( isMobile )
		{
			$errorDiv
				.find('div[data-role="content"]')
					.html(html);
			$.mobile.changePage( "#errorDiv", { role: "dialog" } );
		}
		else
		{
			$errorDiv
				.html(html)
				.dialog( "open" );
			}
		}
};

});