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
				"jquery.nicescroll.min",
                "jquery.ui.timepicker"
            ]
        }
    ],
    // Optimizing alredy minified files :( .. TODO exclude
    paths: {
        "jquery": "../externals/jquery-1.11.1.min",
        "jquery.ui": "../externals/jquery-ui-1.11.0.min",
        "underscore-min": "../externals/underscore-1.6.0.min",
        "jquery.nicescroll.min": "../externals/jquery.nicescroll-3.5.4.min",
        "fits": "../externals/fits",
        "samp": "../externals/samp",
        "gzip": "../externals/gzip",
        "crc32": "../externals/crc32",
        "deflate-js": "../externals/deflate",
        "inflate-js": "../externals/inflate",
        "wcs": "../externals/wcs",
        "jquery.ui.timepicker": "../externals/jquery.ui.timepicker",
        "gw": "../externals/GlobWeb/src/"
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
        'jquery.ui.timepicker': {
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
        },
        'gzip' : {
            deps: ['deflate-js', 'inflate-js', 'crc32'],
            exports: 'gZip'
        }
    },

    fileExclusionRegExp: /^upload$|^build$|^demo$|^release$/
}
