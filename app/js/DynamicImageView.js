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

define(['jquery.ui', 'underscore-min', "gw/FeatureStyle", "./Histogram", "UWSManager", "AnimatedButton", "ErrorDialog", "text!../templates/dynamicImageView.html", "jquery.ui.selectmenu"],
	function($,_, FeatureStyle, Histogram, UWSManager, AnimatedButton, ErrorDialog, dynamicImageViewHTML) {
 
/**************************************************************************************************************/

/** @constructor 
 *	DynamicImageView constructor
 *	Creates jQuery view of the given <GlobWeb.DynamicImage>
 *	
 *	@param options
 *		<h3>Required:</h3>
 *		<ul>
 *			<li>id: Identifier</li>
 *		</ul>
 *		<h3>Optional:</h3>
 *		<ul>
 *			<li>image: The image represented by this view</li>
 *			<li>changeShaderCallback: Callback for shader changing</li>
 *		</ul>
 */
var DynamicImageView = function(element, options)
{
	this.id = options.id;
	this.changeShaderCallback = options.changeShaderCallback;

	// Interaction parameters
	var selectedColormap = "grey";
	var selectedContrast = "raw";
	var isInversed = false;

	// Create dialog
	var self = this;

	var imageViewContent = _.template(dynamicImageViewHTML, { id: this.id });
	this.$element = $('#'+element);
	this.$element.html(imageViewContent);

	// Initialize contrast buttonset
	this.$element.find('.contrast').buttonset().find('input')
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
							self.enableUI();
							break;
						case "raw":
							// Disable all interactive components
							self.disableUI();
							break;
						default:
							break;
					}

					self.image.updateColormap(selectedContrast, selectedColormap, isInversed);
					if ( self.changeShaderCallback )
						self.changeShaderCallback(selectedContrast);

					self.render();
				});
			});

	// Initialize threshold 
	var $slider = this.$element.find('.thresholdSlider').slider({
			range: true,
			slide: function( event, ui ) {
				self.$element.find( "#min" ).val( ui.values[0] );
				self.$element.find( "#max" ).val( ui.values[1] );
			},
			// Compute histogram on stop, because it's more efficient with huge amount of data
			stop: function( event, ui ) {
				self.updateThreshold(ui.values[0], ui.values[1]);
			}
		}).slider("disable");

	this.$element.find('.thresholdInputs').change(function(){
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

        self.updateThreshold( inputMin, inputMax );
	});
	
	// Initialize colormap selectmenu
	var $selectmenu = this.$element.find('.colormap').selectmenu({
		select: function(e)
		{
			selectedColormap = $(this).children('option:selected').val();
			self.image.colormap = selectedColormap;
			self.image.updateColormap(selectedContrast, selectedColormap, isInversed);
			self.image.renderContext.requestFrame();
		}
	});
	
	this.$element.find('.inverse').button({
		text: false,
		icons: {
        	primary: ""
      	}
	});

	// Initialize inverse checkbox
	this.$element.find('.inverse').click(function(){

		$(this).button("option", {
			icons: {
				primary: $(this)[0].checked ? "ui-icon-check" : ""
			}
		});
		isInversed = $(this).is(':checked');
		self.image.updateColormap(selectedContrast, selectedColormap, isInversed);

		self.render();
	});

	var zScaleButton = new AnimatedButton(this.$element.find('.zScale')[0], {
		onclick: function(){
			var params = {
				PHASE: "RUN",
				uri: self.image.url
			};

			if ( !self.image.url )
			{
				ErrorDialog.open('ZScale can\'t find image url');
			}

			zScaleButton.startAnimation();
			UWSManager.post('zscale', params, {
				successCallback: function(result)
				{
					zScaleButton.stopAnimation();

					self.$element.find( "#min" ).val( result.z1 ).animate({ color: '#6BCAFF', 'border-color': '#6BCAFF' }, 300, function(){
						$(this).animate({color: '#F8A102', 'border-color': 'transparent'});
					});
					self.$element.find( "#max" ).val( result.z2 ).animate({ color: '#6BCAFF', 'border-color': '#6BCAFF' }, 300, function(){
						$(this).animate({color: '#F8A102', 'border-color': 'transparent'});
					});

					self.updateThreshold(z1,z2);
				},
				failCallback: function()
				{
					zScaleButton.stopAnimation();
					ErrorDialog.open("ZScale internal server error<br/>");
				}
			});
		}
	});

	// Create histogram attached to the canvas2d
	this.histogram = new Histogram({
		canvas: 'histogram_'+this.id,
		nbBeans: 256,
		onUpdate: $.proxy(this.updateThreshold, this)
	});

	// Set image if defined
	if ( options.image )
	{
		options.image.colormap = "grey";
		this.setImage(options.image);
	}
}

/**************************************************************************************************************/

/**
 *	Enable all UI elements
 */
DynamicImageView.prototype.enableUI = function()
{
	this.$element.find('.colormap').selectmenu( "enable" );
	this.$element.find('.thresholdSlider').slider( "enable" );
	this.$element.find('.inverse').removeAttr('disabled').button("refresh");
	this.$element.find('.zScale').removeAttr('disabled').button("refresh");
	this.$element.find('.thresholdInputs input').each(function(i){
		$(this).removeAttr('disabled');
	});
}

/**************************************************************************************************************/

/**
 *	Disable all UI elements
 */
DynamicImageView.prototype.disableUI = function()
{
	this.$element.find('.colormap').selectmenu( "disable" );
	this.$element.find('.thresholdSlider').slider( "disable" );
	this.$element.find('.inverse').attr('disabled', 'disabled').button("refresh");
	this.$element.find('.zScale').attr('disabled', 'disabled').button("refresh");
	this.$element.find('.thresholdInputs input').each(function(i){
		$(this).attr('disabled', 'disabled');
	});
}

/**************************************************************************************************************/

/**
 *	Update threshold
 */
DynamicImageView.prototype.updateThreshold = function(min, max)
{
	this.image.tmin = min;
	this.image.tmax = max;

	this.$element.find( "#min" ).val( min );
	this.$element.find( "#max" ).val( max );

	// Update slider
	this.$element.find('.thresholdSlider').slider({
		values: [min, max]
	});

	this.render();
}

/**************************************************************************************************************/

/**
 *	Set image and update image related composants(histogram, slider, placeholder)
 */
DynamicImageView.prototype.setImage = function(image)
{
	var step = (image.max-image.min)/1000;
	var self = this;
	this.$element.find('.thresholdSlider').slider('option', {
		values: [image.min, image.max],
		min: image.min,
		max: image.max,
		step: step
	});

	this.histogram.setImage(image);

	// Put min/max values into placeholder
	// Maybe not the most ergonomic way to do, but I found it cool J
	this.$element.find('#min').attr("placeholder", image.min).end()
				 .find('#max').attr("placeholder", image.max);
	
	// Update UI values
	this.$element.find('.inverse').attr('checked', (image.inverse) ? 'checked' : false).button('refresh').end()
				 .find('.contrast')
					.find('input[value='+image.transferFn+']').attr('checked','checked').end()
				 .buttonset("refresh").end()
				 .find('.colormap').val(image.colormap).selectmenu();

	if( image.transferFn == "raw" )
	{
		this.disableUI();
	}
	else
	{
		this.enableUI();
	}

	this.image = image;
	this.updateThreshold(image.tmin, image.tmax);
	this.render();
}

/**************************************************************************************************************/

/**
 *	Remove view
 */
DynamicImageView.prototype.remove = function()
{
	this.image.dispose();
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