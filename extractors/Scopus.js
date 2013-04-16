(function(){
var translatorSpec =
{
	"translatorID": "a14ac3eb-64a0-4179-970c-92ecc2fec992",
	"label": "Scopus",
	"creator": "Michael Berkowitz, Rintze Zelle and Avram Lyon",
	"target": "^https?://www\\.scopus\\.com[^/]*",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2013-02-12 10:29:34"
}

/*
   Scopus Translator
   Copyright (C) 2008-2013 Center for History and New Media and Sebastian Karcher

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

function detectWeb(doc, url) {
	if (url.indexOf("/results/") !== -1 &&
		getBoxes(doc).iterateNext()) {
		return "multiple";
	} else if (url.indexOf("/record/") !== -1) {
		return "journalArticle";
	}
}

function getEID(url) {
	return url.match(/eid=([^&]+)/)[1];
}

function getBoxes(doc) {
	return doc.evaluate('//div[@id="resultsBody"]//div[@class="fldtextPad"][1]', doc, null, XPathResult.ANY_TYPE, null);
}

function returnURL(eid) {
	return 'http://www.scopus.com/citation/output.url?origin=recordpage&eid=' + eid + '&src=s&view=FullDocument&outputType=export';
}

function doWeb(doc, url) {
	var articles = [];
	if (detectWeb(doc, url) == "multiple") {
		items = {};
		var boxes = getBoxes(doc);
		var box;
		while (box = boxes.iterateNext()) {
			var link = doc.evaluate('.//a', box, null, XPathResult.ANY_TYPE, null).iterateNext();
			items[link.href] = PME.Util.trimInternal(PME.Util.getNodeText(link));
		}
		PME.selectItems(items, function (items) {
			for (var i in items) {
				articles.push(i);
			}
			PME.Util.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
	PME.wait();
}

function scrape(doc, url) {
	//DOI, ISBN, language, and ISSN are not in the export data - get them from the page
	var doi = PME.Util.xpathText(doc, '//div[contains(@class, "formatSourceExtended")]/span[strong[contains(text(), "DOI:")]]');
	var ISSN = PME.Util.xpathText(doc, '//div[contains(@class, "formatSourceExtended")]/span[strong[contains(text(), "ISSN:")]]');
	var ISBN = PME.Util.xpathText(doc, '//div[contains(@class, "formatSourceExtended")]/span[strong[contains(text(), "ISBN:")]]');
	var language = PME.Util.xpathText(doc, '//div[contains(@class, "formatSourceExtended")]/span[strong[contains(text(), "Original language:")]]')
	articles = [returnURL(getEID(url))];
	var article = articles.shift();
	PME.Util.doGet(article, function(text, obj) {
		var stateKey = text.match(/<input[^>]*name="stateKey"[^>]*>/);
		if (!stateKey) PME.debug("No stateKey");
		else stateKey = stateKey[0].match(/value="([^"]*)"/)[1];
		var eid = text.match(/<input[^>]*name="eid"[^>]*>/);
		if (!eid) PME.debug("No eid");
		else eid = eid[0].match(/value="([^"]*)"/)[1];
		var get = 'http://www.scopus.com/citation/export.url';
		var post = 'origin=recordpage&sid=&src=s&stateKey=' + stateKey + '&eid=' + eid + '&sort=&exportFormat=RIS&view=CiteAbsKeyws&selectedCitationInformationItemsAll=on';
		var rislink = get + "?" + post;	
		PME.Util.HTTP.doGet(rislink, function(text) {
			// load translator for RIS
			if (text.search(/T2  -/)!=-1 && text.search(/JF  -/)!=-1){
				//SCOPUS RIS mishandles alternate titles and journal titles
				//if both fields are present, T2 is the alternate title and JF the journal title
				text = text.replace(/T2  -/, "N1  -" ).replace(/JF  -/, "T2  -");
				
			}
			PME.debug(text)
			var translator = PME.loadTranslator("import");
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				var notes = [];
				for (i in item.notes) {
					if (item.notes[i]['note'].match(/Export Date:|Source:/))
						continue;
					notes.push(item.notes[i]);
				}
				item.notes = notes;
				item.url = "";
				if (doi) item.DOI = doi.replace(/DOI:/, "").trim();
				if (ISSN) item.ISSN = ISSN.replace(/ISSN:/, "").trim();
				if (ISBN) item.ISBN = ISBN.replace(/ISBN:/, "").trim();
				if (language) item.language = language.replace(/Original language:/, "").trim();
				item.complete();
			});
			translator.translate();
		}, function() { 
			if (articles.length > 0) scrape(articles);
			else PME.done();
		});
	});
}
PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb });
}());