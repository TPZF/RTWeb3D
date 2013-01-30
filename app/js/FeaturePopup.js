/**
 * FeaturePopup module
 */
define( [ "jquery.ui", "IFrame", "underscore-min", "text!../templates/featureList.html", "text!../templates/featureDescription.html", 
	"text!../templates/descriptionTable.html", "jquery.nicescroll.min", "fits" ], function($, IFrame, _, featureListHTMLTemplate, featureDescriptionHTMLTemplate, descriptionTableHTMLTemplate) {

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

var progressBarDiv = '<div class="progressDiv contentBox" id="progress">\
						<div class="progressId"></div>\
						<div id="progressBar">\
							<div class="progress-label"></div>\
						</div>\
						<button style="margin-left: auto; display: block; margin-top: 10px;" id="cancelXHR">Cancel</button>\
					</div>';


var $selectedFeatureDiv = $(selectedFeatureDiv).appendTo('body');
var $progressBar = $(progressBarDiv).appendTo('body')
									.find('button').button();

// Template generating the list of selected features
var featureListTemplate = _.template(featureListHTMLTemplate);

// Template generating the detailed description of choosen feature
var featureDescriptionTemplate = _.template(featureDescriptionHTMLTemplate);

// Template generating the table of properties of choosen feature
var descriptionTableTemplate = _.template(descriptionTableHTMLTemplate);

// PileStash help HTML
var pileStashHelp = '<div id="pileStashHelp"> Some observations are overlapped. <br/> Click on the observation to see detailed informations about each observation. <br/> </div>';

function hideProgressBar()
{
	$('#progress').animate({right: 50}, function(){
		$(this).animate({right:-260}, 500);
	});
}

/**
 *	Cancel the xhr request
 */
function cancelRequest()
{
	xhr.abort();
	hideProgressBar();
}

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
 *	Update progress bar event
 */
function updateProgressbar(evt)
{
	if (evt.lengthComputable) 
	{
		//evt.loaded the bytes browser receive
		//evt.total the total bytes seted by the header
		//
		var percentComplete = Math.floor( (evt.loaded / evt.total)*100 );
		$('#progressBar').progressbar( "value", percentComplete );
	}
}

/**
 *	Computing data for FITS file
 *
 *	@param selectedFeature Feature
 *	@param style <GlobWeb.FeatureStyle> Modified style of feature
 *	@param url Url of fits file
 */
function computeData(selectedFeature, style, url)
{
	// Enable float texture extension to have higher luminance range
	var ext = globe.renderContext.gl.getExtension("OES_texture_float");
    if (!ext) {
    	// TODO 
        alert("no OES_texture_float");
        return;
    }
    var FITS = astro.FITS;
	xhr = new XMLHttpRequest();

    xhr.open('GET', url);
    
    // Set the response type to arraybuffer
    xhr.responseType = 'arraybuffer';
    xhr.onprogress=updateProgressbar;

    // Define the onload function
    xhr.onload = function(e) {
		hideProgressBar();
        // Initialize the FITS.File object using
        // the array buffer returned from the XHR
        var fits = new FITS.File(xhr.response);
        // Grab the first HDU with a data unit
        var hdu = fits.getHDU();
        var data = hdu.data;

        var uintPixels;
        var swapPixels = new Uint8Array( data.view.buffer, data.begin, data.length ); // with gl.UNSIGNED_byte

	    for ( var i=0; i<swapPixels.length; i+=4 )
	    {
	        var temp = swapPixels[i];
	        swapPixels[i] = swapPixels[i+3];
	        swapPixels[i+3] = temp;

	        temp = swapPixels[i+1];
	        swapPixels[i+1] = swapPixels[i+2];
	        swapPixels[i+2] = temp;
	    }

	    var pixels = new Float32Array( data.view.buffer, data.begin, data.length/4 ); // with gl.FLOAT
	    var uintPixels = new Uint8Array( data.length/4 );
	    var max = pixels[0];
	    var min = pixels[0];
	    for ( var i=1; i<pixels.length; i++ )
	    {
	        var val = pixels[i];

	        if ( max < val )
	            max = val;
	        if ( min > val )
	            min = val;
	    }

	    var gl = globe.renderContext.gl;
	    var tex = gl.createTexture();
	    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.bindTexture(gl.TEXTURE_2D, tex);
	    gl.texImage2D(
            gl.TEXTURE_2D, 0, 
            gl.LUMINANCE, data.width, data.height, 0, 
            gl.LUMINANCE, gl.FLOAT, pixels);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	
		// Attach texture to style
	    style.fillTexture = tex;
	    style.fillTexture.min = min;
	    style.fillTexture.max = max;
	    globe.publish("fitsAdded", selectedFeature);
	    selectedFeature.layer.modifyFeatureStyle( selectedFeature.feature, style );
    }

    xhr.send();

    $('#progress').find('.progressId').html(selectedFeature.feature.properties.identifier);
    $('#progressBar').progressbar({
    	value: false,
    	change: function() {
    		$('#progressBar .progress-label').text( $('#progressBar').progressbar( "value" ) + "%");
    	},
    	complete: function() {
    		$('#progressBar .progress-label').text( "100%" );
    	}
    })
    $('#progress').animate({right: 50}, 500, function(){
    	$(this).animate({right:20});
    });

	// Cancel xhr event
	$('#cancelXHR').click(cancelRequest);
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
			} 
			else
			{
				$('#quicklook').addClass('selected');
				var style = selectedFeature.feature.properties.style;
				style.fill = true;

				if ( selectedFeature.feature.services && selectedFeature.feature.services.download && selectedFeature.feature.services.download.url.search(".fits") )
				{
					var url = "/sitools/proxy?external_url=" + selectedFeature.feature.services.download.url;
					computeData( selectedFeature, style, url );
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