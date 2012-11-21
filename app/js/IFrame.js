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
	show: function(){
		$iframeDiv.animate({top: 100}, 800);
	},

	/**
	 *	Set iframe
	 *
	 *	@param html External link url
	 */
	set: function( html ){
		$iframeDiv.find('iframe').attr('src', html);
	}
};

});
