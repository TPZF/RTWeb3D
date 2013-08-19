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
 * BackgroundLayersView module
 */
define(["jquery.ui", "DynamicImageView", "PickingManager"], function($, DynamicImageView, PickingManager){

// Necessary for selectmenu initialization
var backgroundLayersIcons = []; 
var nbBackgroundLayers = 0; // required because background id is always equal to 0
var globe;
var layerManager;

var backgroundDiv;

/**************************************************************************************************************/

/**
 *	Update layout of background layer options (HEALPixFITSLayer only for now)
 */
function updateBackgroundOptions(layer)
{		
	if ( layer.fitsShader )
	{
		$("#fitsType").removeAttr('disabled').button("refresh");
		// Dynamic image view button visibility
		if ( layer.dataType == 'jpeg' )
		{
			$('#fitsView').button("disable");
		}
	}
	else
	{
		$("#fitsType").attr('disabled','disabled').button("refresh");
		$('#fitsView').button("disable");
	}
}

/**************************************************************************************************************/

/**
 *	Create the Html for the given background layer
 */
function createHtmlForBackgroundLayer( gwLayer )
{
	// Add HTML
	var $layerDiv = $('<option>'+ gwLayer.name + '</option>')
			.appendTo('#backgroundLayersSelect')
			.data("layer", gwLayer);
	
	if ( gwLayer.icon )
	{		
		backgroundLayersIcons.push( {find: ".backgroundLayer_" + nbBackgroundLayers} );
		$layerDiv.addClass('backgroundLayer_'+ nbBackgroundLayers)
				.data("bgImage", "url("+gwLayer.icon+")" );
	}
	else
	{
		// Use default style
		backgroundLayersIcons.push( {find: ".unknown"} );
		$layerDiv.addClass('unknown');
	}

	if ( gwLayer.visible() )
	{
		// Set visible layer on top of selector
		$('#backgroundLayersSelect').val( $layerDiv.val() );
		// Update background options layout
		updateBackgroundOptions(gwLayer);
	}
	
	
	nbBackgroundLayers++;
}

/**************************************************************************************************************/

return {
	init : function(gl, lm)
	{
		globe = gl;
		layerManager = lm;

		// Create Dynamic image view activator for background layers
		$('#fitsView').button({
			text: false,
			icons: {
				primary: "ui-icon-image"
			}
		});

		backgroundDiv = new DynamicImageView({
			activator : 'fitsView',
			id : 'backgroundFitsView',
			enable : function(){
				$('#fitsView').button("enable");
			},
			disable : function(){
				$('#fitsView').button("disable");
			},
			unselect: function(){
				$('#fitsView').removeAttr("checked").button("refresh");
			}
		});

		// Show/hide Dynamic image service
		$('#fitsView').on("click", function(event){
			backgroundDiv.toggle();
		});

		$('#fitsType').button();
		$('#fitsType').on('click', function(){
			var index = $('#backgroundLayersSelect').data('selectmenu').index();
			var layer = $('#backgroundLayersSelect').children().eq(index).data("layer");

			isFits = $(this).is(':checked');

			layer.dataType = isFits ? 'fits' : 'jpg';
			if ( !isFits )
			{
				$('#fitsView').button('disable');
			}
			globe.setBaseImagery( layer );
			$('#loading').show();
		});
	},
	addView : createHtmlForBackgroundLayer,

	/**
	 *	Creates select menu
	 */
	updateUI : function() {
		$('#backgroundLayersSelect').selectmenu({
			icons: backgroundLayersIcons,
			bgImage: function() {
				return this.data('bgImage');
			},
			select: function(e)
			{
				var index = $(this).data('selectmenu').index();
				var layer = $(this).children().eq(index).data("layer");

				// Clear selection
				PickingManager.getSelection().length = 0;

				// Change visibility's of previous layer(maybe GlobWeb should do it ?)
				globe.tileManager.imageryProvider.visible(false);
				globe.setBaseImagery( layer );
				layer.visible(true);

				// Show background loading spinner
				$('#loading').show(300);

				// Add all previously added sub-layers to the new imagery
				var gwLayers = layerManager.getLayers();
				for ( var i=0; i<gwLayers.length; i++ )
				{
					var currentLayer = gwLayers[i];
					if ( currentLayer.subLayers )
					{
						var len = currentLayer.subLayers.length;
						for ( var j=0; j<len; j++ )
						{
							var subLayer = currentLayer.subLayers[j];
							// Remove solar object sublayer
							if (subLayer.name == "SolarObjectsSublayer" )
							{
								PickingManager.removePickableLayer( subLayer );
								globe.removeLayer( subLayer );
								currentLayer.subLayers.splice(j,1);
							}
							else
							{
								globe.addLayer( subLayer );
							}
						}
					}
				}

				// Set shader callback for choosen layer
				backgroundDiv.changeShaderCallback = function(contrast){
					if ( contrast == "raw" )
					{
						layer.customShader.fragmentCode = layer.rawFragShader;
					} else {
						layer.customShader.fragmentCode = layer.colormapFragShader;
					}
				};

				// Change dynamic image view button
				updateBackgroundOptions(layer);
			}
		});

		// Background spinner events
		globe.subscribe("startBackgroundLoad", function(layer){
			$('#backgroundSpinner').fadeIn('fast');
		});
		globe.subscribe("endBackgroundLoad", function(layer){
			$('#backgroundSpinner').fadeOut('fast');
		});
	},
	getDiv : function() {
		return backgroundDiv;
	}
}

});