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
 * Moc display & Moc xMatch services
 */
define( [ "jquery.ui", "gw/CoordinateSystem", "gw/Numeric", "UWSManager", "ErrorDialog", "Utils" ],
		function($, CoordinateSystem, Numeric, UWSManager, ErrorDialog, Utils) {

var globe;
var navigation;
var nbLayers = 0;

return {
	init: function(gl, nav){
		globe = gl;
		navigation = nav;
	},

	addService: function(tabs)
	{
		// Append headers
		$('<li style="display: none;"><a href="#HEALPixCut">HEALPixCut</a></li>')
			.appendTo( tabs.children( ".ui-tabs-nav" ) )
			.fadeIn(300);		

		// Append content
		tabs.append('<div id="HEALPixCut">\
						<button id="HEALPixCutBtn">Cut viewport</button>\
						<div style="display: inline-block; width: auto; height: 1em;" class="status"></div>\
						<div style="margin-top: 15px;">\
							<em style="font-size: 14px;">Results</em>\
							<div class="HEALPixCutResults">\
								<ul style="list-style-type: none;">\
								</ul>\
							</div>\
						</div>\
					</div>');

		$('#HEALPixCutBtn').button().click(function(event){

			// Find RA/Dec of each corner of viewport
			var coords = [ [0,0], [globe.renderContext.canvas.width, 0], [globe.renderContext.canvas.width, globe.renderContext.canvas.height], [0, globe.renderContext.canvas.height] ];
			for ( var i=0; i<coords.length; i++ )
			{
				var geo = globe.getLonLatFromPixel( coords[i][0], coords[i][1] );
				// Convert to RA/Dec
				if ( geo[0] < 0 )
				{
					geo[0]+=360;
				}
				coords[i] = geo;
			}

			// Find angle between eye and north
			var geoEye = [];
			CoordinateSystem.from3DToGeo(navigation.center3d, geoEye);

			var LHV = [];
			CoordinateSystem.getLHVTransform(geoEye, LHV);

			var astro = Utils.formatCoordinates([ geoEye[0], geoEye[1] ]);
			
			var north = [LHV[4],LHV[5],LHV[6]];
			var cosNorth = vec3.dot(navigation.up, north);
			var radNorth = Math.acos(cosNorth);
			if ( isNaN(radNorth) )
			{
				console.error("North is NaN'ed...");
				return;
			}
			var degNorth = radNorth * 180/Math.PI;		
			
			// Depending on z component of east vector find if angle is positive or negative
		    if ( globe.renderContext.viewMatrix[8] < 0 ) {
		    	degNorth *= -1;
		    }

			// Find angles between top-left/top-right and top-right/bottom-right points of viewport
			var xDotProduct = vec3.dot( CoordinateSystem.fromGeoTo3D(coords[0]), CoordinateSystem.fromGeoTo3D(coords[1]) );
			var yDotProduct = vec3.dot( CoordinateSystem.fromGeoTo3D(coords[1]), CoordinateSystem.fromGeoTo3D(coords[2]) );
		    var cdelt1 = Numeric.toDegree(Math.acos(xDotProduct)) /* * 3600*/;
		    var cdelt2 = Numeric.toDegree(Math.acos(yDotProduct)) /* * 3600*/;

			var parameters = {
				long1: coords[0][0],
				lat1: coords[0][1],
				long2: coords[1][0],
				lat2: coords[1][1],
				long3: coords[2][0],
				lat3: coords[2][1],
				long4: coords[3][0],
				lat4: coords[3][1],
				rotation: degNorth,
				coordSystem: CoordinateSystem.type == "EQ" ? "EQUATORIAL" : "GALACTIC",
				cdelt1: cdelt1,
				cdelt2: cdelt2,
				filename: "HFI_SkyMap_857_2048_R1.10_nominal.fits",	// Constant HEALPix map
				PHASE: "RUN"
			}

			$('#HEALPixCut').find('.status').html('Healpix cut is in progress, be patient, it may take some time.').css('display: inline-block');
			UWSManager.post( 'healpixcut', parameters, {
				successCallback: function( result )
				{
					$('#HEALPixCut').find('.status').hide();

					$('<li style="display: none;">Viewport ('+ astro[0] +' x '+ astro[1] +') : <a href="' + result +'" download="result.fits"><img style="vertical-align: middle; width: 20px; height: 20px;" title="Download" src="css/images/download1.png"></a></li>')
						.appendTo( $('#HEALPixCut').find('.HEALPixCutResults ul') )
						.fadeIn();
					nbLayers++;
				},
				failCallback: function(message){
					$('#HEALPixCut').find('.status').hide();
					ErrorDialog.open(message);
				},
				onloadCallback: function()
				{
					$('#HEALPixCut').find('.status').animate({opacity: 0.}, 400, function(){
						$(this).animate({opacity: 1.}, 400);
					});
					console.log("loading...");
				}
			} );

		});
	},

	removeService: function(tabs)
	{
		tabs.find( '.ui-tabs-nav li[aria-controls="MocService"]').css("opacity", 0.);
		var index = $(this).index();
		tabs.tabs("remove",index);
	}
}

});