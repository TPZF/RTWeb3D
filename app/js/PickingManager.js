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
 * PickingManager module
 */
define( [ "jquery.ui", "gw/FeatureStyle", "gw/CoordinateSystem", "gw/OpenSearchLayer", "FeaturePopup", "ImageManager" ],
		function($, FeatureStyle, CoordinateSystem, OpenSearchLayer, FeaturePopup, ImageManager) {

var globe;
var navigation;
var self;

var selection = [];
var stackSelectionIndex = -1;
var selectedStyle = new FeatureStyle( { strokeColor: [1., 1., 0., 1.], fillColor: [1., 1., 0., 1.] } );
var pickableLayers = [];
var selectedTile = null;

var mouseXStart;
var mouseYStart;
var timeStart;

/**************************************************************************************************************/

/**
 *	Event handler for mouse down
 */
function _handleMouseDown(event)
{
	timeStart = new Date();
	mouseXStart = event.clientX;
	mouseYStart = event.clientY;
	clearSelection();
}

/**************************************************************************************************************/

/**
 * Event handler for mouse up
 */
function _handleMouseUp(event)
{
	var timeEnd = new Date();
	var epsilon = 5;
	var diff = timeEnd - timeStart;

	// If not pan and not reverse name resolver call
	if ( diff < 500 && Math.abs(mouseXStart - event.clientX) < epsilon && Math.abs(mouseYStart - event.clientY) < epsilon )
	{
		var pickPoint = globe.getLonLatFromPixel(event.clientX, event.clientY);

		// Remove selected style for previous selection
		clearSelection();

		var newSelection = computePickSelection(pickPoint);
		
		if ( newSelection.length > 0 )
		{
			// Hide previous popup if any
			FeaturePopup.hide( function() {
				// View on center
				if ( navigation.inertia )
				{
					navigation.inertia.stop();
				}
				navigation.moveTo( pickPoint, 800, function(){
					selection = newSelection;
					
					// Add selected style for new selection
					focusSelection(selection);
					selection.selectedTile = selectedTile;
					FeaturePopup.createFeatureList( selection );
					if ( selection.length > 1 )
					{
						// Create dialogue for the first selection call
						FeaturePopup.createHelp();
						stackSelectionIndex = -1;
					}
					else
					{
						// only one layer, no pile needed, create feature dialogue
						self.focusFeatureByIndex( 0 );
						$('#featureList div:eq(0)').addClass('selected');
						FeaturePopup.showFeatureInformation( selection[stackSelectionIndex].layer, selection[stackSelectionIndex].feature )
					}
					FeaturePopup.show(globe.renderContext.canvas.width/2, globe.renderContext.canvas.height/2);
					}
				);
			});
		} else {
			FeaturePopup.hide();
		}
	}
}

/**************************************************************************************************************/

/**
 *	Activate picking
 */
function activate()
{
	globe.renderContext.canvas.addEventListener("mousedown", _handleMouseDown);
	globe.renderContext.canvas.addEventListener("mouseup", _handleMouseUp);

	// Hide popup and blur selection when pan/zoom or animation
	navigation.subscribe("modified", function() { 
		blurSelection();
		FeaturePopup.hide();
	});
}

/**************************************************************************************************************/

/**
 *	Deactivate picking
 */
function deactivate()
{
	globe.renderContext.canvas.removeEventListener("mousedown", _handleMouseDown);
	globe.renderContext.canvas.removeEventListener("mouseup", _handleMouseUp);
	
	// Hide popup and blur selection when pan/zoom or animation
	navigation.unsubscribe("modified", function() { 
		blurSelection();
		FeaturePopup.hide();
	});
}

/**************************************************************************************************************/

/**
 * 	Revert style of selection
 */
function blurSelection()
{
	for ( var i=0; i < selection.length; i++ ) {
		var selectedData = selection[i];
		var style = new FeatureStyle( selectedData.feature.properties.style );
		switch ( selectedData.feature.geometry.type )
		{
			case "Polygon":
			case "MultiPolygon":
				style.strokeColor = selectedData.layer.style.strokeColor;
				break;
			case "Point":
				style.fillColor = selectedData.layer.style.fillColor;
				break;
			default:
				break;
		}
		selectedData.layer.modifyFeatureStyle( selectedData.feature, style );
	}
}

/**************************************************************************************************************/

/**
 * 	Apply selectedStyle to selection
 */
function focusSelection(newSelection)
{
	var style;
	for ( var i=0; i < newSelection.length; i++ ) {
		var selectedData = newSelection[i];

		if ( selectedData.feature.properties.style )
		{
			style = new FeatureStyle( selectedData.feature.properties.style );	
		}
		else
		{
			style = new FeatureStyle( selectedData.layer.style );
		}

		switch ( selectedData.feature.geometry.type )
		{
			case "Polygon":
			case "MultiPolygon":
				style.strokeColor = selectedStyle.strokeColor;
				break;
			case "Point":
				style.fillColor = selectedStyle.fillColor;
				break;
			default:
				break;
		}
		selectedData.layer.modifyFeatureStyle( selectedData.feature, style );
	}
}

/**************************************************************************************************************/

/**
 *	Clear selection
 */
function clearSelection()
{
	blurSelection();
	selection = [];
}

/**************************************************************************************************************/

/**
 *	Check if a geometry crosses the date line
 */
function fixDateLine(pickPoint, coords)
{		
	var crossDateLine = false;
	var startLon = coords[0][0];
	for ( var i = 1; i < coords.length && !crossDateLine; i++) {
		var deltaLon = Math.abs( coords[i][0] - startLon );
		if ( deltaLon > 180 ) {
			// DateLine!
			crossDateLine =  true;
		}
	}
	
	if ( crossDateLine )
	{
		var fixCoords = [];
		
		if ( pickPoint[0] < 0. )
		{
			// Ensure coordinates are always negative
			for ( var n = 0; n < coords.length; n++) {
				if ( coords[n][0] > 0 ) {
					fixCoords[n] = [ coords[n][0] - 360, coords[n][1] ];
				} else {
					fixCoords[n] = [ coords[n][0], coords[n][1] ];
				}
			}
		}
		else
		{
			// Ensure coordinates are always positive
			for ( var n = 0; n < coords.length; n++) {
				if ( coords[n][0] < 0 ) {
					fixCoords[n] = [ coords[n][0] + 360, coords[n][1] ];
				} else {
					fixCoords[n] = [ coords[n][0], coords[n][1] ];
				}
			}
		}
		
		return fixCoords;
	}
	else
	{
		return coords;
	}
}

/**************************************************************************************************************/

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

/**************************************************************************************************************/

/**
 *	Determine if a point lies inside a sphere of radius depending on viewport
 */
function pointInSphere( point, sphere, pointTextureHeight )
{
	var point3D = [];
	var sphere3D = [];

	// Compute pixel size vector to offset the points from the earth
	var pixelSizeVector = globe.renderContext.computePixelSizeVector();

	CoordinateSystem.fromGeoTo3D( point, point3D );
	CoordinateSystem.fromGeoTo3D( sphere, sphere3D );

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

/**************************************************************************************************************/

/**
 * 	Compute the selection at the picking point
 */
function computePickSelection( pickPoint )
{
	selectedTile = globe.tileManager.getVisibleTile(pickPoint[0], pickPoint[1]);
	var newSelection = [];
	
	for ( var i=0; i<pickableLayers.length; i++ )
	{
		var pickableLayer = pickableLayers[i];
		if ( pickableLayer.visible() )
		{
			if ( pickableLayer instanceof OpenSearchLayer )
			{
				// Extension using layer
				// Search for features in each tile
				var tile = selectedTile;
				var tileData = tile.extension[pickableLayer.extId];

				if ( !tileData || tileData.state != OpenSearchLayer.TileState.LOADED )
				{
					while ( tile.parent && (!tileData || tileData.state != OpenSearchLayer.TileState.LOADED) )
					{
						tile = tile.parent;
						tileData = tile.extension[pickableLayer.extId];
					}
				}

				if ( tileData )
				{
					for ( var j=0; j<tileData.featureIds.length; j++ )
					{
						var feature = pickableLayer.features[pickableLayer.featuresSet[tileData.featureIds[j]].index];

						switch ( feature['geometry'].type )
						{
							case "Polygon":
								var ring = fixDateLine(pickPoint, feature['geometry']['coordinates'][0]);
								if ( pointInRing( pickPoint, ring ) )
								{
									newSelection.push( { feature: feature, layer: pickableLayer } );
								}
								break;
							case "MultiPolygon":
								for ( var p=0; p<feature['geometry']['coordinates'].length; p++ )
								{
									var ring = fixDateLine(pickPoint, feature['geometry']['coordinates'][p][0]);
									if( pointInRing( pickPoint, ring ) )
									{
										newSelection.push( { feature: feature, layer: pickableLayer } );
									}
								}
								break;
							case "Point":
								var point = feature['geometry']['coordinates'];
								if ( feature.cluster )
								{
									if ( pointInSphere( pickPoint, point, pickableLayer.clusterBucket.textureHeight ) )
									{
										newSelection.push( { feature: feature, layer: pickableLayer } );
									}
								}
								else
								{
									if ( pointInSphere( pickPoint, point, pickableLayer.pointBucket.textureHeight ) )
									{
										newSelection.push( { feature: feature, layer: pickableLayer } );
									}
								}
								break;
							default:
								break;
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
					var feature =  pickableLayer.features[j];
					switch ( feature['geometry'].type )
					{
						case "Polygon":
							var ring = fixDateLine(pickPoint, feature['geometry']['coordinates'][0]);
							if ( pointInRing( pickPoint, ring ) )
							{
								newSelection.push( { feature: feature, layer: pickableLayer } );
							}
							break;
						case "MultiPolygon":
							for ( var p=0; p<feature['geometry']['coordinates'].length; p++ )
							{
								var ring = fixDateLine(pickPoint, feature['geometry']['coordinates'][p][0]);
								if( pointInRing( pickPoint, ring ) )
								{
									newSelection.push( { feature: feature, layer: pickableLayer } );
								}
							}
							break;
						case "Point":
							if ( pointInSphere( pickPoint, feature['geometry']['coordinates'], 10 ) )
							{
								newSelection.push( { feature: feature, layer: pickableLayer } );
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

/**************************************************************************************************************/

return {
	init: function( gl, nav, configuration ) 
	{
		// Store the globe in the global module variable
		globe = gl;
		navigation = nav;
		self = this;

		activate();
	
		FeaturePopup.init(this, gl, configuration);
		// Initialize the fits manager
		ImageManager.init(this, globe, navigation);
	},

	/**************************************************************************************************************/
	
	addPickableLayer: function( layer )
	{
		pickableLayers.push( layer );
	},

	/**************************************************************************************************************/
	
	removePickableLayer: function( layer )
	{
		for ( var i=0; i<pickableLayers.length; i++ )
		{
			if( layer.id == pickableLayers[i].id )
				pickableLayers.splice( i, 1 );
		}
	},

	/**************************************************************************************************************/

	/**
	 * 	Revert style of selected feature
	 */
	blurSelectedFeature: function()
	{
		var selectedData = selection[stackSelectionIndex];
		if ( selectedData )
		{
			var style = new FeatureStyle( selectedData.feature.properties.style );
			switch ( selectedData.feature.geometry.type )
			{
				case "Polygon":
				case "MultiPolygon":
					style.strokeColor = selectedData.layer.style.strokeColor; 
					break;
				case "Point":
					style.fillColor = selectedData.layer.style.fillColor; 
					break;
				default:
					break;
			}
			selectedData.layer.modifyFeatureStyle( selectedData.feature, style );
		}
	},

	/**************************************************************************************************************/

	/**
	 * 	Apply selected style to the feature by the given index in selection array
	 * 
	 * 	@param index Index of feature in selection array
	 */
	focusFeatureByIndex: function(index)
	{
		blurSelection();
		var selectedData = selection[index];
		if ( selectedData )
		{
			stackSelectionIndex = index;
			var style = new FeatureStyle( selectedData.feature.properties.style );
			switch ( selectedData.feature.geometry.type )
			{
				case "Polygon":
				case "MultiPolygon":
					style.strokeColor = selectedStyle.strokeColor;
					break;
				case "Point":
					style.fillColor = selectedStyle.fillColor;
					break;
				default:
					break;
			}
			selectedData.layer.modifyFeatureStyle( selectedData.feature, style );
		}
	},

	/**************************************************************************************************************/

	/**
	 *	Apply selected style to the given feature
	 */
	focusFeature: function(selectedData)
	{
		clearSelection();
		selection = [selectedData];
		this.focusFeatureByIndex(0);
	},

	/**************************************************************************************************************/

	getSelectedData: function()
	{
		return selection[stackSelectionIndex];
	},

	/**************************************************************************************************************/

	getSelection: function()
	{
		return selection;
	},

	computePickSelection: computePickSelection,
	activate: activate,
	deactivate: deactivate
};

});