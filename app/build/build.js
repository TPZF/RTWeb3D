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
                "underscore-min",
            ]
        }
    ],

    // Optimizing alredy minified files :( .. TODO exclude
    paths: {
        "jquery": "https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min",
        "jquery.ui": "https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.24/jquery-ui.min",
        "jquery.ui.selectmenu": "../externals/jquery.ui.selectmenu",
        "underscore-min": "../externals/underscore-min",
        "jquery.nicescroll.min": "../externals/jquery.nicescroll.min"
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

    fileExclusionRegExp: /^GlobWeb$|^upload$|^build$/
}