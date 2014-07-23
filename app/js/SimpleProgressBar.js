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
 * Simple progress bar
 */
define(["jquery"], function($) {

var SimpleProgressBar = function(options)
{
	var id = options.id;
	this.percentOutput = options.hasOwnProperty('percentOutput') ? options.percentOutput : false;

	this.$element = $('<div style="display: none;" class="progress"><div></div></div>')
    		.appendTo('#'+id)
    		.fadeIn();
}

SimpleProgressBar.prototype.onprogress = function(evt)
{
	if (evt.lengthComputable) 
	{				
		var percentComplete = Math.floor( (evt.loaded / evt.total)*100 );
		var progressBarWidth = percentComplete * this.$element.width() / 100;
		this.$element.find('div').css('width', progressBarWidth);

		if ( this.percentOut )
		{
			this.$element.find('div').html(percentComplete + "%&nbsp;");
		}

		if ( percentComplete >= 99 )
		{
			this.$element.delay(1000).fadeOut('slow');
		}
	}
	else
	{
		this.$element.fadeOut();
	}
}

return SimpleProgressBar;

});