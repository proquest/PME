(function(){
	var translatorSpec =
	{
		"translatorID": "74740e56-5325-493b-8e70-44c0f854fbe9",
		"label": "SIRS",
		"creator": "PME Team",
		"target": "^https?://sks.sirs.com/cgi-bin/(hst-sub-display|hst-article-display).*",
		"priority": 100,
		"translatorType": 4,
		"browserSupport": "gcsibv",
		"lastUpdated": "2013-09-04 12:34:56"
	};

	function importSingle(doc) {
		//TODO
	}

	function importSearchPage(doc) {
		var results = PME.Util.xpath(doc, '//div[@class="result normal-document"]');
		PME.Util.each(results, function(result) {
			var itemType = "journalArticle",
				typeImage = PME.Util.xpathText(result, './/div[@class="result-icon"]/a/img/@src');

			if (typeImage.indexOf("magazines") > -1)
				itemType = "magazineArticle";
			else if (typeImage.indexOf("newspapers") > -1)
				itemType = "newspaperArticle";

			var item = new PME.Item(itemType);

			item.title = PME.Util.xpathText(result, './/div[@class="line1"]/a');

			var author = PME.Util.xpathText(result, './/div[@class="line1"]/span[@class="author"]');
			if (author) {
				//these always start with ', '
				author = author.substring(2);
				item.creators = [author]; //if there are multiple authors we won't be able to reliably parse them
			}

			item.publicationTitle = PME.Util.xpathText(result, './/div[@class="line1"]/span[@class="pub"]');

			var line2Fields =  PME.Util.map(PME.Util.xpathText(result, './/div[@class="line2"]').split("|"), function(field) {
				return field.trim();
			});

			if (line2Fields[0].match(/.*\d{4,}.*/))
				item.date = line2Fields[0];

			if (line2Fields[1].indexOf('pg.') == 0) {
				item.pages = line2Fields[1].substring(3);
			}

			item.complete();

		});
	}


	function detectWeb(url) {
		if (url.indexOf("hst-article-display") > -1)
			return "single";

		if (url.indexOf("hst-sub-display") > -1)
			return "multiple";
	}


	function doWeb(doc, url) {
		var type = detectWeb(url);

		if (type == "single")
			importSingle(doc);
		else if (type == "multiple")
			importSearchPage(doc);
	}


	PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb });
}());
