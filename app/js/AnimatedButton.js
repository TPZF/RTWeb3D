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
 * Animated button
 */
define( [ "jquery.ui"], function($) {

var AnimatedButton = function(element, options)
{
	this.$element = $(element).button();
	this.stopped = true;
	if ( options )
	{
		this.$element.on('click', $.proxy( options.onclick, this ));
	}
}

/**************************************************************************************************************/

/**
 *	Start animation
 */
AnimatedButton.prototype.startAnimation = function()
{
	this.stopped = false;
	this.iterateAnimation();
}

/**************************************************************************************************************/

/**
 *	Stop animation
 */
AnimatedButton.prototype.stopAnimation = function()
{
	this.stopped = true;
}

/**************************************************************************************************************/

/**
 *	Loading animation
 */
AnimatedButton.prototype.iterateAnimation = function()
{
	var self = this;
	this.$element.children('span').animate({ backgroundColor: "rgb(255, 165, 0);" }, 300, function(){
		$(this).animate({ backgroundColor: "transparent" }, 300, function(){
			if ( !self.stopped )
			{
				self.iterateAnimation();
			}
		});
	});
}

/**************************************************************************************************************/

return AnimatedButton;

});