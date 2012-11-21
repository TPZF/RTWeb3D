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
