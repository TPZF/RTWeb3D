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

define(['gw/ImageRequest'], function(ImageRequest){

/**************************************************************************************************************/

/*
 *	Override send function to handle fits requests
 */
ImageRequest.prototype.send = function(url)
{
	if ( url.search("fits") > 0 )
	{
		// Fits
		this.xhr = new XMLHttpRequest();
		var self = this;
		self.xhr.onreadystatechange = function(e)
		{
			if ( self.xhr.readyState == 4 )
			{
				if ( self.xhr.status == 200 )
				{
					if (self. xhr.response )
					{
						self.image = self.xhr.response;
						if (self.successCallback)
						{
							self.successCallback(self);
						}
					}
				}
				else
				{
					console.log( "Error while loading " + url );
					if ( self.failCallback )
					{
						self.failCallback(self);
					}
				}
				self.xhr = null;
			}
		};
		
		this.xhr.open("GET", url);
		this.xhr.responseType = 'arraybuffer';
		this.xhr.send();
		// this.xhr = xhr;
	}
	else
	{
		this.image = new Image();
		this.image.crossOrigin = '';
		this.image.dataType = "byte";
		this.image.onload = this.successCallback.bind(this);
		this.image.onerror = this.failCallback.bind(this);
		this.image.src = url;
	}
}

/**************************************************************************************************************/

/*
 *	Override abort
 */
ImageRequest.prototype.abort = function()
{
	if ( this.xhr )
	{
		this.xhr.abort();
	}
	// this.image.src = '';
}

/**************************************************************************************************************/

});

