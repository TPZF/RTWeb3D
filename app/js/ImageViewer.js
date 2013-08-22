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

define(["gw/FeatureStyle", "underscore-min", "text!../templates/imageViewerItem.html"],
	function(FeatureStyle, _, imageViewerItemHTMLTemplate){

var navigation;
var globe;
var imageManager;

// Template generating the li representing image
var imageViewerItemTemplate = _.template(imageViewerItemHTMLTemplate);

return {

	init: function(g,nav, im){

		globe = g;
		navigation = nav;
		imageManager = im;
		// Show/hide image viewer
		$('#imageViewInvoker').on('click', function(){

			if ( parseFloat($(this).parent().css('right')) < 0 )
			{
				// Show
				$('#loadedImages').css({ boxShadow: "0px 0px 8px 1px rgba(255, 158, 82, 0.92)"});
				$(this).css('background-position', '0px -20px');
				$(this).parent().animate({right: '0px'}, 300);
			}
			else
			{
				// Hide
				$('#loadedImages').css({ boxShadow: "none"});
				$(this).css('background-position', '0px 0px');
				$(this).parent().animate({right: '-254px'}, 300);
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
	addView: function(selectedData)
	{	
		var feature = selectedData.feature;
		var id = "imageView_" + feature.properties.identifier;
		var $li;
		if ( $('#loadedImages ul li[id="'+id+'"]').length == 0 )
		{
			// Create only if not already added
			var imageViewerItemContent = imageViewerItemTemplate( { id: feature.properties.identifier });
			$li = $(imageViewerItemContent)
				.appendTo('#loadedImages ul')
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
					for( var j=0; j<currentGeometry.coordinates[0].length; j++ )
					{
						meanLon+=currentGeometry.coordinates[0][j][0];
						meanLat+=currentGeometry.coordinates[0][j][1];
						nbPoints++;
					}
					navigation.zoomTo([meanLon/nbPoints, meanLat/nbPoints], 0.1, 2000);
				}).end()
				// Visibility
				.find('input').click(function(){
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
					imageManager.removeImage(selectedData);
				}).end()
				// Image processing
				.find('.imageProcessing').button({
					text: false,
					icons: {
						primary: "ui-icon-image"
					}
				}).on('click', function(){
					feature.div.toggle();
				}).end();

			if ( $('#loadedImages ul li').length == 1 )
			{
				$('#loadedImages p').fadeOut(function(){
					$li.fadeIn();
				});
			}
			else
			{
				$li.fadeIn();
			}

			// Disable image processing button for not fits images
			var isFits = feature.services && feature.services.download && feature.services.download.mimetype == "image/fits";
			if ( !isFits )
			{
				$li.find('.imageProcessing').button("disable");
			}

			return $li;
		}
	},

	/**
	 *	Remove view of the given feature
	 */
	removeView: function(selectedData)
	{
		var id = "imageView_" + selectedData.feature.properties.identifier;
		$('#loadedImages ul li[id="'+id+'"]').fadeOut(function(){
			$(this).remove();
			if ( $('#loadedImages ul li').length == 0 )
				$('#loadedImages p').fadeIn();
		})

	}
}

});