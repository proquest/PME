(function () {
	var translatorSpec =
	{
		"translatorID": "962a5076-eb30-408c-89d1-7d3b8c10c0ef",
		"label": "DOI",
		"creator": "PME",
		"target": "doi",
		"minVersion": "1.0.0",
		"maxVersion": "",
		"priority": 100,
		"inRepository": true,
		"translatorType": 3,
		"browserSupport": "gcsv",
		"lastUpdated": "2013-12-19 21:36:25"
	}
	function doImport () {
		PME.Util.HTTP.doProxyJSONP("http://www.crossref.org/openurl/?url_ver=Z39.88-2004&rft_id=info:doi/" + doi + "&noredirect=true&req_dat=refw:refw918",
			function(data){
				if(data && data['results'] && data['results'][0]){
					var node = DOMParser.parseFromString(data['results'][0]);
					var item = new PME.Item();
					getMeta("title", "crossref_result/query_result/body/query/article_title", node, item);
					getAuthors("crossref_result/query_result/body/query/contributors/contributor", node, item, {"firstName":"given_name","lastName":"surname"});
					getMeta("volume", "crossref_result/query_result/body/query/volume", node, item);
					getMeta("issue", "crossref_result/query_result/body/query/issue", node, item);
					getMeta("date", "crossref_result/query_result/body/query/year", node, item);
					getMeta("publicationTitle", "crossref_result/query_result/body/query/journal_title", node, item);
					getMeta("ISSN", "crossref_result/query_result/body/query/issn", node, item);
					getMeta("DOI", "crossref_result/query_result/body/query/doi", node, item);
					getMeta("pages", "crossref_result/query_result/body/query/first_page", node, item);
				}
			});
	}
	function getMeta(selector, property, node, item){
		item[property] = PME.Util.xpathText(node, selector);
	}
	function getAuthors(selector, node, item, firstName, lastName){
		//loop on selector
		var authors = PME.Util.xpath(node, selector);
		for (var i = 0; i < authors.length; i++) {
			authors[i] = {"firstName":PME.Util.xpathText(authors[i]+"/"+ firstName),"lastName": PME.Util.xpathText(authors[i] + "/" + lastName)};
		}
	}
	PME.TranslatorClass.loaded(translatorSpec, {"doImport": doImport});
}());