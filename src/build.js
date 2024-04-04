var compressor = require('node-minify'),
	jade = require('pug'),
	fs = require('fs');

var parameters = {
	output: "../output/pme/",
	compressorType: "gcc",
	translatorsLocation:"https://pme.proquest.com"
};

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

var commonScripts = [
	'zotero.js',
	'bookmarklet/zotero_config.js',
	'xpcom/debug.js',
	'xpcom/promise.js',
	'common/errors_webkit.js',
	'common/utilities.js',
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


var minifyAll = function() {

	console.log("Generating js files to output " + parameters.output + " and compression " + parameters.compressorType);

	compressor.minify({
		compressor: parameters.compressorType,
		options: {
			language: 'ECMASCRIPT5',
		},
		input: injectScripts.concat(['bookmarklet/inject_base.js']),
		output: parameters.output + 'inject.js',
		callback: function(err){
			handleMessage("inject.js", err);
		}
	});

	compressor.minify({
		compressor: parameters.compressorType,
		options: {
			language: 'ECMASCRIPT5',
		},
		input: injectScripts.concat(injectIEScripts, ['bookmarklet/inject_base.js']),
		output: parameters.output + 'inject_ie.js',
		callback: function(err){
			handleMessage("inject_ie.js", err);
		}
	});

	compressor.minify({
		compressor: parameters.compressorType,
		options: {
			language: 'ECMASCRIPT5',
		},
		input: ['../PME.js'],
		output: parameters.output + 'PME.js',
		callback: function(err){
			handleMessage("PME.js", err);
		}
	});

	compressor.minify({
		compressor: parameters.compressorType,
		options: {
			language: 'ECMASCRIPT5',
		},
		input: commonScripts,
		output: parameters.output + 'common.js',
		callback: function(err, ){
			handleMessage("common.js", err);
		}
	});

	compressor.minify({
		compressor: parameters.compressorType,
		options: {
			language: 'ECMASCRIPT5',
		},
		input: commonScripts.concat(commonIEScripts),
		output: parameters.output + 'common_ie.js',
		callback: function(err){
			handleMessage("common_ie.js", err);
		}
	});

	compressor.minify({
		compressor: parameters.compressorType,
		options: {
			language: 'ECMASCRIPT5',
		},
		input: iframeScripts.concat(['bookmarklet/iframe_base.js']),
		output: parameters.output + 'iframe.js',
		callback: function(err){
			handleMessage("iframe.js", err);
		}
	});

	compressor.minify({
		compressor: parameters.compressorType,
		options: {
			language: 'ECMASCRIPT5',
		},
		input: iframeScripts.concat(iFrameIEScripts, ['bookmarklet/iframe_base.js']),
		output: parameters.output + 'iframe_ie.js',
		callback: function(err){
			handleMessage("iframe_ie.js", err);
		}
	});

};



var iframeScripts = [
	'xpcom/connector/connector.js',
	'xpcom/translation/tlds.js',
	'bookmarklet/translator.js',
	'common/messaging.js'
];

var iFrameIEScripts = [
	'bookmarklet/iframe_ie_compat.js'
];

var handleMessage = function(file, error){
	console.log('Creating "' + parameters.output + file + '"...');
	if (error && error != null) {
		console.log('Error when creating "'+file+'": ' + error);
	}
};

var parseArguments = function() {
	for(var i = 0; i < process.argv.length; i++) {
		var arg = process.argv[i];
		var val = process.argv[++i];
		console.log(arg, val);
		switch(arg) {
			case '-o': //Output folder, default is "../output"
				parameters.output = val;
				break;
			case '-debug': //Debug flag generates js files without compression to facilitate reading.
				parameters.compressorType = "no-compress";
				break;
			case '-t': //Translators Location
				parameters.translatorsLocation = val;
				break;
		}
	}
};

var generateIFrames = function(){

	var iframeScripts = [
			'common.js',
			parameters.translatorsLocation + '/masterlist.js',
			'iframe.js'
		],
		iframeIEScripts = [
			'wgxpath.install.js',
			'common_ie.js',
			parameters.translatorsLocation + '/masterlist.js',
			'iframe_ie.js'
		],
		fn = jade.compileFile('iframe.jade');

	fs.writeFile('../output/pme/iframe.html', fn(iframeScripts), function(err) {
		handleMessage("iframe.html", err);
	});
	fs.writeFile('../output/pme/iframe_ie.html', fn(iframeIEScripts), function(err) {
		handleMessage("iframe.html", err);
	});

};

(function(){
	parseArguments();
	minifyAll();
	generateIFrames();
})();