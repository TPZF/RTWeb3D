
/**
 * PickingManager module
 */
define( [ "jquery.ui", "underscore-min", "text!../templates/featureList.html", "text!../templates/featureDescription.html", "text!../templates/descriptionTable.html"/*, "jquery.mousewheel.min", "jquery.mCustomScrollbar.min"*/ ], function($, _, featureListHTMLTemplate, featureDescriptionHTMLTemplate, descriptionTableHTMLTemplate) {

var globe;
var navigation;

var selection = [];
var stackSelectionIndex = -1;
var selectedStyle = new GlobWeb.FeatureStyle( { strokeColor: [1., 1., 0., 1.] } );
var quicklookStyle = new GlobWeb.FeatureStyle( { fill: true, strokeColor: [1., 1., 0., 1.] } );
var pickableLayers = [];
var featureListHTML = '';

// Create selected feature div
var selectedFeatureDiv = '<div id="selectedFeatureDiv" class="contentBox ui-widget-content" style="display: none">\
				<div id="leftDiv"></div>\
				<div id="rightDiv"></div>\
				<div class="closeBtn">\
					<img src="css/images/close_button.png" alt="" class="defaultImg" />\
					<img src="css/images/close_buttonHover.png" alt="" class="hoverImg" />\
				</div>\
				<div class="arrow-left"></div>\
			</div>';
$(selectedFeatureDiv).appendTo('body');

// Template generating the list of selected features
var featureListTemplate = _.template(featureListHTMLTemplate);

// Template generating the detailed description of choosen feature
var featureDescriptionTemplate = _.template(featureDescriptionHTMLTemplate);

// Template generating the table of properties of choosen feature
var descriptionTableTemplate = _.template(descriptionTableHTMLTemplate);

// PileStash help HTML
var pileStashHelp = '<div id="pileStashHelp"> Some observations are overlapped. <br/> Click on the observation to see detailed informations about each observation. <br/> </div>';

// TODO Refactor...
var iframe = 
	'<div id="externalIFrame" class="contentBox">\
		<div class="closeBtn">\
			<img src="css/images/close_button.png" alt="" class="defaultImg" />\
			<img src="css/images/close_buttonHover.png" alt="" class="hoverImg" />\
		</div>\
		<iframe src=""><p>Your browser does not support iframes.</p></iframe>\
	</div>';
$(iframe).appendTo('body');

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
 * 	Revert style of selection
 */
function blurSelection()
{
	for ( var i=0; i < selection.length; i++ ) {
		var selectedFeature = selection[i];
		if ( selectedFeature.feature.geometry.type == "Polygon" )
		{
			var style = selection[i].feature.properties.style;
			style.strokeColor = selection[i].layer.style.strokeColor;
			selection[i].layer.modifyFeatureStyle( selection[i].feature, style );
		}
	}
}

/**
 * 	Apply selectedStyle to selection
 */
function focusSelection( newSelection )
{
	var style;
	for ( var i=0; i < newSelection.length; i++ ) {
		var selectedFeature = newSelection[i];
		if ( selectedFeature.feature.geometry.type == "Polygon" )
		{
			if ( newSelection[i].feature.properties.style )
			{
				style = newSelection[i].feature.properties.style;	
			}
			else
			{
				style = new GlobWeb.FeatureStyle( newSelection[i].layer.style );
			}
			style.strokeColor = selectedStyle.strokeColor;
			newSelection[i].layer.modifyFeatureStyle( newSelection[i].feature, style );
		}
	}
}

/**
 * 	Revert style of selected feature
 */
function blurSelectedFeature()
{
	var selectedFeature = selection[stackSelectionIndex];
	if ( selectedFeature )
	{
		if ( selectedFeature.feature.geometry.type == "Polygon" )
		{
			var style = selectedFeature.feature.properties.style;
			style.strokeColor = selectedFeature.layer.style.strokeColor; 
			selectedFeature.layer.modifyFeatureStyle( selectedFeature.feature, style );
		}
		$('#featureList div:eq('+stackSelectionIndex+')').removeClass('selected');
	}
}

/**
 * 	Apply selected style to feature
 * 
 * 	@param index Index of feature in selection array
 */
function focusFeature( index )
{
	var selectedFeature = selection[index];
	if ( selectedFeature )
	{
		stackSelectionIndex = index;
		if ( selectedFeature.feature.geometry.type == "Polygon" )
		{
			var style = selectedFeature.feature.properties.style;
			style.strokeColor = selectedStyle.strokeColor;
			selectedFeature.layer.modifyFeatureStyle( selectedFeature.feature, style );
		}

		$('#featureList div:eq('+stackSelectionIndex+')').addClass('selected');	
	}	
}

/**
 * 	Init event
 */
function init()
{
	// Picking event
	$('canvas').on("mousedown",function(event){
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
					switch ( pickableLayer.features[j]['geometry'].type )
					{
						case "Polygon":
							if ( pointInRing( pickPoint, pickableLayer.features[j]['geometry']['coordinates'][0] ) )
							{
								newSelection.push( { feature: pickableLayer.features[j], layer: pickableLayer } );
							}
							break;
						case "Point":
							if ( pointInSphere( pickPoint, pickableLayer.features[j]['geometry']['coordinates'] ) )
							{
								newSelection.push( { feature: pickableLayer.features[j], layer: pickableLayer } );
							}
							break;
						default:
							break;
					}
				}
			}
		}
		
		if ( isSelectionEqual(newSelection) && newSelection.length != 0 ){
			
			var selectedFeature = selection[stackSelectionIndex];
			// Reset previous selected feature
			if ( stackSelectionIndex == -1 ) {
				// Blur all selected features
				blurSelection();
				
			} else {
				// Blur only previous feature
				blurSelectedFeature();
			}
			
			stackSelectionIndex++;
			selectedFeature = selection[stackSelectionIndex];
			
			// Select individual feature
			if ( stackSelectionIndex == selection.length ) {
				selection = [];
				$('#selectedFeatureDiv').fadeOut(300);
				stackSelectionIndex = -1;
			} else {
				// Focus current feature
				focusFeature( stackSelectionIndex );
				
				$('#rightDiv').fadeOut(300, function(){
					createHTMLSelectedFeatureDiv( selectedFeature.feature );
					$(this).fadeIn(300, function(){
// 						$("#detailedInfo").mCustomScrollbar("update");
					});
				});
			}
		}
		else
		{
			// Remove selected style for previous selection
			blurSelection();

			// Add selected style for new selection
			focusSelection( newSelection );
			selection = newSelection;
			
			if ( newSelection.length > 0 )
			{
				$('#selectedFeatureDiv').fadeOut(300, function(){
					// View on center
					// TODO make appear selectedFeatureDiv AFTER once moveTo finished
					// 	+ timeOut (used currently)
					//	or
					//	+ new event to subscribe
					navigation.moveTo( pickPoint, 1000 );
					window.setTimeout( function(){ $('#selectedFeatureDiv').fadeIn(500); }, 1000 );
					
					// Create dialogue for the first selection call
					if ( newSelection.length > 1 )
					{
						createHTMLSelectedFeatureList( newSelection );
						createHTMLSelectionHelp();
						computeDivPosition( globe.renderContext.canvas.width/2, globe.renderContext.canvas.height/2);
						stackSelectionIndex = -1;
					}
					else
					{
						// only one layer, no pile needed, create feature dialogue
						createHTMLSelectedFeatureList( newSelection );
						focusFeature( 0 );
						createHTMLSelectedFeatureDiv( newSelection[stackSelectionIndex].feature );
						computeDivPosition( globe.renderContext.canvas.width/2, globe.renderContext.canvas.height/2);
// 						$("#detailedInfo").mCustomScrollbar("update");
					}
				});
			} else {
				$('#selectedFeatureDiv').fadeOut(300);
			}
		}
	});
	
	// Close button event
	$('body').on("click",'.closeBtn', function(event){
		if( $(this).parent().attr("id") == 'externalIFrame' )
		{
			$("#externalIFrame").animate({top: -1000}, 800);
		}
		else
		{
			$(this).parent().fadeOut(300);
			clearSelection();	
		}
	});
	
	// Show/hide quicklook
	$('#selectedFeatureDiv').on("click", '#quicklook', function(event){
		
		var featureIndexToQuicklook = $('#featureList .selected').index();
		var selectedFeature = selection[featureIndexToQuicklook];
		
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
			// $('#loading').show(300);
			var style = selectedFeature.feature.properties.style;
			style.fill = true;
			style.fillTextureUrl = selectedFeature.feature.properties.quicklook;
			selectedFeature.layer.modifyFeatureStyle( selectedFeature.feature, style );
		}
	});
	
	// BUG ! Disables stack onclick action
	globe.subscribe("startNavigation", function(){ if ($('#selectedFeatureDiv').css('display') != 'none'){ $(this).fadeOut(300); clearSelection(); } } );
	// TODO manage texture loading process
	// globe.subscribe("imageLoaded", function(){ $('#loading').hide(300); } );

	// Arrow events
	$('#selectedFeatureDiv').on("mousedown", '#scroll-arrow-down.clickable', function(event){
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
	
	$('#selectedFeatureDiv').on("mousedown", '#scroll-arrow-up.clickable', function(event){

		$('#selectedFeatureDiv #scroll-arrow-down').css("border-top-color", "orange").addClass("clickable");
		
		var topValue = parseInt($('#featureList').css("top"), 10) + 60;
		if (topValue >= 0)
		{
			topValue = 0;
			$(this).css("border-bottom-color", "gray").removeClass("clickable");
		}
		$('#featureList').stop().animate({top: topValue +"px"}, 300);
	}).disableSelection();
	
	// Choose feature by clicking on its title
	$('#selectedFeatureDiv').on("click", '.featureTitle', function(){
		blurSelection();
		blurSelectedFeature();
		
		var featureIndexToFocus = $(this).index();
		focusFeature( featureIndexToFocus );
		var selectedFeature = selection[stackSelectionIndex];
		
		$('#rightDiv').fadeOut(300, function(){
			createHTMLSelectedFeatureDiv( selectedFeature.feature );
			$(this).fadeIn(300);
		});
	});

	// Show/hide external resource
	$('#selectedFeatureDiv').on("click", '.propertiesTable a', function(event){
		event.preventDefault();

		$("#externalIFrame iframe").attr('src', event.target.innerHTML);
		$("#externalIFrame").animate({top: 100}, 800);
	});

	// Show/hide subsection properties
	$('#selectedFeatureDiv').on("click", '.section', function(event){
		// TODO slideToggle works with div -> add div to the tab generation
		$(this).siblings('table').fadeToggle("slow", "linear");/*slideToggle(300)*/;
		if ( $(this).siblings('#arrow').is('.arrow-right') )
		{
			$(this).siblings('#arrow').removeClass('arrow-right').addClass('arrow-bottom');
		}
		else
		{
			$(this).siblings('#arrow').removeClass('arrow-bottom').addClass('arrow-right');
		}
	});
}

/**
 *	Clear selection
 */
function clearSelection()
{
	blurSelection();
	selection = [];
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
* 	@param {Float[]} point Point in geographic coordinates
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
 *	Determine if a point lies inside a sphere of radius depending on viewport
 */
function pointInSphere( point, sphere )
{
	var point3D = [];
	var sphere3D = [];
	var pointTextureHeight = 32; // make parameter ?

	// Compute pixel size vector to offset the points from the earth
	var pixelSizeVector = globe.renderContext.computePixelSizeVector();

	GlobWeb.CoordinateSystem.fromGeoTo3D( point, point3D );
	GlobWeb.CoordinateSystem.fromGeoTo3D( sphere, sphere3D );

	var radius = pointTextureHeight * (pixelSizeVector[0] * sphere3D[0] + pixelSizeVector[1] * sphere3D[1] + pixelSizeVector[2] * sphere3D[2] + pixelSizeVector[3]);

	//Calculate the squared distance from the point to the center of the sphere
	var vecDist = [];
	vec3.subtract(point3D, sphere3D, vecDist);
	vecDist = vec3.dot(vecDist, vecDist);

	//Calculate if the squared distance between the sphere's center and the point
	//is less than the squared radius of the sphere
	if( vecDist < radius * radius )
	{
	    return true;
	}

	//If not, return false
	return false;
}

/**
 * 	Insert HTML code of selected features
 * 
 * 	@param {<GlobWeb.Feature>[]} seleciton Array of features
 */
function createHTMLSelectedFeatureList( selection )
{	
	var arrowVisibility = false;
	if ( selection.length > 10 )
		arrowVisibility = true;
	featureListHTML = featureListTemplate( { selection: selection, arrowVisibility: arrowVisibility });
	$('#leftDiv').html( featureListHTML );
}

/**
 * 	Insert HTML code of choosen feature
 */
function createHTMLSelectedFeatureDiv( feature )
{	
	var output = featureDescriptionTemplate( { feature: feature, descriptionTableTemplate: descriptionTableTemplate } );
	
	$('#rightDiv').html( output );
	
	// stylized scroll ......
// 	$('#detailedInfo').mCustomScrollbar({
// 		scrollButtons:{
// 			enable:true
// 		},
// 		height: $('#rightDiv').height()
// 	});
	
// 	window.setInterval( function(){ $('#detailedInfo').mCustomScrollbar("update"); }, 1000 );
}

/**
 * 	Insert HTML code of help to iterate on each feature
 */
function createHTMLSelectionHelp( selection )
{
	$('#rightDiv').html( pileStashHelp );
}

return {
	init: function( gl, nav ) 
	{
		// Store the globe in the global module variable
		globe = gl;

		navigation = nav;
		
		// Call init
		init();
	},
	
	addPickableLayer: function( layer )
	{
		pickableLayers.push( layer );
	},
	
	removePickableLayer: function( layer )
	{
		for ( var i=0; i<pickableLayers.length; i++ )
		{
			if( layer.id == pickableLayers[i].id )
				pickableLayers.splice( i, 1 );
		}
	}
};

});