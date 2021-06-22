var shell = require('shelljs'),
	compressor = require('node-minify'),
	jade = require('pug'),
	fs = require('fs'),
	REPOSITORY_URL = "https://pme.proquest.com",
	debug = true,
	compressorType = debug ? "no-compress" : "gcc";

var injectScripts = [
	'xpcom/connector/cachedTypes.js',
	'xpcom/date.js',
	'common/inject/http.js',
	'xpcom/openurl.js',
	'common/inject/progressWindow.js',
	'xpcom/rdf/init.js',
	'xpcom/rdf/uri.js',
	'xpcom/rdf/term.js',
	'xpcom/rdf/identity.js',
	'xpcom/rdf/match.js',
	'xpcom/rdf/rdfparser.js',
	'xpcom/translation/translate.js',
	'xpcom/connector/translate_item.js',
	'common/inject/translate_inject.js',
	'common/inject/translator.js',
	'xpcom/connector/typeSchemaData.js',
	'xpcom/utilities_translate.js',
	'bookmarklet/messaging_inject.js'
];

var injectIEScripts = [
	'bookmarklet/inject_ie_compat.js',
	'../wgxpath.install.js'
];

compressor.minify({
	compressor: compressorType,
	options: {
		language: 'ECMASCRIPT5',
	},
	input: injectScripts.concat(['bookmarklet/inject_base.js']),
	output: '../output/pme/inject.js',
	callback: function(err, min){
		console.log(err);
	}
});

compressor.minify({
	compressor: compressorType,
	options: {
		language: 'ECMASCRIPT5',
	},
	input: injectScripts.concat(injectIEScripts, ['bookmarklet/inject_base.js']),
	output: '../output/pme/inject_ie.js',
	callback: function(err, min){
		console.log(err);
	}
});

var commonScripts = [
	'zotero.js',
	'bookmarklet/zotero_config.js',
	'xpcom/debug.js',
	'common/errors_webkit.js',
	'common/http.js',
	'xpcom/xregexp/xregexp.js',
	'xpcom/xregexp/addons/build.js',
	'xpcom/xregexp/addons/matchrecursive.js',
	'xpcom/xregexp/addons/unicode/unicode-base.js',
	'xpcom/xregexp/addons/unicode/unicode-categories.js',
	'xpcom/xregexp/addons/unicode/unicode-zotero.js',
	'xpcom/utilities.js',
	'bookmarklet/messages.js'
];

var commonIEScripts = [
	'bookmarklet/ie_compat.js'
];

compressor.minify({
	compressor: compressorType,
	options: {
		language: 'ECMASCRIPT5',
	},
	input: commonScripts,
	output: '../output/pme/common.js',
	callback: function(err, min){
		console.log(err);
	}
});

compressor.minify({
	compressor: compressorType,
	options: {
		language: 'ECMASCRIPT5',
	},
	input: commonScripts.concat(commonIEScripts),
	output: '../output/pme/common_ie.js',
	callback: function(err, min){
		console.log(err);
	}
});

var iframeScripts = [
	'xpcom/connector/connector.js',
	'xpcom/translation/tlds.js',
	'bookmarklet/translator.js',
	'common/messaging.js'
];

var iFrameIEScripts = [
	'bookmarklet/iframe_ie_compat.js'
];

compressor.minify({
	compressor: compressorType,
	options: {
		language: 'ECMASCRIPT5',
	},
	input: iframeScripts.concat(['bookmarklet/iframe_base.js']),
	output: '../output/pme/iframe.js',
	callback: function(err, min){
		console.log(err);
	}
});

compressor.minify({
	compressor: compressorType,
	options: {
		language: 'ECMASCRIPT5',
	},
	input: iframeScripts.concat(iFrameIEScripts, ['bookmarklet/iframe_base.js']),
	output: '../output/pme/iframe_ie.js',
	callback: function(err, min){
		console.log(err);
	}
});

var iframeScripts = [
		'common.js',
		REPOSITORY_URL + '/masterlist.js',
		'iframe.js'
	],
	iframeIEScripts = [
		'wgxpath.install.js',
		'common_ie.js',
		REPOSITORY_URL + '/masterlist.js',
		'iframe_ie.js'
	],
	fn = jade.compileFile('iframe.jade');

fs.writeFile('../output/pme/iframe.html', fn(iframeScripts), function(err) {
    if(err) {
        return console.log(err);
    }
});
fs.writeFile('../output/pme/iframe_ie.html', fn(iframeIEScripts), function(err) {
		if(err) {
				return console.log(err);
		}
});
