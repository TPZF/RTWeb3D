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
 * AdditionalLayersView module
 */
define(["jquery", "gw/CoordinateSystem", "gw/FeatureStyle", "gw/OpenSearchLayer", "./LayerManager", "./HEALPixFITSLayer", "./MocLayer", "./PlanetLayer", "gw/VectorLayer", "./PickingManager", "./DynamicImageView", "./LayerServiceView", "./Samp", "./ErrorDialog", "./Utils", "underscore-min", "text!../templates/additionalLayers.html", "text!../templates/additionalLayer.html", "jquery.nicescroll.min", "jquery.ui"],
		function($, CoordinateSystem, FeatureStyle, OpenSearchLayer, LayerManager, HEALPixFITSLayer, MocLayer, PlanetLayer, VectorLayer, PickingManager, DynamicImageView, LayerServiceView, Samp, ErrorDialog, Utils, _, additionalLayersHTML, additionalLayerHTMLTemplate){

var mizar;
var sky;
var navigation;
var parentElement;
var categories = {
	"Other": 'otherLayers',
	"Coordinate systems": 'coordinateSystems'
};
var isMobile = false;

// Template generating the additional layer div in sidemenu
var additionalLayerTemplate = _.template(additionalLayerHTMLTemplate);

/**************************************************************************************************************/

/**
 *	Generate point legend in canvas 2d
 *
 *	@param gwLayer GlobWeb layer
 *	@param canvas Canvas
 *	@param imageUrl Image source url used for point texture
 */
function generatePointLegend( gwLayer, canvas, imageUrl )
{
	var context = canvas.getContext('2d');
	var icon = new Image();
	icon.crossOrigin = '';
	icon.onload = function() {
		// var width = (icon.width > canvas.width) ? canvas.width : icon.width;
		// var height = (icon.height > canvas.height) ? canvas.height : icon.height;
		context.drawImage(icon, 5, 0, 10, 10);

		// colorize icon
		var data = context.getImageData(0, 0, canvas.width, canvas.height);
		for (var i = 0, length = data.data.length; i < length; i+=4) {
			data.data[i] = gwLayer.style.fillColor[0]*255;
			data.data[i+1] = gwLayer.style.fillColor[1]*255;
			data.data[i+2] = gwLayer.style.fillColor[2]*255;
		}

		context.putImageData(data, 0, 0);
	};
	icon.src = imageUrl;
}

/**************************************************************************************************************/

/**
 *	Generate line legend in canvas 2d
 */
function generateLineLegend( gwLayer, canvas )
{
	var context = canvas.getContext('2d');

	var margin = 2;
	context.beginPath();
	context.moveTo(margin, canvas.height - margin);
	context.lineTo(canvas.width/2 - margin, margin);
	context.lineTo(canvas.width/2 + margin, canvas.height - margin);
	context.lineTo(canvas.width - margin, margin);
	context.lineWidth = 1;

	// set line color
	context.strokeStyle = FeatureStyle.fromColorToString(gwLayer.style.fillColor);
	context.stroke();
}

/**************************************************************************************************************/

/**
 *	Initialize nice scroll for the given category
 */
function initNiceScroll(categoryId)
{
	// Nice scrollbar initialization
	$('#'+categoryId).niceScroll({
		autohidemode: false
	});
	// Hide scroll while accordion animation
	$(parentElement).on( "accordionbeforeactivate", function(event, ui) {
		$('#'+categoryId).niceScroll().hide();
	} );
	// Show&resize scroll on the end of accordion animation
	$(parentElement).on( "accordionactivate", function( event, ui ) {
		$('#'+categoryId).niceScroll().show();
		updateScroll(categoryId);
	} );
}

/**************************************************************************************************************/

/**
 *	Update scroll event
 */
function updateScroll(categoryId)
{
	$(parentElement).find('#'+categoryId).getNiceScroll().resize();
}

/**************************************************************************************************************/

/**
 *	Add legend for the given layer if possible
 *	Legend represents the "line" for polygon data or image from "iconUrl" for point data
 */
function addLegend($layerDiv, gwLayer)
{
	var $canvas = $layerDiv.find('.legend');
	var canvas = $canvas[0];

	if ( gwLayer instanceof OpenSearchLayer || gwLayer instanceof MocLayer || gwLayer instanceof VectorLayer )
	{
		if ( gwLayer.dataType == "point")
		{
			generatePointLegend(gwLayer, canvas, gwLayer.style.iconUrl);
		} 
		else if ( gwLayer.dataType == "line")
		{
			generateLineLegend( gwLayer, canvas );
		} 
		else
		{
			$canvas.css("display", "none");			
		}
	}
	else
	{
		$canvas.css("display", "none");
	}
}

/**************************************************************************************************************/

/**
 *	Initialize UI of opacity slider for the given layer
 */
function initializeSlider( $layerDiv, gwLayer )
{
	var shortName = Utils.formatId( gwLayer.name );
	// Slider initialisation
	$layerDiv.find('#slider_'+shortName).slider({
		value: gwLayer.opacity()*100,
		min: 20,
		max: 100,
		step: 20,
		slide: function( event, ui ) {
			$( "#percentInput_"+shortName ).val( ui.value + "%" );
			gwLayer.opacity( ui.value/100. );

			if ( gwLayer.subLayers )
			{
				for ( var i=0; i<gwLayer.subLayers.length; i++ )
				{
					gwLayer.subLayers[i].opacity( ui.value/100.);
				}
			}
		}
	}).slider( "option", "disabled", !gwLayer.visible() );
	
	// Init percent input of slider
	$( "#percentInput_"+shortName ).val( $( "#slider_"+shortName ).slider( "value" ) + "%" );
}

/**************************************************************************************************************/

/**
 *	Update all toolbar buttons UI
 */
function updateButtonsUI($layerDiv)
{
	// Init buttons of tool bar
	$layerDiv
		.find('.deleteLayer').button({
			text: false,
			icons: {
				primary: "ui-icon-trash"
			}
		}).end()
		.find('.zoomTo').button({
			text: false,
			icons: {
				primary: "ui-icon-zoomin"
			}
		}).end()
		.find('.exportLayer').button({
			text: false,
			icons: {
				primary: "ui-icon-extlink"
			}
		}).end()
		.find('.downloadAsVO').button({
			text: false,
			icons: {
				primary: "ui-icon-arrowthickstop-1-s"
			}
		}).end()
		.find('.isFits').button().end()
		.find('.addFitsView').button({
			text: false,
			icons: {
				primary: "ui-icon-image"
			}
		}).end()
		.find('.layerServices').button({
			text: false,
			icons: {
				primary: "ui-icon-wrench"
			}
		});
}

/**************************************************************************************************************/

/**
 *	Create dialog to modify contrast/colormap of fits layers
 */
function createDynamicImageDialog( gwLayer )
{
	var shortName = Utils.formatId( gwLayer.name );
	// Supports fits, so create dynamic image view in dialog
	var dialogId = "addFitsViewDialog_"+shortName;
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
		resizable: false,
		width: 'auto',
		minHeight: 'auto',
		close: function(event, ui)
		{
			$('#addFitsView_'+shortName).removeAttr("checked").button("refresh");
			$(this).dialog("close");
		}
	});

	// Dialog activator
	$('#addFitsView_'+shortName).click(function(){

		if ( $dialog.dialog( "isOpen" ) )
		{
			$dialog.dialog("close");
		}
		else
		{
			$dialog.dialog("open");
		}
	});

	// Add dynamic image view content to dialog
	gwLayer.div = new DynamicImageView( dialogId, {
		id : shortName,
		changeShaderCallback: function(contrast)
		{
			if ( contrast == "raw" )
			{
				gwLayer.customShader.fragmentCode = gwLayer.rawFragShader;
			}
			else
			{
				gwLayer.customShader.fragmentCode = gwLayer.colormapFragShader;
			}
		}
	});
}

