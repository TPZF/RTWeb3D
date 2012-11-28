/**
 * Error dialog module
 */
define(["jquery.ui"], function($) {

var errorDiv = '<div id="errorDiv" title="Error"></div>';

var $errorDiv = $(errorDiv)
					.appendTo('body')
					.dialog({
						autoOpen: false,
						resizable: false,
						width: '300px',
						dialogClass: 'errorBox'
					});

return {
	/**
	 *	Open dialog
	 *
	 *	@param html HTML text
	 */
	open: function( html ){
		$errorDiv
			.html(html)
			.dialog( "open" );
		}
};

});