(function() {
"use strict";
// PME.js

var urlMatchers = {
	"^https?://(www|search)\\.ft\\.com": "Financial Times",
	"^http://(online|blogs)?\\.wsj\\.com/": "wsj",
	"https?://[^/]*.nih.gov/": "PubMed Central",
	"^https?://[^/]*science-?direct\\.com[^/]*/science(\\/article)?(\\?(?:.+\\&|)ob=(?:ArticleURL|ArticleListURL|PublicationURL))?": "ScienceDirect",
	"^https?://search\\.proquest\\.com.*\\/(docview|pagepdf|results|publicationissue|browseterms|browsetitles|browseresults|myresearch\\/(figtables|documents))": "ProQuest",
	"^https?://scholar\\.google\\.(?:com|cat|(?:com?\\.)?[a-z]{2})/scholar(?:_case)?\\?": "Google Scholar",
	"^http://www\\.scopus\\.com[^/]*": "Scopus",
	"(gw2|asinghal|sp)[^\\/]+/ovidweb\\.cgi": "Ovid",
	"^http://[^/]+/(?:cgi/searchresults|cgi/search|cgi/content/(?:abstract|full|short|summary)|current.dtl$|content/vol[0-9]+/issue[0-9]+/(?:index.dtl)?$)": "HighWire",
	"^[^\\?]+(content/([0-9]+[A-Z\\-]*/[0-9]+|current|firstcite|early)|search\\?submit=|search\\?fulltext=|cgi/collection/.+)": "HighWire 2.0",
	"^https?://onlinelibrary\\.wiley\\.com[^\\/]*/(?:book|doi|advanced/search|search-web/cochrane)": "Wiley Online Library",
	"https?://[^/]*firstsearch\\.oclc\\.org[^/]*/WebZ/": "OCLC WorldCat FirstSearch",
	"^https?://(.+).worldcat\\.org/": "Open WorldCat"
};

var importers = {

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
	var out = {};
	for (var k in items) {
		out[k] = items[k];		// always just pick the first one for now
		break;
	}

	// selectItems can be called async or sync, depending on existence of callback param
	if (callback)
		setTimeout(function() {	callback(out); }, 1);
	else
		return out;
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


PME.loadTranslator = function(type) {
	var handlers = {},
		text = "",
		textIndex = 0,
		api = {};

	function setTranslator(guid) {

	}
	
	function setDocument(doc) {
		
	}

	function setString(newText) {
		text = newText;
		textIndex = 0;
	}

	function setHandler(event, callback) {
		handlers[event] = callback;
	}

	function translate() {
	}

	return {
		setTranslator: setTranslator,
		setDocument: setDocument,
		setString: setString,
		setHandler: setHandler,
		translate: translate
	}
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

PME.Util.capitalizeTitle = function(str) {
	return str; // TBI
};

PME.Util.cleanAuthor = function(str) {
	return str; // TBI
};

/**
 * Cleans any non-word non-parenthesis characters off the ends of a string
 */
PME.Util.superCleanString = function(str) {
	str = str.replace(/^[\x00-\x27\x29-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F\s]+/, "");
	return str.replace(/[\x00-\x28\x2A-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F\s]+$/, "");
}


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


PME.Util.retrieveDocument = function(url) {
	return "";
};


PME.Util.processDocuments = function(urls, processor, callback, exception) {
	log("processDocuments");
	
	if(typeof(urls) == "string") {
		urls = [ urls ];
	}
	
	for(var i=0; i<urls.length; i++) {
		log("url: " + urls[i]);
		processor(document, urls[i]);
	}

	if(callback) callback();	
}

/*
 * Generates an item in the format returned by item.fromArray() given an
 * OpenURL version 1.0 contextObject
 *
 * accepts an item array to fill, or creates and returns a new item array
 */
PME.Util.parseContextObject = function(co, item) {
	if(!item) {
		var item = new Array();
		item.creators = new Array();
	}
	
	var coParts = co.split("&");
	
	// get type
	for(var i=0; i<coParts.length; i++) {
		if(coParts[i].substr(0, 12) == "rft_val_fmt=") {
			var format = decodeURIComponent(coParts[i].substr(12));
			if(format == "info:ofi/fmt:kev:mtx:journal") {
				item.itemType = "journalArticle";
				break;
			} else if(format == "info:ofi/fmt:kev:mtx:book") {
				if(coParts.indexOf("rft.genre=bookitem") !== -1) {
					item.itemType = "bookSection";
				} else if(coParts.indexOf("rft.genre=conference") !== -1 || coParts.indexOf("rft.genre=proceeding") !== -1) {
					item.itemType = "conferencePaper";
				} else if(coParts.indexOf("rft.genre=report") !== -1) {
					item.itemType = "report";
				} else if(coParts.indexOf("rft.genre=document") !== -1) {
					item.itemType = "document";
				} else {
					item.itemType = "book";
				}
				break;
			} else if(format == "info:ofi/fmt:kev:mtx:dissertation") {
				item.itemType = "thesis";
				break;
			} else if(format == "info:ofi/fmt:kev:mtx:patent") {
				item.itemType = "patent";
				break;
			} else if(format == "info:ofi/fmt:kev:mtx:dc") {
				item.itemType = "webpage";
				break;
			}
		}
	}
	if(!item.itemType) {
		return false;
	}
	
	var pagesKey = "";
	
	// keep track of "aucorp," "aufirst," "aulast"
	var complexAu = new Array();
	
	for(var i=0; i<coParts.length; i++) {
		var keyVal = coParts[i].split("=");
		var key = keyVal[0];
		var value = decodeURIComponent(keyVal[1].replace(/\+|%2[bB]/g, " "));
		if(!value) {
			continue;
		}
		
		if(key == "rft_id") {
			var firstEight = value.substr(0, 8).toLowerCase();
			if(firstEight == "info:doi") {
				item.DOI = value.substr(9);
			} else if(firstEight == "urn:isbn") {
				item.ISBN = value.substr(9);
			} else if(value.match(/^https?:\/\//)) {
				item.url = value;
				item.accessDate = "";
			}
		} else if(key == "rft.btitle") {
			if(item.itemType == "book" || item.itemType == "report") {
				item.title = value;
			} else if(item.itemType == "bookSection" || item.itemType == "conferencePaper") {
				item.publicationTitle = value;
			}
		} else if(key == "rft.atitle"
				&& ["journalArticle", "bookSection", "conferencePaper"].indexOf(item.itemType) !== -1) {
			item.title = value;
		} else if(key == "rft.jtitle" && item.itemType == "journalArticle") {
			item.publicationTitle = value;
		} else if(key == "rft.stitle" && item.itemType == "journalArticle") {
			item.journalAbbreviation = value;
		} else if(key == "rft.title") {
			if(["journalArticle", "bookSection", "conferencePaper"].indexOf(item.itemType) !== -1) {
				item.publicationTitle = value;
			} else {
				item.title = value;
			}
		} else if(key == "rft.date") {
			if(item.itemType == "patent") {
				item.issueDate = value;
			} else {
				item.date = value;
			}
		} else if(key == "rft.volume") {
			item.volume = value;
		} else if(key == "rft.issue") {
			item.issue = value;
		} else if(key == "rft.pages") {
			pagesKey = key;
			item.pages = value;
		} else if(key == "rft.spage") {
			if(pagesKey != "rft.pages") {
				// make pages look like start-end
				if(pagesKey == "rft.epage") {
					if(value != item.pages) {
						item.pages = value+"-"+item.pages;
					}
				} else {
					item.pages = value;
				}
				pagesKey = key;
			}
		} else if(key == "rft.epage") {
			if(pagesKey != "rft.pages") {
				// make pages look like start-end
				if(pagesKey == "rft.spage") {
					if(value != item.pages) {
						item.pages = item.pages+"-"+value;
					}
				} else {
					item.pages = value;
				}
				pagesKey = key;
			}
		} else if(key == "rft.issn" || (key == "rft.eissn" && !item.ISSN)) {
			item.ISSN = value;
		} else if(key == "rft.aulast" || key == "rft.invlast") {
			var lastCreator = complexAu[complexAu.length-1];
			if(complexAu.length && !lastCreator.lastName && !lastCreator.institutional) {
				lastCreator.lastName = value;
			} else {
				complexAu.push({lastName:value, creatorType:(key == "rft.aulast" ? "author" : "inventor"), offset:item.creators.length});
			}
		} else if(key == "rft.aufirst" || key == "rft.invfirst") {
			var lastCreator = complexAu[complexAu.length-1];
			if(complexAu.length && !lastCreator.firstName && !lastCreator.institutional) {
				lastCreator.firstName = value;
			} else {
				complexAu.push({firstName:value, creatorType:(key == "rft.aufirst" ? "author" : "inventor"), offset:item.creators.length});
			}
		} else if(key == "rft.au" || key == "rft.creator" || key == "rft.contributor" || key == "rft.inventor") {
			if(key == "rft.contributor") {
				var type = "contributor";
			} else if(key == "rft.inventor") {
				var type = "inventor";
			} else {
				var type = "author";
			}
			
			if(value.indexOf(",") !== -1) {
				item.creators.push(Zotero.Utilities.cleanAuthor(value, type, true));
			} else {
				item.creators.push(Zotero.Utilities.cleanAuthor(value, type, false));
			}
		} else if(key == "rft.aucorp") {
			complexAu.push({lastName:value, isInstitution:true});
		} else if(key == "rft.isbn" && !item.ISBN) {
			item.ISBN = value;
		} else if(key == "rft.pub" || key == "rft.publisher") {
			item.publisher = value;
		} else if(key == "rft.place") {
			item.place = value;
		} else if(key == "rft.tpages") {
			item.numPages = value;
		} else if(key == "rft.edition") {
			item.edition = value;
		} else if(key == "rft.series") {
			item.series = value;
		} else if(item.itemType == "thesis") {
			if(key == "rft.inst") {
				item.publisher = value;
			} else if(key == "rft.degree") {
				item.type = value;
			}
		} else if(item.itemType == "patent") {
			if(key == "rft.assignee") {
				item.assignee = value;
			} else if(key == "rft.number") {
				item.patentNumber = value;
			} else if(key == "rft.appldate") {
				item.date = value;
			}
		} else if(format == "info:ofi/fmt:kev:mtx:dc") {
			if(key == "rft.identifier") {
				if(value.length > 8) {	// we could check length separately for
										// each type, but all of these identifiers
										// must be > 8 characters
					if(value.substr(0, 5) == "ISBN ") {
						item.ISBN = value.substr(5);
					} else if(value.substr(0, 5) == "ISSN ") {
						item.ISSN = value.substr(5);
					} else if(value.substr(0, 8) == "urn:doi:") {
						item.DOI = value.substr(4);
					} else if(value.substr(0, 7) == "http://" || value.substr(0, 8) == "https://") {
						item.url = value;
					}
				}
			} else if(key == "rft.description") {
				item.abstractNote = value;
			} else if(key == "rft.rights") {
				item.rights = value;
			} else if(key == "rft.language") {
			  	item.language = value;
			}  else if(key == "rft.subject") {
				item.tags.push(value);
			} else if(key == "rft.type") {
				if(Zotero.Utilities.itemTypeExists(value)) item.itemType = value;
			} else if(key == "rft.source") {
				item.publicationTitle = value;
			}
		}
	}

	// To maintain author ordering when complex and simple authors are combined,
	// we remember where they were and the correct offsets
	var inserted = 0;
	
	// combine two lists of authors, eliminating duplicates
	for(var i=0; i<complexAu.length; i++) {
		var pushMe = true;
		var offset = complexAu[i].offset;
		delete complexAu[i].offset;
		for(var j=0; j<item.creators.length; j++) {
			// if there's a plain author that is close to this author (the
			// same last name, and the same first name up to a point), keep
			// the plain author, since it might have a middle initial
			if(item.creators[j].lastName == complexAu[i].lastName &&
			   (item.creators[j].firstName == complexAu[i].firstName == "" ||
			   (item.creators[j].firstName.length >= complexAu[i].firstName.length &&
			   item.creators[j].firstName.substr(0, complexAu[i].firstName.length) == complexAu[i].firstName))) {
				pushMe = false;
				break;
			}
		}
		// Splice in the complex creator at the correct location,
		// accounting for previous insertions
		if(pushMe) {
			item.creators.splice(offset + inserted, 0, complexAu[i]);
			inserted++;
		}
	}
	
	return item;
}


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
		reqHost = hostNameForURL(reqURL),
		request = null;

	if (! reqHost.length)
		reqHost = pageHost;

	try {
		if (window.XDomainRequest && pageHost != reqHost)
			request = new XDomainRequest();
		else if (window.XMLHttpRequest)
			request = new XMLHttpRequest();
		else if (window.ActiveXObject)
			request = new ActiveXObject("Microsoft.XMLHTTP");
	} catch(e) {}

	// -- xhr events
	function loadHandler()  { callback("load", request); }
	function errorHandler() { callback("error", request); }
	function abortHandler() { callback("abort", request); }

	if (request) {
		if ("addEventListener" in request) {
			request.addEventListener("load", loadHandler, false);
			request.addEventListener("error", errorHandler, false);
			request.addEventListener("abort", abortHandler, false);
		}
		else {
			request.onload = loadHandler;
			request.onerror = errorHandler;
			request.onabort = abortHandler;
		}
	}

	return request;
}

PME.Util.HTTP.doGet = function(url, callback, charset) {
	log("HTTP GET request: ", url);
	var request = httpRequest(url, function(status) {
		log("HTTP GET status: ", status, request);

		if (status == "load")
			callback(request.responseText);
		else
			callback("");
	});

	try {
		request.open("GET", url, true);
		request.send();
	}
	catch(e) {
		log("HTTP GET could not start", e);
		setTimeout(function() { callback(""); }, 1);
	}
};

PME.Util.HTTP.doPost = function(url, data, callback, headers, charset) {
	log("HTTP POST request: ", url, data);
	var request = httpRequest(url, function(status) {
		log("HTTP POST status: ", status, request);

		if (status == "load")
			callback(request.responseText);
		else
			callback("");
	});

	if (! headers)
		headers = {"Content-Type": "application/x-www-form-urlencoded"};
	else if (! "Content-Type" in headers)
		headers["Content-Type"] = "application/x-www-form-urlencoded";

	try {
		request.open("POST", url, true);
		for (var hdrName in headers) 
			request.setRequestHeader(hdrName, headers[hdrName]);
		request.send(data);
	}
	catch(e) {
		log("HTTP POST could not start", e);
		setTimeout(function() { callback(""); }, 1);
	}
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
				return PME.Util.trim(str);
			}
		);},
		trimInternal: function() { return addFilter(
			function(str) {
				return PME.Util.trimInternal(str);
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
				return PME.Util.capitalizeTitle(str);
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
