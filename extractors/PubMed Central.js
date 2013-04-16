(function(){
var translatorSpec =
{
	"translatorID": "27ee5b2c-2a5a-4afc-a0aa-d386642d4eed",
	"label": "PubMed Central",
	"creator": "Michael Berkowitz and Rintze Zelle",
	"target": "https?://[^/]*.nih.gov/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsb",
	"lastUpdated": "2013-03-01 16:36:30"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	try {var pmid = url.match(/ncbi\.nlm\.nih\.gov\/pmc\/articles\/PMC([\d]+)/)[1];} catch (e) {}
	if (pmid) {
		return "journalArticle";
	}
	
	var uids = doc.evaluate('//div[@class="rprt"]//dl[@class="rprtid"]/dd', doc, nsResolver, XPathResult.ANY_TYPE, null);
	if(uids.iterateNext()) {
		if (uids.iterateNext()){
			return "multiple";
		}
		return "journalArticle";
	}
}

function lookupPMCIDs(ids, doc, pdfLink) {
	PME.wait();
	var newUri = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&retmode=xml&id=" + ids.join(",");
	PME.debug(newUri);
	PME.Util.HTTP.doGet(newUri, function (text) {
		text = text.replace(/(<[^!>][^>]*>)/g, function replacer(str, p1, p2, offset, s) {
			return str.replace(/-/gm, "");
		}); //Strip hyphens from element names, attribute names and attribute values
		text = text.replace(/(<[^!>][^>]*>)/g, function replacer(str, p1, p2, offset, s) {
			return str.replace(/:/gm, "");
		}); //Strip colons from element names, attribute names and attribute values
		text = text.replace(/<xref[^<\/]*<\/xref>/g, ""); //Strip xref cross reference from e.g. title
		text = PME.Util.trim(text);
		
		var parser = new DOMParser();
		var doc = parser.parseFromString(text, "text/xml");

		var articles = PME.Util.xpath(doc, '/pmcarticleset/article');

		for (var i=0; i<articles.length; ++i) {
			var newItem = new PME.Item("journalArticle");
			
			var journal = PME.Util.xpath(articles[i], 'front/journalmeta');

			newItem.journalAbbreviation = PME.Util.xpathText(journal, 'journalid[@journalidtype="nlmta"]');
			
			var journalTitle;
			if ((journalTitle = PME.Util.xpathText(journal, 'journaltitlegroup/journaltitle'))) {
				newItem.publicationTitle = journalTitle;
			} else if ((journalTitle = PME.Util.xpathText(journal, 'journaltitle'))) {
				newItem.publicationTitle = journalTitle;
			}

			var issn;
			if ((issn = PME.Util.xpathText(journal, 'issn[@pubtype="ppub"]'))) {
				newItem.ISSN = issn;
			} else if ((issn = PME.Util.xpathText(journal, 'issn[@pubtype="epub"]'))) {
				newItem.ISSN = issn;
			}

			var article = PME.Util.xpath(articles[i], 'front/articlemeta');

			var abstract;
			if ((abstract = PME.Util.xpathText(article, 'abstract/p'))) {
				newItem.abstractNote = abstract;
			} else {
				var abstractSections = PME.Util.xpath(article, 'abstract/sec');
				var abstract = [];
				for (var j=0; j<abstractSections.length; ++j) {
					abstract.push(PME.Util.xpathText(abstractSections[j], 'title') + "\n" + PME.Util.xpathText(abstractSections[j], 'p'));
				}
				newItem.abstractNote = abstract.join("\n\n");
			}

			newItem.DOI = PME.Util.xpathText(article, 'articleid[@pubidtype="doi"]');
			
			newItem.extra = "PMID: " + PME.Util.xpathText(article, 'articleid[@pubidtype="pmid"]') + "\n";
			newItem.extra = newItem.extra + "PMCID: PMC" + ids[i];

			newItem.title = PME.Util.trim(PME.Util.xpathText(article, 'titlegroup/articletitle'));
			
			newItem.volume = PME.Util.xpathText(article, 'volume');
			newItem.issue = PME.Util.xpathText(article, 'issue');

			var lastPage = PME.Util.xpathText(article, 'lpage');
			var firstPage = PME.Util.xpathText(article, 'fpage');
			if (firstPage && lastPage && (firstPage != lastPage)) {
				newItem.pages = firstPage + "-" + lastPage;
			} else if (firstPage) {
				newItem.pages = firstPage;
			}

			var pubDate = PME.Util.xpath(article, 'pubdate[@pubtype="ppub"]');
			if (!pubDate.length) {
				pubDate = PME.Util.xpath(article, 'pubdate[@pubtype="epub"]');
			}
			if (pubDate) {
				if (PME.Util.xpathText(pubDate, 'day')) {
					newItem.date = PME.Util.xpathText(pubDate, 'year') + "-" + PME.Util.xpathText(pubDate, 'month') + "-" + PME.Util.xpathText(pubDate, 'day');
				} else if (PME.Util.xpathText(pubDate, 'month')) {
					newItem.date = PME.Util.xpathText(pubDate, 'year') + "-" + PME.Util.xpathText(pubDate, 'month');
				} else if (PME.Util.xpathText(pubDate, 'year')) {
					newItem.date = PME.Util.xpathText(pubDate, 'year');
				}
			}

			var contributors = PME.Util.xpath(article, 'contribgroup/contrib');
			if (contributors) {
				var authors = PME.Util.xpath(article, 'contribgroup/contrib[@contribtype="author"]');
				for (var j=0; j<authors.length; ++j) {
					var lastName = PME.Util.xpathText(authors[j], 'name/surname');
					var firstName = PME.Util.xpathText(authors[j], 'name/givennames');
					if (firstName || lastName) {
						newItem.creators.push({
							lastName: lastName,
							firstName: firstName
						});
					}
				}
			}

			var linkurl = "http://www.ncbi.nlm.nih.gov/pmc/articles/PMC" + ids[i] + "/";
			newItem.url = linkurl;
			newItem.attachments = [{
				url: linkurl,
				title: "PubMed Central Link",
				mimeType: "text/html",
				snapshot: false
			}];
			
			if (PME.Util.xpathText(article, 'selfuri/@xlinktitle') == "pdf") {
				var pdfFileName = PME.Util.xpathText(article, 'selfuri/@xlinkhref');
			} else if (pdfLink) {
				var pdfFileName = pdfLink;
			} else if (PME.Util.xpathText(article, 'articleid[@pubidtype="publisherid"]')){
				//this should work on most multiples
				var pdfFileName = PME.Util.xpathText(article, 'articleid[@pubidtype="publisherid"]') + ".pdf";
			}
			
			if (pdfFileName) {
				var pdfURL = "http://www.ncbi.nlm.nih.gov/pmc/articles/PMC" + ids[i] + "/pdf/" + pdfFileName;
				newItem.attachments.push({
				title:"PubMed Central Full Text PDF",
				mimeType:"application/pdf",
				url:pdfURL
				});
			}

			newItem.complete();
		}

		PME.done();
	});
}



function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ?
	function (prefix) {
		if (prefix == 'x') return namespace;
		else return null;
	} : null;

	var ids = [];
	var pmcid;
	var pdfLink;
	var resultsCount = 0;
	try {
		pmcid = url.match(/ncbi\.nlm\.nih\.gov\/pmc\/articles\/PMC([\d]+)/)[1];
	} catch(e) {}
	if (pmcid) {
		try {
			var formatLinks = doc.evaluate('//td[@class="format-menu"]//a/@href|//div[@class="format-menu"]//a/@href', doc, nsResolver, XPathResult.ANY_TYPE, null);
			while (formatLink = PME.Util.getNodeText(formatLinks.iterateNext())) {
				if(pdfLink = formatLink.match(/\/pdf\/([^\/]*\.pdf$)/)) {
					pdfLink = pdfLink[1];
				}
			}
		} catch (e) {}
		ids.push(pmcid);
		lookupPMCIDs(ids, doc, pdfLink);
	} else {
		var pmcids = doc.evaluate('//div[@class="rprt"]//dl[@class="rprtid"]/dd', doc, nsResolver, XPathResult.ANY_TYPE, null);
		var titles = doc.evaluate('//div[@class="rprt"]//div[@class="title"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		var title;
		while (pmcid = pmcids.iterateNext()) {
			title = titles.iterateNext();
			ids[PME.Util.getNodeText(pmcid).match(/PMC([\d]+)/)[1]] = PME.Util.getNodeText(title);
			resultsCount = resultsCount + 1;
		}
		// Don't display selectItems when there's only one
		// The actual PMCID is the array key
		if (resultsCount == 1) {
			for (var i in ids) {
				lookupPMCIDs(i, doc);
				break;
			}
			return true;
		}
		
		
		PME.selectItems(ids, function (ids) {
			if (!ids) {
				return true;
			}
			var pmcids = [];
			for (var i in ids) {
				pmcids.push(i);
			}
			lookupPMCIDs(pmcids, doc);
		});
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pmc/articles/PMC2377243/?tool=pmcentrez",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Aoki",
						"firstName": "Takuya"
					},
					{
						"lastName": "Yamasawa",
						"firstName": "Fumihiro"
					},
					{
						"lastName": "Kawashiro",
						"firstName": "Takeo"
					},
					{
						"lastName": "Shibata",
						"firstName": "Tetsuichi"
					},
					{
						"lastName": "Ishizaka",
						"firstName": "Akitoshi"
					},
					{
						"lastName": "Urano",
						"firstName": "Tetsuya"
					},
					{
						"lastName": "Okada",
						"firstName": "Yasumasa"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "PubMed Central Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "PubMed Central Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"journalAbbreviation": "Respir Res",
				"publicationTitle": "Respiratory Research",
				"ISSN": "1465-9921",
				"abstractNote": "Background\nThe patient population receiving long-term oxygen therapy has increased with the rising morbidity of COPD. Although high-dose oxygen induces pulmonary edema and interstitial fibrosis, potential lung injury caused by long-term exposure to low-dose oxygen has not been fully analyzed. This study was designed to clarify the effects of long-term low-dose oxygen inhalation on pulmonary epithelial function, edema formation, collagen metabolism, and alveolar fibrosis.\n\nMethods\nGuinea pigs (n = 159) were exposed to either 21% or 40% oxygen for a maximum of 16 weeks, and to 90% oxygen for a maximum of 120 hours. Clearance of inhaled technetium-labeled diethylene triamine pentaacetate (Tc-DTPA) and bronchoalveolar lavage fluid-to-serum ratio (BAL/Serum) of albumin (ALB) were used as markers of epithelial permeability. Lung wet-to-dry weight ratio (W/D) was measured to evaluate pulmonary edema, and types I and III collagenolytic activities and hydroxyproline content in the lung were analyzed as indices of collagen metabolism. Pulmonary fibrotic state was evaluated by histological quantification of fibrous tissue area stained with aniline blue.\n\nResults\nThe clearance of Tc-DTPA was higher with 2 week exposure to 40% oxygen, while BAL/Serum Alb and W/D did not differ between the 40% and 21% groups. In the 40% oxygen group, type I collagenolytic activities at 2 and 4 weeks and type III collagenolytic activity at 2 weeks were increased. Hydroxyproline and fibrous tissue area were also increased at 2 weeks. No discernible injury was histologically observed in the 40% group, while progressive alveolar damage was observed in the 90% group.\n\nConclusion\nThese results indicate that epithelial function is damaged, collagen metabolism is affected, and both breakdown of collagen fibrils and fibrogenesis are transiently induced even with low-dose 40% oxygen exposure. However, these changes are successfully compensated even with continuous exposure to low-dose oxygen. We conclude that long-term low-dose oxygen exposure does not significantly induce permanent lung injury in guinea pigs.",
				"DOI": "10.1186/1465-9921-9-37",
				"extra": "PMID: 18439301\nPMCID: PMC2377243",
				"title": "Effects of long-term low-dose oxygen supplementation on the epithelial function, collagen metabolism and interstitial fibrogenesis in the guinea pig lung",
				"volume": "9",
				"issue": "1",
				"pages": "37",
				"date": "2008",
				"url": "http://www.ncbi.nlm.nih.gov/pmc/articles/PMC2377243/",
				"libraryCatalog": "PubMed Central",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pmc/?term=anger",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.ncbi.nlm.nih.gov/pmc/issues/184700/",
		"items": "multiple"
	}
]
/** END TEST CASES **/

// Generated code, or at least, this will be generated:
PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb });
}());
