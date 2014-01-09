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
	function doWeb(doc, url) {
		var results = PME.Util.xpath(doc, '//ul[@class="sr-list al-article-box al-normal"]/li[@class="sri-module al-article-items"]');
		//pdf
		PME.Util.each(results, function (result) {
			var item = new PME.Item('journalArticle');
			item.title = PME.Util.xpathText(result, './/h4[@class="sri-title customLink al-title"]/a');
			var authors = PME.Util.xpathText(result, './/cite[@class="sri-authors al-authors-list"]');
			authors = authors.split('; ');
			item.creators = [];
			for(var i = 0; i < authors.length; i++){
				authors[i] = authors[i].split(',')//first m. last, suffix
				authors[i] = authors[i][0].split(' ')
				item.creators.push({lastName: authors[i][authors[i].length-1], firstName: authors[i][0]});
			}
			var source = PME.Util.xpathText(result, './/div[@class="sri-expandedView"]/p[@class="sri-source al-cite-description"]');
			source = source.split(' doi: ');
			item.DOI = source[1];
			source = source[0].replace(/\./,'').split(' ');
			item.journalAbbreviation = source[0];
			item.date = source[1];
			source = source[2].split(/\(|\)|:/);
			item.volume = source[0];
			item.issue = source[1];
			item.pages = source[2];
			var pdf = PME.Util.xpathText(result, './/div[@class="sri-pdflink al-other-resource-links"]/p[@class="sri-source al-cite-description"]/a/@href');
			item.attachments.push({
				title: 'Full Text PDF',
				url: pdf,
				mimeType: 'application/pdf'
			});
			item.complete();
		});
	}

	PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb });
}());