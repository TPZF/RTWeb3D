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
define(["jquery", "./DynamicImageView", "./PickingManager", "./HEALPixFITSLayer", "./LayerServiceView", "./Samp", "./ErrorDialog", "jquery.ui"],
		function($, DynamicImageView, PickingManager, HEALPixFITSLayer, LayerServiceView, Samp, ErrorDialog){

var nbBackgroundLayers = 0; // required because background id is always equal to 0
var globe;
var layerManager;

var backgroundDiv;
var selectedLayer;

/**************************************************************************************************************/

/**
 *	Update layout of background layer options (HEALPixFITSLayer only for now)
 */
function updateBackgroundOptions(layer)
{		
	if ( layer instanceof HEALPixFITSLayer )
	{
		$("#fitsType").removeAttr('disabled').removeAttr('checked').button("refresh");
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

	var $layerServices = $('#backgroundLayers').find('.layerServices');
	if ( !layer.availableServices )
	{
		$layerServices.attr('disabled','disabled').button('refresh');
	}
	else
	{
		$layerServices.removeAttr('disabled').button('refresh');
	}
}

/**************************************************************************************************************/

/**
 *	Create the Html for the given background layer
 */
function createHtmlForBackgroundLayer( gwLayer )
{
	// Add HTML
	var $layerDiv = $('<option '+ (gwLayer.visible() ? "selected" : "") +'>'+ gwLayer.name + '</option>')
			.appendTo('#backgroundLayersSelect')
			.data("layer", gwLayer);
	
	if ( gwLayer.icon )
	{	
		$layerDiv.addClass('backgroundLayer_'+ nbBackgroundLayers)
					.attr("data-style", "background-image: url("+gwLayer.icon+")" );
	}
	else
	{
		// Use default style for icon
		$layerDiv.addClass('backgroundLayer_'+ nbBackgroundLayers)
					.attr("data-class", "unknown" );
	}

	if ( gwLayer.visible() )
	{
		// Update background options layout
		updateBackgroundOptions(gwLayer);
		selectedLayer = gwLayer;
	}

	$('#backgroundLayersSelect').iconselectmenu("refresh");	
	nbBackgroundLayers++;
}

/**************************************************************************************************************/

return {
	init : function(gl, lm)
	{
		// Add custion icon select menu
		$.widget( "custom.iconselectmenu", $.ui.selectmenu, {
			_renderItem: function( ul, item ) {
				var li = $( "<li>", { text: item.label } );

				if ( item.disabled ) {
					li.addClass( "ui-state-disabled" );
				}

				$( "<span>", {
					style: item.element.attr( "data-style" ),
					"class": "ui-icon " + item.element.attr( "data-class" )
				}).appendTo( li );

				return li.appendTo( ul );
			}
		});

		globe = gl;
		layerManager = lm;

		// Create Dynamic image view activator for background layers
		$('#fitsView').button({
			text: false,
			icons: {
				primary: "ui-icon-image"
			}
		});

		$('#backgroundLayers').find('.layerServices').button({
			text: false,
			icons: {
				primary: "ui-icon-wrench"
			}
		}).click(function(event){
			LayerServiceView.show( selectedLayer );
		});

		$('#backgroundLayers').find('.exportLayer').button({
			text: false,
			icons: {
				primary: "ui-icon-extlink"
			}
		}).click(function(event){
			if ( Samp.isConnected() )
			{
				var healpixLayer = globe.tileManager.imageryProvider;
				for ( var i=0; i<globe.tileManager.tilesToRender.length; i++ )
				{
					var tile = globe.tileManager.tilesToRender[i];
					var url = window.location.origin + healpixLayer.getUrl( tile );
					Samp.sendImage(url);
				}
			}
			else
			{
				ErrorDialog.open('You must be connected to SAMP Hub');
			}
		});		

		var dialogId = backgroundDiv;
		var $dialog = $('<div id="'+dialogId+'"></div>').appendTo('body').dialog({
			title: 'Image processing',
			autoOpen: false,
			show: {
				effect: "fade",
		    	duration: 300
			},
			hide: {
				effect: "fade",
				duration: 300
			},
			width: 400,
			resizable: false,
			minHeight: 'auto',
			close: function(event, ui)
			{
				$('#fitsView').removeAttr("checked").button("refresh");
				$(this).dialog("close");
			}
		});

		// Show/hide Dynamic image service
		$('#fitsView').on("click", function(event){

			if ( $dialog.dialog( "isOpen" ) )
			{
				$dialog.dialog("close");
			}
			else
			{
				$dialog.dialog("open");
			}
		});

		backgroundDiv = new DynamicImageView(dialogId, {
			id : 'backgroundFitsView',
		});

		$('#fitsType').button();
		$('#fitsType').on('click', function(){

			isFits = $(this).is(':checked');

			selectedLayer.dataType = isFits ? 'fits' : 'jpg';
			if ( !isFits )
			{
				$('#fitsView').button('disable');
			}

			globe.setBaseImagery( null );
			globe.setBaseImagery( selectedLayer );
			$('#loading').show();
		});
	},
	addView : createHtmlForBackgroundLayer,

	/**
	 *	Creates select menu
	 */
	updateUI : function() {

		$('#backgroundLayersSelect').iconselectmenu({
			select: function(event, ui)
			{
				var index = ui.item.index;
				var layer = $(this).children().eq(index).data("layer");
				selectedLayer = layer;

				if ( layer != globe.baseImagery ) {
					// Clear selection
					PickingManager.getSelection().length = 0;

					// Change visibility's of previous layer, because visibility is used to know the active background layer in the layers list (layers can be shared)
					globe.baseImagery.visible(false);
					globe.setBaseImagery( layer );
					layer.visible(true);

					// Show background loading spinner
					$('#loading').show(300);

					// Remove solar object sublayers
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
								if (subLayer.name == "SolarObjectsSublayer" )
								{
									PickingManager.removePickableLayer( subLayer );
									globe.removeLayer( subLayer );
									currentLayer.subLayers.splice(j,1);
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
			}
		}).iconselectmenu( "menuWidget" )
				.addClass( "ui-menu-icons customicons" );

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