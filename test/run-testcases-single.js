// run-testcases-single.js

// This script has to be run using phantomjs
// it takes 1 parameter: the filename of the translator to test

// --------------------------
const DEBUG = true; // debug logging, turn off to see nothing but emptiness
const PME_TEST_HOST = "localhost:8081"; // an instance of PME needs to run and be accessible by the client page, defaults to localhost
                                        // run: python -m SimpleHTTPServer 8081 inside the PME dir for a quick server
const TESTCASE_LIMIT = 0; // allow override of max # of testCases to run, set to 0 for no limit (i.e. normal operation)
const PME_WAIT_SECONDS = 3; // number of seconds to wait for PME to show up in the client page
const RESULTS_WAIT_SECONDS = 60; // number of seconds to wait for the translator to yield results. can take a long time for certain pages


// modules
var webpage = require("webpage"),
	system = require("system"),
	testUtil = require("./test_util.js");

var waitFor = testUtil.waitFor,
	debugLog = testUtil.conditionalLogger(DEBUG, "PME_TEST");


// in: webCases is the filtered set of testCases from the translator (filename passed in as only arg to this script)
// out: testResult will contain all testCase results and is passed to caller process in JSON form in stdout
var webCases = [],
	translatorName = system.args.slice(1).join(" "), // allow for filenames with spaces in them
	testResult = new testUtil.TestResult(translatorName);


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

			if (! webCases.length) {
				// nothing to see here
				debugLog("no (applicable) testcases for this translator");
				didCompleteTestCases();
			}
			else {
				// allow a debug override of the maximum number of testCases to run per translator
				if (TESTCASE_LIMIT > 0) {
					debugLog("TESTCASE_LIMIT was set, limiting to", TESTCASE_LIMIT, "testCase(s)");
					webCases.splice(TESTCASE_LIMIT);
				}

				runNextTestCase();
			}
		}
	}
};


// --------------------------
function convertCreators(creators) {
	return creators.map(function(c) {
		if (typeof c == "string")
			return c.trim();
		if (typeof c != "object")
			return c;
		return [c.firstName || "", c.lastName || ""].join(" ").trim();
	});
}


// this function takes a single item as returned by a PME
// translator and verifies the content against an item specified
// in its testcase. Certain fields are ignored or loosely
// compared as PME does things slightly differently.
// returns an ItemComparisonResult
function compareTestCaseItemAgainstPMEItem(tcItem, pmeItem) {
	var icResult = [];
	icResult.ok = function() {
		return ! this.length;
	};

	if (! pmeItem)
		icResult.push("the testCase expected more items than were returned");
	else {
		Object.keys(tcItem).forEach(function(key) {
			var tcVal = tcItem[key],
				pmeVal = pmeItem[key] || "";

			// all string vals are trimmed to prevent mismatches based on whitespace
			if (typeof tcVal == "string")
				tcVal = tcVal.trim();
			if (typeof pmeVal == "string")
				pmeVal = pmeVal.trim();

			// testCases specify empty collections, which are elided by PME
			if (tcVal.constructor == Array && tcVal.length === 0)
				return;
			// these fields are not (guaranteed to be) present in PME
			if (["attachments", "accessDate", "url", "shortTitle", "libraryCatalog"].indexOf(key) > -1)
				return;
			// FIXME: date fields can differ significantly in formatting, ignored for now
			if (key == "date")
				return;

			// creators need to be in simple string form
			if (key == "creators") { 
				if (typeof tcVal == "object")
					tcVal = convertCreators(tcVal);
				if (typeof pmeVal == "object")
					pmeVal = convertCreators(pmeVal);
			}
			// arrays are sorted to prevent mismatches on order of items inside array
			if (typeof tcVal.sort == "function")
				tcVal.sort();
			if (typeof pmeVal.sort == "function")
				pmeVal.sort();

			// the JSON representations of the values are used for easy comparison
			var tcStr = JSON.stringify(tcVal),
				pmeStr = JSON.stringify(pmeVal);
			if (tcStr != pmeStr)
				icResult.push(key + ": " + tcStr + " DOES NOT EQUAL " + pmeStr);
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
// all testcases have been completed or an error has occurred.
// output the results and exit the phantomjs session.
function didCompleteTestCases() {
	debugLog("didCompleteTestCases");

	console.info(JSON.stringify(testResult));
	phantom.exit();
}


// passthrough for a failed testCase, returns control to main test loop
function testCaseFailed(tc, errors) {
	testResult.testCaseFailed(tc, errors);
	runNextTestCase();
}


// passthrough for a successful testCase, returns control to main test loop
function testCaseSucceeded(tc) {
	testResult.testCaseSucceeded(tc);
	runNextTestCase();
}


// Called for each appropriate testcase for the translator.
// This function drives the flow of 1 testcase.
function runTestCase(tc) {
	debugLog("runTestCase", tc.url);

	var page = webpage.create();

	page.open(tc.url, function(pageStatus) {
		if (pageStatus != "success")
			return testCaseFailed(tc, "error loading testcase page");

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
		PME_WAIT_SECONDS * 1000,
		function(pmeLoaded) {
			if (! pmeLoaded) {
				debugLog("PME did not load within 3s");
				return testCaseFailed(tc, "PME did not load successfully in the client page");
			}

			// start PME, will run async inside page
			page.evaluate(function() {
				PME.getPageMetaData(function(pi) {
					window.PME_TEST_RESULTS = pi;
				});
			});

			// give the translator some time to return the results
			debugLog("waiting for resultset");

			waitFor(function() {
				return page.evaluate(function() {
					return !!window.PME_TEST_RESULTS;
				});
			},
			RESULTS_WAIT_SECONDS * 1000,
			function(foundResults) {
				if (! foundResults)
					testCaseFailed(tc, "did not find resultset after " + RESULTS_WAIT_SECONDS + "s");
				else {
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
						var errors = compareTestCaseItems(tc, pageItems);
						if (errors.ok())
							testCaseSucceeded(tc);
						else
							testCaseFailed(tc, errors);
					}
					else
						testCaseFailed(tc, "translator returned empty resultset");
				}
			});
		});
	});
}


// testCase runner entrypoint. This drives the loop, walking through the array `webCases`
function runNextTestCase() {
	debugLog("runNextTestCase");

	if (webCases.length)
		runTestCase(webCases.shift());
	else {
		debugLog("all testcases done");
		return didCompleteTestCases();
	}
}


// --------------------------
// main
if (system.args.length < 2) {
	testResult.fatalError("the test script must be called with only the translator filename");
	didCompleteTestCases();
}
else {
	// We run the translator script here. At the end of each translator
	// is a call to a PME function to register itself and we've mocked
	// that above to intercept the call and then access any testCases
	// the translator may export.
	debugLog("requested translator:", testResult.translator);

	require("../extractors/" + testResult.translator);
}
