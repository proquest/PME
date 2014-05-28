(function(){
	var translatorSpec =
{
	"translatorID": "58bcb958-eb01-42e5-9247-fc5604bf5904",
	"label": "ebrary",
	"creator": "PME Team",
	"target": "^https?://site\\.ebrary\\.com/lib/.*/(search|docDetail)\\.action",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-07-10 16:42:33"
};

	function detectWeb(doc, url) {
		//not needed for PME yet
	}

	function doWeb(doc, url) {

		var results = PME.Util.xpath(doc, '//div[@class="book_item"]//div[@class="book_detail"]//a[@class="title"]/@href');

		if (results.length == 0) {
			//reader page:
			doImportFromURL(url);
		} else {
			for (var i = 0; i < results.length; i++) {
				var resultURL = PME.Util.getNodeText(results[i]);
				PME.debug("result url: " + resultURL);
				doImportFromURL(resultURL);
			}
		}

		/*
		 search page:
		 	ids: //div[@class="book_item"]//div[@class="book_detail"]//a[@class="title"]/@href then docID=10363074
		 */

	}

	function doImportFromURL(url) {
		var docID = url.match(/docID=.+?(&|$)/)[0];
		var lib = "myproquest"; //TODO: parse from url
		var newurl = window.location.protocol+"//site.ebrary.com/lib/" + lib + "/biblioExport.action?refworks=1&" + docID;
		PME.Util.HTTP.doGet(newurl, function(text) {
			var translator = PME.loadTranslator("import");
			translator.setTranslator("1a3506da-a303-4b0a-a1cd-f216e6138d86"); //RefWorks Tagged Format
			translator.setString(text);
			translator.setHandler("itemDone", function (obj, item) {
				item.complete();
			});
			translator.translate();
		});
	}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://site.ebrary.com/lib/myproquest/search.action?p00=cancer&fromSearch=fromSearch&search=Search",
		"items": [
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "American Cancer Society Staff",
						"firstName" : "",
						"creatorType" : "author"
					}
				],	
				"tags" : [
					"Cancer -- Alternative treatment -- Handbooks",
					"manuals",
					"etc."
				],	
				"date" : "200904",
				"title" : "American Cancer Society's Complete Guide to Complementary and Alternative Cancer Methods : The Essential Guide for You and Your Doctor (2nd Edition)",
				"language" : "English",
				"place" : "Atlanta, GA, USA",
				"publisher" : "American Cancer Society",
				"ISBN" : "9781604430547",
				"callNumber" : "RC271.A62 -- A46 2009eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10420209&ppg=1"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "American Cancer Society",
						"firstName" : "",
						"creatorType" : "author"
					}
				],		
				"tags" : [
					"Cancer pain.",
					"Cancer pain -- Treatment."
				],	
				"date" : "2004",
				"title" : "American Cancer Society's Guide to Pain Control : Understanding and Managing Cancer Pain (2nd Edition)",
				"language" : "English",
				"place" : "Atlanta, GA, USA",
				"publisher" : "American Cancer Society",
				"ISBN" : "9781604431124",
				"callNumber" : "RC262 -- .A645 2004eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10547108&ppg=1"
			},
			{	
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "American Cancer Society Staff",
						"firstName" : "",
						"creatorType" : "author"
					}
				],	
				"tags" : [
					"Breast -- Cancer -- Popular works."
				],		
				"date" : "200710",
				"title" : "Breast Cancer Clear and Simple : All Your Questions Answered",
				"language" : "English",
				"place" : "Atlanta, GA, USA",
				"publisher" : "American Cancer Society",
				"ISBN" : "9781604430486",
				"callNumber" : "RC280.B8.B673 2008eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10420216&ppg=1"
			},
			{	
				"itemType" : "book",
				"creators" : [ 
					{
						"0" : "",
						"lastName" : "American Cancer Society",
						"firstName" : "",
						"creatorType" : "author"
					}
				],		
				"tags" : [
					"Cancer -- Risk factors -- Popular works.",
					"Cancer -- Etiology -- Popular works."
				],	
				"date" : "201203",
				"title" : "Cancer : What Causes It, What Doesn't",
				"language" : "English",
				"place" : "Atlanta, GA, USA",
				"publisher" : "American Cancer Society",
				"ISBN" : "9781604431186",
				"callNumber" : "RC263 -- .C298 2003eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10547074&ppg=1"
			},
			{	
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "American Cancer Society Staff",
						"firstName" : "",
						"creatorType" : "author"
					}
				],	
				"tags" : [
					"Cancer -- Patients -- Home care -- Encyclopedias.",
					"Caregivers -- Encyclopedias."
				],	
				"date" : "200805",
				"title" : "Cancer Caregiving A-to-Z : An At-Home Guide for Patients and Families",
				"language" : "English",
				"place" : "Atlanta, GA, USA",
				"publisher" : "American Cancer Society",
				"ISBN" : "9781604430516",
				"callNumber" : "RC266.C338 2008eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10420218&ppg=1"
			},
			{	
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "American Cancer Society",
						"firstName" : "",
						"creatorType" : "author"
					}
				],		
				"tags" : [
					"Cancer -- Social aspects.",
					"Group facilitation.",
					"Patient advocacy.",
					"Self-help groups."
				],	
				"date" : "201303",
				"title" : "Cancer Support Groups : A Guide for Faciliators",
				"language" : "English",
				"place" : "Atlanta, GA, USA",
				"publisher" : "American Cancer Society",
				"ISBN" : "9781604431971",
				"callNumber" : "RC262.S63 -- C36 2013eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10677972&ppg=1"
			},
			{	
				"itemType" : "book",
				"tags" : [
					"Cancer -- Research -- United States -- Congresses.",
					"Older people -- Medical care -- United States -- Congresses."
				],	
				"date" : "2007",
				"title" : "Cancer in Elderly People : Workshop Proceedings",
				"language" : "English",
				"place" : "Washington, DC, USA",
				"publisher" : "National Academies Press",
				"ISBN" : "9780309668736",
				"callNumber" : "RC267 -- C36 2007eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10170939&ppg=1"
			},
			{	
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "National Cancer Policy Board Staff",
						"firstName" : "",
						"creatorType" : "author"
					},
					{	
						"1" : "",
						"lastName" : "Hewitt",
						"firstName" : "Maria E.",
						"creatorType" : "seriesEditor"
					},
					{	
						"2" : "",
						"lastName" : "Simone",
						"firstName" : "Joseph V.",
						"creatorType" : "seriesEditor"
					}
				],		
				"tags" : [
					"Cancer -- Treatment -- United States.",
					"Cancer -- Treatment -- Quality control.",
					"Cancer -- Patients -- Care -- United States."
				],		
				"date" : "199907",
				"title" : "Ensuring Quality Cancer Care",
				"language" : "English",
				"place" : "Washington, DC, USA",
				"publisher" : "National Academies Press",
				"ISBN" : "9780309518796",
				"callNumber" : "RA645.C3.E57 1999eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10041069&ppg=1"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "American Cancer Society",
						"firstName" : "",
						"creatorType" : "author"
					}
				],	
				"tags" : [
					"Cancer -- Prevention.",
					"Health behavior."
				],	
				"date" : "201204",
				"title" : "Good for You! : Reducing Your Risk of Developing Cancer",
				"language" : "English",
				"place" : "Atlanta, GA, USA",
				"publisher" : "American Cancer Society",
				"ISBN" : "9781604431391",
				"callNumber" : "RC268 -- .G663 2002eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10547129&ppg=1"
			},
			{
				"itemType": "book",
				"creators": [
					{
						"0": "",
						"lastName": "National Cancer Institute",
						"firstName": "",
						"creatorType": "author"
					}
				],
				"tags": [
					"Cancer pain -- Treatment."
				],	
				"date": "200911",
				"title": "Health Psychology Research Focus : Pain Control Support for People with Cancer",
				"language": "English",
				"place": "New York, NY, USA",
				"publisher": "Nova",
				"ISBN": "9781617285578",
				"callNumber": "RC262 -- .P345 2009eb",
				"url": "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10680898&ppg=1"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Institute of Medicine (U.S.)",
						"firstName" : "National Cancer Policy Forum Staff",
						"creatorType" : "author"
					},
					{	
						"1" : "",
						"lastName" : "Lance Armstrong Foundation Staff",
						"firstName" : "",
						"creatorType" : "author"
					},
					{
						"2" : "",
						"lastName" : "National Coalition for Cancer Survivorship and Institute of Medicine National Cancer Policy Forum Staff",
						"firstName" : "",
						"creatorType" : "author"
					}
				],	
				"tags" : [
					"Cancer -- Patients -- Rehabilitation -- United States -- Congresses.",
					"Cancer -- Treatment -- United States -- Congresses."
				],	
				"date" : "2007",
				"title" : "Implementing Cancer Survivorship Care Planning",
				"language" : "English",
				"place" : "Washington, DC, USA",
				"publisher" : "National Academies Press",
				"ISBN" : "9780309667685",
				"callNumber" : "RC262.I485 2007eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10160709&ppg=1"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Institute of Medicine",
						"creatorType" : "author"
					},
					{	
						"1" : "",
						"lastName" : "National Cancer Policy Forum",
						"creatorType" : "author"
					},
					{
						"2" : "",
						"lastName" : "Board on Health Care Services",
						"creatorType" : "author"
					}
				],	
				"tags" : [
					"Cancer -- Research.",
					"Cancer -- Treatment.",
					"Cancer -- Computer network resources."
				],	
				"date" : "201210",
				"title" : "Informatics Needs and Challenges in Cancer Research : Workshop Summary",
				"language" : "English",
				"place" : "Washington, DC, USA",
				"publisher" : "National Academies Press",
				"ISBN" : "9780309259491",
				"callNumber" : "RC268 -- .I48 2012eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10863941&ppg=1"

			},
			{
				"itemType" : "report",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Maria",
						"firstName" : "Hewitt",
						"creatorType" : "author"
					},
					{
						"1" : "",
						"lastName" : "Diana",
						"firstName" : "Petitti",
						"creatorType" : "author"
					},
					{		
						"2" : "",
						"lastName" : "National Cancer Policy Board Staff",
						"firstName" : "",
						"creatorType" : "author"
					}
				],	
				"tags" : [
					"Cancer -- Treatment.",
					"Tumors."
				],	
				"date" : "2001",
				"title" : "Interpreting the Volume-Outcome Relationship in the Context of Cancer Care",
				"language" : "English",
				"place" : "Washington, DC, USA",
				"institution" : "National Academies Press",
				"reportNumber" : "9780309510912",
				"callNumber" : "RC270.8.I57 2001eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10051621&ppg=1"
			},
			{	
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "American Cancer Society",
						"firstName" : "",
						"creatorType" : "author"
					}
				],		
				"tags" : [
					"Lungs -- Cancer -- Popular works."	
				],	
				"date" : "201212",
				"title" : "Quick Facts Lung Cancer : What You Need to Know--Now",
				"language" : "English",
				"place" : "Atlanta, GA, USA",
				"publisher" : "American Cancer Society",
				"ISBN" : "9781604432176",
				"callNumber" : "RC280.L8 -- Q53 2013eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10661882&ppg=1"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "American Cancer Society Staff",
						"firstName" : "",
						"creatorType" : "author"
					}
				],		
				"tags" : [
					"Breast -- Cancer -- Popular works.",
					"Cancer -- Popular works."
				],	
				"date" : "201104",
				"title" : "QuickFACTS Breast Cancer : What You Need to Know-NOW",
				"language" : "English",
				"place" : "Atlanta, GA, USA",
				"publisher" : "American Cancer Society",
				"ISBN" : "9781604430875",
				"callNumber" : "RC280.B8 -- Q52 2011eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10491593&ppg=1"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "American Cancer Society Staff",
						"firstName" : "",
						"creatorType" : "seriesEditor"
					}
				],	
				"tags" : [
					"Prostate -- Cancer -- Popular works.",
					"Cancer -- Popular works."
				],	
				"date" : "201101",
				"title" : "QuickFACTS Prostate Cancer : What You Need to Know-NOW (2nd Edition)",
				"language" : "English",
				"place" : "Atlanta, GA, USA",
				"publisher" : "American Cancer Society",
				"ISBN" : "9781604430752",
				"callNumber" : "RC280.P7 -- Q53 2011eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10491607&ppg=1"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "American Cancer Society Staff",
						"firstName" : "",
						"creatorType" : "author"
					}
				],		
				"tags" : [
					"Thyroid gland -- Cancer -- Popular works.",
					"Thyroid gland -- Diseases."
				],		
				"date" : "200902",
				"title" : "QuickFACTS Thyroid Cancer : What You Need to Know-Now",
				"language" : "English",
				"place" : "Atlanta, GA, USA",
				"publisher" : "American Cancer Society",
				"ISBN" : "9781604430844",
				"callNumber" : "RC280.T6 -- Q53 2009eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10491617&ppg=1"
			},
			{	
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "American Cancer Society Staff",
						"firstName" : "",
						"creatorType" : "author"
					}
				],		
				"tags" : [
					"Colon (Anatomy) -- Cancer -- Popular works.",
					"Rectum -- Cancer -- Popular works."
				],	
				"date" : "200809",
				"title" : "QuickFACTS™ Colorectal Cancer (2nd Edition)",
				"language" : "English",
				"place" : "Atlanta, GA, USA",
				"publisher" : "American Cancer Society",
				"ISBN" : "9781604431698",
				"callNumber" : "RC280.C6.Q53 2008eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10558279&ppg=1"
			},	
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "American Cancer Society",
						"firstName" : "",
						"creatorType" : "author"
					}
				],		
				"tags" : [
					"Melanoma -- Popular works.",
					"Skin -- Cancer -- Popular works."
				],		
				"date" : "201202",
				"title" : "QuickFACTS™ Melanoma Skin Cancer : What You Need to Know—NOW",
				"language" : "English",
				"place" : "Atlanta, GA, USA",
				"publisher" : "American Cancer Society",
				"ISBN" : "9781604431001",
				"callNumber" : "RC280.M37 -- M47 2012eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10630080&ppg=1"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "International Agency for Research on Cancer",
						"firstName" : "",
						"creatorType" : "author"
					},
					{	
						"1" : "",
						"lastName" : "Boyle",
						"firstName" : "Peter",
						"creatorType" : "seriesEditor"
					},
					{	
						"2" : "",
						"lastName" : "Levin",
						"firstName" : "Bernard",
						"creatorType" : "seriesEditor"
					}
				],		
				"tags" : [
					"Cancer -- Epidemiology.",
					"Cancer -- Etiology.",
					"Cancer -- Prevention.",
					"World health."	
				],	
				"date" : "2008",
				"title" : "World Cancer Report 2008",
				"language" : "English",
				"place" : "Albany, NY, USA",
				"publisher" : "International Agency for Research on Cancer",
				"ISBN" : "9789283221982",
				"callNumber" : "RA645.C3.W673 2008eb",
				"url" : "http://site.ebrary.com/lib/myproquest/docDetail.action?docID=10306279&ppg=1"
			}
		]
	}
]	
/** END TEST CASES **/	

PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb, testCases: testCases });
}());