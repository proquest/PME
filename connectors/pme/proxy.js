/*
    ***** BEGIN LICENSE BLOCK *****
    
    Copyright © 2009 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://PME.org
    
    This file is part of PME.
    
    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    
    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with PME.  If not, see <http://www.gnu.org/licenses/>.
    
    ***** END LICENSE BLOCK *****
*/

/**
 * A singleton to handle URL rewriting proxies
 * @namespace
 * @property transparent {Boolean} Whether transparent proxy functionality is enabled
 * @property proxies {PME.Proxy[]} All loaded proxies
 * @property hosts {PME.Proxy{}} Object mapping hosts to proxies
 */
PME.Proxies = new function() {
	this.proxies = false;
	this.transparent = false;
	this.hosts = {};
	
	var ioService = Components.classes["@mozilla.org/network/io-service;1"]
							  .getService(Components.interfaces.nsIIOService);
	var windowMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"]
							       .getService(Components.interfaces.nsIWindowMediator);
	var myHostName = null;
	var myCanonicalHostName = null;
	
	/**
	 * Initializes http-on-examine-response observer to intercept page loads and gets preferences
	 */
	this.init = function() {
		PME.debug("PME.Proxies.init")
		if(!this.proxies) {
			var me = this;
			PME.debug("PME.MIMETypeHandler.addObserver")
			PME.MIMETypeHandler.addObserver(function(ch) { me.observe(ch) });
			PME.debug("PME.DB.query")
			
			var rows = PME.DB.query("SELECT * FROM proxies");
			PME.Proxies.proxies = [new PME.Proxy(row) for each(row in rows)];
			PME.debug("proxies: "+JSON.stringify(PME.Proxies.proxies));
			for each(var proxy in PME.Proxies.proxies) {
				for each(var host in proxy.hosts) {
					PME.Proxies.hosts[host] = proxy;
				}
			}
		}
		
		PME.Proxies.transparent = !PME.isConnector && PME.Prefs.get("proxies.transparent");
		PME.Proxies.autoRecognize = PME.Proxies.transparent && PME.Prefs.get("proxies.autoRecognize");
		
		var disableByDomainPref = PME.Prefs.get("proxies.disableByDomain");
		PME.Proxies.disableByDomain = (PME.Proxies.transparent && disableByDomainPref ? PME.Prefs.get("proxies.disableByDomainString") : null);
		
		PME.Proxies.lastIPCheck = 0;
		PME.Proxies.lastIPs = "";
		PME.Proxies.disabledByDomain = false;
	}
	
	/**
	 * Observe method to capture page loads and determine if they're going through an EZProxy.
	 *
	 * @param {nsIChannel} channel
	 */
	this.observe = function(channel) {
		// try to detect a proxy
		channel.QueryInterface(Components.interfaces.nsIHttpChannel);
		var url = channel.URI.spec;

		// see if there is a proxy we already know
		var m = false;
		var proxy;
		for each(proxy in PME.Proxies.proxies) {
			if(proxy.proxyID && proxy.regexp && proxy.multiHost) {
				m = proxy.regexp.exec(url);
				if(m) break;
			}
		}
		
		if(m) {
			var host = m[proxy.parameters.indexOf("%h")+1];
			// add this host if we know a proxy
			if(proxy.autoAssociate							// if autoAssociate is on
				&& channel.responseStatus < 400				// and query was successful
				&& !PME.Proxies.hosts[host]				// and host is not saved
				&& proxy.hosts.indexOf(host) === -1
				&& !_isBlacklisted(host)					// and host is not blacklisted
			) {	
				proxy.hosts.push(host);
				proxy.save(true);
				
				var bw = _getBrowserAndWindow(channel.notificationCallbacks);
				if(!bw) return;
				_showNotification(bw,
					PME.getString('proxies.notification.associated.label', [host, channel.URI.hostPort]),
					"settings", function() { _prefsOpenCallback(bw[1]) });
			}
		} else {
			// otherwise, try to detect a proxy
			var proxy = false;
			for(var detectorName in PME.Proxies.Detectors) {
				var detector = PME.Proxies.Detectors[detectorName];
				try {
					proxy = detector(channel);
				} catch(e) {
					PME.logError(e);
				}
				
				if(!proxy) continue;
				PME.debug("Proxies: Detected "+detectorName+" proxy "+proxy.scheme+
					(proxy.multiHost ? " (multi-host)" : " for "+proxy.hosts[0]));
				
				var bw = _getBrowserAndWindow(channel.notificationCallbacks);
				if(!bw) return;
				
				var savedTransparent = false;
				proxy.save();
				
				break;
			}
		}
		
		// try to get an applicable proxy
		var webNav = null;
		var docShell = null;
		try {
			webNav = channel.notificationCallbacks.QueryInterface(Components.interfaces.nsIWebNavigation);
			docShell = channel.notificationCallbacks.QueryInterface(Components.interfaces.nsIDocShell);
		} catch(e) {
			return;
		}
		
		if(!docShell.allowMetaRedirects) return;
		
		// check that proxy redirection is actually enabled
		if(!PME.Proxies.transparent) return;
		
		var proxied = PME.Proxies.properToProxy(url, true);
		if(!proxied) return;
		
		if(PME.Proxies.disableByDomain) {
			var now = new Date();
			
			// IP update interval is every 15 minutes
			if((now - PME.Proxies.lastIPCheck) > 900000) {
				PME.debug("Proxies: Retrieving IPs");
				var ips = PME.Proxies.DNS.getIPs();
				var ipString = ips.join(",");
				if(ipString != PME.Proxies.lastIPs) {				
					// if IPs have changed, run reverse lookup
					PME.Proxies.lastIPs = ipString;
					// TODO IPv6
					var domains = [PME.Proxies.DNS.reverseLookup(ip) for each(ip in ips) if(ip.indexOf(":") == -1)];
					
					// if domains necessitate disabling, disable them
					PME.Proxies.disabledByDomain = domains.join(",").indexOf(PME.Proxies.disableByDomain) != -1;			
				}
			}
			
			PME.Proxies.lastIPCheck = now;
			if(PME.Proxies.disabledByDomain) return;
		}
		
		// try to find a corresponding browser object
		var bw = _getBrowserAndWindow(channel.notificationCallbacks);
		if(!bw) return;
		var browser = bw[0];
		var window = bw[1];
	
		channel.QueryInterface(Components.interfaces.nsIHttpChannel);				
		var proxiedURI = Components.classes["@mozilla.org/network/io-service;1"]
								  .getService(Components.interfaces.nsIIOService)
								  .newURI(proxied, null, null);
		if(channel.referrer) {
			// If the referrer is a proxiable host, we already have access (e.g., we're
			// on-campus) and shouldn't redirect
			if(PME.Proxies.properToProxy(channel.referrer.spec, true)) {
				PME.debug("Proxies: skipping redirect; referrer was proxiable");
				return;
			}
			// If the referrer is the same host as we're about to redirect to, we shouldn't
			// or we risk a loop
			if(channel.referrer.host == proxiedURI.host) {
				PME.debug("Proxies: skipping redirect; redirect URI and referrer have same host");
				return;
			}
		}
		
		if(channel.originalURI) {
			// If the original URI was a proxied host, we also shouldn't redirect, since any
			// links handed out by the proxy should already be proxied
			if(PME.Proxies.proxyToProper(channel.originalURI.spec, true)) {
				PME.debug("Proxies: skipping redirect; original URI was proxied");
				return;
			}
			// Finally, if the original URI is the same as the host we're about to redirect
			// to, then we also risk a loop
			if(channel.originalURI.host == proxiedURI.host) {
				PME.debug("Proxies: skipping redirect; redirect URI and original URI have same host");
				return;
			}
		}
		
		// make sure that the top two domains (e.g. gmu.edu in foo.bar.gmu.edu) of the
		// channel and the site to which we're redirecting don't match, to prevent loops.
		const top2DomainsRe = /[^\.]+\.[^\.]+$/;
		top21 = top2DomainsRe.exec(channel.URI.host);
		top22 = top2DomainsRe.exec(proxiedURI.host);
		if(!top21 || !top22 || top21[0] == top22[0]) {
			PME.debug("Proxies: skipping redirect; redirect URI and URI have same top 2 domains");
			return;
		}
		
		// Otherwise, redirect. Note that we save the URI we're redirecting from as the
		// referrer, since we can't make a proper redirect
		_showNotification(bw,
			PME.getString('proxies.notification.redirected.label', [channel.URI.hostPort, proxiedURI.hostPort]),
			"settings", function() { _prefsOpenCallback(bw[1]) });
		browser.loadURIWithFlags(proxied, 0, channel.URI, null, null);
	}
	
	/**
	 * Removes a proxy object from the list of proxy objects
	 * @returns {Boolean} True if the proxy was in the list, false if it was not
	 */
	this.remove = function(proxy) {
		var index = PME.Proxies.proxies.indexOf(proxy);
		if(index == -1) return false;
		// remove proxy from proxy list
		PME.Proxies.proxies.splice(index, 1);
		// remove hosts from host list
		for(var host in PME.Proxies.hosts) {
			if(PME.Proxies.hosts[host] == proxy) {
				delete PME.Proxies.hosts[host];
			}
		}
		return true;
	}
	
	/**
	 * Inserts a proxy into the host map; necessary when proxies are added
	 */
	this.save = function(proxy) {
		// add to list of proxies
		if(PME.Proxies.proxies.indexOf(proxy) == -1) PME.Proxies.proxies.push(proxy);
		
		// if there is a proxy ID (i.e., if this is a persisting, transparent proxy), add to host
		// list to do reverse mapping
		if(proxy.proxyID) {
			for each(var host in proxy.hosts) {
				PME.Proxies.hosts[host] = proxy;
			}
		}
	}
	
	/**
	 * Refreshes host map; necessary when proxies are changed or deleted
	 */
	this.refreshHostMap = function(proxy) {
		// if there is no proxyID, then return immediately, since there is no need to update
		if(!proxy.proxyID) return;
		
		// delete hosts that point to this proxy if they no longer exist
		for(var host in PME.Proxies.hosts) {
			if(PME.Proxies.hosts[host] == proxy && proxy.hosts.indexOf(host) == -1) {
				delete PME.Proxies.hosts[host];
			}
		}
		// add new hosts for this proxy
		PME.Proxies.save(proxy);
	}
	
	/**
	 * Returns a page's proper URL from a proxied URL. Uses both transparent and opaque proxies.
	 * @param {String} url
	 * @param {Boolean} onlyReturnIfProxied Controls behavior if the given URL is not proxied. If
	 *	it is false or unspecified, unproxied URLs are returned verbatim. If it is true, the
	 *	function will return "false" if the given URL is unproxied.
	 * @type String
	 */
	this.proxyToProper = function(url, onlyReturnIfProxied) {
		for each(var proxy in PME.Proxies.proxies) {
			if(proxy.regexp) {
				var m = proxy.regexp.exec(url);
				if(m) {
					var toProper = proxy.toProper(m);
					PME.debug("Proxies.proxyToProper: "+url+" to "+toProper);
					return toProper;
				}
			}
		}
		return (onlyReturnIfProxied ? false : url);
	}
	
	/**
	 * Returns a page's proxied URL from the proper URL. Uses only transparent proxies.
	 * @param {String} url
	 * @param {Boolean} onlyReturnIfProxied Controls behavior if the given URL is not proxied. If
	 *	it is false or unspecified, unproxied URLs are returned verbatim. If it is true, the
	 *	function will return "false" if the given URL is unproxied.
	 * @type String
	 */
	this.properToProxy = function(url, onlyReturnIfProxied) {
		var uri = ioService.newURI(url, null, null);
		if(PME.Proxies.hosts[uri.hostPort] && PME.Proxies.hosts[uri.hostPort].proxyID) {
			var toProxy = PME.Proxies.hosts[uri.hostPort].toProxy(uri);
			PME.debug("Proxies.properToProxy: "+url+" to "+toProxy);
			return toProxy;
		}
		return (onlyReturnIfProxied ? false : url);
	}
	
	/**
	 * Determines whether a host is blacklisted, i.e., whether we should refuse to save transparent
	 * proxy entries for this host. This is necessary because EZProxy offers to proxy all Google and
	 * Wikipedia subdomains, but in practice, this would get really annoying.
	 *
	 * @type Boolean
	 * @private
	 */
	 function _isBlacklisted(host) {
	 	/**
	 	 * Regular expression patterns of hosts never to proxy
	 	 * @const
	 	 */
		const hostBlacklist = [
			/edu$/,
			/google\.com$/,
			/wikipedia\.org$/,
			/^[^.]*$/,
			/doubleclick\.net$/
		];
	 	/**
	 	 * Regular expression patterns of hosts that should always be proxied, regardless of whether
	 	 * they're on the blacklist
	 	 * @const
	 	 */
		const hostWhitelist = [
			/^scholar\.google\.com$/,
			/^muse\.jhu\.edu$/
		]
		
		for each(var blackPattern in hostBlacklist) {
			if(blackPattern.test(host)) {
				for each(var whitePattern in hostWhitelist) {
					if(whitePattern.test(host)) {
						return false;
					}
				}
				return true;
			}
		}
		return false;
	 }
	 
	 /**
	  * If transparent is enabled, shows a dialog asking user whether to add a proxy to the
	  * transparent proxy list.
	  *
	  * @param {String} proxiedHost The host that would be redirected through the proxy.
	  * @param {String} proxyHost The host through which the given site would be redirected.
	  * @returns {Boolean} True if proxy should be added; false if it should not be.
	  */
	 function _showDialog(proxiedHost, proxyHost, proxy) {
		// ask user whether to add this proxy
		var io = {site:proxiedHost, proxy:proxyHost};
		var window = Components.classes["@mozilla.org/appshell/window-mediator;1"]
			.getService(Components.interfaces.nsIWindowMediator)
			.getMostRecentWindow("navigator:browser");
		window.openDialog('chrome://zotero/content/proxy.xul', '', 'chrome,modal', io);
		
		// disable transparent if checkbox checked
		if(io.disable) {
			PME.Proxies.autoRecognize = false;
			PME.Prefs.set("proxies.autoRecognize", false);
		}
		
		if(io.add) {
			proxy.erase();
			proxy.save(true);
		}
	 }
	 
	 /**
	  * Get browser and window from notificationCallbacks
	  * @return	{Array} Array containing a browser object and a DOM window object
	  */
	 function _getBrowserAndWindow(notificationCallbacks) {
		var browser = notificationCallbacks.getInterface(Ci.nsIWebNavigation)
			.QueryInterface(Ci.nsIDocShell).chromeEventHandler;
		var window = browser.ownerDocument.defaultView;
		return [browser, window];
	 }
	 
	 /**
	  * Show a proxy-related notification
	  * @param	{Array}		bw			output of _getBrowserWindow
	  * @param	{String}	label		notification text
	  * @param	{String}	button		button text ("settings" or "enable")
	  * @param	{Function}	callback	callback to be executed if button is pressed
	  */
	 function _showNotification(bw, label, button, callback) {
	 	var browser = bw[0];
	 	var window = bw[1];
	 	
		var listener = function() {
			var nb = window.gBrowser.getNotificationBox();
			nb.appendNotification(label,
				'zotero-proxy', 'chrome://browser/skin/Info.png', nb.PRIORITY_WARNING_MEDIUM,
				[{
					label:PME.getString('proxies.notification.'+button+'.button'),
					callback:callback
				}]);
			browser.removeEventListener("pageshow", listener, false);
		}
		
		browser.addEventListener("pageshow", listener, false);
	 }
	 
	 /**
	  * Opens preferences window
	  */
	 function _prefsOpenCallback(window) {
	 	window.openDialog('chrome://zotero/content/preferences/preferences.xul',
			'zotero-prefs',
			'chrome,titlebar,toolbar,'
				+ PME.Prefs.get('browser.preferences.instantApply', true) ? 'dialog=no' : 'modal',
			{"pane":"zotero-prefpane-proxies"}
		);
	 }
}

