/***************************************
* Copyright 2010-2014 CNES - CENTRE NATIONAL d'ETUDES SPATIALES
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
/*global Ext, sitools, i18n, document, projectGlobal, SitoolsDesk, userLogin, DEFAULT_PREFERENCES_FOLDER, loadUrl*/


Ext.namespace('sitools.user.view.modules.mizarModule');


Ext.define('sitools.user.view.modules.mizarModule.MizarModuleView', {
	extend : 'Ext.panel.Panel',
	alias : 'widget.mizarModuleView',
	layout : 'fit',
	requires : ['sitools.user.model.MizarModuleModel'], 	
	
	initComponent : function () {
		console.log("Je suis dans le initComponent de la view !");
		console.log("listProj : "+this.listProjectModulesConfig);

                Ext.each(this.moduleModel.listProjectModulesConfigStore.data.items, function (config) {
		switch (config.get('name')){
                        case "configFile" :
                                this.configFile = config.get('value');
                                break;
                        }
                }, this);
		console.log("THIS.configFILE = "+this.configFile);
		this.items = [ { layout: 'fit',
                        region : 'center',
                        autoEl: { tag: 'iframe',
				//src: 'http://plis.ias.u-psud.fr:8283/sitools/client-user/controller/modules/mizarModule/app/index.html?conf=undefined'
				src: 'http://plis.ias.u-psud.fr:8283/sitools/client-user/app/controller/modules/mizarModule/app/index.html?conf=undefined'
                        },
                        xtype: 'box'}
                ];
		
//		this.items = [this.containerPanel];

	        this.callParent(arguments);	

	},

	/**
        * method called when trying to save preference
	* 
	* @returns
	*/
	_getSettings : function () {
        	return {
        		preferencesPath : "/modules",
	        	preferencesFileName : this.id,
        		xtype : this.$className
		};

	}

});