/**************************************************************************************************************/

/**
 *	Show/hide layer tools depending on layer visibility
 *	Set visibility event handlers
 */
function manageLayerVisibility($layerDiv, gwLayer, categoryId)
{
	var shortName = Utils.formatId( gwLayer.name );
	// Open tools div when the user clicks on the layer label
	var toolsDiv = $layerDiv.find('.layerTools');
	$layerDiv.children('label').click(function() {
		toolsDiv.slideToggle(updateScroll.bind(this, categoryId));
	});

	if ( gwLayer.visible() )
	{
		toolsDiv.slideDown();
	}

	// Layer visibility management
	$layerDiv.find('#visible_'+shortName).click(function(){

		if ( gwLayer instanceof PlanetLayer ) {
			// Temporary use visiblity button to change mizar context to "planet"
			// TODO: change button, 
			mizar.toggleMode(gwLayer);
		} else {
			// Manage 'custom' checkbox
			// jQuery UI button is not sexy enough :)
			// Toggle some classes when the user clicks on the visibility checkbox
			var isOn = !$(this).hasClass('ui-state-active');
			gwLayer.visible( isOn );
			if ( gwLayer.subLayers )
			{
				setSublayersVisibility(gwLayer, isOn);
			}

			$layerDiv.find('.slider').slider( isOn ? "enable" : "disable" );
			if ( isOn )
			{
				$('.layerTools').slideUp();
				toolsDiv.slideDown();
			}
			else
			{
				toolsDiv.slideUp();	
			}
			
			// Change button's state
			$('#visible_'+shortName).toggleClass('ui-state-active')
				   .toggleClass('ui-state-default')
				   .find('span')
				   	  .toggleClass('ui-icon-check')
				   	  .toggleClass('ui-icon-empty');

			// Synchronize with visibility button of ImageViewer if needed
			var $imageViewerBtn = $('#layerVisibility_'+gwLayer.id);
			if ( ($imageViewerBtn.button('option', 'icons').primary == "ui-icon-check") != isOn )
			{
				$imageViewerBtn.trigger('click');
			}
			sky.refresh();
		}
	});
}

