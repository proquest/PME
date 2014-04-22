(function() {
	var translatorSpec = {
		"translatorID": "d6c6210a-297c-4b2c-8c43-48cb503cc49e",
		"label": "Springer Link",
		"creator": "Aurimas Vinckevicius",
		"target": "https?://link\\.springer\\.com/(search(?:/page/\\d+)?\\?|(article|chapter|book|referenceworkentry|protocol|journal|referencework)/.+)",
		"minVersion": "3.0",
		"maxVersion": "",
		"priority": 100,
		"inRepository": true,
		"translatorType": 4,
		"browserSupport": "gcsbv",
		"lastUpdated": "2013-08-13 20:03:26"
	};

	function detectWeb(doc, url) {
	}

	function getResultList(doc) {
		var results = PME.Util.xpath(doc, '//ol[@class="content-item-list"]/li//a[@class="title"]/@href');
		if (!results.length)
			results = PME.Util.xpath(doc, '//div[@class="toc"]/ol//div[contains(@class,"toc-item")]/h3/a/@href');
		if (!results.length)
			results = PME.Util.xpath(doc, '//div[@class="toc"]/ol//li[contains(@class,"toc-item")]/p[@class="title"]/a/@href');

		return results;
	}

	function isolateName(name) {	// strips titles from a name
		if (/^prof\.?$/i.test(name[0]))
			name.shift();

		if (/^dr\.?$/i.test(name[0]))
			name.shift();

		return name;
	}

	function parseName(name) {	// accepts a name expressed as an array, outputs an integer index
		var splitIndex = name.length - 1;

		if (splitIndex > 0 && (/^(?:s|j)r\.?$/i.test(name[splitIndex]) || /^I?V?I*X?$/.test(name[splitIndex]))) // catch occurrances of name suffixes
			splitIndex--;

		if (splitIndex > 1 && /^(?:de)|(?:der)|(?:bin)|(?:ibn)$/i.test(name[splitIndex - 1])) // catch multi-part last names
			splitIndex--;

		if (splitIndex > 1 && /^van$/i.test(name[splitIndex - 1])) // catch multi-part last names
			splitIndex--;

		return splitIndex;
	}

	function getRISdata(urlPath, doc, type) {
		PME.Util.HTTP.doGet(urlPath + ".ris", function (text) {
			var translator = PME.loadTranslator("import");
			var PDFlink;
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);

			translator.setHandler("itemDone", function (obj, item) {
				if (type != "multiple") {
					item.abstractNote = PME.Util.xpathText(doc, "//div[contains(@class, 'abstract-content')]/p");

					if (!item.ISSN)
						item.ISSN = PME.Util.xpathText(doc, '//dd[contains(@id, "abstract-about-issn")]') || PME.Util.xpathText(doc, '//dd[contains(@id, "abstract-about-electronic-issn")]') || PME.Util.xpathText(doc, '//dd[contains(@id, "series-print-issn")]');

					if (type == 'bookSection')
						item.rights = '© ' + PME.Util.xpathText(doc, '//dd[contains(@id, "copyright-year")]') + ' ' + PME.Util.xpathText(doc, '//dd[contains(@id, "copyright-holder")]');

					PDFlink = PME.Util.xpath(doc, '//a[contains(@class, "pdf-link") and not(contains(@href, ".png"))]/@href');
				}
				else {
					PDFlink = PME.Util.xpath(doc, '//a[contains(@class, "pdf-link") and contains(@doi, "'+ item.DOI +'")]/@href');
				}

				if (PDFlink != null && PDFlink != '')
					item.attachments.push({
						url: window.location.protocol + "//" + window.location.host + PME.Util.getNodeText(PDFlink[0]),
						title: "Springer Link Full Text",
						mimeType: "application/pdf"
					});

				item.complete();
			});

			translator.translate();
		});
	}

	function doWeb(doc, url) {
		var action = url.match(/^https?:\/\/[^\/]+\/([^\/?#]+)/);
		if (!action) return;

		var type;
		var springerURL = window.location.host;
		var items = getResultList(doc);

		switch (action[1]) {
			case "search":
			case "journal":
			case "book":
			case "bookseries":
			case "referencework":
				if (items.length > 0)
					type = "multiple";
				else
					return;
				break;
			case "article":
				type = "journalArticle";
				break;
			case "chapter":
			case "referenceworkentry":
			case "protocol":
				type = "bookSection";
				break;
		}

		if (type == "multiple") {
			for (var i = 0; i < items.length; i++) {
				items[i] = PME.Util.getNodeText(items[i]);

				if ((items[i].indexOf("/book/") == -1) && (items[i].indexOf("/journal/") == -1) && (items[i].indexOf("/bookseries/") == -1)) {
					getRISdata(springerURL + "/export-citation" + items[i], doc, type);
				}
				else {		// treat a search result differently if it's an entire book
					PME.Util.processDocuments(springerURL + items[i], function (doc) {
						var bookItem = new PME.Item("book");
						var bookAuthors = PME.Util.xpath(doc, "//div[@role='main']/div[@class='author-list']/ul[@class='authors']/li[@class='author']/a");
						var bookEditors = PME.Util.xpath(doc, "//div[@role='main']/div[@class='editor-list']/ul[@class='editors']/li[@class='editor']/a");

						bookItem.title = PME.Util.xpathText(doc, "//div[@class='summary']/dl/dd[@id='abstract-about-title']");
						bookItem.series = PME.Util.xpathText(doc, "//div[@class='summary']/dl/dd[contains(@id, 'book-series-title')]");
						bookItem.volume = PME.Util.xpathText(doc, "//div[@class='summary']/dl/dd[contains(@id, 'book-series-volume')]");

						for (var i = 0; i < bookAuthors.length; i++) {
							var authorName = isolateName(PME.Util.xpathText(bookAuthors[i], 'text()').split(" "));
							var authorSplit = parseName(authorName);

							bookItem.creators.push({
								lastName: authorName.slice(authorSplit, authorName.length).join(" "),
								firstName: authorName.slice(0, authorSplit).join(" "),
								creatorType: "author"
							});
						}

						for (var i = 0; i < bookEditors.length; i++) {
							var editorName = isolateName(PME.Util.xpathText(bookEditors[i], 'text()').split(" "));
							var editorSplit = parseName(editorName);

							bookItem.creators.push({
								lastName: editorName.slice(editorSplit, editorName.length).join(" "),
								firstName: editorName.slice(0, editorSplit).join(" "),
								creatorType: "editor"
							});
						}

						bookItem.date = PME.Util.xpathText(doc, "//div[@class='summary']/dl/dd[contains(@id, 'copyright-year')]");
						bookItem.DOI = PME.Util.xpathText(doc, "//div[@class='summary']/dl/dd[contains(@id, 'doi')]");
						bookItem.publisher = PME.Util.xpathText(doc, "//div[@class='summary']/dl/dd[contains(@id, 'publisher')]");

						bookItem.ISBN = PME.Util.xpathText(doc, "//div[@class='summary']/dl/dd[contains(@id, 'online-isbn')]");
						if (!bookItem.ISBN)
							bookItem.ISBN = PME.Util.xpathText(doc, "//div[@class='summary']/dl/dd[contains(@id, 'print-isbn')]");

						bookItem.complete();
					});
				}
			}
		}
		else {
			getRISdata(springerURL + PME.Util.xpathText(doc, "//a[@id='export-citation']/@href"), doc, type);
		}
	}

	/** BEGIN TEST CASES **/
	var testCases = [
		{
			"type": "web",
			"url": "http://link.springer.com/chapter/10.1007/978-3-540-88682-2_1",
			"items": [
				{
					"itemType": "bookSection",
					"creators": [
						{
							"firstName": "Jan J.",
							"lastName": "Koenderink",
							"creatorType": "author"
						},
						{
							"firstName": "David",
							"lastName": "Forsyth",
							"creatorType": "editor"
						},
						{
							"firstName": "Philip",
							"lastName": "Torr",
							"creatorType": "editor"
						},
						{
							"firstName": "Andrew",
							"lastName": "Zisserman",
							"creatorType": "editor"
						}
					],
					"notes": [],
					"tags": [
						"Image Processing and Computer Vision",
						"Computer Imaging, Vision, Pattern Recognition and Graphics",
						"Computer Graphics",
						"Pattern Recognition",
						"Data Mining and Knowledge Discovery",
						"Computer Appl. in Arts and Humanities"
					],
					"seeAlso": [],
					"attachments": [
						{
							"title": "Full Text PDF",
							"mimeType": "application/pdf"
						},
						{
							"title": "Snapshot"
						}
					],
					"title": "Something Old, Something New, Something Borrowed, Something Blue",
					"date": "2008/01/01",
					"publisher": "Springer Berlin Heidelberg",
					"ISBN": "978-3-540-88681-5, 978-3-540-88682-2",
					"DOI": "10.1007/978-3-540-88682-2_1",
					"pages": "1-1",
					"url": "http://link.springer.com/chapter/10.1007/978-3-540-88682-2_1",
					"accessDate": "CURRENT_TIMESTAMP",
					"libraryCatalog": "link.springer.com",
					"bookTitle": "Computer Vision – ECCV 2008",
					"series": "Lecture Notes in Computer Science",
					"seriesNumber": "5302",
					"rights": "© 2008 Springer Berlin Heidelberg",
					"abstractNote": "My first paper of a “Computer Vision” signature (on invariants related to optic flow) dates from 1975. I have published in Computer Vision (next to work in cybernetics, psychology, physics, mathematics and philosophy) till my retirement earlier this year (hence the slightly blue feeling), thus my career roughly covers the history of the field. “Vision” has diverse connotations. The fundamental dichotomy is between “optically guided action” and “visual experience”. The former applies to much of biology and computer vision and involves only concepts from science and engineering (e.g., “inverse optics”), the latter involves intention and meaning and thus additionally involves concepts from psychology and philosophy. David Marr’s notion of “vision” is an uneasy blend of the two: On the one hand the goal is to create a “representation of the scene in front of the eye” (involving intention and meaning), on the other hand the means by which this is attempted are essentially “inverse optics”. Although this has nominally become something of the “Standard Model” of CV, it is actually incoherent. It is the latter notion of “vision” that has always interested me most, mainly because one is still grappling with basic concepts. It has been my aspiration to turn it into science, although in this I failed. Yet much has happened (something old) and is happening now (something new). I will discuss some of the issues that seem crucial to me, mostly illustrated through my own work, though I shamelessly borrow from friends in the CV community where I see fit."
				}
			]
		},
		{
			"type": "web",
			"url": "http://link.springer.com/referenceworkentry/10.1007/978-0-387-79061-9_5173",
			"items": [
				{
					"itemType": "bookSection",
					"creators": [
						{
							"firstName": "Sam",
							"lastName": "Goldstein",
							"creatorType": "editor"
						},
						{
							"firstName": "Jack A.",
							"lastName": "Naglieri",
							"creatorType": "editor"
						}
					],
					"notes": [],
					"tags": [
						"Child and School Psychology",
						"Learning & Instruction",
						"Education (general)",
						"Developmental Psychology"
					],
					"seeAlso": [],
					"attachments": [
						{
							"title": "Full Text PDF",
							"mimeType": "application/pdf"
						},
						{
							"title": "Snapshot"
						}
					],
					"title": "Characterized by Commitment to Something Without Personal Exploration",
					"date": "2011/01/01",
					"publisher": "Springer US",
					"ISBN": "978-0-387-77579-1, 978-0-387-79061-9",
					"DOI": "10.1007/978-0-387-79061-9_5173",
					"pages": "329-329",
					"url": "http://link.springer.com/referenceworkentry/10.1007/978-0-387-79061-9_5173",
					"accessDate": "CURRENT_TIMESTAMP",
					"libraryCatalog": "link.springer.com",
					"bookTitle": "Encyclopedia of Child Behavior and Development",
					"rights": "© 2011 Springer Science+Business Media, LLC"
				}
			]
		},
		{
			"type": "web",
			"url": "http://link.springer.com/protocol/10.1007/978-1-60761-839-3_22",
			"items": [
				{
					"itemType": "bookSection",
					"creators": [
						{
							"firstName": "Anthony",
							"lastName": "Nicholls",
							"creatorType": "author"
						},
						{
							"firstName": "Jürgen",
							"lastName": "Bajorath",
							"creatorType": "editor"
						}
					],
					"notes": [],
					"tags": [
						"Bioinformatics",
						"Analytical Chemistry",
						"Statistics",
						"Central Limit Theorem",
						"Variance",
						"Standard deviation",
						"Confidence limits",
						"p-Values",
						"Propagation of error",
						"Error bars",
						"logit transform",
						"Virtual screening",
						"ROC curves",
						"AUC",
						"Enrichment",
						"Correlation",
						"Student’s t-test",
						"ANOVA"
					],
					"seeAlso": [],
					"attachments": [
						{
							"title": "Full Text PDF",
							"mimeType": "application/pdf"
						},
						{
							"title": "Snapshot"
						}
					],
					"title": "What Do We Know?: Simple Statistical Techniques that Help",
					"date": "2011/01/01",
					"publisher": "Humana Press",
					"ISBN": "978-1-60761-838-6, 978-1-60761-839-3",
					"DOI": "10.1007/978-1-60761-839-3_22",
					"language": "English",
					"pages": "531-581",
					"url": "http://link.springer.com/protocol/10.1007/978-1-60761-839-3_22",
					"accessDate": "CURRENT_TIMESTAMP",
					"libraryCatalog": "link.springer.com",
					"bookTitle": "Chemoinformatics and Computational Chemical Biology",
					"shortTitle": "What Do We Know?",
					"series": "Methods in Molecular Biology",
					"seriesNumber": "672",
					"rights": "© 2011 Springer Science+Business Media, LLC",
					"abstractNote": "An understanding of simple statistical techniques is invaluable in science and in life. Despite this, and despite the sophistication of many concerning the methods and algorithms of molecular modeling, statistical analysis is usually rare and often uncompelling. I present here some basic approaches that have proved useful in my own work, along with examples drawn from the field. In particular, the statistics of evaluations of virtual screening are carefully considered."
				}
			]
		},
		{
			"type": "web",
			"url": "http://link.springer.com/search?query=zotero",
			"items": "multiple"
		},
		{
			"type": "web",
			"url": "http://link.springer.com/journal/10922/2/1/page/1",
			"items": "multiple"
		},
		{
			"type": "web",
			"url": "http://link.springer.com/referencework/10.1007/978-1-84996-169-1/page/1",
			"items": "multiple"
		},
		{
			"type": "web",
			"url": "http://link.springer.com/book/10.1007/978-3-540-88682-2/page/1",
			"items": "multiple"
		},
		{
			"type": "web",
			"url": "http://link.springer.com/article/10.1007/s10040-009-0439-x",
			"items": [
				{
					"itemType": "journalArticle",
					"creators": [
						{
							"firstName": "Xiaolong",
							"lastName": "Geng",
							"creatorType": "author"
						},
						{
							"firstName": "Hailong",
							"lastName": "Li",
							"creatorType": "author"
						},
						{
							"firstName": "Michel C.",
							"lastName": "Boufadel",
							"creatorType": "author"
						},
						{
							"firstName": "Shuang",
							"lastName": "Liu",
							"creatorType": "author"
						}
					],
					"notes": [],
					"tags": [
						"Waste Water Technology / Water Pollution Control / Water Management / Aquatic Pollution",
						"Geology",
						"Hydrogeology",
						"Coastal aquifers",
						"Elastic storage",
						"Submarine outlet-capping",
						"Analytical solutions",
						"Tidal loading efficiency"
					],
					"seeAlso": [],
					"attachments": [
						{
							"title": "Full Text PDF",
							"mimeType": "application/pdf"
						},
						{
							"title": "Snapshot"
						}
					],
					"title": "Tide-induced head fluctuations in a coastal aquifer: effects of the elastic storage and leakage of the submarine outlet-capping",
					"date": "2009/07/01",
					"publicationTitle": "Hydrogeology Journal",
					"journalAbbreviation": "Hydrogeol J",
					"volume": "17",
					"issue": "5",
					"publisher": "Springer-Verlag",
					"DOI": "10.1007/s10040-009-0439-x",
					"language": "English",
					"pages": "1289-1296",
					"ISSN": "1431-2174, 1435-0157",
					"url": "http://link.springer.com/article/10.1007/s10040-009-0439-x",
					"accessDate": "CURRENT_TIMESTAMP",
					"libraryCatalog": "link.springer.com",
					"abstractNote": "This paper considers the tidal head fluctuations in a single coastal confined aquifer which extends under the sea for a certain distance. Its submarine outlet is covered by a silt-layer with properties dissimilar to the aquifer. Recently, Li et al. (2007) gave an analytical solution for such a system which neglected the effect of the elastic storage (specific storage) of the outlet-capping. This article presents an analytical solution which generalizes their work by incorporating the elastic storage of the outlet-capping. It is found that if the outlet-capping is thick enough in the horizontal direction, its elastic storage has a significant enhancing effect on the tidal head fluctuation. Ignoring this elastic storage will lead to significant errors in predicting the relationship of the head fluctuation and the aquifer hydrogeological properties. Quantitative analysis shows the effect of the elastic storage of the outlet-capping on the groundwater head fluctuation. Quantitative conditions are given under which the effect of this elastic storage on the aquifer’s tide-induced head fluctuation is negligible. Li, H.L., Li, G.Y., Chen, J.M., Boufadel, M.C. (2007) Tide-induced head fluctuations in a confined aquifer with sediment covering its outlet at the sea floor. [Fluctuations du niveau piézométrique induites par la marée dans un aquifère captif à décharge sous-marine.] Water Resour. Res 43, doi:10.1029/2005WR004724, Cet article considère les fluctuations piézométriques dues à la marée dans un aquifère côtier captif simple s’étendant à une certaine distance sous la mer. Son exutoire sous-marin est recouvert par un dépôt silteux de propriétés différentes de celles de l’aquifère. Récemment, Li et autres (2007) ont donné une représentation analytique d’un tel système tenant compte de l’effet d’emmagasinement élastique du réservoir sous le toit à l’exutoire. Cet article présente une solution analytique qui généralise le modèle en introduisant l’emmagasinement élastique à l’exutoire. Il démontre que si la couveture à l’exutoire est assez épaisse en direction, l’emmagasinement élastique a un effet amplificateur important sur la fluctuation piézométrique due à la marée. Ignorer cet emmagasinement élastique conduirait à des erreurs importantes sur le rapport entre la hauteur piézométrique réelle et la hauteur telle qu’elle ressort des caractéristiques de l’aquifère. Le modèle montre donc l’effet de l’emmagasinement élastique sur la fluctuation du niveau de l’aquifère. Il indique les seuils en dessous desquels l’effet de cet emmagasinement élastique sur la fluctuation de l’aquifère induite par la marée est négligeable. Li, H.L., Li, G.Y., Chen, J.M., Boufadel, M.C. (2007) Tide-induced head fluctuations in a confined aquifer with sediment covering its outlet at the sea floor. [Fluctuations du niveau piézométrique induites par la marée dans un aquifère captif à décharge sous-marine.] Water Resour. Res 43, doi:10.1029/2005WR004724, Este trabajo considera las fluctuaciones piezométricas debidas a la marea en un único acuífero costero confinado que se extiende bajo el mar a través de una cierta distancia. Su descarga submarina en el lecho del mar está cubierta por una capa de limosa con propiedades diferentes del acuífero. Recientemente, Li et al. (2007) dieron una solución analítica para tal sistema que despreciaba el efecto del almacenamiento elástico (almacenamiento específico) de la cubierta en la descarga. Este trabajo presenta una solución analítica que generaliza el trabajo de estos autores, incorporando el almacenamiento elástico de la cubierta de la descarga. Se encontró que si la cubierta tiene suficiente espesor en la dirección horizontal, su almacenamiento elástico tiene un efecto enriquecedor significativo sobre la fluctuación piezométrica debido a la marea. Ignorar este almacenamiento elástico conduce a errores significativos en la predicción de la relación entre la fluctuación piezométrica y las propiedades hidrogeológicas del acuífero. Los análisis cuantitativos muestran el efecto del almacenamiento elástico de la cubierta sobre la fluctuación del agua subterránea. Se dan condiciones cuantitativas bajo las cuales los efectos de este almacenamiento elástico sobre las fluctuaciones piezométricas inducidas por la marea son insignificantes. Li, H.L., Li, G.Y., Chen, J.M., Boufadel, M.C. (2007) Tide-induced head fluctuations in a confined aquifer with sediment covering its outlet at the sea floor. [Fluctuations du niveau piézométrique induites par la marée dans un aquifère captif à décharge sous-marine.] Water Resour. Res 43, doi:10.1029/2005WR004724, 本文考虑在海底延展一定距离的单层滨海承压含水层中的潮汐水头波动。含水层的海底露头覆盖有一层与含水层性质不同的淤泥层。最近, Li等 (2007) 给出了一个忽略露头盖层弹性储水 (贮水率) 的解析解。本文通过考虑露头盖层弹性储存推广了该解析解。结果表明, 若露头盖层在水平方向足够厚, 则弹性储存会显著增强潮汐水头波动。若忽略弹性储存, 在预测水头波动和含水层水文地质特征的关系时, 会造成显著误差。定量分析了露头盖层的弹性储存对地下水位波动的效应。给出了可忽略弹性储存对含水层潮汐水头波动影响的量化情景。 Li, H.L., Li, G.Y., Chen, J.M., Boufadel, M.C. (2007) Tide-induced head fluctuations in a confined aquifer with sediment covering its outlet at the sea floor. [Fluctuations du niveau piézométrique induites par la marée dans un aquifère captif à décharge sous-marine.] Water Resour. Res 43, doi:10.1029/2005WR004724, O presente artigo considera as variações piezométricas induzidas pelas marés num aquífero costeiro confinado que se extende debaixo do mar ao longo de determinada distância. A porção submarina deste aquífero está coberta por uma camada de silte com propriedades diferentes das do aquífero. Recentemente, Li et al. (2007) definiram uma solução analítica para este tipo de sistemas que não tem em conta o efeito do armazenamento elástico (armazenamento específico) da camada submarina confinante. O presente artigo apresenta uma solução analítica que generaliza este trabalho, incorporando o armazenamento elástico da camada confinante submarina. Constatou-se que, se a camada confinante é suficientemente extensa horizontalmente, o seu armazenamento elástico acentua significativamente as flutuações piezométricas devidas às marés. Ao ignorar este armazenamento elástico introduzem-se erros significativos na estimação da relação entre as flutuações piezométricas e as propriedades hidrogeológicas do aquífero. A análise quantitativa mostra o efeito do armazenamento elástico da camada submarina confinante nas flutuações dos níveis de água subterrânea. As condições quantitativas são dadas de tal forma que o efeito deste armazenamento elástico nas flutuações piezométricas é negligenciável. Li, H.L., Li, G.Y., Chen, J.M., Boufadel, M.C. (2007) Tide-induced head fluctuations in a confined aquifer with sediment covering its outlet at the sea floor. [Fluctuations du niveau piézométrique induites par la marée dans un aquifère captif à décharge sous-marine.] Water Resour. Res 43, doi:10.1029/2005WR004724, 本論文は、潮汐水頭波動が発生する単一の沿岸の制限帯水層は海底まで一定的な距離まで広がっていると考慮します。その海底アウトレットは、帯水層と異なる特性で、沈泥層におおわれます。 最近、李、及びほかは (2007) 顧みられないこの弾性あるアウトレットキャッピング貯蔵量の (特定の貯蔵量) 影響効果と反応のシステムに関する分析案をあげた。本論文は、弾性あるアウトレットキャッピングの貯蔵量を研究に取り込んだ彼らの仕事を述べる一つ分析案を提示します。この研究は水平方向でのウトレットキャッピングは十分の厚さある場合、その弾性的な貯蔵量は水頭波動に顕著な増強影響を与えると発見。この弾性的な貯蔵量を無視することは、水頭波動と帯水層水文地質学特性の関連を予測することにおける重大なエラーに至ります。定量的な分析は、地下水頭波動に関してアウトレットキャッピングの弾性貯蔵量の影響を示します。帯水層の水頭波動に影響が取るに足りないぐらいの弾性貯蔵量を示した。 Li, H.L., Li, G.Y., Chen, J.M., Boufadel, M.C. (2007) Tide-induced head fluctuations in a confined aquifer with sediment covering its outlet at the sea floor. [Fluctuations du niveau piézométrique induites par la marée dans un aquifère captif à décharge sous-marine.] Water Resour. Res 43, doi:10.1029/2005WR004724, دراین مقاله نوسانات ارتفاع آب، ناشی ازجزر و مد در یک آبخوان محصور منفرد که تا طول مشخصی در زیر دریا امتداد یافته است، بررسی می شود. خروجی این آبخوان به کف دریا با یک لایه سیلت (لای) که خواص متفاوتی با آبخوان دارد، پوشیده شده است. به تازگی، Li و همکارانش (2007Li et. al., ) یک راه حل تحلیلی برای این مسأله با صرفنظر کردن از اثر ذخیره الاستیک (ذخیره مخصوص) ارائه کرده اند. در مقاله حاضر راه حلی تحلیلی ارائه می گردد که با اضافه کردن اثر ذخیره الاستیک پوشش خروجی، نتایج تحقیق Li تعمیم داده می شود. بر اساس نتایج بدست آمده، اگر پوشش خروجی به قدر کافی در راستای افقی ضخیم باشد، ذخیره الاستیک آن تأثیر زیادی بر نوسانات ارتفاع آب ناشی از جزر و مد خواهد داشت. نادیده گرفتن این ذخیره الاستیک می تواند منجر به ایجاد خطای زیادی در پیش بینی رابطه بین نوسان ارتفاع آب و خصوصیات هیدرولوژیکی آبخوان شود. همچنین با استفاده از تحلیلهای کمی، اثر ذخیره الاستیک پوشش خروجی بر روی نوسان تراز آب زیرزمینی نشان داده شده است. به علاوه شرایطی کمی برای مواردی که می توان اثر ذخیره الاستیک روی نوسانات ارتفاع آب در آبخوان تحت تأثیر جزر و مد را نادیده گرفت نیز ارائه شده است. Li, H.L., Li, G.Y., Chen, J.M., Boufadel, M.C. (2007) Tide-induced head fluctuations in a confined aquifer with sediment covering its outlet at the sea floor. [Fluctuations du niveau piézométrique induites par la marée dans un aquifère captif à décharge sous-marine.] Water Resour. Res 43, doi:10.1029/2005WR004724",
					"shortTitle": "Tide-induced head fluctuations in a coastal aquifer"
				}
			]
		}
	]
	/** END TEST CASES **/
	PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb, testCases: testCases });
}());
