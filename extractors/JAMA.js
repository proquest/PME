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
			item.DOI = source[1];
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

	PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb });
}());