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
if(!Zotero.HTTP) Zotero.HTTP = {};

/**
 * Determines whether the page to be loaded has the same origin as the current page
 */
Zotero.HTTP.isSameOrigin = function(url) {
	var hostPortRe = /^([^:\/]+:)\/\/([^\/]+)/i;
	var m = hostPortRe.exec(url);
	if(!m) {
		return true;
	} else {
		var location = Zotero.isBookmarklet ? window.parent.location : window.location;
		return m[1].toLowerCase() === location.protocol.toLowerCase() &&
			m[2].toLowerCase() === location.host.toLowerCase();
	}
}

/**
 * Determing if trying to load non-HTTPs URLs from HTTPS pages
 */
Zotero.HTTP.isLessSecure = function(url) {
	if (url.substr(0,8).toLowerCase() == 'https://') return false;

	var location = Zotero.isBookmarklet ? window.parent.location : window.location;
	return location.protocol.toLowerCase() == 'https:';
}

/**
 * Load one or more documents in a hidden iframe
 *
 * @param {String|String[]} urls URL(s) of documents to load
 * @param {Function} processor Callback to be executed for each document loaded
 * @param {Function} done Callback to be executed after all documents have been loaded
 * @param {Function} exception Callback to be executed if an exception occurs
 */
Zotero.HTTP.processDocuments = function(urls, processor, done, exception, dontDelete) {
	var loadingURL;

	/**
	 * Removes event listener for the load event and deletes the hidden browser
	 */
	var removeListeners = function() {
		if("removeEventListener" in hiddenBrowser) {
			hiddenBrowser.removeEventListener("load", onFrameLoad, false);
		}
	}

	/**
	 * Loads the next page
	 * @inner
	 */
	var doLoad = function() {
		if(urls.length) {
			loadingURL = urls.shift();
			try {
				Zotero.debug("HTTP.processDocuments: Loading "+loadingURL);
				if(Zotero.HTTP.isSameOrigin(loadingURL)) {
					hiddenBrowser.src = loadingURL;
					if(Zotero.isBookmarklet) {
						// Hack to disable window.alert() on iframe loads
						var id = window.setInterval(function() {
							var win;
							if(hiddenBrowser.contentWindow) {
								win = hiddenBrowser.contentWindow;
							} else if(hiddenBrowser.contentDocument) {
								win = hiddenBrowser.contentDocument.window;
							}

							if(win) {
								if(hiddenBrowser.contentWindow.location == "about:blank") return;
								hiddenBrowser.contentWindow.alert = function() {};
							}
							window.clearInterval(id);
						}, 0);
					}
				} else if(Zotero.isBookmarklet) {
					throw "HTTP.processDocuments: Cannot perform cross-site request from "+window.parent.location+" to "+loadingURL;
				} else {
					Zotero.HTTP.doGet(loadingURL, onCrossSiteLoad);
				}
			} catch(e) {
				if(exception) {
					try {
						exception(e);
					} catch(e) {
						Zotero.logError(e);
					}
					return;
				} else {
					Zotero.logError(e);
				}

				removeListeners();
			}
		} else {
			if(done) {
				try {
					done();
				} catch(e) {
					console.log(e)
					Zotero.logError(done);
				}
			}

			removeListeners();
		}
	};

	/**
	 * Process a loaded document
	 * @inner
	 */
	var process = function(newLoc, newDoc, newWin) {
		try {
			if(newLoc === "about:blank") return;
			Zotero.debug("HTTP.processDocuments: "+newLoc+" has been loaded");
			if(newLoc !== prevUrl) {	// Just in case it fires too many times
				prevUrl = newLoc;

				// ugh ugh ugh ugh
				if(Zotero.isIE) wgxpath.install(newWin);

				try {
					processor(newDoc, newLoc);
				} catch(e) {
					Zotero.logError(e);
				}

				doLoad();
			}
		} catch(e) {
			if(exception) {
				try {
					exception(e);
				} catch(e) {
					Zotero.logError(e);
				}
			} else {
				Zotero.logError(e);
			}

			removeListeners();
			return;
		}
	}

	/**
	 * Callback to be executed when a page is retrieved via cross-site XHR
	 * @inner
	 */
	var onCrossSiteLoad = function(xmlhttp) {
		// add iframe
		var iframe = document.createElement("iframe");
		iframe.style.display = "none";
		// ban script execution
		iframe.setAttribute("sandbox", "allow-same-origin allow-forms");
		document.body.appendChild(iframe);

		// load cross-site data into iframe
		doc = iframe.contentDocument;
		doc.open();
		doc.write(xmlhttp.responseText);
		doc.close();
		process(loadingURL, doc, iframe.contentWindow || iframe.contentDocument.defaultView);
	}

	/**
	 * Callback to be executed when a page load completes
	 * @inner
	 */
	var onFrameLoad = function() {
		var newWin = hiddenBrowser.contentWindow, newDoc, newLoc;
		try {
			if(newWin) {
				newDoc = newWin.document;
			} else {
				newDoc = hiddenBrowser.contentDocument;
				newWin = newDoc.defaultView;
			}
			newLoc = newDoc.documentURI || newWin.location.toString();
		} catch(e) {
			e = "Same origin HTTP request redirected to a different origin not handled";

			if(exception) {
				try {
					exception(e);
				} catch(e) {
					Zotero.logError(e);
				}
			} else {
				Zotero.logError(e);
			}

			removeListeners();
			return;
		}
		process(newLoc, newDoc, newWin);
	};

	if(typeof(urls) == "string") urls = [urls];

	var prevUrl;

	var hiddenBrowser = Zotero.Browser.createHiddenBrowser();
	if(hiddenBrowser.addEventListener) {
		hiddenBrowser.addEventListener("load", onFrameLoad, false);
	} else {
		hiddenBrowser.attachEvent("onload", onFrameLoad);
	}

	doLoad();
	return hiddenBrowser;
}

Zotero.Browser = {
	"createHiddenBrowser":function() {
		var hiddenBrowser = document.createElement("iframe");
		//if(!Zotero.isBookmarklet) {
		hiddenBrowser.style.display = "none";
		//}
		if(document.domain == document.location.hostname) {
			// Since sandboxed iframes cannot set document.domain, if
			// document.domain is set on this page, then SOP will
			// definitely prevent us from accessing the document
			// in a sandboxed iframe. On the other hand, if we don't
			// sandbox the iframe, it is possible it will navigate the
			// top-level page. So we set the sandbox attribute only if
			// we are not certain that document.domain has been set.
			// This is not perfect, since if a page sets
			// document.domain = document.domain, it is still a
			// different origin and we will not be able to access pages
			// loaded in the iframe. Additionally, if a page sets
			// document.domain to a different hostname, since we don't
			// sandbox, it is possible that it will navigate the
			// top-level page.
			// TODO: consider HTML XHR
			hiddenBrowser.sandbox = "allow-same-origin allow-forms allow-scripts";
		}
		document.body.appendChild(hiddenBrowser);
		return hiddenBrowser;
	},
	"deleteHiddenBrowser":function(hiddenBrowser) {
		document.body.removeChild(hiddenBrowser);
	}
}
/******** END http.js ********/
