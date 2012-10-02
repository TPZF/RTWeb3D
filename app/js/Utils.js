
/**
 * Utility module : contains various functions useful for differnt modules
 */
 define([], function() {

return {
	
	roundNumber : function (num, dec) {
		var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
		return result;
	}
};

});
