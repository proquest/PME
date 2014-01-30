(function(){
var translatorSpec = {
	"translatorID": "db935268-34d1-44f8-a6ee-52a178d598a2",
	"label": "DOAJ",
	"creator": "PME Team",
	"target": "https?://.*\\.?doaj\\.org",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-09-25 16:42:33"
}

function doWeb(doc, url) {
	console.log('test')
    var results = PME.Util.xpath(doc, '//div[@id="facetview_results"]//td');
	console.log(results.length)
	PME.Util.each(results, function (result) {console.log('row')
		var item = new PME.Item('journalArticle');
        var resulttext = PME.Util.getNodeText(result);
		console.log(resulttext)
    });
}

PME.TranslatorClass.loaded(translatorSpec, { doWeb: doWeb });
}());