/******** BEGIN connector.js ********/
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

Zotero.Connector = new function() {
	const CONNECTOR_URI = "http://127.0.0.1:23119/";
	const CONNECTOR_API_VERSION = 2;

	var _ieStandaloneIframeTarget, _ieConnectorCallbacks;
	// As of Chrome 38 (and corresponding Opera version 24?) pages loaded over
	// https (i.e. the zotero bookmarklet iframe) can not send requests over
	// http, so pinging Standalone at http://127.0.0.1 fails.
	// Disable for all browsers, except IE, which may be used frequently with ZSA
	this.isOnline = Zotero.isBookmarklet && !Zotero.isIE ? false : null;

	/**
	 * Checks if Zotero is online and passes current status to callback
	 * @param {Function} callback
	 */
	this.checkIsOnline = function(callback) {
		// Only check once in bookmarklet
		if(Zotero.isBookmarklet && this.isOnline !== null) {
			callback(this.isOnline);
			return;
		}

		if(Zotero.isIE) {
			if(window.location.protocol !== "http:") {
				this.isOnline = false;
				callback(false);
				return;
			}

			Zotero.debug("Connector: Looking for Zotero Standalone");
			var me = this;
			var fail = function() {
				if(me.isOnline !== null) return;
				Zotero.debug("Connector: Zotero Standalone is not online or cannot be contacted");
				me.isOnline = false;
				callback(false);
			};

			window.setTimeout(fail, 1000);
			try {
				var xdr = new XDomainRequest();
				xdr.timeout = 700;
				xdr.open("POST", "http://127.0.0.1:23119/connector/ping", true);
				xdr.onerror = function() {
					Zotero.debug("Connector: XDomainRequest to Zotero Standalone experienced an error");
					fail();
				};
				xdr.ontimeout = function() {
					Zotero.debug("Connector: XDomainRequest to Zotero Standalone timed out");
					fail();
				};
				xdr.onload = function() {
					if(me.isOnline !== null) return;
					me.isOnline = true;
					Zotero.debug("Connector: Standalone found; trying IE hack");

					_ieConnectorCallbacks = [];
					var listener = function(event) {
						if(event.origin !== "http://127.0.0.1:23119"
								|| event.source !== iframe.contentWindow) return;
						if(event.stopPropagation) {
							event.stopPropagation();
						} else {
							event.cancelBubble = true;
						}

						// If this is the first time the target was loaded, then this is a loaded
						// event
						if(!_ieStandaloneIframeTarget) {
							Zotero.debug("Connector: Standalone loaded");
							_ieStandaloneIframeTarget = iframe.contentWindow;
							callback(true);
							return;
						}

						// Otherwise, this is a response event
						try {
							var data = JSON.parse(event.data);
						} catch(e) {
							Zotero.debug("Invalid JSON received: "+event.data);
							return;
						}
						var xhrSurrogate = {
							"status":data[1],
							"responseText":data[2],
							"getResponseHeader":function(x) { return data[3][x.toLowerCase()] }
						};
						_ieConnectorCallbacks[data[0]](xhrSurrogate);
						delete _ieConnectorCallbacks[data[0]];
					};

					if(window.addEventListener) {
						window.addEventListener("message", listener, false);
					} else {
						window.attachEvent("onmessage", function() { listener(event); });
					}

					var iframe = document.createElement("iframe");
					iframe.src = "http://127.0.0.1:23119/connector/ieHack";
					document.documentElement.appendChild(iframe);
				};
				xdr.send("");
			} catch(e) {
				Zotero.logError(e);
				fail();
			}
		} else {
			Zotero.Connector.callMethod("ping", {}, function(status) {
				callback(status !== false);
			});
		}
	}

	/**
	 * Sends the XHR to execute an RPC call.
	 *
	 * @param	{String}		method			RPC method. See documentation above.
	 * @param	{Object}		data			RPC data. See documentation above.
	 * @param	{Function}		callback		Function to be called when requests complete.
	 */
	this.callMethod = function(method, data, callback, tab) {
		// Don't bother trying if not online in bookmarklet
		if(Zotero.isBookmarklet && this.isOnline === false) {
			callback(false, 0);
			return;
		}

		var newCallback = function(req) {
			try {
				var isOnline = req.status !== 0 && req.status !== 403 && req.status !== 412;

				if(Zotero.Connector.isOnline !== isOnline) {
					Zotero.Connector.isOnline = isOnline;
					if(Zotero.Connector_Browser && Zotero.Connector_Browser.onStateChange) {
						Zotero.Connector_Browser.onStateChange(isOnline);
					}
				}

				if(req.status == 0 || req.status >= 400) {
					Zotero.debug("Connector: Method "+method+" failed with status "+req.status);
					if(callback) callback(false, req.status);

					// Check for incompatible version
					if(req.status === 412) {
						if(Zotero.Connector_Browser && Zotero.Connector_Browser.onIncompatibleStandaloneVersion) {
							var standaloneVersion = req.getResponseHeader("X-Zotero-Version");
							Zotero.Connector_Browser.onIncompatibleStandaloneVersion(Zotero.version, standaloneVersion);
							throw "Connector: Version mismatch: Connector version "+Zotero.version
								+", Standalone version "+(standaloneVersion ? standaloneVersion : "<unknown>");
						}
					}
				} else {
					Zotero.debug("Connector: Method "+method+" succeeded");
					var val = null;
					if(req.responseText) {
						if(req.getResponseHeader("Content-Type") === "application/json") {
							val = JSON.parse(req.responseText);
						} else {
							val = req.responseText;
						}
					}
					if(callback) callback(val, req.status);
				}
			} catch(e) {
				Zotero.logError(e);
				return;
			}
		};

		if(Zotero.isIE) {	// IE requires XDR for CORS
			if(_ieStandaloneIframeTarget) {
				var requestID = Zotero.Utilities.randomString();
				_ieConnectorCallbacks[requestID] = newCallback;
				_ieStandaloneIframeTarget.postMessage(JSON.stringify([null, "connectorRequest",
					[requestID, method, JSON.stringify(data)]]), "http://127.0.0.1:23119/connector/ieHack");
			} else {
				Zotero.debug("Connector: No iframe target; not sending to Standalone");
				callback(false, 0);
			}
		} else {							// Other browsers can use plain doPost
			var uri = CONNECTOR_URI+"connector/"+method;
			Zotero.HTTP.doPost(uri, JSON.stringify(data),
				newCallback, {
					"Content-Type":"application/json",
					"X-Zotero-Version":Zotero.version,
					"X-Zotero-Connector-API-Version":CONNECTOR_API_VERSION
				});
		}
	},

	/**
	 * Adds detailed cookies to the data before sending "saveItems" request to
	 *  the server/Standalone
	 *
	 * @param	{Object} data RPC data. See documentation above.
	 * @param	{Function} callback Function to be called when requests complete.
	 */
	this.setCookiesThenSaveItems = function(data, callback, tab) {
		if(Zotero.isFx && !Zotero.isBookmarklet && data.uri) {
			var host = Services.io.newURI(data.uri, null, null).host;
			var cookieEnum = Services.cookies.getCookiesFromHost(host);
			var cookieHeader = '';
			while(cookieEnum.hasMoreElements()) {
				var cookie = cookieEnum.getNext().QueryInterface(Components.interfaces.nsICookie2);
				cookieHeader += '\n' + cookie.name + '=' + cookie.value
					+ ';Domain=' + cookie.host
					+ (cookie.path ? ';Path=' + cookie.path : '')
					+ (!cookie.isDomain ? ';hostOnly' : '') //not a legit flag, but we have to use it internally
					+ (cookie.isSecure ? ';secure' : '');
			}

			if(cookieHeader) {
				data.detailedCookies = cookieHeader.substr(1);
			}

			this.callMethod("saveItems", data, callback, tab);
			return;
		} else if(Zotero.isChrome && !Zotero.isBookmarklet) {
			var self = this;
			chrome.cookies.getAll({url: tab.url}, function(cookies) {
				var cookieHeader = '';
				for(var i=0, n=cookies.length; i<n; i++) {
					cookieHeader += '\n' + cookies[i].name + '=' + cookies[i].value
						+ ';Domain=' + cookies[i].domain
						+ (cookies[i].path ? ';Path=' + cookies[i].path : '')
						+ (cookies[i].hostOnly ? ';hostOnly' : '') //not a legit flag, but we have to use it internally
						+ (cookies[i].secure ? ';secure' : '');
				}

				if(cookieHeader) {
					data.detailedCookies = cookieHeader.substr(1);
				}

				self.callMethod("saveItems", data, callback, tab);
			});
			return;
		}

		this.callMethod("saveItems", data, callback, tab);
	}
}

