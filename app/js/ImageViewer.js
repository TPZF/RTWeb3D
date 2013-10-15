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

define(["require", "gw/FeatureStyle", "ImageProcessing", "Utils", "Samp", "underscore-min", "text!../templates/imageViewerLayerItem.html", "text!../templates/imageViewerImageItem.html"],
	function(require,FeatureStyle, ImageProcessing, Utils, Samp, _, imageViewerLayerItemHTMLTemplate, imageViewerImageItemHTMLTemplate){

var navigation;
var globe;
var pickingManager;
var imageManager;

var layers = [];
var featuresWithImages = [];

// Template generating the div representing layer which contains loaded images
var imageViewerLayerItemTemplate = _.template(imageViewerLayerItemHTMLTemplate);
// Template generating the li representing image
var imageViewerImageItemTemplate = _.template(imageViewerImageItemHTMLTemplate);

function disableImageUI(layer)
{
	$('#loadedImages').find('.imageLayers div[id="imageLayer_'+layer.id+'"] ul')
		.find('button, input').each(function(){
			$(this).attr('disabled','disabled').button('refresh');
		})
}

function enableImageUI(layer)
{
	$('#loadedImages').find('.imageLayers div[id="imageLayer_'+layer.id+'"] ul')
		.find('button, input').each(function(){
			$(this).removeAttr('disabled').button('refresh');
		})
}

function createLayerView(layer)
{
	var imageViewerLayerItemContent = imageViewerLayerItemTemplate( { id: layer.id, name: layer.name });
	$layer = $(imageViewerLayerItemContent)
		.appendTo($('#loadedImages').find('.imageLayers'));

	// Stylize layer visibility checkbox
	$layer.find('#layerVisibility_'+layer.id).button({
		text: false,
		icons: {
        	primary: "ui-icon-check"
      	}
	});

	// Slide loaded images for current layer onclick
	$layer.on('click', 'label.layerName', function(){
		$("#imageLayer_"+layer.id+ " > ul").slideToggle();
	});

	// Layer visibility management
	var $layerVisibility = $('#layerVisibility_'+layer.id);
	$('.canvas').on('click', '#layerVisibility_'+layer.id, function(){

		var isChecked = ($layerVisibility.button('option', 'icons').primary == "ui-icon-check");
		if ( $('#visible_'+layer.id ).hasClass('ui-state-active') == isChecked )
		{
			// Trigger event on LayerManager visibility button
			$('#visible_'+layer.id).trigger("click");
		}
		else
		{
			// Manage visibility of ImageViewer checkbox
			var isOn = layer.visible();
			$layerVisibility.button("option", {
				icons: {
					primary: isOn ? "ui-icon-check" : ""
				},
			}).button('refresh');

			if ( isOn )
			{
				enableImageUI(layer);
			}
			else
			{
				disableImageUI(layer);
			}
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

return {

	init: function(g,nav, pm, im){

		globe = g;
		navigation = nav;
		pickingManager = pm;
		imageManager = im;
		var self = this;
		// Show/hide image viewer
		$('#imageViewInvoker').on('click', function(){

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
		$( "#loadedImages" ).accordion( { autoHeight: false, active: 0, collapsible: true } ).show();
	},

	/**
	 *	Add view for the given feature
	 *
	 *	@returns jQuery element of view,
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
			var imageViewerItemContent = imageViewerImageItemTemplate( { id: id, name: name });
			$li = $(imageViewerItemContent)
				.appendTo($layer.find('ul'))
				// ZoomTo
				.find('.zoomTo').button({
					text: false,
					icons: {
						primary: "ui-icon-zoomin"
					}
				}).on('click', function(){
					var meanLon = 0;
				    var meanLat = 0;
				    var nbPoints = 0;
					var currentGeometry = feature.geometry;
					for( var j=0; j<currentGeometry.coordinates[0].length-1; j++ )
					{
						meanLon+=currentGeometry.coordinates[0][j][0];
						meanLat+=currentGeometry.coordinates[0][j][1];
						nbPoints++;
					}
					navigation.zoomTo([meanLon/nbPoints, meanLat/nbPoints], 0.1, 2000, function(){
						// Update selection
						pickingManager.focusFeature(selectedData);
					});

				}).end()
				// Visibility
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
				}).end()
				// Delete fits
				.find('.delete').button({
					text: false,
					icons: {
						primary: "ui-icon-trash"
					}
				}).on('click', function(){
					// Remove image
					imageManager.removeImage(selectedData, isFits);
					if ( isFits )
						ImageProcessing.removeData(selectedData);
				}).end()
				// Image processing
				.find('.imageProcessing').button({
					text: false,
					icons: {
						primary: "ui-icon-image"
					}
				}).on('click', function(){
					ImageProcessing.setData(selectedData);
				}).end()
				.find('.metadata').button({
					text: false,
					icons: {
						primary: "ui-icon-info"
					}
				}).on('click', function(){

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
				}).on('click', function(){
					Samp.sendImage(feature.services.download.url);
				}).end()
				.fadeIn();
			
			$li.on('click', 'label.imageName', function(){
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