/**
 * Creates a PME.Proxy object from a DB row 
 *
 * @constructor
 * @class Represents an individual proxy server
 */
PME.Proxy = function(row) {
	if(row) {
		this._loadFromRow(row);
	} else {
		this.hosts = [];
		this.multiHost = false;
	}
}

/**
 * Regexps to match the URL contents corresponding to proxy scheme parameters
 * @const
 */
const Zotero_Proxy_schemeParameters = {
	"%p":"(.*?)",	// path
	"%d":"(.*?)",	// directory
	"%f":"(.*?)",	// filename
	"%a":"(.*?)"	// anything
};

/**
 * Regexps to match proxy scheme parameters in the proxy scheme URL
 * @const
 */
const Zotero_Proxy_schemeParameterRegexps = {
	"%p":/([^%])%p/,
	"%d":/([^%])%d/,
	"%f":/([^%])%f/,
	"%h":/([^%])%h/,
	"%a":/([^%])%a/
};

/**
 * Compiles the regular expression against which we match URLs to determine if this proxy is in use
 * and saves it in this.regexp
 */
PME.Proxy.prototype.compileRegexp = function() {
	// take host only if flagged as multiHost
	var parametersToCheck = Zotero_Proxy_schemeParameters;
	if(this.multiHost) parametersToCheck["%h"] = "([a-zA-Z0-9]+\\.[a-zA-Z0-9\.]+)";
	
	var indices = this.indices = {};
	this.parameters = [];
	for(var param in parametersToCheck) {
		var index = this.scheme.indexOf(param);
		
		// avoid escaped matches
		while(this.scheme[index-1] && (this.scheme[index-1] == "%")) {
			this.scheme = this.scheme.substr(0, index-1)+this.scheme.substr(index);
			index = this.scheme.indexOf(param, index+1);
		}
		
		if(index != -1) {
			this.indices[param] = index;
			this.parameters.push(param);
		}
	}
	
	// sort params by index
	this.parameters = this.parameters.sort(function(a, b) {
		return indices[a]-indices[b];
	})
	
	// now replace with regexp fragment in reverse order
	var re = "^"+PME.Utilities.quotemeta(this.scheme)+"$";
	for(var i=this.parameters.length-1; i>=0; i--) {
		var param = this.parameters[i];
		re = re.replace(Zotero_Proxy_schemeParameterRegexps[param], "$1"+parametersToCheck[param]);
	}
	
	this.regexp = new RegExp(re);
}

