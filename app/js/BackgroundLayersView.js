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
define(["jquery", "underscore-min", "./LayerManager", "./DynamicImageView", "./PickingManager", "./HEALPixFITSLayer", "./LayerServiceView", "./Samp", "./ErrorDialog", "text!../templates/backgroundLayers.html", "jquery.ui"],
		function($, _, LayerManager, DynamicImageView, PickingManager, HEALPixFITSLayer, LayerServiceView, Samp, ErrorDialog, backgroundLayersHTML){

var nbBackgroundLayers = 0; // required because background id is always equal to 0
var sky;
var layerManager;
var parentElement;
var $el;

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

	var $layerServices = $el.find('.layerServices');
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
		.appendTo($el.find('#backgroundLayersSelect'))
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
		if ( gwLayer != sky.baseImagery ) {
			LayerManager.setBackgroundSurvey(gwLayer.name);
		}
	}

	$el.find('#backgroundLayersSelect').iconselectmenu("refresh");
	nbBackgroundLayers++;
}

/**************************************************************************************************************/

/**
 *	Show spinner on loading
 */
function onLoadStart(layer)
{
	$el.find('#backgroundSpinner').fadeIn('fast');
}

/**************************************************************************************************************/

/**
 *	Hide spinner when layer is loaded
 */
function onLoadEnd(layer)
{
	$el.find('#backgroundSpinner').fadeOut('fast');
}

/**************************************************************************************************************/

return {
	/**
	 *	Initialization options
	 */
	init : function(options)
	{
		this.mizar = options.mizar;
		
		sky = this.mizar.sky;
		parentElement = options.configuration.element;
		this.updateUI();

		// Background spinner events
		sky.subscribe("startBackgroundLoad", onLoadStart);
		sky.subscribe("endBackgroundLoad", onLoadEnd);
		this.mizar.subscribe("backgroundLayer:change", this.selectLayer);
	},
	remove : function()
	{
		sky.unsubscribe("startBackgroundLoad", onLoadStart);
		sky.unsubscribe("endBackgroundLoad", onLoadEnd);
		this.mizar.unsubscribe("backgroundLayer:change", this.selectLayer);
		$('#backgroundDiv').dialog("destroy").remove();
		$el.remove();
		nbBackgroundLayers = 0;
	},
	addView : createHtmlForBackgroundLayer,

	/**
	 *	Select the given layer
	 */
	selectLayer: function(layer) {

		// Update selectmenu ui by choosen layer(if called programmatically)
		$el.children().removeAttr("selected");
		var option = _.find($el.children(), function(item) {
			return item.text == layer.name;
		});
		$(option).attr("selected","selected");

		selectedLayer = layer;

		// Show background loading spinner
		$('#loading').show(300);

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

	},

	/**
	 *	Create select menu
	 *	Synchonize background spinner with background survey events
	 */
	updateUI : function() {
		$el = $(backgroundLayersHTML).prependTo($(parentElement));
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
		
		// Back to sky button if in globe mode
		if ( this.mizar.mode == "planet" ) {
			var self = this;
			$el.find('.backToSky').button().click(function(event) {
				self.mizar.toggleMode();
			});	
		}
		else
		{
			// Already in sky mode
			$el.find('.backToSky').hide();
		}
		

		$el.find('.layerServices').button({
			text: false,
			icons: {
				primary: "ui-icon-wrench"
			}
		}).click(function(event){
			LayerServiceView.show( selectedLayer );
		});

		$el.find('.exportLayer').button({
			text: false,
			icons: {
				primary: "ui-icon-extlink"
			}
		}).click(function(event){
			if ( Samp.isConnected() )
			{
				var healpixLayer = sky.tileManager.imageryProvider;
				for ( var i=0; i<sky.tileManager.tilesToRender.length; i++ )
				{
					var tile = sky.tileManager.tilesToRender[i];
					var url = window.location.origin + healpixLayer.getUrl( tile );
					Samp.sendImage(url);
				}
			}
			else
			{
				ErrorDialog.open('You must be connected to SAMP Hub');
			}
		});		

		var dialogId = "backgroundDiv";
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
		$el.find('#fitsView').button({
			text: false,
			icons: {
				primary: "ui-icon-image"
			}
		}).click(function(event){

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

		$el.find('#fitsType')
			.button()
			.click(function(){

			isFits = $(this).is(':checked');

			selectedLayer.dataType = isFits ? 'fits' : 'jpg';
			if ( !isFits )
			{
				$('#fitsView').button('disable');
			}

			sky.setBaseImagery( null );
			sky.setBaseImagery( selectedLayer );
			$('#loading').show();
		});

		$el.find('#backgroundLayersSelect').iconselectmenu({
			select: function(event, ui)
			{
				var index = ui.item.index;
				var layer = $(this).children().eq(index).data("layer");
				if ( layer != sky.baseImagery ) {
					LayerManager.setBackgroundSurvey(layer.name);
				}
			}
		}).iconselectmenu( "menuWidget" )
				.addClass( "ui-menu-icons customicons" );
	},
	getDiv : function() {
		return backgroundDiv;
	}
}

});