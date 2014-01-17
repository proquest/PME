// run-testcases-all.js
// driver for PME built-in testcase runner
// defers to run-testcases-single.js, once per translator

// --------------------------
const DEBUG = true; // debug logging, turn off to see nothing but emptiness
const PHANTOMJS_PATH = "./philtered"; // path to the phantomjs binary, or by default to the local ./philtered script that filters out noise from phantomjs
const TRANSLATOR_LIMIT = 0; // allow override of max # of translators to test, set to 0 for no limit (i.e. normal operation)

// modules
var fs = require("fs"),
	exec = require("child_process").exec,
	testUtil = require("./test_util.js");

var debugLog = testUtil.conditionalLogger(DEBUG, "PME_TEST_DRIVER");


// in: fileNames collected from the ../extractors folder
// out: an array of testresults as returned by the testcases
var fileNames = [],
	allResults = [];


function translatorError(fileName, message) {
	var result = new testUtil.TestResult(fileName);
	result.fatalError(message);
	return result;
}


// --------------------------
// run the testcases for a single translator
// the testcases are run in a separate process and the results are
// returned to us in JSON form at the end of the stdout
function runTranslatorTestCases(fileName, then) {
	exec(PHANTOMJS_PATH + " run-testcases-single.js " + fileName,
		function(error, stdout, stderr) {
			var testResult;

			if (error)
				testResult = translatorError(fileName, "exec error: " + error);
			else {
				// the json result is at the end of stdout, we need to extract it as
				// a lot of other logging may have been written before it
				var from = stdout.indexOf('{"');
				if (from < 0)
					testResult = translatorError(fileName, "no result json detected in output");
				else {
					var resultJSON = stdout.substr(from);
					debugLog("resultJSON =", resultJSON);
					try {
						testResult = JSON.parse(resultJSON);
					}
					catch(e) {
						testResult = translatorError(fileName, "invalid result json in output: " + resultJSON);
					}
				}
			}

			// save full output for diagnostic purposes
			testResult.stdout = stdout;
			testResult.stderr = stderr;
			allResults.push(testResult);

			then && then();
		}
	);
}


function didCompleteTranslators() {
	// pass	results to report generator to make TEH PRETTEH
	console.info(JSON.stringify(allResults));
}


function nextTranslator() {
	if (! fileNames.length) {
		debugLog("all translators done");
		didCompleteTranslators();
	}
	else {
		debugLog("next translator: ", fileNames[0]);
		runTranslatorTestCases(fileNames.shift(), nextTranslator);
	}
}


// --------------------------
// main
fs.readdir("../extractors/", function(err, files) {
	fileNames = files.filter(function(f) {
		return f.toLowerCase().substr(-3) == ".js";
	});

	if (TRANSLATOR_LIMIT > 0) {
		debugLog("TRANSLATOR_LIMIT was set, limiting to", TRANSLATOR_LIMIT, "translator(s)");
		fileNames.splice(TRANSLATOR_LIMIT);
	}

	nextTranslator();
});