/**
 * Ensures that the proxy scheme and host settings are valid for this proxy type
 *
 * @returns {String|Boolean} An error type if a validation error occurred, or "false" if there was
 *	no error.
 */
PME.Proxy.prototype.validate = function() {
	if(this.scheme.length < 8 || (this.scheme.substr(0, 7) != "http://" && this.scheme.substr(0, 8) != "https://")) {
		return ["scheme.noHTTP"];
	}
	
	if(!this.multiHost && (!this.hosts.length || !this.hosts[0])) {
		return ["host.invalid"];
	} else if(this.multiHost && !Zotero_Proxy_schemeParameterRegexps["%h"].test(this.scheme)) {
		return ["scheme.noHost"];
	}
	
	if(!Zotero_Proxy_schemeParameterRegexps["%p"].test(this.scheme) && 
			(!Zotero_Proxy_schemeParameterRegexps["%d"].test(this.scheme) ||
			!Zotero_Proxy_schemeParameterRegexps["%f"].test(this.scheme))) {
		return ["scheme.noPath"];
	}
	
	if(this.scheme.substr(0, 10) == "http://%h/" || this.scheme.substr(0, 11) == "https://%h/") {
		return ["scheme.invalid"];
	}
	
	for each(var host in this.hosts) {
		var oldHost = PME.Proxies.hosts[host];
		if(oldHost && oldHost.proxyID && oldHost != this) {
			return ["host.proxyExists", host];
		}
	}
	
	return false;
}

