/******** BEGIN zotero_config.js ********/
/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2011 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://zotero.org

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/

const ZOTERO_CONFIG = {
	REPOSITORY_URL: 'http://pme.proquest.com',
	API_URL: 'http://localhost:8080/',//change this to review instance e.g. http://ec2-23-20-68-31.compute-1.amazonaws.com
	LOGIN_URL: 'http://localhost:8080/login/',//change this to review instance e.g. http://ec2-23-20-68-31.compute-1.amazonaws.com/login/
	BOOKMARKLET_ORIGIN : 'https://s3.amazonaws.com/pme.proquest.com',//change this to the url you're using for the bookmark https://s3.amazonaws.com/pme.proquest.com/review/new-pme
	HTTP_BOOKMARKLET_ORIGIN : 'http://pme.proquest.com',//change this to the url you're using for the bookmark https://pme.proquest.com/review/new-pme
	BOOKMARKLET_URL: 'https://s3.amazonaws.com/pme.proquest.com/',//change this to the url you're using for the bookmark https://s3.amazonaws.com/pme.proquest.com/review/new-pme
	HTTP_BOOKMARKLET_URL: 'http://pme.proquest.com/',//change this to the url you're using for the bookmark http://pme.proquest.com/review/new-pme
	AUTH_COMPLETE_URL: 'http://localhost:8080/auth_complete/',//change this to review instance e.g. http://ec2-23-20-68-31.compute-1.amazonaws.com/auth_complete/
	S3_URL: 'https://zoterofilestorage.s3.amazonaws.com/'
};
Zotero.isBookmarklet = true;

/******** END zotero_config.js ********/

/******** BEGIN zotero.js ********/
/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2011 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://zotero.org

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/

