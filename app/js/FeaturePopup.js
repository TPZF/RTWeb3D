/**
 * FeaturePopup module
 */
define( [ "jquery.ui", "IFrame", "JsonProcessor", "underscore-min", "text!../templates/featureList.html", "text!../templates/featureDescription.html", 
	"text!../templates/descriptionTable.html", "jquery.nicescroll.min" ], function($, IFrame, JsonProcessor, _, featureListHTMLTemplate, featureDescriptionHTMLTemplate, descriptionTableHTMLTemplate) {

var featureListHTML = '';
var pickingManager = null;
var globe = null;
var xhr; // Fits request

// Create selected feature div
var selectedFeatureDiv = '<div id="selectedFeatureDiv" class="contentBox ui-widget-content" style="display: none">\
				<div id="leftDiv"></div>\
				<div id="rightDiv"></div>\
				<div class="closeBtn">\
					<img src="css/images/close_button.png" alt="" class="defaultImg" />\
					<img style="opacity: 0" src="css/images/close_buttonHover.png" alt="" class="hoverImg" />\
				</div>\
				<div class="arrow-left"></div>\
			</div>';

var $selectedFeatureDiv = $(selectedFeatureDiv).appendTo('body');

// Template generating the list of selected features
var featureListTemplate = _.template(featureListHTMLTemplate);

// Template generating the detailed description of choosen feature
var featureDescriptionTemplate = _.template(featureDescriptionHTMLTemplate);

// Template generating the table of properties of choosen feature
var descriptionTableTemplate = _.template(descriptionTableHTMLTemplate);

// PileStash help HTML
var pileStashHelp = '<div id="pileStashHelp"> Some observations are overlapped. <br/> Click on the observation to see detailed informations about each observation. <br/> </div>';

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
		handledProperties.title = properties.title;

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

/**
 * 	Insert HTML code of choosen feature
 */
function createHTMLSelectedFeatureDiv( layer, feature )
{	
	var output = featureDescriptionTemplate( { services: feature.services, properties: buildProperties(feature.properties, layer.displayProperties), descriptionTableTemplate: descriptionTableTemplate } );
	
	$('#rightDiv').html( output );
	$('.featureProperties').niceScroll({autohidemode: false});
}

return {

	/**
	 *	Init
	 *
	 *	@param pm <PickingManager>
	 *	@param gl <GlobWeb.Globe>
	 */
	init: function(pm, gl){

		pickingManager = pm;
		globe = gl;
		var self = this;

		// Show/hide quicklook
		$selectedFeatureDiv.on("click", '#quicklook', function(event){
			var selectedFeature = pickingManager.getSelectedFeature();
			
			if ( selectedFeature.feature.properties.style.fill == true )
			{
				$('#quicklook').removeClass('selected');

				var newStyle = new GlobWeb.FeatureStyle( selectedFeature.feature.properties.style );
				newStyle.fill = false;
				selectedFeature.layer.modifyFeatureStyle( selectedFeature.feature, newStyle );

				globe.publish("removeFitsRequested", selectedFeature);
			} 
			else
			{
				$('#quicklook').addClass('selected');
				var style = selectedFeature.feature.properties.style;
				style.fill = true;

				if ( selectedFeature.feature.services && selectedFeature.feature.services.download && selectedFeature.feature.services.download.mimetype == "image/fits" )
				{
					var url = "/sitools/proxy?external_url=" + selectedFeature.feature.services.download.url;
					globe.publish("fitsRequested", { selectedFeature: selectedFeature, url: url });
				}
				else
				{
					style.fillTextureUrl = selectedFeature.feature.properties.quicklook;
				}
				selectedFeature.layer.modifyFeatureStyle( selectedFeature.feature, style );
			}
		});

		// Show/hide HEALPix service
		$selectedFeatureDiv.on("click", '#healpix', function(event){
			var selectedFeature = pickingManager.getSelectedFeature();
			var healpixLayer = selectedFeature.feature.services.healpix.layer;

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
			var selectedFeature = pickingManager.getSelectedFeature();
			var selection = pickingManager.getSelection();

			var solarObjectsLayer;
			var layer = selectedFeature.layer;

			if ( selectedFeature.feature.services.solarObjects )
			{
				solarObjectsLayer = selectedFeature.feature.services.solarObjects.layer;
			}
			else
			{
				// Create solar object layer
				var defaultVectorStyle = new GlobWeb.FeatureStyle({ 
					rendererHint: "Basic", 
					iconUrl: "css/images/star.png"
				});

				var options = {
					name: "SolarObjectsSublayer",
					style: defaultVectorStyle
				};

				solarObjectsLayer = new GlobWeb.VectorLayer( options );
				layer.globe.addLayer(solarObjectsLayer);
				pickingManager.addPickableLayer(solarObjectsLayer);

				var url = "/sitools/rtwebgl/plugin/solarObjects?order=" + selection.selectedTile.order + "&healpix=" + selection.selectedTile.pixelIndex;
	
				$.ajax({
					type: "GET",
					url: url,
					success: function(response){
						console.log(response);
						JsonProcessor.handleFeatureCollection( solarObjectsLayer, response );
						solarObjectsLayer.addFeatureCollection(response);
					}
				});

				if ( !layer.subLayers )
				{
					layer.subLayers = [];
				}
				selectedFeature.feature.services.solarObjects = {
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

		// Arrow scroll events
		$selectedFeatureDiv.on("mousedown", '#scroll-arrow-down.clickable', function(event){
			$('#selectedFeatureDiv #scroll-arrow-up').css("border-bottom-color", "orange").addClass("clickable");
			var topValue = parseInt($('#featureList').css("top"), 10) - 60;
			var height = $('#featureList').height();
			var maxHeight = parseInt( $('#featureListDiv').css("max-height") );
			if (topValue <= -(height - maxHeight))
			{
				topValue = -(height - maxHeight);
				$(this).css("border-top-color", "gray").removeClass("clickable");
			}
			$('#featureList').stop().animate({top: topValue +"px"}, 300);
		}).disableSelection();
		
		$selectedFeatureDiv.on("mousedown", '#scroll-arrow-up.clickable', function(event){
			$('#selectedFeatureDiv #scroll-arrow-down').css("border-top-color", "orange").addClass("clickable");
			
			var topValue = parseInt($('#featureList').css("top"), 10) + 60;
			if (topValue >= 0)
			{
				topValue = 0;
				$(this).css("border-bottom-color", "gray").removeClass("clickable");
			}
			$('#featureList').stop().animate({top: topValue +"px"}, 300);
		}).disableSelection();

		// Show/hide subsection properties
		$selectedFeatureDiv.on("click", '.section', function(event){
			// TODO slideToggle works with div -> add div to the tab generation
			$(this).siblings('table').fadeToggle("slow", "linear", function(){
				$('.featureProperties').getNiceScroll().resize();
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
		$selectedFeatureDiv.on("click", '.featureTitle', function(){
			pickingManager.blurSelectedFeature();
			$('#featureList div.selected').removeClass('selected');
			
			var featureIndexToFocus = $(this).index();
			pickingManager.focusFeature( featureIndexToFocus );
			var selectedFeature = pickingManager.getSelectedFeature();
			
			$('#featureList div:eq('+featureIndexToFocus+')').addClass('selected');
			self.showFeatureInformation( selectedFeature.layer, selectedFeature.feature );
		});

		// Show/hide external resource
		$selectedFeatureDiv.on("click", '.propertiesTable a', function(event){
			event.preventDefault();
			IFrame.show(event.target.innerHTML);
		});

	},

	/**
	 *	Hide popup
	 *
	 *	@param callback Callback 
	 */
	hide: function(callback){
		$('.featureProperties').getNiceScroll().remove();
		// if ( $selectedFeatureDiv.css('display') != 'none') { 
			$selectedFeatureDiv.fadeOut(300, callback );
		// }
	},

	/**
	 *	Show popup
	 *
	 *	@param x X in window coordinate system
	 *	@param y Y in window coordinate system
	 *	@param callback Callback
	 */
	show: function(x, y, callback){
		computeDivPosition(x,y);
		$selectedFeatureDiv.fadeIn(500, function() {
			$('.featureProperties').getNiceScroll().resize();
			if (callback) callback();
		});
	},

	/**
	 * 	Insert HTML code of selected features
	 * 
	 * 	@param {<GlobWeb.Feature>[]} seleciton Array of features
	 */
	createFeatureList: function(selection){
		var arrowVisibility = false;
		// maxSelectedFeatures = 10
		if ( selection.length > 10 )
			arrowVisibility = true;
		featureListHTML = featureListTemplate( { selection: selection, arrowVisibility: arrowVisibility });
		$('#leftDiv').html( featureListHTML );
	},

	/**
	 * 	Insert HTML code of help to iterate on each feature
	 */
	createHelp: function(){
		$('#rightDiv').html( pileStashHelp );
	},

	/**
	 * 	Show feature information
	 */
	showFeatureInformation: function(layer, feature){
		$('.featureProperties').getNiceScroll().remove();
		$('#rightDiv').fadeOut(300, function(){
			createHTMLSelectedFeatureDiv( layer, feature );
			$(this).fadeIn(300, function(){
				$('.featureProperties').getNiceScroll().resize();
			});
		});
	}

};

});