/**
 * Saves any changes to this proxy
 *
 * @param {Boolean} transparent True if proxy should be saved as a persisting, transparent proxy
 */
PME.Proxy.prototype.save = function(transparent) {
	// ensure this proxy is valid
	var hasErrors = this.validate();
	if(hasErrors) throw "Proxy: could not be saved because it is invalid: error "+hasErrors[0];
	
	// we never save any changes to non-persisting proxies, so this works
	var newProxy = !this.proxyID;
	
	this.autoAssociate = this.multiHost && this.autoAssociate;
	this.compileRegexp();
	
	if(transparent) {
		try {
			PME.DB.beginTransaction();
			
			if(this.proxyID) {
				PME.DB.query("UPDATE proxies SET multiHost = ?, autoAssociate = ?, scheme = ? WHERE proxyID = ?",
					[this.multiHost ? 1 : 0, this.autoAssociate ? 1 : 0, this.scheme, this.proxyID]);
				PME.DB.query("DELETE FROM proxyHosts WHERE proxyID = ?", [this.proxyID]);
			} else {
				this.proxyID = PME.DB.query("INSERT INTO proxies (multiHost, autoAssociate, scheme) VALUES (?, ?, ?)",
					[this.multiHost ? 1 : 0, this.autoAssociate ? 1 : 0, this.scheme]);
			}
			
			this.hosts = this.hosts.sort();
			var host;
			for(var i in this.hosts) {
				host = this.hosts[i] = this.hosts[i].toLowerCase();
				PME.DB.query("INSERT INTO proxyHosts (proxyID, hostname) VALUES (?, ?)",
					[this.proxyID, host]);
			}
			
			PME.DB.commitTransaction();
		} catch(e) {
			PME.DB.rollbackTransaction();
			throw(e);
		}
	}
	
	if(newProxy) {
		PME.Proxies.save(this);
	} else {
		PME.Proxies.refreshHostMap(this);
		if(!transparent) throw "Proxy: cannot save transparent proxy without transparent param";
	}
}

