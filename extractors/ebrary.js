(function(){
	var translatorSpec =
{
	"translatorID": "58bcb958-eb01-42e5-9247-fc5604bf5904",
	"label": "ebrary",
	"creator": "PME Team",
	"target": "^https?://site\\.ebrary\\.com/lib//.*/(search|docDetail).action",
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

	function doWeb(doc, url, pdfUrl) {

	}

PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb });
}());