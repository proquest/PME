(function() {
"use strict";
// PME.js

var urlMatchers = {
	"^https?://(www|search)\\.ft\\.com": "Financial Times",
	"^http://(online|blogs)?\\.wsj\\.com/": "wsj",
	"https?://[^/]*.nih.gov/": "PubMed Central",
	"^https?://[^/]*science-?direct\\.com[^/]*/science(\\/article)?(\\?(?:.+\\&|)ob=(?:ArticleURL|ArticleListURL|PublicationURL))?": "ScienceDirect",
	"^https?://search\\.proquest\\.com[^/]*(/pqrl|/pqdt)?/(docview|publication|publicationissue|results)": "ProQuest",
	"^https?://scholar\\.google\\.(?:com|cat|(?:com?\\.)?[a-z]{2})/scholar(?:_case)?\\?": "Google Scholar",
	"^http://www\\.scopus\\.com[^/]*": "Scopus",
	"(gw2|asinghal|sp)[^\\/]+/ovidweb\\.cgi": "Ovid"
};

var extractorsBaseURL = 'http://' + PME_SRV + "/extractors/";

var pageURL, pageDoc,
	pmeCallback,
	transScript;

function log() {
	var stuff = Array.prototype.slice.call(arguments, 0);
	stuff.unshift("PME");
	if(window.console && console.info) {
		if (console.info.apply)
			console.info.apply(console, stuff);
		else // IE...
			console.info(stuff.join(", "));
	}
}

// ------------------------------------------------------------------------
//                                     _   _ _ 
//   __ _ _ __ _ __ __ _ _   _   _   _| |_(_) |
//  / _` | '__| '__/ _` | | | | | | | | __| | |
// | (_| | |  | | | (_| | |_| | | |_| | |_| | |
//  \__,_|_|  |_|  \__,_|\__, |  \__,_|\__|_|_|
//                       |___/                 
// ------------------------------------------------------------------------
function each(vals, handler) {
	var arr = "length" in vals,
		out = arr ? [] : {};

	if (arr) {
		for (var ix = 0; ix < vals.length; ++ix) {
			if (! ix in vals)
				continue;
			handler(vals[ix], ix, vals);
		}
	}
	else {
		for (var key in vals)
			pred(vals[key], key, vals);
	}

	return out;
}

function map(vals, pred) {
	var arr = "length" in vals,
		out = arr ? [] : {};

	if (arr) {
		for (var ix = 0; ix < vals.length; ++ix) {
			if (! ix in vals)
				continue;
			var val = vals[ix],
				subst = pred(val, ix, vals);
			if (undefined !== subst)
				out.push(subst);
		}
	}
	else {
		for (var key in vals) {
			var val = vals[key],
				subst = pred(val, key, vals);
			if (undefined !== subst)
				out[key] = subst;
		}
	}

	return out;
}

function filter(vals, pred) {
	var arr = "length" in vals,
		out = arr ? [] : {};

	if (arr) {
		for (var ix = 0; ix < vals.length; ++ix) {
			if (! ix in vals)
				continue;
			var val = vals[ix];
			if (true === pred(val, ix, vals))
				out.push(val);
		}
	}
	else {
		for (var key in vals) {
			var val = vals[key];
			if (true === pred(val, key, vals))
				out[key] = val;
		}
	}
	return out;
}

function flatten(vals) {
	if (! ("length" in vals))
		return vals;

	var out = [];
	for (var ix = 0; ix < vals.length; ++ix) {
		var v = vals[ix];
		if(v instanceof Array)
			out = out.concat(flatten(v));
		else
			out.push(v);
	}
	return out;
}

function purge(vals) {
	return filter(vals, function(val, key) {
		return (val !== null) && (val !== undefined);
	});
}

function makeArray(x) {
	if (x == null)
		return [];

	return ("length" in x) ? x : [x];
}


// ------------------------------------------------------------------------
//  ____  __  __ _____                      
// |  _ \|  \/  | ____|   ___ ___  _ __ ___ 
// | |_) | |\/| |  _|    / __/ _ \| '__/ _ \
// |  __/| |  | | |___  | (_| (_) | | |  __/
// |_|   |_|  |_|_____|  \___\___/|_|  \___|
//                                          
// ------------------------------------------------------------------------
window.PME = {};
PME.items = [];

PME.wait = function() {};
PME.done = function() {
	log("done(), item count: " + PME.items.length);
	completed(PME.items.length ? { items: PME.items } : null);
};

PME.debug = function(str) {
	log("[ext]", str);
};

PME.selectItems = function(items, callback) {
	setTimeout(function() {			// use async return in case code relies on it
		var out = {};
		for (var k in items) {
			out[k] = items[k];		// always just pick the first one for now
			break;
		}

		callback(out);
	}, 1);
};


PME.Item = function(type) {
	log("creating item of type " + type);
	this.itemType = type;
	this.creators = [];

	this.complete = function() {
		log("item completed", this);
		PME.items.push(this);
		delete this.complete;
	};
};



// ------------------------------------------------------------------------
//  _   _ _   _ _ 
// | | | | |_(_) |
// | | | | __| | |
// | |_| | |_| | |
//  \___/ \__|_|_|
//                
// ------------------------------------------------------------------------
PME.Util = {};

PME.Util.trim = function(str) {
	return str.replace(/^\s+|\s+$/g, '')
};

PME.Util.trimInternal = function(str) {
	return str.replace(/\s+/g, ' ');
};

PME.Util.xpath = function(nodes, selector, namespaces) {
	var out = [];

	each(makeArray(nodes), function(node) {
		var doc = node.ownerDocument ? node.ownerDocument : (node.documentElement ? node : null);

		function resolver(prefix) { return namespaces && namespaces[prefix]; }

		if ("evaluate" in doc) {
			var xp = doc.evaluate(selector, node, resolver, XPathResult.ANY_TYPE, null),
				el;

			while (el = xp.iterateNext())
				out.push(el);
		}
		else if ("selectNodes" in node) {
			if (namespaces) {
				var selNS = map(namespaces, function(url, prefix) {
					return 'xmlns:' + prefix + '="' + url + '"';
				});
				doc.setProperty("SelectionNamespaces", selNS.join(" "));
			}

			var sn = node.selectNodes(selector);
			for (var i=0; i < sn.length; ++i)
				out.push(sn[i]);
		}
	});
	
	return out;
};

PME.Util.xpathText = function(nodes, selector, namespaces, delim) {
	nodes = PME.Util.xpath(nodes, selector, namespaces);
	if (! nodes.length)
		return null;
	
	var text = map(nodes, function(node) {
		return node.textContent || node.innerText || node.text || node.nodeValue;
	});

	return text.join(delim !== undefined ? delim : ", ");
};

PME.Util.retrieveDocument = function() {
	
};



// ------------------------------------------------------------------------
//  _   _ _____ _____ ____  
// | | | |_   _|_   _|  _ \ 
// | |_| | | |   | | | |_) |
// |  _  | | |   | | |  __/ 
// |_| |_| |_|   |_| |_|    
//                          
// ------------------------------------------------------------------------
PME.Util.HTTP = {};

function hostNameForURL(url) {
	return (/^(https?:\/\/[^\/]+)\//.exec(pageURL)[1] || "").toLowerCase();
}

function httpRequest(reqURL, callback) {
	var pageHost = hostNameForURL(pageURL),
		reqHost = hostNameForURL(reqURL);

	if (! reqHost.length)
		reqHost = pageHost;

	if (window.XDomainRequest && pageHost != reqHost)
		;
}

PME.Util.HTTP.doGet = function(url, callback, charset) {
	log("HTTP request: ", url);
	var xhr = new XMLHttpRequest();

	xhr.addEventListener("load", function() {
		log("HTTP response: ", xhr, xhr.status)
		callback(xhr.responseText);
	}, false);
	xhr.addEventListener("error", function() {
		log("HTTP error: ", xhr);
		callback("");
	}, false);
	xhr.addEventListener("abort", function() {
		log("HTTP canceled: ", xhr);
		callback("");
	}, false);

	try {
		xhr.open("GET", url, true);
		xhr.send();
	}
	catch(e) {
		log("error during XHR operation", e);
		setTimeout(function() { callback(""); }, 1);
	}
};

PME.Util.HTTP.doPost = function(url, data, callback, headers, charset) {
	setTimeout(function() {
		callback("");	// simulate empty response
	}, 1);
};



// ------------------------------------------------------------------------
//   __ _ _ _                
//  / _(_) | |_ ___ _ __ ___ 
// | |_| | | __/ _ \ '__/ __|
// |  _| | | ||  __/ |  \__ \
// |_| |_|_|\__\___|_|  |___/
//                           
// ------------------------------------------------------------------------
function ValueFilter() {
	var filters = [], st;

	function addFilter(fn) {
		filters.push(fn);
		return st;
	}

	function _applyFilters(vals, context) {
		for (var fi=0; fi<filters.length; ++fi) {
			vals = purge(flatten(vals));

			for (var vi=0; vi<vals.length; ++vi) {
				try {
					vals[vi] = filters[fi](vals[vi], context);
				}
				catch(ex) {	}
			}

			vals = purge(vals);
		}

		return flatten(vals);
	}

	st = {
		addFilter: addFilter,
		_applyFilters: _applyFilters,

		trim: function() { return addFilter(
			function(str) {
				return str.replace(/^\s+|\s+$/g, '');
			}
		);},
		trimInternal: function() { return addFilter(
			function(str) {
				return str.replace(/\s+/g, ' ');
			}
		);},
		replace: function(find, subst) { return addFilter(
			function(str) {
				return str.replace(find, subst);
			}
		);},
		unescape: function() { return addFilter(
			function(str) {
				return unescape(str);
			}
		);},
		unescapeHTML: function() { return addFilter(
			function(str) {
				return str; // TBI
			}
		);},
		cleanAuthor: function(type, isReversed) { return addFilter(
			function(str) {
				return str; // TBI
			}
		);},
		match: function(against, matchIndex) { return addFilter(
			function(str) {
				var m = str.match(against);
				if (m)
					m = m[matchIndex || 0];
				return m;
			}
		);},
		prepend: function(prefix) { return addFilter(
			function(str) {
				return prefix + str;
			}
		);},
		append: function(suffix) { return addFilter(
			function(str) {
				return str + suffix;
			}
		);},
		key: function(keyName) { return addFilter(
			function(obj) {
				return obj[keyName];
			}
		);},
		split: function(sep) { return addFilter(
			function(str) {
				return str.split(sep);
			}
		);},
		capitalizeTitle: function() { return addFilter(
			function(str) {
				return str; // TBI
			}
		);}
	};
	return st;
}

function PageText() {
	var pt = ValueFilter();

	pt.evaluate = function(doc, url) {
		var vals = url._applyFilters([doc.documentElement.innerHTML], doc);
		return vals.length ? vals : false;
	};

	return pt;
}

function Url() {
	var lk = ValueFilter();

	lk.evaluate = function(doc, url) {
		var vals = lk._applyFilters([url], doc);
		return vals.length ? vals : false;
	}

	return lk;
}

function Xpath(selector) {
	var xp = ValueFilter();
	xp.text = function() { return xp.addFilter(
		function(obj) {
			return obj.textContent || obj;
		}
	);};

	xp.evaluate = function(doc, url) {
		var res  = doc.evaluate(selector, doc, null, XPathResult.ANY_TYPE, null),
			type = res.resultType,
			vals = [],
			v;

		if (type == XPathResult.STRING_TYPE)
			vals.push(res.stringValue);
		else {
			if (type == XPathResult.ORDERED_NODE_ITERATOR_TYPE || type == XPathResult.UNORDERED_NODE_ITERATOR_TYPE) {
				while(v = res.iterateNext())
					vals.push(v);
			}
		}

		vals = xp._applyFilters(vals, doc);
		return vals.length ? vals : false;
	};

	return xp;
}


// ------------------------------------------------------------------------
//                                         
//  ___  ___ _ __ __ _ _ __   ___ _ __ ___ 
// / __|/ __| '__/ _` | '_ \ / _ \ '__/ __|
// \__ \ (__| | | (_| | |_) |  __/ |  \__ \
// |___/\___|_|  \__,_| .__/ \___|_|  |___/
//                    |_|                  
// ------------------------------------------------------------------------
window.FW = (function(){
	var scrapers = [];

	function ScraperBase(spec) {
		function evalItem(item, doc, url) {
			if(typeof item == "object") {
				if(item instanceof Array) {
					return flatten(
						map(item, function(subItem) {
							return evalItem(subItem, doc, url);
						})
					);
				}
				return item.evaluate(doc, url);
			}

			if (typeof item == "function")
				return item(doc, url);

			return item;
		}

		return { spec: spec, evalItem: evalItem };
	}

	function Scraper(spec) {
		var scrp = ScraperBase(spec);

		scrp.run = function(doc, url, itemCallback, completionCallback) {
			var skipList  = { detect:1, itemType:1, attachments:1 },
				multiList = { creators: 1, tags: 1 },

				item = map(spec, function(val, key) {
					if (key in skipList)
						return undefined;

					var procVal = scrp.evalItem(val, doc, url);
					// log("Scraper got kv", key, procVal);

					if (key in multiList)
						return flatten([procVal]);

					return (procVal instanceof Array) ? procVal[0] : procVal;
				});

			item.itemType = spec.itemType;
			itemCallback(item);
			completionCallback();
		};

		scrapers.push(scrp);
		return scrp;
	}

	function MultiScraper(spec) {
		var scrp = ScraperBase(spec);

		scrp.run = function(doc, url, itemCallback, completionCallback) {
			// TBI
			completionCallback();
		};

		scrapers.push(scrp);
		return scrp;
	}

	function detectWeb(doc, url) {
		var eligible = filter(scrapers, function(sc) {
			return !!sc.evalItem(sc.spec.detect, doc, url);
		});

		log("FW.detectWeb eligible scrapers", eligible);

		return eligible.length > 0;
	}

	function doWeb(doc, url) {
		log("FW.doWeb called");

		var scraper = filter(scrapers, function(sc) {
			return !!sc.evalItem(sc.spec.detect, doc, url);
		})[0];

		log("FW.doWeb using scraper", scraper);

		scraper.run(doc, url,
			function itemDone(item) {
				PME.items.push(item);
			},
			function allDone() {
				PME.done();
			}
		);
	}


	return {
		Scraper: Scraper,
		MultiScraper: MultiScraper,
		PageText: PageText,
		Xpath: Xpath,
		Url: Url,
		
		detectWeb: detectWeb,
		doWeb: doWeb
	};
}());



// ------------------------------------------------------------------------
//            _                  _                 
//   _____  _| |_ _ __ __ _  ___| |_ ___  _ __ ___ 
//  / _ \ \/ / __| '__/ _` |/ __| __/ _ \| '__/ __|
// |  __/>  <| |_| | | (_| | (__| || (_) | |  \__ \
//  \___/_/\_\\__|_|  \__,_|\___|\__\___/|_|  |___/
//                                                 
// ------------------------------------------------------------------------
function loadExtractor(name) {
	log("loading extractor " + name);
	var scr = document.createElement("script");
	scr.src = extractorsBaseURL + name + ".js";
	transScript = scr;
	scr.onerror = function() {
		log("ERROR: extractor failed to load: ", name);
		completed(null);
	}
	document.getElementsByTagName("head")[0].appendChild(scr);
}

function extractorLoaded(spec, api) {
	log("extractor loaded ", spec.label, spec);
	try {
		var detect = api.detectWeb(pageDoc, pageURL)
		log("detectWeb returned ", detect);
		if (detect)
			api.doWeb(pageDoc, pageURL);
		else
			completed(null);
	}
	catch(e) {
		log("ERROR during extraction", e, e.message);
		completed(null);
	}
}

function exporterNameForURL(url) {
	var name = null;

	for (var re in urlMatchers) {
		if (new RegExp(re).test(url)) {
			name = urlMatchers[re];
			break;
		}
	}

	return name;
}


// ------------------------------------------------------------------------
//                   _   _                
//  _ __ _   _ _ __ | |_(_)_ __ ___   ___ 
// | '__| | | | '_ \| __| | '_ ` _ \ / _ \
// | |  | |_| | | | | |_| | | | | | |  __/
// |_|   \__,_|_| |_|\__|_|_| |_| |_|\___|
//                                        
// ------------------------------------------------------------------------
function vanish() {
return;
	window.PME = undefined;
	window.FW = undefined;

	try {
		if (transScript)
			transScript.parentNode.removeChild(transScript);
		if (window.PME_SCR)
			PME_SCR.parentNode.removeChild(PME_SCR);
	} catch(e) {}

	window.PME_SCR = undefined;
	window.PME_SRV = undefined;
}

function normalizeData(data) {
	return data;
}

function completed(data) {
	if (data)
		data = normalizeData(data);
	log("completed, data = ", data);

	pmeCallback && pmeCallback(data);
	setTimeout(vanish, 1);
}

function getPageMetaData(callback) {
	log("getPageMetdaData start");
	try {
		// main accesspoint
		pageURL = document.location.href;
		pageDoc = document;
		pmeCallback = callback;

		var expName = exporterNameForURL(pageURL);

		if (! expName)
			completed(null);
		else
			loadExtractor(expName);
	}
	catch(e) {
		log("ERROR during initialisation", e, e.message);
		completed(null);
	}
}

// -- expose extractor APIs
PME.loadExtractor = loadExtractor;
PME.extractorLoaded = extractorLoaded;
PME.getPageMetaData = getPageMetaData;

}());
