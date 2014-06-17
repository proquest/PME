(function(){
var translatorSpec =
{
	"translatorID": "ec491fc2-10b1-11e3-99d7-1bd4dc830245",
	"label": "Safari Books Online",
	"creator": "PME Team",
	"target": "^https?://([^\\.]+)\\.safaribooksonline.com/(browse|search|category/|publisher/|alltitles|book/|[0-9]{10,}|)",
	"priority": 100,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-08-29 12:34:56"
};


function mapSBOProp(item, sboProp, value) {
	var mapping = {
			name: "title",
			author: "creators",
			inLanguage: "language",
			publisher: "publisher",
			datePublished: "date",
			bookEdition: "edition",
			isbn: "ISBN",
			numberOfPages: "pages",
			description: "abstractNote"
		},
		pmeProp = mapping[sboProp];

	value = PME.Util.trim(value);

	if (pmeProp) {
		if (item[pmeProp] && (typeof item[pmeProp] == "object") && ("length" in item[pmeProp]))
			item[pmeProp].push(value);
		else
			item[pmeProp] = value;
	}
	else
		PME.debug("ignored sbo property " + sboProp + " = " + value);
}


function importBook(doc, url) {
	// if we're not on the book page itself but some sub-page (likely a reader page)
	// then we try and process the book root page
	var parts = url.match(/(.+)\/([0-9]{10,13})\/?(.*)/);
	if (parts && parts[3]) {
		// parts 1 and 2 are the full url up to and including the book id
		PME.Util.processDocuments([parts[1] + "/" + parts[2]], importBook);
		return;
	}

	var item = new PME.Item("book");

	// itemprops
	var	props = PME.Util.xpath(doc, '//*[@itemprop]');

	PME.Util.each(props, function(prop) {
		var pname = prop.attributes["itemprop"].value,
			pvalue = PME.Util.getNodeText(prop);
		
		// authors are handled using the lower-level method
		if (pname != "author")
			mapSBOProp(item, pname, pvalue);
	});

	// the less consistent metadata fields
	var dataItems = PME.Util.xpath(doc, '//ul[@class="metadatalist"]//p[contains(@class,"data")]');

	PME.Util.each(dataItems, function(field) {
		var field = PME.Util.getNodeText(field),
			label = PME.Util.trim(field.substr(0, field.indexOf(":"))).toLowerCase(),
			value = PME.Util.trim(field.substr(field.indexOf(":") + 1));

		if (label == "by") {
			PME.Util.each(value.split(";"), function(author) {
				author = PME.Util.trim(author);

				if (author)
					mapSBOProp(item, "author", author);
			});
		}
	});

	// we need a title at least
	if (item.title)
		item.complete();
}


function importBrowsePage(doc, url) {
	var urls = PME.Util.xpath(doc, '//p[contains(@class,"bookTitle")]/a/@href');
	urls = PME.Util.map(urls, PME.Util.getNodeText);

	PME.Util.processDocuments(urls, importBook);
}


function detectWeb(doc, url) {
	if (url.indexOf("safaribooksonline.com/book/") > -1 || location.href.match(/safaribooksonline\.com\/[0-9]+/))
		return "book";

	// not a single book so we're in a resultlist (url: browse or category/ or publisher/ or alltitles)
	// there are tabs in the result list, current tab is stored in State cookie
	// searchview=__ is included only on the non-books tabs (so far only video exists)
	if (unescape(document.cookie).indexOf("searchview=") == -1)
		return "multiple";
}


function doWeb(doc, url) {
	var type = detectWeb(doc, url);

	if (type == "book")
		importBook(doc, url);
	else if (type == "multiple")
		importBrowsePage(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://proquestcombo.safaribooksonline.com/book/programming/java/9781935182351?bookview=overview",
		"items": [
			{
				"itemType" : "book",
				"creators" : [
					"Craig Walls"
				],	
				"title" : "Spring in Action, Third Edition",
				"publisher" : "Manning Publications",
				"date" : "June 29, 2011",
				"ISBN" : "978-1-935182-35-1",
				"pages" : "424",
				"edition" : "Third Edition",
				"language" : "en",
				"abstractNote" : "Summary\n\t\n\t\t\n\t\t\n\tTotally revised for Spring 3.0, this book is a hands-on guide to the Spring Framework. It covers the latest features, tools, and practices including Spring MVC, REST, Security, Web Flow, and more. Following short code snippets and an ongoing example developed throughout the book, you'll learn how to build simple and efficient J2EE applications.\n\n\t\t\n\t\t\t\n\t\tAbout the Technology\n\t\n\t\t\n\t\t\n\tSpring Framework is required knowledge for Java developers, and Spring 3.0 introduces powerful new features like SpEL, the Spring Expression Language, new annotations for the IoC container, and much-needed support for REST. Whether you're just discovering Spring or you want to absorb the new 3.0 features, there's no better way to master Spring than this book.\n\n\t\t\n\t\t\t\n\t\tAbout the Book\n\t\n\t\t\n\t\t\n\t\t\t\n\t\tSpring in Action, Third Edition\n\t\n\tcontinues the practical, hands-on style of the previous bestselling editions. Author Craig Walls has a special knack for crisp and entertaining examples that zoom in on the features and techniques you really need. This edition highlights the most important aspects of Spring 3.0 including REST, remote services, messaging, Security, MVC, Web Flow, and more.\n\n\t\t\n\tPurchase includes free PDF, ePub, and Kindle eBooks downloadable at manning.com."
			}
		]
	},
	{
		"type": "web",
		"url": "http://proquestcombo.safaribooksonline.com/browse?te=&query=CATEGORY+itdev.programming.java&pagetitle=Java+Development&vcategory=_FEAT_.itjava&sort=hits&order=desc&__ac=_FEAT_.itjava&vte=%2c_FEAT_.%2c&__ml=",
		"items": [
			{
				"itemType" : "book",
				"creators" : [
					"Cay S. Horstmann"
				],	
				"title" : "Big Java Late Objects",
				"publisher" : "John Wiley & Sons",
				"date" : "February 1, 2012",
				"ISBN" : "1-118087-88-7",
				"pages" : "1056",
				"language" : "en",
				"abstractNote" : "Big Java: Late Objects is a comprehensive introduction to Java and computer programming, which focuses on the principles of programming, software engineering, and effective learning. It is designed for a two-semester first course in programming for computer science students."
			}
		]
	}
]
/** END TEST CASES **/

PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb, testCases: testCases });
}());
