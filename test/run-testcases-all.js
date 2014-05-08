// run-testcases-all.js
// driver for PME built-in testcase runner
// defers to run-testcases-single.js, once per translator

// --------------------------
const DEBUG = true; // debug logging, turn off to see nothing but emptiness
const PHANTOMJS_PATH = "./philtered"; // path to the phantomjs binary, or by default to the local ./philtered script that filters out noise from phantomjs
const TRANSLATOR_LIMIT = 0; // allow override of max # of translators to test, set to 0 for no limit (i.e. normal operation)

const TEST_WAIT_SECONDS = 60 * 8; // max time for a single translator to run before we give up


// imports
var fs = require("fs"),
	http = require("http"),
	path = require("path"),
	parseUrl = require("url").parse,
	unescape = require("querystring").unescape,
	exec = require("child_process").exec,
	testUtil = require("./test_util.js");

var debugLog = testUtil.conditionalLogger(DEBUG, "PME_TEST_DRIVER"),
	localPMEServer = null;


// in: fileNames collected from the ../extractors folder
// out: an array of testresults as returned by the testcases
var fileNames = [],
	allResults = [];


// --------------------------
// a simple HTTP server functions a the PME site host for
// the duration of the test.
function startLocalPMEServer() {
	debugLog("starting local PME server at", testUtil.PME_SERVER_HOST + ":" + testUtil.PME_SERVER_PORT);

	localPMEServer = http.createServer(function(request, response) {
		var url = parseUrl(request.url),
			filePath = '..' + unescape(url.pathname);
			extension = path.extname(filePath).toLowerCase();

		debugLog("local server request:", url.pathname);

		function fail() {
			response.writeHead(404);
			response.end();
		}

		if (extension != ".js")
			return fail();

		fs.exists(filePath, function(exists) {
			if (! exists)
				return fail();

			fs.readFile(filePath, function(error, content) {
				if (error)
					fail();
				else {
					response.writeHead(200, { "Content-Type": "text/javascript" });
					response.end(content, "utf-8");
				}
			});
		});
	});

	localPMEServer.listen(testUtil.PME_SERVER_PORT); // defined in test_util.js
}


// called at script end (failing to do so will cause node to not terminate)
function stopLocalPMEServer() {
	debugLog("stopping local PME server");
	if (localPMEServer) {
		localPMEServer.close(function() {
			debugLog("local PME server stopped");
		});
	}
	localPMEServer = null;
}


// --------------------------
// escape base html characters in output to JSON to it doesn't cause
// problems when the JSON is embedded in a page.

// read the result template html, replace placeholders in the file and
// write out the result to a new report.
function instantiateReport(fields, then) {
	fs.readFile("test-result-template.html", { encoding: "utf-8" },
		function(err, template) {
			template = template.replace(/%%([A-Z_]+)%%/g, function(_, field) {
				var value = fields[field] || ("NO_SUCH_FIELD: " + field);
				return value.replace(/<\//g, "<_");
			});

			var fileName = "results-"+ jenkinsBuildNumber+".html";

			fs.writeFile("reports/" + fileName, template, then);
		}
	);
}


// --------------------------
// syntesize a failed TestResult when we cannot get the result back from
// the child process
function translatorError(fileName, message) {
	var result = new testUtil.TestResult(fileName);
	result.fatalError(message);
	return result;
}


// run the testcases for a single translator
// the testcases are run in a separate process and the results are
// returned to us in JSON form at the end of the stdout
function runTranslatorTestCases(fileName, then) {
	var child = exec(
		PHANTOMJS_PATH + " run-testcases-single.js " + fileName,
		{
			timeout: TEST_WAIT_SECONDS * 1000
		},
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

	// pipe the stdout of the single test runner process to our stdout
	if (DEBUG) {
		child.stdout.setEncoding("utf-8");
		child.stdout.on("data", function(chunk) {
			console.info(chunk.replace(/[\n\r]+$/, ""));
		});
	}
}


// called when all tests have completed. collects information about
// the current context and creates a new template html
function didCompleteTranslators() {
	var resultJSON = JSON.stringify(allResults),
		dateTime = JSON.stringify(new Date()).replace('"', "").replace("T"," ").substring(0,19); // yields string like: 2014-01-23 12:34:56

	stopLocalPMEServer();

	debugLog("translators done, creating report html");

	exec("git rev-parse --short HEAD", function(err, gitRevision) {
		exec("git rev-parse --abbrev-ref HEAD", function(err2, gitBranch) {
			if (err || err2) {
				debugLog("could not get git info", err, err2);
				return;
			}
			gitBranch = gitBranch.trim(); // shell output may have newlines etc
			gitRevision = gitRevision.trim();
			debugLog("git info:", gitBranch, gitRevision);

			instantiateReport({
				DATETIME: dateTime,
				RESULT_JSON: resultJSON,
				GIT_BRANCH: gitBranch,
				GIT_REVISION: gitRevision
			},
			function(err3) {
				if (err3)
					debugLog("could not write report", err3);
				else
					debugLog("report written");
			});
		});		
	});
}


// driver function, iterate over the translators serially
// and call completion handler when all are done.
function nextTranslator() {
	if (! fileNames.length) {
		debugLog("all translators done");
		didCompleteTranslators();
	}
	else {
		debugLog("----------------------------------------------------------");
		debugLog("next translator: ", fileNames[0]);
		frunTranslatorTestCases(fileNames.shift(), nextTranslator);
	}
}


// --------------------------
// main

var args = process.argv.slice(2),
	jenkinsBuildNumber = args.length > 0 ? args[0] : 1;
fs.readdir("../extractors/", function(err, files) {
	fileNames = files.filter(function(f) {
		return f.toLowerCase().substr(-3) == ".js";
	});

	if (TRANSLATOR_LIMIT > 0) {
		debugLog("TRANSLATOR_LIMIT was set, limiting to", TRANSLATOR_LIMIT, "translator(s)");
		fileNames.splice(TRANSLATOR_LIMIT);
	}

	startLocalPMEServer();
	nextTranslator();
});