var Zotero = new function() {
	this.isConnector = true;
	this.isFx = window.navigator.userAgent.indexOf("Netscape") !== -1;
	this.isChrome = !!window.chrome;
	this.isSafari = window.navigator.userAgent.indexOf("Safari/") !== -1 && !this.isChrome;
	this.isWebKit = window.navigator.userAgent.toLowerCase().indexOf("webkit") !== -1;
	this.isIE = document && !document.evaluate;
	this.version = "3.0.999";

	if(this.isFx) {
		this.browser = "g";
	} else if(this.isSafari) {
		this.browser = "s";
	} else if(this.isIE) {
		this.browser = "i";
	} else {
		this.browser = "c";
	}

	/**
	 * Initializes Zotero services for the global page in Chrome or Safari
	 */
	this.initGlobal = function() {
		Zotero.isBackground = true;
		Zotero.Debug.init();
		Zotero.Messaging.init();
		Zotero.Connector_Types.init();
		Zotero.Repo.init();
	};

	/**
	 * Initializes Zotero services for injected pages and the inject side of the bookmarklet
	 */
	this.initInject = function() {
		Zotero.isInject = true;
		Zotero.Debug.init();
		Zotero.Messaging.init();
		Zotero.Connector_Types.init();
	};


	/**
	 * Get versions, platform, etc.
	 *
	 * Can be used synchronously or asynchronously.
	 */
	this.getSystemInfo = function(callback) {
		var info = {
			connector: "true",
			version: this.version,
			platform: navigator.platform,
			locale: navigator.language,
			appVersion: navigator.appVersion
		};

		if(this.isChrome) {
			info.appName = "Chrome";
		} else if(this.isSafari) {
			info.appName = "Safari";
		} else if(this.isIE) {
			info.appName = "Internet Explorer";
		} else {
			info.appName = window.navigator.appName;
		}

		var str = '';
		for (var key in info) {
			str += key + ' => ' + info[key] + ', ';
		}
		str = str.substr(0, str.length - 2);
		callback(str);
	};

	/**
	 * Writes a line to the debug console
	 */
	this.debug = function(message, level) {
		Zotero.Debug.log(message, level);
	};

	this.logError = function(err) {
		if(!window.console) return;

		// Firefox uses this
		var fileName = (err.fileName ? err.fileName : null);
		var lineNumber = (err.lineNumber ? err.lineNumber : null);

		// Safari uses this
		if(!fileName && err.sourceURL) fileName = err.sourceURL;
		if(!lineNumber && err.line) lineNumber = err.line;

		// Chrome only gives a stack
		if(!fileName && !lineNumber && err.stack) {
			const stackRe = /^\s+at (?:[^(\n]* \()?([^\n]*):([0-9]+):([0-9]+)\)?$/m;
			var m = stackRe.exec(err.stack);
			if(m) {
				fileName = m[1];
				lineNumber = m[2];
			}
		}

		if(!fileName && !lineNumber && Zotero.isIE && typeof err === "object") {
			// IE can give us a line number if we re-throw the exception, but we wrap this in a
			// setTimeout call so that we won't throw in the middle of a function
			window.setTimeout(function() {
				window.onerror = function(errmsg, fileName, lineNumber) {
					try {
						Zotero.Errors.log("message" in err ? err.message : err.toString(), fileName, lineNumber);
					} catch(e) {};
					return true;
				};
				throw err;
				window.onerror = undefined;
			}, 0);
			return;
		}

		if(fileName && lineNumber) {
			console.error(err+" at "+fileName+":"+lineNumber);
		} else {
			console.error(err);
		}

		Zotero.Errors.log(err.message ? err.message : err.toString(), fileName, lineNumber);
	};
}

Zotero.Prefs = new function() {
	const DEFAULTS = {
		"debug.log":true,
		"debug.stackTrace":false,
		"debug.store":false,
		"debug.store.limit":750000,
		"debug.level":5,
		"debug.time":false,
		"downloadAssociatedFiles":true,
		"automaticSnapshots":true,
		"connector.repo.lastCheck.localTime":0,
		"connector.repo.lastCheck.repoTime":0,
		"capitalizeTitles":false
	};

	this.get = function(pref) {
		try {
			if(localStorage["pref-"+pref]) return JSON.parse(localStorage["pref-"+pref]);
		} catch(e) {}
		if(DEFAULTS.hasOwnProperty(pref)) return DEFAULTS[pref];
		throw "Zotero.Prefs: Invalid preference "+pref;
	};

	this.getCallback = function(pref, callback) {
		if(typeof pref === "object") {
			var prefData = {};
			for(var i=0; i<pref.length; i++) {
				prefData[pref[i]] = Zotero.Prefs.get(pref[i]);
			}
			callback(prefData);
		} else {
			callback(Zotero.Prefs.get(pref));
		}
	};

	this.set = function(pref, value) {
		Zotero.debug("Setting "+pref+" to "+JSON.stringify(value));
		localStorage["pref-"+pref] = JSON.stringify(value);
	};
}
/******** END zotero.js ********/

/******** BEGIN debug.js ********/
/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2009 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://zotero.org

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/


Zotero.Debug = new function () {
	var _console, _consolePref, _stackTrace, _store, _level, _time, _lastTime, _output = [];

	this.init = function (forceDebugLog) {
		_consolePref = Zotero.Prefs.get('debug.log');
		_console = _consolePref || forceDebugLog;
		_store = Zotero.Prefs.get('debug.store');
		if (_store) {
			Zotero.Prefs.set('debug.store', false);
		}
		_level = Zotero.Prefs.get('debug.level');
		_time = forceDebugLog || Zotero.Prefs.get('debug.time');
		_stackTrace = Zotero.Prefs.get('debug.stackTrace');

		this.storing = _store;
		this.enabled = _console || _store;
	}

	this.log = function (message, level) {
		if (!_console && !_store) {
			return;
		}

		if (typeof message != 'string') {
			message = Zotero.Utilities.varDump(message);
		}

		if (!level) {
			level = 3;
		}

		// If level above debug.level value, don't display
		if (level > _level) {
			return;
		}

		var deltaStr = '';
		if (_time || _store) {
			var delta = 0;
			var d = new Date();
			if (_lastTime) {
				delta = d - _lastTime;
			}
			_lastTime = d;

			while (("" + delta).length < 7) {
				delta = '0' + delta;
			}

			deltaStr = '(+' + delta + ')';
		}

		if (_stackTrace) {
			var stack = (new Error()).stack;
			var nl1Index = stack.indexOf("\n")
			var nl2Index = stack.indexOf("\n", nl1Index+1);
			var line2 = stack.substring(nl1Index+2, nl2Index-1);
			var debugLine = line2.substr(line2.indexOf("@"));

			stack = stack.substring(nl2Index, stack.length-1);
			message += "\n"+debugLine+stack;
		}

		if (_console) {
			var output = 'zotero(' + level + ')' + (_time ? deltaStr : '') + ': ' + message;
			if(Zotero.isFx && !Zotero.isBookmarklet) {
				// On Windows, where the text console (-console) is inexplicably glacial,
				// log to the Browser Console instead if only the -ZoteroDebug flag is used.
				// Developers can use the debug.log/debug.time prefs and the Cygwin text console.
				//
				// TODO: Get rid of the filename and line number
				if (!_consolePref && Zotero.isWin && !Zotero.isStandalone) {
					var console = Components.utils.import("resource://gre/modules/devtools/Console.jsm", {}).console;
					console.log(output);
				}
				// Otherwise dump to the text console
				else {
					dump(output + "\n\n");
				}
			} else if(window.console) {
				window.console.log(output);
			}
		}
		if (_store) {
			if (Math.random() < 1/1000) {
				// Remove initial lines if over limit
				var overage = this.count() - Zotero.Prefs.get('debug.store.limit');
				if (overage > 0) {
					_output.splice(0, Math.abs(overage));
				}
			}
			_output.push('(' + level + ')' + deltaStr + ': ' + message);
		}
	}


	this.get = function (maxChars, maxLineLength) {
		var output = _output;
		var total = output.length;

		if (total == 0) {
			return "";
		}

		if (maxLineLength) {
			for (var i=0, len=output.length; i<len; i++) {
				if (output[i].length > maxLineLength) {
					output[i] = Zotero.Utilities.ellipsize(output[i], maxLineLength, true);
				}
			}
		}

		output = output.join('\n\n');

		if (maxChars) {
			output = output.substr(maxChars * -1);
			// Cut at two newlines
			for (var i=1, len=output.length; i<len; i++) {
				if (output[i] == '\n' && output[i-1] == '\n') {
					output = output.substr(i + 1);
					break;
				}
			}
		}

		if(Zotero.getErrors) {
			return Zotero.getErrors(true).join('\n\n') +
					"\n\n" + Zotero.getSystemInfo() + "\n\n" +
					"=========================================================\n\n" +
					output;
		} else {
			return output;
		}
	}


	this.setStore = function (enable) {
		if (enable) {
			this.clear();
		}
		_store = enable;

		this.storing = _store;
		this.enabled = _console || _store;
	}


	this.count = function () {
		return _output.length;
	}


	this.clear = function () {
		_output = [];
	}
}

/******** END debug.js ********/
/******** BEGIN errors_webkit.js ********/
/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2009 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://zotero.org

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/

Zotero.Errors = new function() {
	var _output = [];

	/**
	 * Error handler
	 * @param {String} string Error string
	 * @param {String} url URL of error
	 * @param {Number} line Line where error occurred
	 */
	this.log = function(string, url, line) {
		var err = ['[JavaScript Error: "', string, '"'];
		if(url || line) {
			var info = [];
			if(url) info.push('file: "'+url+'"');
			if(line) info.push('line: '+line);
			err.push(" {"+info.join(" ")+"}");
		}
		err.push("]");
		err = err.join("");
		_output.push(err);
	}

	/**
	 * Gets errors as an array of strings
	 */
	this.getErrors = function(callback) {
		callback(_output.slice());
	}

	/**
	 * Sends an error report to the server
	 */
	this.sendErrorReport = function(callback) {
		Zotero.getSystemInfo(function(info) {
			var parts = {
				error: "true",
				errorData: _output.join('\n'),
				extraData: '',
				diagnostic: info
			};

			var body = '';
			for (var key in parts) {
				body += key + '=' + encodeURIComponent(parts[key]) + '&';
			}
			body = body.substr(0, body.length - 1);
			Zotero.HTTP.doPost("http://www.zotero.org/repo/report", body, function(xmlhttp) {
				if(!xmlhttp.responseXML){
					try {
						if (xmlhttp.status>1000){
							callback(false, 'No network connection');
						}
						else {
							callback(false, 'Invalid response from repository');
						}
					}
					catch (e){
						callback(false, 'Repository cannot be contacted');
					}
					return;
				}

				var reported = xmlhttp.responseXML.getElementsByTagName('reported');
				if (reported.length != 1) {
					callback(false, 'Invalid response from repository');
					return;
				}

				callback(true, reported[0].getAttribute('reportID'));
			});
		});
	}
}
/******** END errors_webkit.js ********/
/******** BEGIN http.js ********/
/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2011 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://zotero.org

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/

/**
 * Functions for performing HTTP requests, both via XMLHTTPRequest and using a hidden browser
 * @namespace
 */
Zotero.HTTP = new function() {
	/**
	* Send an HTTP GET request via XMLHTTPRequest
	*
	* @param {nsIURI|String}	url				URL to request
	* @param {Function} 		onDone			Callback to be executed upon request completion
	* @return {Boolean} True if the request was sent, or false if the browser is offline
	*/
	this.doGet = function(url, onDone, responseCharset) {
		if(Zotero.isInject && !Zotero.HTTP.isSameOrigin(url)) {
			if(Zotero.isBookmarklet) {
				Zotero.debug("Attempting cross-site request from bookmarklet; this may fail");
			} else if(Zotero.isSafari || Zotero.HTTP.isLessSecure(url)) {
				Zotero.COHTTP.doGet(url, onDone, responseCharset);
				return;
			}
		}

		Zotero.debug("HTTP GET " + url);

		var xmlhttp = new XMLHttpRequest();
		try {
			xmlhttp.open('GET', url, true);

			if(xmlhttp.overrideMimeType && responseCharset) {
				xmlhttp.overrideMimeType("text/plain; charset=" + responseCharset);
			}

			/** @ignore */
			xmlhttp.onreadystatechange = function() {
				_stateChange(xmlhttp, onDone);
			};
			xmlhttp.send(null);
		} catch(e) {
			Zotero.logError(e);
			if(onDone) {
				window.setTimeout(function() {
					try {
						onDone({"status":0, "responseText":""});
					} catch(e) {
						Zotero.logError(e);
						return;
					}
				}, 0);
			}
		}

		return xmlhttp;
	}

	/**
	* Send an HTTP POST request via XMLHTTPRequest
	*
	* @param {String} url URL to request
	* @param {String} body Request body
	* @param {Function} onDone Callback to be executed upon request completion
	* @param {String} headers Request HTTP headers
	* @return {Boolean} True if the request was sent, or false if the browser is offline
	*/
	this.doPost = function(url, body, onDone, headers, responseCharset) {
		if(Zotero.isInject && !Zotero.HTTP.isSameOrigin(url)) {
			if(Zotero.isBookmarklet) {
				Zotero.debug("Attempting cross-site request from bookmarklet; this may fail");
			} else if(Zotero.isSafari || Zotero.HTTP.isLessSecure(url)) {
				Zotero.COHTTP.doPost(url, body, onDone, headers, responseCharset);
				return;
			}
		}

		var bodyStart = body.substr(0, 1024);
		Zotero.debug("HTTP POST "
			+ (body.length > 1024 ?
				bodyStart + '... (' + body.length + ' chars)' : bodyStart)
			+ " to " + url);

		var xmlhttp = new XMLHttpRequest();
		try {
			xmlhttp.open('POST', url, true);

			if (!headers) headers = {};
			if (!headers["Content-Type"]) {
				headers["Content-Type"] = "application/x-www-form-urlencoded";
			}

			for (var header in headers) {
				xmlhttp.setRequestHeader(header, headers[header]);
			}

			if(xmlhttp.overrideMimeType && responseCharset) {
				xmlhttp.overrideMimeType("text/plain; charset=" + responseCharset);
			}

			/** @ignore */
			xmlhttp.onreadystatechange = function(){
				_stateChange(xmlhttp, onDone);
			};

			xmlhttp.send(body);
		} catch(e) {
			Zotero.logError(e);
			if(onDone) {
				window.setTimeout(function() {
					try {
						onDone({"status":0, "responseText":""});
					} catch(e) {
						Zotero.logError(e);
						return;
					}
				}, 0);
			}
		}

		return xmlhttp;
	}

	/**
	 * Handler for XMLHttpRequest state change
	 *
	 * @param {nsIXMLHttpRequest} XMLHttpRequest whose state just changed
	 * @param {Function} [onDone] Callback for request completion
	 * @param {String} [responseCharset] Character set to force on the response
	 * @private
	 */
	function _stateChange(xmlhttp, callback) {
		switch (xmlhttp.readyState){
			// Request not yet made
			case 1:
				break;

			case 2:
				break;

			// Called multiple times while downloading in progress
			case 3:
				break;

			// Download complete
			case 4:
				if (callback) {
					try {
						callback(xmlhttp);
					} catch(e) {
						Zotero.logError(e);
						return;
					}
				}
			break;
		}
	}
}

// Alias as COHTTP = Cross-origin HTTP; this is how we will call it from children
// For injected scripts, this get overwritten in messaging.js (see messages.js)
Zotero.COHTTP = {
	"doGet":Zotero.HTTP.doGet,
	"doPost":Zotero.HTTP.doPost
};

/******** END http.js ********/
/******** BEGIN xregexp.js ********/
/*!
 * XRegExp 3.0.0-pre
 * <http://xregexp.com/>
 * Steven Levithan © 2007-2012 MIT License
 */

/**
 * XRegExp provides augmented, extensible regular expressions. You get new syntax, flags, and
 * methods beyond what browsers support natively. XRegExp is also a regex utility belt with tools
 * to make your client-side grepping simpler and more powerful, while freeing you from worrying
 * about pesky cross-browser inconsistencies and the dubious `lastIndex` property.
 */
var XRegExp = (function(undefined) {
    'use strict';

/* ==============================
 * Private variables
 * ============================== */

    var // ...

// Property name used for extended regex instance data
    REGEX_DATA = 'xregexp',

// Internal reference to the `XRegExp` object
    self,

// Optional features that can be installed and uninstalled
    features = {
        astral: false,
        natives: false
    },

// Store native methods to use and restore ('native' is an ES3 reserved keyword)
    nativ = {
        exec: RegExp.prototype.exec,
        test: RegExp.prototype.test,
        match: String.prototype.match,
        replace: String.prototype.replace,
        split: String.prototype.split
    },

// Storage for fixed/extended native methods
    fixed = {},

// Storage for regexes cached by `XRegExp.cache`
    cache = {},

// Storage for pattern details cached by the `XRegExp` constructor
    patternCache = {},

// Storage for regex syntax tokens added internally or by `XRegExp.addToken`
    tokens = [],

// Token scopes
    defaultScope = 'default',
    classScope = 'class',

// Regexes that match native regex syntax, including octals
    nativeTokens = {
        // Any native multicharacter token in default scope, or any single character
        'default': /\\(?:0(?:[0-3][0-7]{0,2}|[4-7][0-7]?)?|[1-9]\d*|x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|c[A-Za-z]|[\s\S])|\(\?[:=!]|[?*+]\?|{\d+(?:,\d*)?}\??|[\s\S]/,
        // Any native multicharacter token in character class scope, or any single character
        'class': /\\(?:[0-3][0-7]{0,2}|[4-7][0-7]?|x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|c[A-Za-z]|[\s\S])|[\s\S]/
    },

// Any backreference or dollar-prefixed character in replacement strings
    replacementToken = /\$(?:{([\w$]+)}|(\d\d?|[\s\S]))/g,

// Check for correct `exec` handling of nonparticipating capturing groups
    correctExecNpcg = nativ.exec.call(/()??/, '')[1] === undefined,

// Check for flag y support
    hasNativeY = RegExp.prototype.sticky !== undefined,

// Tracker for known flags, including addon flags
    registeredFlags = {
        g: true,
        i: true,
        m: true,
        y: hasNativeY
    },

// Shortcut to `Object.prototype.toString`
    toString = {}.toString,

// Shortcut to `XRegExp.addToken`
    add;

/* ==============================
 * Private functions
 * ============================== */

/**
 * Attaches named capture data and `XRegExp.prototype` properties to a regex object.
 * @private
 * @param {RegExp} regex Regex to augment.
 * @param {Array} captureNames Array with capture names, or `null`.
 * @param {Boolean} [addProto=false] Whether to attach `XRegExp.prototype` properties. Not
 *   attaching properties avoids a minor performance penalty.
 * @returns {RegExp} Augmented regex.
 */
    function augment(regex, captureNames, addProto) {
        var p;

        if (addProto) {
            // Can't auto-inherit these since the XRegExp constructor returns a nonprimitive value
            if (regex.__proto__) {
                regex.__proto__ = self.prototype;
            } else {
                for (p in self.prototype) {
                    // A `self.prototype.hasOwnProperty(p)` check wouldn't be worth it here, since
                    // this is performance sensitive, and enumerable `Object.prototype` or
                    // `RegExp.prototype` extensions exist on `regex.prototype` anyway
                    regex[p] = self.prototype[p];
                }
            }
        }

        regex[REGEX_DATA] = {captureNames: captureNames};

        return regex;
    }

/**
 * Removes any duplicate characters from the provided string.
 * @private
 * @param {String} str String to remove duplicate characters from.
 * @returns {String} String with any duplicate characters removed.
 */
    function clipDuplicates(str) {
        return nativ.replace.call(str, /([\s\S])(?=[\s\S]*\1)/g, '');
    }

/**
 * Copies a regex object while preserving special properties for named capture and augmenting with
 * `XRegExp.prototype` methods. The copy has a fresh `lastIndex` property (set to zero). Allows
 * adding and removing native flags while copying the regex.
 * @private
 * @param {RegExp} regex Regex to copy.
 * @param {Object} [options] Allows specifying native flags to add or remove while copying the
 *   regex, and whether to attach `XRegExp.prototype` properties.
 * @returns {RegExp} Copy of the provided regex, possibly with modified flags.
 */
    function copy(regex, options) {
        if (!self.isRegExp(regex)) {
            throw new TypeError('Type RegExp expected');
        }

        // Get native flags in use
        var flags = nativ.exec.call(/\/([a-z]*)$/i, String(regex))[1];
        options = options || {};

        if (options.add) {
            flags = clipDuplicates(flags + options.add);
        }

        if (options.remove) {
            // Would need to escape `options.remove` if this was public
            flags = nativ.replace.call(flags, new RegExp('[' + options.remove + ']+', 'g'), '');
        }

        // Augment with `XRegExp.prototype` methods, but use the native `RegExp` constructor and
        // avoid searching for special tokens. That would be wrong for regexes constructed by
        // `RegExp`, and unnecessary for regexes constructed by `XRegExp` because the regex has
        // already undergone the translation to native regex syntax
        regex = augment(
            new RegExp(regex.source, flags),
            hasNamedCapture(regex) ? regex[REGEX_DATA].captureNames.slice(0) : null,
            options.addProto
        );

        return regex;
    }

/**
 * Returns a new copy of the object used to hold extended regex instance data, tailored for a
 * native nonaugmented regex.
 * @private
 * @returns {Object} Object with base regex instance data.
 */
    function getBaseProps() {
        return {captureNames: null};
    }

/**
 * Determines whether a regex has extended instance data used to track capture names.
 * @private
 * @param {RegExp} regex Regex to check.
 * @returns {Boolean} Whether the regex uses named capture.
 */
    function hasNamedCapture(regex) {
        return !!(regex[REGEX_DATA] && regex[REGEX_DATA].captureNames);
    }

/**
 * Returns the first index at which a given value can be found in an array.
 * @private
 * @param {Array} array Array to search.
 * @param {*} value Value to locate in the array.
 * @returns {Number} Zero-based index at which the item is found, or -1.
 */
    function indexOf(array, value) {
        // Use the native array method, if available
        if (Array.prototype.indexOf) {
            return array.indexOf(value);
        }

        var len = array.length, i;

        // Not a very good shim, but good enough for XRegExp's use of it
        for (i = 0; i < len; ++i) {
            if (array[i] === value) {
                return i;
            }
        }

        return -1;
    }

/**
 * Determines whether a value is of the specified type, by resolving its internal [[Class]].
 * @private
 * @param {*} value Object to check.
 * @param {String} type Type to check for, in TitleCase.
 * @returns {Boolean} Whether the object matches the type.
 */
    function isType(value, type) {
        return toString.call(value) === '[object ' + type + ']';
    }

/**
 * Checks whether the next nonignorable token after the specified position is a quantifier.
 * @private
 * @param {String} pattern Pattern to search within.
 * @param {Number} pos Index in `pattern` to search at.
 * @param {String} flags Flags used by the pattern.
 * @returns {Boolean} Whether the next token is a quantifier.
 */
    function isQuantifierNext(pattern, pos, flags) {
        return nativ.test.call(
            flags.indexOf('x') > -1 ?
                // Ignore any leading whitespace, line comments, and inline comments
                /^(?:\s+|#.*|\(\?#[^)]*\))*(?:[?*+]|{\d+(?:,\d*)?})/ :
                // Ignore any leading inline comments
                /^(?:\(\?#[^)]*\))*(?:[?*+]|{\d+(?:,\d*)?})/,
            pattern.slice(pos)
        );
    }

/**
 * Checks for flag-related errors, and strips/applies flags in a leading mode modifier. Offloads
 * the flag preparation logic from the `XRegExp` constructor.
 * @private
 * @param {String} pattern Regex pattern, possibly with a leading mode modifier.
 * @param {String} flags Any combination of flags.
 * @returns {Object} Object with properties `pattern` and `flags`.
 */
    function prepareFlags(pattern, flags) {
        var i;

        // Recent browsers throw on duplicate flags, so copy this behavior for nonnative flags
        if (clipDuplicates(flags) !== flags) {
            throw new SyntaxError('Invalid duplicate regex flag ' + flags);
        }

        // Strip and apply a leading mode modifier with any combination of flags except g or y
        pattern = nativ.replace.call(pattern, /^\(\?([\w$]+)\)/, function($0, $1) {
            if (nativ.test.call(/[gy]/, $1)) {
                throw new SyntaxError('Cannot use flag g or y in mode modifier ' + $0);
            }
            // Allow duplicate flags within the mode modifier
            flags = clipDuplicates(flags + $1);
            return '';
        });

        // Throw on unknown native or nonnative flags
        for (i = 0; i < flags.length; ++i) {
            if (!registeredFlags[flags.charAt(i)]) {
                throw new SyntaxError('Unknown regex flag ' + flags.charAt(i));
            }
        }

        return {
            pattern: pattern,
            flags: flags
        };
    }

/**
 * Prepares an options object from the given value.
 * @private
 * @param {String|Object} value Value to convert to an options object.
 * @returns {Object} Options object.
 */
    function prepareOptions(value) {
        value = value || {};

        if (isType(value, 'String')) {
            value = self.forEach(value, /[^\s,]+/, function(match) {
                this[match] = true;
            }, {});
        }

        return value;
    }

/**
 * Registers a flag so it doesn't throw an 'unknown flag' error.
 * @private
 * @param {String} flag Single-character flag to register.
 */
    function registerFlag(flag) {
        if (!/^[\w$]$/.test(flag)) {
            throw new Error('Flag must be a single character A-Za-z0-9_$');
        }

        registeredFlags[flag] = true;
    }

/**
 * Runs built-in and custom regex syntax tokens in reverse insertion order at the specified
 * position, until a match is found.
 * @private
 * @param {String} pattern Original pattern from which an XRegExp object is being built.
 * @param {String} flags Flags being used to construct the regex.
 * @param {Number} pos Position to search for tokens within `pattern`.
 * @param {Number} scope Regex scope to apply: 'default' or 'class'.
 * @param {Object} context Context object to use for token handler functions.
 * @returns {Object} Object with properties `matchLength`, `output`, and `reparse`; or `null`.
 */
    function runTokens(pattern, flags, pos, scope, context) {
        var i = tokens.length,
            result = null,
            match,
            t;

        // Run in reverse insertion order
        while (i--) {
            t = tokens[i];
            if (
                (t.scope === scope || t.scope === 'all') &&
                (!t.flag || flags.indexOf(t.flag) > -1)
            ) {
                match = self.exec(pattern, t.regex, pos, 'sticky');
                if (match) {
                    result = {
                        matchLength: match[0].length,
                        output: t.handler.call(context, match, scope, flags),
                        reparse: t.reparse
                    };
                    // Finished with token tests
                    break;
                }
            }
        }

        return result;
    }

/**
 * Enables or disables implicit astral mode opt-in.
 * @private
 * @param {Boolean} on `true` to enable; `false` to disable.
 */
    function setAstral(on) {
        // Reset the pattern cache used by the `XRegExp` constructor, since the same pattern and
        // flags might now produce different results
        self.cache.flush('patterns');

        features.astral = on;
    }

/**
 * Enables or disables native method overrides.
 * @private
 * @param {Boolean} on `true` to enable; `false` to disable.
 */
    function setNatives(on) {
        RegExp.prototype.exec = (on ? fixed : nativ).exec;
        RegExp.prototype.test = (on ? fixed : nativ).test;
        String.prototype.match = (on ? fixed : nativ).match;
        String.prototype.replace = (on ? fixed : nativ).replace;
        String.prototype.split = (on ? fixed : nativ).split;

        features.natives = on;
    }

/**
 * Returns the object, or throws an error if it is `null` or `undefined`. This is used to follow
 * the ES5 abstract operation `ToObject`.
 * @private
 * @param {*} value Object to check and return.
 * @returns {*} The provided object.
 */
    function toObject(value) {
        // This matches both `null` and `undefined`
        if (value == null) {
            throw new TypeError('Cannot convert null or undefined to object');
        }

        return value;
    }

/* ==============================
 * Constructor
 * ============================== */

/**
 * Creates an extended regular expression object for matching text with a pattern. Differs from a
 * native regular expression in that additional syntax and flags are supported. The returned object
 * is in fact a native `RegExp` and works with all native methods.
 * @class XRegExp
 * @constructor
 * @param {String|RegExp} pattern Regex pattern string, or an existing regex object to copy.
 * @param {String} [flags] Any combination of flags.
 *   Native flags:
 *     <li>`g` - global
 *     <li>`i` - ignore case
 *     <li>`m` - multiline anchors
 *     <li>`y` - sticky (Firefox 3+)
 *   Additional XRegExp flags:
 *     <li>`n` - explicit capture
 *     <li>`s` - dot matches all (aka singleline)
 *     <li>`x` - free-spacing and line comments (aka extended)
 *     <li>`A` - astral (requires the Unicode Base addon)
 *   Flags cannot be provided when constructing one `RegExp` from another.
 * @returns {RegExp} Extended regular expression object.
 * @example
 *
 * // With named capture and flag x
 * XRegExp('(?<year>  [0-9]{4} ) -?  # year  \n\
 *          (?<month> [0-9]{2} ) -?  # month \n\
 *          (?<day>   [0-9]{2} )     # day   ', 'x');
 *
 * // Providing a regex object copies it. Native regexes are recompiled using native (not XRegExp)
 * // syntax. Copies maintain special properties for named capture, are augmented with
 * // `XRegExp.prototype` methods, and have fresh `lastIndex` properties (set to zero).
 * XRegExp(/regex/);
 */
    self = function(pattern, flags) {
        var context = {
                hasNamedCapture: false,
                captureNames: []
            },
            scope = defaultScope,
            output = '',
            pos = 0,
            result,
            token,
            key;

        if (self.isRegExp(pattern)) {
            if (flags !== undefined) {
                throw new TypeError('Cannot supply flags when copying a RegExp');
            }
            return copy(pattern, {addProto: true});
        }

        // Copy the argument behavior of `RegExp`
        pattern = pattern === undefined ? '' : String(pattern);
        flags = flags === undefined ? '' : String(flags);

        // Cache-lookup key; intentionally using an invalid regex sequence as the separator
        key = pattern + '***' + flags;

        if (!patternCache[key]) {
            // Check for flag-related errors, and strip/apply flags in a leading mode modifier
            result = prepareFlags(pattern, flags);
            pattern = result.pattern;
            flags = result.flags;

            // Use XRegExp's syntax tokens to translate the pattern to a native regex pattern...
            // `pattern.length` may change on each iteration, if tokens use the `reparse` option
            while (pos < pattern.length) {
                do {
                    // Check for custom tokens at the current position
                    result = runTokens(pattern, flags, pos, scope, context);
                    // If the matched token used the `reparse` option, splice its output into the
                    // pattern before running tokens again at the same position
                    if (result && result.reparse) {
                        pattern = pattern.slice(0, pos) +
                            result.output +
                            pattern.slice(pos + result.matchLength);
                    }
                } while (result && result.reparse);

                if (result) {
                    output += result.output;
                    pos += (result.matchLength || 1);
                } else {
                    // Get the native token at the current position
                    token = self.exec(pattern, nativeTokens[scope], pos, 'sticky')[0];
                    output += token;
                    pos += token.length;
                    if (token === '[' && scope === defaultScope) {
                        scope = classScope;
                    } else if (token === ']' && scope === classScope) {
                        scope = defaultScope;
                    }
                }
            }

            patternCache[key] = {
                // Cleanup token cruft: repeated `(?:)(?:)` and leading/trailing `(?:)`
                pattern: nativ.replace.call(output, /\(\?:\)(?=\(\?:\))|^\(\?:\)|\(\?:\)$/g, ''),
                // Strip all but native flags
                flags: nativ.replace.call(flags, /[^gimy]+/g, ''),
                // `context.captureNames` has an item for each capturing group, even if unnamed
                captures: context.hasNamedCapture ? context.captureNames : null
            }
        }

        key = patternCache[key];
        return augment(new RegExp(key.pattern, key.flags), key.captures, /*addProto*/ true);
    };

// Add `RegExp.prototype` to the prototype chain
    self.prototype = new RegExp;

/* ==============================
 * Public properties
 * ============================== */

/**
 * The XRegExp version number.
 * @static
 * @memberOf XRegExp
 * @type String
 */
    self.version = '3.0.0-pre';

/* ==============================
 * Public methods
 * ============================== */

/**
 * Extends XRegExp syntax and allows custom flags. This is used internally and can be used to
 * create XRegExp addons. If more than one token can match the same string, the last added wins.
 * @memberOf XRegExp
 * @param {RegExp} regex Regex object that matches the new token.
 * @param {Function} handler Function that returns a new pattern string (using native regex syntax)
 *   to replace the matched token within all future XRegExp regexes. Has access to persistent
 *   properties of the regex being built, through `this`. Invoked with three arguments:
 *   <li>The match array, with named backreference properties.
 *   <li>The regex scope where the match was found: 'default' or 'class'.
 *   <li>The flags used by the regex, including any flags in a leading mode modifier.
 *   The handler function becomes part of the XRegExp construction process, so be careful not to
 *   construct XRegExps within the function or you will trigger infinite recursion.
 * @param {Object} [options] Options object with optional properties:
 *   <li>`scope` {String} Scope where the token applies: 'default', 'class', or 'all'.
 *   <li>`flag` {String} Single-character flag that triggers the token. This also registers the
 *     flag, which prevents XRegExp from throwing an 'unknown flag' error when the flag is used.
 *   <li>`optionalFlags` {String} Any custom flags checked for within the token `handler` that are
 *     not required to trigger the token. This registers the flags, to prevent XRegExp from
 *     throwing an 'unknown flag' error when any of the flags are used.
 *   <li>`reparse` {Boolean} Whether the `handler` function's output should not be treated as
 *     final, and instead be reparseable by other tokens (including the current token). Allows
 *     token chaining or deferring.
 * @example
 *
 * // Basic usage: Add \a for the ALERT control code
 * XRegExp.addToken(
 *   /\\a/,
 *   function() {return '\\x07';},
 *   {scope: 'all'}
 * );
 * XRegExp('\\a[\\a-\\n]+').test('\x07\n\x07'); // -> true
 *
 * // Add the U (ungreedy) flag from PCRE and RE2, which reverses greedy and lazy quantifiers
 * XRegExp.addToken(
 *   /([?*+]|{\d+(?:,\d*)?})(\??)/,
 *   function(match) {return match[1] + (match[2] ? '' : '?');},
 *   {flag: 'U'}
 * );
 * XRegExp('a+', 'U').exec('aaa')[0]; // -> 'a'
 * XRegExp('a+?', 'U').exec('aaa')[0]; // -> 'aaa'
 */
    self.addToken = function(regex, handler, options) {
        options = options || {};
        var optionalFlags = options.optionalFlags, i;

        if (options.flag) {
            registerFlag(options.flag);
        }

        if (optionalFlags) {
            optionalFlags = nativ.split.call(optionalFlags, '');
            for (i = 0; i < optionalFlags.length; ++i) {
                registerFlag(optionalFlags[i]);
            }
        }

        // Add to the private list of syntax tokens
        tokens.push({
            regex: copy(regex, {add: 'g' + (hasNativeY ? 'y' : '')}),
            handler: handler,
            scope: options.scope || defaultScope,
            flag: options.flag,
            reparse: options.reparse
        });

        // Reset the pattern cache used by the `XRegExp` constructor, since the same pattern and
        // flags might now produce different results
        self.cache.flush('patterns');
    };

/**
 * Caches and returns the result of calling `XRegExp(pattern, flags)`. On any subsequent call with
 * the same pattern and flag combination, the cached copy of the regex is returned.
 * @memberOf XRegExp
 * @param {String} pattern Regex pattern string.
 * @param {String} [flags] Any combination of XRegExp flags.
 * @returns {RegExp} Cached XRegExp object.
 * @example
 *
 * while (match = XRegExp.cache('.', 'gs').exec(str)) {
 *   // The regex is compiled once only
 * }
 */
    self.cache = function(pattern, flags) {
        var key = pattern + '***' + (flags || '');
        return cache[key] || (cache[key] = self(pattern, flags));
    };

// Intentionally undocumented
    self.cache.flush = function(cacheName) {
        if (cacheName === 'patterns') {
            // Flush the pattern cache used by the `XRegExp` constructor
            patternCache = {};
        } else {
            // Flush the regex object cache populated by `XRegExp.cache`
            cache = {};
        }
    };

/**
 * Escapes any regular expression metacharacters, for use when matching literal strings. The result
 * can safely be used at any point within a regex that uses any flags.
 * @memberOf XRegExp
 * @param {String} str String to escape.
 * @returns {String} String with regex metacharacters escaped.
 * @example
 *
 * XRegExp.escape('Escaped? <.>');
 * // -> 'Escaped\?\ <\.>'
 */
    self.escape = function(str) {
        return nativ.replace.call(toObject(str), /[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    };

/**
 * Executes a regex search in a specified string. Returns a match array or `null`. If the provided
 * regex uses named capture, named backreference properties are included on the match array.
 * Optional `pos` and `sticky` arguments specify the search start position, and whether the match
 * must start at the specified position only. The `lastIndex` property of the provided regex is not
 * used, but is updated for compatibility. Also fixes browser bugs compared to the native
 * `RegExp.prototype.exec` and can be used reliably cross-browser.
 * @memberOf XRegExp
 * @param {String} str String to search.
 * @param {RegExp} regex Regex to search with.
 * @param {Number} [pos=0] Zero-based index at which to start the search.
 * @param {Boolean|String} [sticky=false] Whether the match must start at the specified position
 *   only. The string `'sticky'` is accepted as an alternative to `true`.
 * @returns {Array} Match array with named backreference properties, or `null`.
 * @example
 *
 * // Basic use, with named backreference
 * var match = XRegExp.exec('U+2620', XRegExp('U\\+(?<hex>[0-9A-F]{4})'));
 * match.hex; // -> '2620'
 *
 * // With pos and sticky, in a loop
 * var pos = 2, result = [], match;
 * while (match = XRegExp.exec('<1><2><3><4>5<6>', /<(\d)>/, pos, 'sticky')) {
 *   result.push(match[1]);
 *   pos = match.index + match[0].length;
 * }
 * // result -> ['2', '3', '4']
 */
    self.exec = function(str, regex, pos, sticky) {
        var cacheFlags = 'g', match, r2;

        if (hasNativeY && (sticky || (regex.sticky && sticky !== false))) {
            cacheFlags += 'y';
        }

        regex[REGEX_DATA] = regex[REGEX_DATA] || getBaseProps();

        // Shares cached copies with `XRegExp.match`/`replace`
        r2 = regex[REGEX_DATA][cacheFlags] || (
            regex[REGEX_DATA][cacheFlags] = copy(regex, {
                add: cacheFlags,
                remove: sticky === false ? 'y' : ''
            })
        );

        r2.lastIndex = pos = pos || 0;

        // Fixed `exec` required for `lastIndex` fix, named backreferences, etc.
        match = fixed.exec.call(r2, str);

        if (sticky && match && match.index !== pos) {
            match = null;
        }

        if (regex.global) {
            regex.lastIndex = match ? r2.lastIndex : 0;
        }

        return match;
    };

/**
 * Executes a provided function once per regex match.
 * @memberOf XRegExp
 * @param {String} str String to search.
 * @param {RegExp} regex Regex to search with.
 * @param {Function} callback Function to execute for each match. Invoked with four arguments:
 *   <li>The match array, with named backreference properties.
 *   <li>The zero-based match index.
 *   <li>The string being traversed.
 *   <li>The regex object being used to traverse the string.
 * @param {*} [context] Object to use as `this` when executing `callback`.
 * @returns {*} Provided `context` object.
 * @example
 *
 * // Extracts every other digit from a string
 * XRegExp.forEach('1a2345', /\d/, function(match, i) {
 *   if (i % 2) this.push(+match[0]);
 * }, []);
 * // -> [2, 4]
 */
    self.forEach = function(str, regex, callback, context) {
        var pos = 0,
            i = -1,
            match;

        while ((match = self.exec(str, regex, pos))) {
            // Because `regex` is provided to `callback`, the function can use the deprecated/
            // nonstandard `RegExp.prototype.compile` to mutate the regex. However, since
            // `XRegExp.exec` doesn't use `lastIndex` to set the search position, this can't lead
            // to an infinite loop, at least. Actually, because of the way `XRegExp.exec` caches
            // globalized versions of regexes, mutating the regex will not have any effect on the
            // iteration or matched strings, which is a nice side effect that brings extra safety
            callback.call(context, match, ++i, str, regex);

            pos = match.index + (match[0].length || 1);
        }

        return context;
    };

/**
 * Copies a regex object and adds flag `g`. The copy maintains special properties for named
 * capture, is augmented with `XRegExp.prototype` methods, and has a fresh `lastIndex` property
 * (set to zero). Native regexes are not recompiled using XRegExp syntax.
 * @memberOf XRegExp
 * @param {RegExp} regex Regex to globalize.
 * @returns {RegExp} Copy of the provided regex with flag `g` added.
 * @example
 *
 * var globalCopy = XRegExp.globalize(/regex/);
 * globalCopy.global; // -> true
 */
    self.globalize = function(regex) {
        return copy(regex, {add: 'g', addProto: true});
    };

/**
 * Installs optional features according to the specified options. Can be undone using
 * {@link #XRegExp.uninstall}.
 * @memberOf XRegExp
 * @param {Object|String} options Options object or string.
 * @example
 *
 * // With an options object
 * XRegExp.install({
 *   // Enables support for astral code points in Unicode addons (implicitly sets flag A)
 *   astral: true,
 *
 *   // Overrides native regex methods with fixed/extended versions that support named
 *   // backreferences and fix numerous cross-browser bugs
 *   natives: true
 * });
 *
 * // With an options string
 * XRegExp.install('astral natives');
 */
    self.install = function(options) {
        options = prepareOptions(options);

        if (!features.astral && options.astral) {
            setAstral(true);
        }

        if (!features.natives && options.natives) {
            setNatives(true);
        }
    };

/**
 * Checks whether an individual optional feature is installed.
 * @memberOf XRegExp
 * @param {String} feature Name of the feature to check. One of:
 *   <li>`natives`
 *   <li>`astral`
 * @returns {Boolean} Whether the feature is installed.
 * @example
 *
 * XRegExp.isInstalled('natives');
 */
    self.isInstalled = function(feature) {
        return !!(features[feature]);
    };

/**
 * Returns `true` if an object is a regex; `false` if it isn't. This works correctly for regexes
 * created in another frame, when `instanceof` and `constructor` checks would fail.
 * @memberOf XRegExp
 * @param {*} value Object to check.
 * @returns {Boolean} Whether the object is a `RegExp` object.
 * @example
 *
 * XRegExp.isRegExp('string'); // -> false
 * XRegExp.isRegExp(/regex/i); // -> true
 * XRegExp.isRegExp(RegExp('^', 'm')); // -> true
 * XRegExp.isRegExp(XRegExp('(?s).')); // -> true
 */
    self.isRegExp = function(value) {
        return toString.call(value) === '[object RegExp]';
        //return isType(value, 'RegExp');
    };

/**
 * Returns the first matched string, or in global mode, an array containing all matched strings.
 * This is essentially a more convenient re-implementation of `String.prototype.match` that gives
 * the result types you actually want (string instead of `exec`-style array in match-first mode,
 * and an empty array instead of `null` when no matches are found in match-all mode). It also lets
 * you override flag g and ignore `lastIndex`, and fixes browser bugs.
 * @memberOf XRegExp
 * @param {String} str String to search.
 * @param {RegExp} regex Regex to search with.
 * @param {String} [scope='one'] Use 'one' to return the first match as a string. Use 'all' to
 *   return an array of all matched strings. If not explicitly specified and `regex` uses flag g,
 *   `scope` is 'all'.
 * @returns {String|Array} In match-first mode: First match as a string, or `null`. In match-all
 *   mode: Array of all matched strings, or an empty array.
 * @example
 *
 * // Match first
 * XRegExp.match('abc', /\w/); // -> 'a'
 * XRegExp.match('abc', /\w/g, 'one'); // -> 'a'
 * XRegExp.match('abc', /x/g, 'one'); // -> null
 *
 * // Match all
 * XRegExp.match('abc', /\w/g); // -> ['a', 'b', 'c']
 * XRegExp.match('abc', /\w/, 'all'); // -> ['a', 'b', 'c']
 * XRegExp.match('abc', /x/, 'all'); // -> []
 */
    self.match = function(str, regex, scope) {
        var global = (regex.global && scope !== 'one') || scope === 'all',
            cacheFlags = (global ? 'g' : '') + (regex.sticky ? 'y' : ''),
            result,
            r2;

        regex[REGEX_DATA] = regex[REGEX_DATA] || getBaseProps();

        // Shares cached copies with `XRegExp.exec`/`replace`
        r2 = regex[REGEX_DATA][cacheFlags || 'noGY'] || (
            regex[REGEX_DATA][cacheFlags || 'noGY'] = copy(regex, {
                add: cacheFlags,
                remove: scope === 'one' ? 'g' : ''
            })
        );

        result = nativ.match.call(toObject(str), r2);

        if (regex.global) {
            regex.lastIndex = (
                (scope === 'one' && result) ?
                    // Can't use `r2.lastIndex` since `r2` is nonglobal in this case
                    (result.index + result[0].length) : 0
            );
        }

        return global ? (result || []) : (result && result[0]);
    };

/**
 * Retrieves the matches from searching a string using a chain of regexes that successively search
 * within previous matches. The provided `chain` array can contain regexes and objects with `regex`
 * and `backref` properties. When a backreference is specified, the named or numbered backreference
 * is passed forward to the next regex or returned.
 * @memberOf XRegExp
 * @param {String} str String to search.
 * @param {Array} chain Regexes that each search for matches within preceding results.
 * @returns {Array} Matches by the last regex in the chain, or an empty array.
 * @example
 *
 * // Basic usage; matches numbers within <b> tags
 * XRegExp.matchChain('1 <b>2</b> 3 <b>4 a 56</b>', [
 *   XRegExp('(?is)<b>.*?</b>'),
 *   /\d+/
 * ]);
 * // -> ['2', '4', '56']
 *
 * // Passing forward and returning specific backreferences
 * html = '<a href="http://xregexp.com/api/">XRegExp</a>\
 *         <a href="http://www.google.com/">Google</a>';
 * XRegExp.matchChain(html, [
 *   {regex: /<a href="([^"]+)">/i, backref: 1},
 *   {regex: XRegExp('(?i)^https?://(?<domain>[^/?#]+)'), backref: 'domain'}
 * ]);
 * // -> ['xregexp.com', 'www.google.com']
 */
    self.matchChain = function(str, chain) {
        return (function recurseChain(values, level) {
            var item = chain[level].regex ? chain[level] : {regex: chain[level]},
                matches = [],
                addMatch = function(match) {
                    if (item.backref) {
                        /* Safari 4.0.5 (but not 5.0.5+) inappropriately uses sparse arrays to hold
                         * the `undefined`s for backreferences to nonparticipating capturing
                         * groups. In such cases, a `hasOwnProperty` or `in` check on its own would
                         * inappropriately throw the exception, so also check if the backreference
                         * is a number that is within the bounds of the array.
                         */
                        if (!(match.hasOwnProperty(item.backref) || +item.backref < match.length)) {
                            throw new ReferenceError('Backreference to undefined group: ' + item.backref);
                        }

                        matches.push(match[item.backref] || '');
                    } else {
                        matches.push(match[0]);
                    }
                },
                i;

            for (i = 0; i < values.length; ++i) {
                self.forEach(values[i], item.regex, addMatch);
            }

            return ((level === chain.length - 1) || !matches.length) ?
                matches :
                recurseChain(matches, level + 1);
        }([str], 0));
    };

/**
 * Returns a new string with one or all matches of a pattern replaced. The pattern can be a string
 * or regex, and the replacement can be a string or a function to be called for each match. To
 * perform a global search and replace, use the optional `scope` argument or include flag g if
 * using a regex. Replacement strings can use `${n}` for named and numbered backreferences.
 * Replacement functions can use named backreferences via `arguments[0].name`. Also fixes browser
 * bugs compared to the native `String.prototype.replace` and can be used reliably cross-browser.
 * @memberOf XRegExp
 * @param {String} str String to search.
 * @param {RegExp|String} search Search pattern to be replaced.
 * @param {String|Function} replacement Replacement string or a function invoked to create it.
 *   Replacement strings can include special replacement syntax:
 *     <li>$$ - Inserts a literal $ character.
 *     <li>$&, $0 - Inserts the matched substring.
 *     <li>$` - Inserts the string that precedes the matched substring (left context).
 *     <li>$' - Inserts the string that follows the matched substring (right context).
 *     <li>$n, $nn - Where n/nn are digits referencing an existent capturing group, inserts
 *       backreference n/nn.
 *     <li>${n} - Where n is a name or any number of digits that reference an existent capturing
 *       group, inserts backreference n.
 *   Replacement functions are invoked with three or more arguments:
 *     <li>The matched substring (corresponds to $& above). Named backreferences are accessible as
 *       properties of this first argument.
 *     <li>0..n arguments, one for each backreference (corresponding to $1, $2, etc. above).
 *     <li>The zero-based index of the match within the total search string.
 *     <li>The total string being searched.
 * @param {String} [scope='one'] Use 'one' to replace the first match only, or 'all'. If not
 *   explicitly specified and using a regex with flag g, `scope` is 'all'.
 * @returns {String} New string with one or all matches replaced.
 * @example
 *
 * // Regex search, using named backreferences in replacement string
 * var name = XRegExp('(?<first>\\w+) (?<last>\\w+)');
 * XRegExp.replace('John Smith', name, '${last}, ${first}');
 * // -> 'Smith, John'
 *
 * // Regex search, using named backreferences in replacement function
 * XRegExp.replace('John Smith', name, function(match) {
 *   return match.last + ', ' + match.first;
 * });
 * // -> 'Smith, John'
 *
 * // String search, with replace-all
 * XRegExp.replace('RegExp builds RegExps', 'RegExp', 'XRegExp', 'all');
 * // -> 'XRegExp builds XRegExps'
 */
    self.replace = function(str, search, replacement, scope) {
        var isRegex = self.isRegExp(search),
            global = (search.global && scope !== 'one') || scope === 'all',
            cacheFlags = (global ? 'g' : '') + (search.sticky ? 'y' : ''),
            s2 = search,
            result;

        if (isRegex) {
            search[REGEX_DATA] = search[REGEX_DATA] || getBaseProps();

            // Shares cached copies with `XRegExp.exec`/`match`. Since a copy is used,
            // `search`'s `lastIndex` isn't updated *during* replacement iterations
            s2 = search[REGEX_DATA][cacheFlags || 'noGY'] || (
                search[REGEX_DATA][cacheFlags || 'noGY'] = copy(search, {
                    add: cacheFlags,
                    remove: scope === 'one' ? 'g' : ''
                })
            );
        } else if (global) {
            s2 = new RegExp(self.escape(String(search)), 'g');
        }

        // Fixed `replace` required for named backreferences, etc.
        result = fixed.replace.call(toObject(str), s2, replacement);

        if (isRegex && search.global) {
            // Fixes IE, Safari bug (last tested IE 9, Safari 5.1)
            search.lastIndex = 0;
        }

        return result;
    };

/**
 * Performs batch processing of string replacements. Used like {@link #XRegExp.replace}, but
 * accepts an array of replacement details. Later replacements operate on the output of earlier
 * replacements. Replacement details are accepted as an array with a regex or string to search for,
 * the replacement string or function, and an optional scope of 'one' or 'all'. Uses the XRegExp
 * replacement text syntax, which supports named backreference properties via `${name}`.
 * @memberOf XRegExp
 * @param {String} str String to search.
 * @param {Array} replacements Array of replacement detail arrays.
 * @returns {String} New string with all replacements.
 * @example
 *
 * str = XRegExp.replaceEach(str, [
 *   [XRegExp('(?<name>a)'), 'z${name}'],
 *   [/b/gi, 'y'],
 *   [/c/g, 'x', 'one'], // scope 'one' overrides /g
 *   [/d/, 'w', 'all'],  // scope 'all' overrides lack of /g
 *   ['e', 'v', 'all'],  // scope 'all' allows replace-all for strings
 *   [/f/g, function($0) {
 *     return $0.toUpperCase();
 *   }]
 * ]);
 */
    self.replaceEach = function(str, replacements) {
        var i, r;

        for (i = 0; i < replacements.length; ++i) {
            r = replacements[i];
            str = self.replace(str, r[0], r[1], r[2]);
        }

        return str;
    };

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @memberOf XRegExp
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * XRegExp.split('a b c', ' ');
 * // -> ['a', 'b', 'c']
 *
 * // With limit
 * XRegExp.split('a b c', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * XRegExp.split('..word1..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', '..']
 */
    self.split = function(str, separator, limit) {
        return fixed.split.call(toObject(str), separator, limit);
    };

/**
 * Executes a regex search in a specified string. Returns `true` or `false`. Optional `pos` and
 * `sticky` arguments specify the search start position, and whether the match must start at the
 * specified position only. The `lastIndex` property of the provided regex is not used, but is
 * updated for compatibility. Also fixes browser bugs compared to the native
 * `RegExp.prototype.test` and can be used reliably cross-browser.
 * @memberOf XRegExp
 * @param {String} str String to search.
 * @param {RegExp} regex Regex to search with.
 * @param {Number} [pos=0] Zero-based index at which to start the search.
 * @param {Boolean|String} [sticky=false] Whether the match must start at the specified position
 *   only. The string `'sticky'` is accepted as an alternative to `true`.
 * @returns {Boolean} Whether the regex matched the provided value.
 * @example
 *
 * // Basic use
 * XRegExp.test('abc', /c/); // -> true
 *
 * // With pos and sticky
 * XRegExp.test('abc', /c/, 0, 'sticky'); // -> false
 */
    self.test = function(str, regex, pos, sticky) {
        // Do this the easy way :-)
        return !!self.exec(str, regex, pos, sticky);
    };

/**
 * Uninstalls optional features according to the specified options. All optional features start out
 * uninstalled, so this is used to undo the actions of {@link #XRegExp.install}.
 * @memberOf XRegExp
 * @param {Object|String} options Options object or string.
 * @example
 *
 * // With an options object
 * XRegExp.uninstall({
 *   // Disables support for astral code points in Unicode addons
 *   astral: true,
 *
 *   // Restores native regex methods
 *   natives: true
 * });
 *
 * // With an options string
 * XRegExp.uninstall('astral natives');
 */
    self.uninstall = function(options) {
        options = prepareOptions(options);

        if (features.astral && options.astral) {
            setAstral(false);
        }

        if (features.natives && options.natives) {
            setNatives(false);
        }
    };

/**
 * Returns an XRegExp object that is the union of the given patterns. Patterns can be provided as
 * regex objects or strings. Metacharacters are escaped in patterns provided as strings.
 * Backreferences in provided regex objects are automatically renumbered to work correctly within
 * the larger combined pattern. Native flags used by provided regexes are ignored in favor of the
 * `flags` argument.
 * @memberOf XRegExp
 * @param {Array} patterns Regexes and strings to combine.
 * @param {String} [flags] Any combination of XRegExp flags.
 * @returns {RegExp} Union of the provided regexes and strings.
 * @example
 *
 * XRegExp.union(['a+b*c', /(dogs)\1/, /(cats)\1/], 'i');
 * // -> /a\+b\*c|(dogs)\1|(cats)\2/i
 */
    self.union = function(patterns, flags) {
        var parts = /(\()(?!\?)|\\([1-9]\d*)|\\[\s\S]|\[(?:[^\\\]]|\\[\s\S])*]/g,
            output = [],
            numCaptures = 0,
            numPriorCaptures,
            captureNames,
            pattern,
            rewrite = function(match, paren, backref) {
                var name = captureNames[numCaptures - numPriorCaptures];

                // Capturing group
                if (paren) {
                    ++numCaptures;
                    // If the current capture has a name, preserve the name
                    if (name) {
                        return '(?<' + name + '>';
                    }
                // Backreference
                } else if (backref) {
                    // Rewrite the backreference
                    return '\\' + (+backref + numPriorCaptures);
                }

                return match;
            },
            i;

        if (!(isType(patterns, 'Array') && patterns.length)) {
            throw new TypeError('Must provide a nonempty array of patterns to merge');
        }

        for (i = 0; i < patterns.length; ++i) {
            pattern = patterns[i];

            if (self.isRegExp(pattern)) {
                numPriorCaptures = numCaptures;
                captureNames = (pattern[REGEX_DATA] && pattern[REGEX_DATA].captureNames) || [];

                // Rewrite backreferences. Passing to XRegExp dies on octals and ensures patterns
                // are independently valid; helps keep this simple. Named captures are put back
                output.push(nativ.replace.call(self(pattern.source).source, parts, rewrite));
            } else {
                output.push(self.escape(pattern));
            }
        }

        return self(output.join('|'), flags);
    };

/* ==============================
 * Fixed/extended native methods
 * ============================== */

/**
 * Adds named capture support (with backreferences returned as `result.name`), and fixes browser
 * bugs in the native `RegExp.prototype.exec`. Calling `XRegExp.install('natives')` uses this to
 * override the native method. Use via `XRegExp.exec` without overriding natives.
 * @private
 * @param {String} str String to search.
 * @returns {Array} Match array with named backreference properties, or `null`.
 */
    fixed.exec = function(str) {
        var origLastIndex = this.lastIndex,
            match = nativ.exec.apply(this, arguments),
            name,
            r2,
            i;

        if (match) {
            // Fix browsers whose `exec` methods don't return `undefined` for nonparticipating
            // capturing groups. This fixes IE 5.5-8, but not IE 9's quirks mode or emulation of
            // older IEs. IE 9 in standards mode follows the spec
            if (!correctExecNpcg && match.length > 1 && indexOf(match, '') > -1) {
                r2 = copy(this, {remove: 'g'});
                // Using `str.slice(match.index)` rather than `match[0]` in case lookahead allowed
                // matching due to characters outside the match
                nativ.replace.call(String(str).slice(match.index), r2, function() {
                    var len = arguments.length, i;
                    // Skip index 0 and the last 2
                    for (i = 1; i < len - 2; ++i) {
                        if (arguments[i] === undefined) {
                            match[i] = undefined;
                        }
                    }
                });
            }

            // Attach named capture properties
            if (this[REGEX_DATA] && this[REGEX_DATA].captureNames) {
                // Skip index 0
                for (i = 1; i < match.length; ++i) {
                    name = this[REGEX_DATA].captureNames[i - 1];
                    if (name) {
                        match[name] = match[i];
                    }
                }
            }

            // Fix browsers that increment `lastIndex` after zero-length matches
            if (this.global && !match[0].length && (this.lastIndex > match.index)) {
                this.lastIndex = match.index;
            }
        }

        if (!this.global) {
            // Fixes IE, Opera bug (last tested IE 9, Opera 11.6)
            this.lastIndex = origLastIndex;
        }

        return match;
    };

/**
 * Fixes browser bugs in the native `RegExp.prototype.test`. Calling `XRegExp.install('natives')`
 * uses this to override the native method.
 * @private
 * @param {String} str String to search.
 * @returns {Boolean} Whether the regex matched the provided value.
 */
    fixed.test = function(str) {
        // Do this the easy way :-)
        return !!fixed.exec.call(this, str);
    };

/**
 * Adds named capture support (with backreferences returned as `result.name`), and fixes browser
 * bugs in the native `String.prototype.match`. Calling `XRegExp.install('natives')` uses this to
 * override the native method.
 * @private
 * @param {RegExp|*} regex Regex to search with. If not a regex object, it is passed to `RegExp`.
 * @returns {Array} If `regex` uses flag g, an array of match strings or `null`. Without flag g,
 *   the result of calling `regex.exec(this)`.
 */
    fixed.match = function(regex) {
        var result;

        if (!self.isRegExp(regex)) {
            // Use the native `RegExp` rather than `XRegExp`
            regex = new RegExp(regex);
        } else if (regex.global) {
            result = nativ.match.apply(this, arguments);
            // Fixes IE bug
            regex.lastIndex = 0;

            return result;
        }

        return fixed.exec.call(regex, toObject(this));
    };

/**
 * Adds support for `${n}` tokens for named and numbered backreferences in replacement text, and
 * provides named backreferences to replacement functions as `arguments[0].name`. Also fixes
 * browser bugs in replacement text syntax when performing a replacement using a nonregex search
 * value, and the value of a replacement regex's `lastIndex` property during replacement iterations
 * and upon completion. Note that this doesn't support SpiderMonkey's proprietary third (`flags`)
 * argument. Calling `XRegExp.install('natives')` uses this to override the native method. Use via
 * `XRegExp.replace` without overriding natives.
 * @private
 * @param {RegExp|String} search Search pattern to be replaced.
 * @param {String|Function} replacement Replacement string or a function invoked to create it.
 * @returns {String} New string with one or all matches replaced.
 */
    fixed.replace = function(search, replacement) {
        var isRegex = self.isRegExp(search),
            origLastIndex,
            captureNames,
            result;

        if (isRegex) {
            if (search[REGEX_DATA]) {
                captureNames = search[REGEX_DATA].captureNames;
            }
            // Only needed if `search` is nonglobal
            origLastIndex = search.lastIndex;
        } else {
            search += ''; // Type-convert
        }

        // Don't use `typeof`; some older browsers return 'function' for regex objects
        if (isType(replacement, 'Function')) {
            // Stringifying `this` fixes a bug in IE < 9 where the last argument in replacement
            // functions isn't type-converted to a string
            result = nativ.replace.call(String(this), search, function() {
                var args = arguments, i;
                if (captureNames) {
                    // Change the `arguments[0]` string primitive to a `String` object that can
                    // store properties. This really does need to use `String` as a constructor
                    args[0] = new String(args[0]);
                    // Store named backreferences on the first argument
                    for (i = 0; i < captureNames.length; ++i) {
                        if (captureNames[i]) {
                            args[0][captureNames[i]] = args[i + 1];
                        }
                    }
                }
                // Update `lastIndex` before calling `replacement`. Fixes IE, Chrome, Firefox,
                // Safari bug (last tested IE 9, Chrome 17, Firefox 11, Safari 5.1)
                if (isRegex && search.global) {
                    search.lastIndex = args[args.length - 2] + args[0].length;
                }
                // Should pass `undefined` as context; see
                // <https://bugs.ecmascript.org/show_bug.cgi?id=154>
                return replacement.apply(undefined, args);
            });
        } else {
            // Ensure that the last value of `args` will be a string when given nonstring `this`,
            // while still throwing on `null` or `undefined` context
            result = nativ.replace.call(this == null ? this : String(this), search, function() {
                // Keep this function's `arguments` available through closure
                var args = arguments;
                return nativ.replace.call(String(replacement), replacementToken, function($0, $1, $2) {
                    var n;
                    // Named or numbered backreference with curly braces
                    if ($1) {
                        /* XRegExp behavior for `${n}`:
                         * 1. Backreference to numbered capture, if `n` is an integer. Use `0` for
                         *    for the entire match. Any number of leading zeros may be used.
                         * 2. Backreference to named capture `n`, if it exists and is not an
                         *    integer overridden by numbered capture. In practice, this does not
                         *    overlap with numbered capture since XRegExp does not allow named
                         *    capture to use a bare integer as the name.
                         * 3. If the name or number does not refer to an existing capturing group,
                         *    it's an error.
                         */
                        n = +$1; // Type-convert; drop leading zeros
                        if (n <= args.length - 3) {
                            return args[n] || '';
                        }
                        // Groups with the same name is an error, else would need `lastIndexOf`
                        n = captureNames ? indexOf(captureNames, $1) : -1;
                        if (n < 0) {
                            throw new SyntaxError('Backreference to undefined group ' + $0);
                        }
                        return args[n + 1] || '';
                    }
                    // Else, special variable or numbered backreference without curly braces
                    if ($2 === '$') { // $$
                        return '$';
                    }
                    if ($2 === '&' || +$2 === 0) { // $&, $0 (not followed by 1-9), $00
                        return args[0];
                    }
                    if ($2 === '`') { // $` (left context)
                        return args[args.length - 1].slice(0, args[args.length - 2]);
                    }
                    if ($2 === "'") { // $' (right context)
                        return args[args.length - 1].slice(args[args.length - 2] + args[0].length);
                    }
                    // Else, numbered backreference without curly braces
                    $2 = +$2; // Type-convert; drop leading zero
                    /* XRegExp behavior for `$n` and `$nn`:
                     * - Backrefs end after 1 or 2 digits. Use `${..}` for more digits.
                     * - `$1` is an error if no capturing groups.
                     * - `$10` is an error if less than 10 capturing groups. Use `${1}0` instead.
                     * - `$01` is `$1` if at least one capturing group, else it's an error.
                     * - `$0` (not followed by 1-9) and `$00` are the entire match.
                     * Native behavior, for comparison:
                     * - Backrefs end after 1 or 2 digits. Cannot reference capturing group 100+.
                     * - `$1` is a literal `$1` if no capturing groups.
                     * - `$10` is `$1` followed by a literal `0` if less than 10 capturing groups.
                     * - `$01` is `$1` if at least one capturing group, else it's a literal `$01`.
                     * - `$0` is a literal `$0`.
                     */
                    if (!isNaN($2)) {
                        if ($2 > args.length - 3) {
                            throw new SyntaxError('Backreference to undefined group ' + $0);
                        }
                        return args[$2] || '';
                    }
                    throw new SyntaxError('Invalid token ' + $0);
                });
            });
        }

        if (isRegex) {
            if (search.global) {
                // Fixes IE, Safari bug (last tested IE 9, Safari 5.1)
                search.lastIndex = 0;
            } else {
                // Fixes IE, Opera bug (last tested IE 9, Opera 11.6)
                search.lastIndex = origLastIndex;
            }
        }

        return result;
    };

/**
 * Fixes browser bugs in the native `String.prototype.split`. Calling `XRegExp.install('natives')`
 * uses this to override the native method. Use via `XRegExp.split` without overriding natives.
 * @private
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 */
    fixed.split = function(separator, limit) {
        if (!self.isRegExp(separator)) {
            // Browsers handle nonregex split correctly, so use the faster native method
            return nativ.split.apply(this, arguments);
        }

        var str = String(this),
            output = [],
            origLastIndex = separator.lastIndex,
            lastLastIndex = 0,
            lastLength;

        /* Values for `limit`, per the spec:
         * If undefined: pow(2,32) - 1
         * If 0, Infinity, or NaN: 0
         * If positive number: limit = floor(limit); if (limit >= pow(2,32)) limit -= pow(2,32);
         * If negative number: pow(2,32) - floor(abs(limit))
         * If other: Type-convert, then use the above rules
         */
        // This line fails in very strange ways for some values of `limit` in Opera 10.5-10.63,
        // unless Opera Dragonfly is open (go figure). It works in at least Opera 9.5-10.1 and 11+
        limit = (limit === undefined ? -1 : limit) >>> 0;

        self.forEach(str, separator, function(match) {
            // This condition is not the same as `if (match[0].length)`
            if ((match.index + match[0].length) > lastLastIndex) {
                output.push(str.slice(lastLastIndex, match.index));
                if (match.length > 1 && match.index < str.length) {
                    Array.prototype.push.apply(output, match.slice(1));
                }
                lastLength = match[0].length;
                lastLastIndex = match.index + lastLength;
            }
        });

        if (lastLastIndex === str.length) {
            if (!nativ.test.call(separator, '') || lastLength) {
                output.push('');
            }
        } else {
            output.push(str.slice(lastLastIndex));
        }

        separator.lastIndex = origLastIndex;
        return output.length > limit ? output.slice(0, limit) : output;
    };

/* ==============================
 * Built-in syntax/flag tokens
 * ============================== */

    add = self.addToken;

/* Letter identity escapes that natively match literal characters: `\a`, `\A`, etc. These should be
 * SyntaxErrors but are allowed in web reality. XRegExp makes them errors for cross-browser
 * consistency and to reserve their syntax, but lets them be superseded by addons.
 */
    add(
        /\\([ABCE-RTUVXYZaeg-mopqyz]|c(?![A-Za-z])|u(?![\dA-Fa-f]{4})|x(?![\dA-Fa-f]{2}))/,
        function(match, scope) {
            // \B is allowed in default scope only
            if (match[1] === 'B' && scope === defaultScope) {
                return match[0];
            }
            throw new SyntaxError('Invalid escape ' + match[0]);
        },
        {scope: 'all'}
    );

/* Empty character class: `[]` or `[^]`. This fixes a critical cross-browser syntax inconsistency.
 * Unless this is standardized (per the ES spec), regex syntax can't be accurately parsed because
 * character class endings can't be determined.
 */
    add(
        /\[(\^?)]/,
        function(match) {
            // For cross-browser compatibility with ES3, convert [] to \b\B and [^] to [\s\S].
            // (?!) should work like \b\B, but is unreliable in some versions of Firefox
            return match[1] ? '[\\s\\S]' : '\\b\\B';
        }
    );

/* Comment pattern: `(?# )`. Inline comments are an alternative to the line comments allowed in
 * free-spacing mode (flag x).
 */
    add(
        /\(\?#[^)]*\)/,
        function(match, scope, flags) {
            // Keep tokens separated unless the following token is a quantifier
            return isQuantifierNext(match.input, match.index + match[0].length, flags) ?
                '' : '(?:)';
        }
    );

/* Whitespace and line comments, in free-spacing mode (aka extended mode, flag x) only.
 */
    add(
        /\s+|#.*/,
        function(match, scope, flags) {
            // Keep tokens separated unless the following token is a quantifier
            return isQuantifierNext(match.input, match.index + match[0].length, flags) ?
                '' : '(?:)';
        },
        {flag: 'x'}
    );

/* Dot, in dotall mode (aka singleline mode, flag s) only.
 */
    add(
        /\./,
        function() {
            return '[\\s\\S]';
        },
        {flag: 's'}
    );

/* Named backreference: `\k<name>`. Backreference names can use the characters A-Z, a-z, 0-9, _,
 * and $ only. Also allows numbered backreferences as `\k<n>`.
 */
    add(
        /\\k<([\w$]+)>/,
        function(match) {
            // Groups with the same name is an error, else would need `lastIndexOf`
            var index = isNaN(match[1]) ? (indexOf(this.captureNames, match[1]) + 1) : +match[1],
                endIndex = match.index + match[0].length;
            if (!index || index > this.captureNames.length) {
                throw new SyntaxError('Backreference to undefined group ' + match[0]);
            }
            // Keep backreferences separate from subsequent literal numbers
            return '\\' + index + (
                endIndex === match.input.length || isNaN(match.input.charAt(endIndex)) ?
                    '' : '(?:)'
            );
        }
    );

/* Numbered backreference or octal, plus any following digits: `\0`, `\11`, etc. Octals except `\0`
 * not followed by 0-9 and backreferences to unopened capture groups throw an error. Other matches
 * are returned unaltered. IE < 9 doesn't support backreferences above `\99` in regex syntax.
 */
    add(
        /\\(\d+)/,
        function(match, scope) {
            if (
                !(
                    scope === defaultScope &&
                    /^[1-9]/.test(match[1]) &&
                    +match[1] <= this.captureNames.length
                ) &&
                match[1] !== '0'
            ) {
                throw new SyntaxError('Cannot use octal escape or backreference to undefined group ' +
                    match[0]);
            }
            return match[0];
        },
        {scope: 'all'}
    );

/* Named capturing group; match the opening delimiter only: `(?<name>`. Capture names can use the
 * characters A-Z, a-z, 0-9, _, and $ only. Names can't be integers. Supports Python-style
 * `(?P<name>` as an alternate syntax to avoid issues in recent Opera (which natively supports the
 * Python-style syntax). Otherwise, XRegExp might treat numbered backreferences to Python-style
 * named capture as octals.
 */
    add(
        /\(\?P?<([\w$]+)>/,
        function(match) {
            // Disallow bare integers as names because named backreferences are added to match
            // arrays and therefore numeric properties may lead to incorrect lookups
            if (!isNaN(match[1])) {
                throw new SyntaxError('Cannot use integer as capture name ' + match[0]);
            }
            if (match[1] === 'length' || match[1] === '__proto__') {
                throw new SyntaxError('Cannot use reserved word as capture name ' + match[0]);
            }
            if (indexOf(this.captureNames, match[1]) > -1) {
                throw new SyntaxError('Cannot use same name for multiple groups ' + match[0]);
            }
            this.captureNames.push(match[1]);
            this.hasNamedCapture = true;
            return '(';
        }
    );

/* Capturing group; match the opening parenthesis only. Required for support of named capturing
 * groups. Also adds explicit capture mode (flag n).
 */
    add(
        /\((?!\?)/,
        function(match, scope, flags) {
            if (flags.indexOf('n') > -1) {
                return '(?:';
            }
            this.captureNames.push(null);
            return '(';
        },
        {optionalFlags: 'n'}
    );

/* ==============================
 * Expose XRegExp
 * ============================== */

    return self;

}());

/******** END xregexp.js ********/
/******** BEGIN build.js ********/
/*!
 * XRegExp.build 3.0.0-pre
 * <http://xregexp.com/>
 * Steven Levithan © 2012 MIT License
 * Inspired by Lea Verou's RegExp.create <http://lea.verou.me/>
 */

(function(XRegExp) {
    'use strict';

    var REGEX_DATA = 'xregexp',
        subParts = /(\()(?!\?)|\\([1-9]\d*)|\\[\s\S]|\[(?:[^\\\]]|\\[\s\S])*]/g,
        parts = XRegExp.union([/\({{([\w$]+)}}\)|{{([\w$]+)}}/, subParts], 'g');

/**
 * Strips a leading `^` and trailing unescaped `$`, if both are present.
 * @private
 * @param {String} pattern Pattern to process.
 * @returns {String} Pattern with edge anchors removed.
 */
    function deanchor(pattern) {
        var leadingAnchor = /^\^/,
            trailingAnchor = /\$$/;

        // Ensure that the trailing `$` isn't escaped
        if (leadingAnchor.test(pattern) && trailingAnchor.test(pattern.replace(/\\[\s\S]/g, ''))) {
            return pattern.replace(leadingAnchor, '').replace(trailingAnchor, '');
        }

        return pattern;
    }

/**
 * Converts the provided value to an XRegExp. Native RegExp flags are not preserved.
 * @private
 * @param {String|RegExp} value Value to convert.
 * @returns {RegExp} XRegExp object with XRegExp syntax applied.
 */
    function asXRegExp(value) {
        return XRegExp.isRegExp(value) ?
            (value[REGEX_DATA] && value[REGEX_DATA].captureNames ?
                // Don't recompile, to preserve capture names
                value :
                // Recompile as XRegExp
                XRegExp(value.source)
            ) :
            // Compile string as XRegExp
            XRegExp(value);
    }

/**
 * Builds regexes using named subpatterns, for readability and pattern reuse. Backreferences in the
 * outer pattern and provided subpatterns are automatically renumbered to work correctly. Native
 * flags used by provided subpatterns are ignored in favor of the `flags` argument.
 * @memberOf XRegExp
 * @param {String} pattern XRegExp pattern using `{{name}}` for embedded subpatterns. Allows
 *   `({{name}})` as shorthand for `(?<name>{{name}})`. Patterns cannot be embedded within
 *   character classes.
 * @param {Object} subs Lookup object for named subpatterns. Values can be strings or regexes. A
 *   leading `^` and trailing unescaped `$` are stripped from subpatterns, if both are present.
 * @param {String} [flags] Any combination of XRegExp flags.
 * @returns {RegExp} Regex with interpolated subpatterns.
 * @example
 *
 * var time = XRegExp.build('(?x)^ {{hours}} ({{minutes}}) $', {
 *   hours: XRegExp.build('{{h12}} : | {{h24}}', {
 *     h12: /1[0-2]|0?[1-9]/,
 *     h24: /2[0-3]|[01][0-9]/
 *   }, 'x'),
 *   minutes: /^[0-5][0-9]$/
 * });
 * time.test('10:59'); // -> true
 * XRegExp.exec('10:59', time).minutes; // -> '59'
 */
    XRegExp.build = function(pattern, subs, flags) {
        var inlineFlags = /^\(\?([\w$]+)\)/.exec(pattern),
            data = {},
            numCaps = 0, // 'Caps' is short for captures
            numPriorCaps,
            numOuterCaps = 0,
            outerCapsMap = [0],
            outerCapNames,
            sub,
            p;

        // Add flags within a leading mode modifier to the overall pattern's flags
        if (inlineFlags) {
            flags = flags || '';
            inlineFlags[1].replace(/./g, function(flag) {
                // Don't add duplicates
                flags += (flags.indexOf(flag) > -1 ? '' : flag);
            });
        }

        for (p in subs) {
            if (subs.hasOwnProperty(p)) {
                // Passing to XRegExp enables extended syntax and ensures independent validity,
                // lest an unescaped `(`, `)`, `[`, or trailing `\` breaks the `(?:)` wrapper. For
                // subpatterns provided as native regexes, it dies on octals and adds the property
                // used to hold extended regex instance data, for simplicity
                sub = asXRegExp(subs[p]);
                data[p] = {
                    // Deanchoring allows embedding independently useful anchored regexes. If you
                    // really need to keep your anchors, double them (i.e., `^^...$$`)
                    pattern: deanchor(sub.source),
                    names: sub[REGEX_DATA].captureNames || []
                };
            }
        }

        // Passing to XRegExp dies on octals and ensures the outer pattern is independently valid;
        // helps keep this simple. Named captures will be put back
        pattern = asXRegExp(pattern);
        outerCapNames = pattern[REGEX_DATA].captureNames || [];
        pattern = pattern.source.replace(parts, function($0, $1, $2, $3, $4) {
            var subName = $1 || $2, capName, intro;
            // Named subpattern
            if (subName) {
                if (!data.hasOwnProperty(subName)) {
                    throw new ReferenceError('Undefined property ' + $0);
                }
                // Named subpattern was wrapped in a capturing group
                if ($1) {
                    capName = outerCapNames[numOuterCaps];
                    outerCapsMap[++numOuterCaps] = ++numCaps;
                    // If it's a named group, preserve the name. Otherwise, use the subpattern name
                    // as the capture name
                    intro = '(?<' + (capName || subName) + '>';
                } else {
                    intro = '(?:';
                }
                numPriorCaps = numCaps;
                return intro + data[subName].pattern.replace(subParts, function(match, paren, backref) {
                    // Capturing group
                    if (paren) {
                        capName = data[subName].names[numCaps - numPriorCaps];
                        ++numCaps;
                        // If the current capture has a name, preserve the name
                        if (capName) {
                            return '(?<' + capName + '>';
                        }
                    // Backreference
                    } else if (backref) {
                        // Rewrite the backreference
                        return '\\' + (+backref + numPriorCaps);
                    }
                    return match;
                }) + ')';
            }
            // Capturing group
            if ($3) {
                capName = outerCapNames[numOuterCaps];
                outerCapsMap[++numOuterCaps] = ++numCaps;
                // If the current capture has a name, preserve the name
                if (capName) {
                    return '(?<' + capName + '>';
                }
            // Backreference
            } else if ($4) {
                // Rewrite the backreference
                return '\\' + outerCapsMap[+$4];
            }
            return $0;
        });

        return XRegExp(pattern, flags);
    };

}(XRegExp));

/******** END build.js ********/
/******** BEGIN matchrecursive.js ********/
/*!
 * XRegExp.matchRecursive 3.0.0-pre
 * <http://xregexp.com/>
 * Steven Levithan © 2009-2012 MIT License
 */

(function(XRegExp) {
    'use strict';

/**
 * Returns a match detail object composed of the provided values.
 * @private
 */
    function row(name, value, start, end) {
        return {
            name: name,
            value: value,
            start: start,
            end: end
        };
    }

/**
 * Returns an array of match strings between outermost left and right delimiters, or an array of
 * objects with detailed match parts and position data. An error is thrown if delimiters are
 * unbalanced within the data.
 * @memberOf XRegExp
 * @param {String} str String to search.
 * @param {String} left Left delimiter as an XRegExp pattern.
 * @param {String} right Right delimiter as an XRegExp pattern.
 * @param {String} [flags] Any native or XRegExp flags, used for the left and right delimiters.
 * @param {Object} [options] Lets you specify `valueNames` and `escapeChar` options.
 * @returns {Array} Array of matches, or an empty array.
 * @example
 *
 * // Basic usage
 * var str = '(t((e))s)t()(ing)';
 * XRegExp.matchRecursive(str, '\\(', '\\)', 'g');
 * // -> ['t((e))s', '', 'ing']
 *
 * // Extended information mode with valueNames
 * str = 'Here is <div> <div>an</div></div> example';
 * XRegExp.matchRecursive(str, '<div\\s*>', '</div>', 'gi', {
 *   valueNames: ['between', 'left', 'match', 'right']
 * });
 * // -> [
 * // {name: 'between', value: 'Here is ',       start: 0,  end: 8},
 * // {name: 'left',    value: '<div>',          start: 8,  end: 13},
 * // {name: 'match',   value: ' <div>an</div>', start: 13, end: 27},
 * // {name: 'right',   value: '</div>',         start: 27, end: 33},
 * // {name: 'between', value: ' example',       start: 33, end: 41}
 * // ]
 *
 * // Omitting unneeded parts with null valueNames, and using escapeChar
 * str = '...{1}\\{{function(x,y){return y+x;}}';
 * XRegExp.matchRecursive(str, '{', '}', 'g', {
 *   valueNames: ['literal', null, 'value', null],
 *   escapeChar: '\\'
 * });
 * // -> [
 * // {name: 'literal', value: '...', start: 0, end: 3},
 * // {name: 'value',   value: '1',   start: 4, end: 5},
 * // {name: 'literal', value: '\\{', start: 6, end: 8},
 * // {name: 'value',   value: 'function(x,y){return y+x;}', start: 9, end: 35}
 * // ]
 *
 * // Sticky mode via flag y
 * str = '<1><<<2>>><3>4<5>';
 * XRegExp.matchRecursive(str, '<', '>', 'gy');
 * // -> ['1', '<<2>>', '3']
 */
    XRegExp.matchRecursive = function(str, left, right, flags, options) {
        flags = flags || '';
        options = options || {};
        var global = flags.indexOf('g') > -1,
            sticky = flags.indexOf('y') > -1,
            // Flag `y` is controlled internally
            basicFlags = flags.replace(/y/g, ''),
            escapeChar = options.escapeChar,
            vN = options.valueNames,
            output = [],
            openTokens = 0,
            delimStart = 0,
            delimEnd = 0,
            lastOuterEnd = 0,
            outerStart,
            innerStart,
            leftMatch,
            rightMatch,
            esc;
        left = XRegExp(left, basicFlags);
        right = XRegExp(right, basicFlags);

        if (escapeChar) {
            if (escapeChar.length > 1) {
                throw new Error('Cannot use more than one escape character');
            }
            escapeChar = XRegExp.escape(escapeChar);
            // Using `XRegExp.union` safely rewrites backreferences in `left` and `right`
            esc = new RegExp(
                '(?:' + escapeChar + '[\\S\\s]|(?:(?!' +
                    XRegExp.union([left, right]).source +
                    ')[^' + escapeChar + '])+)+',
                // Flags `gy` not needed here
                flags.replace(/[^im]+/g, '')
            );
        }

        while (true) {
            // If using an escape character, advance to the delimiter's next starting position,
            // skipping any escaped characters in between
            if (escapeChar) {
                delimEnd += (XRegExp.exec(str, esc, delimEnd, 'sticky') || [''])[0].length;
            }
            leftMatch = XRegExp.exec(str, left, delimEnd);
            rightMatch = XRegExp.exec(str, right, delimEnd);
            // Keep the leftmost match only
            if (leftMatch && rightMatch) {
                if (leftMatch.index <= rightMatch.index) {
                    rightMatch = null;
                } else {
                    leftMatch = null;
                }
            }
            /* Paths (LM: leftMatch, RM: rightMatch, OT: openTokens):
             * LM | RM | OT | Result
             * 1  | 0  | 1  | loop
             * 1  | 0  | 0  | loop
             * 0  | 1  | 1  | loop
             * 0  | 1  | 0  | throw
             * 0  | 0  | 1  | throw
             * 0  | 0  | 0  | break
             * Doesn't include the sticky mode special case. The loop ends after the first
             * completed match if not `global`.
             */
            if (leftMatch || rightMatch) {
                delimStart = (leftMatch || rightMatch).index;
                delimEnd = delimStart + (leftMatch || rightMatch)[0].length;
            } else if (!openTokens) {
                break;
            }
            if (sticky && !openTokens && delimStart > lastOuterEnd) {
                break;
            }
            if (leftMatch) {
                if (!openTokens) {
                    outerStart = delimStart;
                    innerStart = delimEnd;
                }
                ++openTokens;
            } else if (rightMatch && openTokens) {
                if (!--openTokens) {
                    if (vN) {
                        if (vN[0] && outerStart > lastOuterEnd) {
                            output.push(row(vN[0], str.slice(lastOuterEnd, outerStart), lastOuterEnd, outerStart));
                        }
                        if (vN[1]) {
                            output.push(row(vN[1], str.slice(outerStart, innerStart), outerStart, innerStart));
                        }
                        if (vN[2]) {
                            output.push(row(vN[2], str.slice(innerStart, delimStart), innerStart, delimStart));
                        }
                        if (vN[3]) {
                            output.push(row(vN[3], str.slice(delimStart, delimEnd), delimStart, delimEnd));
                        }
                    } else {
                        output.push(str.slice(innerStart, delimStart));
                    }
                    lastOuterEnd = delimEnd;
                    if (!global) {
                        break;
                    }
                }
            } else {
                throw new Error('Unbalanced delimiter found in string');
            }
            // If the delimiter matched an empty string, avoid an infinite loop
            if (delimStart === delimEnd) {
                ++delimEnd;
            }
        }

        if (global && !sticky && vN && vN[0] && str.length > lastOuterEnd) {
            output.push(row(vN[0], str.slice(lastOuterEnd), lastOuterEnd, str.length));
        }

        return output;
    };

}(XRegExp));

/******** END matchrecursive.js ********/
/******** BEGIN unicode-base.js ********/
/*!
 * XRegExp Unicode Base 3.0.0-pre
 * <http://xregexp.com/>
 * Steven Levithan © 2008-2012 MIT License
 * Uses Unicode 6.2.0 <http://unicode.org/>
 * Unicode data generated by Mathias Bynens <http://mathiasbynens.be/>
 */

/**
 * Adds support for the `\p{L}` or `\p{Letter}` Unicode category. Addon packages for other Unicode
 * categories, scripts, blocks, and properties are available separately. Also adds flag A (astral),
 * which enables 21-bit Unicode support. All Unicode tokens can be inverted using `\P{..}` or
 * `\p{^..}`. Token names ignore case, spaces, hyphens, and underscores.
 * @requires XRegExp
 */
(function(XRegExp) {
    'use strict';

// Storage for Unicode data
    var unicode = {};

/* ==============================
 * Private functions
 * ============================== */

// Generates a token lookup name: lowercase, with hyphens, spaces, and underscores removed
    function normalize(name) {
        return name.replace(/[- _]+/g, '').toLowerCase();
    }

// Adds leading zeros if shorter than four characters
    function pad4(str) {
        while (str.length < 4) {
            str = '0' + str;
        }
        return str;
    }

// Converts a hexadecimal number to decimal
    function dec(hex) {
        return parseInt(hex, 16);
    }

// Converts a decimal number to hexadecimal
    function hex(dec) {
        return parseInt(dec, 10).toString(16);
    }

// Gets the decimal code of a literal code unit, \xHH, \uHHHH, or a backslash-escaped literal
    function charCode(chr) {
        var esc = /^\\[xu](.+)/.exec(chr);
        return esc ?
            dec(esc[1]) :
            chr.charCodeAt(chr.charAt(0) === '\\' ? 1 : 0);
    }

// Inverts a list of ordered BMP characters and ranges
    function invertBmp(range) {
        var output = '',
            lastEnd = -1,
            start;
        XRegExp.forEach(range, /(\\x..|\\u....|\\?[\s\S])(?:-(\\x..|\\u....|\\?[\s\S]))?/, function(m) {
            start = charCode(m[1]);
            if (start > (lastEnd + 1)) {
                output += '\\u' + pad4(hex(lastEnd + 1));
                if (start > (lastEnd + 2)) {
                    output += '-\\u' + pad4(hex(start - 1));
                }
            }
            lastEnd = charCode(m[2] || m[1]);
        });
        if (lastEnd < 0xFFFF) {
            output += '\\u' + pad4(hex(lastEnd + 1));
            if (lastEnd < 0xFFFE) {
                output += '-\\uFFFF';
            }
        }
        return output;
    }

// Generates an inverted BMP range on first use
    function cacheInvertedBmp(slug) {
        var prop = 'b!';
        return unicode[slug][prop] || (
            unicode[slug][prop] = invertBmp(unicode[slug].bmp)
        );
    }

// Combines and optionally negates BMP and astral data
    function buildAstral(slug, isNegated) {
        var item = unicode[slug],
            combined = '';
        if (item.bmp && !item.isBmpLast) {
            combined = '[' + item.bmp + ']' + (item.astral ? '|' : '');
        }
        if (item.astral) {
            combined += item.astral;
        }
        if (item.isBmpLast && item.bmp) {
            combined += (item.astral ? '|' : '') + '[' + item.bmp + ']';
        }
        // Astral Unicode tokens always match a code point, never a code unit
        return isNegated ?
            '(?:(?!' + combined + ')(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[\0-\uFFFF]))' :
            '(?:' + combined + ')';
    }

// Builds a complete astral pattern on first use
    function cacheAstral(slug, isNegated) {
        var prop = isNegated ? 'a!' : 'a=';
        return unicode[slug][prop] || (
            unicode[slug][prop] = buildAstral(slug, isNegated)
        );
    }

/* ==============================
 * Core functionality
 * ============================== */

/* Add Unicode token syntax: \p{..}, \P{..}, \p{^..}. Also add astral mode (flag A).
 */
    XRegExp.addToken(
        // Use `*` instead of `+` to avoid capturing `^` as the token name in `\p{^}`
        /\\([pP])(?:{(\^?)([^}]*)}|([A-Za-z]))/,
        function(match, scope, flags) {
            var ERR_DOUBLE_NEG = 'Invalid double negation ',
                ERR_UNKNOWN_NAME = 'Unknown Unicode token ',
                ERR_UNKNOWN_REF = 'Unicode token missing data ',
                ERR_ASTRAL_ONLY = 'Astral mode required for Unicode token ',
                ERR_ASTRAL_IN_CLASS = 'Astral mode does not support Unicode tokens within character classes',
                // Negated via \P{..} or \p{^..}
                isNegated = match[1] === 'P' || !!match[2],
                // Switch from BMP (U+FFFF) to astral (U+10FFFF) mode via flag A or implicit opt-in
                isAstralMode = flags.indexOf('A') > -1 || XRegExp.isInstalled('astral'),
                // Token lookup name. Check `[4]` first to avoid passing `undefined` via `\p{}`
                slug = normalize(match[4] || match[3]),
                // Token data object
                item = unicode[slug];

            if (match[1] === 'P' && match[2]) {
                throw new SyntaxError(ERR_DOUBLE_NEG + match[0]);
            }
            if (!unicode.hasOwnProperty(slug)) {
                throw new SyntaxError(ERR_UNKNOWN_NAME + match[0]);
            }

            // Switch to the negated form of the referenced Unicode token
            if (item.inverseOf) {
                slug = normalize(item.inverseOf);
                if (!unicode.hasOwnProperty(slug)) {
                    throw new ReferenceError(ERR_UNKNOWN_REF + match[0] + ' -> ' + item.inverseOf);
                }
                item = unicode[slug];
                isNegated = !isNegated;
            }

            if (!(item.bmp || isAstralMode)) {
                throw new SyntaxError(ERR_ASTRAL_ONLY + match[0]);
            }
            if (isAstralMode) {
                if (scope === 'class') {
                    throw new SyntaxError(ERR_ASTRAL_IN_CLASS);
                }

                return cacheAstral(slug, isNegated);
            }

            return scope === 'class' ?
                (isNegated ? cacheInvertedBmp(slug) : item.bmp) :
                (isNegated ? '[^' : '[') + item.bmp + ']';
        },
        {
            scope: 'all',
            optionalFlags: 'A'
        }
    );

/**
 * Adds to the list of Unicode tokens that XRegExp regexes can match via `\p` or `\P`.
 * @memberOf XRegExp
 * @param {Array} data Objects with named character ranges. Each object may have properties `name`,
 *   `alias`, `isBmpLast`, `inverseOf`, `bmp`, and `astral`. All but `name` are optional, although
 *   one of `bmp` or `astral` is required (unless `inverseOf` is set). If `astral` is absent, the
 *   `bmp` data is used for BMP and astral modes. If `bmp` is absent, the name errors in BMP mode
 *   but works in astral mode. If both `bmp` and `astral` are provided, the `bmp` data only is used
 *   in BMP mode, and the combination of `bmp` and `astral` data is used in astral mode.
 *   `isBmpLast` is needed when a token matches orphan high surrogates *and* uses surrogate pairs
 *   to match astral code points. The `bmp` and `astral` data should be a combination of literal
 *   characters and `\xHH` or `\uHHHH` escape sequences, with hyphens to create ranges. Any regex
 *   metacharacters in the data should be escaped, apart from range-creating hyphens. The `astral`
 *   data can additionally use character classes and alternation, and should use surrogate pairs to
 *   represent astral code points. `inverseOf` can be used to avoid duplicating character data if a
 *   Unicode token is defined as the exact inverse of another token.
 * @example
 *
 * // Basic use
 * XRegExp.addUnicodeData([{
 *   name: 'XDigit',
 *   alias: 'Hexadecimal',
 *   bmp: '0-9A-Fa-f'
 * }]);
 * XRegExp('\\p{XDigit}:\\p{Hexadecimal}+').test('0:3D'); // -> true
 */
    XRegExp.addUnicodeData = function(data) {
        var ERR_NO_NAME = 'Unicode token requires name',
            ERR_NO_DATA = 'Unicode token has no character data ',
            item,
            i;

        for (i = 0; i < data.length; ++i) {
            item = data[i];
            if (!item.name) {
                throw new Error(ERR_NO_NAME);
            }
            if (!(item.inverseOf || item.bmp || item.astral)) {
                throw new Error(ERR_NO_DATA + item.name);
            }
            unicode[normalize(item.name)] = item;
            if (item.alias) {
                unicode[normalize(item.alias)] = item;
            }
        }

        // Reset the pattern cache used by the `XRegExp` constructor, since the same pattern and
        // flags might now produce different results
        XRegExp.cache.flush('patterns');
    };

/* Add data for the Unicode `L` or `Letter` category. Separate addons are available that add other
 * categories, scripts, blocks, and properties.
 */
    XRegExp.addUnicodeData([{
        name: 'L',
        alias: 'Letter',
        bmp: 'A-Za-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC'
        //astral: /* Removed to conserve space */
    }]);

}(XRegExp));

/******** END unicode-base.js ********/
/******** BEGIN unicode-categories.js ********/
/*!
 * XRegExp Unicode Categories 3.0.0-pre
 * <http://xregexp.com/>
 * Steven Levithan © 2010-2012 MIT License
 * Uses Unicode 6.2.0 <http://unicode.org/>
 * Unicode data generated by Mathias Bynens <http://mathiasbynens.be/>
 */

/**
 * Adds support for all Unicode categories. E.g., `\p{Lu}` or `\p{Uppercase Letter}`. Token names
 * are case insensitive, and any spaces, hyphens, and underscores are ignored.
 * @requires XRegExp, Unicode Base
 */

 /**
  * Control characters and astral planes removed to conserve space
  */
(function(XRegExp) {
    'use strict';

    if (!XRegExp.addUnicodeData) {
        throw new ReferenceError('Unicode Base must be loaded before Unicode Categories');
    }

    XRegExp.addUnicodeData([
        // Included in Unicode Base
        /*{
            name: 'L',
            alias: 'Letter',
            bmp: '...',
            astral: '...'
        },*/
        {
            name: 'Ll',
            alias: 'Lowercase_Letter',
            bmp: 'a-z\xB5\xDF-\xF6\xF8-\xFF\u0101\u0103\u0105\u0107\u0109\u010B\u010D\u010F\u0111\u0113\u0115\u0117\u0119\u011B\u011D\u011F\u0121\u0123\u0125\u0127\u0129\u012B\u012D\u012F\u0131\u0133\u0135\u0137\u0138\u013A\u013C\u013E\u0140\u0142\u0144\u0146\u0148\u0149\u014B\u014D\u014F\u0151\u0153\u0155\u0157\u0159\u015B\u015D\u015F\u0161\u0163\u0165\u0167\u0169\u016B\u016D\u016F\u0171\u0173\u0175\u0177\u017A\u017C\u017E-\u0180\u0183\u0185\u0188\u018C\u018D\u0192\u0195\u0199-\u019B\u019E\u01A1\u01A3\u01A5\u01A8\u01AA\u01AB\u01AD\u01B0\u01B4\u01B6\u01B9\u01BA\u01BD-\u01BF\u01C6\u01C9\u01CC\u01CE\u01D0\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u01DD\u01DF\u01E1\u01E3\u01E5\u01E7\u01E9\u01EB\u01ED\u01EF\u01F0\u01F3\u01F5\u01F9\u01FB\u01FD\u01FF\u0201\u0203\u0205\u0207\u0209\u020B\u020D\u020F\u0211\u0213\u0215\u0217\u0219\u021B\u021D\u021F\u0221\u0223\u0225\u0227\u0229\u022B\u022D\u022F\u0231\u0233-\u0239\u023C\u023F\u0240\u0242\u0247\u0249\u024B\u024D\u024F-\u0293\u0295-\u02AF\u0371\u0373\u0377\u037B-\u037D\u0390\u03AC-\u03CE\u03D0\u03D1\u03D5-\u03D7\u03D9\u03DB\u03DD\u03DF\u03E1\u03E3\u03E5\u03E7\u03E9\u03EB\u03ED\u03EF-\u03F3\u03F5\u03F8\u03FB\u03FC\u0430-\u045F\u0461\u0463\u0465\u0467\u0469\u046B\u046D\u046F\u0471\u0473\u0475\u0477\u0479\u047B\u047D\u047F\u0481\u048B\u048D\u048F\u0491\u0493\u0495\u0497\u0499\u049B\u049D\u049F\u04A1\u04A3\u04A5\u04A7\u04A9\u04AB\u04AD\u04AF\u04B1\u04B3\u04B5\u04B7\u04B9\u04BB\u04BD\u04BF\u04C2\u04C4\u04C6\u04C8\u04CA\u04CC\u04CE\u04CF\u04D1\u04D3\u04D5\u04D7\u04D9\u04DB\u04DD\u04DF\u04E1\u04E3\u04E5\u04E7\u04E9\u04EB\u04ED\u04EF\u04F1\u04F3\u04F5\u04F7\u04F9\u04FB\u04FD\u04FF\u0501\u0503\u0505\u0507\u0509\u050B\u050D\u050F\u0511\u0513\u0515\u0517\u0519\u051B\u051D\u051F\u0521\u0523\u0525\u0527\u0561-\u0587\u1D00-\u1D2B\u1D6B-\u1D77\u1D79-\u1D9A\u1E01\u1E03\u1E05\u1E07\u1E09\u1E0B\u1E0D\u1E0F\u1E11\u1E13\u1E15\u1E17\u1E19\u1E1B\u1E1D\u1E1F\u1E21\u1E23\u1E25\u1E27\u1E29\u1E2B\u1E2D\u1E2F\u1E31\u1E33\u1E35\u1E37\u1E39\u1E3B\u1E3D\u1E3F\u1E41\u1E43\u1E45\u1E47\u1E49\u1E4B\u1E4D\u1E4F\u1E51\u1E53\u1E55\u1E57\u1E59\u1E5B\u1E5D\u1E5F\u1E61\u1E63\u1E65\u1E67\u1E69\u1E6B\u1E6D\u1E6F\u1E71\u1E73\u1E75\u1E77\u1E79\u1E7B\u1E7D\u1E7F\u1E81\u1E83\u1E85\u1E87\u1E89\u1E8B\u1E8D\u1E8F\u1E91\u1E93\u1E95-\u1E9D\u1E9F\u1EA1\u1EA3\u1EA5\u1EA7\u1EA9\u1EAB\u1EAD\u1EAF\u1EB1\u1EB3\u1EB5\u1EB7\u1EB9\u1EBB\u1EBD\u1EBF\u1EC1\u1EC3\u1EC5\u1EC7\u1EC9\u1ECB\u1ECD\u1ECF\u1ED1\u1ED3\u1ED5\u1ED7\u1ED9\u1EDB\u1EDD\u1EDF\u1EE1\u1EE3\u1EE5\u1EE7\u1EE9\u1EEB\u1EED\u1EEF\u1EF1\u1EF3\u1EF5\u1EF7\u1EF9\u1EFB\u1EFD\u1EFF-\u1F07\u1F10-\u1F15\u1F20-\u1F27\u1F30-\u1F37\u1F40-\u1F45\u1F50-\u1F57\u1F60-\u1F67\u1F70-\u1F7D\u1F80-\u1F87\u1F90-\u1F97\u1FA0-\u1FA7\u1FB0-\u1FB4\u1FB6\u1FB7\u1FBE\u1FC2-\u1FC4\u1FC6\u1FC7\u1FD0-\u1FD3\u1FD6\u1FD7\u1FE0-\u1FE7\u1FF2-\u1FF4\u1FF6\u1FF7\u210A\u210E\u210F\u2113\u212F\u2134\u2139\u213C\u213D\u2146-\u2149\u214E\u2184\u2C30-\u2C5E\u2C61\u2C65\u2C66\u2C68\u2C6A\u2C6C\u2C71\u2C73\u2C74\u2C76-\u2C7B\u2C81\u2C83\u2C85\u2C87\u2C89\u2C8B\u2C8D\u2C8F\u2C91\u2C93\u2C95\u2C97\u2C99\u2C9B\u2C9D\u2C9F\u2CA1\u2CA3\u2CA5\u2CA7\u2CA9\u2CAB\u2CAD\u2CAF\u2CB1\u2CB3\u2CB5\u2CB7\u2CB9\u2CBB\u2CBD\u2CBF\u2CC1\u2CC3\u2CC5\u2CC7\u2CC9\u2CCB\u2CCD\u2CCF\u2CD1\u2CD3\u2CD5\u2CD7\u2CD9\u2CDB\u2CDD\u2CDF\u2CE1\u2CE3\u2CE4\u2CEC\u2CEE\u2CF3\u2D00-\u2D25\u2D27\u2D2D\uA641\uA643\uA645\uA647\uA649\uA64B\uA64D\uA64F\uA651\uA653\uA655\uA657\uA659\uA65B\uA65D\uA65F\uA661\uA663\uA665\uA667\uA669\uA66B\uA66D\uA681\uA683\uA685\uA687\uA689\uA68B\uA68D\uA68F\uA691\uA693\uA695\uA697\uA723\uA725\uA727\uA729\uA72B\uA72D\uA72F-\uA731\uA733\uA735\uA737\uA739\uA73B\uA73D\uA73F\uA741\uA743\uA745\uA747\uA749\uA74B\uA74D\uA74F\uA751\uA753\uA755\uA757\uA759\uA75B\uA75D\uA75F\uA761\uA763\uA765\uA767\uA769\uA76B\uA76D\uA76F\uA771-\uA778\uA77A\uA77C\uA77F\uA781\uA783\uA785\uA787\uA78C\uA78E\uA791\uA793\uA7A1\uA7A3\uA7A5\uA7A7\uA7A9\uA7FA\uFB00-\uFB06\uFB13-\uFB17\uFF41-\uFF5A'
        },
        {
            name: 'Lm',
            alias: 'Modifier_Letter',
            bmp: '\u02B0-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0374\u037A\u0559\u0640\u06E5\u06E6\u07F4\u07F5\u07FA\u081A\u0824\u0828\u0971\u0E46\u0EC6\u10FC\u17D7\u1843\u1AA7\u1C78-\u1C7D\u1D2C-\u1D6A\u1D78\u1D9B-\u1DBF\u2071\u207F\u2090-\u209C\u2C7C\u2C7D\u2D6F\u2E2F\u3005\u3031-\u3035\u303B\u309D\u309E\u30FC-\u30FE\uA015\uA4F8-\uA4FD\uA60C\uA67F\uA717-\uA71F\uA770\uA788\uA7F8\uA7F9\uA9CF\uAA70\uAADD\uAAF3\uAAF4\uFF70\uFF9E\uFF9F'
        },
        {
            name: 'Lo',
            alias: 'Other_Letter',
            bmp: '\xAA\xBA\u01BB\u01C0-\u01C3\u0294\u05D0-\u05EA\u05F0-\u05F2\u0620-\u063F\u0641-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u0800-\u0815\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0972-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E45\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10D0-\u10FA\u10FD-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17DC\u1820-\u1842\u1844-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C77\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u2135-\u2138\u2D30-\u2D67\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3006\u303C\u3041-\u3096\u309F\u30A1-\u30FA\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA014\uA016-\uA48C\uA4D0-\uA4F7\uA500-\uA60B\uA610-\uA61F\uA62A\uA62B\uA66E\uA6A0-\uA6E5\uA7FB-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA6F\uAA71-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB\uAADC\uAAE0-\uAAEA\uAAF2\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF66-\uFF6F\uFF71-\uFF9D\uFFA0-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC'
        },
        {
            name: 'Lt',
            alias: 'Titlecase_Letter',
            bmp: '\u01C5\u01C8\u01CB\u01F2\u1F88-\u1F8F\u1F98-\u1F9F\u1FA8-\u1FAF\u1FBC\u1FCC\u1FFC'
        },
        {
            name: 'Lu',
            alias: 'Uppercase_Letter',
            bmp: 'A-Z\xC0-\xD6\xD8-\xDE\u0100\u0102\u0104\u0106\u0108\u010A\u010C\u010E\u0110\u0112\u0114\u0116\u0118\u011A\u011C\u011E\u0120\u0122\u0124\u0126\u0128\u012A\u012C\u012E\u0130\u0132\u0134\u0136\u0139\u013B\u013D\u013F\u0141\u0143\u0145\u0147\u014A\u014C\u014E\u0150\u0152\u0154\u0156\u0158\u015A\u015C\u015E\u0160\u0162\u0164\u0166\u0168\u016A\u016C\u016E\u0170\u0172\u0174\u0176\u0178\u0179\u017B\u017D\u0181\u0182\u0184\u0186\u0187\u0189-\u018B\u018E-\u0191\u0193\u0194\u0196-\u0198\u019C\u019D\u019F\u01A0\u01A2\u01A4\u01A6\u01A7\u01A9\u01AC\u01AE\u01AF\u01B1-\u01B3\u01B5\u01B7\u01B8\u01BC\u01C4\u01C7\u01CA\u01CD\u01CF\u01D1\u01D3\u01D5\u01D7\u01D9\u01DB\u01DE\u01E0\u01E2\u01E4\u01E6\u01E8\u01EA\u01EC\u01EE\u01F1\u01F4\u01F6-\u01F8\u01FA\u01FC\u01FE\u0200\u0202\u0204\u0206\u0208\u020A\u020C\u020E\u0210\u0212\u0214\u0216\u0218\u021A\u021C\u021E\u0220\u0222\u0224\u0226\u0228\u022A\u022C\u022E\u0230\u0232\u023A\u023B\u023D\u023E\u0241\u0243-\u0246\u0248\u024A\u024C\u024E\u0370\u0372\u0376\u0386\u0388-\u038A\u038C\u038E\u038F\u0391-\u03A1\u03A3-\u03AB\u03CF\u03D2-\u03D4\u03D8\u03DA\u03DC\u03DE\u03E0\u03E2\u03E4\u03E6\u03E8\u03EA\u03EC\u03EE\u03F4\u03F7\u03F9\u03FA\u03FD-\u042F\u0460\u0462\u0464\u0466\u0468\u046A\u046C\u046E\u0470\u0472\u0474\u0476\u0478\u047A\u047C\u047E\u0480\u048A\u048C\u048E\u0490\u0492\u0494\u0496\u0498\u049A\u049C\u049E\u04A0\u04A2\u04A4\u04A6\u04A8\u04AA\u04AC\u04AE\u04B0\u04B2\u04B4\u04B6\u04B8\u04BA\u04BC\u04BE\u04C0\u04C1\u04C3\u04C5\u04C7\u04C9\u04CB\u04CD\u04D0\u04D2\u04D4\u04D6\u04D8\u04DA\u04DC\u04DE\u04E0\u04E2\u04E4\u04E6\u04E8\u04EA\u04EC\u04EE\u04F0\u04F2\u04F4\u04F6\u04F8\u04FA\u04FC\u04FE\u0500\u0502\u0504\u0506\u0508\u050A\u050C\u050E\u0510\u0512\u0514\u0516\u0518\u051A\u051C\u051E\u0520\u0522\u0524\u0526\u0531-\u0556\u10A0-\u10C5\u10C7\u10CD\u1E00\u1E02\u1E04\u1E06\u1E08\u1E0A\u1E0C\u1E0E\u1E10\u1E12\u1E14\u1E16\u1E18\u1E1A\u1E1C\u1E1E\u1E20\u1E22\u1E24\u1E26\u1E28\u1E2A\u1E2C\u1E2E\u1E30\u1E32\u1E34\u1E36\u1E38\u1E3A\u1E3C\u1E3E\u1E40\u1E42\u1E44\u1E46\u1E48\u1E4A\u1E4C\u1E4E\u1E50\u1E52\u1E54\u1E56\u1E58\u1E5A\u1E5C\u1E5E\u1E60\u1E62\u1E64\u1E66\u1E68\u1E6A\u1E6C\u1E6E\u1E70\u1E72\u1E74\u1E76\u1E78\u1E7A\u1E7C\u1E7E\u1E80\u1E82\u1E84\u1E86\u1E88\u1E8A\u1E8C\u1E8E\u1E90\u1E92\u1E94\u1E9E\u1EA0\u1EA2\u1EA4\u1EA6\u1EA8\u1EAA\u1EAC\u1EAE\u1EB0\u1EB2\u1EB4\u1EB6\u1EB8\u1EBA\u1EBC\u1EBE\u1EC0\u1EC2\u1EC4\u1EC6\u1EC8\u1ECA\u1ECC\u1ECE\u1ED0\u1ED2\u1ED4\u1ED6\u1ED8\u1EDA\u1EDC\u1EDE\u1EE0\u1EE2\u1EE4\u1EE6\u1EE8\u1EEA\u1EEC\u1EEE\u1EF0\u1EF2\u1EF4\u1EF6\u1EF8\u1EFA\u1EFC\u1EFE\u1F08-\u1F0F\u1F18-\u1F1D\u1F28-\u1F2F\u1F38-\u1F3F\u1F48-\u1F4D\u1F59\u1F5B\u1F5D\u1F5F\u1F68-\u1F6F\u1FB8-\u1FBB\u1FC8-\u1FCB\u1FD8-\u1FDB\u1FE8-\u1FEC\u1FF8-\u1FFB\u2102\u2107\u210B-\u210D\u2110-\u2112\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u2130-\u2133\u213E\u213F\u2145\u2183\u2C00-\u2C2E\u2C60\u2C62-\u2C64\u2C67\u2C69\u2C6B\u2C6D-\u2C70\u2C72\u2C75\u2C7E-\u2C80\u2C82\u2C84\u2C86\u2C88\u2C8A\u2C8C\u2C8E\u2C90\u2C92\u2C94\u2C96\u2C98\u2C9A\u2C9C\u2C9E\u2CA0\u2CA2\u2CA4\u2CA6\u2CA8\u2CAA\u2CAC\u2CAE\u2CB0\u2CB2\u2CB4\u2CB6\u2CB8\u2CBA\u2CBC\u2CBE\u2CC0\u2CC2\u2CC4\u2CC6\u2CC8\u2CCA\u2CCC\u2CCE\u2CD0\u2CD2\u2CD4\u2CD6\u2CD8\u2CDA\u2CDC\u2CDE\u2CE0\u2CE2\u2CEB\u2CED\u2CF2\uA640\uA642\uA644\uA646\uA648\uA64A\uA64C\uA64E\uA650\uA652\uA654\uA656\uA658\uA65A\uA65C\uA65E\uA660\uA662\uA664\uA666\uA668\uA66A\uA66C\uA680\uA682\uA684\uA686\uA688\uA68A\uA68C\uA68E\uA690\uA692\uA694\uA696\uA722\uA724\uA726\uA728\uA72A\uA72C\uA72E\uA732\uA734\uA736\uA738\uA73A\uA73C\uA73E\uA740\uA742\uA744\uA746\uA748\uA74A\uA74C\uA74E\uA750\uA752\uA754\uA756\uA758\uA75A\uA75C\uA75E\uA760\uA762\uA764\uA766\uA768\uA76A\uA76C\uA76E\uA779\uA77B\uA77D\uA77E\uA780\uA782\uA784\uA786\uA78B\uA78D\uA790\uA792\uA7A0\uA7A2\uA7A4\uA7A6\uA7A8\uA7AA\uFF21-\uFF3A'
        },
        {
            name: 'M',
            alias: 'Mark',
            bmp: '\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08E4-\u08FE\u0900-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C01-\u0C03\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C82\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D02\u0D03\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u18A9\u1920-\u192B\u1930-\u193B\u19B0-\u19C0\u19C8\u19C9\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1DC0-\u1DE6\u1DFC-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C4\uA8E0-\uA8F1\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE26'
        },
        {
            name: 'Mc',
            alias: 'Spacing_Mark',
            bmp: '\u0903\u093B\u093E-\u0940\u0949-\u094C\u094E\u094F\u0982\u0983\u09BE-\u09C0\u09C7\u09C8\u09CB\u09CC\u09D7\u0A03\u0A3E-\u0A40\u0A83\u0ABE-\u0AC0\u0AC9\u0ACB\u0ACC\u0B02\u0B03\u0B3E\u0B40\u0B47\u0B48\u0B4B\u0B4C\u0B57\u0BBE\u0BBF\u0BC1\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCC\u0BD7\u0C01-\u0C03\u0C41-\u0C44\u0C82\u0C83\u0CBE\u0CC0-\u0CC4\u0CC7\u0CC8\u0CCA\u0CCB\u0CD5\u0CD6\u0D02\u0D03\u0D3E-\u0D40\u0D46-\u0D48\u0D4A-\u0D4C\u0D57\u0D82\u0D83\u0DCF-\u0DD1\u0DD8-\u0DDF\u0DF2\u0DF3\u0F3E\u0F3F\u0F7F\u102B\u102C\u1031\u1038\u103B\u103C\u1056\u1057\u1062-\u1064\u1067-\u106D\u1083\u1084\u1087-\u108C\u108F\u109A-\u109C\u17B6\u17BE-\u17C5\u17C7\u17C8\u1923-\u1926\u1929-\u192B\u1930\u1931\u1933-\u1938\u19B0-\u19C0\u19C8\u19C9\u1A19-\u1A1B\u1A55\u1A57\u1A61\u1A63\u1A64\u1A6D-\u1A72\u1B04\u1B35\u1B3B\u1B3D-\u1B41\u1B43\u1B44\u1B82\u1BA1\u1BA6\u1BA7\u1BAA\u1BAC\u1BAD\u1BE7\u1BEA-\u1BEC\u1BEE\u1BF2\u1BF3\u1C24-\u1C2B\u1C34\u1C35\u1CE1\u1CF2\u1CF3\u302E\u302F\uA823\uA824\uA827\uA880\uA881\uA8B4-\uA8C3\uA952\uA953\uA983\uA9B4\uA9B5\uA9BA\uA9BB\uA9BD-\uA9C0\uAA2F\uAA30\uAA33\uAA34\uAA4D\uAA7B\uAAEB\uAAEE\uAAEF\uAAF5\uABE3\uABE4\uABE6\uABE7\uABE9\uABEA\uABEC'
        },
        {
            name: 'Me',
            alias: 'Enclosing_Mark',
            bmp: '\u0488\u0489\u20DD-\u20E0\u20E2-\u20E4\uA670-\uA672'
        },
        {
            name: 'Mn',
            alias: 'Nonspacing_Mark',
            bmp: '\u0300-\u036F\u0483-\u0487\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08E4-\u08FE\u0900-\u0902\u093A\u093C\u0941-\u0948\u094D\u0951-\u0957\u0962\u0963\u0981\u09BC\u09C1-\u09C4\u09CD\u09E2\u09E3\u0A01\u0A02\u0A3C\u0A41\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81\u0A82\u0ABC\u0AC1-\u0AC5\u0AC7\u0AC8\u0ACD\u0AE2\u0AE3\u0B01\u0B3C\u0B3F\u0B41-\u0B44\u0B4D\u0B56\u0B62\u0B63\u0B82\u0BC0\u0BCD\u0C3E-\u0C40\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0CBC\u0CBF\u0CC6\u0CCC\u0CCD\u0CE2\u0CE3\u0D41-\u0D44\u0D4D\u0D62\u0D63\u0DCA\u0DD2-\u0DD4\u0DD6\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F71-\u0F7E\u0F80-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102D-\u1030\u1032-\u1037\u1039\u103A\u103D\u103E\u1058\u1059\u105E-\u1060\u1071-\u1074\u1082\u1085\u1086\u108D\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4\u17B5\u17B7-\u17BD\u17C6\u17C9-\u17D3\u17DD\u180B-\u180D\u18A9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193B\u1A17\u1A18\u1A56\u1A58-\u1A5E\u1A60\u1A62\u1A65-\u1A6C\u1A73-\u1A7C\u1A7F\u1B00-\u1B03\u1B34\u1B36-\u1B3A\u1B3C\u1B42\u1B6B-\u1B73\u1B80\u1B81\u1BA2-\u1BA5\u1BA8\u1BA9\u1BAB\u1BE6\u1BE8\u1BE9\u1BED\u1BEF-\u1BF1\u1C2C-\u1C33\u1C36\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE0\u1CE2-\u1CE8\u1CED\u1CF4\u1DC0-\u1DE6\u1DFC-\u1DFF\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302D\u3099\u309A\uA66F\uA674-\uA67D\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA825\uA826\uA8C4\uA8E0-\uA8F1\uA926-\uA92D\uA947-\uA951\uA980-\uA982\uA9B3\uA9B6-\uA9B9\uA9BC\uAA29-\uAA2E\uAA31\uAA32\uAA35\uAA36\uAA43\uAA4C\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEC\uAAED\uAAF6\uABE5\uABE8\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE26'
        },
        {
            name: 'N',
            alias: 'Number',
            bmp: '0-9\xB2\xB3\xB9\xBC-\xBE\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u09F4-\u09F9\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0B72-\u0B77\u0BE6-\u0BF2\u0C66-\u0C6F\u0C78-\u0C7E\u0CE6-\u0CEF\u0D66-\u0D75\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F33\u1040-\u1049\u1090-\u1099\u1369-\u137C\u16EE-\u16F0\u17E0-\u17E9\u17F0-\u17F9\u1810-\u1819\u1946-\u194F\u19D0-\u19DA\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\u2070\u2074-\u2079\u2080-\u2089\u2150-\u2182\u2185-\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2CFD\u3007\u3021-\u3029\u3038-\u303A\u3192-\u3195\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\uA620-\uA629\uA6E6-\uA6EF\uA830-\uA835\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19'
        },
        {
            name: 'Nd',
            alias: 'Decimal_Number',
            bmp: '0-9\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29\u1040-\u1049\u1090-\u1099\u17E0-\u17E9\u1810-\u1819\u1946-\u194F\u19D0-\u19D9\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\uA620-\uA629\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19'
        },
        {
            name: 'Nl',
            alias: 'Letter_Number',
            bmp: '\u16EE-\u16F0\u2160-\u2182\u2185-\u2188\u3007\u3021-\u3029\u3038-\u303A\uA6E6-\uA6EF'
        },
        {
            name: 'No',
            alias: 'Other_Number',
            bmp: '\xB2\xB3\xB9\xBC-\xBE\u09F4-\u09F9\u0B72-\u0B77\u0BF0-\u0BF2\u0C78-\u0C7E\u0D70-\u0D75\u0F2A-\u0F33\u1369-\u137C\u17F0-\u17F9\u19DA\u2070\u2074-\u2079\u2080-\u2089\u2150-\u215F\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2CFD\u3192-\u3195\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\uA830-\uA835'
        },
        {
            name: 'P',
            alias: 'Punctuation',
            bmp: '\x21-\x23\x25-\\x2A\x2C-\x2F\x3A\x3B\\x3F\x40\\x5B-\\x5D\x5F\\x7B\x7D\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u0AF0\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E3B\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65'
        },
        {
            name: 'Pc',
            alias: 'Connector_Punctuation',
            bmp: '\x5F\u203F\u2040\u2054\uFE33\uFE34\uFE4D-\uFE4F\uFF3F'
        },
        {
            name: 'Pd',
            alias: 'Dash_Punctuation',
            bmp: '\\x2D\u058A\u05BE\u1400\u1806\u2010-\u2015\u2E17\u2E1A\u2E3A\u2E3B\u301C\u3030\u30A0\uFE31\uFE32\uFE58\uFE63\uFF0D'
        },
        {
            name: 'Pe',
            alias: 'Close_Punctuation',
            bmp: '\\x29\\x5D\x7D\u0F3B\u0F3D\u169C\u2046\u207E\u208E\u232A\u2769\u276B\u276D\u276F\u2771\u2773\u2775\u27C6\u27E7\u27E9\u27EB\u27ED\u27EF\u2984\u2986\u2988\u298A\u298C\u298E\u2990\u2992\u2994\u2996\u2998\u29D9\u29DB\u29FD\u2E23\u2E25\u2E27\u2E29\u3009\u300B\u300D\u300F\u3011\u3015\u3017\u3019\u301B\u301E\u301F\uFD3F\uFE18\uFE36\uFE38\uFE3A\uFE3C\uFE3E\uFE40\uFE42\uFE44\uFE48\uFE5A\uFE5C\uFE5E\uFF09\uFF3D\uFF5D\uFF60\uFF63'
        },
        {
            name: 'Pf',
            alias: 'Final_Punctuation',
            bmp: '\xBB\u2019\u201D\u203A\u2E03\u2E05\u2E0A\u2E0D\u2E1D\u2E21'
        },
        {
            name: 'Pi',
            alias: 'Initial_Punctuation',
            bmp: '\xAB\u2018\u201B\u201C\u201F\u2039\u2E02\u2E04\u2E09\u2E0C\u2E1C\u2E20'
        },
        {
            name: 'Po',
            alias: 'Other_Punctuation',
            bmp: '\x21-\x23\x25-\x27\\x2A\x2C\\x2E\x2F\x3A\x3B\\x3F\x40\\x5C\xA1\xA7\xB6\xB7\xBF\u037E\u0387\u055A-\u055F\u0589\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u0AF0\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u166D\u166E\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u1805\u1807-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2016\u2017\u2020-\u2027\u2030-\u2038\u203B-\u203E\u2041-\u2043\u2047-\u2051\u2053\u2055-\u205E\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00\u2E01\u2E06-\u2E08\u2E0B\u2E0E-\u2E16\u2E18\u2E19\u2E1B\u2E1E\u2E1F\u2E2A-\u2E2E\u2E30-\u2E39\u3001-\u3003\u303D\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFE10-\uFE16\uFE19\uFE30\uFE45\uFE46\uFE49-\uFE4C\uFE50-\uFE52\uFE54-\uFE57\uFE5F-\uFE61\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF07\uFF0A\uFF0C\uFF0E\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3C\uFF61\uFF64\uFF65'
        },
        {
            name: 'Ps',
            alias: 'Open_Punctuation',
            bmp: '\\x28\\x5B\\x7B\u0F3A\u0F3C\u169B\u201A\u201E\u2045\u207D\u208D\u2329\u2768\u276A\u276C\u276E\u2770\u2772\u2774\u27C5\u27E6\u27E8\u27EA\u27EC\u27EE\u2983\u2985\u2987\u2989\u298B\u298D\u298F\u2991\u2993\u2995\u2997\u29D8\u29DA\u29FC\u2E22\u2E24\u2E26\u2E28\u3008\u300A\u300C\u300E\u3010\u3014\u3016\u3018\u301A\u301D\uFD3E\uFE17\uFE35\uFE37\uFE39\uFE3B\uFE3D\uFE3F\uFE41\uFE43\uFE47\uFE59\uFE5B\uFE5D\uFF08\uFF3B\uFF5B\uFF5F\uFF62'
        },
        {
            name: 'S',
            alias: 'Symbol',
            bmp: '\\x24\\x2B\x3C-\x3E\\x5E\x60\\x7C\x7E\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20BA\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u2190-\u2328\u232B-\u23F3\u2400-\u2426\u2440-\u244A\u249C-\u24E9\u2500-\u26FF\u2701-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B4C\u2B50-\u2B59\u2CE5-\u2CEA\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E3\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u32FE\u3300-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uFB29\uFBB2-\uFBC1\uFDFC\uFDFD\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD'
        },
        {
            name: 'Sc',
            alias: 'Currency_Symbol',
            bmp: '\\x24\xA2-\xA5\u058F\u060B\u09F2\u09F3\u09FB\u0AF1\u0BF9\u0E3F\u17DB\u20A0-\u20BA\uA838\uFDFC\uFE69\uFF04\uFFE0\uFFE1\uFFE5\uFFE6'
        },
        {
            name: 'Sk',
            alias: 'Modifier_Symbol',
            bmp: '\\x5E\x60\xA8\xAF\xB4\xB8\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u309B\u309C\uA700-\uA716\uA720\uA721\uA789\uA78A\uFBB2-\uFBC1\uFF3E\uFF40\uFFE3'
        },
        {
            name: 'Sm',
            alias: 'Math_Symbol',
            bmp: '\\x2B\x3C-\x3E\\x7C\x7E\xAC\xB1\xD7\xF7\u03F6\u0606-\u0608\u2044\u2052\u207A-\u207C\u208A-\u208C\u2118\u2140-\u2144\u214B\u2190-\u2194\u219A\u219B\u21A0\u21A3\u21A6\u21AE\u21CE\u21CF\u21D2\u21D4\u21F4-\u22FF\u2308-\u230B\u2320\u2321\u237C\u239B-\u23B3\u23DC-\u23E1\u25B7\u25C1\u25F8-\u25FF\u266F\u27C0-\u27C4\u27C7-\u27E5\u27F0-\u27FF\u2900-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2AFF\u2B30-\u2B44\u2B47-\u2B4C\uFB29\uFE62\uFE64-\uFE66\uFF0B\uFF1C-\uFF1E\uFF5C\uFF5E\uFFE2\uFFE9-\uFFEC'
        },
        {
            name: 'So',
            alias: 'Other_Symbol',
            bmp: '\xA6\xA9\xAE\xB0\u0482\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u09FA\u0B70\u0BF3-\u0BF8\u0BFA\u0C7F\u0D79\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116\u2117\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u214A\u214C\u214D\u214F\u2195-\u2199\u219C-\u219F\u21A1\u21A2\u21A4\u21A5\u21A7-\u21AD\u21AF-\u21CD\u21D0\u21D1\u21D3\u21D5-\u21F3\u2300-\u2307\u230C-\u231F\u2322-\u2328\u232B-\u237B\u237D-\u239A\u23B4-\u23DB\u23E2-\u23F3\u2400-\u2426\u2440-\u244A\u249C-\u24E9\u2500-\u25B6\u25B8-\u25C0\u25C2-\u25F7\u2600-\u266E\u2670-\u26FF\u2701-\u2767\u2794-\u27BF\u2800-\u28FF\u2B00-\u2B2F\u2B45\u2B46\u2B50-\u2B59\u2CE5-\u2CEA\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u3190\u3191\u3196-\u319F\u31C0-\u31E3\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u32FE\u3300-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA828-\uA82B\uA836\uA837\uA839\uAA77-\uAA79\uFDFD\uFFE4\uFFE8\uFFED\uFFEE\uFFFC\uFFFD'
        },
        {
            name: 'Z',
            alias: 'Separator',
            bmp: '\x20\xA0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000'
        },
        {
            name: 'Zl',
            alias: 'Line_Separator',
            bmp: '\u2028'
        },
        {
            name: 'Zp',
            alias: 'Paragraph_Separator',
            bmp: '\u2029'
        },
        {
            name: 'Zs',
            alias: 'Space_Separator',
            bmp: '\x20\xA0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000'
        }
    ]);

}(XRegExp));

/******** END unicode-categories.js ********/
/******** BEGIN unicode-zotero.js ********/
/**
 * Adds support for various character categories used by Zotero.
 * Token names are case insensitive, and any spaces, hyphens, and underscores are ignored.
 * @requires XRegExp, Unicode Base
 */
(function(XRegExp) {
    'use strict';

    if (!XRegExp.addUnicodeData) {
        throw new ReferenceError('Unicode Base must be loaded before Unicode Zotero');
    }

    XRegExp.addUnicodeData([
        {
            name: 'WSpace',
            alias: 'White_Space',
            bmp: '\x09-\x0D\x20\x85\xA0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000'
        },
        {
            name: 'Hex',
            alias: 'Hex_Digit',
            bmp: '0-9A-Fa-f\uFF10-\uFF19\uFF21-\uFF26\uFF41-\uFF46'
        },
        {
            name: 'Dash',
            bmp: '\x2D\u058A\u05BE\u1806\u2010-\u2015\u2053\u207B\u208B\u2212\u2E17\u2E1A\u301C\u3030\u30A0\uFE31-\uFE32\uFE58\uFE63\uFF0D'
        },
        {
            name: 'Hyphen',
            bmp: '\x2D\xAD\u058A\u1806\u2010-\u2011\u2E17\u30FB\uFE63\uFF0D\uFF65'
        },
        {
            name: 'QMark',
            alias: 'Quotation_Mark',
            bmp: '\x22\x27\xAB\xBB\u2018\u2019\u201A\u201B-\u201C\u201D\u201E\u201F\u2039\u203A\u300C\u300D\u300E\u300F\u301D\u301E-\u301F\uFE41\uFE42\uFE43\uFE44\uFF02\uFF07\uFF62\uFF63'
        },
        {
            name: 'Term',
            alias: 'Terminal_Punctuation',
            bmp: '\x21\x2C\x2E\x3A-\x3B\x3F\u037E\u0387\u0589\u05C3\u060C\u061B\u061F\u06D4\u0700-\u070A\u070C\u07F8-\u07F9\u0964-\u0965\u0E5A-\u0E5B\u0F08\u0F0D-\u0F12\u104A-\u104B\u1361-\u1368\u166D-\u166E\u16EB-\u16ED\u17D4-\u17D6\u17DA\u1802-\u1805\u1808-\u1809\u1944-\u1945\u1B5A-\u1B5B\u1B5D-\u1B5F\u1C3B-\u1C3F\u1C7E-\u1C7F\u203C-\u203D\u2047-\u2049\u2E2E\u3001-\u3002\uA60D-\uA60F\uA876-\uA877\uA8CE-\uA8CF\uA92F\uAA5D-\uAA5F\uFE50-\uFE52\uFE54-\uFE57\uFF01\uFF0C\uFF0E\uFF1A-\uFF1B\uFF1F\uFF61\uFF64\u1039F\u103D0\u1091F\u12470-\u12473'
        }
    ]);

}(XRegExp));

/******** END unicode-zotero.js ********/
/******** BEGIN utilities.js ********/
/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2009 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://zotero.org

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.


	Utilities based in part on code taken from Piggy Bank 2.1.1 (BSD-licensed)

    ***** END LICENSE BLOCK *****
*/

/*
 * Mappings for names
 * Note that this is the reverse of the text variable map, since all mappings should be one to one
 * and it makes the code cleaner
 */
const CSL_NAMES_MAPPINGS = {
	"author":"author",
	"editor":"editor",
	"bookAuthor":"container-author",
	"composer":"composer",
	"director":"director",
	"interviewer":"interviewer",
	"recipient":"recipient",
	"reviewedAuthor":"reviewed-author",
	"seriesEditor":"collection-editor",
	"translator":"translator"
}

/*
 * Mappings for text variables
 */
const CSL_TEXT_MAPPINGS = {
	"title":["title"],
	"container-title":["publicationTitle",  "reporter", "code"], /* reporter and code should move to SQL mapping tables */
	"collection-title":["seriesTitle", "series"],
	"collection-number":["seriesNumber"],
	"publisher":["publisher", "distributor"], /* distributor should move to SQL mapping tables */
	"publisher-place":["place"],
	"authority":["court","legislativeBody", "issuingAuthority"],
	"page":["pages"],
	"volume":["volume", "codeNumber"],
	"issue":["issue", "priorityNumbers"],
	"number-of-volumes":["numberOfVolumes"],
	"number-of-pages":["numPages"],
	"edition":["edition"],
	"version":["versionNumber"],
	"section":["section", "committee"],
	"genre":["type", "programmingLanguage"],
	"source":["libraryCatalog"],
	"dimensions": ["artworkSize", "runningTime"],
	"medium":["medium", "system"],
	"scale":["scale"],
	"archive":["archive"],
	"archive_location":["archiveLocation"],
	"event":["meetingName", "conferenceName"], /* these should be mapped to the same base field in SQL mapping tables */
	"event-place":["place"],
	"abstract":["abstractNote"],
	"URL":["url"],
	"DOI":["DOI"],
	"ISBN":["ISBN"],
	"ISSN":["ISSN"],
	"call-number":["callNumber", "applicationNumber"],
	"note":["extra"],
	"number":["number"],
	"chapter-number":["session"],
	"references":["history", "references"],
	"shortTitle":["shortTitle"],
	"journalAbbreviation":["journalAbbreviation"],
	"status":["legalStatus"],
	"language":["language"]
}

/*
 * Mappings for dates
 */
const CSL_DATE_MAPPINGS = {
	"issued":"date",
	"accessed":"accessDate",
	"submitted":"filingDate"
}

/*
 * Mappings for types
 * Also see itemFromCSLJSON
 */
const CSL_TYPE_MAPPINGS = {
	'book':"book",
	'bookSection':'chapter',
	'journalArticle':"article-journal",
	'magazineArticle':"article-magazine",
	'newspaperArticle':"article-newspaper",
	'thesis':"thesis",
	'encyclopediaArticle':"entry-encyclopedia",
	'dictionaryEntry':"entry-dictionary",
	'conferencePaper':"paper-conference",
	'letter':"personal_communication",
	'manuscript':"manuscript",
	'interview':"interview",
	'film':"motion_picture",
	'artwork':"graphic",
	'webpage':"webpage",
	'report':"report",
	'bill':"bill",
	'case':"legal_case",
	'hearing':"bill",				// ??
	'patent':"patent",
	'statute':"legislation",		// ??
	'email':"personal_communication",
	'map':"map",
	'blogPost':"post-weblog",
	'instantMessage':"personal_communication",
	'forumPost':"post",
	'audioRecording':"song",		// ??
	'presentation':"speech",
	'videoRecording':"motion_picture",
	'tvBroadcast':"broadcast",
	'radioBroadcast':"broadcast",
	'podcast':"song",			// ??
	'computerProgram':"book",		// ??
	'document':"article",
	'note':"article",
	'attachment':"article"
};

/**
 * @class Functions for text manipulation and other miscellaneous purposes
 */
Zotero.Utilities = {
	/**
	 * Cleans extraneous punctuation off a creator name and parse into first and last name
	 *
	 * @param {String} author Creator string
	 * @param {String} type Creator type string (e.g., "author" or "editor")
	 * @param {Boolean} useComma Whether the creator string is in inverted (Last, First) format
	 * @return {Object} firstName, lastName, and creatorType
	 */
	"cleanAuthor":function(author, type, useComma) {
		var allCaps = 'A-Z' +
									'\u0400-\u042f';		//cyrilic

		var allCapsRe = new RegExp('^[' + allCaps + ']+$');
		var initialRe = new RegExp('^-?[' + allCaps + ']$');

		if(typeof(author) != "string") {
			throw "cleanAuthor: author must be a string";
		}

		author = author.replace(/^[\s\u00A0\.\,\/\[\]\:]+/, '')
									  .replace(/[\s\u00A0\.\,\/\[\]\:]+$/, '')
									.replace(/[\s\u00A0]+/, ' ');

		if(useComma) {
			// Add spaces between periods
			author = author.replace(/\.([^ ])/, ". $1");

			var splitNames = author.split(/, ?/);
			if(splitNames.length > 1) {
				var lastName = splitNames[0];
				var firstName = splitNames[1];
			} else {
				var lastName = author;
			}
		} else {
			var spaceIndex = author.lastIndexOf(" ");
			var lastName = author.substring(spaceIndex+1);
			var firstName = author.substring(0, spaceIndex);
		}

		if(firstName && allCapsRe.test(firstName) &&
				firstName.length < 4 &&
				(firstName.length == 1 || lastName.toUpperCase() != lastName)) {
			// first name is probably initials
			var newFirstName = "";
			for(var i=0; i<firstName.length; i++) {
				newFirstName += " "+firstName[i]+".";
			}
			firstName = newFirstName.substr(1);
		}

		//add periods after all the initials
		if(firstName) {
			var names = firstName.replace(/^[\s\.]+/,'')
						.replace(/[\s\,]+$/,'')
						//remove spaces surronding any dashes
						.replace(/\s*([\u002D\u00AD\u2010-\u2015\u2212\u2E3A\u2E3B])\s*/,'-')
						.split(/(?:[\s\.]+|(?=-))/);
			var newFirstName = '';
			for(var i=0, n=names.length; i<n; i++) {
				newFirstName += names[i];
				if(initialRe.test(names[i])) newFirstName += '.';
				newFirstName += ' ';
			}
			firstName = newFirstName.replace(/ -/g,'-').trim();
		}

		return {firstName:firstName, lastName:lastName, creatorType:type};
	},

	/**
	 * Removes leading and trailing whitespace from a string
	 * @type String
	 */
	"trim":function(/**String*/ s) {
		if (typeof(s) != "string") {
			throw "trim: argument must be a string";
		}

		s = s.replace(/^\s+/, "");
		return s.replace(/\s+$/, "");
	},

	/**
	 * Cleans whitespace off a string and replaces multiple spaces with one
	 * @type String
	 */
	"trimInternal":function(/**String*/ s) {
		if (typeof(s) != "string") {
			throw new Error("trimInternal: argument must be a string");
		}

		s = s.replace(/[\xA0\r\n\s]+/g, " ");
		return this.trim(s);
	},

	/**
	 * Cleans any non-word non-parenthesis characters off the ends of a string
	 * @type String
	 */
	"superCleanString":function(/**String*/ x) {
		if(typeof(x) != "string") {
			throw "superCleanString: argument must be a string";
		}

		var x = x.replace(/^[\x00-\x27\x29-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F\s]+/, "");
		return x.replace(/[\x00-\x28\x2A-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F\s]+$/, "");
	},

	/**
	 * Eliminates HTML tags, replacing &lt;br&gt;s with newlines
	 * @type String
	 */
	"cleanTags":function(/**String*/ x) {
		if(typeof(x) != "string") {
			throw "cleanTags: argument must be a string";
		}

		x = x.replace(/<br[^>]*>/gi, "\n");
		return x.replace(/<[^>]+>/g, "");
	},

	/**
	 * Strip info:doi prefix and any suffixes from a DOI
	 * @type String
	 */
	"cleanDOI":function(/**String**/ x) {
		if(typeof(x) != "string") {
			throw "cleanDOI: argument must be a string";
		}

		var doi = x.match(/10\.[0-9]{4,}\/[^\s]*[^\s\.,]/);
		return doi ? doi[0] : null;
	},

	/**
	 * Clean and validate ISBN.
	 * Return isbn if valid, otherwise return false
	 * @param {String} isbn
	 * @param {Boolean} [dontValidate=false] Do not validate check digit
	 * @return {String|Boolean} Valid ISBN or false
	 */
	"cleanISBN":function(isbnStr, dontValidate) {
		isbnStr = isbnStr.toUpperCase()
			.replace(/[\x2D\xAD\u2010-\u2015\u2043\u2212]+/g, ''); // Ignore dashes
		var isbnRE = /\b(?:97[89]\s*(?:\d\s*){9}\d|(?:\d\s*){9}[\dX])\b/g,
			isbnMatch;
		while(isbnMatch = isbnRE.exec(isbnStr)) {
			var isbn = isbnMatch[0].replace(/\s+/g, '');

			if (dontValidate) {
				return isbn;
			}

			if(isbn.length == 10) {
				// Verify ISBN-10 checksum
				var sum = 0;
				for (var i = 0; i < 9; i++) {
					sum += isbn[i] * (10-i);
				}
				//check digit might be 'X'
				sum += (isbn[9] == 'X')? 10 : isbn[9]*1;

				if (sum % 11 == 0) return isbn;
			} else {
				// Verify ISBN 13 checksum
				var sum = 0;
				for (var i = 0; i < 12; i+=2) sum += isbn[i]*1;	//to make sure it's int
				for (var i = 1; i < 12; i+=2) sum += isbn[i]*3;
				sum += isbn[12]*1; //add the check digit

				if (sum % 10 == 0 ) return isbn;
			}

			isbnRE.lastIndex = isbnMatch.index + 1; // Retry the same spot + 1
		}

		return false;
	},

	/*
	 * Convert ISBN 10 to ISBN 13
	 * @param {String} isbn ISBN 10 or ISBN 13
	 *   cleanISBN
	 * @return {String} ISBN-13
	 */
	"toISBN13": function(isbnStr) {
		var isbn;
		if (!(isbn = Zotero.Utilities.cleanISBN(isbnStr, true))) {
			throw new Error('ISBN not found in "' + isbnStr + '"');
		}

		if (isbn.length == 13) {
			isbn = isbn.substr(0,12); // Strip off check digit and re-calculate it
		} else {
			isbn = '978' + isbn.substr(0,9);
		}

		var sum = 0;
		for (var i = 0; i < 12; i++) {
			sum += isbn[i] * (i%2 ? 3 : 1);
		}

		var checkDigit = 10 - (sum % 10);
		if (checkDigit == 10) checkDigit = 0;

		return isbn + checkDigit;
	},

	/**
	 * Clean and validate ISSN.
	 * Return issn if valid, otherwise return false
	 */
	"cleanISSN":function(/**String*/ issnStr) {
		issnStr = issnStr.toUpperCase()
			.replace(/[\x2D\xAD\u2010-\u2015\u2043\u2212]+/g, ''); // Ignore dashes
		var issnRE = /\b(?:\d\s*){7}[\dX]\b/g,
			issnMatch;
		while (issnMatch = issnRE.exec(issnStr)) {
			var issn = issnMatch[0].replace(/\s+/g, '');

			// Verify ISSN checksum
			var sum = 0;
			for (var i = 0; i < 7; i++) {
				sum += issn[i] * (8-i);
			}
			//check digit might be 'X'
			sum += (issn[7] == 'X')? 10 : issn[7]*1;

			if (sum % 11 == 0) {
				return issn.substring(0,4) + '-' + issn.substring(4);
			}

			issnRE.lastIndex = issnMatch.index + 1; // Retry same spot + 1
		}

		return false;
	},

	/**
	 * Convert plain text to HTML by replacing special characters and replacing newlines with BRs or
	 * P tags
	 * @param {String} str Plain text string
	 * @param {Boolean} singleNewlineIsParagraph Whether single newlines should be considered as
	 *     paragraphs. If true, each newline is replaced with a P tag. If false, double newlines
	 *     are replaced with P tags, while single newlines are replaced with BR tags.
	 * @type String
	 */
	"text2html":function (/**String**/ str, /**Boolean**/ singleNewlineIsParagraph) {
		str = Zotero.Utilities.htmlSpecialChars(str);

		// \n => <p>
		if (singleNewlineIsParagraph) {
			str = '<p>'
					+ str.replace(/\n/g, '</p><p>')
						.replace(/  /g, '&nbsp; ')
				+ '</p>';
		}
		// \n\n => <p>, \n => <br/>
		else {
			str = '<p>'
					+ str.replace(/\n\n/g, '</p><p>')
						.replace(/\n/g, '<br/>')
						.replace(/  /g, '&nbsp; ')
				+ '</p>';
		}
		return str.replace(/<p>\s*<\/p>/g, '<p>&nbsp;</p>');
	},

	/**
	 * Encode special XML/HTML characters
	 * Certain entities can be inserted manually:
	 *   <ZOTEROBREAK/> => <br/>
	 *   <ZOTEROHELLIP/> => &#8230;
	 *
	 * @param {String} str
	 * @return {String}
	 */
	"htmlSpecialChars":function(str) {
		if (str && typeof str != 'string') {
			str = str.toString();
		}

		if (!str) return '';

		return str
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/&lt;ZOTERO([^\/]+)\/&gt;/g, function (str, p1, offset, s) {
			switch (p1) {
				case 'BREAK':
					return '<br/>';
				case 'HELLIP':
					return '&#8230;';
				default:
					return p1;
			}
		});
	},

	/**
	 * Decodes HTML entities within a string, returning plain text
	 * @type String
	 */
	"unescapeHTML":new function() {
		var nsIScriptableUnescapeHTML, node;

		return function(/**String*/ str) {
			// If no tags, no need to unescape
			if(str.indexOf("<") === -1 && str.indexOf("&") === -1) return str;

			if(Zotero.isFx && !Zotero.isBookmarklet) {
				// Create a node and use the textContent property to do unescaping where
				// possible, because this approach preserves line endings in the HTML
				if(node === undefined) {
					var parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
						 .createInstance(Components.interfaces.nsIDOMParser);
					var domDocument = parser.parseFromString("<!DOCTYPE html><html></html>",
						"text/html");
					node = domDocument.createElement("div");
				}

				node.innerHTML = str;
				return node.textContent.replace(/ {2,}/g, " ");
			} else if(Zotero.isNode) {
				/*var doc = require('jsdom').jsdom(str, null, {
					"features":{
						"FetchExternalResources":false,
						"ProcessExternalResources":false,
						"MutationEvents":false,
						"QuerySelector":false
					}
				});
				if(!doc.documentElement) return str;
				return doc.documentElement.textContent;*/
				return Zotero.Utilities.cleanTags(str);
			} else {
				if(!node) node = document.createElement("div");
				node.innerHTML = str;
				return ("textContent" in node ? node.textContent : node.innerText).replace(/ {2,}/g, " ");
			}
		};
	},

	/**
	 * Wrap URLs and DOIs in <a href=""> links in plain text
	 *
	 * Ignore URLs preceded by '>', just in case there are already links
	 * @type String
	 */
	"autoLink":function (/**String**/ str) {
		// "http://www.google.com."
		// "http://www.google.com. "
		// "<http://www.google.com>" (and other characters, with or without a space after)
		str = str.replace(/([^>])(https?:\/\/[^\s]+)([\."'>:\]\)](\s|$))/g, '$1<a href="$2">$2</a>$3');
		// "http://www.google.com"
		// "http://www.google.com "
		str = str.replace(/([^">])(https?:\/\/[^\s]+)(\s|$)/g, '$1<a href="$2">$2</a>$3');

		// DOI
		str = str.replace(/(doi:[ ]*)(10\.[^\s]+[0-9a-zA-Z])/g, '$1<a href="http://dx.doi.org/$2">$2</a>');
		return str;
	},

	/**
	 * Parses a text string for HTML/XUL markup and returns an array of parts. Currently only finds
	 * HTML links (&lt;a&gt; tags)
	 *
	 * @return {Array} An array of objects with the following form:<br>
	 * <pre>   {
	 *         type: 'text'|'link',
	 *         text: "text content",
	 *         [ attributes: { key1: val [ , key2: val, ...] }
	 *    }</pre>
	 */
	"parseMarkup":function(/**String*/ str) {
		var parts = [];
		var splits = str.split(/(<a [^>]+>[^<]*<\/a>)/);

		for(var i=0; i<splits.length; i++) {
			// Link
			if (splits[i].indexOf('<a ') == 0) {
				var matches = splits[i].match(/<a ([^>]+)>([^<]*)<\/a>/);
				if (matches) {
					// Attribute pairs
					var attributes = {};
					var pairs = matches[1].match(/([^ =]+)="([^"]+")/g);
					for(var j=0; j<pairs.length; j++) {
						var keyVal = pairs[j].split(/=/);
						attributes[keyVal[0]] = keyVal[1].substr(1, keyVal[1].length - 2);
					}

					parts.push({
						type: 'link',
						text: matches[2],
						attributes: attributes
					});
					continue;
				}
			}

			parts.push({
				type: 'text',
				text: splits[i]
			});
		}

		return parts;
	},

	/**
	 * Calculates the Levenshtein distance between two strings
	 * @type Number
	 */
	"levenshtein":function (/**String*/ a, /**String**/ b) {
		var aLen = a.length;
		var bLen = b.length;

		var arr = new Array(aLen+1);
		var i, j, cost;

		for (i = 0; i <= aLen; i++) {
			arr[i] = new Array(bLen);
			arr[i][0] = i;
		}

		for (j = 0; j <= bLen; j++) {
			arr[0][j] = j;
		}

		for (i = 1; i <= aLen; i++) {
			for (j = 1; j <= bLen; j++) {
				cost = (a[i-1] == b[j-1]) ? 0 : 1;
				arr[i][j] = Math.min(arr[i-1][j] + 1, Math.min(arr[i][j-1] + 1, arr[i-1][j-1] + cost));
			}
		}

		return arr[aLen][bLen];
	},

	/**
	 * Test if an object is empty
	 *
	 * @param {Object} obj
	 * @type Boolean
	 */
	"isEmpty":function (obj) {
		for (var i in obj) {
			return false;
		}
		return true;
	},

	/**
	 * Compares an array with another and returns an array with
	 *	the values from array1 that don't exist in array2
	 *
	 * @param	{Array}		array1
	 * @param	{Array}		array2
	 * @param	{Boolean}	useIndex		If true, return an array containing just
	 *										the index of array2's elements;
	 *										otherwise return the values
	 */
	"arrayDiff":function(array1, array2, useIndex) {
		if (!Array.isArray(array1)) {
			throw ("array1 is not an array (" + array1 + ")");
		}
		if (!Array.isArray(array2)) {
			throw ("array2 is not an array (" + array2 + ")");
		}

		var val, pos, vals = [];
		for (var i=0; i<array1.length; i++) {
			val = array1[i];
			pos = array2.indexOf(val);
			if (pos == -1) {
				vals.push(useIndex ? pos : val);
			}
		}
		return vals;
	},

	/**
	 * Return new array with values shuffled
	 *
	 * From http://stackoverflow.com/a/6274398
	 *
	 * @param {Array} arr
	 * @return {Array}
	 */
	"arrayShuffle": function (array) {
		var counter = array.length, temp, index;

		// While there are elements in the array
		while (counter--) {
			// Pick a random index
			index = (Math.random() * counter) | 0;

			// And swap the last element with it
			temp = array[counter];
			array[counter] = array[index];
			array[index] = temp;
		}

		return array;
	},


	/**
	 * Return new array with duplicate values removed
	 *
	 * From http://stackoverflow.com/a/1961068
	 *
	 * @param	{Array}		array
	 * @return	{Array}
	 */
	"arrayUnique":function(arr) {
		var u = {}, a = [];
		for (var i=0, l=arr.length; i<l; ++i){
			if (u.hasOwnProperty(arr[i])) {
				continue;
			}
			a.push(arr[i]);
			u[arr[i]] = 1;
		}
		return a;
	},

	/**
	 * Generate a random integer between min and max inclusive
	 *
	 * @param	{Integer}	min
	 * @param	{Integer}	max
	 * @return	{Integer}
	 */
	"rand":function (min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	},

	/**
	 * Parse a page range
	 *
	 * @param {String} Page range to parse
	 * @return {Integer[]} Start and end pages
	 */
	"getPageRange":function(pages) {
		const pageRangeRegexp = /^\s*([0-9]+) ?[-\u2013] ?([0-9]+)\s*$/

		var pageNumbers;
		var m = pageRangeRegexp.exec(pages);
		if(m) {
			// A page range
			pageNumbers = [m[1], m[2]];
		} else {
			// Assume start and end are the same
			pageNumbers = [pages, pages];
		}
		return pageNumbers;
	},

	/**
	 * Pads a number or other string with a given string on the left
	 *
	 * @param {String} string String to pad
	 * @param {String} pad String to use as padding
	 * @length {Integer} length Length of new padded string
	 * @type String
	 */
	"lpad":function(string, pad, length) {
		string = string ? string + '' : '';
		while(string.length < length) {
			string = pad + string;
		}
		return string;
	},

	/**
	 * Shorten and add an ellipsis to a string if necessary
	 *
	 * @param	{String}	str
	 * @param	{Integer}	len
	 * @param	{Boolean}	[countChars=false]
	 */
	"ellipsize":function (str, len, countChars) {
		if (!len) {
			throw ("Length not specified in Zotero.Utilities.ellipsize()");
		}
		if (str.length > len) {
			return str.substr(0, len) + '\u2026' + (countChars ? ' (' + str.length + ' chars)' : '');
		}
		return str;
	},

	/**
	  * Port of PHP's number_format()
	  *
	  * MIT Licensed
	  *
	  * From http://kevin.vanzonneveld.net
	  * +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
	  * +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	  * +     bugfix by: Michael White (http://getsprink.com)
	  * +     bugfix by: Benjamin Lupton
	  * +     bugfix by: Allan Jensen (http://www.winternet.no)
	  * +    revised by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
	  * +     bugfix by: Howard Yeend
	  * *     example 1: number_format(1234.5678, 2, '.', '');
	  * *     returns 1: 1234.57
	 */
	"numberFormat":function (number, decimals, dec_point, thousands_sep) {
		var n = number, c = isNaN(decimals = Math.abs(decimals)) ? 2 : decimals;
		var d = dec_point == undefined ? "." : dec_point;
		var t = thousands_sep == undefined ? "," : thousands_sep, s = n < 0 ? "-" : "";
		var i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", j = (j = i.length) > 3 ? j % 3 : 0;

		return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
	},

	/**
	 * Cleans a title, converting it to title case and replacing " :" with ":"
	 *
	 * @param {String} string
	 * @param {Boolean} force Forces title case conversion, even if the capitalizeTitles pref is off
	 * @type String
	 */
	"capitalizeTitle":function(string, force) {
		const skipWords = ["but", "or", "yet", "so", "for", "and", "nor", "a", "an",
			"the", "at", "by", "from", "in", "into", "of", "on", "to", "with", "up",
			"down", "as"];

		// this may only match a single character
		const delimiterRegexp = /([ \/\u002D\u00AD\u2010-\u2015\u2212\u2E3A\u2E3B])/;

		string = this.trimInternal(string);
		string = string.replace(/ : /g, ": ");
		if(force === false || (!Zotero.Prefs.get('capitalizeTitles') && !force)) return string;
		if(!string) return "";

		// split words
		var words = string.split(delimiterRegexp);
		var isUpperCase = string.toUpperCase() == string;

		var newString = "";
		var delimiterOffset = words[0].length;
		var lastWordIndex = words.length-1;
		var previousWordIndex = -1;
		for(var i=0; i<=lastWordIndex; i++) {
			// only do manipulation if not a delimiter character
			if(words[i].length != 0 && (words[i].length != 1 || !delimiterRegexp.test(words[i]))) {
				var upperCaseVariant = words[i].toUpperCase();
				var lowerCaseVariant = words[i].toLowerCase();

				// only use if word does not already possess some capitalization
				if(isUpperCase || words[i] == lowerCaseVariant) {
					if(
						// a skip word
						skipWords.indexOf(lowerCaseVariant.replace(/[^a-zA-Z]+/, "")) != -1
						// not first or last word
						&& i != 0 && i != lastWordIndex
						// does not follow a colon
						&& (previousWordIndex == -1 || words[previousWordIndex][words[previousWordIndex].length-1].search(/[:\?!]/)==-1)
					) {
						words[i] = lowerCaseVariant;
					} else {
						// this is not a skip word or comes after a colon;
						// we must capitalize
						// handle punctuation in the beginning, including multiple, as in "¿Qué pasa?"
						var punct = words[i].match(/^[\'\"¡¿“‘„«\s]+/);
						punct = punct ? punct[0].length+1 : 1;
						words[i] = words[i].length ? words[i].substr(0, punct).toUpperCase() +
							words[i].substr(punct).toLowerCase() : words[i];
					}
				}

				previousWordIndex = i;
			}

			newString += words[i];
		}

		return newString;
	},

	/**
	 * Replaces accented characters in a string with ASCII equivalents
	 *
	 * @param {String} str
	 * @param {Boolean} [lowercaseOnly]  Limit conversions to lowercase characters
	 *                                   (for improved performance on lowercase input)
	 * @return {String}
	 *
	 * From http://lehelk.com/2011/05/06/script-to-remove-diacritics/
	 */
	"removeDiacritics": function (str, lowercaseOnly) {
		// Short-circuit on the most basic input
		if (/^[a-zA-Z0-9_-]*$/.test(str)) return str;

		var map = this._diacriticsRemovalMap.lowercase;
		for (var i=0, len=map.length; i<len; i++) {
			str = str.replace(map[i].letters, map[i].base);
		}

		if (!lowercaseOnly) {
			var map = this._diacriticsRemovalMap.uppercase;
			for (var i=0, len=map.length; i<len; i++) {
				str = str.replace(map[i].letters, map[i].base);
			}
		}

		return str;
	},

	"_diacriticsRemovalMap": {
		uppercase: [
			{'base':'A', 'letters':/[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g},
			{'base':'AA','letters':/[\uA732]/g},
			{'base':'AE','letters':/[\u00C6\u01FC\u01E2]/g},
			{'base':'AO','letters':/[\uA734]/g},
			{'base':'AU','letters':/[\uA736]/g},
			{'base':'AV','letters':/[\uA738\uA73A]/g},
			{'base':'AY','letters':/[\uA73C]/g},
			{'base':'B', 'letters':/[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g},
			{'base':'C', 'letters':/[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g},
			{'base':'D', 'letters':/[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g},
			{'base':'DZ','letters':/[\u01F1\u01C4]/g},
			{'base':'Dz','letters':/[\u01F2\u01C5]/g},
			{'base':'E', 'letters':/[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g},
			{'base':'F', 'letters':/[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g},
			{'base':'G', 'letters':/[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g},
			{'base':'H', 'letters':/[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g},
			{'base':'I', 'letters':/[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g},
			{'base':'J', 'letters':/[\u004A\u24BF\uFF2A\u0134\u0248]/g},
			{'base':'K', 'letters':/[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g},
			{'base':'L', 'letters':/[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g},
			{'base':'LJ','letters':/[\u01C7]/g},
			{'base':'Lj','letters':/[\u01C8]/g},
			{'base':'M', 'letters':/[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g},
			{'base':'N', 'letters':/[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g},
			{'base':'NJ','letters':/[\u01CA]/g},
			{'base':'Nj','letters':/[\u01CB]/g},
			{'base':'O', 'letters':/[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g},
			{'base':'OI','letters':/[\u01A2]/g},
			{'base':'OO','letters':/[\uA74E]/g},
			{'base':'OU','letters':/[\u0222]/g},
			{'base':'P', 'letters':/[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g},
			{'base':'Q', 'letters':/[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g},
			{'base':'R', 'letters':/[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g},
			{'base':'S', 'letters':/[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g},
			{'base':'T', 'letters':/[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g},
			{'base':'TZ','letters':/[\uA728]/g},
			{'base':'U', 'letters':/[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g},
			{'base':'V', 'letters':/[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g},
			{'base':'VY','letters':/[\uA760]/g},
			{'base':'W', 'letters':/[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g},
			{'base':'X', 'letters':/[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g},
			{'base':'Y', 'letters':/[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g},
			{'base':'Z', 'letters':/[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g},
		],

		lowercase: [
			{'base':'a', 'letters':/[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g},
			{'base':'aa','letters':/[\uA733]/g},
			{'base':'ae','letters':/[\u00E6\u01FD\u01E3]/g},
			{'base':'ao','letters':/[\uA735]/g},
			{'base':'au','letters':/[\uA737]/g},
			{'base':'av','letters':/[\uA739\uA73B]/g},
			{'base':'ay','letters':/[\uA73D]/g},
			{'base':'b', 'letters':/[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g},
			{'base':'c', 'letters':/[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g},
			{'base':'d', 'letters':/[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g},
			{'base':'dz','letters':/[\u01F3\u01C6]/g},
			{'base':'e', 'letters':/[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g},
			{'base':'f', 'letters':/[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g},
			{'base':'g', 'letters':/[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g},
			{'base':'h', 'letters':/[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g},
			{'base':'hv','letters':/[\u0195]/g},
			{'base':'i', 'letters':/[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g},
			{'base':'j', 'letters':/[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g},
			{'base':'k', 'letters':/[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g},
			{'base':'l', 'letters':/[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g},
			{'base':'lj','letters':/[\u01C9]/g},
			{'base':'m', 'letters':/[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g},
			{'base':'n', 'letters':/[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g},
			{'base':'nj','letters':/[\u01CC]/g},
			{'base':'o', 'letters':/[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g},
			{'base':'oi','letters':/[\u01A3]/g},
			{'base':'ou','letters':/[\u0223]/g},
			{'base':'oo','letters':/[\uA74F]/g},
			{'base':'p','letters':/[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g},
			{'base':'q','letters':/[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g},
			{'base':'r','letters':/[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g},
			{'base':'s','letters':/[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g},
			{'base':'t','letters':/[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g},
			{'base':'tz','letters':/[\uA729]/g},
			{'base':'u','letters':/[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g},
			{'base':'v','letters':/[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g},
			{'base':'vy','letters':/[\uA761]/g},
			{'base':'w','letters':/[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g},
			{'base':'x','letters':/[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g},
			{'base':'y','letters':/[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g},
			{'base':'z','letters':/[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g}
		]
	},

	/**
	 * Run sets of data through multiple asynchronous callbacks
	 *
	 * Each callback is passed the current set and a callback to call when done
	 *
	 * @param	{Object[]}		sets			Sets of data
	 * @param	{Function[]}	callbacks
	 * @param	{Function}		onDone			Function to call when done
	 */
	 "processAsync":function (sets, callbacks, onDone) {
		if(sets.wrappedJSObject) sets = sets.wrappedJSObject;
		if(callbacks.wrappedJSObject) callbacks = callbacks.wrappedJSObject;

		var currentSet;
		var index = 0;

		var nextSet = function () {
			if (!sets.length) {
				onDone();
				return;
			}
			index = 0;
			currentSet = sets.shift();
			callbacks[0](currentSet, nextCallback);
		};
		var nextCallback = function () {
			index++;
			callbacks[index](currentSet, nextCallback);
		};

		// Add a final callback to proceed to the next set
		callbacks[callbacks.length] = function () {
			nextSet();
		}
		nextSet();
	},

	/**
	 * Performs a deep copy of a JavaScript object
	 * @param {Object} obj
	 * @return {Object}
	 */
	"deepCopy":function(obj) {
		var obj2 = (obj instanceof Array ? [] : {});
		for(var i in obj) {
			if(!obj.hasOwnProperty(i)) continue;

			if(typeof obj[i] === "object" && obj[i] !== null) {
				obj2[i] = Zotero.Utilities.deepCopy(obj[i]);
			} else {
				obj2[i] = obj[i];
			}
		}
		return obj2;
	},

	/**
	 * Tests if an item type exists
	 *
	 * @param {String} type Item type
	 * @type Boolean
	 */
	"itemTypeExists":function(type) {
		if(Zotero.ItemTypes.getID(type)) {
			return true;
		} else {
			return false;
		}
	},

	/**
	 * Find valid creator types for a given item type
	 *
	 * @param {String} type Item type
	 * @return {String[]} Creator types
	 */
	"getCreatorsForType":function(type) {
		var types = Zotero.CreatorTypes.getTypesForItemType(Zotero.ItemTypes.getID(type));
		var cleanTypes = new Array();
		for(var i=0; i<types.length; i++) {
			cleanTypes.push(types[i].name);
		}
		return cleanTypes;
	},

	/**
	 * Determine whether a given field is valid for a given item type
	 *
	 * @param {String} field Field name
	 * @param {String} type Item type
	 * @type Boolean
	 */
	"fieldIsValidForType":function(field, type) {
		return Zotero.ItemFields.isValidForType(field, Zotero.ItemTypes.getID(type));
	},

	/**
	 * Gets a creator type name, localized to the current locale
	 *
	 * @param {String} type Creator type
	 * @param {String} Localized creator type
	 * @type Boolean
	 */
	"getLocalizedCreatorType":function(type) {
		try {
			return Zotero.CreatorTypes.getLocalizedString(type);
		} catch(e) {
			return false;
		}
	},

	/**
	 * Escapes metacharacters in a literal so that it may be used in a regular expression
	 */
	"quotemeta":function(literal) {
		if(typeof literal !== "string") {
			throw "Argument "+literal+" must be a string in Zotero.Utilities.quotemeta()";
		}
		const metaRegexp = /[-[\]{}()*+?.\\^$|,#\s]/g;
		return literal.replace(metaRegexp, "\\$&");
	},

	/**
	 * Evaluate an XPath
	 *
	 * @param {element|element[]} elements The element(s) to use as the context for the XPath
	 * @param {String} xpath The XPath expression
	 * @param {Object} [namespaces] An object whose keys represent namespace prefixes, and whose
	 *                              values represent their URIs
	 * @return {element[]} DOM elements matching XPath
	 */
	"xpath":function(elements, xpath, namespaces) {
		var nsResolver = null;
		if(namespaces) {
			nsResolver = function(prefix) {
				return namespaces[prefix] || null;
			};
		}

		if(!("length" in elements)) elements = [elements];

		var results = [];
		for(var i=0, n=elements.length; i<n; i++) {
			// For some reason, if elements is wrapped by an object
			// Xray, we won't be able to unwrap the DOMWrapper around
			// the element. So waive the object Xray.
			var maybeWrappedEl = elements.wrappedJSObject ? elements.wrappedJSObject[i] : elements[i];

			// Firefox 5 hack, so we will preserve Fx5DOMWrappers
			var isWrapped = Zotero.Translate.DOMWrapper && Zotero.Translate.DOMWrapper.isWrapped(maybeWrappedEl);
			var element = isWrapped ? Zotero.Translate.DOMWrapper.unwrap(maybeWrappedEl) : maybeWrappedEl;

			// We waived the object Xray above, which will waive the
			// DOM Xray, so make sure we have a DOM Xray wrapper.
			if(Zotero.isFx) {
				element = new XPCNativeWrapper(element);
			}

			if(element.ownerDocument) {
				var rootDoc = element.ownerDocument;
			} else if(element.documentElement) {
				var rootDoc = element;
			} else if(Zotero.isIE && element.documentElement === null) {
				// IE: documentElement may be null if there is a parse error. In this
				// case, we don't match anything to mimic what would happen with DOMParser
				continue;
			} else {
				throw new Error("First argument must be either element(s) or document(s) in Zotero.Utilities.xpath(elements, '"+xpath+"')");
			}

			if(!Zotero.isIE || "evaluate" in rootDoc) {
				try {
					// This may result in a deprecation warning in the console due to
					// https://bugzilla.mozilla.org/show_bug.cgi?id=674437
					var xpathObject = rootDoc.evaluate(xpath, element, nsResolver, 5 /*ORDERED_NODE_ITERATOR_TYPE*/, null);
				} catch(e) {
					// rethrow so that we get a stack
					throw new Error(e.name+": "+e.message);
				}

				var newEl;
				while(newEl = xpathObject.iterateNext()) {
					// Firefox 5 hack
					results.push(isWrapped ? Zotero.Translate.DOMWrapper.wrapIn(newEl, maybeWrappedEl) : newEl);
				}
			} else if("selectNodes" in element) {
				// We use JavaScript-XPath in IE for HTML documents, but with an XML
				// document, we need to use selectNodes
				if(namespaces) {
					var ieNamespaces = [];
					for(var j in namespaces) {
						if(!j) continue;
						ieNamespaces.push('xmlns:'+j+'="'+Zotero.Utilities.htmlSpecialChars(namespaces[j])+'"');
					}
					rootDoc.setProperty("SelectionNamespaces", ieNamespaces.join(" "));
				}
				var nodes = element.selectNodes(xpath);
				for(var j=0; j<nodes.length; j++) {
					results.push(nodes[j]);
				}
			} else {
				throw new Error("XPath functionality not available");
			}
		}

		return results;
	},

	/**
	 * Generates a string from the content of nodes matching a given XPath
	 *
	 * @param {element} node The node representing the document and context
	 * @param {String} xpath The XPath expression
	 * @param {Object} [namespaces] An object whose keys represent namespace prefixes, and whose
	 *                              values represent their URIs
	 * @param {String} [delimiter] The string with which to join multiple matching nodes
	 * @return {String|null} DOM elements matching XPath, or null if no elements exist
	 */
	"xpathText":function(node, xpath, namespaces, delimiter) {
		var elements = Zotero.Utilities.xpath(node, xpath, namespaces);
		if(!elements.length) return null;

		var strings = new Array(elements.length);
		for(var i=0, n=elements.length; i<n; i++) {
			var el = elements[i];
			if(el.wrappedJSObject) el = el.wrappedJSObject;
			if(Zotero.Translate.DOMWrapper) el = Zotero.Translate.DOMWrapper.unwrap(el);
			strings[i] =
				(el.nodeType === 2 /*ATTRIBUTE_NODE*/ && "value" in el) ? el.value
				: "textContent" in el ? el.textContent
				: "innerText" in el ? el.innerText
				: "text" in el ? el.text
				: el.nodeValue;
		}

		return strings.join(delimiter !== undefined ? delimiter : ", ");
	},

	/**
	 * Generate a random string of length 'len' (defaults to 8)
	 **/
	"randomString":function(len, chars) {
		if (!chars) {
			chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
		}
		if (!len) {
			len = 8;
		}
		var randomstring = '';
		for (var i=0; i<len; i++) {
			var rnum = Math.floor(Math.random() * chars.length);
			randomstring += chars.substring(rnum,rnum+1);
		}
		return randomstring;
	},

	/**
	 * PHP var_dump equivalent for JS
	 *
	 * Adapted from http://binnyva.blogspot.com/2005/10/dump-function-javascript-equivalent-of.html
	 */
	"varDump": function(obj,level,maxLevel,parentObjects,path) {
		// Simple dump
		var type = typeof obj;
		if (type == 'number' || type == 'undefined' || type == 'boolean' || obj === null) {
			if (!level) {
				// When dumping these directly, make sure to distinguish them from regular
				// strings as output by Zotero.debug (i.e. no quotes)
				return '===>' + obj + '<=== (' + type + ')';
			}
			else {
				return '' + obj;
			}
		}
		else if (type == 'string') {
			return JSON.stringify(obj);
		}
		else if (type == 'function') {
			var funcStr = ('' + obj).trim();
			if (!level) {
				// Dump function contents as well if only dumping function
				return funcStr;
			}

			// Display [native code] label for native functions, but make it one line
			if (/^[^{]+{\s*\[native code\]\s*}$/i.test(funcStr)) {
				return funcStr.replace(/\s*(\[native code\])\s*/i, ' $1 ');
			}

			// For non-native functions, display an elipsis
			return ('' + obj).replace(/{[\s\S]*}/, '{...}');
		}
		else if (type != 'object') {
			return '<<Unknown type: ' + type + '>> ' + obj;
		}

		// More complex dump with indentation for objects
		if (level === undefined) {
			level = 0;
		}

		if (maxLevel === undefined) {
			maxLevel = 4;
		}

		var objType = Object.prototype.toString.call(obj);

		if (level > maxLevel) {
			return objType + " <<Maximum depth reached>>";
		}

		// The padding given at the beginning of the line.
		var level_padding = "";
		for (var j=0; j<level+1; j++) {
			level_padding += "    ";
		}

		//Special handling for Error or Exception
		var isException = Zotero.isFx && !Zotero.isBookmarklet && obj instanceof Components.interfaces.nsIException;
		var isError = obj instanceof Error;
		if (!isException && !isError && obj.constructor && obj.stack) {
			switch (obj.constructor.name) {
				case 'Error':
				case 'EvalError':
				case 'RangeError':
				case 'ReferenceError':
				case 'SyntaxError':
				case 'TypeError':
				case 'URIError':
					isError = true;
			}
		}

		if (isError || isException) {
			var header = '';
			if (isError) {
				header = obj.constructor.name ? obj.constructor.name : 'Error';
			} else {
				header = (obj.name ? obj.name + ' ' : '') + 'Exception';
			}

			return header + ': '
				+ (obj.message ? ('' + obj.message).replace(/^/gm, level_padding).trim() : '')
				+ '\n' + level_padding + "===== Stack Trace =====\n"
				+ (obj.stack ? obj.stack.trim().replace(/^(?=.)/gm, level_padding) : '')
				+ '\n' + level_padding + "=======================";
		}

		// Only dump single level for nsIDOMNode objects (including document)
		if (Zotero.isFx && !Zotero.isBookmarklet
			&& obj instanceof Components.interfaces.nsIDOMNode
		) {
			level = maxLevel;
		}

		// Recursion checking
		if(!parentObjects) {
			parentObjects = [obj];
			path = ['ROOT'];
		}

		var isArray = objType == '[object Array]'
		var dumpedText = isArray ? '[' : objType + ' {';
		for (var prop in obj) {
			dumpedText += '\n' + level_padding + JSON.stringify(prop) + ": ";

			try {
				var value = obj[prop];
			} catch(e) {
				dumpedText += "<<Access Denied>>";
				continue;
			}

			// Check for recursion
			if (typeof(value) == 'object') {
				var i = parentObjects.indexOf(value);
				if(i != -1) {
					var parentName = path.slice(0,i+1).join('->');
					dumpedText += "<<Reference to parent object " + parentName + " >>";
					continue;
				}
			}

			try {
				dumpedText += Zotero.Utilities.varDump(value,level+1,maxLevel,parentObjects.concat([value]),path.concat([prop]));
			} catch(e) {
				dumpedText += "<<Error processing property: " + e.message + " (" + value + ")>>";
			}
		}

		var lastChar = dumpedText.charAt(dumpedText.length - 1);
		if (lastChar != '[' && lastChar != '{') {
			dumpedText += '\n' + level_padding.substr(4);
		}
		dumpedText += isArray ? ']' : '}';

		return dumpedText;
	},

	/**
	 * Converts an item from toArray() format to an array of items in
	 * the content=json format used by the server
	 */
	"itemToServerJSON":function(item) {
		var newItem = {
				"itemKey":Zotero.Utilities.generateObjectKey(),
				"itemVersion":0
			},
			newItems = [newItem];

		var typeID = Zotero.ItemTypes.getID(item.itemType);
		if(!typeID) {
			Zotero.debug("itemToServerJSON: Invalid itemType "+item.itemType+"; using webpage");
			item.itemType = "webpage";
			typeID = Zotero.ItemTypes.getID(item.itemType);
		}

		var fieldID, itemFieldID;
		for(var field in item) {
			if(field === "complete" || field === "itemID"
					|| field === "seeAlso") continue;

			var val = item[field];

			if(field === "itemType") {
				newItem[field] = val;
			} else if(field === "creators") {
				// normalize creators
				var n = val.length;
				var newCreators = newItem.creators = [];
				for(var j=0; j<n; j++) {
					var creator = val[j];

					if(!creator.firstName && !creator.lastName) {
						Zotero.debug("itemToServerJSON: Silently dropping empty creator");
						continue;
					}

					// Single-field mode
					if (!creator.firstName || (creator.fieldMode && creator.fieldMode == 1)) {
						var newCreator = {
							name: creator.lastName
						};
					}
					// Two-field mode
					else {
						var newCreator = {
							firstName: creator.firstName,
							lastName: creator.lastName
						};
					}

					// ensure creatorType is present and valid
					if(creator.creatorType) {
						if(Zotero.CreatorTypes.getID(creator.creatorType)) {
							newCreator.creatorType = creator.creatorType;
						} else {
							Zotero.debug("itemToServerJSON: Invalid creator type "+creator.creatorType+"; falling back to author");
						}
					}
					if(!newCreator.creatorType) newCreator.creatorType = "author";

					newCreators.push(newCreator);
				}
			} else if(field === "tags") {
				// normalize tags
				var n = val.length;
				var newTags = newItem.tags = [];
				for(var j=0; j<n; j++) {
					var tag = val[j];
					if(typeof tag === "object") {
						if(tag.tag) {
							tag = tag.tag;
						} else if(tag.name) {
							tag = tag.name;
						} else {
							Zotero.debug("itemToServerJSON: Discarded invalid tag");
							continue;
						}
					} else if(tag === "") {
						continue;
					}
					newTags.push({"tag":tag.toString(), "type":1});
				}
			} else if(field === "notes") {
				// normalize notes
				var n = val.length;
				for (var j = 0; j < n; j++) {
					var note = val[j];
					if (typeof note === "object") {
						if (!note.note) {
							Zotero.debug("itemToServerJSON: Discarded invalid note");
							continue;
						}
						note = note.note;
					}
					newItems.push({"itemType": "note", "parentItem": newItem.itemKey,
						"note":note.toString()});
				}
			} else if (field === "attachments") {
				newItem[field] = val;
			} else {
				// if content is not a string, either stringify it or delete it
				if(typeof val !== "string") {
					if(val || val === 0) {
						val = val.toString();
					} else {
						continue;
					}
				}

				// map from base field if possible
				if((itemFieldID = Zotero.ItemFields.getFieldIDFromTypeAndBase(typeID, fieldID))) {
					var fieldName = Zotero.ItemFields.getName(itemFieldID);
					// Only map if item field does not exist
					if(fieldName !== field && !newItem[fieldName]) newItem[fieldName] = val;
					continue;	// already know this is valid
				}
				newItem[field] = val;

			}
		}

		return newItems;
	},

	/**
	 * Converts an item from toArray() format to citeproc-js JSON
	 * @param {Zotero.Item} zoteroItem
	 * @return {Object} The CSL item
	 */
	"itemToCSLJSON":function(zoteroItem) {
		if (zoteroItem instanceof Zotero.Item) {
			zoteroItem = Zotero.Utilities.Internal.itemToExportFormat(zoteroItem);
		}

		var cslType = CSL_TYPE_MAPPINGS[zoteroItem.itemType];
		if (!cslType) throw new Error('Unexpected Zotero Item type "' + zoteroItem.itemType + '"');

		var itemTypeID = Zotero.ItemTypes.getID(zoteroItem.itemType);

		var cslItem = {
			'id':zoteroItem.uri,
			'type':cslType
		};

		// get all text variables (there must be a better way)
		for(var variable in CSL_TEXT_MAPPINGS) {
			var fields = CSL_TEXT_MAPPINGS[variable];
			for(var i=0, n=fields.length; i<n; i++) {
				var field = fields[i],
					value = null;

				if(field in zoteroItem) {
					value = zoteroItem[field];
				} else {
					if (field == 'versionNumber') field = 'version'; // Until https://github.com/zotero/zotero/issues/670
					var fieldID = Zotero.ItemFields.getID(field),
						typeFieldID;
					if(fieldID
						&& (typeFieldID = Zotero.ItemFields.getFieldIDFromTypeAndBase(itemTypeID, fieldID))
					) {
						value = zoteroItem[Zotero.ItemFields.getName(typeFieldID)];
					}
				}

				if (!value) continue;

				if (typeof value == 'string') {
					if (field == 'ISBN') {
						// Only use the first ISBN in CSL JSON
						var isbn = value.match(/^(?:97[89]-?)?(?:\d-?){9}[\dx](?!-)\b/i);
						if (isbn) value = isbn[0];
					}

					// Strip enclosing quotes
					if(value.charAt(0) == '"' && value.indexOf('"', 1) == value.length - 1) {
						value = value.substring(1, value.length-1);
					}
					cslItem[variable] = value;
					break;
				}
			}
		}

		// separate name variables
		var author = Zotero.CreatorTypes.getName(Zotero.CreatorTypes.getPrimaryIDForType(itemTypeID));
		var creators = zoteroItem.creators;
		for(var i=0; creators && i<creators.length; i++) {
			var creator = creators[i];
			var creatorType = creator.creatorType;
			if(creatorType == author) {
				creatorType = "author";
			}

			creatorType = CSL_NAMES_MAPPINGS[creatorType];
			if(!creatorType) continue;

			var nameObj;
			if (creator.lastName || creator.firstName) {
				nameObj = {
					family: creator.lastName || '',
					given: creator.firstName || ''
				};

				// Parse name particles
				// Replicate citeproc-js logic for what should be parsed so we don't
				// break current behavior.
				if (nameObj.family && nameObj.given) {
					// Don't parse if last name is quoted
					if (nameObj.family.length > 1
						&& nameObj.family.charAt(0) == '"'
						&& nameObj.family.charAt(nameObj.family.length - 1) == '"'
					) {
						nameObj.family = nameObj.family.substr(1, nameObj.family.length - 2);
					} else {
						Zotero.CiteProc.CSL.parseParticles(nameObj, true);
					}
				}
			} else if (creator.name) {
				nameObj = {'literal': creator.name};
			}

			if(cslItem[creatorType]) {
				cslItem[creatorType].push(nameObj);
			} else {
				cslItem[creatorType] = [nameObj];
			}
		}

		// get date variables
		for(var variable in CSL_DATE_MAPPINGS) {
			var date = zoteroItem[CSL_DATE_MAPPINGS[variable]];
			if (!date) {
				var typeSpecificFieldID = Zotero.ItemFields.getFieldIDFromTypeAndBase(itemTypeID, CSL_DATE_MAPPINGS[variable]);
				if (typeSpecificFieldID) {
					date = zoteroItem[Zotero.ItemFields.getName(typeSpecificFieldID)];
				}
			}

			if(date) {
				var dateObj = Zotero.Date.strToDate(date);
				// otherwise, use date-parts
				var dateParts = [];
				if(dateObj.year) {
					// add year, month, and day, if they exist
					dateParts.push(dateObj.year);
					if(dateObj.month !== undefined) {
						dateParts.push(dateObj.month+1);
						if(dateObj.day) {
							dateParts.push(dateObj.day);
						}
					}
					cslItem[variable] = {"date-parts":[dateParts]};

					// if no month, use season as month
					if(dateObj.part && dateObj.month === undefined) {
						cslItem[variable].season = dateObj.part;
					}
				} else {
					// if no year, pass date literally
					cslItem[variable] = {"literal":date};
				}
			}
		}

		// Special mapping for note title
		if (zoteroItem.itemType == 'note' && zoteroItem.note) {
			cslItem.title = Zotero.Notes.noteToTitle(zoteroItem.note);
		}

		// extract PMID
		var extra = zoteroItem.extra;
		if(typeof extra === "string") {
			var m = /(?:^|\n)PMID:\s*([0-9]+)/.exec(extra);
			if(m) cslItem.PMID = m[1];
			m = /(?:^|\n)PMCID:\s*((?:PMC)?[0-9]+)/.exec(extra);
			if(m) cslItem.PMCID = m[1];
		}

		//this._cache[zoteroItem.id] = cslItem;
		return cslItem;
	},

	/**
	 * Converts an item in CSL JSON format to a Zotero item
	 * @param {Zotero.Item} item
	 * @param {Object} cslItem
	 */
	"itemFromCSLJSON":function(item, cslItem) {
		var isZoteroItem = item instanceof Zotero.Item,
			zoteroType;

		// Some special cases to help us map item types correctly
		// This ensures that we don't lose data on import. The fields
		// we check are incompatible with the alternative item types
		if (cslItem.type == 'book') {
			zoteroType = 'book';
			if (cslItem.version) {
				zoteroType = 'computerProgram';
			}
		} else if (cslItem.type == 'bill') {
			zoteroType = 'bill';
			if (cslItem.publisher || cslItem['number-of-volumes']) {
				zoteroType = 'hearing';
			}
		} else if (cslItem.type == 'song') {
			zoteroType = 'audioRecording';
			if (cslItem.number) {
				zoteroType = 'podcast';
			}
		} else if (cslItem.type == 'motion_picture') {
			zoteroType = 'film';
			if (cslItem['collection-title'] || cslItem['publisher-place']
				|| cslItem['event-place'] || cslItem.volume
				|| cslItem['number-of-volumes'] || cslItem.ISBN
			) {
				zoteroType = 'videoRecording';
			}
		} else {
			for(var type in CSL_TYPE_MAPPINGS) {
				if(CSL_TYPE_MAPPINGS[type] == cslItem.type) {
					zoteroType = type;
					break;
				}
			}
		}

		if(!zoteroType) zoteroType = "document";

		var itemTypeID = Zotero.ItemTypes.getID(zoteroType);
		if(isZoteroItem) {
			item.setType(itemTypeID);
		} else {
			item.itemID = cslItem.id;
			item.itemType = zoteroType;
		}

		// map text fields
		for(var variable in CSL_TEXT_MAPPINGS) {
			if(variable in cslItem) {
				var textMappings = CSL_TEXT_MAPPINGS[variable];
				for(var i=0; i<textMappings.length; i++) {
					var field = textMappings[i];

					// Until 5.0, use version instead of versionNumber
					if (field == 'versionNumber') field = 'version';

					var fieldID = Zotero.ItemFields.getID(field);

					if(Zotero.ItemFields.isBaseField(fieldID)) {
						var newFieldID = Zotero.ItemFields.getFieldIDFromTypeAndBase(itemTypeID, fieldID);
						if(newFieldID) fieldID = newFieldID;
					}

					if(Zotero.ItemFields.isValidForType(fieldID, itemTypeID)) {
						if(isZoteroItem) {
							item.setField(fieldID, cslItem[variable]);
						} else {
							item[field] = cslItem[variable];
						}

						break;
					}
				}
			}
		}

		// separate name variables
		for(var field in CSL_NAMES_MAPPINGS) {
			if(CSL_NAMES_MAPPINGS[field] in cslItem) {
				var creatorTypeID = Zotero.CreatorTypes.getID(field);
				if(!Zotero.CreatorTypes.isValidForItemType(creatorTypeID, itemTypeID)) {
					creatorTypeID = Zotero.CreatorTypes.getPrimaryIDForType(itemTypeID);
				}

				var nameMappings = cslItem[CSL_NAMES_MAPPINGS[field]];
				for(var i in nameMappings) {
					var cslAuthor = nameMappings[i],
						creator = isZoteroItem ? new Zotero.Creator() : {};
					if(cslAuthor.family || cslAuthor.given) {
						if(cslAuthor.family) creator.lastName = cslAuthor.family;
						if(cslAuthor.given) creator.firstName = cslAuthor.given;
					} else if(cslAuthor.literal) {
						creator.lastName = cslAuthor.literal;
						creator.fieldMode = 1;
					} else {
						continue;
					}

					if(isZoteroItem) {
						item.setCreator(item.getCreators().length, creator, creatorTypeID);
					} else {
						creator.creatorType = Zotero.CreatorTypes.getName(creatorTypeID);
						if(Zotero.isFx && !Zotero.isBookmarklet && Zotero.platformMajorVersion >= 32) {
							creator = Components.utils.cloneInto(creator, item);
						}
						item.creators.push(creator);
					}
				}
			}
		}

		// get date variables
		for(var variable in CSL_DATE_MAPPINGS) {
			if(variable in cslItem) {
				var field = CSL_DATE_MAPPINGS[variable],
					fieldID = Zotero.ItemFields.getID(field),
					cslDate = cslItem[variable];
				var fieldID = Zotero.ItemFields.getID(field);
				if(Zotero.ItemFields.isBaseField(fieldID)) {
					var newFieldID = Zotero.ItemFields.getFieldIDFromTypeAndBase(itemTypeID, fieldID);
					if(newFieldID) fieldID = newFieldID;
				}

				if(Zotero.ItemFields.isValidForType(fieldID, itemTypeID)) {
					var date = "";
					if(cslDate.literal || cslDate.raw) {
						date = cslDate.literal || cslDate.raw;
						if(variable === "accessed") {
							date = Zotero.Date.strToISO(date);
						}
					} else {
						var newDate = Zotero.Utilities.deepCopy(cslDate);
						if(cslDate["date-parts"] && typeof cslDate["date-parts"] === "object"
								&& cslDate["date-parts"] !== null
								&& typeof cslDate["date-parts"][0] === "object"
								&& cslDate["date-parts"][0] !== null) {
							if(cslDate["date-parts"][0][0]) newDate.year = cslDate["date-parts"][0][0];
							if(cslDate["date-parts"][0][1]) newDate.month = cslDate["date-parts"][0][1];
							if(cslDate["date-parts"][0][2]) newDate.day = cslDate["date-parts"][0][2];
						}

						if(newDate.year) {
							if(variable === "accessed") {
								// Need to convert to SQL
								var date = Zotero.Utilities.lpad(newDate.year, "0", 4);
								if(newDate.month) {
									date += "-"+Zotero.Utilities.lpad(newDate.month, "0", 2);
									if(newDate.day) {
										date += "-"+Zotero.Utilities.lpad(newDate.day, "0", 2);
									}
								}
							} else {
								if(newDate.month) newDate.month--;
								date = Zotero.Date.formatDate(newDate);
								if(newDate.season) {
									date = newDate.season+" "+date;
								}
							}
						}
					}

					if(isZoteroItem) {
						item.setField(fieldID, date);
					} else {
						item[field] = date;
					}
				}
			}
		}
	},

	/**
	 * Get the real target URL from an intermediate URL
	 */
	"resolveIntermediateURL":function(url) {
		var patterns = [
			// Google search results
			{
				regexp: /^https?:\/\/(www.)?google\.(com|(com?\.)?[a-z]{2})\/url\?/,
				variable: "url"
			}
		];

		for (var i=0, len=patterns.length; i<len; i++) {
			if (!url.match(patterns[i].regexp)) {
				continue;
			}
			var matches = url.match(new RegExp("&" + patterns[i].variable + "=(.+?)(&|$)"));
			if (!matches) {
				continue;
			}
			return decodeURIComponent(matches[1]);
		}

		return url;
	},

	/**
	 * Adds a string to a given array at a given offset, converted to UTF-8
	 * @param {String} string The string to convert to UTF-8
	 * @param {Array|Uint8Array} array The array to which to add the string
	 * @param {Integer} [offset] Offset at which to add the string
	 */
	"stringToUTF8Array":function(string, array, offset) {
		if(!offset) offset = 0;
		var n = string.length;
		for(var i=0; i<n; i++) {
			var val = string.charCodeAt(i);
			if(val >= 128) {
				if(val >= 2048) {
					array[offset] = (val >>> 12) | 224;
					array[offset+1] = ((val >>> 6) & 63) | 128;
					array[offset+2] = (val & 63) | 128;
					offset += 3;
				} else {
					array[offset] = ((val >>> 6) | 192);
					array[offset+1] = (val & 63) | 128;
					offset += 2;
				}
			} else {
				array[offset++] = val;
			}
		}
	},

	/**
	 * Gets the byte length of the UTF-8 representation of a given string
	 * @param {String} string
	 * @return {Integer}
	 */
	"getStringByteLength":function(string) {
		var length = 0, n = string.length;
		for(var i=0; i<n; i++) {
			var val = string.charCodeAt(i);
			if(val >= 128) {
				if(val >= 2048) {
					length += 3;
				} else {
					length += 2;
				}
			} else {
				length += 1;
			}
		}
		return length;
	},

	/**
	 * Gets the icon for a JSON-style attachment
	 */
	"determineAttachmentIcon":function(attachment) {
		if(attachment.linkMode === "linked_url") {
			return Zotero.ItemTypes.getImageSrc("attachment-web-link");
		}
		return Zotero.ItemTypes.getImageSrc(attachment.mimeType === "application/pdf"
							? "attachment-pdf" : "attachment-snapshot");
	},

	/**
	 * Generates a valid object key for the server API
	 */
	"generateObjectKey":function generateObjectKey() {
		// TODO: add 'L' and 'Y' after 3.0.11 cut-off
		var baseString = "23456789ABCDEFGHIJKMNPQRSTUVWXZ";
		return Zotero.Utilities.randomString(8, baseString);
	},

	/**
	 * Provides unicode support and other additional features for regular expressions
	 * See https://github.com/slevithan/xregexp for usage
	 */
	 "XRegExp": XRegExp
}

/******** END utilities.js ********/
/******** BEGIN messages.js ********/
/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2011 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://zotero.org

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/

/**
 * The MESSAGES array contains two levels. The first level is the NAMESPACE. The second level is the
 * METHOD. This sets up messaging so that a call to Zotero.NAMESPACE.METHOD(..., callback) in the
 * injected script calls the same function on the global script, and when the global script calls
 * callback(data), the injected script calls callback(data).
 *
 * If the value in the JSON below is not false, then the function accepts a callback.
 *
 * In the bookmarklet, the following takes place:
 *  1. Injected script calls Zotero.NAMESPACE.METHOD(ARGS, CALLBACK)
 *  2. Injected script generates a REQUESTID from the current time, and adds CALLBACK to
 *     _callbacks indexed by REQUESTID
 *  3. Injected script sends message with name NAMESPACE+MESSAGE_SEPARATOR+METHOD and message
 *     [TABID, REQUESTID, [ARGS]]
 *  4. Iframe script receives message
 *  5. Iframe script executes Zotero.NAMESPACE.METHOD(ARGS, NEWCALLBACK, TABID)
 *  6. Zotero.NAMESPACE.METHOD calls its callback on the global side, with some CALLBACKDATA
 *  7. If MESSAGES[NAMESPACE][METHOD] has a preSend function, this gets passed CALLBACKDATA
 *     and returns some result, which is used as the CALLBACKDATA below
 *  8. Global script sends a message with name
 *     NAMESPACE+MESSAGE_SEPARATOR+METHOD+MESSAGE_SEPARATOR+"Response" and message
 *     [REQUESTID, CALLBACKDATA]
 *  9. Injected script receives message
 *  10. If MESSAGES[NAMESPACE][METHOD] has a postReceive function, this gets passed CALLBACKDATA
 *     and returns some result, which is used as the CALLBACKDATA below
 *  11. Injected script calls _callbacks[REQUESTID](CALLBACKDATA)
 *
 * See other messaging scripts for more details.
 */
const MESSAGE_SEPARATOR = ".";
const MESSAGES = {
	"Translators":
		{
			"get":{
				"preSend":function(translators) {
					return [Zotero.Translators.serialize(translators, TRANSLATOR_PASSING_PROPERTIES)];
				}
			},
			"getAllForType":{
				"preSend":function(translators) {
					return [Zotero.Translators.serialize(translators, TRANSLATOR_PASSING_PROPERTIES)];
				},
				"callbackArg":1
			},
			"getWebTranslatorsForLocation":{
				"preSend":function(data) {
					return [[Zotero.Translators.serialize(data[0], TRANSLATOR_PASSING_PROPERTIES), data[1]]];
				},
				"postReceive":function(data) {
					return [[data[0], Zotero.Translators.getConverterFunctions(data[1])]];
				}
			}
		},
	"Connector":
		{
			"checkIsOnline":true,
			"callMethod":true
		},
	"API":
		{
			"createItem":true,
			"uploadAttachment":false,
			"notifyAttachmentProgress":false
		}
};

/******** END messages.js ********/
