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
 * Samp module : performing communication between applications using SAMP protocol
 */
define(["jquery.ui", "gw/CoordinateSystem", "gw/FeatureStyle", "gw/VectorLayer", "ImageManager", "ImageViewer", "Utils", "samp"],
	function($, CoordinateSystem, FeatureStyle, VectorLayer, ImageManager, ImageViewer, Utils) {

var globe;
var navigation;
var additionalLayersView;

var connector;	// SAMP connector
var sampLayer;	// SAMP vector layer containing all incoming fits images
var pointAtReceived = false; // Parameter avoiding looping while receiving coord.pointAt.sky SAMP event

/**************************************************************************************************************/

/**
 *	Create samp dialog, implement UI events
 */
function initUI()
{	
	// Don't use connector.createRegButtons() because there is no unregistration callback
	// to refresh jquery UI buttons
	var dialogContent = '<div id="sampContent"><button id="registerSamp">Register</button>\
					<button id="unregisterSamp" disabled>Unregister</button>\
					<button id="sendVOTable">Send VO table</button>\
					<span><strong>Registered: </strong><span id="sampResult">No</span></span>\
					<br/>\
					<div style="display: none;" id="sampStatus"></div>\
					</div>';

	var $dialog = $(dialogContent).appendTo('body')
		.dialog({
			title: 'Samp',
			autoOpen: false,
			show: {
				effect: "fade",
				duration: 300
			},
			hide: {
				effect: "fade",
				duration: 300
			},
			open: function()
			{
				// Remove auto-focus
				$(this).find('button:first-child').blur();
			},
			resizable: false,
			width: 'auto',
			minHeight: 'auto',
			close: function(event, ui)
			{
				$(this).dialog("close");
			}
		});

	$dialog.find('#registerSamp').button()
		.click(function(){
			connector.register();
		}).end()
	.find("#unregisterSamp").button()
		.click(function(){
			connector.unregister();
			
			// Update jQuery UI buttons
			$('#registerSamp').removeAttr('disabled').button("refresh");
			$(this).attr('disabled','disabled').button("refresh");
			$('#sampInvoker').css('background-image', 'url(css/images/samp_off.png)');
		}).end()
	.find('#sendVOTable').button()
		.click(function(){
			// DEBUG:
			var tableUrl = "http://demonstrator.telespazio.com/sitools/sia/search?order=3&healpix=293&coordSystem=EQUATORIAL&media=votable";
			var msg = new samp.Message("table.load.votable", {"url": tableUrl});
			connector.connection.notifyAll([msg]);
		});

	$('#sampInvoker').on('click', function(){
		$dialog.dialog("open");
	}).hover(function(){
		$(this).animate({left: '-10px'}, 100);
	}, function() {
		$(this).animate({left: '-20px'}, 100);
	});
}

/**************************************************************************************************************/

/**
 *	Create SAMP ClientTracker object which handles incoming messages
 */
function createClientTracker()
{
	// Initialize client tracker
	var clientTracker = new samp.ClientTracker();

	// Init available samp income message handlers(as ping, load.votable..)
	var callHandler = clientTracker.callHandler;
	callHandler["samp.app.ping"] = function(senderId, message, isCall)
	{
		if ( isCall )
		{
			return { text: "ping to you, " + clientTracker.getName(senderId) };
		}
	}

	callHandler["table.load.votable"] = function(senderId, message, isCall) {
		var params = message["samp.params"];
		var origUrl = params["url"];
		var proxyUrl = clientTracker.connection.translateUrl(origUrl);
		var xhr = samp.XmlRpcClient.createXHR();
		var e;
		xhr.open("GET", proxyUrl);
		xhr.onload = function() {
			var xml = xhr.responseXML;
			if (xml) {
				try {
					console.log(xml);
					// TODO: send url of xml to SiTools2 to convert it to GeoJSON
					// cf WCS astrojs plugin
				}
				catch (e) {
					console.log("Error displaying table:\n" +
						e.toString());
				}
			}
			else {
				console.log("No XML response");
			}
		};
		xhr.onerror = function(err) {
			console.log("Error getting table " + origUrl + "\n" +
							"(" + err + ")");
		};
		xhr.send(null);
	};

	callHandler["image.load.fits"] = function(senderId, message, isCall) {
		var params = message["samp.params"];

		// Create feature
		var feature = {
			"geometry": {
				"gid": params['name'],
				"coordinates": [],
				"type": "Polygon"
			},
			"properties": {
				"identifier": params['name']
			},
			"services": {
				"download": {
					"mimetype": "image/fits",
					"url": params['image-id']
				}
			},
			"type": "Feature"
		};

		// Get fits texture from url
		var featureData = {
			layer: sampLayer,
			feature: feature
		};
		var url = "/sitools/proxy?external_url=" + encodeURIComponent(params['image-id']);		
		ImageViewer.addView(featureData, true);
		ImageManager.computeFits(featureData, url, function(featureData, fits){
			// Update feature coordinates according to Fits header
			var coords = Utils.getPolygonCoordinatesFromFits(fits);
			featureData.feature.geometry.coordinates = [coords];
			sampLayer.addFeature(featureData.feature);
		});
		// Show image viewer
		ImageViewer.show();
	};

	callHandler["coord.pointAt.sky"] = function(senderId, message, isCall) {
		pointAtReceived = true;
		var params = message["samp.params"];
		var ra = parseFloat(params["ra"]);
		var dec = parseFloat(params["dec"]);
		// var proxyUrl = clientTracker.connection.translateUrl(origUrl);
		var geoPick = [ra, dec];
		if ( CoordinateSystem.type != "EQ" )
		{
			geoPick = CoordinateSystem.convertToDefault(geoPick, "EQ");
		}
		var center3d = [];
		CoordinateSystem.fromGeoTo3D( geoPick, center3d );
		navigation.center3d = center3d;
		navigation.computeViewMatrix();
		globe.renderContext.requestFrame();
	};

	callHandler["samp.hub.event.unregister"] = function(senderId, message, isCall) {
		// Update jQuery UI buttons
		$('#registerSamp').removeAttr('disabled').button("refresh");
		$("#unregisterSamp").attr('disabled','disabled').button("refresh");
		$('#sampInvoker').css('background-image', 'url(css/images/samp_off.png)');
	}

	return clientTracker;
}

/**************************************************************************************************************/

/**
 *	Init SAMP connector 
 */
function initSamp()
{
	var clientTracker = createClientTracker();

	// Samp event callbacks
	var logCc = {
		receiveNotification: function(senderId, message) {
			var handled = clientTracker.receiveNotification(senderId, message);
			if ( message["samp.mtype"] == "samp.hub.event.subscriptions" )
		    {
		    	// Update jQuery UI buttons
				$('#unregisterSamp').removeAttr('disabled').button("refresh");
				$('#registerSamp').attr('disabled','disabled').button("refresh");
				$('#sampInvoker').css('background-image', 'url(css/images/samp_on.png)');
		    }
		},
		receiveCall: function(senderId, msgId, message) {
			var handled = clientTracker.receiveCall(senderId, msgId, message);
		},
		receiveResponse: function(responderId, msgTag, response) {
			var handled = clientTracker.receiveResponse(responderId, msgTag, response);
		},
		init: function(connection) {
			clientTracker.init(connection);
		}
	};

	// Meta-data
	var meta = {
		"samp.name": "Mizar",
		"samp.description.text": "Module for Interactive visualiZation from Astronomical Repositories",
		"mizar.version": "v0.1",
		"author.affiliation": "CNES/TPZ",
		"home.page": "http://github.com/TPZF/RTWeb3D"
	};

	// Generate subscriptions map
	var subs = clientTracker.calculateSubscriptions();

	connector = new samp.Connector("Mizar", meta, logCc, subs);

	// Uncomment for automatic registration(check every 2 sec if Hub is available)
	  // Adjusts page content depending on whether the hub exists or not.
	  // var configureSampEnabled = function(isHubRunning) {
	  //     // TODO
	  // };
	// connector.onHubAvailability(configureSampEnabled, 2000);

	// Registration status element is updated by samp.js
	connector.regTextNodes.push($('#sampResult')[0]);
}

/**************************************************************************************************************/

/**
 *	Init SAMP module
 */
function init(gl, nav, alv)
{
	globe = gl;
	navigation = nav;
	additionalLayersView = alv;

	initUI();
	initSamp();
	
	// Send pointAt messages when navigation modified
	navigation.subscribe("modified", function(){

		if ( connector.connection )
		{
			if ( !pointAtReceived )
			{
				// Mizar is connected to Hub
				geoPick = CoordinateSystem.from3DToGeo( navigation.center3d );
				// geoPick = globe.getLonLatFromPixel(event.clientX, event.clientY);
				if ( CoordinateSystem.type != "EQ" )
				{
					geoPick = CoordinateSystem.convertFromDefault(geoPick, "EQ");
				}

				var message = new samp.Message("coord.pointAt.sky",
												{"ra": geoPick[0].toString(), "dec": geoPick[1].toString()});
				connector.connection.notifyAll([message]);
			}
			else
			{
				pointAtReceived = false;
			}
		}
	});

	// Generate random color
	var rgb = Utils.generateColor();
	var rgba = rgb.concat([1]);

	// Create style
	var options = {
		name: "SAMP",
		style: new FeatureStyle({
			fillColor: rgba,
			strokeColor: rgba,
			visible: false
		})
	};
	// Create vector layer
	var sampLayer = new VectorLayer( options );

	// Add view in layer manager
	sampLayer.type = "GeoJSON";
	sampLayer.dataType = "line";
	sampLayer.deletable = true;
	sampLayer.pickable = true;
	globe.addLayer(sampLayer);
	additionalLayersView.addView( sampLayer );

	// Unregister samp connector onunload or refresh
	// $(window).unload(function(e){
	// 	e.preventDefault();
	// 	connector.unregister();
	// 	// Wait one second before reloading
	// 	setTimeout(function(){
	// 		window.location.reload();
	// 	}, 1000);
	// });
	window.onbeforeunload = function() {
		// Doesn't work onrefresh actually
		connector.unregister();
	}
	
}

/**************************************************************************************************************/

return {
	init: init,
	sendImage: function(url)
	{
		if (this.isConnected())
		{
			// Send message
			var msg = new samp.Message("image.load.fits", {url: url});
			connector.connection.notifyAll([msg]);
			return "Image has been sent";
		}
		else
		{
			return "Connect to SAMP Hub first";
		}
	},

	sendVOTable: function(url)
	{
		if (this.isConnected())
		{
			// Send message
			var msg = new samp.Message("table.load.votable", {url: url});
			connector.connection.notifyAll([msg]);
			return "VOTable has been sent";
		}
		else
		{
			return "Connect to SAMP Hub first";
		}
	},

	isConnected: function()
	{
		return connector.connection;
	}
}

});