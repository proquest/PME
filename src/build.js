var shell = require('shelljs'),
	jade = require('jade');

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

shell.cat(
	injectScripts.concat(['bookmarklet/inject_base.js'])
).to('../inject.js');

shell.cat(
	injectScripts.concat(injectIEScripts, ['bookmarklet/inject_base.js'])
).to('../inject_ie.js');

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

shell.cat(
	commonScripts
).to('../common.js');

shell.cat(
	commonScripts.concat(commonIEScripts)
).to('../common_ie.js');

var iframeScripts = [
	'xpcom/connector/connector.js',
	'xpcom/translation/tlds.js',
	'bookmarklet/translator.js',
	'common/messaging.js'
];

var iFrameIEScripts = [
	'bookmarklet/iframe_ie_compat.js'
];

shell.cat(
	iframeScripts.concat(['bookmarklet/iframe_base.js'])
).to('../iframe.js');

shell.cat(
	iframeScripts.concat(iFrameIEScripts, ['bookmarklet/iframe_base.js'])
).to('../iframe_ie.js');

var iframeScripts = [
		'common.js',
		'https://s3.amazonaws.com/pme.proquest.com/masterlist.js',
		'iframe.js'
	],
	iframeIEScripts = [
		'wgxpath.install.js',
		'common_ie.js',
		'https://s3.amazonaws.com/pme.proquest.com/masterlist.js',
		'iframe_ie.js'
	],
	fn = jade.compileFile('iframe.jade');

fn(iframeScripts).to('../iframe.html');
fn(iframeIEScripts).to('../iframe_ie.html');