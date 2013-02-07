/**
 * Moc service
 */
define( [ "jquery.ui", "MocLayer", "ErrorDialog", "Utils", "underscore-min", "text!../templates/mocService.html", "text!../templates/xMatchService.html" ], function($, MocLayer, ErrorDialog, Utils, _, mocServiceHTMLTemplate, xMatchServiceHTMLTemplate) {

// Template generating the services html
var mocServiceTemplate = _.template(mocServiceHTMLTemplate);
var xMatchServiceTemplate = _.template(xMatchServiceHTMLTemplate);

// TODO make option
var coverageServiceUrl = 'http://localhost:8182/sitools/rtwebgl/plugin/coverage?moc=';

var layers = [];
var intersectionLayer;
/**
 *	Create moc sublayer
 *
 *	@param layer Parent layer
 *	@param serviceUrl Url to OpenSearch xml description of layer
 */
function createMocSublayer(layer, serviceUrl)
{
	// Get moc template
	$.ajax({
		type: "GET",
		url: serviceUrl,
		dataType: "xml",
		success: function(xml) {
			var mocdesc = $(xml).find('Url[rel="mocdesc"]');
			var describeUrl = $(mocdesc).attr("template");
			if ( describeUrl )
			{
				var splitIndex = describeUrl.indexOf( "?q=" );
				if ( splitIndex != -1 )
					handleMocLayer( layer, describeUrl.substring( 0, splitIndex ) );
				else
					handleMocLayer( layer, describeUrl );
			}
			else
			{
				// No moc
				layer.coverage = "unknown";
				$("#MocService #mocLayer_"+layer.id).find('.mocCoverage').html("Sky coverage: "+layer.coverage+"%");
				$("#xMatchService #mocLayer_"+layer.id).find('.mocCoverage').html("Sky coverage: "+layer.coverage+"%");
			}
				
		}
	});
}

/**
 *	Requesting moc sky coverage information and stock it as layer parameter
 */
function requestSkyCoverage(layer, mocServiceUrl)
{
	// Request MOC space coverage
	$.ajax({
		type: "GET",
		url: mocServiceUrl,
		success: function(response){
			var coverage = Utils.roundNumber(parseFloat(response),5);
			$("#MocService #mocLayer_"+layer.id).find('.mocCoverage').html("Sky coverage: "+coverage+"%");
			$("#xMatchService #mocLayer_"+layer.id).find('.mocCoverage').html("Sky coverage: "+coverage+"%");			
			layer.coverage = coverage;
		}
	});	
}

/**
 *	Search moc sublayer
 *	@return	Moc layer if found, null otherwise
 */
function findMocSublayer(layer)
{
	if ( layer instanceof MocLayer )
	{
		return layer;
	} else if ( layer.subLayers )
	{
		for ( var j=0; j<layer.subLayers.length; j++ )
		{
			if ( layer.subLayers[j] instanceof MocLayer )
			{
				return layer.subLayers[j];
			}
		}
	}
	return null;
}

/**
 *	Handle moc layer as a sublayer
 *
 *	@param layer Parent layer
 *	@param mocServiceUrl Url to moc service
 */
function handleMocLayer(layer, mocServiceUrl)
{
	var serviceLayer = new MocLayer({ serviceUrl: mocServiceUrl, style: layer.style, visible: false });

	// Enable checkboxes
	$("#MocService #mocLayer_"+layer.id).find('input[type="checkbox"]').removeAttr("disabled").button("refresh");
	$("#xMatchService #mocLayer_"+layer.id).find('input[type="checkbox"]').removeAttr("disabled").button("refresh");

	layer.subLayers.push(serviceLayer);
	requestSkyCoverage( layer, mocServiceUrl+"?media=txt" );
	if ( layer.globe && layer.visible() )
	{
		// Add sublayer to engine
		layer.globe.addLayer( serviceLayer );
	}
}

function displayClick()
{
	var layer = $(this).parent().data("layer");
	var serviceLayer = findMocSublayer(layer);

	// Change visibility
	if ( serviceLayer )
	{
		if ( this.checked )
		{
			serviceLayer.visible(true)
		}
		else
		{
			serviceLayer.visible(false);
		}
	}
}

function addHTMLMocLayer(layer)
{
	var form = mocServiceTemplate( { layer: layer });
	var serviceLayer = findMocSublayer(layer);
	$(form)
		.appendTo('#MocService .mocLayers')
		.data("layer", layer)
		.find(".display").attr("checked", (serviceLayer && serviceLayer.visible()) ? true : false)
							.attr("disabled", (serviceLayer) ? false : true)
							.button()
							.click(displayClick);
}

function addHTMLXMatchLayer(layer)
{
	var form = xMatchServiceTemplate( { layer: layer } );
	var serviceLayer = findMocSublayer(layer);
	$(form)
		.appendTo('#xMatchService .mocLayers')
		.data("layer",layer)
		.find('input[type="checkbox"]')
		.attr("disabled", (serviceLayer) ? false : true)
		.button({
			text:false,
			icons: {
				primary: "ui-icon-empty"
			}
		})
		.click(function(){
			$(this).button("option", {
				icons: {
            		primary: $(this).is(':checked') ? "ui-icon-check" : "ui-icon-empty"
            	}
            });
		});
}

function addHTMLIntersectionLayer()
{
	// Add HTML
	var form = mocServiceTemplate( { layer: intersectionLayer });
	$(form)
		.appendTo('#intersectResult')
		.data("layer", intersectionLayer)
		.find(".display")
			.button()
			.click(displayClick);
	$('#intersectResult').slideDown();
}

function addIntersectionLayer(checkedLayers)
{
	// Construct url & layerNames
	var url = coverageServiceUrl;
	var layerNames = "";
	for ( var i=0; i<checkedLayers.length; i++ )
	{
		var layer = checkedLayers[i];

		var mocLayer = findMocSublayer(layer);
		layerNames += layer.name;
		url += mocLayer.serviceUrl;
		if ( i != checkedLayers.length-1 )
		{
			url += ';'
			layerNames += ' x ';
		}
	}

	// HACK+TODO add globe into the module by init
	var globe = layers[0].globe;

	if ( intersectionLayer )
		globe.removeLayer(intersectionLayer);

	// Create intersection MOC layer
	intersectionLayer = new MocLayer({
			name: "Intersection( "+layerNames+" )",
			serviceUrl: url + "&media=json",
			style: new GlobWeb.FeatureStyle({
				rendererHint: "Basic"
			}),
			visible: false
		});
	globe.addLayer(intersectionLayer);

	requestSkyCoverage( intersectionLayer, url + "&media=txt" );
	addHTMLIntersectionLayer();
}

return {

	/**
	 *	Add layer to the service
	 */
	addLayer: function(layer)
	{
		layers.push(layer);

		if ( !layer.subLayers )
		{
			layer.subLayers = [];
		}

		var serviceLayer = findMocSublayer(layer);

		// Create if doesn't exist
		if ( !serviceLayer )
		{
			createMocSublayer( layer, layer.serviceUrl );
		}
	},

	removeLayer: function(layer)
	{
		for(var i=0; i<layers.length; i++)
		{
			if(layers[i].id == layer.id)
			{
				layers.splice(i,1);
			}
		}
	},

	addService: function(tabs)
	{
		tabs.children( ".ui-tabs-nav" ).append('<li><a href="#MocService">Moc</a></li>\
											<li><a href="#xMatchService">xMatch</a></li>');
		tabs.append('<div id="MocService">\
						<div class="mocLayers"></div>\
					</div>\
					<div id="xMatchService">\
						<div class="mocLayers"></div>\
						<button id="intersectMoc">Intersect</button>\
						<div id="intersectResult"></div>\
					</div>');

		// TODO add/remove HTML in addLayer/removeLayer
		for ( var i=0; i<layers.length; i++ )
		{
			var layer = layers[i];
			addHTMLMocLayer( layer );
			addHTMLXMatchLayer( layer );	
		}

		$( '#intersectMoc' )
			.button()
			.click(function(){
				$('#intersectResult').stop().slideUp(function(){
					var checkedInputs = $(this).parent().find('input:checked');
					if ( checkedInputs.length < 2 )
					{
						$('#intersectResult').html('Check at least two layers')
								.slideDown().delay(700).slideUp();
					}
					else
					{					
						var checkedLayers = [];
						checkedInputs.each(function(i){
							checkedLayers.push( $.data(checkedInputs[i].parentElement, "layer") );
						});

						addIntersectionLayer(checkedLayers);
					}
				});
			});
		tabs.tabs("refresh");
	},

	removeService: function(tabs)
	{
		var index = tabs.find( '.ui-tabs-nav li[aria-controls="MocService"]').index();
		tabs.tabs("remove",index); // Remove MocService
		tabs.tabs("remove",index); // Remove xMatchService

		if ( intersectionLayer )
		{
			intersectionLayer.globe.removeLayer( intersectionLayer );
			intersectionLayer = null;
		}
	}
}

});