/**************************************************************************************************************/

/**
 *	Set sublayers visibility
 */
function setSublayersVisibility(gwLayer, isOn)
{
	if ( isOn )
	{
		for ( var i=0; i<gwLayer.subLayers.length; i++ )
		{
			sky.addLayer( gwLayer.subLayers[i] );
		}
	}
	else
	{
		for ( var i=0; i<gwLayer.subLayers.length; i++ )
		{
			sky.removeLayer( gwLayer.subLayers[i] );
		}
	}
}

/**************************************************************************************************************/

/**
 *	Create the Html for addtionnal layer
 */
function createHtmlForAdditionalLayer( gwLayer, categoryId )
{
	var currentIndex = gwLayer.id;
	var shortName = Utils.formatId( gwLayer.name );
	var layerDiv = additionalLayerTemplate( {
		layer: gwLayer,
		OpenSearchLayer: OpenSearchLayer,
		HEALPixFITSLayer: HEALPixFITSLayer,
		shortName : shortName,
		isMobile: isMobile
	} );

	var $layerDiv = $(layerDiv)
		.appendTo('#'+categoryId)
		.data("layer", gwLayer);
	
	// Add legend
	addLegend($layerDiv, gwLayer);
	
	// Create UI of opacity slider
	initializeSlider($layerDiv, gwLayer);

	manageLayerVisibility($layerDiv, gwLayer, categoryId);
	
	updateButtonsUI($layerDiv);

	if ( gwLayer instanceof HEALPixFITSLayer && !isMobile )
	{
		createDynamicImageDialog(gwLayer);
	}
}

/**************************************************************************************************************/

/**
 * 	Create HTML for the given layer
 */
