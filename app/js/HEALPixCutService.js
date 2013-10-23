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
define( [ "jquery.ui", "gw/CoordinateSystem", "gw/Numeric", "UWSManager", "Samp", "ErrorDialog", "Utils", "underscore-min", "text!../templates/healpixCutService.html", "text!../templates/cutResultItem.html"  ],
		function($, CoordinateSystem, Numeric, UWSManager, Samp, ErrorDialog, Utils, _, healpixCutServiceHTMLTemplate, healpixCutServiceItemHTMLTemplate ) {

var globe;
var navigation;
var results = [];

// Template generating the healpixCut service content
var healpixCutServiceTemplate = _.template(healpixCutServiceHTMLTemplate);

// Template generating the result of healpix cut
var healpixCutServiceItemTemplate = _.template(healpixCutServiceItemHTMLTemplate);

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
		var healpixCutServiceContent = healpixCutServiceTemplate({ itemTemplate: healpixCutServiceItemTemplate, results: results });
		tabs.append(healpixCutServiceContent)
			.find('li').fadeIn();


		tabs.find('input').on('focus', function(){
			$(this).removeClass('inputError');
		});

		$('#HEALPixCut').on('click', '.sampExport', function(event){
			if ( Samp.isConnected() )
			{
				Samp.sendImage( $(this).data('url') );
			}
			else
			{
				ErrorDialog.open('You must be connected to SAMP Hub');
			}
		});
		
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

		    var cdelt1 = parseFloat( $('#cdelt1').val() );
		    var cdelt2 = parseFloat( $('#cdelt2').val() );

		    // Get choosen layer
		    var healpixLayer = globe.tileManager.imageryProvider;

		    if ( !healpixLayer.healpixCutFileName )
		    {
		    	ErrorDialog.open("healpixCutFileName isn't defined for current layer<br/>");
		    }

		    if ( isNaN(cdelt1) || isNaN(cdelt2) )
		    {
		    	$('#HEALPixCut').find('input').each(function(){
		    		if (!$(this).val())
		    		{
		    			$(this).addClass('inputError');
		    		}
		    	});
		    	return;
		    }

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
				coordSystem: "EQUATORIAL",
				cdelt1: cdelt1,
				cdelt2: cdelt2,
				filename: healpixLayer.healpixCutFileName,
				PHASE: "RUN"
			}

			$('#HEALPixCut').find('.status').html('Healpix cut is in progress, be patient, it may take some time.').fadeIn().css('display: inline-block');
			UWSManager.post( 'healpixcut', parameters, {
				successCallback: function( result )
				{
					var name = 'Viewport ( '+ astro[0] + ' x '+ astro[1] +' )'; 
					var result = {
						name: name,
						url: result,
						downloadName: name.replace('"','&quot;' ) + '.fits'
					};
					results.push( result );

					$('#HEALPixCut').find('.status').hide();
					var healpixCutItem = healpixCutServiceItemTemplate({result: result});
					$(healpixCutItem)
						.appendTo( $('#HEALPixCut').find('.HEALPixCutResults ul') ).fadeIn();
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
				}
			} );

		});
	},

	removeService: function(tabs)
	{
		tabs.find( '.ui-tabs-nav li[aria-controls="HEALPixCut"]').css("opacity", 0.);
		var index = $(this).index();
		tabs.tabs("remove",index);
	}
}

});