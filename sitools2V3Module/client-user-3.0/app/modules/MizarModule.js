Ext.namespace('sitools.user.modules');

Ext.define('sitools.user.modules.MizarModule', {
	extend : 'sitools.user.core.Module',

	controllers : [],

	init : function () {
		//console.log("Je suis dans le init de MizarModule.js ! ");
        	var view = Ext.create('sitools.user.view.modules.mizarModule.MizarModuleView', {
            		moduleModel : this.getModuleModel()
        	});
		
        	this.show(view);

        	this.callParent(arguments);
    	},

	statics : {

                getParameters : function () {
                        return [{
                                jsObj : "Ext.form.TextField",
                                config : {
//                                        fieldLabel : i18n.get("label.urlDatastorage"),
					fieldLabel : "name of configuration file of Mizar",
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
                }
        },

	    /**
     * method called when trying to save preference
     * 
     * @returns
     */
    _getSettings : function () {
        return {
            preferencesPath : "/modules",
            preferencesFileName : this.id
        };

    }

});

