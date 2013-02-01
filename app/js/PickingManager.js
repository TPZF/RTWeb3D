/**
 * PickingManager module
 */
define( [ "jquery.ui", "FeaturePopup" ], function($, FeaturePopup) {

var globe;
var navigation;
var self;

var selection = [];
var stackSelectionIndex = -1;
var selectedStyle = new GlobWeb.FeatureStyle( { strokeColor: [1., 1., 0., 1.], fillColor: [1., 1., 0., 1.] } );
var quicklookStyle = new GlobWeb.FeatureStyle( { fill: true, strokeColor: [1., 1., 0., 1.] } );
var pickableLayers = [];

/**
 * 	Revert style of selection
 */
function blurSelection()
{
	for ( var i=0; i < selection.length; i++ ) {
		var selectedFeature = selection[i];
		var style = selection[i].feature.properties.style;
		switch ( selectedFeature.feature.geometry.type )
		{
			case "Polygon":
				style.strokeColor = selection[i].layer.style.strokeColor;
				break;
			case "Point":
				style.fillColor = selection[i].layer.style.fillColor;
				break;
			default:
				break;
		}
		selection[i].layer.modifyFeatureStyle( selection[i].feature, style );
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

		if ( newSelection[i].feature.properties.style )
		{
			style = newSelection[i].feature.properties.style;	
		}
		else
		{
			style = new GlobWeb.FeatureStyle( newSelection[i].layer.style );
		}

		switch ( selectedFeature.feature.geometry.type )
		{
			case "Polygon":
				style.strokeColor = selectedStyle.strokeColor;
				break;
			case "Point":
				style.fillColor = selectedStyle.fillColor;
				break;
			default:
				break;
		}
		newSelection[i].layer.modifyFeatureStyle( newSelection[i].feature, style );
	}
}

/**
 * 	Init event
 */
function init()
{
	var mouseXStart;
	var mouseYStart;
	var epsilon = 5;

	$('canvas').on("mousedown",function(event){
		mouseXStart = event.clientX;
		mouseYStart = event.clientY;
	});

	// Picking event
	$('canvas').on("mouseup",function(event){

		// If not pan
		if ( Math.abs(mouseXStart - event.clientX) < epsilon && Math.abs(mouseYStart - event.clientY) < epsilon )
		{
			var pickPoint = globe.getLonLatFromPixel(event.clientX, event.clientY);
			var newSelection = computePickSelection(pickPoint);
			
			if ( isSelectionEqual(newSelection) && newSelection.length != 0 ){
				
				var selectedFeature = selection[stackSelectionIndex];
				// Reset previous selected feature
				if ( stackSelectionIndex == -1 ) {
					// Blur all selected features
					blurSelection();
					
				} else {
					// Blur only previous feature
					self.blurSelectedFeature();
				}
				
				stackSelectionIndex++;
				selectedFeature = selection[stackSelectionIndex];
				
				// Select individual feature
				if ( stackSelectionIndex == selection.length ) {
					selection = [];
					FeaturePopup.hide();
					stackSelectionIndex = -1;
				} else {
					// Focus current feature
					self.focusFeature( stackSelectionIndex );
					FeaturePopup.showFeatureInformation( selectedFeature.layer, selectedFeature.feature );
				}
			}
			else
			{
				// Remove selected style for previous selection
				clearSelection();

				// Add selected style for new selection
				focusSelection( newSelection );
				
				if ( newSelection.length > 0 )
				{
					// Hide previous popup if any
					FeaturePopup.hide( function() {
						// View on center
						if ( navigation.inertia )
						{
							navigation.inertia.stop();
						}
						navigation.moveTo( pickPoint, 1000 );
						window.setTimeout( function(){
							selection = newSelection;
							FeaturePopup.createFeatureList( newSelection );
							if ( newSelection.length > 1 )
							{
								// Create dialogue for the first selection call
								FeaturePopup.createHelp();
								stackSelectionIndex = -1;
							}
							else
							{
								// only one layer, no pile needed, create feature dialogue
								self.focusFeature( 0 );
								$('#featureList div:eq(0)').addClass('selected');
								FeaturePopup.showFeatureInformation( newSelection[stackSelectionIndex].layer, newSelection[stackSelectionIndex].feature )
								// createHTMLSelectedFeatureDiv( newSelection[stackSelectionIndex].feature );
							}
							FeaturePopup.show(globe.renderContext.canvas.width/2, globe.renderContext.canvas.height/2);
						}, 1000 );
					});
				} else {
					FeaturePopup.hide();
				}
			}
		}
	});
	
	// Hide popup and clear selection when pan/zoom
	// BUG ! Disables stack onclick action
	globe.subscribe("start_navigation", function() { 
		clearSelection();
		FeaturePopup.hide();
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
function pointInSphere( point, sphere, pointTextureHeight )
{
	var point3D = [];
	var sphere3D = [];

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
 * 	Compute the selection at the picking point
 */
function computePickSelection( pickPoint )
{
	var newSelection = [];
	
	for ( var i=0; i<pickableLayers.length; i++ )
	{
		var pickableLayer = pickableLayers[i];
		if ( pickableLayer.visible() )
		{
			if ( pickableLayer instanceof MixLayer )
			{
				
				var visitedTiles = {};

				// Extension using layer
				// Search for features in each tile
				for ( var j=0; j<globe.tileManager.tilesToRender.length; j++ )
				{
					var tile = globe.tileManager.tilesToRender[j];
					var tileData = tile.extension[pickableLayer.extId];

					if ( !tileData )
					{
						// Search for available data on tile parent
						var completeDataFound = false;
						var prevVisitTile = tile;
						var visitTile = tile.parent;
						while ( visitTile )
						{
							tileData = visitTile.extension[pickableLayer.extId];

							if ( tileData && tileData.complete )
							{
								completeDataFound = tileData.complete;
								var key = visitTile.order + "_" + visitTile.pixelIndex;
								if ( visitedTiles.hasOwnProperty(key) )	
								{
									tileData = null;
								}
								else 
								{
									visitedTiles[key] = true;
								}
								visitTile = null;
								
							}
							else 
							{
								prevVisitTile = visitTile;
								visitTile = visitTile.parent;
							}
						}
					}

					if ( tileData )
					{
						// TODO refactor
						for( w=0; w<tileData.clusters.length; w++ )
						{
							var point = tileData.clusters[w]['geometry']['coordinates'];
							if ( pointInSphere( pickPoint, point, 32 ) )
							{
								newSelection.push( { feature: pickableLayer.featuresSet[tileData.featureIds[w]].feature, layer: pickableLayer } );
							}
						}

						for ( w=0; w<tileData.features.length; w++ )
						{
							var point = tileData.features[w]['geometry']['coordinates'];
							if ( pointInSphere( pickPoint, point, 10 ) )
							{
								newSelection.push( { feature: pickableLayer.featuresSet[tileData.featureIds[w+tileData.clusters.length]].feature, layer: pickableLayer } );
							}
						}
					}
				}	
			}
			else
			{
				// Vector layer
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
							if ( pointInSphere( pickPoint, pickableLayer.features[j]['geometry']['coordinates'], 10 ) )
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
	}
	
	return newSelection;
}

return {
	init: function( gl, nav ) 
	{
		// Store the globe in the global module variable
		globe = gl;
		navigation = nav;
		self = this;

		// Call init
		init();
		FeaturePopup.init(this, gl);
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
	},

	/**
	 * 	Revert style of selected feature
	 */
	blurSelectedFeature: function()
	{
		var selectedFeature = selection[stackSelectionIndex];
		if ( selectedFeature )
		{
			var style = selectedFeature.feature.properties.style;
			switch ( selectedFeature.feature.geometry.type )
			{
				case "Polygon":
					style.strokeColor = selectedFeature.layer.style.strokeColor; 
					break;
				case "Point":
					style.fillColor = selectedFeature.layer.style.fillColor; 
					break;
				default:
					break;
			}
			selectedFeature.layer.modifyFeatureStyle( selectedFeature.feature, style );
		}
	},

	/**
	 * 	Apply selected style to feature
	 * 
	 * 	@param index Index of feature in selection array
	 */
	focusFeature: function(index)
	{
		blurSelection();
		var selectedFeature = selection[index];
		if ( selectedFeature )
		{
			stackSelectionIndex = index;
			var style = selectedFeature.feature.properties.style;
			switch ( selectedFeature.feature.geometry.type )
			{
				case "Polygon":
					style.strokeColor = selectedStyle.strokeColor;
					break;
				case "Point":
					style.fillColor = selectedStyle.fillColor;
					break;
				default:
					break;
			}
			selectedFeature.layer.modifyFeatureStyle( selectedFeature.feature, style );
		}
	},

	getSelectedFeature: function()
	{
		return selection[stackSelectionIndex];
	}
};

});