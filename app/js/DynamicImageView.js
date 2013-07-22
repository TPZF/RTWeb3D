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

var DynamicImageView = function(options)
{
	this.activator = options.activator;

	// TODO unify activator layout between button and img, in order to remove button option
	if ( options.button )
	{
		$('#'+this.activator).button("enable");
	}
	else
	{
		$('#'+this.activator).addClass('dynamicAvailable').removeClass('dynamicNotAvailable');
	}

	// Interaction parameters
	var selectedColormap = "grey";
	var selectedContrast = "raw";
	var inverse = false;

	this.histogram = null;
	this.image = options.image;

	// Create dialog
	var dialogContent = _.template(dynamicImageViewHTML, { id: options.id});
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
								// TODO unify activator layout between button and img, in order to remove button option
								if ( options.button )
								{
									$('#'+self.activator).removeAttr("checked").button("refresh");
								}
								else
								{
									$('#'+self.activator).removeClass('selected');
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
							$slider.slider( "enable" );
							$selectmenu.selectmenu( "enable" );
							self.$dialog.find('.inverse').removeAttr('disabled').button("refresh");
							self.image.updateColormap(selectedContrast, selectedColormap, inverse);
							self.$dialog.find('.thresholdInputs input').each(function(i){
								$(this).removeAttr('disabled');
							});
							break;
						case "raw":
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
					if ( options.changeShaderCallback )
						options.changeShaderCallback(selectedContrast);

					self.render();
				});
			});

	// Put min/max values into placeholder
	// Maybe not the most ergonomic way to do, but I find it cool J
	this.$dialog.find('#min').attr("placeholder", this.image.min);
	this.$dialog.find('#max').attr("placeholder", this.image.max);
	

	// Initialize threshold 
	var self = this;
	var min = this.image.min;
	var max = this.image.max;
	var step = (this.image.max-this.image.min)/1000;
	var $slider = this.$dialog.find('.thresholdSlider').slider({
			range: true,
			values: [min,max],
			min: min,
			max: max,
			step: step,
			slide: function( event, ui ) {

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
		if ( isNaN(inputMin) || inputMin < min )
		{
			$(this).children('#min').val(min);
			inputMin = min;
		}

        var inputMax = parseFloat($(this).children('#max').val());
        if ( isNaN(inputMax) || inputMax > max)
        {
        	$(this).children('#max').val(max);
        	inputMax = max;
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
			self.image.updateColormap(selectedContrast, selectedColormap, inverse);
			self.image.renderContext.requestFrame();
		}
	});
	
	this.$dialog.find('#inverse').button({
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
		inverse = $(this).is(':checked');
		self.image.updateColormap(selectedContrast, selectedColormap, inverse);

		self.render();
	});

	// Create histogram
	self.histogram = new Histogram({
		canvas: 'histogram_'+options.id,
		image: this.image,
		nbBeans: 256
	});
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
 *	Remove view
 */
DynamicImageView.prototype.remove = function()
{
	$('#'+this.activator).removeClass('dynamicAvailable').addClass('dynamicNotAvailable').remove('selected');
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