/**
 * Moc service
 */
define( [ "jquery.ui", "MocLayer", "ErrorDialog", "Utils", "underscore-min", "text!../templates/mocService.html" ], function($, MocLayer, ErrorDialog, Utils, _, mocServiceHTMLTemplate) {

// Template generating the services html
var mocServiceTemplate = _.template(mocServiceHTMLTemplate);
var form = '';

var layers = [];

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
				layer.coverage = "unknown";
				$("#mocLayer_"+layer.id).find('.mocCoverage').html("Sky coverage: "+layer.coverage+"%");
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
		url: mocServiceUrl+"?media=txt",
		success: function(response){
			var coverage = Utils.roundNumber(parseFloat(response),5);
			$("#mocLayer_"+layer.id).find('.mocCoverage').html("Sky coverage: "+coverage+"%").end()
						.find('.display').removeAttr("disabled").button("refresh");
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
	for ( var j=0; j<layer.subLayers.length; j++ )
	{
		if ( layer.subLayers[j] instanceof MocLayer )
		{
			return layer.subLayers[j];
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
	serviceLayer = new MocLayer({ serviceUrl: mocServiceUrl, style: layer.style, visible: false });
	layer.subLayers.push(serviceLayer);
	requestSkyCoverage( layer, mocServiceUrl );
	if ( layer.globe && layer.visible() )
	{
		// Add sublayer to engine
		layer.globe.addLayer( serviceLayer );
	}
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
		tabs.find( ".ui-tabs-nav" ).append('<li><a href="#MocService">Moc</a></li>');
		tabs.append('<div id="MocService"></div>');

		for ( var i=0; i<layers.length; i++ )
		{
			var layer = layers[i];
			form = mocServiceTemplate( { layer: layer });
			var serviceLayer = findMocSublayer(layer);

			$(form)
				.appendTo('#MocService')
				.data("layer", layer)
				.find(".display").attr("checked", (serviceLayer && serviceLayer.visible()) ? true : false)
									.attr("disabled", (serviceLayer) ? false : true);
		}

		$('#MocService')
			.find('.display')
				.button()
				.click( function() {
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
				});
		tabs.tabs("refresh");
	},

	removeService: function(tabs)
	{
		var index = tabs.find( '.ui-tabs-nav li[aria-controls="MocService"]').index();
		tabs.tabs("remove",index);
	}
}

});
