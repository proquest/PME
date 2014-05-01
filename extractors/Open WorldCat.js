(function(){
var translatorSpec =
{
	"translatorID": "c73a4a8c-3ef1-4ec8-8229-7531ee384cc4",
	"label": "Open WorldCat",
	"creator": "Simon Kornblith, Sebastian Karcher",
	"target": "^https?://(.+).worldcat\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 12,
	"browserSupport": "gcsbv",
	"lastUpdated": "2013-04-11 11:57:40"
}

/**
 * Gets Zotero item from a WorldCat icon src
 */
function getZoteroType(iconSrc) {
	// only specify types not specified in COinS
	if (iconSrc.indexOf("icon-rec") != -1) {
		return "audioRecording";
	}
	if (iconSrc.indexOf("icon-com") != -1) {
		return "computerProgram";
	}
	if (iconSrc.indexOf("icon-map") != -1) {
		return "map";
	}
	return false;
}


/**
 * RIS Scraper Function
 *
 */

function scrape(doc, url, callDoneWhenFinished) {
	//we need a different replace for item displays from search results
	if (!url) url = doc.location.href;
	if (url.match(/\?/)) {
		var newurl = url.replace(/\&[^/]*$|$/, "&client=worldcat.org-detailed_record&page=endnote");
	} else {
		var newurl = url.replace(/\&[^/]*$|$/, "?client=worldcat.org-detailed_record&page=endnote");
	}
	//PME.debug(newurl)
	PME.Util.HTTP.doGet(newurl, function (text) {
	
		//PME.debug("RIS: " + text)
		var translator = PME.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			item.extra = undefined;
			item.archive = undefined;

			if(item.libraryCatalog == "http://worldcat.org") {
				item.libraryCatalog = "Open WorldCat";
			}
			//remove space before colon
			item.title = item.title.replace(/\s+:/, ":")
			
			
			//creators have period after firstName
			for (var i=0; i<item.creators.length; i++) {
				if (item.creators[i].firstName) {
					item.creators[i].firstName = item.creators[i].firstName.replace(/\.$/, "");
				}
				else {
					item.creators[i].lastName = item.creators[i].lastName.replace(/\.$/, "");
					item.creators[i].fieldMode = 1;
				}
			}
			//We want ebooks to be treated like books, not webpages (is ISBN the best choice here?)
			if (item.itemType == "webpage" && item.ISBN) {
				item.itemType = "book";
			}
			item.complete();
		});
		translator.translate();
		if(callDoneWhenFinished) PME.done();
	});
}

/**
 * Generates a Zotero item from a single item WorldCat page, or the first item on a multiple item
 * page
 */
function generateItem(doc, node) {
	var item = new PME.Item();
	PME.Util.parseContextObject(node.nodeValue, item);
	// if only one, first check for special types (audio & video recording)
	var type = false;
	try {
		type = doc.evaluate('//img[@class="icn"][contains(@src, "icon-")]/@src', doc, null, XPathResult.ANY_TYPE, null).iterateNext().nodeValue;
	} catch (e) {}
	if (type) {
		type = getZoteroType(type);
		if (type) item.itemType = type;
	}
	return item;
}

function detectWeb(doc) {
	var xpath = doc.evaluate('//span[@class="Z3988"]/@title', doc, null, XPathResult.ANY_TYPE, null);
	var node = xpath.iterateNext();
	if (!node) return false;
	// see if there is more than one
	if (xpath.iterateNext()) {
		multiple = true;
		return "multiple";
	}
	// generate item and return type
	return generateItem(doc, node).itemType;
}

function detectSearch(item) {
	return !!item.ISBN;
}

