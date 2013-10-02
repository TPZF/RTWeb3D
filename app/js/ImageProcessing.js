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
 *	ImageProcessing module
 */
define( [ "jquery.ui", "SelectionTool", "CutOutViewFactory", "DynamicImageView", "gw/FeatureStyle" ],
		function($, SelectionTool, CutOutViewFactory, DynamicImageView, FeatureStyle) {

/**************************************************************************************************************/

var feature;
var layer;
var disable;
var unselect;
var $dialog;
var histogramElement;
var cutOutElement;

/**************************************************************************************************************/

/**
 *	Toggle visibility of dialog
 */
function toggle()
{
	if ( $dialog.dialog( "isOpen" ) )
	{
		$dialog.dialog("close");
	}
	else
	{
		$dialog.dialog("open");
	}
}

/**************************************************************************************************************/

/**
 *	Remove view
 */
function remove()
{
	if ( unselect )
	{
		unselect();
	}

	if( disable )
	{
		disable();
	}

	if ( histogramElement )
		histogramElement.remove();

	CutOutViewFactory.removeView(cutOutElement);
	$dialog.remove();
}

/**************************************************************************************************************/

/**
 *	Set data to process
 *
 *	@param selectedData Object containing feature and layer extracted by <PickingManager>
 */
function setData(selectedData)
{
    if ( feature && feature.properties.identifier == selectedData.feature.properties.identifier )
    {
        this.toggle();
    }
    else
    {
       if ( !$dialog.dialog( "isOpen" ) )
       {
            this.toggle();
       }
    }
    
    feature = selectedData.feature;
	layer = selectedData.layer;
    cutOutElement.setUrl(selectedData.feature.services.download.url);

    var image = selectedData.feature.properties.style.uniformValues;
	if ( !image )
    {
        $dialog.find('.histogramContent').children('div').fadeOut(function(){
				$(this).siblings('p').fadeIn();
		});
    }
    else
    {
    	this.setImage(image);
    }
}

/**************************************************************************************************************/

return {

	/**
	 *	Init
	 *
	 *	@param options
	 *		<ul>
	 *			<li>feature: The feature to process
	 *			<li>layer: The layer to which the feature belongs to
	 *			<li>disable: Disable callback</li>
	 *			<li>unselect: Unselect callback</li>
	 *		</ul>
	 */
	init: function(options)
	{
		if ( options )
		{
			//this.id = options.id;
			feature = options.feature || null;
			layer = options.layer || null;

			// Callbacks
			disable = options.disable || null;
			unselect = options.unselect || null;
		}

		var dialog =
			'<div>\
				<div class="imageProcessing" id="imageProcessing" title="Image processing">\
					<h3>Histogram</h3>\
					<div class="histogramContent">\
						<p> Fits isn\'t loaded, thus histogram information isn\'t available</p>\
						<div style="display: none;" id="histogramView"></div>\
					</div>\
					<h3>Cutout</h3>\
					<div id="cutOutView"></div>\
				</div>\
			</div>';

		$dialog = $(dialog).appendTo('body').dialog({
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
				if ( unselect )
				{
					unselect();
				}
				
				$(this).dialog("close");

			}
		}).find(".imageProcessing").accordion({
			autoHeight: false,
			active: 0,
			collapsible: true,
			heightStyle: "content"
		}).end();

		histogramElement = new DynamicImageView( "histogramView", {
			id: "featureImageProcessing",
			changeShaderCallback: function(contrast){
				if ( contrast == "raw" )
				{
					var targetStyle = new FeatureStyle( feature.properties.style );
					targetStyle.fillShader = {
						fragmentCode: null,
						updateUniforms: null
					};
					layer.modifyFeatureStyle( feature, targetStyle );
				}
				else
				{
					var targetStyle = new FeatureStyle( feature.properties.style );
					targetStyle.fillShader = {
						fragmentCode: this.image.fragmentCode,
						updateUniforms: this.image.updateUniforms
					};
					layer.modifyFeatureStyle( feature, targetStyle );
				}
			}
		})
		cutOutElement = CutOutViewFactory.addView("cutOutView");
	},

	setData: setData,
	setImage: function(image)
	{
		histogramElement.setImage(image);
		cutOutElement.setUrl(image.url);
		$dialog.find('.histogramContent').children('p').fadeOut(function(){
			$(this).siblings('div').fadeIn();
		});
	},
	toggle: toggle,
	isOpened: function()
	{
		return $dialog.dialog( "isOpen" );
	},
	removeData: function(data)
	{
		if ( data.feature.properties.identifier == feature.properties.identifier )
		{
			if ( this.isOpened() )
			{
				this.toggle();
			}
			$dialog.find('.histogramContent').children('div').fadeOut(function(){
				$(this).siblings('p').fadeIn();
			});
			feature = null;
			layer = null;
		}
	}
};

});