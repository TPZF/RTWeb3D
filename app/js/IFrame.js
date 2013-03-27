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
		<div id="IFrameToolbar" class="ui-widget-header ui-widget-header ui-corner-all">\
		  <button id="previous">Previous page</button>\
		  <button id="next">Next page</button>\
		</div>\
		<div class="closeBtn">\
			<img src="css/images/close_button.png" alt="" class="defaultImg" />\
			<img style="opacity: 0" src="css/images/close_buttonHover.png" alt="" class="hoverImg" />\
		</div>\
		<iframe src=""><p>Your browser does not support iframes.</p></iframe>\
	</div>';
var $iframeDiv = $(iframe).appendTo('body');

var history = {
	pile : [],
	index: 0,
	clicked: false,
	clean: function()
	{
		this.pile.length = 0;
		this.index = 0;
		this.clicked = false;
	}
};

$( "#previous" ).button({
	width: 20,
	height: 20,
	text: false,
	icons: {
    	primary: "ui-icon-circle-triangle-w"
	}
}).click(function(event){
	event.preventDefault();
	console.log('prev : '+history.index);
	if ( history.index > 1 )
	{
		history.index--;
		history.clicked = true;
		$iframeDiv.find('iframe')[0].contentWindow.history.back();
	}
});

$( "#next" ).button({
	width: 20,
	height: 20,
	text: false,
	icons: {
		secondary: "ui-icon-circle-triangle-e"
	}
}).click(function(event){
	event.preventDefault();
	console.log('next : '+history.index);
	if ( history.index != history.pile.length )
	{
		history.index++;
		history.clicked = true;
		$iframeDiv.find('iframe')[0].contentWindow.history.forward();
	}
});

$iframeDiv.find('iframe').on('load', function(){
	console.log('onLoad : clicked: '+history.clicked+'index : '+history.index);
	if ( history.clicked )
	{
		history.clicked = false;
		return false;
	}
	
	// Update history
	history.pile.splice(history.index);
	history.pile.push($iframeDiv.find('iframe')[0].attributes.src.nodeValue);
	history.index++;
});

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
		history.clean();
		historyClick = false;
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
