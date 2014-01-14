// This script has to be run using phantomjs
// it takes 1 parameter: the filename of the translator to test

//
var webCases = [];

// -- some scaffolding to allow PME translators to load in this environment
var ValueFilter = {},
	vfentity = function(){ return ValueFilter; },
	ignore = function(){};

["addFilter","trim","trimInternal","replace","unescape","unescapeHTML","cleanAuthor",
 "match","prepend","append","key","split","capitalizeTitle","text"].forEach(
	function(fn) { ValueFilter[fn] = vfentity; }
);

FW = {
	Scraper: ignore, MultiScraper: ignore,
	PageText: ignore, Url: vfentity, Xpath: vfentity
};

PME = {
	TranslatorClass: {
		loaded: function(spec, api) {
			console.info(spec.label, "loaded");
			if (api.testCases) {
				// -- we only process testCases of "web" type translators
				// -- also ignoring "multiple" result cases
				webCases = api.testCases.filter(function(c) {
					return c.type == "web" && c.items != "multiple";
				});

				runNextTestCase();
			}
		}
	}
};



// -- running the tests
function runNextTestCase() {
	if (! webCases.length) {
		console.info("DONE");
		phantom.exit();
		return;
	}

	var tc = webCases.shift(),
		page = webpage.create();
	console.info("***********", tc.url);

	page.open(tc.url, function(status) {
		console.info(tc.url, "--->", status);
		runNextTestCase();
	});
}


// -- control script
var webpage = require("webpage"),
	system = require("system");

if (system.args.length != 2) {
	console.info("Pass the name of the translator to test as the only parameter.");
	phantom.exit();
}

require("../extractors/" + system.args[1]);
