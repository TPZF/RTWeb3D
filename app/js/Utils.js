
/**
 * Utility module : contains various functions useful for differnt modules
 */
 define([], function() {

// Private function to round number (Can be public maybe?)
function roundNumber(num, dec) {
	var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
	return result;
}

return {

	/**
	 * 	Function formatting equatorial coordinates
	 * 
	 * 	@param {String[]} equatorialCoordinates Array of equatorial coordinates coming from <CoordinateSystem.fromGeoToEquatorial>
	 * 	@return {String} Contains the HTML string "user-friendly" view of equatorial coordinates
	 */
	equatorialLayout: function(equatorialCoordinates) {
		var wordRA = equatorialCoordinates[0].split(" ");
		var wordDecl = equatorialCoordinates[1].split(" ");
		return [ wordRA[0] +"h "+ wordRA[1] +"mn "+ roundNumber(parseFloat(wordRA[2]), 4) +"s", wordDecl[0] +"&#186 "+ wordDecl[1] +"' "+ roundNumber(parseFloat(wordDecl[2]), 4) ];
	}
};

});
