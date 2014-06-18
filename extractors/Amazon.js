(function () {
	var translatorSpec = {
		"translatorID": "4fcda099-ee8e-4631-a279-a4d3a8b75906",
		"label": "Amazon",
		"creator": "PME",
		"lastUpdated": "2014-03-18"
	}

	function handleCreators(doc, info)
	{
		var authors = [];
		for (p in info)
		{
			var n = 0;
			var result = PME.Util.xpath(doc, p);
			var aPaths = info[p];
			while (result.length && n < aPaths.length)
			{
				var a = PME.Util.xpathText(result, aPaths[n++], undefined, '|');
				if (a)
					authors.push.apply(authors, a.replace(/\|\s*$/,'').split('|'));
			}
		}
		if (authors.length == 0)
			return [];
		var creators = [];
		for (var i = 0; i < authors.length; i++)
		{
			//first m. last, suffix - we just drop the suffix, we'll always have at least one element
			authors[i] = authors[i].split(', ')[0];//first m. last jr, suffix

			if (authors[i].indexOf(' ') >= 0)
			{
				authors[i] = authors[i].replace(/ (s|j)r\.?$/i, '').split(' ')
				creators.push({ lastName: authors[i][authors[i].length - 1], firstName: authors[i][0] });
			}
			else
				creators.push({ firstName: authors[i] });
		}
		return creators;
	}

	function pageType(doc)
	{
		var result = PME.Util.xpath(doc, '//table[@id="productDetailsTable"]//div[@class="content"]');
		if (result.length)
		{
			var b = PME.Util.xpathText(result, './/li/b').split(',');
			for (p = 0; p < b.length; p++)
			{
				if (PME.Util.trim(b[p]).indexOf('ISBN') == 0)
				{
					return 'singleprint';
				}
				if (PME.Util.trim(b[p]).indexOf('File Size') == 0)
				{
					return 'kindle';
				}
			}
		}
		if (PME.Util.xpath(doc, '//div[@id="resultsCol"]//div[starts-with(@id, "result")]').length)
		{
			return 'searchresults';
		}
	}

	function fillDetails(doc, item)
	{
		var details = PME.Util.xpath(doc, '//table[@id="productDetailsTable"]//div[@class="content"]//li[b]');
		for (p = 0; p < details.length; p++)
		{
			var li = PME.Util.trim(PME.Util.xpathText(details[p], '.'));
			var b = PME.Util.trim(PME.Util.xpathText(details[p], './b'));
			var val = li.replace(b, '');
			switch (b.replace(":", ""))
			{
				case "Publisher":
					var re3 = /(.+?)(?:; (\d+)[stndrth]{2} edition)(?: \((.+)\))?/;
					var re2 = /(.+?)(?: \((.+)\))/;
					if (re3.exec(val))
					{
						item.publisher = RegExp.$1;
						item.edition = RegExp.$2
						item.date = RegExp.$3;
					}
					else if (re2.exec(val))
					{
						item.publisher = RegExp.$1;
						item.date = RegExp.$2;
					}
					else
						item.publisher = val;
					break;
				case "Language":
					item.language = val;
					break;
				case "ISBN":
				case "ISBN-10":
				case "ISBN-13":
					item.ISBN = val;
					break;
				case "Series":
					var re = /.+?(?: \(book (\d+)\))/i;
					if (re.exec(val))
						item.volume = RegExp.$1
					break;
				case "Paperback":
				case "Hardcover":
					var re = /(\d+) pages/i;
					if (re.exec(val))
						item.pages = RegExp.$1
					break;
			}
		}
		return item;
	}

	function detectWeb(doc, url) {
		//not used
	}
	function doWeb(doc, url)
	{
		switch (pageType(doc))
		{
			case "singleprint":
				var item = new PME.Item('book');
				item.title =
					PME.Util.xpathText(doc, '//div[@id="booksTitle"]//span[@id="productTitle"]') ||
					PME.Util.xpathText(doc, '//span[@id="btAsinTitle"]');

				var xpath = PME.Util.xpath(doc, '//div[@id="title"]//span[contains(@class, "contributorNameID") and span[@class="contribution"]/span[contains(text(), "Author")]]') || PME.Util.xpath(doc, '//div[@class="buying"]');
				item.creators = handleCreators(doc,
					{
					    '//div[@id="title" or @id="booksTitle"]//span[contains(@class, "author") and span[@class="contribution"]/span[contains(text(), "Author")]]':
							['./span/a[contains(@class, "contributorNameID")]',
							 './a'],
						'//div[@class="buying" and h1[contains(@class, "Title")]]':
							['./span/a[not(@href = "#")]',
							 '//span[contains(@class, "contributorNameTrigger")]/a']
					});
				var ifr = PME.Util.xpath(doc, '//iframe[@id="bookDesc_iframe"]')
				if (ifr[0])
				{
					var description = ifr[0].contentWindow.document.getElementById("iframeContent");
					item.abstractNote = description.innerText || description.textContent;
				}
				else
					item.abstractNote = PME.Util.xpathText(doc, '//div[@id="ps-content" and h2[text()="Book Description"]]//div[@class="content"]//div[@id="postBodyPS"]');
				fillDetails(doc, item);
				item.url = url;
				item.complete();
				break;

			case "kindle":
				var item = new PME.Item('book');
				item.title = PME.Util.xpathText(doc, '//span[@id="btAsinTitle"]')//.replace(/\[kindle edition\]/i, "");
				item.creators = handleCreators(doc,
					{
						'//span[starts-with(@class, "contributorName") and following-sibling::span[contains(text(),"Author")]]':
							['a[starts-with(@id, "contributorName")]'],
						'//div[@class="buying" and h1[contains(@class, "Title")]]':
							['./span/a[not(@href = "#")]']
					});
				fillDetails(doc, item);
				item.url = url;
				item.abstractNote = PME.Util.xpathText(doc, '//div[@id="ps-content" and h2[text()="Book Description"]]//div[@class="content"]//div[@id="postBodyPS"]');
				item.complete();
				break;

			case 'searchresults':
				var results = PME.Util.xpath(doc, '//div[@id="resultsCol"]//div[starts-with(@id, "result")]//h3/a');
				var URLs = [];
				for (n = 0; n < results.length; n++)
				{
					var href = PME.Util.xpathText(results[n], "./@href");
					if (href.indexOf('http') == 0)
					{
						URLs.push(href);						
					}
				}
				PME.Util.processDocuments(URLs, doWeb);
				break;
		}
	}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.amazon.com/My-Big-Fat-Supernatural-Wedding/dp/B0018SYXN8/ref=sr_1_cc_1?s=aps&ie=UTF8&qid=1394830198&sr=1-1-catcorr&keywords=My+Big+Fat+Supernatural+Wedding",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"0": "",
						"lastName": "Kenyon",
						"firstName": "Sherrilyn"
					},
					{
						"1": "",
						"lastName": "Harris",
						"firstName": "Charlaine"
					},
					{
						"2": "",
						"lastName": "Banks",
						"firstName": "L."
					},
					{
						"3": "",
						"lastName": "Butcher",
						"firstName": "Jim"
					},
					{
						"4": "",
						"lastName": "Caine",
						"firstName": "Rachel"
					},
					{
						"5": "",
						"lastName": "Friesner",
						"firstName": "Esther"
					},
					{
						"6": "",
						"lastName": "Handeland",
						"firstName": "Lori"
					},
					{
						"7": "",
						"lastName": "Krinard",
						"firstName": "Susan"
					}
				],
				"title": "My Big Fat Supernatural Wedding",
				"abstractNote": "Werewolves, vampires, witches, voodoo, Elvis---and weddings\n \nAn “ordinary” wedding can get crazy enough, so can you imagine what happens when otherworldly creatures are involved? Nine of the hottest authors of paranormal fiction answer that question in this delightful collection of supernatural wedding stories. What’s the seating plan when rival clans of werewolves and vampires meet under the same roof? How can a couple in the throes of love overcome traps set by feuding relatives---who are experts at voodoo? Will you have a good marriage if your high-seas wedding is held on a cursed ship? How do you deal with a wedding singer who’s just a little too good at impersonating Elvis?\n \n·        L. A. Banks\n·        Jim Butcher\n·        Rachel Caine\n·        P. N. Elrod\n·        Esther M. Friesner\n·        Lori Handeland\n·        Charlaine Harris\n·        Sherrilyn Kenyon\n·        Susan Krinard\n \nShape-shifters, wizards, and magic, oh my!",
				"pages": "310",
				"publisher": "St. Martin's Griffin",
				"edition": "1",
				"date": "October 3, 2006",
				"language": "English",
				"ISBN": "0312343604",
				"url": "http://www.amazon.com/My-Big-Fat-Supernatural-Wedding/dp/B0018SYXN8/ref=sr_1_cc_1?s=aps&ie=UTF8&qid=1394830198&sr=1-1-catcorr&keywords=My+Big+Fat+Supernatural+Wedding"
			}
		]
	},
	{	
		"type": "web",
		"url": "http://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=Kid%27s+book&rh=i%3Aaps%2Ck%3AKid%27s+book",
		"items": [
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Dennis",
						"firstName" : "C."
					}	
				],
				"title" : "A Book for Kids [Kindle Edition]",
				"language" : " English",
				"url" : "http://www.amazon.com/Book-Kids-Clarence-James-Dennis-ebook/dp/B0082S94MM/ref=sr_1_3?ie=UTF8&qid=1403122147&sr=8-3&keywords=Kid%27s+book",
				"abstractNote" : "This book was converted from its physical edition to the digital format by a community of volunteers. You may find it for free on the web. Purchase of the Kindle edition includes wireless delivery."
			}
	 	]		
	}
]
/** END TEST CASES **/

	PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb, testCases: testCases });
}());