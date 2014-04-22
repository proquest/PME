(function(){
var translatorSpec =
{
	"translatorID": "5eacdb93-20b9-4c46-a89b-523f62935ae4",
	"label": "HighWire",
	"creator": "Simon Kornblith",
	"target": "^http://[^/]+/(?:cgi/searchresults|cgi/search|cgi/content/(?:abstract|full|short|summary)|current.dtl$|content/vol[0-9]+/issue[0-9]+/(?:index.dtl)?$)",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2012-09-04 23:12:25"
}

function detectWeb(doc, url) {
	if(doc.title.indexOf(" -- Search Result") !== -1) {
		if(doc.evaluate('//table/tbody/tr[td/input[@type="checkbox"][@name="gca"]]', doc,
			null, XPathResult.ANY_TYPE, null).iterateNext()) return "multiple";
	} else if(doc.title.indexOf(" -- Table of Contents") != -1) {
		if(doc.evaluate('//form/dl', doc, null, XPathResult.ANY_TYPE,null).iterateNext()) return "multiple";
	} else {
		if(doc.evaluate('//a[substring(@href, 1, 16) = "/cgi/citmgr?gca="]', doc, null,
			XPathResult.ANY_TYPE, null).iterateNext()) return "journalArticle";
	}

	return false;
}

function handleRequests(requests) {
	if(requests.length == 0) {
		PME.done();
		return;
	}

	var request = requests.shift();
	var URL = request.baseURL+request.args;

	PME.Util.HTTP.doGet(URL, function(text) {
		// load translator for RIS
		var translator = PME.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			if(item.notes[0]) {
				item.DOI = PME.Util.unescapeHTML(item.notes[0].note);
				item.notes = [];
			}
			//remove all caps from titles and authors.
			for (i in item.creators){
				if (item.creators[i].lastName && item.creators[i].lastName == item.creators[i].lastName.toUpperCase()) {
					item.creators[i].lastName = PME.Util.capitalizeTitle(item.creators[i].lastName.toLowerCase(),true);
				}
				if (item.creators[i].firstName && item.creators[i].firstName == item.creators[i].firstName.toUpperCase()) {
					item.creators[i].firstName = PME.Util.capitalizeTitle(item.creators[i].firstName.toLowerCase(),true);
				}
			}
			if (item.title == item.title.toUpperCase()) {
				item.title = PME.Util.capitalizeTitle(item.title.toLowerCase(),true);
			}
			item.attachments = [];
			var snapshot = request.snapshots.shift();
			var pdf = request.pdfs.shift();
			if(snapshot) {
				if(typeof(snapshot) == "string") {
					// string snapshot (from search)
					item.attachments.push({title:"HighWire Snapshot", mimeType:"text/html", url:snapshot});
				} else {
					// document object
					item.attachments.push({title:"HighWire Snapshot", document:snapshot});
				}
			}
			if(pdf) {
				var m = pdf.match(/^[^?]+/);
				item.attachments.push({title:"HighWire Full Text PDF", mimeType:"application/pdf", url:m[0]+".pdf"});
			}

			item.complete();
		});
		translator.translate();

		//handleRequests(requests);
	});
}

