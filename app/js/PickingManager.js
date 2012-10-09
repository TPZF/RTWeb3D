
/**
 * PickingManager module
 */
define( [ "jquery.ui", "underscore-min", "text!../templates/featureList.html", "text!../templates/featureDescription.html" ], function($, _, featureListHTMLTemplate, featureDescriptionHTMLTemplate) {

var globe;
var selection = [];
var stackSelectionIndex = -1;
var selectedStyle = new GlobWeb.FeatureStyle( { strokeColor: [1., 1., 0., 1.] } );
var pickableLayers = [];
var featureListHTML = '';

// Create selected feature div
var selectedFeatureDiv = '<div id="selectedFeatureDiv" class="ui-widget-content" style="display: none"></div>';
$(selectedFeatureDiv).appendTo('body');

// Template generating the list of selected features
var featureListTemplate = _.template(featureListHTMLTemplate);

// Template generating the detailed description of choosen feature
var featureDescriptionTemplate = _.template(featureDescriptionHTMLTemplate);

// PileStash help HTML
var pileStashHelp = 	'<div id="pileStashHelp"> Some objects are overlapped <br/> Click on the object stack to see detailed\
			information about each object.</div>\
			<div class="closeBtn"></div>\
			<div id="arrow">';

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
// 	var arrowx = clientX;
// 	var arrowy = clientY;
	
	// Default : div appers on the right side of pick point
	$('#selectedFeatureDiv').find('#arrow').addClass('arrow-left');
	
	// TODO Adaptative positionning... not implemented yet
// 	tip = $('#selectedFeatureDiv');
// 	
// 	var tipWidth = tip.width(); //Find width of tooltip
// 	var tipHeight = tip.height(); //Find height of tooltip
// 
// 	//Distance of element from the right edge of viewport
// 	var tipVisX = $(window).width() - (mousex + tipWidth);
// 	//Distance of element from the bottom of viewport
// 	var tipVisY = $(window).height() - (mousey + tipHeight);
// 
// 	
// 	if ( tipVisX < 20 )
// 	{ //If tooltip exceeds the X coordinate of viewport  
// 		if( tipWidth > clientX - 20 )
// 		{
// 			mousex = 0;
// 		}
// 		else
// 		{
// 			
// // 			mousex = clientX - tipWidth - 20;
// 		}
// 	
// 	} else {
// 		arrowy = 90;

// 		
// 		$('#arrow').css(
// 			{
// 				position: 'absolute',
// 				left: '-11px',
// 				top: arrowy + 'px',
// 			}
// 		);
// 		
// 	}
// 	
// 	if ( tipVisY < 20 )
// 	{ //If tooltip exceeds the Y coordinate of viewport
// 		// TODO
// 		mousex = clientX - tipWidth/2 - 15;
// 		mousey = clientY - 5*tipHeight/4 - 50;
// 		arrowx = tipWidth/2;
// // 		mousey = clientY - tipHeight - 20;
// // 		mousex = clientX - tipWidth - 50;
// 		$('#selectedFeatureDiv').find('#arrow').removeClass('arrow-left');
// 		$('#selectedFeatureDiv').find('#arrow').addClass('arrow-down');
// 		
// 		$('#arrow').css(
// 			{
// 				position: 'absolute',
// 				left: arrowx + 'px',
// 				top: '',
// 				bottom: '-10px',
// 			}
// 		);
// 		
// 	}
// 	else
// 	{	
// 		
// 	}
	//Absolute position the tooltip according to mouse position
//         tip.css({  top: mousey, left: mousex });
// 	

	mousex+= 50;
	mousey-= 100;
	
	// Positionning
	$('#selectedFeatureDiv').css(
		{
			position: 'absolute',
			left: mousex + 'px',
			top: mousey + 'px'
// 			height: tipHeight + 'px'
		}
	);
	
	
	
}

/**
 * 	Init event
 */
function init()
{
	// Picking event
	$('canvas').click(function(event){
		
		var pickPoint = globe.getLonLatFromPixel(event.clientX, event.clientY);
		var newSelection = [];
		var clientX = event.clientX;
		var clientY = event.clientY;
		
		for ( var i=0; i<pickableLayers.length; i++)
		{
			var pickableLayer = pickableLayers[i];
			
			if ( pickableLayer.visible() )
			{
				// Search for picked features
				for ( var j=0; j<pickableLayer.features.length; j++ )
				{
					if ( pointInRing( pickPoint, pickableLayer.features[j]['geometry']['coordinates'][0] ) )
					{
						newSelection.push( { feature: pickableLayer.features[j], baseStyle: pickableLayer.style } );
					}
				}
			}
		}
		
		if ( isSelectionEqual(newSelection) && newSelection.length != 0 ){
			
			// Reset previous selected feature
			if ( stackSelectionIndex == -1 ) {
				// Blur all the features
				for ( var i=0; i < selection.length; i++ ) {
					pickableLayer.modifyFeatureStyle( selection[i].feature,  selection[i].style );
				}
				
			} else {
				// Blur only previous feature
				pickableLayer.modifyFeatureStyle( selection[stackSelectionIndex].feature, selection[stackSelectionIndex].style );
				$('#featureList div:eq('+stackSelectionIndex+')').removeClass('selectedFeature');
			}
			
			stackSelectionIndex++;
			
			// Select individual feature
			if ( stackSelectionIndex == selection.length ) {
				// Blur only last feature
				pickableLayer.modifyFeatureStyle( selection[stackSelectionIndex-1].feature, selection[stackSelectionIndex-1].style );
				selection = [];
				stackSelectionIndex = -1;
				$('#selectedFeatureDiv').fadeOut(500);
			} else {
				// Focus current feature
				pickableLayer.modifyFeatureStyle( selection[stackSelectionIndex].feature, selectedStyle );
				
				$('#selectedFeatureDiv').fadeOut(300, function(){
					createHTMLSelectedFeatureDiv( selection[stackSelectionIndex].feature );
					computeDivPosition(clientX, clientY);
					$('#featureList div:eq('+stackSelectionIndex+')').addClass('selectedFeature');
					$(this).fadeIn(300);
				});
			}
		}
		else
		{
			// Remove selected style for previous selection
			for ( var i=0; i < selection.length; i++ ) {
				pickableLayer.modifyFeatureStyle( selection[i].feature, selection[i].style );
			}
			
			// Add selected style for new selection
			for ( var i=0; i < newSelection.length; i++ ) {
				pickableLayer.modifyFeatureStyle( newSelection[i].feature, selectedStyle );
			}
			
			if ( newSelection.length > 0 )
			{
				// Create dialogue for the first selection call
				if ( newSelection.length > 1 )
				{
					createHTMLSelectionDiv( newSelection );
					computeDivPosition(clientX, clientY);
					$('#selectedFeatureDiv').fadeIn(500);
					stackSelectionIndex = -1;
				}
				else
				{
					// only one layer, no pile needed, create feature dialogue
					stackSelectionIndex = 0;
					createHTMLSelectedFeatureList( newSelection );
					createHTMLSelectedFeatureDiv( newSelection[stackSelectionIndex].feature );
					computeDivPosition(clientX, clientY);
					$('#featureList div:eq('+stackSelectionIndex+')').addClass('selectedFeature');
					$('#selectedFeatureDiv').fadeIn(500);
				}
			} else {
				$('#selectedFeatureDiv').fadeOut(500);
			}
				
			selection = newSelection;
		}
	});
	
	// Close button event
	$('#selectedFeatureDiv').on("click",'.closeBtn', function(event){
		$(this).parent().fadeOut(300);
	});
	
	// Quicklook event
	$('#selectedFeatureDiv').on("click", '#quicklook', function(event){
		var fullImgURL = event.srcElement.alt;
		window.open(fullImgURL);
	});
	
}

/**
 * 	Test if a new selection is equal to the previous selection
 */
function isSelectionEqual( newSelection )
{
	if ( selection.length == newSelection.length) {
		for ( var i=0; i < selection.length; i++ ) {
			if ( selection[i].feature != newSelection[i].feature )
				return false;
		}
		return true;
	}
	else
	{
		return false;
	}
}


/**
*	Determine if a point lies inside a polygon
* 
* 	@param {Float[]} point Point in 3D
* 	@param {Float[][]} ring Array of points representing the polygon
*/
function pointInRing( point, ring )
{
	var nvert = ring.length;
	if ( ring[0][0] == ring[nvert-1][0] && ring[0][1] == ring[nvert-1][1] )
	{
		nvert--;
	}
	var inPoly = false;
	var j = nvert-1;
	for (var i = 0; i < nvert; j = i++)
	{
		if ( ((ring[i][1] > point[1]) != (ring[j][1] > point[1])) &&
			(point[0] < (ring[j][0] - ring[i][0]) * (point[1] - ring[i][1]) / (ring[j][1] - ring[i][1]) + ring[i][0]) )
		{
			inPoly = !inPoly;
		}
	}
	return inPoly;
}

/**
 * 	Create HTML code of features selection
 * 
 * 	@param {<GlobWeb.Feature>[]} seleciton Array of features
 */
function createHTMLSelectedFeatureList( selection )
{	
	featureListHTML = featureListTemplate( { selection: selection });
}

/**
 * 	Create HTML code of choosen feature
 */
function createHTMLSelectedFeatureDiv( feature )
{	
	// Not used yet..
// 	var index = feature.properties.thumbnail.indexOf("/HIPE_Fits");
// 	var proxyUrl = feature.properties.thumbnail.slice(index);
	
	var output = featureDescriptionTemplate( { feature: feature } );
	$('#selectedFeatureDiv').html( featureListHTML + output);
// 	$('#selectedFeatureDiv').css("height", $('#selectedFeatureDiv').height()); // explicitly update height of div
}

function createHTMLSelectionDiv( selection )
{
	createHTMLSelectedFeatureList( selection );
	$('#selectedFeatureDiv').html( featureListHTML + pileStashHelp);
	
// 	$('#selectedFeatureDiv').css("height", $('#selectedFeatureDiv').height()); // explicitly update height of div
}

return {
	init: function(gl) 
	{
		// Store the globe in the global module variable
		globe = gl;
		
		// Call init
		init();
	},
	
	addPickableLayer: function( layer )
	{
		pickableLayers.push( layer );
	}
};

});