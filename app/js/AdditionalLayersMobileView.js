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
define(["jquery.ui", "gw/CoordinateSystem", "gw/FeatureStyle", "gw/OpenSearchLayer", "./HEALPixFITSLayer", "./MocLayer", "gw/VectorLayer", "./PickingManager", "./DynamicImageView", "./LayerServiceView", "./Samp", "./ImageViewer", "./ErrorDialog", "./Utils", "underscore-min", "text!../templates/additionalLayer.html", "jquery.nicescroll.min"],
		function($, CoordinateSystem, FeatureStyle, OpenSearchLayer, HEALPixFITSLayer, MocLayer, VectorLayer, PickingManager, DynamicImageView, LayerServiceView, Samp, ImageViewer, ErrorDialog, Utils, _, additionalLayerHTMLTemplate){

var globe;
var navigation;
var layerManager;
var categories = {
	"Other": 'otherLayers',
	"Coordinate systems": 'coordinateGrids'
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

	$('#'+categoryId).niceScroll().show();
	updateScroll(categoryId);
}

/**************************************************************************************************************/

/**
 *	Update scroll event
 */
function updateScroll(categoryId)
{
	// TODO inverse
	if ( isMobile )
	{
		$( "#accordion" ).trigger('create');
	}
	$('#accordion').find('#'+categoryId).niceScroll().resize();
}

/**************************************************************************************************************/

function setOpacity( gwLayer, value )
{
	gwLayer.opacity( value/100. );

	// Update sublayers opacity
	if ( gwLayer.subLayers )
	{
		for ( var i=0; i<gwLayer.subLayers.length; i++ )
		{
			gwLayer.subLayers[i].opacity( value/100.);
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
		currentIndex: currentIndex,
		OpenSearchLayer: OpenSearchLayer,
		HEALPixFITSLayer: HEALPixFITSLayer,
		shortName : shortName,
		isMobile: isMobile
	} );

	var $layerDiv = $(layerDiv)
		.appendTo('#'+categoryId)
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
	$('#slider_'+shortName).slider({
		value: gwLayer.opacity()*100,
		min: 20,
		max: 100,
		step: 20,
		slide: function( event, ui ) {
			var opacityValue = ui.value;
			$( "#percentInput_"+shortName ).val( opacityValue + "%" );
			setOpacity( gwLayer, opacityValue );
		}
	}).slider( "option", "disabled", !gwLayer.visible() );

	// TODO inverse it
	if ( isMobile )
	{
		$('#opacity_'+shortName).on('change', function(event){
			var opacityValue = $(this).find('.percentInput').val();
			setOpacity( gwLayer, opacityValue );
		});
	}
	

	// Init percent input of slider
	// TODO inverse
	if ( isMobile )
	{
		$( "#percentInput_"+shortName ).val( $( "#slider_"+shortName ).val() + "%" );
	}
	else
	{
		$( "#percentInput_"+shortName ).val( $( "#slider_"+shortName ).slider( "value" ) + "%" );
	}
		
	// Open tools div when the user clicks on the layer label
	var toolsDiv = $layerDiv.find('.layerTools');
	// $layerDiv.children('label').click(function() {
	// 	toolsDiv.slideToggle(updateScroll.bind(this, categoryId));
	// });

	if ( gwLayer.visible() )
	{
		toolsDiv.css('display', 'block');
	}
	// Layer visibility management
	$('#visible_'+shortName).click(function(){
		// Manage 'custom' checkbox
		// jQuery UI button is not sexy enough :)
		// Toggle some classes when the user clicks on the visibility checkbox
		// TODO inverse it
		if ( isMobile )
		{
			var isOn = $(this).attr('checked') ? true : false;
		}
		else
		{
			var isOn = !$('#visible_'+shortName).hasClass('ui-state-active');
			$layerDiv.find('.slider').slider( isOn ? "enable" : "disable" );
		}
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

		if ( isOn )
		{
			//$('.layerTools').slideUp();
			//$('.layerTools').not(toolsDiv).slideUp();
			toolsDiv.css('display', 'block');
		}
		else
		{
			toolsDiv.css('display','none');
		}
		
		// Change button's state
		$('#visible_'+shortName).toggleClass('ui-state-active')
			   .toggleClass('ui-state-default')
			   .find('span')
			   	  .toggleClass('ui-icon-check')
			   	  .toggleClass('ui-icon-empty');

		// Trigger on ImageViewer visibility button
		$('#layerVisibility_'+gwLayer.id).trigger('click');

	});

	// Init buttons of tool bar
	$layerDiv.find('.deleteLayer').button({
			text: false,
			mini: true
		}).end()
		.find('.zoomTo').button({
			text: false,
			inline: true,
			icon: "zoomTo",
			iconpos: "notext"
		}).end()
		.find('.exportLayer').button({
			text: false,
			inline: true,
			mini: true,
			icon: "ext-link",
			iconpos: "notext"
		}).end()
		.find('.downloadAsVO').button({
			text: false,
			mini: true,
			inline: true,
			iconpos: "notext",
			icon: 'download'
		});

	// TODO inverse isMobile
	if ( gwLayer instanceof HEALPixFITSLayer && !isMobile )
	{
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
			width: 400,
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
}

/**************************************************************************************************************/

/**
 * 	Create HTML for the given layer
 */
function addView ( gwLayer, category )
{	
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
		// TODO inverse if
		if ( !isMobile )
		{
			$('<div class="category"><h3>'+ category +'</h3>\
				<div  id="'+categoryId+'"></div></div>')
					.insertBefore($('#otherLayers').parent());
		}
		else
		{
			$('<div class="category" data-inset="false" data-mini="true" data-theme="a" data-content-theme="a" data-role="collapsible">\
					<h3>'+ category +'</h3>\
					<div id="'+categoryId+'"></div>\
				</div>')
					.insertBefore($('#otherLayers').parent().parent());	
		}

		categories[category] = categoryId;
	}
	else
	{
		categoryId = categories[category];
	}

	// Add HTML
	createHtmlForAdditionalLayer( gwLayer, categoryId );

	if ( gwLayer.pickable )
		PickingManager.addPickableLayer(gwLayer);
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
	for ( var i=0; i<globe.tileManager.visibleTiles.length; i++ )
	{
		var tile = globe.tileManager.visibleTiles[i];
		if ( maxOrder < tile.order )
			maxOrder = tile.order;

		pixelIndices+=tile.pixelIndex;
		if ( i < globe.tileManager.visibleTiles.length - 1 )
		{
			pixelIndices+=",";
		}
	}

	return window.location.origin + layer.serviceUrl+"/search?order="+maxOrder+"&healpix="+pixelIndices+"&coordSystem=EQUATORIAL";
}

/**************************************************************************************************************/

/**
 *	Initialize toolbar events
 */
function initToolbarEvents ()
{
	// Download features on visible tiles as VO table
	$('.category').on('click', '.downloadAsVO', function(){
		var layer = $(this).closest(".addLayer").data('layer')
		var url = buildVisibleTilesUrl(layer);
		url+="&media=votable";
		var posGeo = CoordinateSystem.from3DToGeo( navigation.center3d );
		var astro = Utils.formatCoordinates( posGeo );
		$(this).parent().attr('href', url)
						.attr('download', layer.name+"_"+astro[0]+'_'+astro[1]);
	});

	// ZoomTo event (available for GlobWeb.VectorLayers only)
	$('.category').on("click", ".zoomTo", function(){

		var layer = $(this).closest(".addLayer").data('layer');
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

		navigation.zoomTo([sLon/nbGeometries, sLat/nbGeometries], 2., 2000);
	});
}

/**************************************************************************************************************/

return {
	init : function(gl, nav, lm, conf)
	{
		globe = gl;
		navigation = nav;
		layerManager = lm;
		isMobile = conf.isMobile;

		// Spinner event
		globe.subscribe("startLoad", function(layer){
			var shortName = Utils.formatId( layer.name );
			$('#addLayer_'+shortName).find('.spinner').stop(true,true).fadeIn('fast');
		});
		globe.subscribe("endLoad", function(layer){
			var shortName = Utils.formatId( layer.name );
			$('#addLayer_'+shortName).find('.spinner').fadeOut(500);
		});
	},
	addView : addView,
	updateUI : initToolbarEvents,
	hideView: function(layer)
	{
		$('#addLayer_'+layer.id).hide();
	},
	showView: function(layer)
	{
		$('#addLayer_'+layer.id).show();
	}
}

});