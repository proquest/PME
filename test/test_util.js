// test_util.js - node module for the PME testcase runner
// implements shared testing data objects and methods

exports.TestCaseResult = {
	create: function(testCase, success, message) {
		return {
			testCase: testCase,
			success: success,
			message: message,
			errors: []
		};
	},

	failure: function(testCase, message) {
		return this.create(false, message);
	},

	success: function(testCase, optMessage) {
		return this.create(true, optMessage || "");
	}
};


exports.TestResult = function(optTranslator) {
	this.translator = optTranslator || null;
	this.testCaseResults = [];

//	this.
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
