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
var mapping = {
	"Authors":"creators",
	"Publisher": "publisher",
	"Date of publication": "publicationDate",
	"Published in": "source",
	"ISSN(s)": "ISSN",
	"DOI": "DOI",
	"Country of publication": "place"
};
function doWeb(doc, url) {
    var results = PME.Util.xpath(doc, '//table[@id="facetview_results"]//td');
	PME.Util.each(results, function (result) {
		var item = new PME.Item('journalArticle');
		item.title = PME.Util.xpathText(result,'.//span[@class="title"]')
        var fields = result.innerHTML.split('<br>');
		for(var i = 0; i < fields.length; i++){
			if(fields[i].indexOf('<strong>') == 0){
				var field = fields[i].replace(/<\/?strong>/g, '').split(/: ?/);
				var fieldType = mapping[field.splice(0,1)[0]], fieldValue = field.join('');
				switch(fieldType){
					case "creators":
						item[fieldType] = PME.Util.parseAuthors(fieldValue,{authorDelimit:',', authorFormat:'first middle last'});
						break;
					case "source":
						parseSource(fieldValue,item);
						break;
					case undefined:
						break;
					default:
						item[fieldType] = PME.Util.trim(fieldValue.replace(/<.+?>/g,''));
				}

			}
		}
		item.complete();
    });
}
function parseSource(values,item) {
	values = values.split(/, ?/);
	for(var i = 0; i < values.length; i++) {
		if(values[i].toLowerCase().indexOf('iss') == 0) {
			item.issue = PME.Util.trim(values[i].replace(/[^\d]/g,''));
		}
		else if (values[i].toLowerCase().indexOf('vol') == 0) {
			item.volume = PME.Util.trim(values[i].replace(/[^\d]/g, ''));
		}
		else if (values[i].toLowerCase().indexOf('pp') == 0) {
			item.pages = PME.Util.trim(values[i].replace(/\(\d+\)|[^\d-]/g, ''));

		}
		else if(! item.publicationTitle){
			item.publicationTitle = PME.Util.trim(values[i]);
		}
	}
}
PME.TranslatorClass.loaded(translatorSpec, { doWeb: doWeb });
}());