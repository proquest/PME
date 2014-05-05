(function(){
var translatorSpec =
{
	"translatorID": "92d4ed84-8d0-4d3c-941f-d4b9124cfbb",
	"label": "IEEE Xplore",
	"creator": "Simon Kornblith, Michael Berkowitz, Bastian Koenings, and Avram Lyon",
	"target": "^https?://[^/]*ieeexplore\\.ieee\\.org[^/]*/(?:[^\\?]+\\?(?:|.*&)arnumber=[0-9]+|search/(?:searchresult.jsp|selected.jsp)|xpl\\/(mostRecentIssue|tocresult).jsp\\?)",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-04-07 00:37:24"
}

function detectWeb(doc, url) {
	// IE8 doesn't support document.defaultView
	if(doc.defaultView && (doc.defaultView !== doc.defaultView.top)) return false;
	
	var articleRe = /[?&]ar(N|n)umber=([0-9]+)/;
	var m = articleRe.exec(url);

	if (m) {
		return "journalArticle";
	} else {
		return "multiple";
	}

	return false;
}

function doWeb(doc, url) {
	var hostRe = new RegExp("^(https?://[^/]+)/");
	var hostMatch = hostRe.exec(url);

	var articleRe = /[?&]ar(?:N|n)umber=([0-9]+)/;
	var m = articleRe.exec(url);

	if (detectWeb(doc, url) == "multiple") {
		// search page
		var items = {};

		var xPathRows = '//ul[@class="Results"]/li[@class="noAbstract"]/div[@class="header"]';
		var tableRows = doc.evaluate(xPathRows, doc, null, XPathResult.ANY_TYPE, null);
		var tableRow;
		while (tableRow = tableRows.iterateNext()) {
			var linknode = doc.evaluate('.//div[@class="detail"]/h3/a', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext();
			if (!linknode) {
				// There are things like tables of contents that don't have item pages, so we'll just skip them
				continue;
			}
			var link = linknode.href;
			var title = "";
			var strongs = tableRow.getElementsByTagName("h3");
			for (var strong_x=0; strong_x<strongs.length; strong_x++) {
				var strong = strongs[strong_x];
				if (PME.Util.getNodeText(strong)) {
					title += PME.Util.getNodeText(strong) + " ";
				}
			}

			items[link] = PME.Util.trimInternal(title);
		}

		PME.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			var urls = [];
			for (var i in items) {
				// Some pages don't show the metadata we need (http://forums.zotero.org/discussion/16283)
				// No data: http://ieeexplore.ieee.org/search/srchabstract.jsp?tp=&arnumber=1397982
				// No data: http://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=1397982
				// Data: http://ieeexplore.ieee.org/xpls/abs_all.jsp?arnumber=1397982
				var arnumber = i.match(/arnumber=(\d+)/)[1];
				i = i.replace(/\/(?:search|stamp)\/.*$/, "/xpls/abs_all.jsp?arnumber=" + arnumber);
				urls.push(i);
			}
			PME.Util.processDocuments(urls, scrape);
		});

	} else {
		if (url.indexOf("/search/") !== -1 || url.indexOf("/stamp/") !== -1 || url.indexOf("/ielx4/") !== -1 || url.indexOf("/ielx5/") !== -1) {
			// Address the same missing metadata problem as above
			// Also address issue of saving from PDF itself, I hope
			// URL like http://ieeexplore.ieee.org/ielx4/78/2655/00080767.pdf?tp=&arnumber=80767&isnumber=2655
			// Or: http://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=1575188&tag=1
			var arnumber = url.match(/arnumber=(\d+)/)[1];
			url = url.replace(/\/(?:search|stamp|ielx[45])\/.*$/, "/xpls/abs_all.jsp?arnumber=" + arnumber);
			PME.Util.processDocuments([url], scrape);
			PME.wait();
		} else {
			scrape(doc, url);
		}
	}
}

function parseIdentifier(identifier) {
	var idPieces = identifier.split(':');
	if (idPieces.length > 1) {
		var prefix = idPieces.shift();
		switch (prefix.toLowerCase()) {
		case "doi":
			return ["doi", idPieces.join(':')];
		case "isbn":
			return ["isbn", idPieces.join(':')];
		case "issn":
			return ["issn", idPieces.join(':')];
		case "pmid":
			return ["pmid", idPieces.join(':')];
		default:
			// do nothing
		}
		//PME.debug("Unknown identifier prefix '"+prefix+"'");
		return [prefix, idPieces.join(':')];
	}
	if (identifer.substr(0, 3) == '10.') return ["doi", identifier];

	// If we're here, we have a funny number, and we don't know what to do with it.
	var ids = idCheck(identifier);
	if (ids.isbn13) return ["isbn13", isbn13];
	if (ids.isbn10) return ["isbn10", isbn10];
	if (ids.issn) return ["issn", isbn10];

	return ["unknown", identifier];
}

function addIdentifier(identifier, item) {
	var parsed = parseIdentifier(identifier);
	switch (parsed[0]) {
	case "doi":
		item.DOI = parsed[1];
		break;
	case "isbn":
		item.ISBN = parsed[1];
		break;
	case "isbn13":
		item.ISBN = parsed[1];
		break;
	case "isbn10":
		item.ISBN = parsed[1];
		break;
	case "issn":
		item.ISSN = parsed[1];
		break;
	default:
	}
}

function scrape (doc, url) {
 	var arnumber = url.match(/arnumber=\d+/)[0].replace(/arnumber=/, "");
  	var pdf;
  	pdf = PME.Util.xpathText(doc, '//ul[@id="subscription-content-controls"]/li[1]/a/@href')
  	PME.debug(arnumber)
  	var get = window.location.protocol +'//ieeexplore.ieee.org/xpl/downloadCitations';
  	var post = "recordIds=" + arnumber + "&fromPage=&citations-format=citation-abstract&download-format=download-bibtex";
  	PME.Util.HTTP.doPost(get, post, function(text) {
  		text = PME.Util.unescapeHTML(text.replace(/(&[^\s;]+) and/g, '$1;'));
		//remove empty tag - we can take this out once empty tags are ignored
		text = text.replace(/(keywords=\{.+);\}/, "$1}");
		var earlyaccess = false;
		if (text.search(/^@null/)!=-1){
			earlyaccess=true;
			text = text.replace(/^@null/, "@article");
		} 
		var translator = PME.loadTranslator("import");
		// Calling the BibTeX translator
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			item.notes = [];
			var res;
			// Rearrange titles, per http://forums.zotero.org/discussion/8056
			// If something has a comma or a period, and the text after comma ends with
			//"of", "IEEE", or the like, then we switch the parts. Prefer periods.
			if (res = (item.publicationTitle.indexOf(".") !== -1) ?
				item.publicationTitle.trim().match(/^(.*)\.(.*(?:of|on|IEE|IEEE|IET|IRE))$/) :
				item.publicationTitle.trim().match(/^(.*),(.*(?:of|on|IEE|IEEE|IET|IRE))$/))
			item.publicationTitle = res[2]+" "+res[1];
			item.proceedingsTitle = item.conferenceName = item.publicationTitle;
			if (earlyaccess){
				item.volume = "Early Access Online";
				item.issue = "";
				item.pages = "";
			}
			if (pdf) {
				PME.Util.doGet(pdf, function (src) {
					var m = /<frame src="(.*\.pdf.*)"/.exec(src);
					if (m) item.attachments = [{
						url: m[1],
						title: "IEEE Xplore Full Text PDF",
						mimeType: "application/pdf"
					}, {url: url, title: "IEEE Xplore Abstract Record", mimeType: "text/html"}];
					item.complete();
				}, null);
			} else {
				item.attachments=[{url: url, title: "IEEE Xplore Abstract Record", mimeType: "text/html"}];
				item.complete();
			}
		});

		translator.getTranslatorObject(function(trans) {
			trans.setKeywordSplitOnSpace(false);
			trans.setKeywordDelimRe('\\s*;\\s*','');
			trans.doImport();
		});
	});
}

