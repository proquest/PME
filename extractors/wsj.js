(function(){
var translatorSpec =
{
	"translatorID": "53f8d182-4edc-4eab-b5a1-141698a1303b",
	"label": "Wall Street Journal",
	"creator": "Sebastian Karcher",
	"target": "^http://(online|blogs)?\\.wsj\\.com/",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2012-12-13 23:41:11"
}


/*
Wall Street Journal Translator
Copyright (C) 2011 Sebastian Karcher

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


/**Blogs*/
FW.Scraper({
itemType         : 'blogPost',
detect           : FW.Url().match(/blogs\.wsj\.com/	),
title            : FW.Xpath('//h1').text().trim(),
attachments      : [
  {
  url: FW.Url(),
  title: "WSJ-Blogs Snapshot",
  type: "text/html"}],
creators         : FW.Xpath('//h3[@class="byline"]|//p[1][preceding-sibling::div[@class="metadata-author clearFix"]]|//a[@class="popTrigger" and contains(@href, "/biography/")]|//span[contains(@class, "post-author")]').text().replace(/^\s*By\s*/, "").cleanAuthor("author"),
date             : FW.Xpath('//li[@class="dateStamp first"]|//small[@class="post-time"]').text(),
ISSN			 : "0099-9660",
publicationTitle : FW.Xpath('//link[@type="application/rss+xml"]/@title').text().replace(' RSS Feed', '').prepend("WSJ Blogs - ")
}); 
 
 
/** Articles */
FW.Scraper({
itemType         : 'newspaperArticle',
detect           : FW.Url().match(/wsj\.com(\/news)?\/articles?/),
title            : FW.Xpath('//h1').text().trim(),
attachments      : [
  {
  url: FW.Url(),
  title: "Wall Street Journal Snapshot",
  type: "text/html"}],
creators         : FW.Xpath('//meta[@name="article.author" or @name="author"]/@content').text().capitalizeTitle(true).replace(/^\s*By\s*/, "").split(/,| and | And /).cleanAuthor("author"),
date             : FW.Xpath('//meta[@name="article.published"]/@content|//meta[@itemprop="datePublished"]/@value').text().capitalizeTitle(true),
abstractNote     : FW.Xpath('//meta[@name="description"]/@content').text(),
section          : FW.Xpath('//meta[@name="article.section" or @name="subsection"]/@content').text().capitalizeTitle(true),
ISSN			 : "0099-9660",
publicationTitle : "Wall Street Journal"
});
 

 
FW.MultiScraper({
itemType         : 'multiple',
detect           : FW.Url().match(/wsj\.com\/search\//),
choices          : {
  titles :  FW.Xpath('//h2/a[contains(@href, "/article/") or contains(@href, "blogs.wsj.com")]').text().trim(),
  urls    :  FW.Xpath('//h2/a[contains(@href, "/article/") or contains(@href, "blogs.wsj.com")]').key("href")
}
});


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://online.wsj.com/article/SB10001424052970204517204577046222233016362.html?mod=WSJ_hp_LEFTWhatsNewsCollection",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "John W.",
						"lastName": "Miller",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://online.wsj.com/article/SB10001424052970204517204577046222233016362.html?mod=WSJ_hp_LEFTWhatsNewsCollection",
						"title": "Wall Street Journal Snapshot",
						"type": "text/html"
					}
				],
				"url": "http://online.wsj.com/article/SB10001424052970204517204577046222233016362.html?mod=WSJ_hp_LEFTWhatsNewsCollection",
				"abstractNote": "A profile of an Australian miner making $200,000 a year, published in The Wall Street Journal, led hundreds of people to ask how they could apply for such a job.",
				"date": "November 19, 2011",
				"ISSN": "0099-9660",
				"publicationTitle": "Wall Street Journal",
				"section": "Careers",
				"title": "America's Jobless, Yearning for Oz",
				"libraryCatalog": "Wall Street Journal",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://online.wsj.com/article/SB10001424052970203471004577144672783559392.html?mod=WSJ_article_forsub",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Jenny",
						"lastName": "Strasburg",
						"creatorType": "author"
					},
					{
						"firstName": "Susan",
						"lastName": "Pulliam",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://online.wsj.com/article/SB10001424052970203471004577144672783559392.html?mod=WSJ_article_forsub",
						"title": "Wall Street Journal Snapshot",
						"type": "text/html"
					}
				],
				"url": "http://online.wsj.com/article/SB10001424052970203471004577144672783559392.html?mod=WSJ_article_forsub",
				"abstractNote": "An outspoken analyst who is embroiled in the Wall Street insider-trading investigation allegedly left threatening messages for two FBI agents.",
				"date": "January 7, 2012",
				"ISSN": "0099-9660",
				"publicationTitle": "Wall Street Journal",
				"section": "Markets",
				"title": "An Odd Turn in Insider Case",
				"libraryCatalog": "Wall Street Journal",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://blogs.wsj.com/overheard/2012/01/06/the-ego-has-landed/",
		"items": [
			{
				"itemType": "blogPost",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://blogs.wsj.com/overheard/2012/01/06/the-ego-has-landed/",
						"title": "WSJ-Blogs Snapshot",
						"type": "text/html"
					}
				],
				"url": "http://blogs.wsj.com/overheard/2012/01/06/the-ego-has-landed/",
				"date": "January 6, 2012, 4:22 PM",
				"ISSN": "0099-9660",
				"publicationTitle": "WSJ Blogs - Overheard",
				"title": "The Ego Has Landed",
				"libraryCatalog": "Wall Street Journal",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://online.wsj.com/search/term.html?KEYWORDS=argentina&mod=DNH_S",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://blogs.wsj.com/economics/2012/01/07/number-of-the-week-americans-cheaper-restaurant-bills/",
		"items": [
			{
				"itemType": "blogPost",
				"creators": [
					{
						"firstName": "Phil",
						"lastName": "Izzo",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://blogs.wsj.com/economics/2012/01/07/number-of-the-week-americans-cheaper-restaurant-bills/",
						"title": "WSJ-Blogs Snapshot",
						"type": "text/html"
					}
				],
				"url": "http://blogs.wsj.com/economics/2012/01/07/number-of-the-week-americans-cheaper-restaurant-bills/",
				"date": "January 7, 2012, 5:00 AM",
				"ISSN": "0099-9660",
				"publicationTitle": "WSJ Blogs - Real Time Economics",
				"title": "Number of the Week: Americans’ Cheaper Restaurant Bills",
				"libraryCatalog": "Wall Street Journal",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Number of the Week"
			}
		]
	}
]
/** END TEST CASES **/
// Generated code, or at least, this will be generated:
PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb, testCases: testCases });
}());
