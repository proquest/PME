(function(){
var translatorSpec =
{
	"translatorID": "fc9b7700-b3cc-4150-ba89-c7e4443bd96d",
	"label": "Financial Times",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www|search|ftalphaville)\\.ft\\.com",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2013-02-06 23:59:31"
}

/*
Foreign Affairs Translator
Copyright (C) 2011 Sebastian Karcher and CHNM

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) { return FW.detectWeb(doc, url); }
function doWeb(doc, url) { return FW.doWeb(doc, url); }

 
/** Blog */
FW.Scraper({
itemType         : 'blogPost',
detect           : FW.Xpath('//h2[@class="entry-title"]'),
title            : FW.Xpath('//h2[@class="entry-title"]').text().trim(),
attachments      : [
  {
  url: FW.Url(),
  title: "Financial Times Snapshot",
  type: "text/html"}],
creators         : FW.Xpath('//span[@class="author_byline"]/a').text().replace(/^\s*by\s*/, "").cleanAuthor("author"),
date             : FW.Xpath('//span[@class="posted-on entry-date"]').text(),
ISSN			 : "0307-1766",
publicationTitle : "Financial Times"
}); 
 

/** Articles */
FW.Scraper({
itemType         : 'newspaperArticle',
detect           : FW.Xpath('//meta[@property="og:type" and @content="article"]'),
title            : FW.Xpath('//div[contains(@class, "fullstory")]/h1').text().trim(),
attachments      : [
  {
  url: FW.Url(),
  title: "Financial Times Snapshot",
  type: "text/html"}],
creators         : FW.Xpath('//p[@class="byline " or @class="byline"]/span').text().replace(/^By\s*/, "").split(/,| and /).cleanAuthor("author"),
date             : FW.Xpath('//p[@id="publicationDate"]/span[@class="time"]').text(),
abstractNote     : FW.Xpath('//meta[@name="description"]/@content').text(),
ISSN			 : "0307-1766",
issue			 : FW.Xpath('//div[contains(@class, "article-issue")]//div/a').text().trim(),
publicationTitle : "Financial Times"
});
 

 
FW.MultiScraper({
itemType         : 'multiple',
detect           : FW.Url().match(/\/search\?/),
choices          : {
  titles :  FW.Xpath('//li[contains(@class, "result")]/h3/a[contains(@href, "www.ft.com")]').text().trim(),
  urls    :  FW.Xpath('//li[contains(@class, "result")]/h3/a[contains(@href, "www.ft.com")]').key("href")
}
});
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://blogs.ft.com/beyond-brics/2012/01/02/12-for-2012-brazils-import-substitution-2-0/#axzz1iLZdoFBr",
		"items": [
			{
				"itemType": "blogPost",
				"creators": [
					{
						"firstName": "",
						"lastName": "beyondbrics",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Financial Times Snapshot",
						"type": "text/html"
					}
				],
				"url": "http://blogs.ft.com/beyond-brics/2012/01/02/12-for-2012-brazils-import-substitution-2-0/#axzz1iLZdoFBr",
				"date": "Jan 2, 2012 3:00pm",
				"ISSN": "0307-1766",
				"publicationTitle": "Financial Times",
				"title": "12 for 2012: Brazil’s import substitution industrialisation 2.0",
				"libraryCatalog": "Financial Times",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "12 for 2012"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ft.com/intl/cms/s/2/0d506e0e-1583-11e1-b9b8-00144feabdc0.html#axzz1hzl2SwPD",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Andrew",
						"lastName": "Hill",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.ft.com/intl/cms/s/2/0d506e0e-1583-11e1-b9b8-00144feabdc0.html#axzz1hzl2SwPD",
						"title": "Financial Times Snapshot",
						"type": "text/html"
					}
				],
				"url": "http://www.ft.com/intl/cms/s/2/0d506e0e-1583-11e1-b9b8-00144feabdc0.html#axzz1hzl2SwPD",
				"abstractNote": "When 1,200 partners of McKinsey&Company – the elite of global consulting – arrived at the Gaylord National Hotel & Convention Center, outside Washington DC, early on the morning of March 15 this year, they found themselves where they least wanted to",
				"date": "November 25, 2011 9:32 pm",
				"ISSN": "0307-1766",
				"publicationTitle": "Financial Times",
				"title": "Inside McKinsey",
				"libraryCatalog": "Financial Times",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ft.com/intl/cms/s/30c4c46e-35e2-11e1-9f98-00144feabdc0,Authorised=false.html?_i_location=http%3A%2F%2Fwww.ft.com%2Fcms%2Fs%2F0%2F30c4c46e-35e2-11e1-9f98-00144feabdc0.html&_i_referer=http%3A%2F%2Fsearch.ft.com%2Fsearch%3FqueryText%3Dargentina%26ftsearchType%3Dtype_news#axzz1iRbmkQzE",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Ed",
						"lastName": "Crooks",
						"creatorType": "author"
					},
					{
						"firstName": "James",
						"lastName": "Boxell",
						"creatorType": "author"
					},
					{
						"firstName": "Adam",
						"lastName": "Jones",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.ft.com/intl/cms/s/30c4c46e-35e2-11e1-9f98-00144feabdc0,Authorised=false.html?_i_location=http%3A%2F%2Fwww.ft.com%2Fcms%2Fs%2F0%2F30c4c46e-35e2-11e1-9f98-00144feabdc0.html&_i_referer=http%3A%2F%2Fsearch.ft.com%2Fsearch%3FqueryText%3Dargentina%26ftsearchType%3Dtype_news#axzz1iRbmkQzE",
						"title": "Financial Times Snapshot",
						"type": "text/html"
					}
				],
				"url": "http://www.ft.com/intl/cms/s/30c4c46e-35e2-11e1-9f98-00144feabdc0,Authorised=false.html?_i_location=http%3A%2F%2Fwww.ft.com%2Fcms%2Fs%2F0%2F30c4c46e-35e2-11e1-9f98-00144feabdc0.html&_i_referer=http%3A%2F%2Fsearch.ft.com%2Fsearch%3FqueryText%3Dargentina%26ftsearchType%3Dtype_news#axzz1iRbmkQzE",
				"abstractNote": "Chinese and French companies have announced large investments in US shale oil and gas projects as they seek to benefit from the country’s controversial boom in “unconventional” resources. Sinopec, China’s second-largest oil company by market",
				"date": "January 3, 2012 7:30 pm",
				"ISSN": "0307-1766",
				"publicationTitle": "Financial Times",
				"title": "China and France chase US shale assets",
				"libraryCatalog": "Financial Times",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://search.ft.com/search?queryText=argentina&ftsearchType=type_news",
		"items": "multiple"
	}
]
/** END TEST CASES **/

// Generated code, or at least, this will be generated:
PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb });
}());