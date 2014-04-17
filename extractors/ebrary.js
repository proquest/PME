(function(){
	var translatorSpec =
{
	"translatorID": "58bcb958-eb01-42e5-9247-fc5604bf5904",
	"label": "ebrary",
	"creator": "PME Team",
	"target": "^https?://site\\.ebrary\\.com/lib/.*/(search|docDetail)\\.action",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-07-10 16:42:33"
};

	function detectWeb(doc, url) {
		//not needed for PME yet
	}

	function doWeb(doc, url) {

		var results = PME.Util.xpath(doc, '//div[@class="book_item"]//div[@class="book_detail"]//a[@class="title"]/@href');

		if (results.length == 0) {
			//reader page:
			doImportFromURL(url);
		} else {
			for (var i = 0; i < results.length; i++) {
				var resultURL = PME.Util.getNodeText(results[i]);
				PME.debug("result url: " + resultURL);
				doImportFromURL(resultURL);
			}
		}

		/*
		 search page:
		 	ids: //div[@class="book_item"]//div[@class="book_detail"]//a[@class="title"]/@href then docID=10363074
		 */

	}

	function doImportFromURL(url) {
		var docID = url.match(/docID=.+?(&|$)/)[0];
		var lib = "myproquest"; //TODO: parse from url
		var newurl = window.location.protocol+"//site.ebrary.com/lib/" + lib + "/biblioExport.action?refworks=1&" + docID;
		PME.Util.HTTP.doGet(newurl, function(text) {
			var translator = PME.loadTranslator("import");
			translator.setTranslator("1a3506da-a303-4b0a-a1cd-f216e6138d86"); //RefWorks Tagged Format
			translator.setString(text);
			translator.setHandler("itemDone", function (obj, item) {
				item.complete();
			});
			translator.translate();
		});
	}

var testCases = [
	{
		"type": "web",
		"url": "http://site.ebrary.com/lib/myproquest/search.action?p00=cancer&fromSearch=fromSearch&search=Search",
		"items": [

		]
	}
]	
/** END TEST CASES **/	

PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb, testCases: testCases });
}());