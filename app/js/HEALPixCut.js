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

define( [ "jquery.ui", "UWSBase", "Utils" ], function($, UWSBase, Utils) {

/**************************************************************************************************************/

/**
 * 	UWS HEALPixCut service
 */
var HEALPixCut = function(name, baseUrl, options)
{
	UWSBase.prototype.constructor.call( this, name, baseUrl, options )
}

/**************************************************************************************************************/

Utils.inherits( UWSBase, HEALPixCut );

/**************************************************************************************************************/

/**
 *	@inherits <UMSBase.handleResults>
 */
HEALPixCut.prototype.handleResults = function(response)
{
	return response.results.result[0]['@xlink:href'];
}

return HEALPixCut;

});