Zotero.Connector_Debug = new function() {
	/**
	 * Call a callback depending upon whether debug output is being stored
	 */
	this.storing = function(callback) {
		callback(Zotero.Debug.storing);
	}

	/**
	 * Call a callback with the lines themselves
	 */
	this.get = function(callback) {
		callback(Zotero.Debug.get());
	}

	/**
	 * Call a callback with the number of lines of output
	 */
	this.count = function(callback) {
		callback(Zotero.Debug.count());
	}

	/**
	 * Submit data to the sserver
	 */
	this.submitReport = function(callback) {

	}
}

/******** END connector.js ********/
/******** BEGIN tlds.js ********/
const TLDS = {
	"ac":true,
	"ad":true,
	"ae":true,
	"aero":true,
	"af":true,
	"ag":true,
	"ai":true,
	"al":true,
	"am":true,
	"an":true,
	"ao":true,
	"aq":true,
	"ar":true,
	"arpa":true,
	"as":true,
	"asia":true,
	"at":true,
	"au":true,
	"aw":true,
	"ax":true,
	"az":true,
	"ba":true,
	"bb":true,
	"bd":true,
	"be":true,
	"bf":true,
	"bg":true,
	"bh":true,
	"bi":true,
	"biz":true,
	"bj":true,
	"bm":true,
	"bn":true,
	"bo":true,
	"br":true,
	"bs":true,
	"bt":true,
	"bv":true,
	"bw":true,
	"by":true,
	"bz":true,
	"ca":true,
	"cat":true,
	"cc":true,
	"cd":true,
	"cf":true,
	"cg":true,
	"ch":true,
	"ci":true,
	"ck":true,
	"cl":true,
	"cm":true,
	"cn":true,
	"co":true,
	"com":true,
	"coop":true,
	"cr":true,
	"cu":true,
	"cv":true,
	"cx":true,
	"cy":true,
	"cz":true,
	"de":true,
	"dj":true,
	"dk":true,
	"dm":true,
	"do":true,
	"dz":true,
	"ec":true,
	"edu":true,
	"ee":true,
	"eg":true,
	"er":true,
	"es":true,
	"et":true,
	"eu":true,
	"fi":true,
	"fj":true,
	"fk":true,
	"fm":true,
	"fo":true,
	"fr":true,
	"ga":true,
	"gb":true,
	"gd":true,
	"ge":true,
	"gf":true,
	"gg":true,
	"gh":true,
	"gi":true,
	"gl":true,
	"gm":true,
	"gn":true,
	"gov":true,
	"gp":true,
	"gq":true,
	"gr":true,
	"gs":true,
	"gt":true,
	"gu":true,
	"gw":true,
	"gy":true,
	"hk":true,
	"hm":true,
	"hn":true,
	"hr":true,
	"ht":true,
	"hu":true,
	"id":true,
	"ie":true,
	"il":true,
	"im":true,
	"in":true,
	"info":true,
	"int":true,
	"io":true,
	"iq":true,
	"ir":true,
	"is":true,
	"it":true,
	"je":true,
	"jm":true,
	"jo":true,
	"jobs":true,
	"jp":true,
	"ke":true,
	"kg":true,
	"kh":true,
	"ki":true,
	"km":true,
	"kn":true,
	"kp":true,
	"kr":true,
	"kw":true,
	"ky":true,
	"kz":true,
	"la":true,
	"lb":true,
	"lc":true,
	"li":true,
	"lk":true,
	"lr":true,
	"ls":true,
	"lt":true,
	"lu":true,
	"lv":true,
	"ly":true,
	"ma":true,
	"mc":true,
	"md":true,
	"me":true,
	"mg":true,
	"mh":true,
	"mil":true,
	"mk":true,
	"ml":true,
	"mm":true,
	"mn":true,
	"mo":true,
	"mobi":true,
	"mp":true,
	"mq":true,
	"mr":true,
	"ms":true,
	"mt":true,
	"mu":true,
	"museum":true,
	"mv":true,
	"mw":true,
	"mx":true,
	"my":true,
	"mz":true,
	"na":true,
	"name":true,
	"nc":true,
	"ne":true,
	"net":true,
	"nf":true,
	"ng":true,
	"ni":true,
	"nl":true,
	"no":true,
	"np":true,
	"nr":true,
	"nu":true,
	"nz":true,
	"om":true,
	"org":true,
	"pa":true,
	"pe":true,
	"pf":true,
	"pg":true,
	"ph":true,
	"pk":true,
	"pl":true,
	"pm":true,
	"pn":true,
	"pr":true,
	"pro":true,
	"ps":true,
	"pt":true,
	"pw":true,
	"py":true,
	"qa":true,
	"re":true,
	"ro":true,
	"rs":true,
	"ru":true,
	"rw":true,
	"sa":true,
	"sb":true,
	"sc":true,
	"sd":true,
	"se":true,
	"sg":true,
	"sh":true,
	"si":true,
	"sj":true,
	"sk":true,
	"sl":true,
	"sm":true,
	"sn":true,
	"so":true,
	"sr":true,
	"st":true,
	"su":true,
	"sv":true,
	"sy":true,
	"sz":true,
	"tc":true,
	"td":true,
	"tel":true,
	"tf":true,
	"tg":true,
	"th":true,
	"tj":true,
	"tk":true,
	"tl":true,
	"tm":true,
	"tn":true,
	"to":true,
	"tp":true,
	"tr":true,
	"travel":true,
	"tt":true,
	"tv":true,
	"tw":true,
	"tz":true,
	"ua":true,
	"ug":true,
	"uk":true,
	"us":true,
	"uy":true,
	"uz":true,
	"va":true,
	"vc":true,
	"ve":true,
	"vg":true,
	"vi":true,
	"vn":true,
	"vu":true,
	"wf":true,
	"ws":true,
	"xxx":true,
	"ye":true,
	"yt":true,
	"za":true,
	"zm":true,
	"zw":true
};
/******** END tlds.js ********/
/******** BEGIN translator.js ********/
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