/**
 * Reverts to the previously saved version of this proxy
 */
PME.Proxy.prototype.revert = function() {
	if(!this.proxyID) throw "Cannot revert an unsaved proxy";
	this._loadFromRow(PME.DB.rowQuery("SELECT * FROM proxies WHERE proxyID = ?", [this.proxyID]));
}

/**
 * Deletes this proxy
 */
PME.Proxy.prototype.erase = function() {
	PME.Proxies.remove(this);
	
	if(this.proxyID) {
		try {
			PME.DB.beginTransaction();
			PME.DB.query("DELETE FROM proxyHosts WHERE proxyID = ?", [this.proxyID]);
			PME.DB.query("DELETE FROM proxies WHERE proxyID = ?", [this.proxyID]);
			PME.DB.commitTransaction();
		} catch(e) {
			PME.DB.rollbackTransaction();
			throw(e);
		}
	}
}

/**
 * Converts a proxied URL to an unproxied URL using this proxy
 *
 * @param m {Array} The match from running this proxy's regexp against a URL spec
 * @type String
 */
PME.Proxy.prototype.toProper = function(m) {
	if(this.multiHost) {
		var properURL = "http://"+m[this.parameters.indexOf("%h")+1]+"/";
	} else {
		var properURL = "http://"+this.hosts[0]+"/";
	}
	
	if(this.indices["%p"]) {
		properURL += m[this.parameters.indexOf("%p")+1];
	} else {
		var dir = m[this.parameters.indexOf("%d")+1];
		var file = m[this.parameters.indexOf("%f")+1];
		if(dir !== "") properURL += dir+"/";
		properURL += file;
	}
	
	return properURL;
}

