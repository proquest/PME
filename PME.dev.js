(function() {
"use strict";
// PME.js

var Registry = (function() {
	var tr = {
		"Financial Times": {
			m: "^https?://(www|search)\\.ft\\.com",
			g: "fc9b7700-b3cc-4150-ba89-c7e4443bd96d"
		},
		"wsj": {
			m: "^http://(online|blogs)?\\.wsj\\.com/",
			g: "53f8d182-4edc-4eab-b5a1-141698a1303b"
		},
		"PubMed Central": {
			m: "https?://[^/]*.nih.gov/",
			g: "27ee5b2c-2a5a-4afc-a0aa-d386642d4eed"
		},
		"ScienceDirect": {
			m: "^https?://[^/]*science-?direct\\.com[^/]*/science(\\/article)?(\\?(?:.+\\&|)ob=(?:ArticleURL|ArticleListURL|PublicationURL))?",
			g: "b6d0a7a-d076-48ae-b2f0-b6de28b194e"
		},
		"ProQuest": {
			m: "^https?://search\\.proquest\\.com.*\\/(docview|pagepdf|results|publicationissue|browseterms|browsetitles|browseresults|myresearch\\/(figtables|documents))",
			g: "fce388a6-a847-4777-87fb-6595e710b7e7"
		},
		"Google Scholar": {
			m: "^https?://scholar\\.google\\.(?:com|cat|(?:com?\\.)?[a-z]{2})/scholar(?:_case)?\\?",
			g: "57a00950-f0d1-4b41-b6ba-44ff0fc30289"
		},
		"Scopus": {
			m: "^http://www\\.scopus\\.com[^/]*",
			g: "a14ac3eb-64a0-4179-970c-92ecc2fec992"
		},
		"Ovid": {
			m: "(gw2|asinghal|sp)[^\\/]+/ovidweb\\.cgi",
			g: "cde4428-5434-437f-9cd9-2281d14dbf9"
		},
		"HighWire": {
			m: "^http://[^/]+/(?:cgi/searchresults|cgi/search|cgi/content/(?:abstract|full|short|summary)|current.dtl$|content/vol[0-9]+/issue[0-9]+/(?:index.dtl)?$)",
			g: "5eacdb93-20b9-4c46-a89b-523f62935ae4"
		},
		"HighWire 2.0": {
			m: "^[^\\?]+(content/([0-9]+[A-Z\\-]*/[0-9]+|current|firstcite|early)|search\\?submit=|search\\?fulltext=|cgi/collection/.+)",
			g: "8c1f42d5-02fa-437b-b2b2-73afc768eb07"
		},
		"Wiley Online Library": {
			m: "^https?://onlinelibrary\\.wiley\\.com[^\\/]*/(?:book|doi|advanced/search|search-web/cochrane)",
			g: "fe728bc9-595a-4f03-98fc-766f1d8d0936"
		},
		"OCLC WorldCat FirstSearch": {
			m: "https?://[^/]*firstsearch\\.oclc\\.org[^/]*/WebZ/",
			g: "838d8849-4ffb-9f44-3d0d-aa8a0a079afe"
		},
		"Open WorldCat": {
			m: "^https?://(.+).worldcat\\.org/",
			g: "c73a4a8c-3ef1-4ec8-8229-7531ee384cc4"
		},
		"EBSCOHost": {
			m: "^https?://[^/]+/(?:eds|bsi|ehost)/(?:results|detail|folder)",
			g: "d0b1914a-11f1-4dd7-8557-b32fe8a3dd47"
		}
	},
	g2t, m2t;

	function init() {
		g2t = {}; m2t = {};
		each(tr, function(ts, name) {
			ts.g = ts.g.toLowerCase();
			g2t[ts.g] = name;
			m2t[ts.m] = ts.g;
		});
	}

	function findByID(id) {
		if (! g2t) init();
		return g2t[id.toLowerCase()];
	}

	function matchURL(url) {
		if (! m2t) init();

		for (var re in m2t) {
			if (new RegExp(re).test(url)) {
				return m2t[re];
			}
		}

		return null;
	}
	
	return {
		findByID: findByID,
		matchURL: matchURL
	};
}());


var pageURL, pageDoc,
	pmeCallback,
	pmeOK = true;	// when this is false, things have gone pear-shaped and no new actions should be started


// ------------------------------------------------------------------------
//  _                   _             
// | | ___   __ _  __ _(_)_ __   __ _ 
// | |/ _ \ / _` |/ _` | | '_ \ / _` |
// | | (_) | (_| | (_| | | | | | (_| |
// |_|\___/ \__, |\__, |_|_| |_|\__, |
//          |___/ |___/         |___/ 
// ------------------------------------------------------------------------
function log() {
	var stuff = Array.prototype.slice.call(arguments, 0);
	stuff.unshift("PME");
	if(window.console && console.info) {
		if (console.info.apply)
			console.info.apply(console, stuff);
		else // IE...
			console.info(stuff.join(" "));
	}
}

function warn() {
	var stuff = Array.prototype.slice.call(arguments, 0);
	stuff.unshift("_Warning_");
	log.apply(null, stuff);
}

function fatal() {
	if (! pmeOK) return;

	var stuff = Array.prototype.slice.call(arguments, 0);
	stuff.unshift("** FATAL **");
	log.apply(null, stuff);

	pmeOK = false;
	completed(null);
}


// ------------------------------------------------------------------------
//                                                    _   _ _     
//   ___ ___  _ __ ___  _ __ ___   ___  _ __    _   _| |_(_) |___ 
//  / __/ _ \| '_ ` _ \| '_ ` _ \ / _ \| '_ \  | | | | __| | / __|
// | (_| (_) | | | | | | | | | | | (_) | | | | | |_| | |_| | \__ \
//  \___\___/|_| |_| |_|_| |_| |_|\___/|_| |_|  \__,_|\__|_|_|___/
//                                                                
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
			handler(vals[key], key, vals);
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

function waitFor(pred, maxTime, callback) {
	var interval = 20;
	if (pred())
		callback(true);
	else {
		if (maxTime - interval > 0)
			setTimeout(function() { waitFor(pred, maxTime - interval, callback); }, interval);
		else
			callback(false);
	}
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
		out[k] = items[k];
		break;		// always just pick the first one for now
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


// ------------------------------------------------------------------------
//  _____                    _       _             
// |_   _| __ __ _ _ __  ___| | __ _| |_ ___  _ __ 
//   | || '__/ _` | '_ \/ __| |/ _` | __/ _ \| '__|
//   | || | | (_| | | | \__ \ | (_| | || (_) | |   
//   |_||_|  \__,_|_| |_|___/_|\__,_|\__\___/|_|   
//                                                 
// ------------------------------------------------------------------------
PME.Translator = function(type) {
	var handlers = {},
		text = "",
		textIndex = 0,
		id = null,
		spec = null,
		api = null,
		script = null,
		waiting = false,
		loaded = false,
		doc = pageDoc,
		url = pageURL,
		intf;

	function setTranslator(newID) {
		if (script)
			fatal("tried to set ID on an inited translator.");
		id = newID;

		var name = Registry.findByID(id);
		if (name) {
			log("loading translator " + name);
			PME.Translator.cache[id] = intf;

			script = document.createElement("script");
			script.src = PME.Translator.baseURL + name + ".js";
			script.onerror = function() {
				fatal("translator failed to load: ", name);
			}
			document.getElementsByTagName("head")[0].appendChild(script);
		}
		else {
			fatal("no translator in registry with ID", id);
		}
	}

	function setDocument(newDoc) {
		doc = newDoc;
	}

	function setString(newText) {
		text = newText;
		textIndex = 0;
	}

	function setHandler(event, handler) {
		if (! handlers[event])
			handlers[event] = [];
		handlers[event].push(handler);
	}

	function translate() {
		if (! script) {
			fatal("translate() called on uninited Translator");
			return;
		}

		if (! loaded) {
			if (waiting) return;
			waiting = true;

			waitFor(
				function() { return loaded; },
				5000,
				function(success) {
					waiting = false;
					if (! success)
						fatal("timeout while trying to load translator ", id);
					else
						translate();
				}
			);

			return;
		}

		try {
			log('run translator with url', url, 'and doc', doc);
			if (type == "import")
				api.doImport();
			else if (type == "web")
				api.doWeb(doc, url);
			else
				fatal("can't handle translators of type:", type);
		}
		catch(e) {
			fatal("error during translation", e, e.message);
		}
	}

	function ready(newSpec, newAPI) {
		if (loaded) {
			warn("translator " + spec.label + " got loaded event but is already loaded!", newSpec);
			return;
		}

		loaded = true;
		spec = newSpec;
		api = newAPI;
	}

	function unload() {
		if (script) {
			script.parentNode.removeChild(script);
			script = null;
		}
	}

	return intf = {
		setTranslator: setTranslator,
		setDocument: setDocument,
		setString: setString,
		setHandler: setHandler,
		translate: translate,
		ready: ready,
		unload: unload
	}
};

PME.Translator.baseURL = "http://" + PME_SRV + "/extractors/"; // PME_SRV is set by the bookmarklet
PME.Translator.cache = {};

PME.Translator.loaded = function(spec, api) {
	// this function is called at the end of each translator script file
	log("translator loaded ", spec.label);

	var tr = PME.Translator.cache[spec.translatorID];
	if (! tr) {
		fatal("got a load event for GUID " + spec.translatorID + ", but cannot find cached translator for it.");
		return;
	}

	tr.ready(spec, api);
};

PME.loadTranslator = function(type) {
	return PME.Translator(type);
};

PME.freeTranslators = function() {
	each(PME.Translator.cache, function(t) {
		t.unload();
	});
	PME.Translator.cache = {};
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
				item.creators.push(PME.Util.cleanAuthor(value, type, true));
			} else {
				item.creators.push(PME.Util.cleanAuthor(value, type, false));
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
				if(PME.Util.itemTypeExists(value)) item.itemType = value;
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
//                   _   _                
//  _ __ _   _ _ __ | |_(_)_ __ ___   ___ 
// | '__| | | | '_ \| __| | '_ ` _ \ / _ \
// | |  | |_| | | | | |_| | | | | | |  __/
// |_|   \__,_|_| |_|\__|_|_| |_| |_|\___|
//                                        
// ------------------------------------------------------------------------
function vanish() {
	try {
		PME.freeTranslators();
		if (window.PME_SCR)
			PME_SCR.parentNode.removeChild(PME_SCR);
	} catch(e) {}

	window.PME = undefined;
	window.FW = undefined;

	window.PME_SCR = undefined;
	window.PME_SRV = undefined;
}

function completed(data) {
	if (pmeOK)
		log("completed, data = ", data);

	pmeCallback && pmeCallback(data);

	pageURL = pageDoc = pmeCallback = undefined;
	pmeOK = false;
	setTimeout(vanish, 1);
}

PME.getPageMetaData = function(callback) {
	log("getPageMetdaData start");
	try {
		// main accesspoint
		pageURL = document.location.href;
		pageDoc = document;
		pmeCallback = callback;

		var trans = Registry.matchURL(pageURL);
		if (! trans)
			completed(null);
		else {
			var t = PME.loadTranslator("web");
			t.setTranslator(trans);
			t.translate();
		}
	}
	catch(e) {
		log("ERROR during initialisation", e, e.message);
		completed(null);
	}
};

}());