// Enumeration of types of translators
var TRANSLATOR_TYPES = {"import":1, "export":2, "web":4, "search":8};

/**
 * Singleton to handle loading and caching of translators
 * @namespace
 */
Zotero.Translators = new function() {
	var infoRe = /^\s*{[\S\s]*?}\s*?[\r\n]/;

	/**
	 * Gets translator code; only in this implementation
	 */
	this._getCode = function(translatorID, callback) {
		Zotero.HTTP.doGet(ZOTERO_CONFIG.REPOSITORY_URL+"/translators/"+translatorID+".js", function(xmlhttp) {
			if(xmlhttp.status !== 200) {
				Zotero.logError(new Error("Translator " + translatorID + " could not be retrieved"));
				callback(false);
				return;
			}

			callback(Zotero.Translators.preprocessCode(xmlhttp.responseText));
		});
	}

	function _haveCode(code, callback) {
		var m = infoRe.exec(code);
		if (!m) {
			Zotero.logError(new Error("Invalid or missing translator metadata JSON object for " + translatorID));
			callback(false);
			return;
		}

		try {
			var metadata = JSON.parse(m[0]);
		} catch(e) {
			Zotero.logError(new Error("Invalid or missing translator metadata JSON object for " + translatorID));
			callback(false);
			return;
		}
		metadata.code = code;

		callback(new Zotero.Translator(metadata));
	}

	/**
	 * Gets the translator that corresponds to a given ID
	 * @param {String} translatorID The ID of the translator
	 * @param {Function} [callback] An optional callback to be executed when translators have been
	 *                              retrieved. If no callback is specified, translators are
	 *                              returned.
	 */
	this.get = function(translatorID, callback) {
		this._getCode(translatorID, function(result) {
			if(result) {
				_haveCode(result, callback);
			} else {
				callback(false);
			}
		});
	};

	/**
	 * Gets all translators for a specific type of translation
	 * @param {String} type The type of translators to get (import, export, web, or search)
	 * @param {Function} callback A required callback to be executed when translators have been
	 *                            retrieved.
	 * @param {Boolean} [debugMode] Whether to assume debugging mode. If true, code is included for
	 *                              unsupported translators, and code originally retrieved from the
	 *                              repo is re-retrieved from Zotero Standalone.
	 */
	this.getAllForType = function(type, callback, debugMode) {
		Zotero.logError(new Error("Not implemented"));
		callback(false);
	}

	/**
	 * Gets web translators for a specific location
	 * @param {String} uri The URI for which to look for translators
	 * @param {Function} [callback] An optional callback to be executed when translators have been
	 *                              retrieved. If no callback is specified, translators are
	 *                              returned. The callback is passed a set of functions for
	 *                              converting URLs from proper to proxied forms as the second
	 *                              argument.
	 */
	this.getWebTranslatorsForLocation = function(uri, callback) {
		var searchURIs = [uri], fetchURIs,
			m = /^(https?:\/\/)([^\/]+)/i.exec(uri),
			properHosts = [];
			proxyHosts = [];

		Zotero.debug("Translators: Looking for translators for "+uri);

		// if there is a subdomain that is also a TLD, also test against URI with the domain
		// dropped after the TLD
		// (i.e., www.nature.com.mutex.gmu.edu => www.nature.com)
		if(m) {
			// First, drop the 0- if it exists (this is an III invention)
			var host = m[2];
			if(host.substr(0, 2) === "0-") host = substr(2);
			var hostnames = host.split(".");
			for(var i=1; i<hostnames.length-2; i++) {
				if(TLDS[hostnames[i].toLowerCase()]) {
					var properHost = hostnames.slice(0, i+1).join(".");
					searchURIs.push(m[1]+properHost+uri.substr(m[0].length));
					properHosts.push(properHost);
					proxyHosts.push(hostnames.slice(i+1).join("."));
				}
			}
		}

		var translators = [];
		var converterFunctions = [];
		var needCodeFor = 0;

		/**
		 * Gets translators for each search URI
		 */
		function getTranslatorsFromRepo() {
			var searchURI = fetchURIs.shift();
			for(var i=0; i<Zotero.TranslatorMasterList.length; i++) {
				var re = new RegExp(Zotero.TranslatorMasterList[i].target);
				if(re.test(searchURI)) translators.push(Zotero.TranslatorMasterList[i]);
			}

			if(fetchURIs.length) {	// More URLs to try
				getTranslatorsFromRepo();
			} else {				// Have all translators
				haveAllMetadata();
			}
		}

		/**
		 * Called when metadata has been retrieved for all translators
		 */
		function haveAllMetadata() {
			// Get unique translators
			var translatorIDs = {};
			var uniqueTranslatorsAndConverterFunctions = [];
			for(var i=0, n=translators.length; i<n; i++) {
				var translatorInfo = translators[i],
					translatorID = translatorInfo.translatorID;

				if(!translatorIDs[translatorID]) {
					translatorIDs[translatorID] = true;
					translator = new Zotero.Translator(translatorInfo);

					var converterInfo = false;
					for(var j=0, m=searchURIs.length; j<m; j++) {
						if(!translator.webRegexp || translator.webRegexp.test(searchURIs[j])) {
							if(j === 0) {
								converterInfo = null;
							} else {
								converterInfo = [properHosts[j-1], proxyHosts[j-1]];
							}
							break;
						}
					}

					if(converterInfo === false) {
						Zotero.logError("Server returned translator that did not match any page. "+
							"(Target: "+translator.target+", URIs: "+JSON.stringify(searchURIs)+")");
						continue;
					}
					uniqueTranslatorsAndConverterFunctions.push([translator, converterInfo]);
				}
			}

			// Sort translators
			uniqueTranslatorsAndConverterFunctions = uniqueTranslatorsAndConverterFunctions.sort(function(a, b) {
				return a[0].priority - b[0].priority;
			});

			var n = uniqueTranslatorsAndConverterFunctions.length,
				returnTranslators = new Array(n),
				returnConverterInfo = new Array(n);
			for(var i=0; i<n; i++) {
				returnTranslators[i] = uniqueTranslatorsAndConverterFunctions[i][0];
				returnConverterInfo[i] = uniqueTranslatorsAndConverterFunctions[i][1];
			}

			new Zotero.Translators.CodeGetter(returnTranslators, callback,
				[returnTranslators, returnConverterInfo]);
		}

		fetchURIs = searchURIs.slice();
		getTranslatorsFromRepo();

		return true;
	}

	/**
	 * Converts translators to JSON-serializable objects
	 */
	this.serialize = function(translator, properties) {
		// handle translator arrays
		if(translator.length !== undefined) {
			var newTranslators = new Array(translator.length);
			for(var i=0, n=translator.length; i<n; i++) {
				newTranslators[i] = Zotero.Translators.serialize(translator[i], properties);
			}
			return newTranslators;
		}

		// handle individual translator
		var newTranslator = {};
		for(var i in properties) {
			var property = properties[i];
			newTranslator[property] = translator[property];
		}
		return newTranslator;
	}

	/**
	 * Preprocesses code for a translator
	 */
	this.preprocessCode = function(code) {
		if(!Zotero.isFx) {
			var foreach = /^(\s*)for each\s*\((var )?([^ ]+) in (.*?)\)(\s*){/gm;
			code = code.replace(foreach, "$1var $3_zForEachSubject = $4; "+
				"for(var $3_zForEachIndex in $3_zForEachSubject)$5{ "+
				"$2$3 = $3_zForEachSubject[$3_zForEachIndex];", code);
			if(Zotero.isIE) {
				var info = infoRe.exec(code);
				if(info) {
					info = info[0];
					try {
						code = info+explorerify(code.substr(info.length));
					} catch(e) {
						Zotero.debug("Could not explorerify: "+e.toString());
					}
				}
			}
		}
		return code;
	}
}

/**
 * A class to get the code for a set of translators at once
 *
 * @param {Zotero.Translator[]} translators Translators for which to retrieve code
 * @param {Function} callback Callback to call once code has been retrieved
 * @param {Function} callbackArgs All arguments to be passed to callback (including translators)
 * @param {Boolean} [debugMode] If true, include code for unsupported translators
 */
Zotero.Translators.CodeGetter = function(translators, callback, callbackArgs, debugMode) {
	this._translators = translators;
	this._callbackArgs = callbackArgs;
	this._callback = callback;
	this._debugMode = debugMode;
	this.getCodeFor(0);
}

Zotero.Translators.CodeGetter.prototype.getCodeFor = function(i) {
	var me = this;
	while(true) {
		if(i === this._translators.length) {
			// all done; run callback
			this._callback(this._callbackArgs);
			return;
		}

		var translator = this._translators[i];

		// retrieve code if no code and translator is supported locally
		if((translator.runMode === Zotero.Translator.RUN_MODE_IN_BROWSER && !translator.hasOwnProperty("code"))
				// or if debug mode is enabled (even if unsupported locally)
				|| (this._debugMode && (!translator.hasOwnProperty("code")
				// or if in debug mode and the code we have came from the repo (which doesn't
				// include test cases)
				|| (Zotero.Repo && translator.codeSource === Zotero.Repo.SOURCE_REPO)))) {
				// get next translator
			translator.getCode(function() { me.getCodeFor(i+1) });
			return;
		}

		// if we are not at end of list and there is no reason to retrieve the code, keep going
		// through the list of potential translators
		i++;
	}
}

var TRANSLATOR_REQUIRED_PROPERTIES = ["translatorID", "target", "priority", "label", "code"];
var TRANSLATOR_PASSING_PROPERTIES = TRANSLATOR_REQUIRED_PROPERTIES.concat(["browserSupport", "runMode"]);
var TRANSLATOR_SAVE_PROPERTIES = TRANSLATOR_REQUIRED_PROPERTIES.concat(["browserSupport"]);
/**
 * @class Represents an individual translator
 * @constructor
 * @property {String} translatorID Unique GUID of the translator
 * @property {Integer} translatorType Type of the translator (use bitwise & with TRANSLATOR_TYPES to read)
 * @property {String} label Human-readable name of the translator
 * @property {String} creator Author(s) of the translator
 * @property {String} target Location that the translator processes
 * @property {String} minVersion Minimum Zotero version
 * @property {String} maxVersion Minimum Zotero version
 * @property {Integer} priority Lower-priority translators will be selected first
 * @property {String} browserSupport String indicating browser supported by the translator
 *     g = Gecko (Firefox)
 *     c = Google Chrome (WebKit & V8)
 *     s = Safari (WebKit & Nitro/Squirrelfish Extreme)
 *     i = Internet Explorer
 *     b = Bookmarklet
 *     v = Server
 * @property {Object} configOptions Configuration options for import/export
 * @property {Object} displayOptions Display options for export
 * @property {Boolean} inRepository Whether the translator may be found in the repository
 * @property {String} lastUpdated SQL-style date and time of translator's last update
 * @property {String} code The executable JavaScript for the translator
 */
Zotero.Translator = function(info) {
	this.init(info);
}

/**
 * Initializes a translator from a set of info, clearing code if it is set
 */
Zotero.Translator.prototype.init = function(info) {
	// make sure we have all the properties
	for(var i=0, n=TRANSLATOR_REQUIRED_PROPERTIES.length; i<n; i++) {
		var property = TRANSLATOR_REQUIRED_PROPERTIES[i];
		if(info[property] === undefined) {
			this.logError('Missing property "'+property+'" in translator metadata JSON object in ' + info.label);
			haveMetadata = false;
			break;
		} else {
			this[property] = info[property];
		}
	}
	this.browserSupport = "b";
	this.runMode = Zotero.Translator.RUN_MODE_IN_BROWSER;

	if(this.translatorType & TRANSLATOR_TYPES["import"]) {
		// compile import regexp to match only file extension
		this.importRegexp = this.target ? new RegExp("\\."+this.target+"$", "i") : null;
	} else if(this.hasOwnProperty("importRegexp")) {
		delete this.importRegexp;
	}

	//if(this.translatorType & TRANSLATOR_TYPES["web"]) {
		// compile web regexp
		this.webRegexp = this.target ? new RegExp(this.target, "i") : null;
	//} else if(this.hasOwnProperty("webRegexp")) {
	//	delete this.webRegexp;
	//}
}

/**
 * Retrieves code for this translator
 */
Zotero.Translator.prototype.getCode = function(callback) {
	var me = this;
	Zotero.Translators._getCode(this.translatorID,
		function(code) {
			if(!code) {
				callback(false);
			} else {
				// cache code for session only (we have standalone anyway)
				me.code = code;
				callback(true);
			}
		}
	);
}

/**
 * Log a translator-related error
 * @param {String} message The error message
 * @param {String} [type] The error type ("error", "warning", "exception", or "strict")
 * @param {String} [line] The text of the line on which the error occurred
 * @param {Integer} lineNumber
 * @param {Integer} colNumber
 */
Zotero.Translator.prototype.logError = function(message, type, line, lineNumber, colNumber) {
	Zotero.logError(message);
}

Zotero.Translator.RUN_MODE_IN_BROWSER = 1;
Zotero.Translator.RUN_MODE_ZOTERO_STANDALONE = 2;
Zotero.Translator.RUN_MODE_ZOTERO_SERVER = 4;

/******** END translator.js ********/
/******** BEGIN messaging.js ********/
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

/**
 * @namespace
 * See messages.js for an overview of the message handling process.
 */
Zotero.Messaging = new function() {
	var _safariTabs = [],
		_messageListeners = {
			"structuredCloneTest":function() {}
		},
		_nextTabIndex = 1,
		_structuredCloneSupported = false;

	/**
	 * Add a message listener
	 */
	this.addMessageListener = function(messageName, callback) {
		_messageListeners[messageName] = callback;
	}

	/**
	 * Handles a message to the global process received from the injected script in Chrome or Safari
	 * @param {String} messageName The name of the message received
	 * @param {Array} args Arguments for to be passed to the function corresponding to this message
	 * @param {Function} responseCallback Callback to be executed when data is available
	 * @param {String|Number} tabID ID of this tab
	 */
	this.receiveMessage = function(messageName, args, sendResponseCallback, tab) {
		try {
			//Zotero.debug("Messaging: Received message: "+messageName);
			// first see if there is a message listener
			if(_messageListeners[messageName]) {
				_messageListeners[messageName](args, tab);
				return;
			}

			var messageParts = messageName.split(MESSAGE_SEPARATOR);
			var messageConfig = MESSAGES[messageParts[0]][messageParts[1]];

			if(messageConfig) {
				callbackArg = (messageConfig.callbackArg
					? messageConfig.callbackArg : args.length-1);
				// if function accepts a callback, pass one in
				args[callbackArg] = function() {
					var newArgs = new Array(arguments.length);
					for(var i=0; i<arguments.length; i++) {
						newArgs[i] = arguments[i];
					}

					if(messageConfig.preSend) newArgs = messageConfig.preSend.apply(null, newArgs);
					sendResponseCallback(newArgs);
				}
			}
			args.push(tab);

			var fn = Zotero[messageParts[0]][messageParts[1]];
			if(!fn) throw new Error("Zotero."+messageParts[0]+"."+messageParts[1]+" is not defined");
			fn.apply(Zotero[messageParts[0]], args);
		} catch(e) {
			Zotero.logError(e);
		}
	}

	/**
	 * Sends a message to a tab
	 */
	this.sendMessage = function(messageName, args, tab) {
		if(Zotero.isBookmarklet) {
			_structuredCloneSupported = false;
			window.parent.postMessage((_structuredCloneSupported
				? [messageName, args] : JSON.stringify([messageName, args])), "*");
		} else if(Zotero.isChrome) {
			chrome.tabs.sendRequest(tab.id, [messageName, args]);
		} else if(Zotero.isSafari) {
			tab.page.dispatchMessage(messageName, args);
		}
	}

	/**
	 * Sends a message to RefWorks iFrame
	 */
	this.sendMessageToRefWorks = function(messageName, args) {
		var refworksiFrame = document.getElementById("RefWorks");
		if (refworksiFrame)
			refworksiFrame.contentWindow.postMessage((_structuredCloneSupported
				? [null, messageName, args] : JSON.stringify([null, messageName, args])), "*");
	}

	/**
	 * Adds messaging listener
	 */
	this.init = function() {
		if(Zotero.isBookmarklet) {
			var listener = function(event) {
				var data = event.data, source = event.source;

				// Ensure this message was sent by Zotero or RefWorks
				if(event.source !== window.parent && event.source !== window && event.origin !== ZOTERO_CONFIG.API_URL.slice(0, -1)) return;

				// Parse and receive message
				if(typeof data === "string") {
					try {
						// parse out the data
						data = JSON.parse(data);
					} catch(e) {
						return;
					}
				} else {
					_structuredCloneSupported = true;
				}

				Zotero.Messaging.receiveMessage(data[1], data[2], function(output) {
					var message = [data[0], data[1], output];
					source.postMessage(_structuredCloneSupported ? message : JSON.stringify(message), "*");
				}, event);
			};

			if(window.addEventListener) {
				window.addEventListener("message", listener, false);
			} else {
				window.attachEvent("onmessage", function() { listener(event) });
			}

			window.postMessage([null, "structuredCloneTest", null], window.location.href);
		} else if(Zotero.isChrome) {
			chrome.extension.onRequest.addListener(function(request, sender, sendResponseCallback) {
				Zotero.Messaging.receiveMessage(request[0], request[1], sendResponseCallback, sender.tab);
			});
		} else if(Zotero.isSafari) {
			safari.application.addEventListener("message", function(event) {
				var tab = event.target;
				_ensureSafariTabID(tab);
				Zotero.Messaging.receiveMessage(event.name, event.message[1], function(data) {
					tab.page.dispatchMessage(event.name+MESSAGE_SEPARATOR+"Response",
							[event.message[0], data], tab);
				}, tab);
			}, false);
		}
	}

	/**
	 * Gets the ID of a given tab in Safari
	 * Inspired by port.js from adblockforchrome by Michael Gundlach
	 */
	function _ensureSafariTabID(tab) {
		// if tab already has an ID, don't set a new one
		if(tab.id) return;

		// set tab ID
		tab.id = _nextTabIndex++;

		// remove old tabs that no longer exist from _safariTabs
		_safariTabs = _safariTabs.filter(function(t) { return t.browserWindow != null; });

		// add tab to _safariTabs so that it doesn't get garbage collected and we can keep ID
		_safariTabs.push(tab);
	}
}
/******** END messaging.js ********/
/******** BEGIN iframe_base.js ********/
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

Zotero.API = new function() {
	/**
	 * Performs authorization
	 * @param {Function} callback Callback to execute when auth is complete. The first argument
	 *                            passed to the callback indicates whether authorization succeeded
	 *                            successfully. The second will be either a string error message
	 *                            (if authorization failed) or the username (if authorization
	 *                            succeeded)
	 */
	this.authorize = function(callback) {
		var iframe = document.createElement("iframe");
		iframe.src = ZOTERO_CONFIG.LOGIN_URL;
		iframe.style.borderStyle = "none";
		iframe.style.position = "absolute";
		iframe.style.top = "0px";
		iframe.style.left = "0px";
		iframe.style.width = "100%";
		iframe.style.height = "100%";

		iframe.onload = function() {
			var win = iframe.contentWindow;
			if(win.location.href === ZOTERO_CONFIG.AUTH_COMPLETE_URL) {
				// Authorization should be done
				var c = _getCredentials(win.document ? win.document : document),
					userID = c[0], sessionToken = c[1];
				if(!userID || !sessionToken) {
					if(!userID) {
						var str = "User ID";
					} else if(!sessionToken) {
						var str = "Session token";
					} else {
						var str = "User ID and session token";
					}
					str += " not available";
					callback(false, str);
					return;
				}

				Zotero.Messaging.sendMessage("hideZoteroIFrame", null);
				document.body.removeChild(iframe);
				callback(true);
			}
		};

		document.body.appendChild(iframe);
		Zotero.Messaging.sendMessage("revealZoteroIFrame", null);
	};
	/*this.selectDone = function(items){
		Zotero.Messaging.sendMessage("selectDone",items);
	}*/
	/**
	 * Creates a new item
	 * @param {Object} payload Item(s) to create, in the object format expected by the server.
	 * @param {String|null} itemKey Parent item key, or null if a top-level item.
	 * @param {Function} callback Callback to be executed upon request completion. Passed true if
	 *     succeeded, or false if failed, along with the response body.
	 * @param {Boolean} [askForAuth] If askForAuth === false, don't ask for authorization if not
	 *     already authorized.
	 */
	this.createItem = function(payload) {

		var form = document.createElement("form");
		var textarea = document.createElement("textarea");
		var returnURL = document.createElement("input");
		var iframe = document.createElement("iframe");
		var referrer = getParameterByName("referrer");
		payload.referrer = referrer;
		payload.pageTitle = getParameterByName("pageTitle");
		form.action = ZOTERO_CONFIG.API_URL+"pme/list/";
		form.target = "API_URL";
		form.method = "POST";
		form.style.display = "none";
		form.acceptCharset = "UTF-8";
		textarea.style.display = "none";
		textarea.name = "payload";
		textarea.value = JSON.stringify(payload);
		form.appendChild(textarea);
		returnURL.name = "returnUrl";
		returnURL.value = encodeURIComponent(referrer);
		form.appendChild(returnURL);
		iframe.name = form.target;
		iframe.id = "RefWorks";
		iframe.style.borderStyle = "none";
		iframe.style.position = "absolute";
		iframe.style.top = "0px";
		iframe.style.left = "0px";
		iframe.style.width = "100%";
		iframe.style.height = "100%";
		iframe.setAttribute('allowtransparency', 'true');
		iframe.style.backgroundImage = "url(" + ZOTERO_CONFIG.API_URL + "public/img/loading-large.gif)";
		iframe.style.backgroundPosition = "center";
		iframe.style.backgroundRepeat = "no-repeat";

		document.body.appendChild(form);
		document.body.appendChild(iframe);
		form.submit();
		Zotero.Messaging.sendMessage("revealZoteroIFrame", null);
	};
	/**
	 * Creates a new selection
	 * @param {Object} payload Item(s) to create, in the object format expected by the server.
	 * @param {String|null} itemKey Parent item key, or null if a top-level item.
	 * @param {Function} callback Callback to be executed upon request completion. Passed true if
	 *     succeeded, or false if failed, along with the response body.
	 * @param {Boolean} [askForAuth] If askForAuth === false, don't ask for authorization if not
	 *     already authorized.
	 */
	this.createSelection = function(payload) {
		function getParameterByName(name) {
			name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
			var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
				results = regex.exec(window.location.search);
			return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
		}

		var form = document.createElement("form");
		var textarea = document.createElement("textarea");
		var returnURL = document.createElement("input");
		var iframe = document.createElement("iframe");
		var referrer = getParameterByName("referrer");
		payload.referrer = referrer;
		payload.pageTitle = getParameterByName("pageTitle");
		form.action = ZOTERO_CONFIG.API_URL+"pme/list/";
		form.target = "API_URL";
		form.method = "POST";
		form.style.display = "none";
		form.acceptCharset = "UTF-8";
		textarea.style.display = "none";
		textarea.name = "payload";
		textarea.value = JSON.stringify(payload);
		form.appendChild(textarea);
		returnURL.name = "returnUrl";
		returnURL.value = encodeURIComponent(referrer);
		form.appendChild(returnURL);
		iframe.name = form.target;
		iframe.id = "RefWorks";
		iframe.style.borderStyle = "none";
		iframe.style.position = "absolute";
		iframe.style.top = "0px";
		iframe.style.left = "0px";
		iframe.style.width = "100%";
		iframe.style.height = "100%";
		iframe.setAttribute('allowtransparency', 'true');
		iframe.style.backgroundImage = "url(" + ZOTERO_CONFIG.API_URL + "public/img/loading-large.gif)";
		iframe.style.backgroundPosition = "center";
		iframe.style.backgroundRepeat = "no-repeat";

		document.body.appendChild(form);
		document.body.appendChild(iframe);
		form.submit();
		Zotero.Messaging.sendMessage("revealZoteroIFrame", null);
	};
	/**
	 * Uploads an attachment to the Zotero server
	 * @param {Object} attachment An attachment object. This object must have the following keys<br>
	 *     id - a unique identifier for the attachment used to identifiy it in subsequent progress
	 *          messages<br>
	 *     data - the attachment contents, as a typed array<br>
	 *     filename - a filename for the attachment<br>
	 *     key - the attachment item key<br>
	 *     md5 - the MD5 hash of the attachment contents<br>
	 *     mimeType - the attachment MIME type
	 */
	this.uploadAttachment = function(attachment) {
		Zotero.Messaging.sendMessageToRefWorks("uploadAttachment", attachment);
	};

	this.notifyAttachmentProgress = function(args) {
		Zotero.Messaging.sendMessageToRefWorks("attachmentProgress", args);
	};

	this.notifyFullReference = function(item) {
		Zotero.Messaging.sendMessageToRefWorks("fullReference", item);
	};

	/**
	 * Extracts credentials from cookies
	 */
	var userID, sessionToken;
	function _getCredentials(doc) {
		var cookies = doc.cookie.split(/ *; */);
		for(var i=0, n=cookies.length; i<n; i++) {
			var cookie = cookies[i],
				equalsIndex = cookie.indexOf("="),
				key = cookie.substr(0, equalsIndex);
			if(key === "zoteroUserInfo") {
				var m = /"userID";(?:s:[0-9]+:"|i:)([0-9]+)/.exec(unescape(cookie.substr(equalsIndex+1)));
				if(m) userID = m[1];
			} else if(key === "zotero_www_session_v2") {
				sessionToken = cookie.substr(equalsIndex+1);
			}
		}
		return [userID, sessionToken];
	}

	/**
	 * Dispatches an attachmentCallback message to the parent window
	 */
	function _dispatchAttachmentCallback(id, status, error) {
		Zotero.Messaging.sendMessage("attachmentCallback",
			(error ? [id, status, error.toString()] : [id, status]));
		if(error) throw error;
	}

	/**
	 * Loads an iframe on S3 to upload data
	 * @param {Function} [callback] Callback to be executed when iframe is loaded
	 */
	var Uploader = new function() {
		var _uploadIframe,
			_waitingForUploadIframe,
			_attachmentCallbacks = [];

		this.init = function() {
			if(_uploadIframe) return;
			Zotero.debug("OAuth: Loading S3 iframe");

			_waitingForUploadIframe = [];

			_uploadIframe = document.createElement("iframe");
			_uploadIframe.src = ZOTERO_CONFIG.S3_URL+"bookmarklet_upload.html";

			var listener = function(event) {
				if(event.source != _uploadIframe.contentWindow) return;
				if(event.stopPropagation) {
					event.stopPropagation();
				} else {
					event.cancelBubble = true;
				}

				var data = event.data;
				if(_waitingForUploadIframe) {
					Zotero.debug("OAuth: S3 iframe loaded");
					// If we were previously waiting for this iframe to load, call callbacks
					var callbacks = _waitingForUploadIframe;
					_waitingForUploadIframe = false;
					for(var i=0; i<callbacks.length; i++) {
						callbacks[i]();
					}
				} else {
					// Otherwise, this is a callback for a specific attachment
					_attachmentCallbacks[data[0]](data[1], data[2]);
					if(data[1] === false || data[1] === 100) {
						delete _attachmentCallbacks[data[0]];
					}
				}
			};

			if(window.addEventListener) {
				window.addEventListener("message", listener, false);
			} else {
				window.attachEvent("message", function() { listener(event) });
			}

			document.body.appendChild(_uploadIframe);
		}

		this.upload = function(contentType, data, progressCallback) {
			this.init();
			if(_waitingForUploadIframe) {
				_waitingForUploadIframe.push(
					function() { Uploader.upload(contentType, data, progressCallback); });
				return;
			}

			Zotero.debug("OAuth: Uploading attachment to S3");
			var id = Zotero.Utilities.randomString();
			_attachmentCallbacks[id] = progressCallback;
			_uploadIframe.contentWindow.postMessage({"id":id, "contentType":contentType,
				"data":data}, ZOTERO_CONFIG.S3_URL);
		}
	};
}

Zotero.isBookmarklet = true;
Zotero.Debug.init();

// Add message listeners to save attachments
Zotero.Messaging.addMessageListener("_getAttachment", function(args){
	Zotero.Messaging.sendMessage("_getAttachment", args);
});

// Add message listeners to get metadata
Zotero.Messaging.addMessageListener("getMetaData", function(items){
	Zotero.Messaging.sendMessage("selectDone", items);
});

Zotero.Messaging.addMessageListener("cleanup", function(){
	Zotero.Messaging.sendMessage("cleanup", null);
});



Zotero.Messaging.init();

if(Zotero.isIE) {
	Zotero.Connector.checkIsOnline(function(status) {
		if(!status && window.location.protocol === "http:") {
			Zotero.debug("Switching to https");
			window.location.replace("https:"+window.location.toString().substr(5));
		} else {
			Zotero.debug("Sending translate message");
			Zotero.Messaging.sendMessage("translate", null);
		}
	});
} else {
	Zotero.Messaging.sendMessage("translate", null);
}

/******** END iframe_base.js ********/
