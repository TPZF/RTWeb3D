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
define(["jquery.ui", "gw/CoordinateSystem", "gw/FeatureStyle", "gw/OpenSearchLayer", "HEALPixFITSLayer", "MocLayer", "gw/VectorLayer", "PickingManager", "DynamicImageView", "LayerServiceView", "Samp", "ImageViewer", "ErrorDialog", "underscore-min", "text!../templates/additionalLayer.html", "jquery.nicescroll.min"],
		function($, CoordinateSystem, FeatureStyle, OpenSearchLayer, HEALPixFITSLayer, MocLayer, VectorLayer, PickingManager, DynamicImageView, LayerServiceView, Samp, ImageViewer, ErrorDialog, _, additionalLayerHTMLTemplate){

var globe;
var navigation;

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
 *	Update scroll event
 */
function updateScroll()
{
	$('#additionalLayers').getNiceScroll().resize();
}

/**************************************************************************************************************/

/**
 *	Create the Html for addtionnal layer
 */
function createHtmlForAdditionalLayer( gwLayer )
{
	var currentIndex = gwLayer.id;

	var layerDiv = additionalLayerTemplate( { layer: gwLayer, currentIndex: currentIndex, OpenSearchLayer: OpenSearchLayer, HEALPixFITSLayer: HEALPixFITSLayer } );
	var layerContainer = gwLayer.gridProgram ? '#coordinateGrids' : '#additionalLayers';
	var $layerDiv = $(layerDiv)
		.appendTo(layerContainer)
		.data("layer", gwLayer);

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
			
	// Slider initialisation
	$('#slider_'+currentIndex).slider({
		value: gwLayer.opacity()*100,
		min: 20,
		max: 100,
		step: 20,
		slide: function( event, ui ) {
			$( "#percentInput_"+currentIndex ).val( ui.value + "%" );
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
	$( "#percentInput_"+currentIndex ).val( $( "#slider_"+currentIndex ).slider( "value" ) + "%" );
		
	// Open tools div when the user clicks on the layer label
	var toolsDiv = $('#addLayer_'+currentIndex+' .layerTools');
	$(layerContainer).on("click", '#addLayer_'+currentIndex+' > label', function() {
		toolsDiv.slideToggle(updateScroll);
	});

	// Layer visibility management
	$('.canvas').on('click', '#visible_'+currentIndex, function(){
		// Manage 'custom' checkbox
		// jQuery UI button is not sexy enough :)
		// Toggle some classes when the user clicks on the visibility checkbox
		var isOn = !$('#visible_'+currentIndex).hasClass('ui-state-active');
		gwLayer.visible( isOn );

		if ( gwLayer.subLayers )
		{
			if ( isOn )
			{
				for ( var i=0; i<gwLayer.subLayers.length; i++ )
				{
					globe.addLayer( gwLayer.subLayers[i] );
				}
			}
			else
			{
				for ( var i=0; i<gwLayer.subLayers.length; i++ )
				{
					globe.removeLayer( gwLayer.subLayers[i] );
				}	
			}
		}

		$layerDiv.find('.slider').slider( isOn ? "enable" : "disable" );
		
		// Change button's state
		$('#visible_'+currentIndex).toggleClass('ui-state-active')
			   .toggleClass('ui-state-default')
			   .find('span')
			   	  .toggleClass('ui-icon-check')
			   	  .toggleClass('ui-icon-empty');

		// Trigger on ImageViewer visibility button
		$('#layerVisibility_'+gwLayer.id).trigger('click');

	});

	// Init buttons of tool bar
	$('.deleteLayer').button({
		text: false,
		icons: {
			primary: "ui-icon-trash"
		}
	});

	$('.zoomTo').button({
		text: false,
		icons: {
			primary: "ui-icon-zoomin"
		}
	});

	$('.exportLayer').button({
		text: false,
		icons: {
			primary: "ui-icon-extlink"
		}
	});

	if ( gwLayer instanceof HEALPixFITSLayer )
	{
		// Supports fits, so create dynamic image view in dialog
		var dialogId = "addFitsViewDialog_"+gwLayer.name;
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
			width: 'auto',
			minHeight: 'auto',
			close: function(event, ui)
			{
				$('#addFitsView_'+gwLayer.name).removeAttr("checked").button("refresh");
				$(this).dialog("close");
			}
		});

		// Dialog activator
		$('#addFitsView_'+gwLayer.name).on('click', function(){

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
			id : gwLayer.name,
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
}

/**************************************************************************************************************/

/**
 * 	Create HTML for the given layer
 */
function addView ( gwLayer )
{
	// Add HTML
	createHtmlForAdditionalLayer( gwLayer );

	// Spinner event
	globe.subscribe("startLoad", function(layer){
		$('#addLayer_'+layer.id).find('.spinner').stop(true,true).fadeIn('fast');
	});
	globe.subscribe("endLoad", function(layer){
		$('#addLayer_'+layer.id).find('.spinner').fadeOut(500);
	});
	updateScroll();

	if ( gwLayer.pickable )
		PickingManager.addPickableLayer(gwLayer);
}

/**************************************************************************************************************/

/**
 *	Initialize toolbar events
 */
function initToolbarEvents ()
{

	$('.isFits').button();
	$('.addFitsView').button({
		text: false,
		icons: {
			primary: "ui-icon-image"
		}
	});
	$('.layerServices').button({
		text: false,
		icons: {
			primary: "ui-icon-wrench"
		}
	});

	// Delete layer event
	$('#additionalLayers').on("click",'.deleteLayer', function(){
		
		$(this).parent().parent().fadeOut(300, function(){
			$(this).remove();
		});

		var layer = $(this).parent().parent().data("layer");
		PickingManager.removePickableLayer( layer );
		ImageViewer.removeLayer( layer );
		globe.removeLayer(layer);

		updateScroll();
	});

	// Layer services
	$('#additionalLayers').on('click', ".layerServices", function(){
		var layer = $(this).parent().parent().data("layer");
		LayerServiceView.show( layer );
	});

	$('#additionalLayers').on('click', ".exportLayer", function(){

		if ( Samp.isConnected() )
		{
			var layer = $(this).parent().parent().data("layer");
			
			// Find max visible order & visible pixel indices
			var maxOrder = 3;
			var pixelIndices = "";
			for ( var i=0; i<globe.tileManager.tilesToRender.length; i++ )
			{
				var tile = globe.tileManager.tilesToRender[i];
				if ( maxOrder < tile.order )
					maxOrder = tile.order;

				pixelIndices+=tile.pixelIndex;
				if ( i < globe.tileManager.tilesToRender.length - 1 )
				{
					pixelIndices+=",";
				}
			}

			var url = window.location.origin + layer.serviceUrl+"/search?order="+maxOrder+"&healpix="+pixelIndices+"&coordSystem=EQUATORIAL&media=votable";
			var message = Samp.sendVOTable(url);
		}
		else
		{
			ErrorDialog.open("You must be connected to SAMP Hub");
		}
	});

	// ZoomTo event (available for GlobWeb.VectorLayers only)
	$('#additionalLayers').on("click", ".zoomTo", function(){

		var layer = $(this).parent().parent().data("layer");
		var sLon = 0;
		var sLat = 0;
		var nbPoints = 0;

		for (var i=0; i<layer.features.length; i++)
		{
			var currentGeometry = layer.features[i].geometry;
			switch (currentGeometry.type)
			{
				case "Polygon":
					for( var j=0; j<currentGeometry.coordinates[0].length; j++ )
					{
						sLon+=currentGeometry.coordinates[0][j][0];
						sLat+=currentGeometry.coordinates[0][j][1];
						nbPoints++;
					}
					break;
				case "Point":
					sLon+=currentGeometry.coordinates[0];
					sLat+=currentGeometry.coordinates[1];
					nbPoints++;
					break;
				default:
					break;
			}

		}

		navigation.zoomTo([sLon/nbPoints, sLat/nbPoints], 2.);
	});

	$('#additionalLayers').on('click', '.isFits', function(event){
		var isFits = $(this).is(':checked');
		var layer = $(this).parent().parent().data("layer");
		layer.dataType = isFits ? 'fits' : 'jpg';
		if ( !isFits )
		{
			$(this).nextAll('.addFitsView').button('disable');
		}

		// TODO: make reset function ?
		// layer.setDatatype( dataType );

		globe.removeLayer(layer);
		globe.addLayer(layer);
	});
}

/**************************************************************************************************************/

return {
	init : function(gl, nav)
	{
		globe = gl;
		navigation = nav;

		// Nice scrollbar initialization
		$('#additionalLayers').niceScroll({ autohidemode: false });
		// Hide scroll while accordion animation
		$( "#accordion" ).on( "accordionbeforeactivate", function(event, ui) {
			$('#additionalLayers').niceScroll().hide();
		} );
		// Show&resize scroll on the end of accordion animation
		$( "#accordion" ).on( "accordionactivate", function( event, ui ) {
			$('#additionalLayers').niceScroll().show();
			updateScroll();
		} );
	},
	addView : addView,
	updateUI : initToolbarEvents
}

});