function doWeb(doc, url) {
	var requests = [];
	var hostRe = /https?:\/\/[^\/]+/;

	var isSearch = doc.title.indexOf("Search Result") != -1
	var isTOC = doc.title.indexOf(" -- Table of Contents") != -1;
	var isScience = doc.title.indexOf("Science Magazine Search Results") != -1;
	if(isSearch || isTOC) {
		// search page
		var items = {};
		var snapshots = {};
		var pdfs = {};

		if(isTOC) {
			var gcaRe = /^https?:\/\/[^\/]+\/cgi\/reprint\/([0-9]+\/[0-9]+\/[0-9]+)/;
			var tableRows = doc.evaluate('//form/dl', doc, null, XPathResult.ANY_TYPE, null);
		} else if(isScience) {
			var tableRows = doc.evaluate('//form/dl/dd', doc, null, XPathResult.ANY_TYPE, null);
			var tableDTs = doc.evaluate('//form/dl/dt', doc, null, XPathResult.ANY_TYPE, null);
		} else {
			var tableRows = doc.evaluate('//table/tbody/tr[td/input[@type="checkbox"]][td/font/strong]', doc,
				null, XPathResult.ANY_TYPE, null);
		}

		var tableRow, link;
		while(tableRow = tableRows.iterateNext()) {
			var snapshot = undefined;
			var pdf = undefined;

			if(isTOC) {
				var title = PME.Util.getNodeText(doc.evaluate('.//strong', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext());

				var links = doc.evaluate('.//a', tableRow, null, XPathResult.ANY_TYPE, null);
				while(link = links.iterateNext()) {
					// prefer Full Text snapshots, but take abstracts
					if(PME.Util.getNodeText(link) == "[Abstract]") {
						if(!snapshot) snapshot = link.href;
					} else if (PME.Util.getNodeText(link) == "[Full Text]") {
						snapshot = link.href;
					} else if(PME.Util.getNodeText(link) == "[PDF]") {
						pdf = link.href;
						var m = gcaRe.exec(link.href);
						var gca = m[1];
					}
				}
			} else {
				if(isScience) {
					var tableDT = tableDTs.iterateNext();
					var gca = doc.evaluate('./input[@type="checkbox"]', tableDT, null, XPathResult.ANY_TYPE, null).iterateNext().value;
					var title = PME.Util.getNodeText(doc.evaluate('./label', tableDT, null, XPathResult.ANY_TYPE, null).iterateNext());
				} else {
					var gca = doc.evaluate('./td/input[@type="checkbox"]', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext().value;
					var title = doc.evaluate('./td/font/strong', tableRow, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
					if(PME.Util.getNodeText(title.snapshotItem(0)).toUpperCase() == PME.Util.getNodeText(title.snapshotItem(0))) {
						title = PME.Util.getNodeText(title.snapshotItem(1));
					} else {
						title = PME.Util.getNodeText(title.snapshotItem(0));
					}
				}

				var links = doc.evaluate('.//a', tableRow, null, XPathResult.ANY_TYPE, null);
				while(link = links.iterateNext()) {
					// prefer Full Text snapshots, but take abstracts
					var textContent = PME.Util.trimInternal(PME.Util.getNodeText(link));
					if((textContent.substr(0, 8) == "Abstract" && !snapshot) || textContent.substr(0, 9) == "Full Text") {
						snapshot = link.href;
					} else if(textContent.substr(0, 3) == "PDF") {
						pdf = link.href;
					}
				}
			}

			snapshots[gca] = snapshot;
			pdfs[gca] = pdf;

			items[gca] = PME.Util.trimInternal(title);
		}

		PME.selectItems(items, function(items) {
			if(!items) return true;

			var requests = [];
			for(var gca in items) {
				var m = hostRe.exec(pdfs[gca]);
				var baseURL = window.location.protocol +'//' + doc.location.host + '/cgi/citmgr?type=refman';

				var thisRequest = null;
				for (var request_x=0; request_x<requests.length; request_x++) {
					var request = requests[request_x];
					if(request.baseURL == baseURL) {
						thisRequest = request;
						break;
					}
				}

				if(!thisRequest) {
					thisRequest = {};
					thisRequest.snapshots = [];
					thisRequest.pdfs = [];
					thisRequest.args = "";
					thisRequest.baseURL = baseURL;
					requests.push(thisRequest);
				}

				thisRequest.snapshots.push(snapshots[gca]);
				thisRequest.pdfs.push(pdfs[gca]);
				thisRequest.args += "&gca="+gca;
			}
			handleRequests(requests);
		});
	} else {
		var baseURL = doc.evaluate('//a[substring(@href, 1, 16) = "/cgi/citmgr?gca="]', doc, null,
			XPathResult.ANY_TYPE, null).iterateNext().href;
		var pdf = doc.location.href.replace(/\/content\/[^\/]+\//, "/reprint/");
		PME.debug(pdf);
		var requests = [{baseURL:baseURL, args:"&type=refman", snapshots:[doc], pdfs:[pdf]}];
		handleRequests(requests);
	}

	PME.wait();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://highwire.stanford.edu/cgi/searchresults?y=0&andorexactfulltext=and&resourcetype=1&fulltext=formula&x=0&searchsubmit=redo&hits=10&request_history_element=0&request_history_store_element=false",
		"items": [
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Guinard",
						"firstName" : "Solene",
						"creatorType" : "author"
					},
					{
						"1" : "",
						"lastName" : "Chiche",
						"firstName" : "Zoe",
						"creatorType" : "author"
					},
					{
						"2" : "",
						"lastName" : "Martin",
						"firstName" : "Jerome",
						"creatorType" : "author"
					},
					{
						"3" : "",
						"lastName" : "L'Her",
						"firstName" : "Erwan",
						"creatorType" : "author"
					}
				],	
				"title" : "A prospective evaluation of different anthropometric height estimation formula",
				"date" : "1 September 2011",
				"publicationTitle" : "European Respiratory Journal",
				"journalAbbreviation" : "Eur. Respir. J.",
				"pages" : "p2045",
				"volume" : "38",
				"issue" : "Suppl_55",
				"url" : "http://erj.ersjournals.com/cgi/content/abstract/38/Suppl_55/p2045",
				"abstractNote" : "It is now accepted that protective ventilation with low (6ml/kg of predictive body weight) tidal volume beneficiates to ARDS patient.To determinate predictive body weight, the gender and height of patients have to be known. However, in the ED or in the ICU, patients are often unable to provide their height and tape measurement is usually not valid. The purpose of this study is to evaluate different easy and reproducible anthropometric indicators, which could be correlated to the exact patients' height. Several indicators have been prospectively evaluated on 60 healthy volunteers and correlated to their real height. Height evaluation formula are based on different simple measurements correlation coefficient (r) was calculated by linear regression as compared to exact measured height. Results: See table 1. Among 16 anthropometric different height estimation formula, ulna's length and tibia's length were best correlated with the real volunteers' height. View this table: TABLE1500400TABLE1  Table 1. Correlation between real height and anthropometric indicators (we have only colligated each limb's best formula in this table enhance readability) Discussion: Several simple limb measurements can accurately predict exact patients' height. These estimations have now to be tested on ICU patients, in order to evaluate their bedside feasibility and usefulness."
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Krivovichev",
						"firstName" : "Sergey V.",
						"creatorType" : "author"
					},
					{
						"1" : "",
						"lastName" : "Yakovenchuk",
						"firstName" : "Victor N.",
						"creatorType" : "author"
					},
					{
						"2" : "",
						"lastName" : "Burns",
						"firstName" : "Peter C.",
						"creatorType" : "author"
					},
					{
						"3" : "",
						"lastName" : "Pakhomovsky",
						"firstName" : "Yakov A.",
						"creatorType" : "author"
					},
					{
						"4" : "",
						"lastName" : "Menshikov",
						"firstName" : "Yury P.",
						"creatorType" : "author"
					}
				],	
				"title" : "Cafetite, Ca[Ti2O5](H2O): Crystal structure and revision of chemical formula",
				"date" : "1 February 2003",
				"publicationTitle" : "American Mineralogist",
				"journalAbbreviation" : "American Mineralogist",
				"pages" : "424-429",
				"volume" : "88",
				"issue" : "2-3",
				"url" : "http://ammin.geoscienceworld.org/cgi/content/abstract/88/2-3/424",
				"abstractNote" : "The crystal structure of cafetite, ideally Ca[Ti2O5](H2O), (monoclinic, P21/n, a = 4.9436(15), b = 12.109(4), c = 15.911(5) A, {beta} = 98.937(5){degrees}, V = 940.9(5) A3, Z = 8) has been solved by direct methods and refined to R1 = 0.057 using X-ray diffraction data collected from a crystal pseudo-merohedrally twinned on (001). There are four symmetrically independent Ti cations; each is octahedrally coordinated by six O atoms. The coordination polyhedra around the Ti cations are strongly distorted with individual Ti-O bond lengths ranging from 1.743 to 2.223 A (the average  bond length is 1.98 A). Two symmetrically independent Ca cations are coordinated by six and eight anions for Ca1 and Ca2, respectively. The structure is based on [Ti2O5] sheets of TiO6 octahedra parallel to (001). The Ca atoms and H2O groups are located between the sheets and link them into a three-dimensional structure. The structural formula of cafetite confirmed by electron microprobe analysis is Ca[Ti2O5](H2O), in contrast to the formula (Ca,Mg)(Fe,Al)2Ti4O12.4H2O suggested by Kukharenko et al. (1959). The wrong chemical formula suggested for cafetite by Kukharenko et al. (1959) is probably due to admixtures of magnetite or titanomagnetite in their samples. Cafetite is chemically related to kassite, CaTi2O4(OH)2, but differs from it in structure and structural formula."
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Plasil",
						"firstName" : "Jakub",
						"creatorType" : "author"
					},
					{
						"1" : "",
						"lastName" : "Fejfarova",
						"firstName" : "Karla",
						"creatorType" : "author"
					},
					{
						"2" : "",
						"lastName" : "Wallwork",
						"firstName" : "Kia Sheree",
						"creatorType" : "author"
					},
					{
						"3" : "",
						"lastName" : "Dusek",
						"firstName" : "Michal",
						"creatorType" : "author"
					},
					{
						"4" : "",
						"lastName" : "Skoda",
						"firstName" : "Radek",
						"creatorType" : "author"
					},
					{
						"5" : "",
						"lastName" : "Sejkora",
						"firstName" : "Jiri",
						"creatorType" : "author"
					},
					{
						"6" : "",
						"lastName" : "Cejka",
						"firstName" : "Jiri",
						"creatorType" : "author"
					},
					{
						"7" : "",
						"lastName" : "Veselovsky",
						"firstName" : "Frantisek",
						"creatorType" : "author"
					},
					{
						"8" : "",
						"lastName" : "Hlousek",
						"firstName" : "Jan",
						"creatorType" : "author"
					},
					{
						"9" : "",
						"lastName" : "Meisser",
						"firstName" : "Nicolas",
						"creatorType" : "author"
					},
					{
						"10" : "",
						"lastName" : "Brugger",
						"firstName" : "Joel",
						"creatorType" : "author"
					}
				],	
				"title" : "Crystal structure of pseudojohannite, with a revised formula, Cu3(OH)2[(UO2)4O4(SO4)2](H2O)12",
				"date" : "1 October 2012",
				"publicationTitle" : "American Mineralogist",
				"journalAbbreviation" : "American Mineralogist",
				"pages" : "1796-1803",
				"volume" : "97",
				"issue" : "10",
				"url" : "http://ammin.geoscienceworld.org/cgi/content/abstract/97/10/1796",
				"abstractNote" : "The crystal structure of pseudojohannite from White Canyon, Utah, was solved by charge-flipping from single-crystal X-ray diffraction data and refined to an Robs = 0.0347, based on 2664 observed reflections. Pseudojohannite from White Canyon is triclinic, P[IMG]f1.gif\" ALT=\"1\" BORDER=\"0\">, with a = 8.6744(4), b = 8.8692(4), c = 10.0090(5) A,  = 72.105(4){degrees}, {beta} = 70.544(4){degrees}, {gamma} = 76.035(4){degrees}, and V = 682.61(5) A3, with Z = 1 and chemical formula Cu3(OH)2[(UO2)4O4(SO4)2](H2O)12. The crystal structure of pseudojohannite is built up from sheets of zippeite topology that do not contain any OH groups; these sheets are identical to those found in zippeites containing Mg2+, Co2+, and Zn2+. The two Cu2+ sites in pseudojohannite are [5]- and [6]-coordinated by H2O molecules and OH groups. The crystal structure of the pseudojohannite holotype specimen from Jachymov was refined using Rietveld refinement of high-resolution powder diffraction data. Results indicate that the crystal structures of pseudojohannite from White Canyon and Jachymov are identical.",
				"DOI" : "10.2138/am.2012.4127"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Kyle",
						"firstName" : "ug",
						"creatorType" : "author"
					},
					{
						"1" : "",
						"lastName" : "Pichard",
						"firstName" : "c",
						"creatorType" : "author"
					},
					{
						"2" : "",
						"lastName" : "Rochat",
						"firstName" : "t",
						"creatorType" : "author"
					},
					{
						"3" : "",
						"lastName" : "Slosman",
						"firstName" : "do",
						"creatorType" : "author"
					},
					{
						"4" : "",
						"lastName" : "Fitting",
						"firstName" : "jw",
						"creatorType" : "author"
					},
					{
						"5" : "",
						"lastName" : "Thiebaud",
						"firstName" : "d",
						"creatorType" : "author"
					}
				],	
				"title" : "New bioelectrical impedance formula for patients with respiratory insufficiency: comparison to dual-energy X-ray absorptiometry",
				"date" : "1 October 1998",
				"publicationTitle" : "European Respiratory Journal",
				"journalAbbreviation" : "Eur. Respir. J.",
				"pages" : "960-966",
				"volume" : "12",
				"issue" : "4",
				"url" : "http://erj.ersjournals.com/cgi/content/abstract/12/4/960",
				"abstractNote" : "Malnutrition in patients with severe respiratory insufficiency can lead to severe complications, justifying the use of objective nutritional assessment techniques, such as bioelectrical impedance analysis (BIA), which is an easy, noninvasive method of measuring body composition. The purpose of this study was to develop, and validate against dual-energy X-ray absorptiometry (DXA), a BIA formula to predict fat-free mass (FFM) specific for patients with chronic severe respiratory insufficiency. Seventy-five ambulatory patients (15 females and 60 males) with severe chronic respiratory insufficiency (obstructive and restrictive) aged 63.6+/-19.2 yrs (mean+/-SD), in a stable pulmonary and cardiac condition for > or = 2 months, were measured simultaneously with BIA and DXA. Patients younger than 45 yrs of age and with a body mass index > or = 32 kg x m(-2) were excluded. The best-fitting multiple regression equation to predict FFM = -6.06 +/- (height x 0.283) +/- (weight x 0.207) - (resistance x 0.024) +/- (sex (males=1, females=0) x 4.036), gave a correlation coefficient of r=0.952, slope+/-SEM 0.902+/-0.034, standard error of the estimate 1.670, and p"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Plasil",
						"firstName" : "Jakub",
						"creatorType" : "author"
					},
					{
						"1" : "",
						"lastName" : "Fejfarova",
						"firstName" : "Karla",
						"creatorType" : "author"
					},
					{
						"2" : "",
						"lastName" : "Cejka",
						"firstName" : "Jiri",
						"creatorType" : "author"
					},
					{
						"3" : "",
						"lastName" : "Dusek",
						"firstName" : "Michal",
						"creatorType" : "author"
					},
					{
						"4" : "",
						"lastName" : "Skoda",
						"firstName" : "Radek",
						"creatorType" : "author"
					},
					{
						"5" : "",
						"lastName" : "Sejkora",
						"firstName" : "Jiri",
						"creatorType" : "author"
					}
				],	
				"title" : "Revision of the crystal structure and chemical formula of haiweeite, Ca(UO2)2(Si5O12)(OH)2{middle dot}6H2O",
				"date" : "1 April 2013",
				"publicationTitle" : "American Mineralogist",
				"journalAbbreviation" : "American Mineralogist",
				"pages" : "718-723",
				"volume" : "98",
				"issue" : "4",
				"url" : "http://ammin.geoscienceworld.org/cgi/content/abstract/98/4/718",
				"abstractNote" : "The previously published crystal structure study suggested that haiweeite is orthorhombic, Cmcm, with a = 7.125(1), b = 17.937(2), c = 18.342(2) A, and V = 2344.3(7) A3, and an ideal chemical formula Ca[(UO2)2Si5O12(OH)2]{middle dot}3H2O, with Z = 4. Using single-crystal X-ray diffraction and electron microprobe analysis we re-examined haiweeite from the Teofilo Otoni, Minas Gerais, Brazil. Our diffraction experiment provided weak reflections responsible for doubling of the b cell parameter (for the current space-group settings), leading finally to the choice of a different space group. Haiweeite is thus orthorhombic, the space group Pbcn, with the unit-cell parameters a = 18.3000(5), b = 14.2331(3), c = 17.9192(5) A, V = 4667.3(2) A3, and an ideal formula Ca[(UO2)2(SiO3OH)2(Si3O6)]{middle dot}6H2O (6.25 H2O inferred from the thermal analysis; 7.50 H2O from the structure model), with Z = 8. The structure refinement yielded R1 = 0.0512 for 2498 observed reflections [Iobs > 3{sigma}(I)] and wR2 = 0.1286 for all 6117 unique reflections. Structure solution confirmed by subsequent refinement provided a structure model with full occupancies for U, Si, and Ca atoms, contrasting to previous average structure model. Although the general topology of our structure resembles that reported previously, all Si and O sites in our structure are fully occupied, in contrast to the previous structure determination.",
				"DOI" : "10.2138/am.2013.4284"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Fejfarova",
						"firstName" : "Karla",
						"creatorType" : "author"
					},
					{
						"1" : "",
						"lastName" : "Plasil",
						"firstName" : "Jakub",
						"creatorType" : "author"
					},
					{
						"2" : "",
						"lastName" : "Yang",
						"firstName" : "Hexiong",
						"creatorType" : "author"
					},
					{
						"3" : "",
						"lastName" : "Cejka",
						"firstName" : "Jiri",
						"creatorType" : "author"
					},
					{
						"4" : "",
						"lastName" : "Dusek",
						"firstName" : "Michal",
						"creatorType" : "author"
					},
					{
						"5" : "",
						"lastName" : "Downs",
						"firstName" : "Robert T.",
						"creatorType" : "author"
					},
					{
						"6" : "",
						"lastName" : "Barkley",
						"firstName" : "Madison C.",
						"creatorType" : "author"
					},
					{
						"7" : "",
						"lastName" : "Skoda",
						"firstName" : "Radek",
						"creatorType" : "author"
					}
				],	
				"title" : "Revision of the crystal structure and chemical formula of weeksite, K2(UO2)2(Si5O13){middle dot}4H2O",
				"date" : "1 April 2012",
				"publicationTitle" : "American Mineralogist",
				"journalAbbreviation" : "American Mineralogist",
				"pages" : "750-754",
				"volume" : "97",
				"issue" : "4",
				"url" : "http://ammin.geoscienceworld.org/cgi/content/abstract/97/4/750",
				"abstractNote" : "The previously published structure determination of weeksite from the Anderson mine, Arizona, U.S.A., suggested that it is orthorhombic, Cmmb, with a = 14.209(2), b = 14.248(2), c = 35.869(4) A, and V = 7262(2) A3, and an ideal chemical formula (K,Ba)1-2(UO2)2(Si5O13){middle dot}H2O. Using single-crystal X-ray diffraction, electron microprobe analysis, and thermal analysis, we reexamined weeksite from the same locality. Our results demonstrate that weeksite is monoclinic, with the space group C2/m and unit-cell parameters a = 14.1957(4), b = 14.2291(5), c = 9.6305(3) A, {beta} = 111.578(3){degrees}, V = 1808.96(10) A3, and an ideal formula K2(UO2)2(Si5O13){middle dot}4H2O. The previously reported orthorhombic unit cell is shown to result from twinning of the monoclinic cell. The structure refinement yielded R1 = 2.84% for 1632 observed reflections [Iobs > 3{sigma}(I)] and 5.42% for all 2379 reflections. The total H2O content derived from the structure refinement agrees well with that from the thermal analysis. Although the general topology of our structure resembles that reported previously, all Si sites in our structure are fully occupied, in contrast to the previous structure determination, which includes four partially occupied SiO4 tetrahedra. From our structure data on weeksite, it appears evident that the orthorhombic cell of the newly discovered weeksite-type mineral coutinhoite, ThxB1-2x(UO2)2Si5O13{middle dot}3H2O, needs to be reevaluated.",
				"DOI" : "10.2138/am.2012.4025"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Camara",
						"firstName" : "Fernando",
						"creatorType" : "author"
					},
					{
						"1" : "",
						"lastName" : "Oberti",
						"firstName" : "Roberta",
						"creatorType" : "author"
					},
					{
						"2" : "",
						"lastName" : "Chopin",
						"firstName" : "Christian",
						"creatorType" : "author"
					},
					{
						"3" : "",
						"lastName" : "Medenbach",
						"firstName" : "Olaf",
						"creatorType" : "author"
					}
				],	
				"title" : "The arrojadite enigma: I. A new formula and a new model for the arrojadite structure",
				"date" : "1 August 2006",
				"publicationTitle" : "American Mineralogist",
				"journalAbbreviation" : "American Mineralogist",
				"pages" : "1249-1259",
				"volume" : "91",
				"issue" : "8-9",
				"url" : "http://ammin.geoscienceworld.org/cgi/content/abstract/91/8-9/1249",
				"abstractNote" : "A re-examination of the chemistry and structure of nearly all the known occurrences of arrojadite and related minerals (dickinsonite and sigismundite) allowed understanding of the main substitution vectors and cation ordering schemes ruling the crystal-chemistry of these very complex phosphates. Electron microprobe analyses were done with a careful choice of the standards and of experimental conditions, and were coupled with LA-ICP-MS in situ analysis for Li, Be, and B. Structure refinement was done in a space group (Cc) with a lower symmetry than those used in previous studies (C2/c and its equivalents), which allowed a better understanding of the structure details and of cation ordering. The combined approach yielded a new formula for the arrojadite group, namely A2B2Ca1Na2+xM13Al (PO4)11(PO3OH1-x)W2, where A are either large divalent cations (Ba, Sr, Pb) plus vacancy, or monovalent (K, Na) cations; and B are either small divalent cations (Fe, Mn, Mg) plus vacancy, or monovalent (Na) cations. The number of hydroxyl groups in the arrojadite formula is generally 3 apfu, and can be lowered to 2 apfu in particular when the sum of non-(P,Al) cations is higher than 20 apfu.  We present in this paper the complete characterization of three samples (two of which are new members) that are crucial to fix the cornerstones of arrojadite crystal-chemistry. The sample from Rapid Creek (Yukon Territory) is the holotype for arrojadite-(KNa), and has unit formula K0.83Na5.01(Ca0.91Sr0.01){sum} = 0.92 (Fe9.342+Mg2.69Mn1.032+Zn0.01Li0.01){sum} = 13.08 (Al1.04Ti0.02){sum} = 1.06(OH1.97F0.03){sum} =2.00[(P11.99Si0.01T1)O47(OH)1.00] [ideally, A1K A2Na B1Na B2Na Na1,2Na2 Na3{square}CaCa MFe13 Al (PO4)11 P1x (PO3OH) W(OH,F)2] and unit-cell dimensions: a = 16.5220(11), b = 10.0529(7), c = 24.6477 (16) A, {beta} = 106.509(2){degrees}, V = 3932.2(7) A3 (Z = 4). The sample from Horrsjoberg (Varmland, Sweden) is the holotype material for arrojadite-(SrFe), and has unit formula Sr0.93Na3.20(Ca0.59Ba0.20Pb0.03K0.03){sum} = 0.85 (Fe6.642+Mg3.61Mn3.332+Zn0.07Li0.01){sum} = 13.66 (Sc0.04Al1.00){sum} = 1.04 (OH1.10F0.90){sum} = 2.00[(P11.95Si0.02){sum} = 11.97O47(OH)1.00] [ideally, A1Sr A2{square}B1Fe2+ B2{square}Na1,2Na2 Na3{square}CaCa MFe132+ Al (PO4)11 P1x(PO3OH) W(OH,F)2], and unit-cell dimensions a = 16.3992(7), b = 9.9400(4), c = 24.4434(11) A, {beta} = 105.489(1){degrees}, V = 3839.76(46) A3. The sample from Branchville (Connecticut) is the holotype material for dickinsonite-(KMnNa), and has unit formula K0.50Na5.78(Ca0.51Sr0.05Ba0.01Pb0.01){sum} = 0.58(Mn9.702+ Fe3.722+Li0.31Mg0.06Zn0.01){sum}=13.80(Al0.91Fe0.093+Ti0.01){sum}=1.00(OH1.97F0.03){sum}=2.00[(P12.02Si0.01){sum} = 12.03O47(OH)0.21] [ideally, A1K A2Na B1Mn B2{square}Na1,2Na2 Na3Na CaCa MMn13 Al (PO4)11 P1x (PO4) W(OH, F)2] and unit-cell dimensions a = 16.6900 (9), b = 10.1013 (5), c = 24.8752 (13) A, {beta} = 105.616(2){degrees}, V = 4038.9(7) A3.",
				"DOI" : "10.2138/am.2006.2189"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Origlieri",
						"firstName" : "Marcus J.",
						"creatorType" : "author"
					},
					{
						"1" : "",
						"lastName" : "Yang",
						"firstName" : "Hexiong",
						"creatorType" : "author"
					},
					{
						"2" : "",
						"lastName" : "Downs",
						"firstName" : "Robert T.",
						"creatorType" : "author"
					},
					{
						"3" : "",
						"lastName" : "Posner",
						"firstName" : "Esther S.",
						"creatorType" : "author"
					},
					{
						"4" : "",
						"lastName" : "Domanik",
						"firstName" : "Kenneth J.",
						"creatorType" : "author"
					},
					{
						"5" : "",
						"lastName" : "Pinch",
						"firstName" : "William W.",
						"creatorType" : "author"
					}
				],	
				"title" : "The crystal structure of bartelkeite, with a revised chemical formula, PbFeGeVI(Ge2IVO7)(OH)2{middle dot}H2O, isotypic with high-pressure P21/m lawsonite",
				"date" : "1 October 2012",
				"publicationTitle" : "American Mineralogist",
				"journalAbbreviation" : "American Mineralogist",
				"pages" : "1812-1815",
				"volume" : "97",
				"issue" : "10",
				"url" : "http://ammin.geoscienceworld.org/cgi/content/abstract/97/10/1812",
				"abstractNote" : "Bartelkeite from Tsumeb, Namibia, was originally described by Keller et al. (1981) with the chemical formula PbFeGe3O8. By means of electron microprobe analysis, single-crystal X-ray diffraction, and Raman spectroscopy, we examined this mineral from the type locality. Our results show that bartelkeite is monoclinic with space group P21/m, unit-cell parameters a = 5.8279(2), b = 13.6150(4), c = 6.3097(2) A, {beta} = 127.314(2){degrees}, and a revised ideal chemical formula PbFeGeVIGe2IVO7(OH)2{middle dot}H2O (Z = 2). Most remarkably, bartelkeite is isostructural with the high-pressure P21/m phase of lawsonite, CaAl2Si2O7(OH){middle dot}H2O, which is only stable above 8.6 GPa and a potential host for H2O in subducting slabs. Its structure consists of single chains of edge-sharing FeO6 and Ge1O6 octahedra parallel to the c-axis, cross-linked by Ge22O7 tetrahedral dimers. The average  bond lengths for the GeO6 and GeO4 polyhedra are 1.889 and 1.744 A, respectively. The Pb atoms and H2O groups occupy large cavities within the framework. The hydrogen bonding scheme in bartelkeite is similar to that in lawsonite. Bartelkeite represents the first known mineral containing both 4- and 6-coordinated Ge atoms and may serve as an excellent analog for further exploration of the temperature-pressure-composition space of lawsonite.",
				"DOI" : "10.2138/am.2012.4269"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Tait",
						"firstName" : "Kimberly T.",
						"creatorType" : "author"
					},
					{
						"1" : "",
						"lastName" : "Yang",
						"firstName" : "Hexiong",
						"creatorType" : "author"
					},
					{
						"2" : "",
						"lastName" : "Downs",
						"firstName" : "Robert T.",
						"creatorType" : "author"
					},
					{
						"3" : "",
						"lastName" : "Li",
						"firstName" : "Chen",
						"creatorType" : "author"
					},
					{
						"4" : "",
						"lastName" : "Pinch",
						"firstName" : "William W.",
						"creatorType" : "author"
					}
				],	
				"title" : "The crystal structure of esperite, with a revised chemical formula, PbCa2(ZnSiO4)3, isostructural with beryllonite",
				"date" : "1 May 2010",
				"publicationTitle" : "American Mineralogist",
				"journalAbbreviation" : "American Mineralogist",
				"pages" : "699-705",
				"volume" : "95",
				"issue" : "5-6",
				"url" : "http://ammin.geoscienceworld.org/cgi/content/abstract/95/5-6/699",
				"abstractNote" : "Esperite from Franklin, New Jersey, was first described by Moore and Ribbe (1965) as monoclinic with a well-developed \"superlattice\" a = 2 x 8.814(2) A, b = 8.270(3) A, c = 2 x 15.26(1) A, {beta} {approx} 90{degrees}, space group P21/n (subcell), and the chemical formula PbCa3(ZnSiO4)4. They attributed \"superlattice\" reflections to the ordered distributions of Pb and Ca cations over four beryllonite-type subcells for esperite with the Ca:Pb ratio greater than 2:1.  We examined two esperite fragments from the type sample using single-crystal X-ray diffraction, electron microprobe analysis, and Raman spectroscopy. Although both fragments have Ca:Pb {approx} 1.8, one exhibits the \"superlattice\" reflections as observed by Moore and Ribbe (1965), whereas the other does not. The sample without \"superlattice\" reflections has unit-cell parameters a = 8.7889(2), b = 8.2685(2), c = 15.254(3) A, {beta} = 90.050(1){degrees}, V = 1108.49(4) A3, and the chemical composition Pb1.00(Ca1.86Fe0.072+Mn0.04Cr0.023+){sum}=1.99(Zn1.00Si1.00O4)3. Its crystal structure was solved in space group P21/n (R1 = 0.022). Esperite is isostructural with beryllonite, NaBePO4, and its ideal chemical formula should, therefore, be revised to PbCa2(ZnSiO4)3, Z = 4. The ZnO4 and SiO4 tetrahedra in esperite share corners to form an ordered framework, with Pb2+ occupying the nine-coordinated site in the large channels and Ca2+ occupying the two distinct octahedral sites in the small channels. The so-called \"superlattice\" reflections are attributed to triple twins, a trilling of ~60{degrees} rotational twinning around the b axis, similar to those observed in many other beryllonite-type materials. A phase transformation from a high-temperature polymorph to the esperite structure is proposed to be responsible for the twinning formation.",
				"DOI" : "10.2138/am.2010.3415"
			},
			{
				"itemType" : "journalArticle",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Kaufhold",
						"firstName" : "Stephan",
						"creatorType" : "author"
					},
					{
						"1" : "",
						"lastName" : "Dohrmann",
						"firstName" : "Reiner",
						"creatorType" : "author"
					},
					{
						"2" : "",
						"lastName" : "Stucki",
						"firstName" : "Joseph W.",
						"creatorType" : "author"
					},
					{
						"3" : "",
						"lastName" : "Anastacio",
						"firstName" : "Alexandre S.",
						"creatorType" : "author"
					}
				],	
				"title" : "layer charge density of smectites - closing the gap between the structural formula method and the alkyl ammonium method",
				"date" : "11 July 2011",
				"publicationTitle" : "Clays and Clay Minerals",
				"journalAbbreviation" : "Clays and Clay Minerals",
				"pages" : "200-211",
				"volume" : "59",
				"issue" : "2",
				"url" : "http://ccm.geoscienceworld.org/cgi/content/abstract/59/2/200",
				"abstractNote" : "The layer charge density (LCD) of montmorillonite represents the permanent negative charge, its most important property. The LCD can be determined by two different methods, the structural formula method (SFM) and the alkylammonium method (AAM). Other methods of determining the LCD are calibrated against one or the other of these. The results of the two methods differ systematically: SFM values are larger than AAM values and the difference increases with increasing layer charge density.  In the present study, the critical parameters of both methods were considered quantitatively in order to identify the most likely reason for the systematic difference. One particularly important argument against the validity of the SFM is that typical SFM values correspond to unrealistically large CEC values that have never been reported. In addition, SFM does not consider the variable charge which causes cations to be adsorbed to the outer surface (at pH >4). In contrast to minor constituents, which can of course also affect SFM values, the variable charge can explain only part of the systematic difference. The exchange of pure smectite samples with both Cu-trien and alkylammonium revealed the presence of non-exchangeable, non-structural cations (Na, K, Ca). These cations, together with 10% (or more) variable charge, may explain the differences in LCD values. The non-exchangeable, non-structural cations could stem from undetected traces of feldspar or volcanic glass. The present samples indicated that the systematic difference in LCD values between the two methods is related to the amount of non-exchangeable, non-structural cations only, indicating that the two LCD methods probe different features of smectites. Using the SFM on pure smectite provides a value for the total number of charges (permanent with and without fixed (= non-exchangeable, non-structural) cations plus variable charge). The AAM, on the other hand, provides the charge density of the exchangeable cations (without variable charge).",
				"DOI" : "10.1346/CCMN.2011.0590208"
			}
		]
	}
]
/** END TEST CASES **/
PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb, testCases: testCases });
}());