/**
 * Error dialog module
 */
define(["jquery.ui"], function($) {

// The main div for error
var errorDiv = '<div id="errorDiv" title="Error"></div>';

// Create the div, use jQuery UI dialog
var $errorDiv = $(errorDiv)
					.appendTo('body')
					.dialog({
						autoOpen: false,
						resizable: false,
						width: '300px',
						minHeight: 'auto',
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