function addView ( gwLayer )
{
	var category = gwLayer.category;
	// Other as default
	if ( !category )
	{
		category = 'Other';
	}

	// Create new category if doesn't exists
	var categoryId;
	if ( !categories[category] )
	{
		categoryId = Utils.formatId( category );
		$('<div class="category"><h3>'+ category +'</h3>\
			<div id="'+categoryId+'"></div></div>')
				.insertBefore($('#otherLayers').parent());

		categories[category] = categoryId;

		// Refresh accordion
		$(parentElement).accordion("refresh");
		// Add scroll to the new category
		initNiceScroll(categoryId);
	}
	else
	{
		categoryId = categories[category];
	}

	// Add HTML
	createHtmlForAdditionalLayer( gwLayer, categoryId );
}

/**************************************************************************************************************/

/**
 *	Remove HTML view of the given layer
 *	Remove the category if the given layer is the last layer of category
 */
function removeView ( gwLayer ) {
	var shortName = Utils.formatId( gwLayer.name );
	var addLayerDiv = $(parentElement).find('#addLayer_'+shortName);
	if ( addLayerDiv.parent().children().length == 1 ) {
		// Last child to remove -> remove the category
		addLayerDiv.closest('.category').remove();
	} else {
		addLayerDiv.remove();
	}

	if ( gwLayer.div )
	{
		$('#addFitsView_'+gwLayer.div.id).dialog("destroy").remove();
		gwLayer.div = null;
	}
}

/**************************************************************************************************************/

/**
 *	Build visible tiles url
 */
function buildVisibleTilesUrl(layer)
{
	// Find max visible order & visible pixel indices
	var maxOrder = 3;
	var pixelIndices = "";
	for ( var i=0; i<sky.tileManager.visibleTiles.length; i++ )
	{
		var tile = sky.tileManager.visibleTiles[i];
		if ( maxOrder < tile.order )
			maxOrder = tile.order;

		pixelIndices+=tile.pixelIndex;
		if ( i < sky.tileManager.visibleTiles.length - 1 )
		{
			pixelIndices+=",";
		}
	}

	return layer.serviceUrl+"/search?order="+maxOrder+"&healpix="+pixelIndices+"&coordSystem=EQUATORIAL";
}

/**************************************************************************************************************/

/**
 *	Delete layer handler
 */
function deleteLayer()
{
	$(this).parent().parent().fadeOut(300, function(){
		$(this).remove();
	});

	var layer = $(this).closest(".addLayer").data("layer");
	LayerManager.removeLayer(layer);

	updateScroll('otherLayers');
}

/**************************************************************************************************************/

/**
 *	Show layer services popup
 */
function showLayerServices()
{
	var layer = $(this).closest(".addLayer").data("layer");
	LayerServiceView.show( layer );
}

/**************************************************************************************************************/

/**
 *	Export the given layer by SAMP
 */
function exportLayer()
{
	if ( Samp.isConnected() )
	{
		var layer = $(this).closest(".addLayer").data("layer");
		var url = buildVisibleTilesUrl(layer);
		var message = Samp.sendVOTable(layer, url);
	}
	else
	{
		ErrorDialog.open("You must be connected to SAMP Hub");
	}
}

/**************************************************************************************************************/

/**
 *	Download features on visible tiles of the given layer as VO table
 */
function downloadAsVO()
{
	var layer = $(this).closest(".addLayer").data("layer");
	var url = buildVisibleTilesUrl(layer);
	url+="&media=votable";
	var posGeo = CoordinateSystem.from3DToGeo( navigation.center3d );
	var astro = Utils.formatCoordinates( posGeo );
	$(this).parent().attr('href', url)
					.attr('download', layer.name+"_"+astro[0]+'_'+astro[1]);
}

/**************************************************************************************************************/

/**
 *	Zoom to barycenter of all features contained by layer
 *	(available for GlobWeb.VectorLayers only)
 */
function zoomTo()
{
	var layer = $(this).closest(".addLayer").data("layer");
	var sLon = 0;
	var sLat = 0;
	var nbGeometries = 0;

	for (var i=0; i<layer.features.length; i++)
	{
		var barycenter = Utils.computeGeometryBarycenter( layer.features[i].geometry );
		sLon += barycenter[0];
		sLat += barycenter[1];
		nbGeometries++;
	}

	navigation.zoomTo([sLon/nbGeometries, sLat/nbGeometries], 2.0, 2000);
}

