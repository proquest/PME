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

const MAX_BACKOFF = 64e3;

/**
 * Functions for performing HTTP requests, both via XMLHTTPRequest and using a hidden browser
 * @namespace
 */
Zotero.HTTP = new function() {
	this.StatusError = function(xmlhttp, url, responseText) {
		this.message = `HTTP request to ${url} rejected with status ${xmlhttp.status}`;
		this.status = xmlhttp.status;
		if (xmlhttp.getResponseHeader && xmlhttp.getResponseHeader('Retry-After')) {
			this.retryAfter = xmlhttp.getResponseHeader('Retry-After');
		}
		try {
			this.responseText = responseText;
		} catch (e) {}
	};
	this.StatusError.prototype = Object.create(Error.prototype);

	this.TimeoutError = function(url, ms) {
		this.message = `HTTP request to ${url} has timed out after ${ms}ms`;
	};
	this.TimeoutError.prototype = Object.create(Error.prototype);

	/**
	 * Get a promise for a HTTP request
	 *
	 * @param {String} method The method of the request ("GET", "POST", "HEAD", or "OPTIONS")
	 * @param {String}	url				URL to request
	 * @param {Object} [options] Options for HTTP request:<ul>
	 *         <li>body - The body of a POST request</li>
	 *         <li>headers - Object of HTTP headers to send with the request</li>
	 *         <li>debug - Log response text and status code</li>
	 *         <li>logBodyLength - Length of request body to log</li>
	 *         <li>timeout - Request timeout specified in milliseconds [default 15000]</li>
	 *         <li>responseType - The response type of the request from the XHR spec</li>
	 *         <li>responseCharset - The charset the response should be interpreted as</li>
	 *         <li>successCodes - HTTP status codes that are considered successful, or FALSE to allow all</li>
	 *         <li>maxBackoff - how many times should a HTTP 429 backoff be attempted before the request fails
	 *         		[default 0]</li>
	 *     </ul>
	 * @return {Promise<XMLHttpRequest>} A promise resolved with the XMLHttpRequest object if the
	 *     request succeeds, or rejected if the browser is offline or a non-2XX status response
	 *     code is received (or a code not in options.successCodes if provided).
	 */
	this.request = async function(method, url, options = {}) {
		// Default options
		options = Object.assign({
			body: null,
			headers: {},
			debug: false,
			logBodyLength: 1024,
			timeout: 15000,
			responseType: '',
			responseCharset: null,
			successCodes: null,
			maxBackoff: 5,
			backoff: 0,
		}, options);
		let originalOptions = Zotero.Utilities.deepCopy(options);

		try {
			// if (Zotero.isManifestV3) {
				return await Zotero.HTTP._requestFetch(method, url, options);
			// }
			// else {
			// 	return await Zotero.HTTP._requestXHR(method, url, options);
			// }

		}
		catch (e) {
			if ((e.status === 429 || e.retryAfter) && options.backoff < options.maxBackoff) {
				if (e.status === 429) {
					Zotero.debug(`HTTP 429 returned, attempting a backoff #${options.backoff+1}`)
				}
				else {
					Zotero.debug(`HTTP ${e.status} returned with Retry-After: ${e.retryAfter}, attempting a backoff #${options.backoff+1}`)
				}
				if (e.retryAfter && parseInt(e.retryAfter) == e.retryAfter) {
					if (e.retryAfter * 1000 > MAX_BACKOFF) {
						Zotero.debug(`HTTP 429 Retry-After ${e.retryAfter} is higher than max backoff. Not retrying.`);
						throw e;
					}
					await Zotero.Promise.delay(e.retryAfter * 1000);
				}
				else {
					await Zotero.Promise.delay(Math.min(Math.pow(2, options.backoff)*1000, MAX_BACKOFF) + Math.round(Math.random() * 1000));
				}
				originalOptions.backoff++;
				return this.request(method, url, originalOptions);
			}
			throw e;
		}
	};

	// this._requestXHR = async function(method, url, options) {
	// 	var useContentXHR = false;
	//
	// 	// There is no reason to run xhr not from background page for web extensions since those
	// 	// requests send full browser cookies.
	// 	// That is not the case with Safari though and without cookies requests to proxied
	// 	// resources fail, so we use on-page xhr there.
	// 	// However, if the request requires replacing user-agent, we still send the request via
	// 	// the background page since we're unable to replace user-agent via an on-page xhr and
	// 	// since user-agent option is explicitly set, it takes priority.
	// 	let sameOriginRequestViaSafari = Zotero.isSafari && Zotero.HTTP.isSameOrigin(url);
	// 	const needCoRequest = !Zotero.HTTP.isSameOrigin(url) && !url.startsWith(ZOTERO_CONFIG.REPOSITORY_URL) && !url.startsWith(ZOTERO_CONFIG.API_URL) &&
	// 		options.responseType != 'document' && options.responseType != 'arraybuffer';
	// 	if (Zotero.isInject && !sameOriginRequestViaSafari) {
	// 		// The privileged XHR that Firefox makes available to content scripts so that they
	// 		// can make cross-domain requests doesn't include the Referer header in requests [1],
	// 		// so sites that check for it don't work properly. As long as we're not making a
	// 		// cross-domain request, we can use the content XHR that it provides, which does
	// 		// include Referer. Chrome's XHR in content scripts includes Referer by default.
	// 		//
	// 		// [1] https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Content_scripts#XHR_and_Fetch
	// 		if (Zotero.HTTP.isSameOrigin(url) && !(Zotero.isSafari && options.headers && options.headers['User-Agent'])) {
	// 			if (typeof content != 'undefined' && content.XMLHttpRequest) {
	// 				Zotero.debug("Using content XHR");
	// 				useContentXHR = true;
	// 			}
	// 		}
	// 		else {
	// 			if (Zotero.isBookmarklet) {
	// 				if (needCoRequest) {
	// 					// Need to do a cross-origin request via API-IPA. The IPA only call the url and return the response because the
	// 					// user's browser can block the request if it is not made with the same origin.
	// 					Zotero.debug("HTTP: Attempting cross-site request by server reuqest");
	// 					try {
	// 						return await Zotero.COHTTP.request(method, url, options);
	// 					} catch (error) {
	// 						Zotero.debug(`HTTP error: ${error.message}`);
	// 						throw error;
	// 					}
	// 				}
	// 			}
	// 			else {
	// 				// This code is only for browser extensions - we are using bookmark!
	// 				// Make a cross-origin request via the background page, parsing the responseText with
	// 				// DOMParser and returning a Proxy with 'response' set to the parsed document
	//
	// 				// let isDocRequest = options.responseType == 'document';
	// 				// let coOptions = Object.assign({}, options);
	// 				// if (isDocRequest) {
	// 				// 	coOptions.responseType = 'text';
	// 				// }
	// 				// if (Zotero.isSafari && options.headers && options.headers['User-Agent']) {
	// 				// 	coOptions.headers['Cookie'] = document.cookie;
	// 				// }
	// 				// return Zotero.COHTTP.request(method, url, coOptions).then(function (xmlhttp) {
	// 				// 	if (!isDocRequest) return xmlhttp;
	// 				//
	// 				// 	Zotero.debug("Parsing cross-origin response for " + url);
	// 				// 	let parser = new DOMParser();
	// 				// 	let contentType = xmlhttp.getResponseHeader("Content-Type");
	// 				// 	if (contentType != 'application/xml' && contentType != 'text/xml') {
	// 				// 		contentType = 'text/html';
	// 				// 	}
	// 				// 	let doc = parser.parseFromString(xmlhttp.responseText, contentType);
	// 				//
	// 				// 	return new Proxy(xmlhttp, {
	// 				// 		get: function (target, name) {
	// 				// 			return name == 'response' ? doc : target[name];
	// 				// 		}
	// 				// 	});
	// 				// });
	// 			}
	// 		}
	// 	}
	//
	// 	let logBody = '';
	// 	if (['GET', 'HEAD'].includes(method)) {
	// 		if (options.body != null) {
	// 			throw new Error(`HTTP ${method} cannot have a request body (${options.body})`)
	// 		}
	// 	} else if(options.body) {
	// 		if (options.headers["Content-Type"] !== 'multipart/form-data') {
	// 			options.body = typeof options.body == 'string' ? options.body : JSON.stringify(options.body);
	//
	// 			logBody = `: ${options.body.substr(0, options.logBodyLength)}` +
	// 			options.body.length > options.logBodyLength ? '...' : '';
	// 			// TODO: make sure below does its job in every API call instance
	// 			// Don't display password or session id in console
	// 			logBody = logBody.replace(/password":"[^"]+/, 'password":"********');
	// 			logBody = logBody.replace(/password=[^&]+/, 'password=********');
	// 		}
	//
	// 		if (!options.headers) options.headers = {};
	// 		if (!options.headers["Content-Type"]) {
	// 			options.headers["Content-Type"] = "application/x-www-form-urlencoded";
	// 		}
	// 		else if (options.headers["Content-Type"] == 'multipart/form-data') {
	// 			// Allow XHR to set Content-Type with boundary for multipart/form-data
	// 			delete options.headers["Content-Type"];
	// 		}
	// 	}
	//
	// 	// if (options.headers && options.headers['User-Agent'] && Zotero.isBrowserExt) {
	// 	// 	await Zotero.WebRequestIntercept.replaceUserAgent(url, options.headers['User-Agent']);
	// 	// 	delete options.headers['User-Agent'];
	// 	// }
	// 	Zotero.debug(`HTTP ${method} ${url}${logBody}`);
	//
	// 	var xmlhttp = useContentXHR ? new content.XMLHttpRequest() : new XMLHttpRequest();
	// 	xmlhttp.timeout = options.timeout;
	// 	var promise = Zotero.HTTP._attachHandlers(url, xmlhttp, options);
	//
	// 	xmlhttp.open(method, url, true);
	//
	// 	for (let header in options.headers) {
	// 		xmlhttp.setRequestHeader(header, options.headers[header]);
	// 	}
	//
	// 	xmlhttp.responseType = options.responseType || '';
	//
	// 	// Maybe should provide "mimeType" option instead. This is xpcom legacy, where responseCharset
	// 	// could be controlled manually
	// 	if (options.responseCharset) {
	// 		xmlhttp.overrideMimeType("text/plain; charset=" + options.responseCharset);
	// 	}
	//
	// 	xmlhttp.send(options.body);
	//
	// 	return promise.then(function(xmlhttp) {
	// 		if (options.debug) {
	// 			if (xmlhttp.responseType == '' || xmlhttp.responseType == 'text') {
	// 				Zotero.debug(`HTTP ${xmlhttp.status} response: ${xmlhttp.responseText}`);
	// 			}
	// 			else {
	// 				Zotero.debug(`HTTP ${xmlhttp.status} response`);
	// 			}
	// 		}
	//
	// 		let invalidDefaultStatus = options.successCodes === null &&
	// 			(xmlhttp.status < 200 || xmlhttp.status >= 300);
	// 		let invalidStatus = Array.isArray(options.successCodes) && !options.successCodes.includes(xmlhttp.status);
	// 		if (invalidDefaultStatus || invalidStatus) {
	// 			throw new Zotero.HTTP.StatusError(xmlhttp, url, typeof xmlhttp.responseText == 'string' ? xmlhttp.responseText : undefined);
	// 		}
	// 		return xmlhttp;
	// 	});
	// }

	this._requestFetch = async function(method, url, options) {

		if (!options.headers) options.headers = {};

		if (options.headers['Referer']) {
			options.referrer = options.headers['Referer'];
			delete options.headers['Referer'];
		}
		if (options.responseType == '') {
			options.responseType = 'text';
		}

		let coOptions = Object.assign({}, options);
		let isDocRequest = options.responseType == 'document';
		const needCoRequest = !Zotero.HTTP.isSameOrigin(url) && !url.startsWith(ZOTERO_CONFIG.REPOSITORY_URL) && !url.startsWith(ZOTERO_CONFIG.API_URL) || isDocRequest;

		let logBody = '';
		if (['GET', 'HEAD'].includes(method)) {
			if (options.body != null) {
				throw new Error(`HTTP ${method} cannot have a request body (${options.body})`)
			}
		} else if (options.body) {
			if (options.headers["Content-Type"] !== 'multipart/form-data') {
				options.body = typeof options.body == 'string' ? options.body : JSON.stringify(options.body);

				logBody = `: ${options.body.substr(0, options.logBodyLength)}` +
				options.body.length > options.logBodyLength ? '...' : '';
				// TODO: make sure below does its job in every API call instance
				// Don't display password or session id in console
				logBody = logBody.replace(/password":"[^"]+/, 'password":"********');
				logBody = logBody.replace(/password=[^&]+/, 'password=********');
			}

			if (!options.headers["Content-Type"]) {
				options.headers["Content-Type"] = "application/x-www-form-urlencoded";
			} else if (options.headers["Content-Type"] == 'multipart/form-data') {
				// Allow XHR to set Content-Type with boundary for multipart/form-data
				delete options.headers["Content-Type"];
			}
		}

		// if (options.headers && options.headers['User-Agent'] && Zotero.isBrowserExt) {
		// 	await Zotero.WebRequestIntercept.replaceUserAgent(url, options.headers['User-Agent']);
		// 	delete options.headers['User-Agent'];
		// }

		Zotero.debug(`HTTP ${method} ${url}${logBody}`);

		if (options.timeout) {
			var abortController = new AbortController();
			setTimeout(abortController.abort.bind(abortController), options.timeout);
		}
		let headers = new Headers(options.headers);
		try {
			if (isDocRequest) {
				throw new Error('Document response type not supported in fetch - need CO request');
			}
			let fetchOptions = {
				method,
				headers,
				body: options.body,
				credentials: Zotero.isInject ? 'same-origin' : 'include',
				referrer: options.referrer,
				referrerPolicy: options.referrer ? "unsafe-url" : "strict-origin-when-cross-origin"
			}
			if (abortController) {
				fetchOptions.signal = abortController.signal;
			}
			var response = await fetch(url, fetchOptions);

			let responseData;
			if (options.responseType == 'arraybuffer') {
				responseData = await response.arrayBuffer();
			} else if (options.responseType == 'json') {
				responseData = await response.text();
				try {
					responseData = JSON.parse(responseData);
				}
				catch (e) {
					Zotero.debug(`HTTP: Failed to parse JSON from ${method} ${url}`);
				}
			}
			else {
				responseData = await response.text();
			}

			if (options.debug) {
				if (options.responseType == '' || options.responseType == 'text') {
					Zotero.debug(`HTTP ${response.status} response: ${responseData}`);
				} else {
					Zotero.debug(`HTTP ${xmlhttp.status} response`);
				}
			}

			let responseHeaders = {};
			let responseHeadersString = "";
			for (let [key, value] of response.headers.entries()) {
				responseHeaders[key.toLowerCase()] = value;
				responseHeadersString += `${key}: ${value}\r\n`;
			}

			response = {
				responseText: typeof responseData == 'string' ? responseData : '',
				response: responseData,
				responseURL: response.url,
				responseType: options.responseType,
				status: response.status,
				statusText: response.statusText,
				getAllResponseHeaders: () => responseHeadersString,
				getResponseHeader: name => responseHeaders[name.toLowerCase()]
			};

			let invalidDefaultStatus = options.successCodes === null &&
				(response.status < 200 || response.status >= 300);
			let invalidStatus = Array.isArray(options.successCodes) && !options.successCodes.includes(response.status);
			if (invalidDefaultStatus || invalidStatus) {
				throw new Zotero.HTTP.StatusError(response, url, typeof responseData == 'string' ? responseData : '');
			}

			return response;

		} catch (e) {

			if (isDocRequest) {
				coOptions.responseType = 'text';
			}

			if (needCoRequest) {
				// Need to do a cross-origin request via API-IPA. The IPA only call the url and return the response because the
				// user's browser can block the request if it is not made with the same origin.
				Zotero.debug("HTTP: Attempting cross-site request by server request");
				if (options.headers && !options.headers['Cookie']) {
					coOptions.headers['Cookie'] = document.cookie;
				}

				if (options.headers && !options.headers['User-Agent']) {
					coOptions.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
				}

				try {
					return await Zotero.COHTTP.request(method, url, coOptions).then(function (xmlhttp) {
						if (!isDocRequest) {
							xmlhttp.responseType = options.responseType;
							return xmlhttp;
						}

						Zotero.debug("Parsing cross-origin response for " + url);
						xmlhttp.responseURL = xmlhttp.responseURL || url;
						let parser = new DOMParser();
						let contentType = xmlhttp.getResponseHeader("Content-Type");
						if (contentType != 'application/xml' && contentType != 'text/xml') {
							contentType = 'text/html';
						}
						let doc = parser.parseFromString(xmlhttp.responseText, contentType);

						return new Proxy(xmlhttp, {
							get: function (target, name) {
								return name == 'response' ? doc : target[name];
							}
						});
					});
				} catch (error) {
					Zotero.debug(`HTTP error: ${error.message}`);
					throw error;
				}
			} else {
				var err;
				if (e.name == 'AbortError') {
					err = new Zotero.HTTP.TimeoutError(url, options.timeout);
				} else {
					err = new Zotero.HTTP.StatusError({status: 0}, url);
				}
				// Zotero.logError(err);
				throw err;
			}
		}

	};

	/**
	 * Send an HTTP GET request via XMLHTTPRequest
	 *
	 * @deprecated Use {@link Zotero.HTTP.request}
	 * @param {String}			url				URL to request
	 * @param {Function} 		onDone			Callback to be executed upon request completion
	 * @param {String}			responseCharset
	 * @param {N/A}				cookieSandbox	Not used in Connector
	 * @param {Object}			headers			HTTP headers to include with the request
	 * @return {Boolean} True if the request was sent, or false if the browser is offline
	 */
	this.doGet = function(url, onDone, responseCharset, cookieSandbox, headers) {
		this.request('GET', url, {responseCharset, headers})
			.then(onDone, function(e) {
				onDone({status: e.status, responseText: e.responseText});
				throw (e);
			});
		return true;
	};

	/**
	 * Send an HTTP POST request via XMLHTTPRequest
	 *
	 * @deprecated Use {@link Zotero.HTTP.request}
	 * @param {String}			url URL to request
	 * @param {String|Object[]}	body Request body
	 * @param {Function}			onDone Callback to be executed upon request completion
	 * @param {String}			headers Request HTTP headers
	 * @param {String}			responseCharset
	 * @return {Boolean} True if the request was sent, or false if the browser is offline
	 */
	this.doPost = function(url, body, onDone, headers, responseCharset) {
		this.request('POST', url, {body, responseCharset, headers})
			.then(onDone, function(e) {
				onDone({status: e.status, responseText: e.responseText});
				throw (e);
			});
		return true;
	};


	/**
	 * Adds a ES6 Proxied location attribute
	 * @param doc
	 * @param docURL
	 */
	this.wrapDocument = function(doc, docURL) {
		docURL = new URL(docURL);
		var wrappedDoc = new Proxy(doc, {
			get: function (t, prop) {
				if (prop === 'location') {
					return docURL;
				}
				else if (prop == 'evaluate') {
					// If you pass the document itself into doc.evaluate as the second argument
					// it fails, because it receives a proxy, which isn't of type `Node` for some reason.
					// Native code magic.
					return function() {
						if (arguments[1] == wrappedDoc) {
							arguments[1] = t;
						}
						return t.evaluate.apply(t, arguments)
					}
				}
				else if (prop == 'documentURI') {
					return docURL.href;
				}
				else {
					if (typeof t[prop] == 'function') {
						return t[prop].bind(t);
					}
					return t[prop];
				}
			}
		});
		return wrappedDoc;
	};


	/**
	 * Adds request handlers to the XMLHttpRequest and returns a promise that resolves when
	 * the request is complete. xmlhttp.send() still needs to be called, this just attaches the
	 * handler
	 *
	 * See {@link Zotero.HTTP.request} for parameters
	 * @private
	 */
	this._attachHandlers = function(url, xmlhttp, options) {
		var deferred = Zotero.Promise.defer();
		xmlhttp.onload = () => deferred.resolve(xmlhttp);
		xmlhttp.onerror = xmlhttp.onabort = function() {
			var e = new Zotero.HTTP.StatusError(xmlhttp, url, typeof xmlhttp.responseText == 'string' ? xmlhttp.responseText : undefined);
			if (options.successCodes === false) {
				deferred.resolve(xmlhttp);
			} else {
				deferred.reject(e);
			}
		};
		xmlhttp.ontimeout = function() {
			var e = new Zotero.HTTP.TimeoutError(url, xmlhttp.timeout);
			Zotero.logError(e);
			deferred.reject(e);
		};
		return deferred.promise;
	};

	this._coRequest = async function(method, url, options) {
		const response = await fetch(ZOTERO_CONFIG.API_URL + 'api-ipa/strProxy', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				method: method,
				url: url,
				options: options
			})
		});

		let responseData;
		let responseObj;
		if (response.ok) {
			if (options.responseType === 'arraybuffer') {
				responseData = await response.arrayBuffer();
				responseObj = {
					status: response.status,
					statusText: response.statusText,
					headers: [...response.headers.entries()].reduce((acc, [key, value]) => {
						acc[key] = value;
						return acc;
					}, {}),
					response: responseData
				};
			} else {
				responseObj = await response.json();
				responseData = responseObj.response;
			}
		} else {
			responseData = await response.text();
			responseObj = {
				status: response.status,
				statusText: response.statusText,
				headers: [...response.headers.entries()].reduce((acc, [key, value]) => {
					acc[key] = value;
					return acc;
				}, {}),
				response: responseData
			};
			Zotero.debug(`HTTP error ${response.status}: ${responseObj}`);
			if (url.startsWith('https://scholar.googleusercontent.com')) {
				throw new Error(`HTTP error ${response.status}: ${responseObj}`);
			}
		}

		// Create a mock XMLHttpRequest object
		const mockXMLHttpRequest = {
			status: responseObj.status,
			statusText: responseObj.statusText,
			responseText: typeof responseData === 'string' ? responseData : '',
			responseType: options.responseType,
			response: responseData,
			getResponseHeader: (header) => {
				const headersMap = responseObj.headers || {};
				return headersMap[header.toLowerCase()] || null;
			},
			getAllResponseHeaders: () => {
				const headersMap = responseObj.headers || {};
				return Object.keys(headersMap).map(key => `${key}: ${headersMap[key]}`).join('\r\n');
			}
		};

		return mockXMLHttpRequest;
	}
}

// Alias as COHTTP = Cross-origin HTTP; this is how we will call it from children
// For injected scripts, this get overwritten in messaging.js (see messages.js)
Zotero.COHTTP = {
	request: Zotero.HTTP._coRequest
};

/******** END http.js ********/
