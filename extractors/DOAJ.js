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

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://doaj.org/search?source={%22query%22:{%22query_string%22:{%22query%22:%22cancer%22,%22default_operator%22:%22AND%22}}}#.UznaJq1dUUU",
		"items": [
			{	
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"firstName": "Ellberg",
						"lastName": "Carolina"
					},
					{	
						"1": "",
						"firstName": "Olsson",
						"lastName": "Håkan"
					}	
				],
				"title": "Breast cancer patients with lobular cancer more commonly have a father than a mother diagnosed with cancer",
				"publisher": "BioMed Central",
				"publicationDate": "2011 November",
				"publicationTitle": "BMC Cancer",
				"volume": "11",
				"issue": "1",
				"pages": "497",
				"ISSN": "1471-2407",
				"DOI": "10.1186/1471-2407-11-497",
				"place": "United Kingdom"
			},
			{
				"itemType": "journalArticle",
				"title": "Cancer Control : Journal of the Moffitt Cancer Center",
				"publisher": "Moffitt Cancer Center",
				"ISSN": "1073-2748, 1526-2359",
				"place": "United States",
			},
			{	
				"itemType" : "journalArticle",
				"title" : " Cancer Medicine",
				"publisher" : "Wiley",
				"ISSN" : "2045-7634",
				"place" : "United Kingdom"
			},
			{	
				"itemType": "journalArticle",
				"title": "Chinese Journal of Cancer",
				"publisher": "Sun Yat-sen University Cancer Center",
				"ISSN": "1000-467X, 1944-446X",
				"place": "China"
			},	
			{
				"itemType" : "journalArticle",
				"title" : " Ecancermedicalscience",
				"publisher" : "Cancer Intelligence",
				"ISSN" : "1754-6605",
				"place" : "United Kingdom"
			},	
			{
				"itemType": "journalArticle",
				"title": "Journal of Tumor",
				"publisher": "ACT Publishing Group Liminted",
				"ISSN": "1819-6187",
				"place": "Hong Kong"
			},
			{
				"itemType": "journalArticle",
				"title": "Middle East Journal of Cancer",
				"publisher": "Shiraz University of Medical Sciences",
				"ISSN": "2008-6709, 2008-6687",
				"place": "Iran, Islamic Republic of",
			},
			{
				"itemType": "journalArticle",
				"title" : " Open Colorectal Cancer Journal",
				"publisher" : "Bentham open",
				"ISSN" : "1876-8202",
				"place" : "United States"
			},	
			{
				"itemType": "journalArticle",
				"creators": [
					{	
						"0": "",
						"firstName": "Wen-liang",
						"lastName": "Zhang"
					}	
				],
				"title": "The Role of Inflammation in Breast Cancer and Prostate Cancer",
				"publisher": "Cancer Biology &amp; Medicine",
				"publicationDate": "2011 June",
				"publicationTitle": "Cancer Biology &amp; Medicine",
				"volume": "8",
				"issue": "2",
				"pages": "77-84",
				"ISSN": "2095-3941",
				"DOI": "10.1007/s11805-011-0562-z",
				"place": "China"
			},
			{	
				"itemType": "journalArticle",
				"creators": [
					{
						"0": "",
						"firstName": "Wanqing",
						"lastName": "Chen"
					},
					{	
						"1": "",
						"firstName": "Rongshou",
						"lastName": "Zheng"
					},	
					{
						"2": "",
						"firstName": "Siwei",
						"lastName": "Zhang"
					},
					{	
						"3": "",
						"firstName": "Ping",
						"lastName": "Zhao"
					},
					{	
						"4": "",
						"firstName": "Guanglin",
						"lastName": "Li"
					},
					{	
						"5": "",
						"firstName": "Lingyou",
						"lastName": "Wu"
					},
					{	
						"6": "",
						"firstName": "Jie",
						"lastName": "He"
					}	
				],
				"title": "The incidences and mortalities of major cancers in China, 2009",
				"publisher": "Sun Yat-sen University Cancer Center",
				"publicationDate": "2013  March",
				"publicationTitle": "Chinese Journal of Cancer",
				"volume": "32",
				"issue": "3",
				"pages": "106-112",
				"ISSN": "1000-467X, 1944-446X",
				"DOI": "10.5732/cjc.013.10018",
				"place": "China"
			}
		]		
	}
]
/** END TEST CASES **/

PME.TranslatorClass.loaded(translatorSpec, { doWeb: doWeb, testCases: testCases });
}());