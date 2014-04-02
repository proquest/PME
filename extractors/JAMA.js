(function () {
	var translatorSpec = {
		"translatorID": "0bd7e161-b266-42d0-9c19-f82b80463a0e",
		"label": "JAMA",
		"creator": "PME",
		"target": "https?://.*\\.?jamanetwork.com/solr/searchresults\\.aspx",
		"minVersion": "1.0.0",
		"maxVersion": "",
		"priority": 100,
		"inRepository": false,
		"translatorType": 4,
		"browserSupport": "gcsibv",
		"lastUpdated": "2013-09-25 16:42:33"
	}

	function detectWeb(doc, url) {
		//not used
	}
	function handleCreator(result,path) {
		var authors = PME.Util.xpathText(result, path);
		authors = authors.split('; ');
		var creators = [];
		for (var i = 0; i < authors.length; i++) {
			//first m. last, suffix - we just drop the suffix, we'll always have at least one element
			authors[i] = authors[i].split(',')[0];//first m. last jr, suffix

			if(authors[i].indexOf(' ') >= 0){
				authors[i] = authors[i].replace(/ (s|j)r\.?$/i, '').split(' ')
				creators.push({lastName: authors[i][authors[i].length - 1], firstName: authors[i][0]});
			}
			else
				creators.push({firstName: authors[i]});
		}
		return creators;
	}
	function handleSource(result, path, item) {
		var source = PME.Util.xpathText(result, path);
		source = source.split(' doi: ');
		if(source.length == 2)
			item.DOI = PME.Util.trim(source[1]);
		source = source[0].replace(/\./, '').split(' ');
		if (source.length == 3){
			item.journalAbbreviation = source[0];
			item.date = source[1];
			source = source[2].split(/\(|\)|:/);
			if(source.length == 3){
				item.volume = source[0];
				item.issue = source[1];
				item.pages = source[2];
			}
		}
	}
	function handleAttachment(doc,path) {
		var pdf = PME.Util.xpathText(doc, path);
		if(pdf){
			var protocol = 'https:' == document.location.protocol ? 'https://' : 'http://';
			return [{title: 'Full Text PDF', url: protocol + window.location.host + pdf, mimeType: 'application/pdf'}];
		}
	}
	function doWeb(doc, url) {

		if(url.indexOf('article.aspx') >= 0){
			var result = PME.Util.xpath(doc, '//div[@class="contentHeaderContainer"]');
			var item = new PME.Item('journalArticle');
			item.title = PME.Util.xpathText(result, './/span[@id="scm6MainContent_lblArticleTitle"]');
			item.creators = handleCreator(result, './/span[@id="scm6MainContent_lblAuthors"]');
			item.attachments = handleAttachment(doc, '//a[@id="hypPDFlink"]/@href');
			handleSource(result, './/span[@id="scm6MainContent_lblClientName"]', item);
			item.complete();
		}
		else {
			var results = PME.Util.xpath(doc, '//ul[@class="sr-list al-article-box al-normal"]/li[@class="sri-module al-article-items"]');
			PME.Util.each(results, function (result) {
				var item = new PME.Item('journalArticle');
				item.title = PME.Util.xpathText(result, './/h4[@class="sri-title customLink al-title"]/a');
				item.creators = handleCreator(result, './/cite[@class="sri-authors al-authors-list"]');
				item.attachments = handleAttachment(result, './/div[@class="sri-pdflink al-other-resource-links"]//a/@href');
				handleSource(result, './/div[@class="sri-expandedView"]/p[@class="sri-source al-cite-description"]', item);
				item.complete();
			});
		}
	}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://jama.jamanetwork.com/article.aspx?articleid=399154&resultClick=24",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Carlson",
						"firstName": "Stephen"
					}
				],		
				"title": "Progression of Gastritis to Monoclonal B-Cell Lymphoma With Resolution and Recurrence Following Eradication of Helicobacter pylori"
			}	
		]		
	},
	{
		"type": "web",
		"url": "http://jama.jamanetwork.com/solr/searchresults.aspx?q=fever&fd_JournalID=67&f_JournalDisplayName=JAMA&SearchSourceType=3",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "E. Truesdale",
						"firstName": "P."
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/929845/jjy140010.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "The Hospital versus the Home in the Care of the Sick; An Evolution",
				"DOI": "10.1001/jama.2013.279383",
				"journalAbbreviation": "JAMA",
				"date": "2014;"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Coburn",
						"firstName": "Bryan"
					},
					{	
						"1": "",
						"lastName": "Morris",
						"firstName": "Andrew"
					},
					{	
						"2": "",
						"lastName": "Tomlinson",
						"firstName": "George"
					},
					{	
						"3": "",
						"lastName": "Detsky",
						"firstName": "Allan"
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/24715/jrc120003_502_511.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Does This Adult Patient With Suspected Bacteremia Require Blood Cultures?",
				"DOI": "10.1001/jama.2012.8262",
				"journalAbbreviation": "JAMA",
				"date": "2012;"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"firstName": ""
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/23360/jjy120115_1782_1782.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "ABOUT OURSELVES",
				"DOI": "10.1001/jama.2012.503",
				"journalAbbreviation": "JAMA",
				"date": "2012;"
			},	
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Hampton",
						"firstName": "Tracy"
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/22456/jla15005_30b_30.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Hyperthermia to Fight Cancer",
				"DOI": "10.1001/jama.2011.912",
				"journalAbbreviation": "JAMA",
				"date": "2011;"
			},	
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Fuchs",
						"firstName": "Victor"
					}
				],	
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/4511/jco05050_1859_1860.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Health Care Is Different—That's Why Expenditures Matter",
				"DOI": "10.1001/jama.2010.593",
				"journalAbbreviation": "JAMA",
				"date": "2010;"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Stephenson",
						"firstName": "Joan"
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/4468/jwm90004_2432b_2432.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Bullying’s Legacy?",
				"DOI": "10.1001/jama.2009.819",
				"journalAbbreviation": "JAMA",
				"date": "2009;"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Kuehn",
						"firstName": "Bridget"
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/4467/jmn0610_2315_2316.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Patients Warned About Risks of Drugs Used for Analgesia, Fevers, Addiction",
				"DOI": "10.1001/jama.2009.779",
				"journalAbbreviation": "JAMA",
				"date": "2009;"
			},
			{	
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Zhang",
						"firstName": "Lijuan"
					},
					{	
						"1": "",
						"lastName": "Liu",
						"firstName": "Yan"
					},
					{	
						"2": "",
						"lastName": "Ni",
						"firstName": "Daxin"
					},
					{	
						"3": "",
						"lastName": "Li",
						"firstName": "Qun"
					},
					{	
						"4": "",
						"lastName": "Yu",
						"firstName": "Yanlin"
					},
					{	
						"5": "",
						"lastName": "Yu",
						"firstName": "Xue-jie"
					},
					{	
						"6": "",
						"lastName": "Wan",
						"firstName": "Kanglin"
					},
					{	
						"7": "",
						"lastName": "Li",
						"firstName": "Dexin"
					},
					{	
						"8": "",
						"lastName": "Liang",
						"firstName": "Guodong"
					},
					{	
						"9": "",
						"lastName": "Jiang",
						"firstName": "Xiugao"
					},
					{	
						"10": "",
						"lastName": "Jing",
						"firstName": "Huaiqi"
					},
					{	
						"11": "",
						"lastName": "Run",
						"firstName": "Jing"
					},
					{	
						"12": "",
						"lastName": "Luan",
						"firstName": "Mingchun"
					},
					{	
						"13": "",
						"lastName": "Fu",
						"firstName": "Xiuping"
					},
					{	
						"14": "",
						"lastName": "Zhang",
						"firstName": "Jingshan"
					},
					{	
						"15": "",
						"lastName": "Yang",
						"firstName": "Weizhong"
					},
					{	
						"16": "",
						"lastName": "Wang",
						"firstName": "Yu"
					},
					{	
						"17": "",
						"lastName": "Dumler",
						"firstName": "J."
					},
					{	
						"18": "",
						"lastName": "Feng",
						"firstName": "Zijian"
					},
					{	
						"19": "",
						"lastName": "Ren",
						"firstName": "Jun"
					},
					{	
						"20": "",
						"lastName": "Xu",
						"firstName": "Jianguo"
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/4440/joc80108_2263_2270.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Nosocomial Transmission of Human Granulocytic Anaplasmosis in China",
				"DOI": "10.1001/jama.2008.626",
				"journalAbbreviation": "JAMA",
				"date": "2008;"
			},	
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Bernstein",
						"firstName": "Aaron"
					},
					{		
						"1": "",
						"lastName": "Ludwig",
						"firstName": "David"
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/4440/jco80104_2297_2299.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "The Importance of Biodiversity to Medicine",
				"DOI": "10.1001/jama.2008.655",
				"journalAbbreviation": "JAMA",
				"date": "2008;"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Shaikh",
						"firstName": "Nader"
					},
					{	
						"1": "",
						"lastName": "Morone",
						"firstName": "Natalia"
					},
					{	
						"2": "",
						"lastName": "Lopez",
						"firstName": "John"
					},
					{	
						"3": "",
						"lastName": "Chianese",
						"firstName": "Jennifer"
					},
					{	
						"4": "",
						"lastName": "Sangvai",
						"firstName": "Shilpa"
					},
					{	
						"5": "",
						"lastName": "D’Amico",
						"firstName": "Frank"
					},
					{	
						"6": "",
						"lastName": "Hoberman",
						"firstName": "Alejandro"
					},
					{	
						"7": "",
						"lastName": "Wald",
						"firstName": "Ellen"
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/5259/jrc70007_2895_2904.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Does This Child Have a Urinary Tract Infection?",
				"DOI": "10.1001/jama.298.24.2895",
				"journalAbbreviation": "JAMA",
				"date": "2007;"
			},	
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Stephenson",
						"firstName": "Joan"
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/5236/jwm70008_1752_1752.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Chikungunya Fever",
				"DOI": "10.1001/jama.298.15.1752-a",
				"journalAbbreviation": "JAMA",
				"date": "2007;"
			},	
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Stephenson",
						"firstName": "Joan"
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/5177/jwm70004_2578_2578.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Yellow Fever Initiative",
				"DOI": "10.1001/jama.297.23.2578-a",
				"journalAbbreviation": "JAMA",
				"date": "2007;"
			},	
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "DeAngelis",
						"firstName": "Catherine"
					},
					{	
						"1": "",
						"lastName": "Fontanarosa",
						"firstName": "Phil"
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/5161/jed70027_2139_2140.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "JAMA 's Contributing Writers",
				"DOI": "10.1001/jama.297.19.2139",
				"journalAbbreviation": "JAMA",
				"date": "2007;"
			},	
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Klompas",
						"firstName": "Michael"
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/5140/jrc70002_1583_1593.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Does This Patient Have Ventilator-Associated Pneumonia?",
				"DOI": "10.1001/jama.297.14.1583",
				"journalAbbreviation": "JAMA",
				"date": "2007;"
			},	
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Spiro",
						"firstName": "David"
					},
					{	
						"1": "",
						"lastName": "Tay",
						"firstName": "Khoon-Yen"
					},
					{	
						"2": "",
						"lastName": "Arnold",
						"firstName": "Donald"
					},
					{	
						"3": "",
						"lastName": "Dziura",
						"firstName": "James"
					},
					{	
						"4": "",
						"lastName": "Baker",
						"firstName": "Mark"
					},
					{	
						"5": "",
						"lastName": "Shapiro",
						"firstName": "Eugene"
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/5036/JOC60114.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Wait-and-See Prescription for the Treatment of Acute Otitis Media A Randomized Controlled Trial",
				"DOI": "10.1001/jama.296.10.1235",
				"journalAbbreviation": "JAMA",
				"date": "2006;"
			},	
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Coffey",
						"firstName": "Donald"
					},
					{	
						"1": "",
						"lastName": "Getzenberg",
						"firstName": "Robert"
					},
					{	
						"2": "",
						"lastName": "DeWeese",
						"firstName": "Theodore"
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/5312/JCO60020.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Hyperthermic Biology and Cancer Therapies A Hypothesis for the “Lance Armstrong Effect”",
				"DOI": "10.1001/jama.296.4.445",
				"journalAbbreviation": "JAMA",
				"date": "2006;"
			},	
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Markel",
						"firstName": "Howard"
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/5029/JCO60015.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Dr Osler's Relapsing Fever",
				"DOI": "10.1001/jama.295.24.2886",
				"journalAbbreviation": "JAMA",
				"date": "2006;"
			},	
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "McHugh",
						"firstName": "Paul"
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/4977/JCO50008.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Striving for Coherence Psychiatry’s Efforts Over Classification",
				"DOI": "10.1001/jama.293.20.2526",
				"journalAbbreviation": "JAMA",
				"date": "2005;"
			},	
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Wise",
						"firstName": "Robert"
					},
					{	
						"1": "",
						"lastName": "Iskander",
						"firstName": "John"
					},
					{	
						"2": "",
						"lastName": "Pratt",
						"firstName": "R."
					},
					{	
						"3": "",
						"lastName": "Campbell",
						"firstName": "Scott"
					},
					{	
						"4": "",
						"lastName": "Ball",
						"firstName": "Robert"
					},
					{	
						"5": "",
						"lastName": "Pless",
						"firstName": "Robert"
					},
					{	
						"6": "",
						"lastName": "Braun",
						"firstName": "M."
					}
				],		
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/4947/JOC40127.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Postlicensure Safety Surveillance for 7-Valent Pneumococcal Conjugate Vaccine",
				"DOI": "10.1001/jama.292.14.1702",
				"journalAbbreviation": "JAMA",
				"date": "2004;"
			},	
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"firstName": ""
					}
				],		 
				"attachments": [
					{
						"0": "",
						"title": "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/4934/jwr0707-1-1.pdf?resultClick=3",
						"mimeType": "application/pdf"
					}
				],	
				"title": "Fatal Cases of Rocky Mountain Spotted Fever in Family Clusters—Three\nStates, 2003",
				"DOI": "10.1001/jama.292.1.31",
				"journalAbbreviation": "JAMA",
				"date": "2004;",
			}	
		]
	},
	{
		"type": "web",
		"url": "http://jama.jamanetwork.com/article.aspx?articleid=187776&resultClick=24",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"lastName": "Feldman",
						"firstName": "Mark"
					}
				],
				"attachments": [
					{
						"0": "",
						'title': "Full Text PDF",
						"url": "http://jama.jamanetwork.com/data/Journals/JAMA/4569/JBR80027.pdf",
						"mimeType": "application/pdf"
					}
				],		
				"title": "Role of Seroconversion in Confirming Cure of Helicobacter pylori Infection"
			}	
		]		
	}
]
/** END TEST CASES **/


	PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb, testCases: testCases });
}());