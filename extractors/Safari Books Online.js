(function(){
var translatorSpec =
{
	"translatorID": "ec491fc2-10b1-11e3-99d7-1bd4dc830245",
	"label": "Safari Books Online",
	"creator": "PME Team",
	"target": "^https?://([^\\.]+)\\.safaribooksonline.com/(browse|book/)",
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
	if (url.indexOf("safaribooksonline.com/browse") > -1) {
		// there are tabs in the browse section, current tab is stored in State cookie
		// searchview=__ is included only on the non-books tab
		if (unescape(document.cookie).indexOf("searchview=") == -1)
			return "multiple";
	}
	else if (url.indexOf("safaribooksonline.com/book/") > -1)
		return "book";
}


function doWeb(doc, url) {
	var type = detectWeb(doc, url);

	if (type == "book")
		importBook(doc, url);
	else if (type == "multiple")
		importBrowsePage(doc, url);
}


PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb });
}());