/**************************************************************************************************************/

/**
 *	Toggle layer to fits rendering
 */
function toggleFits()
{
	var isFits = $(this).is(':checked');
	var layer = $(this).closest(".addLayer").data("layer");
	layer.dataType = isFits ? 'fits' : 'jpg';
	if ( !isFits )
	{
		$(this).nextAll('.addFitsView').button('disable');
	}

	// TODO: make reset function ?
	// layer.setDatatype( dataType );

	var prevId = layer.id;
	sky.removeLayer(layer);
	sky.addLayer(layer);

	// HACK : Layer id will be changed by remove/add so we need to change the html id
	$('#addLayer_'+prevId).attr('id','addLayer_'+layer.id);
}

/**************************************************************************************************************/

/**
 *	Initialize toolbar events
 */
function registerEvents()
{
	sky.subscribe("startLoad", onLoadStart);
	sky.subscribe("endLoad", onLoadEnd);

	$(parentElement)
		.on("click",'.category .deleteLayer', deleteLayer)
		.on('click', ".category .layerServices", showLayerServices)
		.on('click', ".category .exportLayer", exportLayer)
		.on('click', '.category .downloadAsVO', downloadAsVO)
		.on("click", ".category .zoomTo", zoomTo)
		.on('click', '.category .isFits', toggleFits);
}

/**************************************************************************************************************/

/**
 *	Show spinner on layer loading
 */
function onLoadStart(layer)
{
	var shortName = Utils.formatId( layer.name );
	$('#addLayer_'+shortName).find('.spinner').stop(true,true).fadeIn('fast');
}

/**************************************************************************************************************/

/**
 *	Hide spinner when layer is loaded	
 */
function onLoadEnd(layer)
{
	var shortName = Utils.formatId( layer.name );
	$('#addLayer_'+shortName).find('.spinner').fadeOut(500);
}

/**************************************************************************************************************/

return {
	/**
	 *	Initialize additional layers view
	 */
	init : function(options)
	{
		// Set some globals
		mizar = options.mizar;
		sky = options.mizar.sky;
		navigation = options.mizar.navigation;
		isMobile = options.configuration.isMobile;

		// Append content to parent element
		parentElement = options.configuration.element;
		$(parentElement).append(additionalLayersHTML);

		// Select default coordinate system event
		$('#defaultCoordSystem').selectmenu({
			select: function(e)
			{
				var newCoordSystem = $(this).children('option:selected').val();				
				options.mizar.setCoordinateSystem(newCoordSystem);
			},
			width: 100
		});

		registerEvents();
	},

	/**
	 *	Unregister all event handlers
	 */
	remove: function()
	{
		$(parentElement).find(".category").remove();

		sky.unsubscribe("startLoad", onLoadStart);
		sky.unsubscribe("endLoad", onLoadEnd);

		$(parentElement)
			.off("click",'.category .deleteLayer', deleteLayer)
			.off('click', ".category .layerServices", showLayerServices)
			.off('click', ".category .exportLayer", exportLayer)
			.off('click', '.category .downloadAsVO', downloadAsVO)
			.off("click", ".category .zoomTo", zoomTo)
			.off('click', '.category .isFits', toggleFits);

		// Remove all created dialogs
		var layers = LayerManager.getLayers();
		for ( var i=0; i<layers.length; i++ )
		{
			var layer = layers[i];
			if ( layer.div )
			{
				$('#addFitsViewDialog_'+layer.div.id).dialog("destroy").remove();
			}
		}

		// Reinit categories
		categories = {
			"Other": 'otherLayers',
			"Coordinate systems": 'coordinateSystems'
		};
		
	},

	addView : addView,
	removeView: removeView,
	hideView: function(layer)
	{
		$('#addLayer_'+layer.id).hide();
	},
	showView: function(layer)
	{
		$('#addLayer_'+layer.id).show();
	}
};

});