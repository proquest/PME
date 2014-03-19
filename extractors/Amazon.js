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
					PME.Util.xpathText(doc, '//div[@id="title"]//span[@id="productTitle"]') ||
					PME.Util.xpathText(doc, '//span[@id="btAsinTitle"]');

				var xpath = PME.Util.xpath(doc, '//div[@id="title"]//span[contains(@class, "author") and span[@class="contribution"]/span[contains(text(), "Author")]]') || PME.Util.xpath(doc, '//div[@class="buying"]');
				item.creators = handleCreators(doc,
					{
						'//div[@id="title"]//span[contains(@class, "author") and span[@class="contribution"]/span[contains(text(), "Author")]]':
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

	PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb });
}());