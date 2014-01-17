// run-testcases-single.js

// This script has to be run using phantomjs
// it takes 1 parameter: the filename of the translator to test

// --------------------------
const DEBUG = true; // debug logging, turn off to see nothing but emptiness
const PME_TEST_HOST = "localhost:8081"; // an instance of PME needs to run and be accessible by the client page, defaults to localhost


// modules
var webpage = require("webpage"),
	system = require("system"),
	testUtil = require("./test_util.js");

var waitFor = testUtil.waitFor,
	debugLog = testUtil.conditionalLogger(DEBUG, "PME_TEST");


// in- and output of this process, webCases is the filtered set of
// testCases from the translator and testResult will be output to
// the stdout as JSON for the calling process to deal with.
var webCases = [],
	testResult = new testUtil.TestResult();


// --------------------------
// scaffolding to allow PME translators to load in this environment
var ValueFilter = {},
	vfentity = function(){ return ValueFilter; },
	ignore = function(){};

["addFilter","trim","trimInternal","replace","unescape","unescapeHTML","cleanAuthor",
 "match","prepend","append","key","split","capitalizeTitle","text"].forEach(
	function(fn) { ValueFilter[fn] = vfentity; }
);

// FW and ValueFilter are used by simpler Scraper translators
FW = {
	Scraper: ignore, MultiScraper: ignore,
	PageText: ignore, Url: vfentity, Xpath: vfentity
};

// A TranslatorClass is the translator passed into this script.
// It calls PME.TranslatorClass.loaded() and passes its API to us
// so we can start running the testcases.
PME = {
	TranslatorClass: {
		loaded: function(spec, api) {
			// We only process testCases of "web" type translators
			// also ignoring "multiple" result cases
			webCases = (api.testCases || []).filter(function(c) {
				return c.type == "web" && c.items != "multiple";
			});

			debugLog("translator file loaded in server context");

			if (webCases.length)
				runNextTestCase();
			else {
				resultSuccess("no (applicable) testcases");
				didCompleteTestCases();
			}
		}
	}
};


// --------------------------
function convertCreators(creators) {
	return creators.map(function(c) {
		if (typeof c != "object")
			return c;
		return [c.firstName || "", c.lastName || ""].join(" ").trim();
	});
}


function ItemComparisonResult() {
	this.errors = [];

	this.ok = function() {
		return !this.errors.length;
	};
}


// this function takes a single item as returned by a PME
// translator and verifies the content against an item specified
// in its testcase. Certain fields are ignored or loosely
// compared as PME does things slightly differently.
// returns an ItemComparisonResult
function compareTestCaseItemAgainstPMEItem(tcItem, pmeItem) {
	var icResult = new ItemComparisonResult();

	if (! pmeItem)
		icResult.errors.push("the testCase expected more items than were returned");
	else {
		Object.keys(tcItem).forEach(function(key) {
			var tcVal = tcItem[key];

			// testCases specify empty collections, which are elided by PME
			if ((typeof tcVal == "object") && ("length" in tcVal) && tcVal.length === 0)
				return;
			// these fields are not (guaranteed to be) present in PME
			if (["attachments", "accessDate", "url", "shortTitle", "libraryCatalog"].indexOf(key) > -1)
				return;
			// FIXME: date fields can differ significantly in formatting, ignored for now
			if (key == "date")
				return;
			// creators need to be in simple string form
			if (key == "creators" && typeof tcVal == "object")
				tcVal = convertCreators(tcVal);

			// the JSON representations of the values are used for easy comparison
			var tcStr = JSON.stringify(tcVal),
				pmeStr = JSON.stringify(pmeItem[key] || null);
			if (tcStr != pmeStr)
				icResult.errors.push(key + ": " + tcStr + " != " + pmeStr);
		});
	}

	return icResult;
}


// A translator has completed successfully and has returned
// an array of items and the array was not empty so we
// verify the contents of the returned and expected data here.
function compareTestCaseItems(testCase, actualItems) {
	debugLog("compareTestCaseItems");

	// compare all items against their expected versions
	var result = testCase.items.map(function(tcItem, index) {
		return compareTestCaseItemAgainstPMEItem(tcItem, actualItems[index]);
	});
	// add in ok() method to quickly check all enclosed result's ok-ness
	result.ok = function() {
		return this.every(function(icr) { return icr.ok(); });
	};

	return result;
}


