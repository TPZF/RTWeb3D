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
 * UWS Manager
 */

define( [ "jquery.ui", "./UWSBase" ],
	function($, UWSBase) {

var cutOutService;
var zScaleService;
var healpixCutService;

return {
	init: function(conf)
 	{
 		if ( conf.cutOut )
 		{
 			cutOutService = new UWSBase( 'CutOut', conf.cutOut.baseUrl );
 		}

 		if ( conf.healpixcut )
 		{
 			healpixCutService = new UWSBase( 'HealpixCut', conf.healpixcut.baseUrl );
 		}

 		if ( conf.zScale )
 		{
 			zScaleService = new UWSBase( 'ZScale', conf.zScale.baseUrl );
 		}
 	},

 	post: function(serviceName, params, options)
 	{
 		switch(serviceName)
 		{
 			case "cutout":
 				cutOutService.post(params, options);
 				break;
 			case "healpixcut":
 				healpixCutService.post(params, options);
 				break;
 			case "zscale":
 				zScaleService.post(params, options);
 				break;
 			default:
 				console.error("Not supported");
 		}
 	},

 	delete: function(serviceName, jobId, options)
 	{
 		switch(serviceName)
 		{
 			case "cutout":
 				cutOutService.delete(jobId, options)
 				break;
 			case "healpixcut":
 				healpixCutService.delete(jobId, options);
 				break;
 			case "zscale":
 				zScaleService.delete(jobId, options);
 				break;
 			default:
 				console.error("Not supported");
 		}
 	}
}

});