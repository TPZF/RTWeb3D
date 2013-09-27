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

define( [ "jquery.ui", "SelectionTool", "CutOutViewFactory", "DynamicImageView", "gw/FeatureStyle" ],
		function($, SelectionTool, CutOutViewFactory, DynamicImageView, FeatureStyle) {

/**************************************************************************************************************/

/**
 *	ImageProcessing
 *	@param options
 *		Required:
 *		<ul>
 *			<li>id: Identifier</li>
 *			<li>feature: The feature which will be modified by services
 *			<li>layer: The layer to which the feature belongs to
 *		</ul>
 *		Optional:
 *		<ul>
 *			<li>disable: Disable callback</li>
 *			<li>unselect: Unselect callback</li>
 *		</ul>
 */
var ImageProcessing = function(options)
{
	this.id = options.id;
	this.feature = options.feature;
	this.layer = options.layer;

	// Callbacks
	this.disable = options.disable || null;
	this.unselect = options.unselect || null;

	var dialog =
		'<div>\
			<div class="imageProcessing" id="imageProcessing'+this.id+'" title="Image processing">\
				<h3>Histogram</h3>\
				<div id="histogramView_'+this.id+'">\
				<p> Fits is loading, histogram information isn\'t available yet </p>\
				</div>\
				<h3>Cutout</h3>\
				<div id="cutOutView_'+this.id+'"></div>\
			</div>\
		</div>';

	var self = this;
	this.$dialog = $(dialog).appendTo('body').dialog({
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
		width: 500,
		resizable: false,
		minHeight: 'auto',
		close: function(event, ui)
		{
			if ( self.unselect )
			{
				self.unselect();
			}
			
			$(this).dialog("close");

		}
	}).find(".imageProcessing").accordion({
		autoHeight: false,
		active: 0,
		collapsible: true,
		heightStyle: "content"
	}).end();

	this.histogramElement = null; // to set when image image is loaded
	this.cutOutElement = CutOutViewFactory.addView("cutOutView_"+this.id);
}

/**************************************************************************************************************/

/**
 *	Toggle visibility of dialog
 */
ImageProcessing.prototype.toggle = function()
{
	if ( this.$dialog.dialog( "isOpen" ) )
	{
		this.$dialog.dialog("close");
	}
	else
	{
		this.$dialog.dialog("open");
	}
}

/**************************************************************************************************************/

/**
 *	Remove view
 */
ImageProcessing.prototype.remove = function()
{

	if ( this.unselect )
	{
		this.unselect();
	}

	if( this.disable )
	{
		this.disable();
	}
	if ( this.histogramElement )
		this.histogramElement.remove();

	CutOutViewFactory.removeView(this.cutOutElement);
	this.$dialog.remove();
}

/**************************************************************************************************************/

/**
 *	Set histogram layout content based on DynamicImageView
 */
ImageProcessing.prototype.setHistogramContent = function(image)
{
	// Create dynamic image view and attach it to feature
	var feature = this.feature;
	var self = this;
	var div = new DynamicImageView("histogramView_"+this.id, {
		image : image,
		id: feature.properties.identifier,
		url: feature.services.download.url,
		changeShaderCallback: function(contrast){
			if ( contrast == "raw" )
			{
				var targetStyle = new FeatureStyle( feature.properties.style );
				targetStyle.fillShader = {
					fragmentCode: null,
					updateUniforms: null
				};
				self.layer.modifyFeatureStyle( feature, targetStyle );
			}
			else
			{
				var targetStyle = new FeatureStyle( feature.properties.style );
				targetStyle.fillShader = {
					fragmentCode: image.fragmentCode,
					updateUniforms: image.updateUniforms
				};
				self.layer.modifyFeatureStyle( feature, targetStyle );
			}
		}
	});
	this.histogramElement = div;
}

return ImageProcessing;

});