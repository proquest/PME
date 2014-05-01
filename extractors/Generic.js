/* 	This file does not contain generic extractor. It is here to run URLs that are scraped by the
	generic scraper located in PME.js.
*/
(function(){

var translatorSpec =
{
	
}	

function doWeb(doc, url) {
	
}

function detectWeb(doc, url) {
	
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pmc/articles/PMC2377243/?tool=pmcentrez",
		"items": [
			{
				"DOI" : "10.1186/1465-9921-9-37",
				"attachments" : [
					{
						"0" : "",
						"title" : "Full Text PDF",
						"url" : "http://www.ncbi.nlm.nih.gov/pmc/articles/PMC2377243/pdf/1465-9921-9-37.pdf",
						"mimeType" : "application/pdf"
					}
				]	
			}
		]
	},
	/*{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pmc/?term=blood",
		"items": [
			{
				"DOI" : "10.1016/j.apnu.2011.09.003",
				"DOI" : "10.1016/j.bbi.2007.10.013",
				"DOI" : "10.1016/j.ijpsycho.2010.01.008",
				"DOI" : "10.1016/j.neubiorev.2008.12.003",
				"DOI" : "10.1016/j.pain.2008.05.014",
				"DOI" : "10.1016/j.pain.2012.08.001",
				"DOI" : "10.1016/j.socscimed.2009.08.018",
				"DOI" : "10.1016/j.socscimed.2011.07.034",
				"DOI" : "10.1037/a0013447",
				"DOI" : "10.1037/a0015975",
				"DOI" : "10.1037/a0023127",
				"DOI" : "10.1037/a0023813",
				"DOI" : "10.1080/15374410903103494",
				"DOI" : "10.1093/jpepsy/jsn054",
				"DOI" : "10.1097/PSY.0b013e31819b6a08",
				"DOI" : "10.1097/PSY.0b013e318227cb88",
				"DOI" : "10.1111/j.1467-7687.2010.00969.x",
				"DOI" : "10.1111/j.1469-7610.2010.02301.x",
				"DOI" : "10.1186/1465-9921-9-37"
			}
		]	
	},*/
	{
		"type": "web",
		"url": "http://en.wikipedia.org/wiki/Keith_Sweat",
		"items": [
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Hinckley",
						"firstName" : "David",
						"creatorType" : "author"
					}
				],	
				"title" : "Keith 'Sabu' Crier, bass player for disco group GQ, dead at 58",
				"publicationTitle" : "''Daily News''",
				"date" : "October 1, 2013",
				"url" : "http://www.nydailynews.com/entertainment/music-arts/keith-sabu-crier-bass-player-disco-group-gq-dead-58-article-1.1473158"
			},
			{
				"itemType" : "book",
				"title" : "Keith Sweat",
				"publisher" : "Facebook",
				"url" : "http://www.facebook.com/ogkeithsweat1"
			},
			{
				"itemType" : "book",
				"title" : "Premiere Radio Networks - Home",
				"publisher" : "Premiereradio.com",
				"url" : "http://www.premiereradio.com/news/view/803.html"
			},
			{
				"itemType" : "book",
				"title" : "Ridin' Solo: Keith Sweat: Music",
				"publisher" : "Amazon.com",
				"url" : "http://www.amazon.com/Ridin-Solo-Keith-Sweat/dp/B003IISTRM"
			}
		]	
	},	
	{
		"type": "web",
		"url": "http://pq.summon.serialssolutions.com/search?s.q=gatsby",
		"items": [
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Giles",
						"firstName" : "Paul",
						"creatorType" : "author"
					}
				],		
				"title" : "A Good Gatsby",
				"ISSN" : "2163-3797",
				"publisher" : "Commonweal Foundation",
				"publicationTitle" : "Commonweal",
				"pages" : "12",
				"issue" : "12",
				"volume" : "140",
				"date" : "2013-07-12",
				"language" : "en-US"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Mercurio",
						"firstName" : "El",
						"creatorType" : "author"
					}
				],	
				"title" : "Gatsby",
				"publisher" : "Global Network Content Services LLC, DBA Noticias Financieras LLC",
				"publicationTitle" : "El Mercurio",
				"date" : "2013-06-21",
				"language" : "en-US"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Elkin",
						"firstName" : " Ali",
						"creatorType" : "author"
					}
				],	
				"title" : "Gatsby style",
				"ISSN" : "8756-789X",
				"publisher" : "Crain Communications, Inc",
				"publicationTitle" : "Crain's New York Business",
				"issue" : "19",
				"volume" : "29",
				"date" : "2013-05-13",
				"language" : "en-US"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Chagollan",
						"firstName" : "Steve",
						"creatorType" : "author"
					}
				],	
				"title" : "Gatsby's Great Music Collection",
				"ISSN" : "0042-2738",
				"publisher" : "Penske Business Media",
				"publicationTitle" : "Variety",
				"pages" : "71",
				"issue" : "4",
				"volume" : "319",
				"date" : "2013-04-09",
				"language" : "en-US"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Anonymous",
						"firstName" : "Anonymou",
						"creatorType" : "author"
					}
				],	
				"title" : "Gatsby's Heirs",
				"ISSN" : "2169-1665",
				"publisher" : "Time Incorporated",
				"publicationTitle" : "Time",
				"pages" : "1",
				"issue" : "18",
				"volume" : "181",
				"date" : "2013-05-13",
				"language" : "en-US"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Semlyen",
						"firstName" : "Phil de",
						"creatorType" : "author"
					}
				],	
				"title" : "THE GREAT GATSBY",
				"publisher" : "Bauer Consumer Media",
				"publicationTitle" : "Empire",
				"pages" : "24",
				"issue" : "288",
				"date" : "2013-06-01",
				"language" : "en-US"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Stone",
						"firstName" : "Alan A",
						"creatorType" : "author"
					}
				],	
				"title" : "THE GREATER GATSBY",
				"ISSN" : "0734-2306",
				"publisher" : "Boston Critic, Incorporated",
				"publicationTitle" : "Boston Review",
				"pages" : "76",
				"issue" : "4",
				"volume" : "38",
				"date" : "2013-07-01",
				"language" : "en-US"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Semlyen",
						"firstName" : "Phil de",
						"creatorType" : "author"
					}
				],	
				"title" : "THE TWO GATSBYS",
				"publisher" : "Bauer Consumer Media",
				"publicationTitle" : "Empire",
				"pages" : "139",
				"issue" : "288",
				"date" : "2013-06-01",
				"language" : "en-US"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Wyatt",
						"firstName" : " Neal",
						"creatorType" : "author"
					}
				],	
				"title" : "The Great Gatsby",
				"ISSN" : "0006-7385",
				"publisher" : "American Library Association",
				"publicationTitle" : "Booklist",
				"pages" : "54",
				"issue" : "1",
				"volume" : "110",
				"date" : "2013-09-01",
				"language" : "en-US"
			},
			{
				"itemType" : "journalArticle",
				"title" : "The great Gatsby screening",
				"ISSN" : "0042-2738",
				"publisher" : "Penske Business Media, LLC",
				"publicationTitle" : "Variety",
				"pages" : "114",
				"issue" : "1",
				"volume" : "320",
				"date" : "2013-05-07",
				"language" : "en-US"
			},
		]	
	}				
]
/** END TEST CASES **/

PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb, testCases: testCases });
}());