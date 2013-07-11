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

define(['jquery.ui', 'underscore-min', "gw/FeatureStyle", "text!../templates/dynamicImageView.html", "jquery.ui.selectmenu"], function($,_, FeatureStyle, dynamicImageViewHTML) {
 
/**************************************************************************************************************/

var DynamicImageView = function(options)
{
	// TODO create activator
	$('#dynamicImageView').addClass('dynamicAvailable').removeClass('dynamicNotAvailable');

	// Interaction parameters
	var selectedColormap = "grey";
	var selectedContrast = "raw";
	var inverse = false;

	this.image = options.image;
	var image = options.image;
	var featureData = options.featureData;

	featureData.feature.div = this;

	var dialogContent = _.template(dynamicImageViewHTML, { id: featureData.feature.properties.identifier});
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
								$('#dynamicImageView').removeClass('selected');
								$(this).dialog("close");
							}
						});

	// Put min/max values into placeholder
	// Maybe not the most ergonomic way to do, but I find it cool J
	this.$dialog.find('#min').attr("placeholder", image.min);
	this.$dialog.find('#max').attr("placeholder", image.max);

	var self = this;
	var $slider = this.$dialog.find('.contrastSlider').slider({
			range: true,
			values: [image.min,image.max],
			min: image.min,
			max: image.max,
			step: 1,
			slide: function( event, ui ) {

				image.tmin = ui.values[0];
				image.tmax = ui.values[1];

				self.$dialog.find( "#min" ).val( image.tmin );
				self.$dialog.find( "#max" ).val( image.tmax );
			}
		});


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
							image.updateColormap(selectedContrast, selectedColormap, inverse);

							var targetStyle = new FeatureStyle( featureData.feature.properties.style );
							targetStyle.fillShader = {
								fragmentCode: image.fragmentCode,
								updateUniforms: image.updateUniforms
							};
							targetStyle.uniformValues = image;
							featureData.layer.modifyFeatureStyle( featureData.feature, targetStyle );
							$slider.slider( "enable" );
							break;
						case "raw":

							var targetStyle = new FeatureStyle( featureData.feature.properties.style );
							targetStyle.fillShader = {
								fragmentCode: null,
								updateUniforms: null
							};
							featureData.layer.modifyFeatureStyle( featureData.feature, targetStyle );
							$slider.slider( "disable" );
							break;
						default:
							break;
					}
				});
			});

		
		this.$dialog.find('.colormap').selectmenu({
			select: function(e)
			{
				selectedColormap = $(this).children('option:selected').val();
				image.updateColormap(selectedContrast, selectedColormap, inverse);
			}
		});

		this.$dialog.find('.thresholdInputs').change(function(){

			// Check validity
			var min = parseInt($(this).children('#min').val());
			if ( isNaN(min) || min < image.min )
			{
				$(this).children('#min').val(image.min);
				min = image.min;
			}

            var max = parseInt($(this).children('#max').val());
            if ( isNaN(max) || max > image.max)
            {
            	$(this).children('#max').val(image.max);
            	max = image.max;
            }

            // Set new image threshold
			image.tmin = min;
			image.tmax = max;

			// Update slider
			$(this).children('.contrastSlider').slider({
				values: [image.tmin, image.tmax]
			})

		});
		
		this.$dialog.find('.inverse').click(function(){

			$(this).toggleClass('ui-state-active');
			$(this).toggleClass('ui-state-default');
			$(this).find('span').toggleClass('ui-icon-check');
			$(this).find('span').toggleClass('ui-icon-empty');

			inverse = $(this).hasClass('ui-state-active');

			//inverse = $(this).is(':checked');
			image.updateColormap(selectedContrast, selectedColormap, inverse);
		});
}

DynamicImageView.prototype.toggle = function()
{
	if ( this.$dialog.dialog( "isOpen" ) )
	{
		$('#dynamicImageView').removeClass('selected');
		this.$dialog.dialog("close");
	}
	else
	{
		$('#dynamicImageView').addClass('selected');
		this.$dialog.dialog("open");
	}
}

DynamicImageView.prototype.remove = function()
{
	$('#dynamicImageView').removeClass('dynamicAvailable').addClass('dynamicNotAvailable').remove('selected');
	this.image.dispose();
	this.$dialog.remove();
}

return DynamicImageView;


});