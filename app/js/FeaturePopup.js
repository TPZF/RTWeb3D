/**
 * FeaturePopup module
 */
define( [ "jquery.ui", "IFrame", "underscore-min", "text!../templates/featureList.html", "text!../templates/featureDescription.html", 
	"text!../templates/descriptionTable.html", "jquery.nicescroll.min" ], function($, IFrame, _, featureListHTMLTemplate, featureDescriptionHTMLTemplate, descriptionTableHTMLTemplate) {

var featureListHTML = '';
var pickingManager = null;

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
	$('.detailedInfo').niceScroll({autohidemode: false});
}

return {

	/**
	 *	Init
	 *
	 *	@param pm <PickingManager>
	 */
	init: function(pm){

		pickingManager = pm;
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
			} 
			else
			{
				$('#quicklook').addClass('selected');
				var style = selectedFeature.feature.properties.style;
				style.fill = true;
				style.fillTextureUrl = selectedFeature.feature.properties.quicklook;
				selectedFeature.layer.modifyFeatureStyle( selectedFeature.feature, style );
			}
		});

		// Arrow events
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
				$('.detailedInfo').getNiceScroll().resize();
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
			
			var featureIndexToFocus = $(this).index();
			pickingManager.focusFeature( featureIndexToFocus );
			var selectedFeature = pickingManager.getSelectedFeature();
			
			self.showFeatureInformation( selectedFeature.layer, selectedFeature.feature );
		});

		// Show/hide external resource
		$selectedFeatureDiv.on("click", '.propertiesTable a', function(event){
			event.preventDefault();
			IFrame.show(event.target.innerHTML);
		});

	},

	/**
	 *	Unselect title in the list of features
	 */
	blurTitle: function(index){
		$('#featureList div:eq('+index+')').removeClass('selected');
	},

	/**
	 *	Select title in the list of features
	 */
	focusTitle: function(index){
		$('#featureList div:eq('+index+')').addClass('selected');	
	},

	/**
	 *	Hide popup
	 *
	 *	@param callback Callback 
	 */
	hide: function(callback){
		$('.detailedInfo').getNiceScroll().remove();
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
			$('.detailedInfo').getNiceScroll().resize();
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
		$('.detailedInfo').getNiceScroll().remove();
		$('#rightDiv').fadeOut(300, function(){
			createHTMLSelectedFeatureDiv( layer, feature );
			$(this).fadeIn(300, function(){
				$('.detailedInfo').getNiceScroll().resize();
			});
		});
	}

};

});