/**
 * Converts an unproxied URL to a proxied URL using this proxy
 *
 * @param {nsIURI} uri The nsIURI corresponding to the unproxied URL
 * @type String
 */
PME.Proxy.prototype.toProxy = function(uri) {
	var proxyURL = this.scheme;
	
	for(var i=this.parameters.length-1; i>=0; i--) {
		var param = this.parameters[i];
		var value = "";
		if(param == "%h") {
			value = uri.hostPort;
		} else if(param == "%p") {
			value = uri.path.substr(1);
		} else if(param == "%d") {
			value = uri.path.substr(0, uri.path.lastIndexOf("/"));
		} else if(param == "%f") {
			value = uri.path.substr(uri.path.lastIndexOf("/")+1)
		}
		
		proxyURL = proxyURL.substr(0, this.indices[param])+value+proxyURL.substr(this.indices[param]+2);
	}
	
	return proxyURL;
}

/**
 * Loads a proxy object from a DB row
 * @private
 */
PME.Proxy.prototype._loadFromRow = function(row) {
	this.proxyID = row.proxyID;
	this.multiHost = !!row.multiHost;
	this.autoAssociate = !!row.autoAssociate;
	this.scheme = row.scheme;
	this.hosts = PME.DB.columnQuery("SELECT hostname FROM proxyHosts WHERE proxyID = ? ORDER BY hostname", row.proxyID);
	this.compileRegexp();
}

/**
 * Detectors for various proxy systems
 * @namespace
 */
PME.Proxies.Detectors = new Object();

/**
 * Detector for OCLC EZProxy
 * @param {nsIChannel} channel
 * @type Boolean|PME.Proxy
 */
PME.Proxies.Detectors.EZProxy = function(channel) {
	// Try to catch links from one proxy-by-port site to another
	if([80, 443, -1].indexOf(channel.URI.port) == -1) {
		// Two options here: we could have a redirect from an EZProxy site to another, or a link
		// If it's a redirect, we'll have to catch the Location: header
		var toProxy = false;
		var fromProxy = false;
		if([301, 302, 303].indexOf(channel.responseStatus) !== -1) {
			try {
				toProxy = Services.io.newURI(channel.getResponseHeader("Location"), null, null);
				fromProxy = channel.URI;
			} catch(e) {}
		} else {
			toProxy = channel.URI;
			fromProxy = channel.referrer;
		}
		
		if(fromProxy && toProxy && fromProxy.host == toProxy.host && fromProxy.port != toProxy.port
				&& [80, 443, -1].indexOf(toProxy.port) == -1) {
			var proxy;
			for each(proxy in PME.Proxies.proxies) {
				if(proxy.regexp) {
					var m = proxy.regexp.exec(fromProxy.spec);
					if(m) break;
				}
			}
			if(m) {
				// Make sure caught proxy is not multi-host and that we don't have this new proxy already
				if(proxy.multiHost || PME.Proxies.proxyToProper(toProxy.spec, true)) return false;
				
				// Create a new nsIObserver and nsIChannel to figure out real URL (by failing to 
				// send cookies, so we get back to the login page)
				var newChannel = Services.io.newChannelFromURI(toProxy);
				newChannel.originalURI = channel.originalURI ? channel.originalURI : channel.URI;
				newChannel.QueryInterface(Components.interfaces.nsIRequest).loadFlags = newChannel.loadFlags;
				PME.debug("Proxies: Identified putative port-by-port EZProxy link from "+fromProxy.hostPort+" to "+toProxy.hostPort);
				
				new PME.Proxies.Detectors.EZProxy.Observer(newChannel);
				newChannel.asyncOpen(new PME.Proxies.Detectors.EZProxy.DummyStreamListener(), null);
				return false;
			}
		}
	}
	
	// Now try to catch redirects
	if(channel.responseStatus != 302) return false;
	try {
		if(channel.getResponseHeader("Server") != "EZproxy") return false;
		var proxiedURI = Services.io.newURI(channel.getResponseHeader("Location"), null, null);
	} catch(e) {
		return false;
	}
	return PME.Proxies.Detectors.EZProxy.learn(channel.URI, proxiedURI);
}

