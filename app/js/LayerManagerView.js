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
 * Layer manager view module
 */
define( [ "jquery", "underscore-min", "LayerManager", "./ErrorDialog", "./LayerServiceView", "./BackgroundLayersView", "./AdditionalLayersView", "./FitsLoader", "./ImageManager", "./ImageViewer", "jquery.ui"], 
	function($, _, LayerManager, ErrorDialog, LayerServiceView, BackgroundLayersView, AdditionalLayersView, FitsLoader, ImageManager, ImageViewer) {

/**
 * Private variables
 */
var sky = null;

// GeoJSON data providers
var dataProviders = {};
var votable2geojsonBaseUrl;


/**
 * Private functions
 */

/**************************************************************************************************************/

/**
 * 	Drop event
 */
function handleDrop(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	var files = evt.dataTransfer.files; // FileList object.
	
	// Files is a FileList of File objects.
	$.each( files, function(index, f) {
		
		var name = f.name;
		var reader = new FileReader();
		$('#loading').show();

		if ( f.type == "image/fits" )
		{
			// Handle fits image
			reader.onloadend = function(e) {
				var arrayBuffer = this.result;
				var fits = FitsLoader.parseFits(arrayBuffer);

				var gwLayer = LayerManager.createLayerFromFits(name, fits);
				AdditionalLayersView.addView( gwLayer );

				// Add fits texture
				var featureData = {
					layer: gwLayer,
					feature: gwLayer.features[0]
				};
				var fitsData = fits.getHDU().data;
				ImageViewer.addView(featureData, true);
				ImageManager.handleFits( fitsData, featureData );
				ImageViewer.show();

				$('#loading').hide();
			};
			reader.readAsArrayBuffer(f);
		}
		else
		{
			reader.onloadend = function(e) {

				if ( this.result.search('<?xml') > 0 )
				{
					$.ajax({
						type: "GET",
						url: votable2geojsonBaseUrl,
						data: {
							url: proxyUrl,
							coordSystem: "EQUATORIAL"
						},
						success: function(response)
						{

							var gwLayer = LayerManager.createLayerFromGeoJson(name, response);
							AdditionalLayersView.addView( gwLayer );
							$('#loading').hide();
						},
						error: function(thrownError)
						{
							console.error(thrownError);
						}
					});
				}
				else
				{
					// Handle as json if possible
					try {
						var response = $.parseJSON(this.result);
					} catch (e) {
						ErrorDialog.open("JSON parsing error : " + e.type + "<br/> For more details see http://jsonlint.com/.");
						$('#loading').hide();
						return false;
					}

					var gwLayer = LayerManager.createLayerFromGeoJson(name, response);
					AdditionalLayersView.addView( gwLayer );
					$('#loading').hide();
				}
				
			};
			reader.readAsText(f);
		}

	});
}

/**************************************************************************************************************/

/**
 * 	Drag over event
 */
function handleDragOver(evt)
{
	evt.stopPropagation();
	evt.preventDefault();
	evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

/**************************************************************************************************************/

function updateUI() {
	// Create accordeon
	$( "#accordion" ).accordion( {
		header: "> div > h3",
		autoHeight: false,
		active: 0,
		collapsible: true,
		heightStyle: "content"
	} ).show();

	BackgroundLayersView.updateUI();
	AdditionalLayersView.updateUI();
}

/**************************************************************************************************************/

/**
 *	Fill the LayerManager table
 */
function initLayers(layers) 
{
	var layers = LayerManager.getLayers();

	// TODO: Call Additionnal/Background addView method to initialize the view
	updateUI();
}

/**************************************************************************************************************/

return {
	/**
	 *	Init
	 *
	 *	@param mizar
	 *		Mizar API object
	 *	@param configuration
	 *		Mizar configuration 
 	 */
	init: function(mizar, configuration) {
		this.mizar = mizar;
		
		// Store the sky in the global module variable
		sky = mizar.sky;
		AdditionalLayersView.init({ mizar: mizar, configuration: configuration });
		BackgroundLayersView.init({ mizar: mizar });

		this.mizar.subscribe("backgroundLayer:add", BackgroundLayersView.addView);
		this.mizar.subscribe("additionalLayer:add", function(gwLayer) {
			$( "#accordion" ).accordion("refresh");
			AdditionalLayersView.addView(gwLayer);
		});

		// Necessary to drag&drop option while using jQuery
		$.event.props.push('dataTransfer');

		// TODO : Call init layers
		initLayers(configuration.layers);

		// Setup the drag & drop listeners.
		$('canvas').on('dragover', handleDragOver);
		$('canvas').on('drop', handleDrop);

		//$( "#accordion" ).accordion("refresh");

		LayerServiceView.init(sky, mizar.navigation, this, configuration);

		if ( configuration.votable2geojson )
		{
			votable2geojsonBaseUrl = configuration.votable2geojson.baseUrl;
		}
	},

	/**
	 *	Remove view
	 */
	removeView: function() {
		// TODO
	},

	/**
	 *	Returns the state of view
	 */
	isInitialized: function()
	{
		return (sky != null)
	}
};

});