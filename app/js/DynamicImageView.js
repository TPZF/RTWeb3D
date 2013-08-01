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

define(['jquery.ui', 'underscore-min', "gw/FeatureStyle", "./Histogram", "text!../templates/dynamicImageView.html", "jquery.ui.selectmenu"], function($,_, FeatureStyle, Histogram, dynamicImageViewHTML) {
 
/**************************************************************************************************************/

/** @constructor 
 *	DynamicImageView constructor
 *	Creates jQuery view of the given <GlobWeb.DynamicImage>
 *	
 *	@param options
 *		<h3>Required:</h3>
 *		<ul>
 *			<li>activator: Id of DOM element showing/hiding the current view</li>
 *			<li>id: Identifier</li>
 *		</ul>
 *		<h3>Optional:</h3>
 *		<ul>
 *			<li>image: The image represented by this view</li>
 *			<li>disable: Disable callback</li>
 *			<li>unselect: Unselect callback</li>
 *			<li>changeShaderCallback: Callback for shader changing</li>
 *		</ul>
 */
var DynamicImageView = function(options)
{
	this.activator = options.activator;
	this.id = options.id;

	// Callbacks
	this.disable = options.disable || null;
	this.unselect = options.unselect || null;
	this.changeShaderCallback = options.changeShaderCallback;

	// Interaction parameters
	var selectedColormap = "grey";
	var selectedContrast = "raw";
	var isInversed = false;

	// Create dialog
	var self = this;
	var dialogContent = _.template(dynamicImageViewHTML, { id: this.id });
	this.$dialog = $(dialogContent).appendTo('body').dialog({
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
								if ( self.unselect )
								{
									self.unselect();
								}
								
								$(this).dialog("close");

							}
						});

	// Initialize contrast buttonset
	this.$dialog.find('.contrast').buttonset().find('input')
			.each(function(i){
				$(this).click(function(){
					selectedContrast = $(this).val();
					switch(selectedContrast){
						case "linear":
						case "log":
						case "sqrt":
						case "sqr":
						case "asin":
							// Enable all interactive components
							$slider.slider( "enable" );
							$selectmenu.selectmenu( "enable" );
							self.$dialog.find('.inverse').removeAttr('disabled').button("refresh");
							self.image.updateColormap(selectedContrast, selectedColormap, isInversed);
							self.$dialog.find('.thresholdInputs input').each(function(i){
								$(this).removeAttr('disabled');
							});
							break;
						case "raw":
							// Disable all interactive components
							$selectmenu.selectmenu( "disable" );
							$slider.slider( "disable" );
							self.$dialog.find('.inverse').attr('disabled', 'disabled').button("refresh");
							self.$dialog.find('.thresholdInputs input').each(function(i){
								$(this).attr('disabled', 'disabled');
							});
							break;
						default:
							break;
					}
					if ( self.changeShaderCallback )
						self.changeShaderCallback(selectedContrast);

					self.render();
				});
			});

	// Initialize threshold 
	var $slider = this.$dialog.find('.thresholdSlider').slider({
			range: true,
			slide: function( event, ui ) {
				self.$dialog.find( "#min" ).val( ui.values[0] );
				self.$dialog.find( "#max" ).val( ui.values[1] );
			},
			// Compute histogram on stop, because it's more efficient with huge amount of data
			stop: function( event, ui ) {

				self.image.tmin = ui.values[0];
				self.image.tmax = ui.values[1];

				self.$dialog.find( "#min" ).val( ui.values[0] );
				self.$dialog.find( "#max" ).val( ui.values[1] );

				self.render();
			}
		}).slider("disable");

	this.$dialog.find('.thresholdInputs').change(function(){
		// Check validity
		var inputMin = parseFloat($(this).children('#min').val());
		if ( isNaN(inputMin) || inputMin < self.image.min )
		{
			$(this).children('#min').val(self.image.min);
			inputMin = self.image.min;
		}

        var inputMax = parseFloat($(this).children('#max').val());
        if ( isNaN(inputMax) || inputMax > self.image.max)
        {
        	$(this).children('#max').val(self.image.max);
        	inputMax = self.image.max;
        }

		self.image.tmin = inputMin;
		self.image.tmax = inputMax;

		// Update slider
		self.$dialog.find('.thresholdSlider').slider({
			values: [inputMin, inputMax]
		})

		self.render();
	});
	
	// Initialize colormap selectmenu
	var $selectmenu = this.$dialog.find('.colormap').selectmenu({
		select: function(e)
		{
			selectedColormap = $(this).children('option:selected').val();
			self.image.updateColormap(selectedContrast, selectedColormap, isInversed);
			self.image.renderContext.requestFrame();
		}
	});
	
	this.$dialog.find('.inverse').button({
		text: false,
		icons: {
        	primary: ""
      	}
	});

	// Initialize inverse checkbox
	this.$dialog.find('.inverse').click(function(){

		$(this).button("option", {
			icons: {
				primary: $(this)[0].checked ? "ui-icon-check" : ""
			}
		});
		isInversed = $(this).is(':checked');
		self.image.updateColormap(selectedContrast, selectedColormap, isInversed);

		self.render();
	});

	// Set image if defined
	if ( options.image )
	{
		this.setImage(options.image);
	}
}

/**************************************************************************************************************/

/**
 *	Toggle visibility of dialog
 */
DynamicImageView.prototype.toggle = function()
{
	if ( this.$dialog.dialog( "isOpen" ) )
	{
		$('#'+this.activator).removeClass('selected');
		this.$dialog.dialog("close");
	}
	else
	{
		$('#'+this.activator).addClass('selected');
		this.$dialog.dialog("open");
	}
}

/**************************************************************************************************************/

/**
 *	Set image and update image related composants(histogram, slider, placeholder)
 */
DynamicImageView.prototype.setImage = function(image)
{
	if ( this.image )
		this.image.dispose();

	var step = (image.max-image.min)/1000;
	var self = this;
	this.$dialog.find('.thresholdSlider').slider('option', {
		values: [image.min, image.max],
		min: image.min,
		max: image.max,
		step: step
	});

	// Put min/max values into placeholder
	// Maybe not the most ergonomic way to do, but I found it cool J
	this.$dialog.find('#min').attr("placeholder", image.min);
	this.$dialog.find('#max').attr("placeholder", image.max);

	// Create histogram attached to the canvas2d created in dialog
	this.histogram = new Histogram({
		canvas: 'histogram_'+this.id,
		image: image,
		nbBeans: 256
	});

	this.image = image;
}

/**************************************************************************************************************/

/**
 *	Remove view
 */
DynamicImageView.prototype.remove = function()
{

	if ( this.unselect )
	{
		this.unselect();
	}

	if( this.disable )
	{
		this.disable();
	}

	this.image.dispose();
	this.$dialog.remove();
}

/**************************************************************************************************************/

/**
 *	Render
 */
DynamicImageView.prototype.render = function()
{
	this.histogram.update();
	this.image.renderContext.requestFrame();
}

/**************************************************************************************************************/

return DynamicImageView;


});