/**
 * Learn about a mapping from an EZProxy to a normal proxy
 * @param {nsIURI} loginURI The URL of the login page
 * @param {nsIURI} proxiedURI The URI of the page
 * @return {PME.Proxy | false}
 */
PME.Proxies.Detectors.EZProxy.learn = function(loginURI, proxiedURI) {
	// look for query
	var m =  /\?(?:.+&)?(url|qurl)=([^&]+)/i.exec(loginURI.path);
	if(!m) return false;
	
	// Ignore if we already know about it
	if(PME.Proxies.proxyToProper(proxiedURI.spec, true)) return false;
	
	// Found URL
	var properURL = (m[1].toLowerCase() == "qurl" ? unescape(m[2]) : m[2]);
	var properURI = Services.io.newURI(properURL, null, null);
	
	var proxy = false;
	if(loginURI.host == proxiedURI.host && [loginURI.port, 80, 443, -1].indexOf(proxiedURI.port) == -1) {
		// Proxy by port
		proxy = new PME.Proxy();
		proxy.multiHost = false;
		proxy.scheme = proxiedURI.scheme+"://"+proxiedURI.hostPort+"/%p";
		proxy.hosts = [properURI.hostPort];
	} else if(proxiedURI.host != loginURI.host && proxiedURI.hostPort.indexOf(properURI.host) != -1) {
		// Proxy by host
		proxy = new PME.Proxy();
		proxy.multiHost = proxy.autoAssociate = true;
		proxy.scheme = proxiedURI.scheme+"://"+proxiedURI.hostPort.replace(properURI.host, "%h")+"/%p";
		proxy.hosts = [properURI.hostPort];
	}
	return proxy;
}

/**
 * @class Do-nothing stream listener
 * @private
 */
PME.Proxies.Detectors.EZProxy.DummyStreamListener = function() {}
PME.Proxies.Detectors.EZProxy.DummyStreamListener.prototype.onDataAvailable = function(request, 
                                                             context, inputStream, offset, count) {}
PME.Proxies.Detectors.EZProxy.DummyStreamListener.prototype.onStartRequest = function(request, context) {}
PME.Proxies.Detectors.EZProxy.DummyStreamListener.prototype.onStopRequest = function(request, context, status) {}

/**
 * @class Observer to clear cookies on an HTTP request, then remove itself
 * @private
 */
PME.Proxies.Detectors.EZProxy.Observer = function(newChannel) {
	this.channel = newChannel;
	Services.obs.addObserver(this, "http-on-modify-request", false);
	Services.obs.addObserver(this, "http-on-examine-response", false);
}
PME.Proxies.Detectors.EZProxy.Observer.prototype.observe = function(aSubject, aTopic, aData) {
	if (aSubject == this.channel) {
		if(aTopic === "http-on-modify-request") {
			try {
				aSubject.QueryInterface(Components.interfaces.nsIHttpChannel).setRequestHeader("Cookie", "", false);
			} catch(e) {
				PME.logError(e);
			} finally {
				Services.obs.removeObserver(this, "http-on-modify-request");
			}
		} else if(aTopic === "http-on-examine-response") {
			try {
				// Make sure this is a redirect involving an EZProxy
				if(aSubject.responseStatus !== 302) return;
				try {
					if(aSubject.getResponseHeader("Server") !== "EZproxy") return;
					var loginURL = aSubject.getResponseHeader("Location");
				} catch(e) {
					return;
				}

				var proxy = PME.Proxies.Detectors.EZProxy.learn(Services.io.newURI(loginURL, null, null), aSubject.URI);
				if(proxy) {
					PME.debug("Proxies: Proxy-by-port EZProxy "+aSubject.URI.hostPort+" corresponds to "+proxy.hosts[0]);
					proxy.save();
				}
			} catch(e) {
				PME.logError(e);
			} finally {
				Services.obs.removeObserver(this, "http-on-examine-response");
				aSubject.cancel(0x80004004 /*NS_ERROR_ABORT*/);
			}
		}
	}
}
PME.Proxies.Detectors.EZProxy.Observer.prototype.QueryInterface = function(aIID) {
	if (aIID.equals(Components.interfaces.nsISupports) ||
		aIID.equals(Components.interfaces.nsIObserver)) return this;
	throw Components.results.NS_NOINTERFACE;
}

