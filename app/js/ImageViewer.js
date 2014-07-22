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

define(["require", "jquery", "gw/FeatureStyle", "./ImageProcessing", "./Utils", "./Samp", "underscore-min", "text!../templates/imageViewerLayerItem.html", "text!../templates/imageViewerImageItem.html", "jquery.ui"],
	function(require, $, FeatureStyle, ImageProcessing, Utils, Samp, _, imageViewerLayerItemHTMLTemplate, imageViewerImageItemHTMLTemplate){

var navigation;
var sky;
var pickingManager;
var imageManager;

var layers = [];
var featuresWithImages = [];

// Template generating the div representing layer which contains loaded images
var imageViewerLayerItemTemplate = _.template(imageViewerLayerItemHTMLTemplate);
// Template generating the li representing image
var imageViewerImageItemTemplate = _.template(imageViewerImageItemHTMLTemplate);

/**************************************************************************************************************/

/**
 *	Disable image toolbar inputs
 */
function disableImageUI(layer)
{
	$('#loadedImages').find('.imageLayers div[id="imageLayer_'+layer.id+'"] ul')
		.find('button, input').each(function(){
			$(this).attr('disabled','disabled').button('refresh');
		})
}

/**************************************************************************************************************/

/**
 *	Enable image toolbar inputs
 */
function enableImageUI(layer)
{
	$('#loadedImages').find('.imageLayers div[id="imageLayer_'+layer.id+'"] ul')
		.find('button, input').each(function(){
			// Don't enable image processing for not fits files
			if ( !$(this).hasClass('fitsUnavailable') )
			{
				$(this).removeAttr('disabled').button('refresh');
			}
		})
}

/**************************************************************************************************************/

/**
 *	Create layer view
 *	This view will contain all the loaded images for the given layer
 */
function createLayerView(layer)
{
	var imageViewerLayerItemContent = imageViewerLayerItemTemplate( { id: layer.id, name: layer.name });
	$layer = $(imageViewerLayerItemContent)
		.appendTo($('#loadedImages').find('.imageLayers'));

	// Slide loaded images for current layer onclick
	$layer.find('label.layerName').click(function(){
		$("#imageLayer_"+layer.id+ " > ul").slideToggle();
	});

	// Stylize layer visibility checkbox
	var $layerVisibility = $layer.find('#layerVisibility_'+layer.id);
	// Layer visibility management
	$layerVisibility.button({
		text: false,
		icons: {
        	primary: "ui-icon-check"
      	}
	}).click(function(){
		var isChecked = !($layerVisibility.button('option', 'icons').primary == "ui-icon-check");
		var shortName = Utils.formatId( layer.name );
		$layerVisibility.button("option", {
			icons: {
				primary: isChecked ? "ui-icon-check" : ""
			},
		}).button('refresh');

		if ( isChecked )
		{
			enableImageUI(layer);
		}
		else
		{
			disableImageUI(layer);
		}
		
		// Synchronize with visibility button of LayerManager if needed
		var $layerManagerBtn = $('#visible_'+shortName );
		if ( $layerManagerBtn.hasClass('ui-state-active') != isChecked )
		{
			// Trigger event on LayerManager visibility button
			$layerManagerBtn.trigger("click");
		}
	});

	if ( layers.length == 0 )
	{
		$('#loadedImages p').fadeOut(function(){
			$layer.fadeIn();
		});
	}
	else
	{
		$layer.fadeIn();
	}

	layers.push(layer);

	return $layer;
}

/**************************************************************************************************************/

return {

	init: function(mizar, pm, im){

		sky = mizar.sky;
		navigation = mizar.navigation;
		pickingManager = pm;
		imageManager = im;
		var self = this;
		// Show/hide image viewer
		$('#imageViewInvoker').click(function(){

			if ( parseFloat($(this).parent().css('right')) < 0 )
			{
				self.show();
			}
			else
			{
				self.hide();
			}
		});
		// Create accordion
		$( "#loadedImages" ).accordion( { heightStyle: "content", active: 0, collapsible: true } ).show();
	},

	/**
	 *	Add view for the given feature
	 *
	 *	@returns jQuery element of view
	 */
	addView: function(selectedData, isFits)
	{	
		// Get or create layer view
		var $layer;
		var layer = selectedData.layer;
		if ( layers.indexOf(selectedData.layer) < 0 )
		{
			$layer = createLayerView(selectedData.layer)
		}
		else
		{
			$layer = $('#loadedImages').find('.imageLayers div[id="imageLayer_'+layer.id+'"]');
		}

		var feature = selectedData.feature;
		// Remove special caracters from feature id
		var id = Utils.formatId(selectedData.feature.properties.identifier);
		// Add isFits property for correct progress bar handling
		if ( isFits )
		{
			id+="_fits";
		}

		var name = selectedData.feature.properties.identifier;
		var $li;
		var $metadataDialog;

		if ( $layer.find('ul li[id="'+id+'"]').length == 0 )
		{
			// Create only if not already added
			var imageViewerItemContent = imageViewerImageItemTemplate( { id: id, name: name, isFits: isFits });
			$li = $(imageViewerItemContent)
				.appendTo($layer.find('ul'))
				// ZoomTo
				.find('.zoomTo').button({
					text: false,
					icons: {
						primary: "ui-icon-zoomin"
					}
				}).click(function(){

					var barycenter = Utils.computeGeometryBarycenter( feature.geometry );
					navigation.zoomTo([barycenter[0], barycenter[1]], 0.1, 2000, function(){
						// Update selection
						pickingManager.focusFeature(selectedData);
					});

				}).end()
				// Image visibility
				.find('input').button({
					text: false,
					icons: {
			        	primary: "ui-icon-check"
			      	}
				}).click(function(){

					$(this).button("option", {
						icons: {
							primary: $(this)[0].checked ? "ui-icon-check" : ""
						}
					});
					if ( $(this).is(':checked') )
					{
						imageManager.showImage(selectedData);
					}
					else
					{
						imageManager.hideImage(selectedData);
					}
					sky.renderContext.requestFrame();
				}).end()
				// Delete fits
				.find('.delete').button({
					text: false,
					icons: {
						primary: "ui-icon-trash"
					}
				}).click(function(){
					// Remove image
					imageManager.removeImage(selectedData, isFits);
					if ( isFits )
						ImageProcessing.removeData(selectedData);
					sky.renderContext.requestFrame();
				}).end()
				// Image processing
				.find('.imageProcessing').button({
					text: false,
					icons: {
						primary: "ui-icon-image"
					}
				}).click(function(){
					ImageProcessing.setData(selectedData);
				}).end()
				.find('.metadata').button({
					text: false,
					icons: {
						primary: "ui-icon-info"
					}
				}).click(function(){

					// Create metadata dialog if doesn't exist
					if ( !$metadataDialog )
					{
						// TODO : refactor this circular dependency...
						var featurePopup = require("FeaturePopup");
						var output = featurePopup.generateFeatureMetadata( selectedData.layer, selectedData.feature );
						$metadataDialog = $('<div>'+output+'</div>').dialog({
							autoOpen: true,
							show: {
								effect: "fade",
								duration: 300
							},
							hide: {
								effect: "fade",
								duration: 300
							},
							title: "Metadata",
							width: 350,
							resizable: false,
							zIndex: 12,
							stack: false,
							close: function(){
								$(this).find('.featureProperties').getNiceScroll().remove();
								$(this).dialog("destroy").remove();
								$metadataDialog = null;
							},
							drag: function()
							{
								$(this).find('.featureProperties').getNiceScroll().resize();
							}
						});
						$metadataDialog.find('.featureProperties').niceScroll({
							autohidemode: false
						});
					}
					else
					{
						if ( $metadataDialog.dialog( "isOpen" ) )
						{
							$metadataDialog.dialog("close");
						}
					}
				}).end()
				.find('.sampExport').button({
					text: false,
					icons: {
						primary: "ui-icon-extlink"
					}
				}).click(function(){
					Samp.sendImage(feature.services.download.url);
				}).end()
				.fadeIn();
			
			$li.find('label.imageName').click(function(){
				$(this).siblings('.options').slideToggle();
			});

			// Disable image processing button for not fits images
			if ( !isFits )
			{
				$li.find('.imageProcessing').button("disable");
			}

			featuresWithImages.push(selectedData);

			return $li;
		}
	},

	/**
	 *	Remove view of the given feature
	 */
	removeView: function(selectedData, isFits)
	{
		var id = "imageView_" + Utils.formatId(selectedData.feature.properties.identifier);
		if ( isFits )
		{
			id+="_fits";
		}
		$('#loadedImages').find('li.image[id="'+id+'"]').fadeOut(function(){

			// No more loaded image views for current layer
			if ( $(this).siblings().length == 0 )
			{
				// Remove layer view
				$('#loadedImages').find('.imageLayers div[id="imageLayer_'+selectedData.layer.id+'"]').fadeOut(300, function(){
					// Remove layer view
					$(this).remove();

					// Show "No image was loaded"
					if ( layers.length == 0 )
						$('#loadedImages p').fadeIn();
				});

				var index = layers.indexOf(selectedData.layer);
				layers.splice(index, 1);
			}

			$(this).remove();
		})

		var featureIndex = featuresWithImages.indexOf(selectedData);
		featuresWithImages.splice(featureIndex, 1);
	},

	/**
	 *	Remove all image views of the given layer
	 */
	 removeLayer: function(layer)
	 {
	 	var $layer = $('#loadedImages').find('.imageLayers div[id="imageLayer_'+layer.id+'"]');
	 	$layer.find('ul li').each(function(){
	 		$(this).find('.delete').trigger("click");
	 	});
	 },

	/**
	 *	Show image viewer
	 */
	show: function()
	{
		$('#loadedImages').css({ boxShadow: "0px 0px 8px 1px rgba(255, 158, 82, 0.92)"});
		$('#imageViewInvoker').css('background-position', '0px -20px')
			.parent().animate({right: '0px'}, 300);
	},

	/**
	 *	Hide image viewer
	 */
	hide: function()
	{
		$('#loadedImages').css({ boxShadow: "none"});
		$('#imageViewInvoker').css('background-position', '0px 0px')
			.parent().animate({right: '-254px'}, 300);
	},

	getFeatures: function()
	{
		return featuresWithImages;
	}
}

});