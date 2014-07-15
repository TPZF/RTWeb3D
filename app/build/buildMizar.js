({
	baseUrl: "../js",
	name: "../build/almond",
	include: ['MizarWidget'],
	out: "../build/generated/MizarWidget.min.js",
	wrap: {
 	    start: "(function (root, factory) {\
		    if (typeof define === 'function' && define.amd) {\
			define(['jquery', 'underscore'], factory);\
		    } else {\
			root.MizarWidget = factory(root.$, root._);\
		    }\
		}(this, function ($, _) {",
	    end: "return require('MizarWidget');}));"
	},
	optimize: "uglify",
	paths: {
		"jquery": "../externals/jquery-1.8.2.min",
		"jquery.ui": "../externals/jquery-ui-1.9.2.custom.min",
		"jquery.ui.selectmenu": "../externals/jquery.ui.selectmenu",
		"underscore-min": "../externals/underscore-min",
		"jquery.nicescroll.min": "../externals/jquery.nicescroll.min",
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
		'jquery.ui.selectmenu': {
			deps: ['jquery.ui'],
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
		}
	},
  	uglify: {
        //Example of a specialized config. If you are fine
        //with the default options, no need to specify
        //any of these properties.
        output: {
            beautify: false
        },
        compress: {
 	    unsafe: true
        },
        warnings: true,
        mangle: true
    }
})
