// test_util.js - node module for the PME testcase runner
// implements shared testing data objects and methods


// constants shared by both the run-all and run-single script
exports.PME_SERVER_HOST = "localhost"; // (always localhost) the server at which a local instance of PME is hosted for use by the client pages
exports.PME_SERVER_PORT = 8082; // the port number of the above mentioned host to use


// contains the in- and output of a single testcase for one translator
// test. multiple TestCaseResults are contained within TestResult.
var TestCaseResult = exports.TestCaseResult = function(testCase, errors) {
	// `errors` may be a single error message string or null
	// ensure it is always an array
	if (!errors || errors.constructor != Array)
		errors = errors ? [errors] : [];

	this.url = testCase.url,
	this.success = !errors.length,
	this.errors = errors;
};


// contains the name and result of all testcases for one translator
// test. one instance of this is used to describe an entire test run
// and the JSON serialized form of an instance is embedded in the
// HTML test result file.
var TestResult = exports.TestResult = function(optTranslator) {
	this.translator = optTranslator || null;
	this.testCaseResults = [];
	this.errorMessage = null;

	this.fatalError = function(message) {
		this.errorMessage = message;
	};

	this.testCaseFailed = function(testCase, errors) {
		this.testCaseResults.push(new TestCaseResult(testCase, errors));
	};

	this.testCaseSucceeded = function(testCase) {
		this.testCaseResults.push(new TestCaseResult(testCase, null));
	};
};


// returns a function that acts like console.info but will
// do nothing if `condition` is false
exports.conditionalLogger = function(condition, prefix) {
	return function() {
		if (condition)
			console.info.apply(console, [prefix].concat([].slice.call(arguments, 0)));
	};
};


// waitFor repeatedly tests a predicate for a specified time
// and reports success (true) or timeout as failure (false).
exports.waitFor = function(pred, maxTime, callback) {
	var interval = 20;
	if (pred())
		callback(true);
	else {
		if (maxTime - interval > 0)
			setTimeout(function() { waitFor(pred, maxTime - interval, callback); }, interval);
		else
			callback(false);
	}
};
