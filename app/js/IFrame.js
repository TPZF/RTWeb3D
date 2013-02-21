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
 * IFrame module : popup appearing when clicking on external link
 */
define(["jquery.ui"], function($) {

var iframe = 
	'<div id="externalIFrame" class="contentBox">\
		<div class="closeBtn">\
			<img src="css/images/close_button.png" alt="" class="defaultImg" />\
			<img style="opacity: 0" src="css/images/close_buttonHover.png" alt="" class="hoverImg" />\
		</div>\
		<iframe src=""><p>Your browser does not support iframes.</p></iframe>\
	</div>';
var $iframeDiv = $(iframe).appendTo('body');

return {
	hide: function(){
		$iframeDiv.animate({top: -1000}, 800);
	},

	/**
	 *	Show iframe
	 *
	 *	@param html External link url
	 */
	show: function( html ){
		var canvasWidth = parseInt( $('#GlobWebCanvas').css("width") );
		var canvasHeight = parseInt( $('#GlobWebCanvas').css("height") );
		var optimalWidth = canvasWidth * 0.8;
		var optimalHeight = canvasHeight * 0.8;
		var optimalTop = canvasHeight * 0.1;
		$iframeDiv.find('iframe').css({ width: optimalWidth, height: optimalHeight }).attr('src',html);
		$iframeDiv.animate({top: optimalTop}, 800);
	}
};

});
