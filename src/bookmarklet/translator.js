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

// Enumeration of types of translators
var TRANSLATOR_TYPES = {"import":1, "export":2, "web":4, "search":8};

/**
 * Singleton to handle loading and caching of translators
 * @namespace
 */
Zotero.Translators = new function() {
	var _cache, _translators;
	var _initialized = false;
	var _fullFrameDetectionWhitelist = ['resolver.ebscohost.com'];
	var _resetAttempted = false;
	var infoRe = /^\s*{[\S\s]*?}\s*?[\r\n]/;

	this._translatorsHash = null;

	/**
	 * Initializes translator cache, loading all relevant translators into memory
	 * @param {Zotero.Translate[]} [translators] List of translators. If not specified, it will be
	 *                                           retrieved from storage.
	 */
	this.init = async function(translators) {
		if(!translators) {
			translators = Zotero.TranslatorMasterList;
		}

		_cache = {"import":[], "export":[], "web":[], "search":[]};
		_translators = {};
		_initialized = true;

		// Build caches
		for(var i=0; i<translators.length; i++) {
			try {
				var translator = new Zotero.Translator(translators[i]);
				_translators[translator.translatorID] = translator;

				for(var type in TRANSLATOR_TYPES) {
					if(translator.translatorType & TRANSLATOR_TYPES[type]) {
						_cache[type].push(translator);
					}
				}
			} catch(e) {
				Zotero.logError(e);
				try {
					Zotero.logError("Could not load translator "+JSON.stringify(translators[i]));
				} catch(e) {}
			}
		}

		// Huge number of translator metadata missing. Attempt to reset.
		// NOTE: If the number of translators significantly decreases (currently at 450ish)
		// then this will trigger on every translator init.
		if (Object.keys(_translators).length < 400 && !_resetAttempted) {
			_resetAttempted = true;
			Zotero.logError(new Error(`Only ${Object.keys(_translators).length} translators present in cache. Resetting`));
			// Zotero.Prefs.clear("connector.repo.lastCheck.repoTime");
			// Zotero.Prefs.clear("connector.repo.lastCheck.localTime");
		}

		// Sort by priority
		var cmp = function (a, b) {
			if (a.priority > b.priority) {
				return 1;
			}
			else if (a.priority < b.priority) {
				return -1;
			}
		}
		for(var type in _cache) {
			_cache[type].sort(cmp);
		}
	}

	this._getCode = async function(translatorID, callback) {
		const xmlhttp = await Zotero.HTTP.request('GET', ZOTERO_CONFIG.REPOSITORY_URL+"/translators/"+translatorID+".js")
		if(xmlhttp.status !== 200) {
			Zotero.logError(new Error("Translator " + translatorID + " could not be retrieved"));
			callback(false);
			return;
		}
		return Zotero.Translators._haveCode(xmlhttp.responseText, translatorID);
	}

	this._haveCode = function(code, id) {
		var m = infoRe.exec(code);
		if (!m) {
			throw new Error("Invalid or missing translator metadata JSON object for " + id);
		}

		try {
			var metadata = JSON.parse(m[0]);
		} catch(e) {
			throw new Error("Invalid or missing translator metadata JSON object for " + id);
		}

		return code;
	}

	/**
	 * Gets a hash of all translators (to check whether Connector needs an update)
	 */
	this.getTranslatorsHash = async function () {
		if (this._translatorsHash) return this._translatorsHash;
		if(!_initialized) await this.init();
		const translators = Object.keys(_translators).map(id => _translators[id]);

		let hashString = "";
		for (let translator of translators) {
			hashString += `${translator.translatorID}:${translator.lastUpdated},`;
		}
		this._translatorsHash = Zotero.Utilities.Connector.md5(hashString);
		return this._translatorsHash;
	};


	/**
	 * Gets the translator that corresponds to a given ID, without attempting to retrieve code
	 * @param {String} id The ID of the translator
	 */
	this.getWithoutCode = async function(id) {
		if(!_initialized) await Zotero.Translators.init();
		return _translators[id] ? _translators[id] : false;
	}

	/**
	 * Load code for a translator
	 */
	this.getCodeForTranslator = async function (translator) {
		if (!_initialized) await Zotero.Translators.init();
		if (translator.code) return translator.code;

		let code = await this._getCode(translator.translatorID);
		translator.code = code;
		return code;
	}

	/**
	 * Gets the translator that corresponds to a given ID
	 *
	 * @param {String} id The ID of the translator
	 */
	this.get = async function (id) {
		if (!_initialized) await Zotero.Translators.init();
		var translator = _translators[id];
		if (!translator) {
			return false;
		}

		// only need to get code if it is of some use
		if(translator.runMode === Zotero.Translator.RUN_MODE_IN_BROWSER
			&& !translator.hasOwnProperty("code")) {
			await Zotero.Translators.getCodeForTranslator(translator);
		}
		return translator;
	};

	/**
	 * Gets all translators for a specific type of translation
	 * @param {String} type The type of translators to get (import, export, web, or search)
	 * @param {Boolean} [debugMode] Whether to assume debugging mode. If true, code is included for
	 *                              unsupported translators, and code originally retrieved from the
	 *                              repo is re-retrieved from Zotero Standalone.
	 */
	this.getAllForType = async function (type, debugMode) {
		if(!_initialized) await Zotero.Translators.init();
		var translators = _cache[type].slice(0);
		var codeGetter = new Zotero.Translators.CodeGetter(translators, debugMode);
		await codeGetter.getAll();
		return translators;
	};

	/**
	 * Gets web translators for a specific location
	 *
	 * @param {String} uri The URI for which to look for translators
	 * @return {Promise<Array[]>} - A promise for a 2-item array containing an array of translators and
	 *     an array of functions for converting URLs from proper to proxied forms
	 */
	this.getWebTranslatorsForLocation = async function (URI, rootURI, callback) {
		//await Zotero.initDeferred.promise;
		if (callback) {
			// If callback is present then this call is coming from an injected frame,
			// so we may as well treat it as if it's a root-frame
			rootURI = URI;
		} else {
			// Hopefully a temporary hard-coded list
			for (let str of _fullFrameDetectionWhitelist) {
				if (URI.includes(str)) {
					rootURI = URI;
					break;
				}
			}
		}
		var isFrame = URI !== rootURI;
		if(!_initialized) await Zotero.Translators.init();
		var allTranslators = _cache["web"];
		var potentialTranslators = [];
		var proxies = [];

		var rootSearchURIs = this.getPotentialProxies(rootURI);
		var frameSearchURIs = isFrame ? this.getPotentialProxies(URI) : rootSearchURIs;

		Zotero.debug("Translators: Looking for translators for "+Object.keys(frameSearchURIs).join(', '));

		for(var i=0; i<allTranslators.length; i++) {
			var translator = allTranslators[i];
			if (isFrame && !translator.webRegexp.all) {
				continue;
			}
			rootURIsLoop:
				for(var rootSearchURI in rootSearchURIs) {
					var isGeneric = !allTranslators[i].webRegexp.root;
					// don't attempt to use generic translators that can't be run in this browser
					// since that would require transmitting every page to Zotero host
					if(isGeneric && allTranslators[i].runMode !== Zotero.Translator.RUN_MODE_IN_BROWSER) {
						continue;
					}

					var rootURIMatches = isGeneric || rootSearchURI.length < 8192 && translator.webRegexp.root.test(rootSearchURI);
					if (translator.webRegexp.all && rootURIMatches) {
						for (var frameSearchURI in frameSearchURIs) {
							var frameURIMatches = frameSearchURI.length < 8192 && translator.webRegexp.all.test(frameSearchURI);

							if (frameURIMatches) {
								potentialTranslators.push(translator);
								proxies.push(frameSearchURIs[frameSearchURI]);
								// prevent adding the translator multiple times
								break rootURIsLoop;
							}
						}
					} else if(!isFrame && (isGeneric || rootURIMatches)) {
						potentialTranslators.push(translator);
						proxies.push(rootSearchURIs[rootSearchURI]);
						break;
					}
				}
		}

		var codeGetter = new Zotero.Translators.CodeGetter(potentialTranslators);
		await codeGetter.getAll();
		return [potentialTranslators, proxies];
	};

	/**
	 * Converts translators to JSON-serializable objects
	 */
	this.serialize = function(translator, properties) {
		// handle translator arrays
		if (Array.isArray(translator)) {
			var newTranslators = new Array(translator.length);
			for(var i in translator) {
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
	 * Check the url for potential proxies and deproxify, providing a schema to build
	 * a proxy object.
	 *
	 * @param url
	 * @returns {Object} Unproxied url to proxy object
	 */
	this.getPotentialProxies = function(url) {
		// make sure url has a trailing slash
		url = new URL(url).href;
		var urlToProxy = {};
		urlToProxy[url] = null;

		// if there is a subdomain that is also a TLD, also test against URI with the domain
		// dropped after the TLD
		// (i.e., www.nature.com.mutex.gmu.edu => www.nature.com)
		var m = /^(https?:\/\/)([^\/]+)/i.exec(url);
		if (m) {
			// First, drop the 0- if it exists (this is an III invention)
			var host = m[2];
			if (host.substr(0, 2) === "0-") host = host.substr(2);
			var hostnameParts = [host.split(".")];
			if (m[1] == 'https://') {
				// try replacing hyphens with dots for https protocol
				// to account for EZProxy HttpsHypens mode
				hostnameParts.push(host.split('.'));
				hostnameParts[1].splice(0, 1, ...(hostnameParts[1][0].replace(/-/g, '.').split('.')));
			}

			for (let i=0; i < hostnameParts.length; i++) {
				let parts = hostnameParts[i];
				// skip the lowest level subdomain, domain and TLD
				for (let j=1; j<parts.length-2; j++) {
					// if a part matches a TLD, everything up to it is probably the true URL
					if (TLDS[parts[j].toLowerCase()]) {
						var properHost = parts.slice(0, j+1).join(".");
						// protocol + properHost + /path
						var properURL = m[1]+properHost+url.substr(m[0].length);
						// Accommodating URLS like https://kns-cnki-net-443.webvpn.fafu.edu.cn:880/
						// where the TLD part j==3, but j+1 is not the start of the proxy host
						// See https://forums.zotero.org/discussion/comment/407995/#Comment_407995
						let skippedParts = '';
						while (parts[j+1].match(/^[0-9]*$/)) {
							skippedParts += '-' + parts[j+1];
							j++;
						}
						var proxyHost = parts.slice(j+1).join('.');
						let scheme = `%h${skippedParts}.${proxyHost}/%p`
						// Backwards compatibility
						urlToProxy[properURL] = {toProperScheme: scheme, scheme, dotsToHyphens: true};
					}
				}
			}
		}
		return urlToProxy;
	};

	/**
	 * Saves all translator metadata to localStorage
	 * @param {Object[]} newMetadata Metadata for new translators
	 * @param {Boolean} reset Whether to clear all existing translators and overwrite them with
	 *                        the specified translators.
	 */
	this.update = async function(newMetadata, reset=false) {
		if (!_initialized) await Zotero.Translators.init();
		if (!newMetadata.length) return;
		var serializedTranslators = [];

		if (reset) {
			serializedTranslators = this.serialize(newMetadata, Zotero.Translator.TRANSLATOR_CACHING_PROPERTIES);
		}
		else {
			var hasChanged = false;

			// Update translators with new metadata
			for(var i in newMetadata) {
				var newTranslator = newMetadata[i];

				if (newTranslator.deleted) continue;

				if(_translators.hasOwnProperty(newTranslator.translatorID)) {
					var oldTranslator = _translators[newTranslator.translatorID];

					// check whether translator has changed
					if(oldTranslator.lastUpdated !== newTranslator.lastUpdated) {
						// check whether newTranslator is actually newer than the existing
						// translator, and if not, don't update
						if(Zotero.Date.sqlToDate(newTranslator.lastUpdated) < Zotero.Date.sqlToDate(oldTranslator.lastUpdated)) {
							continue;
						}

						Zotero.debug(`Translators: Updating ${newTranslator.label}`);
						oldTranslator.init(newTranslator);
						hasChanged = true;
					}
				} else {
					Zotero.debug(`Translators: Adding ${newTranslator.label}`);
					_translators[newTranslator.translatorID] = new Zotero.Translator(newTranslator);
					hasChanged = true;
				}
			}

			let deletedTranslators = newMetadata
				.filter(translator => translator.deleted)
				.map(translator => translator.translatorID);

			for (let id of deletedTranslators) {
				// Already deleted
				if (! _translators.hasOwnProperty(id)) continue;

				hasChanged = true;
				Zotero.debug(`Translators: Removing ${_translators[id].label}`);
				delete _translators[id];
			}

			if(!hasChanged) return;

			// Serialize translators
			for(var i in _translators) {
				var serializedTranslator = this.serialize(_translators[i], Zotero.Translator.TRANSLATOR_CACHING_PROPERTIES);

				serializedTranslators.push(serializedTranslator);
			}
		}

		// Store
		if (Zotero.isBrowserExt || Zotero.isSafari) {
			Zotero.Prefs.set('translatorMetadata', serializedTranslators);
			Zotero.debug("Translators: Saved updated translator list ("+serializedTranslators.length+" translators)");
		}

		// Reinitialize
		await Zotero.Translators.init(serializedTranslators);
		this._translatorsHash = null;
	}
}

/**
 * A class to get the code for a set of translators at once
 *
 * @param {Zotero.Translator[]} translators Translators for which to retrieve code
 */
Zotero.Translators.CodeGetter = function(translators) {
	this._translators = translators;
	this._concurrency = 2;
};

Zotero.Translators.CodeGetter.prototype.getCodeFor = async function(i) {
	let translator = this._translators[i];
	try {
		translator.code = await Zotero.Translators.getCodeForTranslator(translator);
	} catch (e) {
		Zotero.debug(`Failed to retrieve code for ${translator.translatorID}`)
	}
	return translator.code;
};

Zotero.Translators.CodeGetter.prototype.getAll = async function () {
	let codes = [];
	// Chain promises with some level of concurrency. If unchained, fires
	// off hundreds of xhttprequests on connectors and crashes the extension
	for (let i = 0; i < this._translators.length; i++) {
		let translator = this._translators[i];
		if (i < this._concurrency) {
			codes.push(this.getCodeFor(i));
		} else {
			codes.push(codes[i-this._concurrency].then(() => this.getCodeFor(i)));
		}
	}
	return Promise.all(codes);
};

// Properties required for every translator
var TRANSLATOR_REQUIRED_PROPERTIES = ["translatorID", "translatorType", "label", "priority", "target", "creator", "lastUpdated"];
// Properties that are passed from background to inject page in connector
var TRANSLATOR_PASSING_PROPERTIES = TRANSLATOR_REQUIRED_PROPERTIES
	.concat(["targetAll", "browserSupport", "code", "runMode", "itemType", "inRepository"]);

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

	// Always cache in the connector. Cache if property is set
	this.cacheCode = Zotero.isConnector || info.cacheCode;
	if (this.translatorType & TRANSLATOR_TYPES["web"]) {
		// Also cache if there is no regexp target -- generic translator
		this.cacheCode |= !this.target;
		this.webRegexp = {
			root: this.target ? new RegExp(this.target, "i") : null,
			all: this.targetAll ? new RegExp(this.targetAll, "i") : null
		};
	} else if (this.hasOwnProperty("webRegexp")) {
		delete this.webRegexp;
	}

	if (info.path) {
		this.path = info.path;
		this.fileName = OS.Path.basename(info.path);
	}
	if (info.code && this.cacheCode) {
		this.code = info.code;
	} else if (this.hasOwnProperty("code")) {
		delete this.code;
	}
	// Save a copy of the metadata block
	delete info.path;
	delete info.code;
	this.metadata = info;
}

/**
 * Get metadata block for a translator
 */
Zotero.Translator.prototype.serialize = function(properties) {
	var info = {};
	for(var i in properties) {
		var property = properties[i];
		info[property] = this[property];
	}
	return info;
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

if (typeof process === 'object' && process + '' === '[object process]'){
	module.exports = Zotero.Translator;
}

/******** END translator.js ********/
