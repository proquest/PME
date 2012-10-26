(function() {
"use strict";
// PME.js

var urlMatchers = {
	"^https?://(www|search)\\.ft\\.com": "Financial Times",
	"^http://(online|blogs)?\\.wsj\\.com/": "wsj"
};

var extractorsBaseURL = 'http://' + PME_SRV + "/extractors/";

var pageURL, pageDoc,
	pmeCallback,
	transScript;

function log() {
	var stuff = Array.prototype.slice.call(arguments, 0);
	stuff.unshift("PME");
	if(window.console && console.info)
		console.info.apply(console, stuff);
}

// ------------------------------------------------------------------------
//                                     _   _ _ 
//   __ _ _ __ _ __ __ _ _   _   _   _| |_(_) |
//  / _` | '__| '__/ _` | | | | | | | | __| | |
// | (_| | |  | | | (_| | |_| | | |_| | |_| | |
//  \__,_|_|  |_|  \__,_|\__, |  \__,_|\__|_|_|
//                       |___/                 
// ------------------------------------------------------------------------
function mutate(vals, pred) {
	var arr = vals instanceof Array,
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
	var arr = vals instanceof Array,
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
	if (! (vals instanceof Array))
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
						mutate(item, function(subItem) {
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

				item = mutate(spec, function(val, key) {
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

		var data = { items: [] };

		log("FW.doWeb using scraper", scraper);

		scraper.run(doc, url,
			function itemDone(item) {
				data.items.push(item);
			},
			function allDone() {
				// <-- send off data to somewhere
				log("READY.", data);
				completed(data);
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
	var scr = document.createElement("script");
	scr.src = extractorsBaseURL + name + ".js";
	transScript = scr;
	scr.onerror = function() {
		log("extractor FAILED: ", name);
		completed(null);
	}
	document.getElementsByTagName("head")[0].appendChild(scr);
}

function extractorLoaded(spec, api) {
	log("extractorLoaded called with spec", spec);
	if (api.detectWeb(pageDoc, pageURL))
		api.doWeb(pageDoc, pageURL);
	else
		completed(null);
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
	delete window.PME;
	delete window.FW;

	if (transScript)
		transScript.parentNode.removeChild(transScript);
	if (window.PME_SCR)
		PME_SCR.parentNode.removeChild(PME_SCR);
	delete window.PME_SCR;
	delete window.PME_SRV;
}

function normalizeData(data) {
	return data;
}

function completed(data) {
	log("completed, pre-callback and vanish");
	if (data)
		data = normalizeData(data);
	pmeCallback && pmeCallback(data);
	setTimeout(vanish, 1);
}

function getPageMetaData(callback) {
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

// -- expose extractor APIs
window.PME = {
	loadExtractor: loadExtractor,
	extractorLoaded: extractorLoaded,
	getPageMetaData: getPageMetaData
};
}());