// --------------------------
// All testcases have been completed or an error has occurred.
// Output the results and exit the phantomjs session.
function didCompleteTestCases() {
	debugLog("didCompleteTestCases");

	console.info(JSON.stringify(testResult));
	phantom.exit();
}


// Notification endpoint for when something has gone wrong.
// Sets error info for the testcase and message.
function gotErrorForTestCase(testCase, message) {
	debugLog("gotErrorForTestCase", message);

	resultFailure(testCase.url + "; REASON: " + message);
}


// Called for each appropriate testcase for the translator.
// This function drives the flow of 1 testcase and ends up in
// a call to either gotErrorForTestCase or didReceiveTestCaseItems.
// If all tests are complete it calls didCompleteTestCases and ends.
function runNextTestCase() {
	debugLog("runNextTestCase");

	if (! webCases.length) {
		// errors shortcut the test process so if we get here then
		// all went well and we report success.
		debugLog("all testcases done");
		resultSuccess();
		return didCompleteTestCases();
	}

	var tc = webCases.shift(),
		page = webpage.create();

	debugLog("new testCase: ", tc.url);

	page.open(tc.url, function(pageStatus) {
		if (pageStatus != "success") {
			gotErrorForTestCase(tc, "error loading testcase url");
		}
		debugLog("client page loaded");

		// insert PME from locally running instance
		// phantom has an includeJs method but we need to set the PME_SCR var
		// anyway, so doing it bookmarklet style.
		page.evaluate(function(testHost) {
			var h = document.getElementsByTagName('head')[0];
			PME_SRV = testHost;
			PME_SCR = document.createElement('SCRIPT');
			PME_SCR.src = 'http://' + PME_SRV + '/PME.js?' + (new Date().getTime());
			h.appendChild(PME_SCR);

			PME_TEST_RESULTS = null;
		}, PME_TEST_HOST); // pass PME_TEST_HOST to the function running on the client page

		// wait for PME to load in the page
		waitFor(function() {
			return page.evaluate(function() {
				return window.PME && PME.getPageMetaData;
			});
		},
		3000,
		function(pmeLoaded) {
			if (! pmeLoaded) {
				gotErrorForTestCase(tc, "can't find PME in client page");
				return runNextTestCase();
			}

			// start PME, will run async inside page
			page.evaluate(function() {
				PME.getPageMetaData(function(pi) {
					window.PME_TEST_RESULTS = pi;
				});
			});

			// give the translator up to 30s to return the results
			debugLog("waiting for resultset");

			waitFor(function() {
				return page.evaluate(function() {
					return !!window.PME_TEST_RESULTS;
				});
			},
			30000,
			function(foundResults) {
				if (foundResults) {
					debugLog("found resultset");

					// the translator completed, but results may be empty (0 items)
					// try and get the array from the result object in a paranoid way
					// to avoid unexpected errors.
					var pageItems = page.evaluate(function() {
						return window.PME_TEST_RESULTS;
					});

					if (pageItems)
						pageItems = pageItems.items;

					if (pageItems && pageItems.length) {
						var comparisonResult = compareTestCaseItems(tc, pageItems);
						if (! comparisonResult.ok)
							gotErrorForTestCase(tc, "items did not match: ", comparisonResult.errorText);
					}
					else
						gotErrorForTestCase(tc, "translator returned empty resultset");
				}
				else
					gotErrorForTestCase(tc, "did not find resultset after 30s");

				runNextTestCase();
			});
		});
	});
}


// --------------------------
// main
if (system.args.length != 2) {
	resultFailure("the test script must be called with the translator filename as the only parameter");
	didCompleteTestCases();
}
else {
	// We run the translator script here. At the end of each translator
	// is a call to a PME function to register itself and we've mocked
	// that above to intercept the call and then access any testCases
	// the translator may export.
	testResult.translator = system.args[1];
	debugLog("requested translator: ", testResult.translator);

	require("../extractors/" + testResult.translator);
}