// Implementation of ISBN and ISSN check-digit verification
// Based on ISBN Users' Manual (http://www.isbn.org/standards/home/isbn/international/html/usm4.htm)
// and the Wikipedia treatment of ISBN (http://en.wikipedia.org/wiki/International_Standard_Book_Number)
// and the Wikipedia treatment of ISSN (http://en.wikipedia.org/wiki/International_Standard_Serial_Number)
// This will also check ISMN validity, although it does not distinguish from their
// neighbors in namespace, ISBN-13. It does not handle pre-2008 M-prefixed ISMNs; see
// http://en.wikipedia.org/wiki/International_Standard_Music_Number
// This does not validate multiple identifiers in one field,
// but it will gracefully ignore all non-number detritus,
// such as extraneous hyphens, spaces, and comments.
// It currently maintains hyphens in non-initial and non-final position,
// discarding consecutive ones beyond the first as well.
// It also adds the customary hyphen to valid ISSNs.
// Takes the first 8 valid digits and tries to read an ISSN,
// takes the first 10 valid digits and tries to read an ISBN 10,
// and takes the first 13 valid digits to try to read an ISBN 13
// Returns an object with four attributes:
// 	"issn"
// 	"isbn10"
// 	"isbn13"
// Each will be set to a valid identifier if found, and otherwise be a
// boolean false.
// There could conceivably be a valid ISBN-13 with an ISBN-10
// substring; this should probably be interpreted as the latter, but it is a
idCheck = function (isbn) {
	// For ISBN 10, multiple by these coefficients, take the sum mod 11
	// and subtract from 11
	var isbn10 = [10, 9, 8, 7, 6, 5, 4, 3, 2];

	// For ISBN 13, multiple by these coefficients, take the sum mod 10
	// and subtract from 10
	var isbn13 = [1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3];

	// For ISSN, multiply by these coefficients, take the sum mod 11
	// and subtract from 11
	var issn = [8, 7, 6, 5, 4, 3, 2];

	// We make a single pass through the provided string, interpreting the
	// first 10 valid characters as an ISBN-10, and the first 13 as an
	// ISBN-13. We then return an array of booleans and valid detected
	// ISBNs.
	var j = 0;
	var sum8 = 0;
	var num8 = "";
	var sum10 = 0;
	var num10 = "";
	var sum13 = 0;
	var num13 = "";
	var chars = [];

	for (var i = 0; i < isbn.length; i++) {
		if (isbn.charAt(i) == " ") {
			// Since the space character evaluates as a number,
			// it is a special case.
		} else if (j > 0 && isbn.charAt(i) == "-" && isbn.charAt(i - 1) != "-") {
			// Preserve hyphens, except in initial and final position
			// Also discard consecutive hyphens
			if (j < 7) num8 += "-";
			if (j < 10) num10 += "-";
			if (j < 13) num13 += "-";
		} else if (j < 7 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			sum8 += isbn.charAt(i) * issn[j];
			sum10 += isbn.charAt(i) * isbn10[j];
			sum13 += isbn.charAt(i) * isbn13[j];
			num8 += isbn.charAt(i);
			num10 += isbn.charAt(i);
			num13 += isbn.charAt(i);
			j++;
		} else if (j == 7 && (isbn.charAt(i) == "X" || isbn.charAt(i) == "x" || ((isbn.charAt(i) - 0) == isbn.charAt(i)))) {
			// In ISSN, an X represents the check digit "10".
			if (isbn.charAt(i) == "X" || isbn.charAt(i) == "x") {
				var check8 = 10;
				num8 += "X";
			} else {
				var check8 = isbn.charAt(i);
				sum10 += isbn.charAt(i) * isbn10[j];
				sum13 += isbn.charAt(i) * isbn13[j];
				num8 += isbn.charAt(i);
				num10 += isbn.charAt(i);
				num13 += isbn.charAt(i);
				j++;
			}
		} else if (j < 9 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			sum10 += isbn.charAt(i) * isbn10[j];
			sum13 += isbn.charAt(i) * isbn13[j];
			num10 += isbn.charAt(i);
			num13 += isbn.charAt(i);
			j++;
		} else if (j == 9 && (isbn.charAt(i) == "X" || isbn.charAt(i) == "x" || ((isbn.charAt(i) - 0) == isbn.charAt(i)))) {
			// In ISBN-10, an X represents the check digit "10".
			if (isbn.charAt(i) == "X" || isbn.charAt(i) == "x") {
				var check10 = 10;
				num10 += "X";
			} else {
				var check10 = isbn.charAt(i);
				sum13 += isbn.charAt(i) * isbn13[j];
				num10 += isbn.charAt(i);
				num13 += isbn.charAt(i);
				j++;
			}
		} else if (j < 12 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			sum13 += isbn.charAt(i) * isbn13[j];
			num13 += isbn.charAt(i);
			j++;
		} else if (j == 12 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			var check13 = isbn.charAt(i);
			num13 += isbn.charAt(i);
		}
	}
	var valid8 = ((11 - sum8 % 11) % 11) == check8;
	var valid10 = ((11 - sum10 % 11) % 11) == check10;
	var valid13 = (10 - sum13 % 10 == check13);
	var matches = false;

	// Since ISSNs have a standard hyphen placement, we can add a hyphen
	if (valid8 && (matches = num8.match(/([0-9]{4})([0-9]{3}[0-9Xx])/))) {
		num8 = matches[1] + '-' + matches[2];
	}

	if (!valid8) {
		num8 = false
	};
	if (!valid10) {
		num10 = false
	};
	if (!valid13) {
		num13 = false
	};
	return {
		"isbn10": num10,
		"isbn13": num13,
		"issn": num8
	};
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4607247&refinements%3D4294967131%26openedRefinements%3D*%26filter%3DAND%28NOT%284283010803%29%29%26searchField%3DSearch+All%26queryText%3Dturing",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Yongming",
						"lastName": "Li",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Turing machines",
					"computational complexity",
					"deterministic automata",
					"fuzzy set theory",
					"deterministic fuzzy Turing machines",
					"fixed finite subset",
					"fuzzy languages",
					"fuzzy polynomial time-bounded computation",
					"fuzzy sets",
					"nondeterministic fuzzy Turing machines",
					"nondeterministic polynomial time-bounded computation",
					"Deterministic fuzzy Turing machine (DFTM)",
					"fuzzy computational complexity",
					"fuzzy grammar",
					"fuzzy recursive language",
					"fuzzy recursively enumerable (f.r.e.) language",
					"nondeterministic fuzzy Turing machine (NFTM)",
					"universal fuzzy Turing machine (FTM)"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "IEEE Xplore Abstract Record",
						"mimeType": "text/html"
					}
				],
				"publicationTitle": "IEEE Transactions on Fuzzy Systems",
				"title": "Fuzzy Turing Machines: Variants and Universality",
				"date": "2008",
				"volume": "16",
				"issue": "6",
				"pages": "1491-1502",
				"abstractNote": "In this paper, we study some variants of fuzzy Turing machines (FTMs) and universal FTM. First, we give several formulations of FTMs, including, in particular, deterministic FTMs (DFTMs) and nondeterministic FTMs (NFTMs). We then show that DFTMs and NFTMs are not equivalent as far as the power of recognizing fuzzy languages is concerned. This contrasts sharply with classical TMs. Second, we show that there is no universal FTM that can exactly simulate any FTM on it. But if the membership degrees of fuzzy sets are restricted to a fixed finite subset A of [0,1], such a universal machine exists. We also show that a universal FTM exists in some approximate sense. This means, for any prescribed accuracy, that we can construct a universal machine that simulates any FTM with the given accuracy. Finally, we introduce the notions of fuzzy polynomial time-bounded computation and nondeterministic fuzzy polynomial time-bounded computation, and investigate their connections with polynomial time-bounded computation and nondeterministic polynomial time-bounded computation.",
				"DOI": "10.1109/TFUZZ.2008.2004990",
				"ISSN": "1063-6706",
				"conferenceName": "IEEE Transactions on Fuzzy Systems",
				"proceedingsTitle": "IEEE Transactions on Fuzzy Systems",
				"libraryCatalog": "IEEE Xplore",
				"shortTitle": "Fuzzy Turing Machines"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?arnumber=6221978",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "D.",
						"lastName": "Tuia",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Munoz-Mari",
						"creatorType": "author"
					},
					{
						"firstName": "L.",
						"lastName": "Gomez-Chova",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Malo",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"geophysical image processing",
					"geophysical techniques",
					"image classification",
					"image matching",
					"image resolution",
					"remote sensing",
					"adaptation algorithm",
					"angular effects",
					"cross-domain image processing techniques",
					"data acquisition conditions",
					"destination domain",
					"graph matching method",
					"multitemporal very high resolution image classification",
					"nonlinear deformation",
					"nonlinear transform",
					"remote sensing",
					"source domain",
					"transfer learning mapping",
					"vector quantization",
					"Adaptation models",
					"Entropy",
					"Manifolds",
					"Remote sensing",
					"Support vector machines",
					"Transforms",
					"Vector quantization",
					"Domain adaptation",
					"model portability",
					"multitemporal classification",
					"support vector machine (SVM)",
					"transfer learning"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "IEEE Xplore Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "IEEE Xplore Abstract Record",
						"mimeType": "text/html"
					}
				],
				"publicationTitle": "IEEE Transactions on Geoscience and Remote Sensing",
				"title": "Graph Matching for Adaptation in Remote Sensing",
				"date": "2013",
				"volume": "51",
				"issue": "1",
				"pages": "329-341",
				"abstractNote": "We present an adaptation algorithm focused on the description of the data changes under different acquisition conditions. When considering a source and a destination domain, the adaptation is carried out by transforming one data set to the other using an appropriate nonlinear deformation. The eventually nonlinear transform is based on vector quantization and graph matching. The transfer learning mapping is defined in an unsupervised manner. Once this mapping has been defined, the samples in one domain are projected onto the other, thus allowing the application of any classifier or regressor in the transformed domain. Experiments on challenging remote sensing scenarios, such as multitemporal very high resolution image classification and angular effects compensation, show the validity of the proposed method to match-related domains and enhance the application of cross-domains image processing techniques.",
				"DOI": "10.1109/TGRS.2012.2200045",
				"ISSN": "0196-2892",
				"conferenceName": "IEEE Transactions on Geoscience and Remote Sensing",
				"proceedingsTitle": "IEEE Transactions on Geoscience and Remote Sensing",
				"libraryCatalog": "IEEE Xplore"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ieeexplore.ieee.org/search/searchresult.jsp?newsearch=true&queryText=love&x=-816&y=-176",
		"items": [
			{
				"itemType" : "conferencePaper",
				"creators" : [
					{
						"0" : "",
						"firstName" : "L.",
						"lastName" : "El Fissi",
						"creatorType" : "author"
					},
					{	
						"1" : "",
						"firstName" : "J-M",
						"lastName" : "Friedt",
						"creatorType" : "author"
					},
					{	
						"2" : "",
						"firstName" : "S.",
						"lastName" : "Ballandras",
						"creatorType" : "author"
					}
				],
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4409703&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"VHF devices",
					"acoustic delay lines",
					"acoustic transducers",
					"biochemistry",
					"biosensors",
					"boundary-elements methods",
					"finite element analysis",
					"losses",
					"microbalances",
					"organic compounds",
					"viscoelasticity",
					"viscosity",
					"Love-wave microbalance",
					"Love-wave sensors",
					"P-matrix characteristics",
					"RF acoustic behavior modeling",
					"acoustic losses",
					"biochemical detection",
					"biochemical sensing applications",
					"boundary element analysis",
					"finite element analysis",
					"fluid-loaded love-wave based devices",
					"insertion losses",
					"love-wave delay lines",
					"organic layers",
					"phase sensitivity",
					"visco-elastic losses",
					"viscosity",
					"Acoustic devices",
					"Acoustic measurements",
					"Acoustic sensors",
					"Acoustic signal detection",
					"Biochemical analysis",
					"Biosensors",
					"Finite element methods",
					"Insertion loss",
					"Loss measurement",
					"Sensor phenomena and characterization"	
				],	
				"publicationTitle" : " IEEE Ultrasonics Symposium, 2007",
				"title" : "6D-5 Modeling the Rf Acoustic Behavior of Love-Wave Sensors Loaded with Organic Layers",
				"date" : " October 2007",
				"pages" : "484-487",
				"abstractNote" : "In order to exploit complicated combinations of measurements associated with acoustic devices, we present the results of finite element/boundary element analyses including visco-elastic losses on fluid-loaded love-wave based devices, used as microbalance for biochemical detection and sensing purposes. The P-matrix characteristics of the mode are extracted from these computations to simulate the implemented devices. The corresponding frequency dependent phase shift and acoustic losses are introduced in the P-matrix model, allowing for an accurate prediction of insertion losses and phase sensitivity of our love-wave delay lines. Comparison between theory and experiments shows that we are capable to accurately predict the influence of viscosity on the insertion losses of the love-wave microbalance.",
				"DOI" : "10.1109/ULTSYM.2007.130",
				"ISSN" : "1051-0117",
				"conferenceName" : " IEEE Ultrasonics Symposium, 2007",
				"proceedingsTitle" : " IEEE Ultrasonics Symposium, 2007"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
						"Zhang Peng",
						"Chen Ming",
						"He Peng-ju"
				],	
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4803629&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"gas sensors",
					"polymer films",
					"coating",
					"gas detection",
					"love mode gas sensor",
					"love wave devices",
					"room temperature",
					"wave propagation",
					"Acoustic signal detection",
					"Acoustic waves",
					"Chemical analysis",
					"Gas detectors",
					"Intelligent sensors",
					"Polymers",
					"Surface acoustic wave devices",
					"Surface acoustic waves",
					"Temperature sensors",
					"Zinc oxide"
				],		
				"publicationTitle" : " 3rd International Conference on Intelligent System and Knowledge Engineering, 2008. ISKE 2008",
				"title" : "A love mode gas sensor coated with polyaniline/ In2O3 for sensing CO",
				"date" : " November 2008",
				"volume" : "1",
				"pages" : "1328-1333",
				"abstractNote" : "Love wave devices based on ST-quartz piezoelectric structure and ZnO guiding layer coated with a specific polyaniline/In2O3 are used to detect CO gas. This allows to study the sensing theory of the polyaniline/In2O3 coating towards CO gas, and to demonstrate the high sensitivity of love wave devices for gas detection. We also present a theoretical model which describes wave propagation in love mode devices. Then, we discuss experimental results, in terms of the high sensitivity of CO gas, a fast response and recovery with good repeatability in a stable baseline condition at room temperature.",
				"DOI" : "10.1109/ISKE.2008.4731137",
				"conferenceName" : " 3rd International Conference on Intelligent System and Knowledge Engineering, 2008. ISKE 2008",
				"proceedingsTitle" : " 3rd International Conference on Intelligent System and Knowledge Engineering, 2008. ISKE 2008"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					"Li-na Cheng",
					"Hong-lang Li",
					"Yong Liang",
					"Shi-tang He",
					"Zhao-yang Tong"	
				],	
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=5744370&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"bioacoustics",
					"biomedical measurement",
					"biosensors",
					"lab-on-a-chip",
					"molecular biophysics",
					"organic compounds",
					"Au-surface",
					"IDT",
					"Love wave acoustic energy",
					"Love wave biosensor",
					"Love wave sensors",
					"SELEX",
					"antibodies",
					"aptamer sensitive layer",
					"artificial nucleic acid ligands",
					"biotin-avidin system",
					"delay-line structure",
					"nanogold sensing area",
					"propagation loss",
					"sensor chip",
					"specificity",
					"stability",
					"Acoustics",
					"Biosensors",
					"Probes",
					"Sensitivity",
					"Substrates",
					"Time frequency analysis",
					"Abrin",
					"Aptamer",
					"BAS",
					"Love wave"	
				],	
				"publicationTitle" : " 2010 Symposium on Piezoelectricity, Acoustic Waves and Device Applications (SPAWDA)",
				"title" : "A love wave biosensor using Aptamer sensitive layer",
				"date" : " December 2010",
				"pages" : "532-535",
				"abstractNote" : "A love-wave biosensor has been designed by coupling aptamers to the Au-surface of sensor chip. Aptamers are artificial nucleic acid ligands that can be obtained in the process of SELEX. Aptamers have advantages over antibodies, such as high affinity, specificity, and stability. As Love waves' acoustic energy is confined to a thin near-surface region of substrate by guiding layer, Love wave sensors obtain low propagation loss and high sensitivity. As a result, love wave biosensors using Aptamer sensitive layer combining both the advantages stand out in analytical and diagnostic assays. Here, Love-wave sensors are designed as delay-line structure, with a nano-gold sensing area located between the input and output IDTs. For lower threshold detection limit, the substrate utilizes ST-90&#x00B0;X quartz, and EWC/SPUDT is used to reduce transducers' bidirectional loss. The aptamer probe is immobilized by biotin-avidin system (BAS). Depending on the mass multiplied effect of nano-gold particles and biotin-avidin system, the Love wave biosensor can be used for Arbin detection. As for 1 &#x03BC;g/M&#x2113; Arbin, the system detection is 6.71KHz, which is almost 2 times higher than BSA (BSA concentration is 1.5 mg/M&#x2113;). The experimental results show that love-wave biosensor can achieve a comparable sensitivity combining with aptamer sensitive layer.",
				"DOI" : "10.1109/SPAWDA.2010.5744370",
				"conferenceName" : " 2010 Symposium on Piezoelectricity, Acoustic Waves and Device Applications (SPAWDA)",
				"proceedingsTitle" : " 2010 Symposium on Piezoelectricity, Acoustic Waves and Device Applications (SPAWDA)"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					"Jie Zhao",
					"Cheng Jiang",
					"Ye Chen",
					"Honglang Li",
					"Shitang He"
				],	
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4803629&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"perturbation theory",
					"polymer films",
					"quartz",
					"surface acoustic wave sensors",
					"Love wave sensor layer",
					"SU-8 guiding layer deposition",
					"SiO2",
					"boundary condition",
					"frequency 125 MHz",
					"mass sensitivity",
					"perturbation theory",
					"phase velocity",
					"shear velocity",
					"wave propagation",
					"Acoustic propagation",
					"Acoustic sensors",
					"Acoustic waves",
					"Acoustical engineering",
					"Boundary conditions",
					"Equations",
					"Force sensors",
					"Frequency",
					"Polymers",
					"Substrates",
					"Love wave",
					"Phase velocity",
					"SU-8",
					"Sensitivity"
				],	
				"publicationTitle" : " IEEE Ultrasonics Symposium, 2008. IUS 2008",
				"title" : "A study of Love wave sensors with SU-8 guiding layers",
				"date" : " November 2008",
				"pages" : "1120-1123",
				"abstractNote" : "Love wave sensors employing guiding layer deposited on a ST-90degX quartz were presented and analyzed. Since solidified SU-8, as one kind of polymer, has low shear velocity, while its rigidness is almost same with SiO2, So SU-8 is very appreciated for Love wave sensor layer. Firstly, as for the two layers structure (SU-8/ ST90degX -quartz), the Love wave phase velocity was calculated by propagation equation and boundary conditions, and mass sensitivity is then deduced by perturbation theory. A relative larger mass sensitivity than SiO2 is obtained when an optimal relative thickness is adopted. Corresponding experimental study of Love wave devices with SU-8 film as guiding layer has been performed. A device operating at a fundamental frequency of 125 MHz is fabricated. The experimental results give comparing results with theoretical results.",
				"DOI" : "10.1109/ULTSYM.2008.0270",
				"conferenceName" : " IEEE Ultrasonics Symposium, 2008. IUS 2008",
				"proceedingsTitle" : " IEEE Ultrasonics Symposium, 2008. IUS 2008"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					"Ming Jin",
					"Shenghua Jia"
				],	
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=6010900&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"consumer behaviour",
					"sportswear",
					"Chinese consumer brand love conceptual structure",
					"Chinese consumer psychological features",
					"brand attachment",
					"brand consumption era",
					"brand love research",
					"brand passion",
					"brand satisfaction",
					"brand trust",
					"close brand-consumer emotional relationship",
					"market competitiveness",
					"sports shoes brands",
					"western consumer brand love concept theory",
					"Advertising",
					"Business",
					"Consumer behavior",
					"Educational institutions",
					"Footwear",
					"Medical services",
					"Psychology",
					"Chinese",
					"brand love",
					"difference",
					"dimensions",
					"scale"
				],	
				"publicationTitle" : " 2011 2nd International Conference on Artificial Intelligence, Management Science and Electronic Commerce (AIMSEC)",
				"title" : "Development of Chinese consumers' brand love conceptual structure and scale: With sports shoes brands as an example",
				"date" : " August 2011",
				"pages" : "2058-2061",
				"abstractNote" : "In brand consumption era, establishing close brand-consumer emotional relationship and cultivating consumers' love to brands are effective to enhance market competitiveness. Understanding brand love connotation and structure is a premise and basis for systematically developing brand love research. Based on western consumers' brand love concept theory, this paper takes Chinese consumers' psychological features into account, establishes Chinese consumers' brand love conceptual structure, develops a brand love scale and empirically tests it with sports' shoes brands. The result shows that, (1) Chinese consumers' brand love consists of three dimensions named brand satisfaction and trust, brand passion, brand attachment; (2) Chinese consumers' brand love structure is different from western consumers' band love structure, the difference can be explained by objective difference in culture, consumption habits, commercial environment between China and western countries. This research provides theoretical basis for subsequent brand love research and practical guide for enterprises successfully incubating brand love in China.",
				"DOI" : "10.1109/AIMSEC.2011.6010900",
				"conferenceName" : " 2011 2nd International Conference on Artificial Intelligence, Management Science and Electronic Commerce (AIMSEC)",
				"proceedingsTitle" : " 2011 2nd International Conference on Artificial Intelligence, Management Science and Electronic Commerce (AIMSEC)"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					{
						"0" : "",
						"firstName" : "P.",
						"lastName" : "Kielczynski",
						"creatorType" : "author"
					},
					{	
						"1" : "",
						"firstName" : "M.",
						"lastName" : "Szalewski",
						"creatorType" : "author"
					}
				],		
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4803537&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],	
				"tags" : [
					"Love waves",
					"coatings",
					"elastic constants",
					"inverse problems",
					"minimisation",
					"surface acoustic waves",
					"Love surface acoustic waves",
					"elastic properties",
					"generalized Love waves",
					"geometrical properties",
					"graded materials",
					"inverse problem",
					"mechanical properties",
					"objective function",
					"optimization problem",
					"phase velocity",
					"shear elastic constant",
					"surface layers",
					"thickness properties",
					"thin coating layers",
					"ultrasonic frequency",
					"Coatings",
					"Copper",
					"Dispersion",
					"Inverse problems",
					"Substrates",
					"Surface waves",
					"Love waves",
					"dispersion curves",
					"elastic waves",
					"inverse methods",
					"thin layers"
				],	
				"publicationTitle" : " 2010 IEEE Ultrasonics Symposium (IUS)",
				"title" : "Inverse determination of thickness and elastic properties of thin layers and graded materials using generalized Love waves",
				"date" : " October 2010",
				"pages" : "2235-2238",
				"abstractNote" : "Determination of the mechanical and geometrical parameters of thin coatings and surface layers in materials is of great practical importance in engineering and technology. In this work the authors present a novel inversion procedure for simultaneous determination of thickness, shear elastic constant and density of thin coating layers in materials. The inversion procedure is based on measurements of the dispersion curve for Love surface acoustic waves. The inverse problem is formulated as an optimization problem with the appropriately designed objective function, depending on the material parameters of the coating layer, ultrasonic frequency, and the experimental data, i.e., measured phase velocity of the surface Love wave. The minimization of the objective function provides three parameters of a thin layer, i.e., its thickness, shear elastic constant and density. The agreement between the results of calculations with the proposed inversion method and the experimental data was good.",
				"DOI" : "10.1109/ULTSYM.2010.5935480",
				"ISSN" : "1948-5719",
				"conferenceName" : " 2010 IEEE Ultrasonics Symposium (IUS)",
				"proceedingsTitle" : " 2010 IEEE Ultrasonics Symposium (IUS)"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					{
						"0" : "",
						"firstName" : "P.",
						"lastName" : "Kielczynski",
						"creatorType" : "author"
					},
					{	
						"1" : "",
						"firstName" : "M.",
						"lastName" : "Szalewski",
						"creatorType" : "author"
					},
					{	
						"2" : "",
						"firstName" : "A.",
						"lastName" : "Balcerzak",
						"creatorType" : "author"
					}
				],		
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=6561945&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"copper",
					"elasticity",
					"inverse problems",
					"liquid alloys",
					"liquid metals",
					"liquids",
					"steel",
					"surface waves (fluid)",
					"viscosity",
					"wave propagation",
					"Love wave energy",
					"Love wave propagation",
					"Newtonian liquid",
					"dispersion curves",
					"geophysics",
					"inverse problem",
					"layered elastic waveguides",
					"liquid physical properties",
					"liquid viscosity",
					"material properties",
					"seismology",
					"surface layers",
					"viscous liquid",
					"waveguide surface",
					"Dispersion",
					"Inverse problems",
					"Linear programming",
					"Liquid waveguides",
					"Liquids",
					"Surface waves",
					"Viscosity",
					"Love wave",
					"elastic waveguide",
					"inverse problem",
					"viscosity"
				],	
				"publicationTitle" : "Ultrasonics Symposium (IUS), 2012 IEEE International",
				"title" : "Inverse problem of the Love wave propagation in elastic waveguides loaded with a viscous liquid",
				"date" : " October 2012",
				"pages" : "1501-1504",
				"abstractNote" : "The problem of propagation of Love waves in elastic waveguides loaded on the surface by a viscous (Newtonian) liquid is important in many applications such as geophysics, seismology, investigation of the physical properties of liquids. Love wave energy is concentrated near the waveguide surface, so that Love waves are especially suited to study the material properties of surface layers. In this work, the direct problem and the inverse problem of the Love wave propagation in a layered elastic waveguides loaded with a viscous liquid have been formulated and solved. The inverse problem relies on the determination of the material parameters (e.g., the unknown value of liquid viscosity) from measurements of the dispersion curves of Love waves.",
				"DOI" : "10.1109/ULTSYM.2012.0375",
				"ISSN" : "1948-5719",
				"conferenceName" : "Ultrasonics Symposium (IUS), 2012 IEEE International",
				"proceedingsTitle" : "Ultrasonics Symposium (IUS), 2012 IEEE International"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					{
						"0" : "",
						"firstName" : "F.",
						"lastName" : "Breitenecker",
						"creatorType" : "author"
					},
					{	
						"1" : "",
						"firstName" : "F.",
						"lastName" : "Judex",
						"creatorType" : "author"
					},
					{	
						"2" : "",
						"firstName" : "N.",
						"lastName" : "Popper",
						"creatorType" : "author"
					},
					{	
						"3" : "",
						"firstName" : "A.",
						"lastName" : "Mathe",
						"creatorType" : "author"
					},
					{	
						"4" : "",
						"firstName" : "A.",
						"lastName" : "Mathe",
						"creatorType" : "author"
					}
				],		
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4588385&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"nonlinear differential equations",
					"psychology",
					"emotional behaviour",
					"emotional cycle",
					"love emotions",
					"mathematical model",
					"nonlinear ordinary differential equation",
					"Biological system modeling",
					"Calculus",
					"Differential equations",
					"Graphical user interfaces",
					"Information analysis",
					"MATLAB",
					"Mathematical model",
					"Mathematics",
					"Nonlinear dynamical systems",
					"Scientific computing",
					"Dynamical Systems",
					"Limit Cycles",
					"Love Dynamics",
					"System Dynamics"
				],	
				"publicationTitle" : " 30th International Conference on Information Technology Interfaces, 2008. ITI 2008",
				"title" : "Love emotions between Laura and Petrarca #x2014;an approach by mathematics and system dynamics",
				"date" : "June 2008",
				"pages" : "61-74",
				"abstractNote" : "Laura, a very beautiful but also mysterious lady, inspired the famous poet Petrarch for poems, which express ecstatic love as well as deep despair. F. J. Jones - a scientist for literary - recognised in these changes between love and despair an oscillating behaviour - from 1328 to 1350 -, which he called Petrarch's emotional cycle. The mathematician S .Rinaldi investigated this cycle and established a mathematical model based on ordinary differential equation: two coupled nonlinear ODEs, reflecting Laura's and Petrarch's emotion for each other, drive an inspiration variable, which coincides with Petrarch 's emotional cycle. These ODEs were starting point for the investigations in two directions: mapping the mathematical model to a suitable modelling concept, and trying to extend the model for love dynamics in modern times (F Breitenecker et al). This contribution introduces and investigates a modelling approach for love dynamics and inspiration by means of System Dynamics, as well as for Laura's and Petrarch's emotions as well as for a modern couple in love. In principal, emotions and inspiration emerge from a source, and are fading into a sink. But the controlling parameters for increase and decrease of emotion create a broad variety of emotional behaviour and of degree of inspiration, because of the nonlinearities. Experiments with an implementation of this model approach and selected simulations provide interesting case studies for different kind of love dynamics - attraction, rejection and neglect, - stable equilibriums and chaotic cycles.",
				"DOI" : "10.1109/ITI.2008.4588385",
				"ISSN" : "1330-1012",
				"conferenceName" : " 30th International Conference on Information Technology Interfaces, 2008. ITI 2008",
				"proceedingsTitle" : " 30th International Conference on Information Technology Interfaces, 2008. ITI 2008"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					"Xiao-Shan Cao",
					"Feng Jin",
					"Xiao-Yi Mo",
					"Jun-Ping Shi"
				],	
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4803629&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"functionally graded materials",
					"gradient methods",
					"piezoelectricity",
					"surface acoustic wave devices",
					"Love waves",
					"asymptotic analytical derivations",
					"bounded domain",
					"convergence",
					 "dispersion curves",
					 "displacement amplitude distribution",
					 "electromechanical coupling factor",
					 "functionally graded material half space",
					 "gradient coefficient",
					 "high performance surface acoustic waves device",
					 "piezoelectric layered structure",
					 "power series technique",
					 "Couplings",
					 "Dispersion",
					 "Electric potential",
					 "Equations",
					 "Substrates",
					 "Surface acoustic waves",
					 "Electro-mechanical coupling factor",
					 "Functionally graded material (FGM)",
					 "Love waves",
					 "Piezoelectric layered structure",
					 "Surface acoustic wave (SAW) devices"
				],	
				"publicationTitle" : " 2011 Symposium on Piezoelectricity, Acoustic Waves and Device Applications (SPAWDA)",
				"title" : "Love waves in piezoelestric layered structure with functionally graded materail half space",
				"date" : " December 2011",
				"pages" : "240-244",
				"abstractNote" : "In this theoretical study, we investigate the propagation of Love waves in a piezoelectric layered structure. The substrate of the layered structure is a functionally graded material (FGM) in which parameters vary along thickness and in the bounded domain. Both variable substitution and power series technique, which are shown to have good convergence and high precision, are employed for the asymptotic analytical derivations of the governing equation of Love wave. The influence of the gradient coefficient of FGM on the dispersion curves, and electro-mechanical coupling factor, and the displacement amplitude distributions of Love waves in this structure are investigated. The theoretical results set guidelines not only for the design of high performance surface acoustic waves (SAW) devices using the FGM substrate, but also for the measurement of material properties of FGM half space using Love waves.",
				"DOI" : "10.1109/SPAWDA.2011.6167235",
				"conferenceName" : " 2011 Symposium on Piezoelectricity, Acoustic Waves and Device Applications (SPAWDA)",
				"proceedingsTitle" : " 2011 Symposium on Piezoelectricity, Acoustic Waves and Device Applications (SPAWDA)"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					{
						"0" : "",
						"firstName" : "C.",
						"lastName" : "Zimmermann",
						"creatorType" : "author"
					},
					{	
						"1" : "",
						"firstName" : "D.",
						"lastName" : "Rebiere",
						"creatorType" : "author"
					},
					{	
						"2" : "",
						"firstName" : "C.",
						"lastName" : "Dejous",
						"creatorType" : "author"
					},
					{	
						"3" : "",
						"firstName" : "J.",
						"lastName" : "Pistre",
						"creatorType" : "author"
					}
				],		
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4152311&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"acoustic measurement",
					"materials testing",
					"multilayers",
					"shear modulus",
					"silicon compounds",
					"thin films",
					"viscoelasticity",
					"100 MHz",
					"Love wave characterization",
					"Love wave device",
					"SiO2",
					"SiO2 guiding layer",
					"acoustic wave sensors",
					"chemical detections",
					"material layer density",
					"microstructured thin film",
					"multilayer structure",
					"nanostructured thin film",
					"piezoelectric substrate",
					"shear modulus",
					"viscoelastic properties characterization",
					"wave phase velocity",
					"wave propagation",
					"Acoustic materials",
					"Acoustic sensors",
					"Acoustic waves",
					"Chemical sensors",
					"Elasticity",
					"Piezoelectric films",
					"Sensor phenomena and characterization",
					"Thin film sensors",
					"Transistors","Viscosity"
				],	
				"publicationTitle" : " IEEE Ultrasonics Symposium, 2006",
				"title" : "P2J-1 Love-Wave Characterization Platform for Micro and Nano Processed Thin Films",
				"date" : " October 2006",
				"pages" : "1809-1812",
				"abstractNote" : "Acoustic wave sensors uses more and more often micro and nano-structured thin film new materials (e.g. as sensitive layer). This lead to an increasing need for materials viscoelastic properties characterization. A new characterization method is proposed here using Love-wave platforms and allowing the material properties characterization directly with the sensor platform. A Love-wave device consists in a multilayer structure with a piezoelectric substrate, a guiding layer and, for chemical detections, a sensitive layer able to trap chemical species. Sensitive and guiding layers involve thin films organic and inorganic materials in which a 100 MHz Love-wave propagates during sensor operation. Materials are then excited at high frequency and mechanical properties are affected by the wave propagation. The characterization method determines material layer density and shear modulus by fitting simulation results to experimental measurements. First results concern the characterization of Love-wave SiO2 guiding layer and demonstrate that using characterized SiO2 density and shear modulus allows to simulate accurately the wave phase velocity of Love-wave devices with different SiO2 guiding layer thicknesses",
				"DOI" : "10.1109/ULTSYM.2006.455",
				"ISSN" : "1051-0117",
				"conferenceName" : " IEEE Ultrasonics Symposium, 2006",
				"proceedingsTitle" : " IEEE Ultrasonics Symposium, 2006"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					"Fang Li",
					"Qing-Ming Wang",
					{
						"3" : "",
						"firstName" : "J.H.-C.",
						"lastName" : "Wang",
						"creatorType" : "author"
					}
				],		
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4410104&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"acoustic waveguides",
					"biosensors",
					"cellular biophysics",
					"surface acoustic wave sensors",
					"ECM production",
					"Love mode sensor",
					"Love mode surface acoustic wave device",
					"cell adhesion",
					"cell attenuation",
					"cell behaviors",
					"cell biological events",
					"cell phase shift",
					"cell-based biosensor",
					"guided surface acoustic wave",
					"piezoelectric substrate",
					"sensor surface",
					"shear modulus",
					"Acoustic sensors",
					"Acoustic testing",
					"Acoustic waves",
					"Attenuation",
					"Biomedical monitoring",
					"Biosensors",
					"Cells (biology)",
					"Drugs",
					"Surface acoustic wave devices",
					"Surface contamination"
				],	
				"publicationTitle" : " IEEE Ultrasonics Symposium, 2007",
				"title" : "P4L-2 Theoretical Analysis of Love Mode Surface Acoustic Wave Device as Cell-Based Biosensor",
				"date" : " October 2007",
				"pages" : "2111-2114",
				"abstractNote" : "Recent studies have demonstrated that acoustic wave devices are capable of quantitatively probing the behaviors of cells on the sensor surface, which has potential applications in biomedical research, environmental contaminant monitoring, drug screening and efficacy testing, and detecting bacteria and viruses in food safety and for anti-bioterrorism. Guided surface acoustic wave (or Love mode) sensor has many advantages among the acoustic wave devices. However, up to now, studies on the use of love-mode SAW devices as cell-based sensors are very limited, including theoretical and experimental studies. In this study, we developed a theoretical model to determine the attenuation and phase shift due to cells attaching on the device surface. According to the theoretical models, it has been found that the sensitivity of the love mode acoustic wave sensors can be optimized by appropriate selection of shear modulus and thickness of the wave-guiding layer and the piezoelectric substrate. The phase and attenuation shifts of the device are also sensitive to the properties and thickness of the interfacial layer between the cell layer and the substrate. This study indicates that love mode acoustic wave sensor system provides a powerful tool to study cell biological events, such as ECM production and cell adhesion, in a real-time, quick, easy, quantitative, and high- throughput fashion.",
				"DOI" : "10.1109/ULTSYM.2007.531",
				"ISSN" : "1051-0117",
				"conferenceName" : " IEEE Ultrasonics Symposium, 2007",
				"proceedingsTitle" : " IEEE Ultrasonics Symposium, 2007"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					"Wen Wang",
					"Shitang He"
				],	
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4803228&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"carbon compounds",
					"chemical sensors",
					"piezoelectric transducers",
					"polymers",
					"quartz",
					"surface acoustic wave sensors",
					"ultrasonic transducers",
					"CO2",
					"Love wave propagation",
					"Love wave reflective delay line",
					"ST-90degX quartz",
					"Teflon AF 2400 thin film",
					"dispersion relation",
					"frequency 440 MHz",
					"passive chemical sensor",
					"piezoelectricity",
					"polymethylmethacrylate",
					"remote polymer-coated Love wave chemical sensor",
					"shear horizontal surface acoustic wave",
					"shear velocity",
					"single phase unidirectional transducers",
					"wireless chemical sensor",
					"Acoustic propagation",
					"Acoustic waves",
					"Chemical sensors",
					"Delay lines",
					"Dispersion",
					"Piezoelectricity",
					"Polymer films",
					"Substrates",
					"Surface acoustic waves",
					"Wireless sensor networks",
					"Love wave",
					"PMMA",
					"ST-90oX quartz",
					"reflective delay line",
					"wireless chemical sensor"
				],	
				"publicationTitle" : " IEEE Ultrasonics Symposium, 2008. IUS 2008",
				"title" : "Passive and remote polymer-coated Love wave chemical sensor",
				"date" : " November 2008",
				"pages" : "1854-1857",
				"abstractNote" : "This paper presents a passive and remote polymer- coated Love wave chemical sensor. A ST-90degX quartz was used as the substrate, which provides a shear horizontal surface acoustic wave (SH-SAW) with high shear velocity and larger piezoelectricity. A layer of polymethylmethacrylate (PMMA) was considered as the guiding layer owing to its lower shear velocity. The dispersion relationship of the Love wave propagation was described. Also, to extract the optimal design parameters, a theoretical model on response mechanism of polymer-coated Love wave chemical sensor was established. A 440MHz Love wave reflective delay line was fabricated as the wireless chemical sensor element. Single phase unidirectional transducers (SPUDTs) and three shorted grating reflectors are used to structure the SH-SAW device, and a Teflon AF 2400 thin film sensitive to CO2 gas deposited onto PMMA surface between reflectors. The fabricated Love wave device was wirelessly characterized by network analyzer. Adsorption of CO2 gas onto the sensitive film induced a large phase shifts of the reflection peaks depending on the CO2 concentration. The obtained sensitivity was 7deg/ppm.",
				"DOI" : "10.1109/ULTSYM.2008.0456",
				"conferenceName" : " IEEE Ultrasonics Symposium, 2008. IUS 2008",
				"proceedingsTitle" : " IEEE Ultrasonics Symposium, 2008. IUS 2008"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"firstName" : "B.",
						"lastName" : "Collet",
						"creatorType" : "author"
					},
					{	
						"1" : "",
						"firstName" : "M.",
						"lastName" : "Destrade",
						"creatorType" : "author"
					}
				],		
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4037221&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"crystal faces",
					"elemental semiconductors",
					"germanium",
					"piezoelectric materials",
					"potassium compounds",
					"semiconductor thin films",
					"substrates",
					"surface acoustic waves",
					"Bleustein-Gulyaev wave",
					"Ge",
					"KNbO3",
					"Love wave speed",
					"analysis by-product",
					"asymptotic Love wave behavior",
					"crystal faces",
					"crystal symmetry plane",
					"dispersion equation",
					"explicit secular equation",
					"germanium layer",
					"m3m dielectric crystal",
					"metalized upper face",
					"piezoelectric Love wave propagation",
					"potassium niobate substrate",
					"rotated mm2 substrates",
					"semiinfinite mm2 piezoelectric substrate",
					"shear bulk wave",
					"substrate X-cut angle",
					"substrate Y-cut angle",
					"Biosensors",
					"Bonding",
					"Dielectric substrates",
					"Equations",
					"Germanium",
					"Niobium compounds",
					"Piezoelectric devices",
					"Piezoelectric films",
					"Semiconductor films",
					"Surface waves"
				],	
				"publicationTitle" : " IEEE Transactions on Ultrasonics, Ferroelectrics and Frequency Control",
				"title" : "Piezoelectric love waves on rotated Y-cut mm2 substrates",
				"date" : "November 2006",
				"volume" : "53",
				"issue" : "11",
				"pages" : "2132-2139",
				"abstractNote" : "Consider a layer consisting of a m3m dielectric crystal, with faces cut parallel to a symmetry plane. Then bond it onto a semi-infinite mm2 piezoelectric substrate. For an X- or Y-cut of the substrate, a Love wave can propagate in the resulting structure and the corresponding dispersion equation is derived analytically. It turns out that when the upper (free) face of the layer is metalized, a fully explicit treatment can also be conducted in the case of a Y-cut rotated about Z. In the case of a germanium layer over a potassium niobate substrate, the wave exists at any wavelength for X- and Y-cuts but this ceases to be the case for rotated cuts, with the appearance of forbidden ranges. By playing on the cut angle, the Love wave can be made to travel faster than, or slower than, or at the same speed as, the shear bulk wave of the layer. A by-product of the analysis is the derivation of the explicit secular equation for the Bleustein-Gulyaev wave in the substrate alone, which corresponds to an asymptotic behavior of the Love wave. The results are valid for other choices for the layer and for the substrate, provided they have the same, or more, symmetries",
				"DOI" : "10.1109/TUFFC.2006.153",
				"ISSN" : "0885-3010",
				"conferenceName" : " IEEE Transactions on Ultrasonics, Ferroelectrics and Frequency Control",
				"proceedingsTitle" : " IEEE Transactions on Ultrasonics, Ferroelectrics and Frequency Control"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					"Yung-Yu Chen",
					{
						"1" : "",
						"firstName" : "Tsung-Tsong",
						"lastName" : "Wu",
						"creatorType" : "author"
					}	
				],
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=1597932&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"permittivity",
					"quartz",
					"surface acoustic wave sensors",
					"viscosity measurement",
					"zinc compounds",
					"Love wave viscosity sensor",
					"ZnO",
					"effective permittivity approach",
					"eighth dimension matrix formulation",
					"electromechanical coupling coefficient",
					"liquid viscosity sensing",
					"temperature dependence",
					"wave attenuation",
					"Acoustic applications",
					"Acoustic devices",
					"Acoustic sensors",
					"Acoustic waves",
					"Attenuation",
					"Biosensors",
					"Damping",
					"Permittivity",
					"Temperature dependence",
					"Viscosity"
				],	
				"publicationTitle" : " 2005 IEEE Sensors",
				"title" : "Practical design of Love wave viscosity sensors using the eighth dimensional matrix formulation",
				"date" : " October 2005",
				"pages" : "4 pp.-",
				"abstractNote" : "There are increasing research activities on Love wave devices in biochemical sensing application due to its high sensitivity and low acoustic damping. This paper aims at practical design of Love wave devices for liquid viscosity sensing based on effective permittivity approach and eighth dimension matrix formulation. First, we adopted the effective permittivity approach to calculate and discuss electromechanical coupling coefficient and temperature dependence of the 0th-order Love wave in ZnO/quartz layered structures. Besides, since the measured targets are liquid, reducing wave attenuation and increasing sensitivity become two important issues for the optimum design of a Love wave sensor. To take into account the effect of liquid viscosity on the device sensitivity, we adopted the eighth dimension matrix formulation to calculate phase velocity dispersion and wave attenuation of Love wave devices loaded with water. Finally, we also compared the calculated sensitivity with the existing experimental results. Results show that the proposed approach provided a satisfactory prediction of the device sensitivity of a Love wave liquid sensor",
				"DOI" : "10.1109/ICSENS.2005.1597932",
				"conferenceName" : " 2005 IEEE Sensors",
				"proceedingsTitle" : " 2005 IEEE Sensors"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					{
						"0" : "",
						"firstName" : "J.",
						"lastName" : "Kent",
						"creatorType" : "author"
					},
					{	
						"1" : "",
						"firstName" : "R.",
						"lastName" : "Adler",
						"creatorType" : "author"
					}
				],		
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=1293378&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"Rayleigh scattering",
					"Rayleigh waves",
					"angular measurement",
					"elastic constants",
					"reflection",
					"Love wave touchscreen design",
					"Love waves coupling",
					"Rayleigh waves",
					"amplitude distribution measurements",
					"angular distribution measurements",
					"deposition",
					"etching",
					"reflection",
					"reflector array test patterns",
					"stiffness",
					"touch panels",
					"Acoustic scattering",
					"Acoustic transducers",
					"Delay",
					"Etching",
					"Glass",
					"Rayleigh scattering",
					"Substrates",
					"Surface contamination",
					"Ultrasonic transducer arrays",
					"Ultrasonic transducers"
				],	
				"publicationTitle" : " 2003 IEEE Symposium on Ultrasonics",
				"title" : "Reflecting Love waves by 90 degrees",
				"date" : " October 2003",
				"volume" : "1",
				"pages" : "158-161 Vol.1",
				"abstractNote" : "In conventional touch panels using Rayleigh waves, the waves make two right-angle turns on their way from transmitter to receiver. These turns are produced by arrays of mirror-like strips of deposited material tilted 45 degrees. To render these panels insensitive to water, Love waves may be used in place of Rayleigh waves. When two Rayleigh waves intersect under a 90&deg; angle, they share the same up and down motion, so that addition of a point mass produces coupling between the two waves. But, when two Love waves intersect at 90&deg;, their particle motions are orthogonal. We will show that useful Love-wave coupling is best achieved by perturbing the stiffness of the wave-carrying layer, not by adding mass. We have studied reflections of Love waves using two reflector-array test patterns: One, six strips of heavy and soft material deposited on a Love wave substrate, and the second, six grooves etched into the glass top layer of a similar substrate. Amplitude and angular distribution measurements demonstrate that such etched grooves are preferred for Love-wave touchscreen design.",
				"DOI" : "10.1109/ULTSYM.2003.1293378",
				"conferenceName" : " 2003 IEEE Symposium on Ultrasonics",
				"proceedingsTitle" : " 2003 IEEE Symposium on Ultrasonics"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					{
						"0" : "",
						"firstName" : "Deng Ming",
						"lastName" : "Xi",
						"creatorType" : "author"
					}
				],		
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4803629&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"harmonic generation",
					"surface acoustic wave waveguides",
					"isotropic waveguide",
					"nonlinear Love-wave propagation",
					"resonant second-harmonic generation",
					"semi-infinite solid",
					"shear partial waves",
					"solid layer",
					"Boundary conditions",
					"Frequency",
					"Pattern analysis",
					"Physics",
					"Resonance",
					"Signal analysis",
					"Signal generators",
					"Solids",
					"Surface acoustic waves",
					"Waveguide theory"
				],	
				"publicationTitle" : ", 1997 IEEE Ultrasonics Symposium, 1997. Proceedings",
				"title" : "Resonant second-harmonic generation accompanying nonlinear Love-wave propagation in an isotropic waveguide",
				"date" : " October 1997",
				"volume" : "1",
				"pages" : "577-580 vol.1",
				"abstractNote" : "In this article we have studied resonant second-harmonic generation accompanying nonlinear Love-wave propagation in an isotropic waveguide consisting of a solid layer and a semi-infinite solid. Generally, the amplitude of the second harmonic arising from the self-interaction of shear wave is independent of propagation distance, i.e., there is no effect of cumulative growth. However, for Love-wave propagation case, there are two shear partial waves in the solid layer deposited on the semi-infinite solid, and the cross-interaction between two shear waves may cause the &ldquo;resonance&rdquo; of the driving second harmonic once the phase velocity of the Love-wave equals the longitudinal velocity of the solid layer. Through second-harmonic boundary conditions and initial conditions of excitation, we formally obtain the analytical expressions for the case of resonant second-harmonic generation. The present analysis yields clearly physical insight into the process of resonant second-harmonic generation accompanying nonlinear Love-wave propagation not previously available",
				"DOI" : "10.1109/ULTSYM.1997.663088",
				"ISSN" : "1051-0117",
				"conferenceName" : ", 1997 IEEE Ultrasonics Symposium, 1997. Proceedings",
				"proceedingsTitle" : ", 1997 IEEE Ultrasonics Symposium, 1997. Proceedings"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					{
						"0" : "",
						"firstName" : "F.",
						"lastName" : "Razan",
						"creatorType" : "author"
					},
					{	
						"1" : "",
						"firstName" : "C.",
						"lastName" : "Zimmermann",
						"creatorType" : "author"
					},
					{	
						"2" : "",
						"firstName" : "D.",
						"lastName" : "Rebiere",
						"creatorType" : "author"
					},
					{	
						"3" : "",
						"firstName" : "C.",
						"lastName" : "Dejous",
						"creatorType" : "author"
					},
					{	
						"4" : "",
						"firstName" : "J.",
						"lastName" : "Pistre",
						"creatorType" : "author"
					}
				],		
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4803629&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"chemical sensors",
					"polymer films",
					"shear modulus",
					"surface acoustic wave sensors",
					"viscoelasticity",
					"Love-wave sensors",
					"acoustic wave devices",
					"gas detection",
					"polydimethylsiloxane",
					"polyetherurethane",
					"polymer-coated Love-wave device",
					"radio frequency domain",
					"sensitive coating",
					"thin film",
					"viscoelastic properties",
					"Coatings",
					"Elasticity",
					"Frequency estimation",
					"Gas detectors",
					"Mechanical sensors",
					"Polymer films",
					"Radio frequency",
					"Sensor phenomena and characterization",
					"Thin film devices",
					"Viscosity",
					"Chemical sensors",
					"Love wave",
					"polymer shear modulus",
					"sensitive coating",
					"viscoelasticity"
				],	
				"publicationTitle" : " 2004 IEEE International Symposium on Industrial Electronics",
				"title" : "Response of polymer-coated Love-wave device: a method to characterize thin film in the radio frequency domain",
				"date" : " May 2004",
				"volume" : "1",
				"pages" : "37-41 vol. 1",
				"abstractNote" : "In this paper, we present Love-wave devices and their characteristics. Love-wave sensors present a high sensitivity for gas detection. High selectivity is achieved with a sensitive coating chosen for its affinities toward a target compound, this coating is often a polymer. Acoustic wave devices are sensitive to all types of propagation perturbations which include mass loading and mechanical properties changes (e.g. viscoelasticity) of the coating. Experimental results allow to determine the contribution of viscoelastic properties of the sensitive coating to Love wave devices responses. Furthermore, it can be a mean to characterize thin film materials in radio frequency domain. Experiments were done with a polymer as sensitive layer: PEUT (polyetherurethane).The first study of PEUT properties at high frequency allows to estimate the dynamic shear modulus of this polymer and to confirm the glassy-like state of the material at high frequency. Further experiments using PDMS (polydimethylsiloxane) with different viscosity and stiffnesses on Love-wave devices are then presented and analyzed.",
				"DOI" : "10.1109/ISIE.2004.1571778",
				"conferenceName" : " 2004 IEEE International Symposium on Industrial Electronics",
				"proceedingsTitle" : " 2004 IEEE International Symposium on Industrial Electronics"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"firstName" : "J.P.",
						"lastName" : "Sullins",
						"creatorType" : "author"
					}
				],		
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=6313590&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"ethical aspects",
					"human-robot interaction",
					"humanoid robots",
					"philosophical aspects",
					"affective computing",
					"erotic love",
					"erotic wisdom",
					"ethical impacts",
					"human emotions",
					"human psychology",
					"love machine ethics",
					"loving relationship",
					"philosophical value",
					"roboticists",
					"robust artificial companion",
					"sex robots",
					"Behavioral science",
					"Ethics",
					"Human factors",
					"Psychology",
					"Robots",
					"Affective computing",
					"artificial companions",
					"artificial emotions",
					"robotics"
				],	
				"publicationTitle" : " IEEE Transactions on Affective Computing",
				"title" : "Robots, Love, and Sex: The Ethics of Building a Love Machine",
				"date" : "Fourth 2012",
				"volume" : "3",
				"issue" : "4",
				"pages" : "398-409",
				"abstractNote" : "This paper will explore the ethical impacts of the use of affective computing by engineers and roboticists who program their machines to mimic and manipulate human emotions in order to evoke loving or amorous reactions from their human users. We will see that it does seem plausible that some people might buy a love machine if it were created, but it is argued here that principles from machine ethics have a role to play in the design of these machines. This is best achieved by applying what is known about the philosophy of love, the ethics of loving relationships, and the philosophical value of the erotic in the early design stage of building robust artificial companions. The paper concludes by proposing certain ethical limits on the manipulation of human psychology when it comes to building sex robots and in the simulation of love in such machines. In addition, the paper argues that the attainment of erotic wisdom is an ethically sound goal and that it provides more to loving relationships than only satisfying physical desire. This fact may limit the possibility of creating a machine that can fulfill all that one should want out of erotic love unless a machine can be built that would help its user attain this kind of love.",
				"DOI" : "10.1109/T-AFFC.2012.31",
				"ISSN" : "1949-3045",
				"conferenceName" : " IEEE Transactions on Affective Computing",
				"proceedingsTitle" : " IEEE Transactions on Affective Computing"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					"Feng-mei Zhou",
					"Zhe Li",
					{	
						"2" : "",
						"firstName" : "Li",
						"lastName" : "Fan",
						"creatorType" : "author"
					},
					"Xun Gong",
					"Shu-yi Zhang"
				],	
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4775789&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"II-VI semiconductors",
					"Love waves",
					"X-ray diffraction",
					"biochemistry",
					"biosensors",
					"chemical sensors",
					"crystal structure",
					"dielectric materials",
					"lithium compounds",
					"molecular biophysics",
					"proteins",
					"semiconductor thin films",
					"sputtered coatings",
					"wide band gap semiconductors",
					"zinc compounds",
					"36degYX-LiTaO3 substrate",
					"Love-mode immunosensor",
					"Love-wave sensor",
					"X-ray diffraction",
					"XRD analysis",
					"ZnO-LiTaO3",
					"antibody-antigen immunoreaction",
					"aqueous solution",
					"crystalline structure",
					"highly orientated (002) film",
					"mass sensitivity",
					"protein A",
					"rf magnetron sputtering",
					"zinc oxide thin film",
					"Acoustic devices",
					"Dielectric constant",
					"Dielectric materials",
					"Dielectric substrates",
					"Magnetic sensors",
					"Monitoring",
					"Polymers",
					"Radio frequency",
					"Sputtering",
					"Zinc oxide",
					"Love wave",
					"Zinc oxide film",
					"immunosensors"
				],
				"publicationTitle" : " Symposium on Piezoelectricity, Acoustic Waves, and Device Applications, 2008. SPAWDA 2008",
				"title" : "Study of Love-mode immunosensors based on ZnO/36 #x00B0;YX-LiTaO3 structures",
				"date" : " December 2008",
				"pages" : "263-266",
				"abstractNote" : "Love-mode immunosensors based on ZnO/36degYX-LiTaO3 structures are studied. The ZnO films are grown on the 36degYX-LiTaO3 substrates by RF magnetron sputtering technique. The crystalline structures of the ZnO films are investigated by the X-ray diffraction (XRD) analysis, which show that the highly orientated (002) films are obtained. Then the Love-mode sensors are fabricated for monitoring antibody-antigen immunoreactions in aqueous solutions in real time. The results show that the Love-wave sensors based on ZnO/36degYX-LiTaO3 structures have higher mass sensitivity than those with the similar structures, such as SiO2/36degYX-LiTaO3 structure sensors.",
				"DOI" : "10.1109/SPAWDA.2008.4775789",
				"conferenceName" : " Symposium on Piezoelectricity, Acoustic Waves, and Device Applications, 2008. SPAWDA 2008",
				"proceedingsTitle" : " Symposium on Piezoelectricity, Acoustic Waves, and Device Applications, 2008. SPAWDA 2008"
			},
			{	
				"itemType" : "conferencePaper",
				"creators" : [
					"Defeng Yang"
				],	
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=5577615&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"consumer behaviour",
					"customer satisfaction",
					"Chinese university students",
					"antecedent variables",
					"brand love",
					"customer satisfaction",
					"customer value",
					"forming mechanisms",
					"love feelings",
					"perceived quality",
					"Companies",
					"Couplings",
					"Customer satisfaction",
					"Fitting",
					"Joining processes",
					"Mathematical model",
					"Numerical analysis"
				],	
				"publicationTitle" : " 2010 International Conference on Management and Service Science (MASS)",
				"title" : "The Effect of Perceived Quality and Value in Brand Love",
				"date" : " August 2010",
				"pages" : "1-3",
				"abstractNote" : "Brand love is one of useful constructs and concepts. For understanding the brand love's forming mechanisms, this article empirically explores the effect of perceived quality and value on brand love, and the mediating roles of customer satisfaction on the relationship between perceived quality and brand love. Using survey of Chinese university students, this article finds perceived quality and value can develop consumers' brand love, the two variables are brand love's antecedent variables; in attention, consumer satisfaction mediates the relationship between quality and value and brand love. This conclusion indicates that if companies want to let consumers commit love feelings to brands, their brands have to be with higher quality and customer value.",
				"DOI" : "10.1109/ICMSS.2010.5577615",
				"conferenceName" : " 2010 International Conference on Management and Service Science (MASS)",
				"proceedingsTitle" : " 2010 International Conference on Management and Service Science (MASS)"
			},
			{	
				"itemType" : "conferencePaper",
				"creators" : [
					"Haifeng Pan",
					"Huizhong Zhu",
					"Feng Guanping"
				],	
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=1179119&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"biosensors",
					"network analysers",
					"quartz",
					"surface acoustic wave sensors",
					"Love wave sensor",
					"SAW",
					"ST-cut quartz substrate",
					"SiO2",
					"biosensor",
					"fused quartz guiding layers",
					"gas phase parameters",
					"guided acoustic mode propagation",
					"insertion loss",
					"liquid operating environment",
					"liquid phase parameters",
					"mass sensitivity",
					"network analyzer",
					"noise level",
					"surface acoustic waves",
					"Acoustic devices",
					"Acoustic propagation",
					"Acoustic sensors",
					"Acoustic waves",
					"Biosensors",
					"Gas detectors",
					"Liquids",
					"Noise level",
					"Phase measurement",
					"Surface acoustic waves"
				],	
				"publicationTitle" : " IEEE 2002 International Conference on Communications, Circuits and Systems and West Sino Expositions",
				"title" : "The Love wave sensor based on network analyzer",
				"date" : "June 2002",
				"volume" : "2",
				"pages" : "1762-1765 vol.2",
				"abstractNote" : "The Love wave is one type of surface acoustic wave (SAW). It is a guided acoustic mode propagating in a thin layer deposited on a substrate. Due to the advantages of high mass sensitivity, low noise level and suitability for operating in liquids, Love wave sensors have become one of the hot spots in current research of biosensors. In this paper, Love wave devices with ST-cut quartz substrates and different thickness guiding layers of fused quartz were fabricated. The Love wave sensor based on a network analyzer was constructed and the fundamental parameters of Love wave devices in gas phase and liquid phase were measured successfully.",
				"DOI" : "10.1109/ICCCAS.2002.1179119",
				"conferenceName" : " IEEE 2002 International Conference on Communications, Circuits and Systems and West Sino Expositions",
				"proceedingsTitle" : " IEEE 2002 International Conference on Communications, Circuits and Systems and West Sino Expositions"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					"Jinxia Liu",
					"Zhiwen Cui",
					"Kexie Wang"
				],	
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4803537&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"elastic deformation",
					"elasticity",
					"inhomogeneous media",
					"plastic deformation",
					"rocks",
					"Castlegate layered rock",
					"Love waves",
					"acoustoelastic effect",
					"elastic deformation",
					"elastic-plastic materials",
					"phase velocity equations",
					"plastic deformation",
					"uniaxial stresses",
					"Acoustic materials",
					"Boundary conditions",
					"Capacitive sensors",
					"Equations",
					"Frequency",
					"Plastics",
					"Residual stresses",
					"Substrates",
					"Surface waves",
					"Tensile stress",
					"Acoustoelastic",
					"Love wave",
					"elastic-plastic"
				],	
				"publicationTitle" : " IEEE Ultrasonics Symposium, 2008. IUS 2008",
				"title" : "The acoustoelastic effect of Love waves in elastic-plastic deformed layered rocks",
				"date" : " November 2008",
				"pages" : "525-528",
				"abstractNote" : "The influences of statically deformed state including both the elastic and plastic deformations induced by applied uniaxial stresses on the Love waves in layered rocks are investigated on the basis of the acoustoelastic theory for elastic-plastic materials. The phase velocity equations of the Love waves are obtained by direct boundary conditions. The acoustoelastic effects of elastic and elastic-plastic deformations in rocks caused by static stresses are discussed by numerical results in detail. Acoustoelastic effects of Love waves exhibit similar trend, acoustoelastic effect increases rapidly with the frequency-thickness product and the velocity change approximates a constant value for thick layer and high frequency limit. Elastic-plastic deformations in the Castlegate layered rock obviously modify the phase velocities of the Love waves and cutoff points for the high-order modes.",
				"DOI" : "10.1109/ULTSYM.2008.0127",
				"conferenceName" : " IEEE Ultrasonics Symposium, 2008. IUS 2008",
				"proceedingsTitle" : " IEEE Ultrasonics Symposium, 2008. IUS 2008"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					"Qianliang Xia",
					"Zhijun Chen",
					"Mengyang Wang"
				],	
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=6293315&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"dielectric liquids",
					"electromechanical effects",
					"lithium compounds",
					"organic compounds",
					"permittivity",
					"permittivity measurement",
					"sensitivity",
					"sensors",
					"water",
					"AD9912 signal source module",
					"H2O",
					"LiTaO3",
					"Love wave liquid sensor",
					"Love wave propagation velocity",
					"SU-8 photoresist film",
					"alcohol",
					"amplitude-frequency characteristic measurement circuit",
					"delay-line type Love wave device",
					"electromechanical coupling coefficient",
					"liquid dielectric constant",
					"nonviscous liquid",
					"partial wave theory",
					"phase difference measurement circuit",
					"pure water",
					"resonant frequency",
					"sensitivity",
					"signal acquisition module",
					"surface effective permittivity",
					"Dielectric constant",
					"Dielectric liquids",
					"Dielectric measurements",
					"Frequency measurement",
					"Liquids",
					"Phase measurement",
					"Resonant frequency",
					"Love wave",
					"amplitude-frequency characteristic",
					"liquid dielectric constant",
					"partial wave theory",
					"phase difference",
					"surface effective permittivity method"
				],	
				"publicationTitle" : "Ultrasonics Symposium (IUS), 2011 IEEE International",
				"title" : "The system design of a Love wave sensor for measuring liquid dielectric constant",
				"date" : " October 2011",
				"pages" : "2301-2304",
				"abstractNote" : "Compared with other acoustic sensors, the Love wave liquid sensor has obvious advantages. The precise measurement of the liquid dielectric constant is of great importance. When the liquid is non-viscous, only the liquid dielectric constant affects the Love wave propagation velocity and resonant frequency. In this paper, by the methods of the partial wave theory and the surface effective permittivity, according to the sensitivity and the electromechanical coupling coefficient, the delay-line type Love wave device made up of 36&#x00B0;YX LiTaO3 substrate and SU-8 photoresist film is optimized and made. The phase difference measurement circuit and the amplitude-frequency characteristic measurement circuit are established with AD9912 as signal source module and AD8302 as signal acquisition module. Using different ratios of pure water and alcohol as the liquid samples, the experimental results are in accordance with the numerical simulations.",
				"DOI" : "10.1109/ULTSYM.2011.0571",
				"ISSN" : "1948-5719",
				"conferenceName" : "Ultrasonics Symposium (IUS), 2011 IEEE International",
				"proceedingsTitle" : "Ultrasonics Symposium (IUS), 2011 IEEE International"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"firstName" : "F.",
						"lastName" : "Moreira",
						"creatorType" : "author"
					},
					{	
						"1" : "",
						"firstName" : "M.",
						"lastName" : "El Hakiki",
						"creatorType" : "author"
					},
					{	
						"2" : "",
						"firstName" : "O.",
						"lastName" : "Elmazria",
						"creatorType" : "author"
					},
					{	
						"3" : "",
						"firstName" : "F.",
						"lastName" : "Sarry",
						"creatorType" : "author"
					},
					{	
						"4" : "",
						"firstName" : "L.",
						"lastName" : "Le Brizoual",
						"creatorType" : "author"
					},
					{	
						"5" : "",
						"firstName" : "P.",
						"lastName" : "Alnot",
						"creatorType" : "author"
					}
				],		
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4567521&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"II-VI semiconductors",
					"Love waves",
					"Rayleigh waves",
					"dispersion (wave)",
					"frequency response",
					"quartz",
					"surface acoustic wave sensors",
					"zinc compounds",
					"Love wave",
					"Rayleigh wave",
					"ZnO-SiO2",
					"dispersion curve",
					"elastic velocity",
					"electrical characteristics",
					"electromechanical coupling coefficient",
					"gas sensor application",
					"layered structure SAW device",
					"liquid sensor application",
					"temperature coefficient",
					"Acoustic sensors",
					"Acoustic waves",
					"Communication systems",
					"Electromechanical sensors",
					"Frequency",
					"Gas detectors",
					"Surface acoustic wave devices",
					"Surface acoustic waves",
					"Temperature sensors",
					"Zinc oxide",
					"<sup>2$</sup>",
					"Love wave",
					"ZnO/Quartz structure",
					"mode determination",
					"temperature coefficient of frequency (TCF)"
				],	
				"publicationTitle" : " IEEE Sensors Journal",
				"title" : "Theoretical and Experimental Identification of Love Wave Frequency Peaks in Layered Structure ZnO/Quartz SAW Device",
				"date" : " August 2008",
				"volume" : "8",
				"issue" : "8",
				"pages" : "1399-1403",
				"abstractNote" : "In this paper, the layered structure ZnO/Quartz (90deg rotated ST-cut) is investigated theoretically and experimentally. Both waves, Rayleigh and Love, are analyzed. Dispersion curves of phase velocities, electromechanical coupling coefficient (K 2) and temperature coefficient of frequency (TCF) were calculated as a function of normalized thickness ZnO film (kh ZnO = 2pih ZnO /lambda) and the optimum value of h ZnO was determined for experimental study. Experimental results combined with simulation lead to clearly identify the generated waves and their higher modes in this structure except the mode 0 that shows comparable velocity for both Rayleigh and Love waves. The identification of the wave type was performed by studying the frequency response of the device with or without a droplet of water in the wave path. We also demonstrate that the highest elastic velocity is obtained for the mode 1 of the Love wave. This Love wave mode exhibits very interesting electrical characteristics, good K 2, high-frequency rejection, low TCF, and very low attenuation in liquid making it very attractive for gas and liquid sensor applications.",
				"DOI" : "10.1109/JSEN.2008.920704",
				"ISSN" : "1530-437X",
				"conferenceName" : " IEEE Sensors Journal",
				"proceedingsTitle" : " IEEE Sensors Journal"
			},
			{
				"itemType" : "conferencePaper",
				"creators" : [
					"Mengyang Wang",
					"Zhijun Chen",
					"Qianliang Xia",
					"Peng Ruan"
				],	
				"attachments" : [
					{
						"0" : "",
						"url" : "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=6243684&queryText%3Dlove",
						"title" : "IEEE Xplore Abstract Record",
						"mimeType" : "text/html"
					}
				],		
				"tags" : [
					"Love waves",
					"surface acoustic wave devices",
					"Love wave attenuation",
					"Love wave device",
					"Love wave liquid sensor",
					"Love wave sensitivity",
					"SAW devices",
					"acoustic sensors",
					"acoustic wavelength",
					"film thickness",
					"liquid viscosity",
					"propagation velocity",
					"surface acoustic wave devices",
					"theory modeling",
					"viscous liquid",
					"Attenuation",
					"Boundary conditions",
					"Films",
					"Liquids",
					"Load modeling",
					"Sensitivity",
					"Viscosity"
				],	
				"publicationTitle" : "Frequency Control Symposium (FCS), 2012 IEEE International",
				"title" : "Theory modeling of love wave device loaded with viscous liquid",
				"date" : " May 2012",
				"pages" : "1-5",
				"abstractNote" : "Love wave device is one of the typical SAW(surface acoustic wave) devices. Relative to other acoustic sensors, the Love wave liquid sensor has some obvious advantages. In this paper, the theory model of Love wave is established, the influences of liquid viscosity on propagation velocity and attenuation of Love wave are numerically analyzed. The changes of Love wave sensitivity to liquid viscosity and density with the ratio of the film thickness to the acoustic wavelength are numerically analyzed.",
				"DOI" : "10.1109/FCS.2012.6243684",
				"ISSN" : "1075-6787",
				"conferenceName" : "Frequency Control Symposium (FCS), 2012 IEEE International",
				"proceedingsTitle" : "Frequency Control Symposium (FCS), 2012 IEEE International"
			}
		]
	}
]
/** END TEST CASES **/
PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb, testCases: testCases });
}());