function doWeb(doc, url) {
	var articles = [];
	if (doc.evaluate('//div[@class="name"]/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) { //search results view
		if (detectWeb(doc) == "multiple") {
			var titles = doc.evaluate('//div[@class="name"]/a', doc, null, XPathResult.ANY_TYPE, null);
			var items = {};
			var title;
			while (title = titles.iterateNext()) {
				items[title.href] = PME.Util.getNodeText(title);
			}
			PME.selectItems(items, function (items) {
				if (!items) {
					return true;
				}
				for (var i in items) {
					articles.push(i);
				}
				//PME.debug(articles)
				PME.Util.processDocuments(articles, scrape);
			});
		} else { //single item in search results, don't display a select dialog
			var title = doc.evaluate('//div[@class="name"]/a[1]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
			if (!title) PME.done(false);
			article = title.href;
			PME.Util.processDocuments(article, scrape);
		}
	} else { // regular single item	view
		scrape(doc, url);
	}
}

function doSearch(item) {
	PME.Util.processDocuments(window.location.protocol +"//www.worldcat.org/search?q=isbn%3A" + item.ISBN.replace(/[^0-9X]/g, "") + "&=Search&qt=results_page", function (doc, url) {
		//we take the first search result and run scrape on it
		if (doc.evaluate('//div[@class="name"]/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) { //search results view
			var article = PME.Util.xpathText(doc, '(//div[@class="name"]/a)[1]/@href')
			if (!article){PME.done(false); return false;}
			article = window.location.protocol +"//www.worldcat.org" + article;
			PME.Util.processDocuments(article, function(doc, url) { scrape(doc, url, true); });
		} else {
			scrape(doc, url, true);
		}
	}, null);
} /** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.worldcat.org/search?qt=worldcat_org_bks&q=argentina&fq=dt%3Abks",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.worldcat.org/title/argentina/oclc/489605&referer=brief_results",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Whitaker",
						"firstName": "Arthur Preston",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"libraryCatalog": "Open WorldCat",
				"language": "English",
				"title": "Argentina",
				"publisher": "Prentice-Hall",
				"place": "Englewood Cliffs, N.J.",
				"date": "1964"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.worldcat.org/title/dynamic-systems-approach-to-the-development-of-cognition-and-action/oclc/42854423&referer=brief_results",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Thelen",
						"firstName": "Esther",
						"creatorType": "author"
					},
					{
						"lastName": "Smith",
						"firstName": "Linda B",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"libraryCatalog": "Open WorldCat",
				"language": "English",
				"url": "http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=nlebk&db=nlabk&AN=1712",
				"title": "A dynamic systems approach to the development of cognition and action",
				"publisher": "MIT Press",
				"place": "Cambridge, Mass.",
				"date": "1996",
				"ISBN": "0585030154  9780585030159",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://melvyl.worldcat.org/title/cambridge-companion-to-adam-smith/oclc/60321422&referer=brief_results",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Haakonssen",
						"firstName": "Knud",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"libraryCatalog": "Open WorldCat",
				"language": "English",
				"title": "The Cambridge companion to Adam Smith",
				"publisher": "Cambridge University Press",
				"place": "Cambridge; New York",
				"date": "2006",
				"ISBN": "0521770599 0521779243  9780521770590 9780521779241",
				"abstractNote": "\"Adam Smith is best known as the founder of scientific economics and as an early proponent of the modern market economy. Political economy, however, was only one part of Smith's comprehensive intellectual system. Consisting of a theory of mind and its functions in language, arts, science, and social intercourse, Smith's system was a towering contribution to the Scottish Enlightenment. His ideas on social intercourse, in fact, also served as the basis for a moral theory that provided both historical and theoretical accounts of law, politics, and economics. This companion volume provides an up-to-date examination of all aspects of Smith's thought. Collectively, the essays take into account Smith's multiple contexts - Scottish, British, European, Atlantic, biographical, institutional, political, philosophical - and they draw on all his works, including student notes from his lectures. Pluralistic in approach, the volume provides a contextualist history of Smith, as well as direct philosophical engagement with his ideas.\"--Jacket."
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.worldcat.org/search?q=applications&qt=owc_search",
		"items": [
			{	
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Feller",
						"firstName" : "William",
						"creatorType" : "author"
					}
				],		
				"libraryCatalog" : "Open WorldCat",
				"language" : "English",
				"title" : "An introduction to probability theory and its applications.",
				"publisher" : "Wiley",
				"place" : "New York",
				"date" : " 1957",
				"ISBN" : "0471257095  9780471257097"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Osada",
						"firstName" : "Yoshihito",
						"creatorType" : "author"
					}
				],		
				"libraryCatalog" : "Open WorldCat",
				"language" : "English",
				"title" : "Applications",
				"publisher" : "Academic Press",
				"place" : "San Diego, Calif. [u.a.",
				"date" : " 2001",
				"ISBN" : "0123949637 9780123949639"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Ahson",
						"firstName" : "Syed",
						"creatorType" : "author"
					}
				],		
				"libraryCatalog" : "Open WorldCat",
				"language" : "English",
				"title" : "Applications",
				"publisher" : "CRC Press",
				"place" : "Boca Raton, Fla. [u.a.",
				"date" : " 2008",
				"ISBN" : "1420045474 9781420045475"
			},
			{
				"itemType" : "webpage",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Baukal",
						"firstName" : "Charles E",
						"creatorType" : "author"
					}
				],		
				"libraryCatalog" : "Open WorldCat",
				"language" : "English",
				"url" : "http://librarytitles.ebrary.com/Doc?id=10722384",
				"title" : "Applications",
				"publisher" : "CRC Press",
				"place" : "Boca Raton",
				"date" : " 2014"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Goffin",
						"firstName" : "J.-L",
						"creatorType" : "author"
					}
				],		
				"libraryCatalog" : "Open WorldCat",
				"language" : "English",
				"title" : "Applications",
				"publisher" : "North Holland Pub. Co. ; Sole distributors for the U.S.A. and Canada, Elsevier Science Pub. Co.",
				"place" : "Amsterdam; New York; New York",
				"date" : " 1982",
				"ISBN" : "0444864784 9780444864789"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Reisig",
						"firstName" : "Wolfgang",
						"creatorType" : "author"
					}
				],		
				"libraryCatalog" : "Open WorldCat",
				"language" : "English",
				"title" : "Applications",
				"publisher" : "Springer",
				"date" : " 1998",
				"ISBN" : "3540653074 9783540653073"
			},
			{
				"itemType" : "webpage",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Rachev",
						"firstName" : "S. T",
						"creatorType" : "author"
					}
				],		
				"libraryCatalog" : "Open WorldCat",
				"language" : "English",
				"url" : "http://site.ebrary.com/id/10015662",
				"title" : "Applications",
				"publisher" : "Springer",
				"place" : "New York",
				"date" : " 1998"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Lengauer",
						"firstName" : "Thomas",
						"creatorType" : "author"
					}
				],		
				"libraryCatalog" : "Open WorldCat",
				"language" : "English",
				"title" : "Applications",
				"publisher" : "Wiley-VCH",
				"place" : "Weinheim",
				"date" : " 2002",
				"ISBN" : "3527299882 9783527299881"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Heftmann",
						"firstName" : "Erich",
						"creatorType" : "author"
					}
				],		
				"libraryCatalog" : "Open WorldCat",
				"language" : "English",
				"title" : "Applications.",
				"publisher" : "Elsevier",
				"place" : "Amsterdam [u.a.]",
				"date" : " 1983",
				"ISBN" : "0444420444 9780444420442",
				"abstractNote" : "Teil B."
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Mill",
						"firstName" : "John Stuart",
						"creatorType" : "author"
					}
				],		
				"libraryCatalog" : "Open WorldCat",
				"language" : "English",
				"title" : "Principles of political economy, with some of their applications to social philosophy.",
				"publisher" : "A. M. Kelley, bookseller",
				"place" : "New York",
				"date" : " 1965"
			}	
		]
	}
]
/** END TEST CASES **/
PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb, testCases: testCases });
}());