(function () {
	var translatorSpec = {
		"translatorID": "6258ad6a-a789-409e-b01a-c41776db8650",
		"label": "SAGE",
		"creator": "PME",
		"lastUpdated": "03/24/2014"
	}
	var url_, doc_;

	function handleCreators(subset, selectors, attr)
	{
		var jAuthors = $(selectors, subset);
		var authors = [];//(attr ? jAuthors.attr(attr) : jAuthors.text()).split(', ');
		if (jAuthors.size() == 0)
			return [];

		var creators = [];
		for (var i = 0; i < jAuthors.size(); i++)
		{
			//first m. last, suffix - we just drop the suffix, we'll always have at least one element
			authors[i] = jAuthors.eq(i).text().split(',')[0];//first m. last jr, suffix

			if (authors[i].indexOf(' ') >= 0)
			{
				authors[i] = $.trim(authors[i]).replace(/ (s|j)r\.?$/i, '').split(' ')
				creators.push({ lastName: authors[i][authors[i].length - 1], firstName: authors[i][0] });
			}
			else
				creators.push({ firstName: authors[i] });
		}
		return creators;
	}

	function pageType()
	{
		if (url_.match("/knowledge\.sagepub\.com"))
		{
			if (url_.match(/\/view/))
				return 'knowledgesingle';
			if (url_.match(/\/browse/))
				return 'knowledgelist';
		}
		if (url_.match(/\/books\/Book\d*/))
			return 'single';
		if(url_.match(/\/productSearch/i))
			return 'list';
	}

	function doSingle()
	{
		PME.debug('\nsingle');
		var item = new PME.Item('book');
		var set = $("#title", doc_);
		item.title = $.trim($('h2, h3', set).text());
		item.creators = handleCreators(set, "#authorTbl td.col1");
		item.edition = $.trim($('>em', set).text().replace(/edition/i, ''));
		var infoset = $("#infoTbl", set);
		item.date = $.trim($("td.col1", infoset).text().replace(String.fromCharCode(169), ''));//'©'
		item.pages = $.trim($("td.col2", infoset).text().replace(/pages/i, ''));
		item.publisher = $.trim($("td.col3", infoset).text());
		item.ISBN = $("#detailsTbl td:contains('ISBN')~td:first").text();
		item.abstractNote=$.trim($("#description").text());
		item.complete();
	}

	function doList(selector)
	{
		PME.debug('\nlist');
		var URLs = [];
		$(selector).each(function ()
		{
			URLs.push(window.location.protocol + '//' + window.location.host + $(this).attr('href'));
		});
		PME.Util.processDocuments(URLs, doWeb);

	}

	function text(selector, jsubset)
	{
		return $.trim($(selector, jsubset).clone().children().remove().end().text());
	}

	function doKSingle()
	{
		PME.debug('\nknowledge single');
		var item = new PME.Item('book');
		var set = $("#topWrapper", doc_);
		item.title = $.trim($('#bookTitle', set).text());
		item.creators = handleCreators(set, "#authors a");
		var infoset = $("div.contentData", set);
		item.date = text("#onlinePubDate", infoset);
		item.DOI = text("#_doi a", infoset).replace("http://dx.doi.org/", "");
		item.publisher = text("strong:contains('Publisher')~span", infoset);
		item.ISBN = text("#_oisbn", infoset);

		//item.abstractNote could be taken from $('>a', infoset).attr('href'), 
		//however I am getting the 500 error trying to get to this location with $.ajax
		//maybe there is another way

		item.complete();

	}

	function detectWeb(doc, url) {
		//not used
	}
	function doWeb(doc, url)
	{
		PME.debug('\n--------------------SAGE-----------------------')

		doc_ = doc;
		url_ = url;

		switch (pageType())
		{
			case 'single':
				doSingle();
				break;
			case 'list':
				doList('#resultsTbl #title a');
				break;
			case 'knowledgesingle':
				doKSingle();
				break;
			case 'knowledgelist':
				doList('li div.result>a');
				break;
		}
	}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.sagepub.com/books/Book235128",
		"items": [
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Rowe",
						"firstName" : "W."
					},
					{
						"1" : "",
						"lastName" : "Guerrero",
						"firstName" : "Laura"
					}
				],		
				"title" : "Cases in Leadership",
				"edition" : "Third",
				"date" : "2013",
				"pages" : "528",
				"publisher" : "SAGE Publications, Inc",
				"ISBN" : "9781452234977",
				"abstractNote" : "The Richard Ivey School of Business and SAGE have come together again to provide a distinctive collection of real-world leadership casesCases in Leadership, Third Edition, is a unique collection combining 32 real-world leadership cases from Ivey Publishing with 16 practitioner readings (primarily from the Ivey Business Journal). This updated casebook helps you gain a better understanding of leadership, which will be invaluable to you throughout your career. Each of the selected cases is about complex leadership issues that require the attention of the decision maker."
			}

		]
	},
	{
		"type": "web",
		"url": "http://knowledge.sagepub.com/view/100-methods-for-total-quality-management/SAGE.xml?rskey=TkH2uR&row=1",
		"items": [
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Kanji",
						"firstName" : "Gopal"
					},
					{
						"1" : "",
						"lastName" : "Asher",
						"firstName" : "Mike"
					}
				],	
				"title" : "100 Methods for Total Quality Management",
				"date" : "December 20, 2013",
				"DOI" : "10.4135/9781446280164",
				"publisher" : "SAGE Publications Ltd",
				"ISBN" : "9781446280164"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sagepub.com/productSearch.nav?course=Course12&sortBy=defaultPubDate%20desc",
		"items": [
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Wong",
						"firstName" : "Daniel"
					},
					{
						"1" : "",
						"lastName" : "Hall",
						"firstName" : "Kimberly"
					},
					{
						"2" : "",
						"lastName" : "Justice",
						"firstName" : "Cheryl"
					},
					{
						"3" : "",
						"lastName" : "Hernandez",
						"firstName" : "Lucy"
					}
				],	
				"title" : "Counseling Individuals Through the Lifespan",
				"date" : "January 2015",
				"pages" : "",
				"publisher" : "SAGE Publications, Inc"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Braithwaite",
						"firstName" : "Dawn"
					},
					{	
						"1" : "",
						"lastName" : "Schrodt",
						"firstName" : "Paul"
					}
				],		
				"title" : "Engaging Theories in Interpersonal Communication\n\t\t\n\t\t\t\tMultiple Perspectives\n\t\t\n\t\t\n\t\t\t\n\t\t\t\t\n\t\t\t\t\n\t\t\t\t\tSecond Edition",
				"date" : "November 2014",
				"pages" : "448",
				"publisher" : "SAGE Publications, Inc"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Bartol",
						"firstName" : "Curt"
					},
					{	
						"1" : "",
						"lastName" : "Bartol",
						"firstName" : "Anne"
					}
				],		
				"title" : "Forensic Psychology\n\t\t\n\t\t\t\tResearch and Applications\n\t\t\n\t\t\n\t\t\t\n\t\t\t\t\n\t\t\t\t\n\t\t\t\t\tFourth Edition",
				"date" : "October 2014",
				"pages" : "592",
				"publisher" : "SAGE Publications, Inc"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Privitera",
						"firstName" : "Gregory"
					}
				],	
				"title" : "Getting Into Graduate School\n\t\t\n\t\t\t\tA Comprehensive Guide for Psychology and the Behavioral Sciences",
				"date" : "July 2014",
				"pages" : "232",
				"publisher" : "SAGE Publications, Inc"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Lynn",
						"firstName" : "Steven"
					},
					{
						"1" : "",
						"lastName" : "O'Donohue",
						"firstName" : "William"
					},
					{
						"2" : "",
						"lastName" : "Lilienfeld",
						"firstName" : "Scott"
					}
				],	
				"title" : "Health, Happiness, and Well-Being\n\t\t\n\t\t\t\tBetter Living Through Psychological Science",
				"date" : "September 2014",
				"pages" : "424",
				"publisher" : "SAGE Publications, Inc"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Schug",
						"firstName" : "Robert"
					},
					{
						"1" : "",
						"lastName" : "Fradella",
						"firstName" : "Henry"
					}
				],	
				"title" : "Mental Illness and Crime",
				"date" : "August 2014",
				"pages" : "600",
				"publisher" : "SAGE Publications, Inc"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Holden",
						"firstName" : "George"
					}
				],		
				"title" : "Parenting\n\t\t\n\t\t\t\tA Dynamic Perspective\n\t\t\n\t\t\n\t\t\t\n\t\t\t\t\n\t\t\t\t\n\t\t\t\t\tSecond Edition",
				"date" : "October 2014",
				"pages" : "440",
				"publisher" : "SAGE Publications, Inc"
			},
			{	
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Hastie",
						"firstName" : "Reid"
					},
					{
						"1" : "",
						"lastName" : "Dawes",
						"firstName" : "Robyn"
					}
				],	
				"title" : "Rational Choice in an Uncertain World\n\t\t\n\t\t\t\tThe Psychology of Judgment and Decision Making\n\t\t\n\t\t\n\t\t\t\n\t\t\t\t\n\t\t\t\t\n\t\t\t\t\tThird Edition",
				"date" : "July 2015",
				"pages" : "408",
				"publisher" : "SAGE Publications, Inc"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Privitera",
						"firstName" : "Gregory"
					}
				],	
				"title" : "Statistics for the Behavioral Sciences",
				"edition" : "Second",
				"date" : "August 2014",
				"pages" : "776",
				"publisher" : "SAGE Publications, Inc"
			},
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Privitera",
						"firstName" : "Gregory"
					}
				],	
				"title" : "Student Study Guide With SPSS Workbook for Statistics for the Behavioral Sciences",
				"edition" : "Second",
				"date" : "August 2014",
				"pages" : "488",
				"publisher" : "SAGE Publications, Inc"
			}
		]
	}
]	
/** END TEST CASES **/


	PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb, testCases: testCases });
}());