{
    baseUrl: "js",
    appDir: "..",
    dir: "generated",

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
        "jquery.ui": "../externals/jquery-ui-1.8.23.custom.min",
        "GlobWeb": "../externals/GlobWeb.min",
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
        'GlobWeb': {
            deps: [],
            exports: 'GlobWeb'
        },
        'jquery.nicescroll.min': {
            deps: ['jquery'],
            exports: ''
        }
    },

    fileExclusionRegExp: /^GlobWeb$|^images$|^data$|^upload$|^build$/
}