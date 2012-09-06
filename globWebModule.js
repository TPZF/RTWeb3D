/***************************************
* Copyright 2011, 2012 CNES - CENTRE NATIONAL d'ETUDES SPATIALES
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
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with SITools2.  If not, see <http://www.gnu.org/licenses/>.
***************************************/
/*global Ext, sitools, i18n, commonTreeUtils, projectGlobal, showResponse, document, SitoolsDesk, alertFailure, XMLSerializer*/

Ext.namespace('sitools.component');

sitools.component.globWebModule = Ext.extend(Ext.Panel, {

    initComponent : function () {
        /*var htmlReaderCfg = {
            defaults : {
                padding : 10
            },
            layout : 'fit',
            region : 'center',
			defaultSrc : "../js/modules/globWebModule/index.html"
        };

        this.htmlReader = new Ext.ux.ManagedIFrame.Panel(htmlReaderCfg);

        this.items = [ this.htmlReader ];*/
		
		/*this.items = [ { layout: 'fit', 
				html: '<iframe src="../js/modules/globWebModule/index.html"></iframe>', 
				xtype: 'panel'} ];*/
		
		this.items = [ { layout: 'fit', 
						 region : 'center',
						/* html: '<iframe src="../js/modules/globWebModule/index.html"></iframe>',*/
						 autoEl: { tag: 'iframe',
								src: '../js/modules/globWebModule/app/index.html'
						}, 
				xtype: 'box'} ];

        sitools.component.globWebModule.superclass.initComponent.call(this);
    }

});

Ext.reg('sitools.component.globWebModule', sitools.component.globWebModule);