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
 * FeatureMobilePopup module
 */
define( [ "jquery.ui", "./IFrame", "./JsonProcessor", "./Utils", "./ImageProcessing", "gw/FeatureStyle", "gw/VectorLayer", "./Samp", "underscore-min", "text!../templates/featureMobileList.html", "text!../templates/featureDescription.html", "text!../templates/descriptionTable.html", "jquery.nicescroll.min" ],
	function($, IFrame, JsonProcessor, Utils, ImageProcessing, FeatureStyle, VectorLayer, Samp, _, featureListHTMLTemplate, featureDescriptionHTMLTemplate, descriptionTableHTMLTemplate) {

var featureListHTML = '';
var pickingManager = null;
var imageManager = null;
var globe = null;

var isMobile;

// Create selected feature div
var $selectedFeatureDiv = $('#selectedFeatureDiv');

var $leftDiv = $('#leftDiv');
var $rightDiv = $('#rightDiv');

$('.canvas').trigger('create');

$('#featurePopupPanel')
	.on('panelbeforeclose', function(event, ui){
		$selectedFeatureDiv.find('.featureProperties').getNiceScroll().remove();
	})
	.trigger("create");

// Template generating the list of selected features
var featureListTemplate = _.template(featureListHTMLTemplate);

// Template generating the detailed description of choosen feature
var featureDescriptionTemplate = _.template(featureDescriptionHTMLTemplate);

// Template generating the table of properties of choosen feature
var descriptionTableTemplate = _.template(descriptionTableHTMLTemplate);

// PileStash help HTML
var pileStashHelp = '<div id="pileStashHelp"> Some observations are overlapped. <br/> Select the observation to see detailed information. <br/> </div>';

/**********************************************************************************************/

/**
 * 	Selected feature div position calculations
 * 
 * 	@param x event.clientX
 * 	@param y event.clientY
 */
function computeDivPosition(clientX, clientY)
{
	
	var mousex = clientX; //Get X coodrinates
	var mousey = clientY; //Get Y coordinates

	mousex+= 20;
	mousey-= 100;
	
	// Positionning
	$('#selectedFeatureDiv').css(
		{
			position: 'absolute',
			left: mousex + 'px',
			top: mousey + 'px'
		}
	);
}

/**
 *	Compute optimal height of current viewport
 */
function computeHeight()
{
	return 2*$('#'+globe.renderContext.canvas.id).height()/5;
}

/**********************************************************************************************/

/**
 *	Appropriate layout of properties depending on displayProperties
 *
 *	@param properties Feature properties to modify
 *	@param {String[]} displayProperties Array containing properties which must be displayed at first
 *
 *	@return Properties matching displayProperties 
 */
function buildProperties(properties, displayProperties)
{
	if( displayProperties )
	{
		handledProperties = {}

		handledProperties.identifier = properties.identifier;
		handledProperties.title = properties.title ? properties.title : "";
		handledProperties.style = properties.style;

		// Fill handledProperties in order
		for(var j=0; j<displayProperties.length; j++)
		{
			var key = displayProperties[j];
			if (properties[key])
			{
				handledProperties[key] = properties[key];
			}
		}

		handledProperties.others = {};
		// Handle the rest into sub-section "others"
		for(var key in properties)
		{
			if (!handledProperties[key])
			{
				handledProperties.others[key] = properties[key];
			}
		}

		return handledProperties;
	}
	else
	{
		return properties;
	}
}

/**********************************************************************************************/

/**
 *	Add property description to the dictionary 
 *
 *	@param describeUrl Open Search describe document url
 *	@param property Property
 *	@param dictionary Dictionary to complete
 */
function addPropertyDescription(describeUrl, property, dictionary)
{
	$.ajax({
		type: "GET",
		url: describeUrl+property,
		dataType: 'text',
		success: function(response){
			dictionary[property] = response;
			$('#'+property).attr("title", response);
		},
		error: function (xhr, ajaxOptions, thrownError) {
			// console.error(xhr);
		}
	});
}

/**********************************************************************************************/

/**
 *	Create dictionary
 *
 *	@param layer Layer
 *	@param properties Feature properties
 */
function createDictionary( layer, properties )
{
	layer.dictionary = {};
	// Get dictionary template from open search description document
	$.ajax({
		type: "GET",
		url: layer.serviceUrl,
		dataType: "xml",
		success: function(xml) {
			var dicodesc = $(xml).find('Url[rel="dicodesc"]');
			var describeUrl = $(dicodesc).attr("template");

			if ( describeUrl )
			{
				// Cut unused part
				var splitIndex = describeUrl.indexOf( "{" );
				if ( splitIndex != -1 )
					describeUrl = describeUrl.substring( 0, splitIndex );

				for ( var key in properties )
				{
					addPropertyDescription(describeUrl, key, layer.dictionary);
				}
			}
			else
			{
				// No dico found
			}
		},
		error: function(xhr){
			// No dico found
		}
	});
}

/**********************************************************************************************/

/**
 * 	Insert HTML code of choosen feature
 */
function createHTMLSelectedFeatureDiv( layer, feature )
{
	if ( !layer.hasOwnProperty('dictionary') )
	{
		createDictionary(layer, feature.properties);
	}

	var output = featureDescriptionTemplate( {
		dictionary: layer.dictionary,
		services: feature.services,
		properties: buildProperties(feature.properties, layer.displayProperties),
		descriptionTableTemplate: descriptionTableTemplate,
		isMobile: isMobile
	} );
	
	$rightDiv.html( output );
	
	// Stay in canvas
	$rightDiv.find('.featureProperties').css('max-height', computeHeight());

	$selectedFeatureDiv.find('.featureProperties').niceScroll({
		railoffset: {
			left: 15
		},
		autohidemode: false
	}).hide();
}

/**********************************************************************************************/

return {

	/**
	 *	Init
	 *
	 *	@param pm <PickingManager>
	 *	@param gl <GlobWeb.Globe>
	 */
	init: function(pm, im, gl, configuration){
		pickingManager = pm;
		imageManager = im;
		globe = gl;
		isMobile = configuration.isMobile;

		$('#featurePopupPanel').panel("option", "swipeClose", false);

		// Show/hide quicklook
		$selectedFeatureDiv.on("click", '#quicklook', function(event){
			var selectedData = pickingManager.getSelectedData();
			var isFits = false;

			var otherQuicklookOn = selectedData.feature.properties.style.fill && !selectedData.feature.properties.style.fillTextureUrl;
			if ( otherQuicklookOn )
			{
				// Remove fits quicklook
				imageManager.removeImage(selectedData, !isFits);
			}

			if ( selectedData.feature.properties.style.fill == true )
			{
				imageManager.removeImage(selectedData, isFits);
			} 
			else
			{
				imageManager.addImage(selectedData, isFits );
			}

			globe.renderContext.requestFrame();
		});

		$selectedFeatureDiv.on('click', "#quicklookFits", function(event){
			var selectedData = pickingManager.getSelectedData();
			var isFits = true;

			var otherQuicklookOn = selectedData.feature.properties.style.fill && selectedData.feature.properties.style.fillTextureUrl;
			if ( otherQuicklookOn )
			{
				// Remove quicklook
				imageManager.removeImage(selectedData, !isFits);
			}

			if ( selectedData.feature.properties.style.fill == true )
			{
				imageManager.removeImage(selectedData, isFits);
			} 
			else
			{
				imageManager.addImage(selectedData, isFits );
			}
		});

		// Show/hide Dynamic image service
		$selectedFeatureDiv.on("click", '#dynamicImageView', function(event){
			$(this).toggleClass('selected');
			var selectedData = pickingManager.getSelectedData();
			if ( !isMobile )
			{
				ImageProcessing.setData(selectedData);
			}
		});

		// Send image by Samp
		$selectedFeatureDiv.on("click", '#sendImage', function(event){
			var selectedData = pickingManager.getSelectedData();
			var message = Samp.sendImage(selectedData.feature.services.download.url);
			$('#serviceStatus').html(message).slideDown().delay(1500).slideUp();
		});

		// Show/hide HEALPix service
		$selectedFeatureDiv.on("click", '#healpix', function(event){
			var selectedData = pickingManager.getSelectedData();
			var healpixLayer = selectedData.feature.services.healpix.layer;

			if ( $('#healpix').is('.selected') )
			{
				$('#healpix').removeClass('selected');
				healpixLayer.visible(false);
			}
			else
			{
				$('#healpix').addClass('selected');
				healpixLayer.visible(true);
			}
		});

		// Show/hide Solar object service
		$selectedFeatureDiv.on("click", '#solarObjects', function(event){
			var selectedData = pickingManager.getSelectedData();
			var selection = pickingManager.getSelection();

			var solarObjectsLayer;
			var layer = selectedData.layer;

			if ( selectedData.feature.services.solarObjects )
			{
				solarObjectsLayer = selectedData.feature.services.solarObjects.layer;
			}
			else
			{
				// Create solar object layer
				var defaultVectorStyle = new FeatureStyle({ 
					iconUrl: "css/images/star.png",
					zIndex: 2
				});

				var options = {
					name: "SolarObjectsSublayer",
					style: defaultVectorStyle
				};

				solarObjectsLayer = new VectorLayer( options );
				globe.addLayer(solarObjectsLayer);
				pickingManager.addPickableLayer(solarObjectsLayer);

				var url = configuration.solarObjects.baseUrl;
				if ( globe.tileManager.imageryProvider.tiling.coordSystem == "EQ" )
            	{
            		url += "EQUATORIAL";
            	}
            	else
            	{
            		url += "GALACTIC";
            	}
            	
				$('#solarObjectsSpinner').show();
				$.ajax({
					type: "GET",
					url: url,
					data : {
						order: selection.selectedTile.order,
						healpix: selection.selectedTile.pixelIndex,
						EPOCH: selectedData.feature.properties['date-obs']
						// coordSystem: (globe.tileManager.imageryProvider.tiling.coordSystem == "EQ" ? "EQUATORIAL" : "GALACTIC")
					},
					success: function(response){
						JsonProcessor.handleFeatureCollection( solarObjectsLayer, response );
						$('#serviceStatus').html(response.totalResults + ' objects found').slideDown().delay(400).slideUp();
						solarObjectsLayer.addFeatureCollection(response);
					},
					complete: function(xhr){
						$('#solarObjectsSpinner').hide();
					},
					error: function(xhr)
					{
						$('#serviceStatus').html('No data found').slideDown().delay(400).slideUp();
					}
				});

				if ( !layer.subLayers )
				{
					layer.subLayers = [];
				}
				selectedData.feature.services.solarObjects = {
					layer: solarObjectsLayer
				}
				layer.subLayers.push(solarObjectsLayer);
			}

			if ( $('#solarObjects').is('.selected') )
			{
				$('#solarObjects').removeClass('selected');
				solarObjectsLayer.visible(false);
			}
			else
			{
				$('#solarObjects').addClass('selected');
				solarObjectsLayer.visible(true);
			}
		});

		
		// Show/hide subsection properties
		$selectedFeatureDiv.on("tap", '.section', function(event){

			$selectedFeatureDiv.find('.featureProperties').getNiceScroll().hide();
			// TODO slideToggle works with div -> add div to the tab generation
			$(this).siblings('table').fadeToggle("slow", "linear", function(){
				$selectedFeatureDiv.find('.featureProperties').getNiceScroll().show();
				$selectedFeatureDiv.find('.featureProperties').getNiceScroll().resize();
			});/*slideToggle(300)*/;
			if ( $(this).siblings('#arrow').is('.arrow-right') )
			{
				$(this).siblings('#arrow').removeClass('arrow-right').addClass('arrow-bottom');
			}
			else
			{
				$(this).siblings('#arrow').removeClass('arrow-bottom').addClass('arrow-right');
			}
		});

		// Choose feature by clicking on its title
		var self = this;
		$selectedFeatureDiv.on("change", '#featureList', function(event){

			pickingManager.blurSelectedFeature();
			// $('#featureList div.selected').removeClass('selected');
			
			var featureIndexToFocus = parseInt($(this).val());

			pickingManager.focusFeatureByIndex( featureIndexToFocus );
			var selectedData = pickingManager.getSelectedData();
			
			$('#featureList div:eq('+featureIndexToFocus+')').addClass('selected');
			self.showFeatureInformation( selectedData.layer, selectedData.feature );

			globe.renderContext.requestFrame();
		});

		// Show/hide external resource
		$selectedFeatureDiv.on("click", '.propertiesTable a', function(event){
			event.preventDefault();
			IFrame.show(event.target.innerHTML);
		});

		//$rightDiv.css('max-width', $('#'+globe.renderContext.canvas.id).width()/4 );
		// Make rightDiv always visible depending on viewport
		// $(window).on('resize', function(){
		// 	$rightDiv.find('.featureProperties').css('max-height', computeHeight());
		// 	$rightDiv.css('max-width',$('#'+globe.renderContext.canvas.id).width()/4 );
		// });

	},

	/**********************************************************************************************/

	/**
	 *	Hide popup
	 *
	 *	@param callback Callback 
	 */
	hide: function(callback){
		if ( callback )
		{
			callback();
		}
	},

	/**********************************************************************************************/

	/**
	 *	Show popup
	 *
	 *	@param x X in window coordinate system
	 *	@param y Y in window coordinate system
	 *	@param callback Callback
	 */
	show: function(x, y, callback){

		$( "#featurePopupPanel" ).trigger('create');
		$( "#featurePopupPanel" ).panel( "open" );
	},

	/**********************************************************************************************/

	/**
	 * 	Insert HTML code of selected features
	 * 
	 * 	@param {<GlobWeb.Feature>[]} seleciton Array of features
	 */
	createFeatureList: function(selection){
		featureListHTML = featureListTemplate( { selection: selection });
		$leftDiv.html( featureListHTML );
	},

	/**********************************************************************************************/

	/**
	 * 	Insert HTML code of help to iterate on each feature
	 */
	createHelp: function(){
		$rightDiv.html( pileStashHelp );
	},

	/**********************************************************************************************/

	/**
	 * 	Show feature information
	 */
	showFeatureInformation: function(layer, feature){
		$rightDiv.find('.featureProperties').getNiceScroll().hide();
		$rightDiv.fadeOut(300, function(){
			$rightDiv.find('.featureProperties').getNiceScroll().remove();
			createHTMLSelectedFeatureDiv( layer, feature );
			$(this).fadeIn(300, function(){
				$selectedFeatureDiv.find('.featureProperties').getNiceScroll().resize();
				$selectedFeatureDiv.find('.featureProperties').getNiceScroll().show();
		 	});
		 });
	},

	/**********************************************************************************************/

	/**
	 *	Generate feature meta data for the given feature
	 */
	generateFeatureMetadata: function( layer, feature )
	{
		return featureDescriptionTemplate( {
			dictionary: layer.hasOwnProperty('dictionary') ? layer.dictionary : createDictionary(layer, feature.properties),
			services : false,
			properties: buildProperties(feature.properties, layer.displayProperties),
			descriptionTableTemplate: descriptionTableTemplate
		} );
	}

	/**********************************************************************************************/

};

});