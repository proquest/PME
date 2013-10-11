(function(){
var translatorSpec = {
	"translatorID": "db935268-34d1-44f8-a6ee-52a178d598a2",
	"label": "DOAJ",
	"creator": "PME Team",
	"target": "https?://.*\\.?doaj\\.org/doaj\\?func=(search|issueTOC|advancedSearch)",
	"minVersion": "2.1.9",
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
    var results = PME.Util.xpath(doc, '//div[@id="result"]//abbr[@class="unapi-id"]/@title');
    for (var i = 0; i < results.length; i++) {
        var resultId = PME.Util.getNodeText(results[i]);
        PME.Util.HTTP.doGet("http://"+ window.location.host+"/doaj?func=export&uiLanguage=en&application=referenceManager&query="+ resultId, function (text) {
            var translator = PME.loadTranslator("import");
            translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7"); //RIS Format
            translator.setString(text);
            translator.setHandler("itemDone", function (obj, item) {
                item.complete();
            });
            translator.translate();
        });
    }
}

PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb });
}());