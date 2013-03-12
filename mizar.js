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

sitools.component.mizarModule = Ext.extend(Ext.Panel, {

    initComponent : function () {
        Ext.each(this.listProjectModulesConfig, function (config){
            switch (config.name){
            case "configFile" :
                this.configFile = config.value;
                break;
            }
        }, this);
        // Using directly an iframe
        this.items = [ { layout: 'fit', 
                        region : 'center',
                        autoEl: { tag: 'iframe',
                        src: '../js/modules/mizarModule/app/index.html?conf='+this.configFile
                        }, 
                    xtype: 'box'}
                    ];

        sitools.component.mizarModule.superclass.initComponent.call(this);
    },

/**
* method called when trying to save preference
* @returns
*/

_getSettings : function () {
    return {
        preferencesPath : "/modules",
        preferencesFileName : this.id
    };
}

});

sitools.component.mizarModule.getParameters = function () {
    
    return [{
        jsObj : "Ext.form.TextField", 
        config : {
            fieldLabel : i18n.get("label.urlDatastorage"),
            allowBlank : true,
            width : 200,
            listeners: {
                render: function(c) {
                  Ext.QuickTips.register({
                    target: c,
                    text: "URI to the configuration file"
                  });
                }
            },
            name : "configFile",
            value : undefined
        }
    }];
};


Ext.reg('sitools.component.mizarModule', sitools.component.mizarModule);