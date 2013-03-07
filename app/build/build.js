{
    baseUrl: "js",
    appDir: "..",
    dir: "generated",
	removeCombined: true,

    modules: [
        { 
            name: "main",
            exclude: [
                "jquery",
                "jquery.ui",
				"jquery.ui.selectmenu",
                "underscore-min",
				"jquery.nicescroll.min"
            ]
        }
    ],

    // Optimizing alredy minified files :( .. TODO exclude
    paths: {
		"jquery": "../externals/jquery-1.8.2.min",
		"jquery.ui": "../externals/jquery-ui-1.9.2.custom.min",
		"jquery.ui.selectmenu": "../externals/jquery.ui.selectmenu",
		"underscore-min": "../externals/underscore-min",
		"jquery.nicescroll.min": "../externals/jquery.nicescroll.min",
        "fits": "../externals/fits",
		"gw": "../externals/GlobWeb/src"
    },
    shim: {
        'jquery': {
            deps: [],
            exports: 'jQuery'
        },
        'jquery.ui': {
            deps: ['jquery'],
            exports: 'jQuery'
        },
        'jquery.ui.selectmenu': {
            deps: ['jquery.ui'],
            exports: 'jQuery'
        },
        'underscore-min': {
            deps: ['jquery'],
            exports: '_'
        },
        'jquery.nicescroll.min': {
            deps: ['jquery'],
            exports: ''
        }
    },

    fileExclusionRegExp: /^upload$|^build$|^demo$|^data$|^release$/
}
