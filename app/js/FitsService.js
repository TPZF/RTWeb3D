/**
 * Fits service
 */
define( [ "jquery.ui" ], function($) {

// var form = '<div id="fitsOptions">\
// 				<input class="ui-corner-all ui-button" type="checkbox" id="minmax" /><label for="minmax">min/max</label><br/>\
// 	  	 		<input class="ui-corner-all ui-button" type="checkbox" id="log" /><label for="log">log</label>\
// 	  	 	</div>';
// var $form = $(form).appendTo('serviceBar');
// $form.find('input').each(function(i){
// 	$(this).button({ text: false })
// 			.prop({ "type": "checkbox" });
// });

var layers = [];
var form = 
  	'<span id="minmax" class="ui-state-default ui-corner-all ui-button">\
		<span class="ui-icon ui-icon-empty"></span>\
	</span>Min/Max<br/>\
	<span id="log" class="ui-state-default ui-corner-all ui-button">\
		<span class="ui-icon ui-icon-empty"></span>\
	</span>Log';

// TODO remove body dependence
$('body').on("click", "#minmax", function(){

	for ( var i=0; i<layers.length; i++ )
	{
		var isOn = !$(this).hasClass('ui-state-active');
		if (isOn)
			layers[i].minmax = 1;
		else
			layers[i].minmax = 0;
	}
	$(this).toggleClass('ui-state-active');
	$(this).toggleClass('ui-state-default');
	$(this).find('span').toggleClass('ui-icon-check');
	$(this).find('span').toggleClass('ui-icon-empty');
});

// TODO remove body dependence
$('body').on("click", "#log", function(){
	for ( var i=0; i<layers.length; i++ )
	{
		var isOn = !$(this).hasClass('ui-state-active');
		if (isOn)
			layers[i].logOn = 1;
		else
			layers[i].logOn = 0;
	}
	$(this).toggleClass('ui-state-active');
	$(this).toggleClass('ui-state-default');
	$(this).find('span').toggleClass('ui-icon-check');
	$(this).find('span').toggleClass('ui-icon-empty');
});

return {

	/**
	 *	Add layer to the service
	 */
	addLayer: function(layer)
	{
		layers.push(layer);
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
		// TODO modify & attach form to FitsService
		tabs.find( ".ui-tabs-nav" ).append('<li><a href="#FitsService">FitsService</a></li>');
		tabs.append('<div id="FitsService">'+form+'</div>');
		tabs.tabs("refresh");
	},

	removeService: function(tabs)
	{
		var index = tabs.find( '.ui-tabs-nav li[aria-controls="FitsService"]').index();
		tabs.tabs("remove",index);
	}
}

});