/**
 * Detector for Juniper Networks WebVPN
 * @param {nsIChannel} channel
 * @type Boolean|PME.Proxy
 */
PME.Proxies.Detectors.Juniper = function(channel) {
	const juniperRe = /^(https?:\/\/[^\/:]+(?:\:[0-9]+)?)\/(.*),DanaInfo=([^+,]*)([^+]*)(?:\+(.*))?$/;
	try {
		var url = channel.URI.spec;
		var m = juniperRe.exec(url);
	} catch(e) {
		return false;
	}
	if(!m) return false;
	
	var proxy = new PME.Proxy();
	proxy.multiHost = true;
	proxy.autoAssociate = false;
	proxy.scheme = m[1]+"/%d"+",DanaInfo=%h%a+%f";
	proxy.hosts = [m[3]];
	return proxy;
}

PME.Proxies.DNS = new function() {
	var _callbacks = [];
	
	this.getIPs = function() {
		var dns = Components.classes["@mozilla.org/network/dns-service;1"]
		                    .getService(Components.interfaces.nsIDNSService);
		myHostName = dns.myHostName;
		try {
			var record = dns.resolve(myHostName, null);
		} catch(e) {
			return [];
		}
		
		// get IPs
		var ips = [];
		while(record.hasMore()) {
			ips.push(record.getNextAddrAsString());
		}
		
		return ips;
	}
	
	this.reverseLookup = function(ip) {
		PME.debug("Proxies: Performing reverse lookup for IP "+ip);
		
		// build DNS query
		var bytes = PME.randomString(2)+"\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00";
		
		var ipParts = ip.split(".");
		ipParts.reverse();
		for each(var ipPart in ipParts) {
			bytes += String.fromCharCode(ipPart.length);
			bytes += ipPart;
		}
		for each(var subdomain in ["in-addr", "arpa"]) {
			bytes += String.fromCharCode(subdomain.length);
			bytes += subdomain;
		}
		bytes += "\x00\x00\x0c\x00\x01";
		
		var sts = Components.classes["@mozilla.org/network/socket-transport-service;1"]
							.getService(Components.interfaces.nsISocketTransportService);
		var transport = sts.createTransport(["udp"], 1, "8.8.8.8", 53, null);
		var rawinStream = transport.openInputStream(Components.interfaces.nsITransport.OPEN_BLOCKING, null, null);
		var rawoutStream = transport.openOutputStream(Components.interfaces.nsITransport.OPEN_BLOCKING, null, null);
		
		var outStream = Components.classes["@mozilla.org/binaryoutputstream;1"]
								  .createInstance(Components.interfaces.nsIBinaryOutputStream);
		outStream.setOutputStream(rawoutStream);
		outStream.writeBytes(bytes, bytes.length);
		outStream.close();
		
		PME.debug("Proxies: Sent reverse lookup request");
		
		var inStream = Components.classes["@mozilla.org/binaryinputstream;1"]
								 .createInstance(Components.interfaces.nsIBinaryInputStream);
		var sinStream = Components.classes["@mozilla.org/scriptableinputstream;1"]
								 .createInstance(Components.interfaces.nsIScriptableInputStream);
		inStream.setInputStream(rawinStream);
		sinStream.init(rawinStream);
		
		var stuff = inStream.read32();
		var qdCount = inStream.read16();
		var anCount = inStream.read16();
		var nsCount = inStream.read16();
		var arCount = inStream.read16();
		
		// read queries back out
		for(var i=0; i<qdCount; i++) {
			var len = inStream.read8();
			while(len != 0) {
				sinStream.read(len);
				len = inStream.read8();
			}
			inStream.read16();	// QTYPE
			inStream.read16();	// QCLASS
		}
		
		// get reverse lookup domains
		var domain = [];
		if(anCount == 1) {
			inStream.read16();	// HOST
			inStream.read16();	// TYPE
			inStream.read16();	// CLASS
			inStream.read32();	// TTL
			var rdLength = inStream.read16();		// RDLENGTH
			var bc = 0;
			domain = [];
			while(bc < rdLength) {
				bc += 1;
				if(bc > rdLength) break;
				var len = inStream.read8();
				bc += len;
				if(bc > rdLength) break;
				domain.push(sinStream.read(len));
			}
			domain.pop();
		}
		
		domain = domain.join(".").toLowerCase();
		PME.debug("Proxies: "+ip+" PTR "+domain);
		
		inStream.close();
		return domain;
	}
};