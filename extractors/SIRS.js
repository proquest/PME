(function(){
	var translatorSpec =
	{
		"translatorID": "74740e56-5325-493b-8e70-44c0f854fbe9",
		"label": "SIRS",
		"creator": "PME Team",
		"target": "^https?://sks.sirs.com/cgi-bin/(hst-sub-display|hst-article-display).*",
		"priority": 100,
		"translatorType": 4,
		"browserSupport": "gcsibv",
		"lastUpdated": "2013-09-04 12:34:56"
	};

	var yearRE = new RegExp('.*\\d{4,}.*'),
		volRE = new RegExp('.*Vol. (\\d+)'),
		issueRE = new RegExp('.*No. (\\d+)'),
		placeRE = new RegExp('\\(.*\\)');

	function importSingle(doc) {
		var itemType = imageSrcToItemType(PME.Util.xpathText(doc, '//div[@class="result-icon"]/img/@src'));

		var item = new PME.Item(itemType);

		item.title = PME.Util.trim(PME.Util.xpathText(doc, '//div[@id="artcont"]//h1'));

		var headerLines = PME.Util.map(PME.Util.xpath(doc, '//div[@id="artcont"]//h5/text()'), function(node) {
			return PME.Util.trim(PME.Util.getNodeText(node));
		});

		if (headerLines.length > 0) item.publicationTitle = headerLines[0];

		if (headerLines.length > 1) {
			PME.Util.each(headerLines.splice(1), function (line) {
				if (!item.date && line.match(yearRE)) {
					var split = line.indexOf('n.p.');
					if (split > -1) {
						//no pages
						item.date = PME.Util.trim(line.substring(0, split));
					} else {
						var strip = 2; //length of p.
						split = line.indexOf('pp.');
						if (split > -1) {
							strip = 3; //length of pp.
						} else {
							split = line.indexOf('p.');
						}
						if (split > -1) {
							item.date = PME.Util.trim(line.substring(0, split));
							if (item.date.charAt(item.date.length - 1) == ',') {
								item.date = item.date.substring(0, item.date.length - 1);
							}
							item.pages = line.substring(split + 1 + strip);
						} else {
							item.date = line;
						}
					}
				} else {
					var split = -1,
						match = volRE.exec(line);

					if (!item.volume && match && match.length > 1) {
						split = line.indexOf("Vol. " + match[1]);
						item.volume = match[1];
					}

					match = issueRE.exec(line);
					if (!item.issue && match && match.length > 1) {
						if (split == -1) {
							split = line.indexOf("No. " + match[1]);
						}
						item.issue = match[1];
					}

					if (!item.place && line.match(placeRE)) {
						if (split > -1) {
							var place = line.substring(1, split);
							if (place) item.place = place;
						} else {
							item.place = line.substring(1, line.length - 1);
						}
					}
				}
			});
		}

		var author = PME.Util.xpathText(doc, '//div[@id="artcont"]//i[1]');
		if (!author) {
			var altAuthor = PME.Util.xpath(doc, '//div[@id="artcont"]/em');
			if (altAuthor && altAuthor.length > 0) {
				var altAuthorText = PME.Util.getNodeText(altAuthor[0]);
				if (altAuthorText.toLowerCase().indexOf("by") == 0) {
					author = altAuthorText;
				}
			}
		}

		item.creators = parseAuthors(author);

		item.complete();

	}

	function importSearchPage(doc) {
		var results = PME.Util.xpath(doc, '//div[@class="result normal-document"]');
		PME.Util.each(results, function(result) {
			var itemType = imageSrcToItemType(PME.Util.xpathText(result, './/div[@class="result-icon"]/a/img/@src'));

			var item = new PME.Item(itemType);

			item.title = PME.Util.trim(PME.Util.xpathText(result, './/div[@class="line1"]/a'));

			var author = PME.Util.xpathText(result, './/div[@class="line1"]/span[@class="author"]');
			item.creators = parseAuthors(author);

			var publicationTitle = PME.Util.xpathText(result, './/div[@class="line1"]/span[@class="pub"]');
			if (publicationTitle) publicationTitle = PME.Util.trim(publicationTitle);
			if (publicationTitle && publicationTitle != item.title) {
				//ugly, but the data is formatted several different way, sometimes the Vol./No. are inside ()'s and sometimes not
				if (publicationTitle.charAt(publicationTitle.length - 1) == ')') {
					//probably has the place in ()'s at the end, strip it off
					var split = publicationTitle.lastIndexOf('(');
					if (split > 4) { //make sure there is some other text
						var other = publicationTitle.substring(split);
						//see if there is a volume/issue in there
						var match = volRE.exec(other);
						if (match && match.length > 1) item.volume = match[1];

						match = issueRE.exec(other);
						if (match && match.length > 1) item.issue = match[1];

						if (!item.volume && !item.issue) {
							//assume it's all the place
							item.place = PME.Util.trim(other.substring(1, other.length - 1));
						}

						publicationTitle = PME.Util.trim(publicationTitle.substring(0, split));
					}
				} else {
					var split = -1;
					var match = volRE.exec(publicationTitle);
					if (match && match.length > 1) {
						split = publicationTitle.indexOf("Vol. " + match[1]);
						item.volume = match[1];
					}

					match = issueRE.exec(publicationTitle);
					if (match && match.length > 1) {
						if (split == -1) {
							split = publicationTitle.indexOf("No. " + match[1]);
						}
						item.issue = match[1];
					}

					if (split > -1) publicationTitle = PME.Util.trim(publicationTitle.substring(0, split));
					if (publicationTitle.charAt(publicationTitle.length - 1) == ',') publicationTitle = publicationTitle.substring(0, publicationTitle.length - 2);
				}

				if (publicationTitle.charAt(publicationTitle.length - 1) == ')') {
					var split = publicationTitle.lastIndexOf('(');
					if (split > 4) { //make sure there is some other text
						var place = publicationTitle.substring(split);
						item.place = PME.Util.trim(place.substring(1, place.length - 1));
						publicationTitle = PME.Util.trim(publicationTitle.substring(0, split));
					}
				}

				item.publicationTitle = publicationTitle;
			}

			var line2Fields =  PME.Util.map(PME.Util.xpathText(result, './/div[@class="line2"]').split("|"), function(field) {
				return PME.Util.trim(field);
			});

			if (line2Fields[0].match(yearRE))
				item.date = line2Fields[0];

			if (line2Fields[1].indexOf('pg.') == 0) {
				var pages = line2Fields[1].substring(3);
				if (pages != "n.p.") item.pages = pages;
			}

			item.complete();

		});
	}

	function parseAuthors(author) {

		function andSplit(author) {
			return PME.Util.map(author.split(" and "), function(a) {
				return PME.Util.trim(a);
			});
		}

		function splitAuthors(author) {
			var firstSep = author.indexOf(','),
				firstSpace = author.indexOf(' ');

			if (firstSep > -1 && firstSpace > -1 && firstSpace > firstSep) {
				//Steve Berkowitz, Jodi Upton and Christopher Schnaars
				var authors = PME.Util.map(author.split(','), function(a) {
					a = PME.Util.trim(a);
					if (a.indexOf("and ") == 0) a = a.substring(4)
					return a;
				});
				if (authors[authors.length - 1].indexOf(" and ")) {
					var split = andSplit(authors[authors.length - 1]);
					authors[authors.length - 1] = split[0]
					authors.push(split[1]);
				}
				return authors;
			} else if (author.indexOf(" and ") > -1) {
				//Jodi Upton and Christopher Schnaars
				return andSplit(author);
			} else {
				author = PME.Util.trim(author);
				if (author) {
					return [author]; //if there are multiple authors that don't match the formats above we won't be able to reliably parse them
				}
			}
		}

		if (!author) return null;

		if (author.charAt(0) == ',') {
			author = author.substring(1);
		}

		if (author.toLowerCase().indexOf("by") == 0) {
			author = PME.Util.trim(author.substring(2))
		}

		author = author.replace(", and others", "");

		return PME.Util.map(splitAuthors(author), function(a) {
			//final clean up
			a = PME.Util.trim(a);
			if (a.charAt(a.length -1 ) == ',') a = a.substring(0, a.length - 1);
			return a;
		});

	}
	function imageSrcToItemType(typeImage) {
		var itemType = "journalArticle";

		if (typeImage && typeImage.indexOf("magazines") > -1)
			itemType = "magazineArticle";
		else if (typeImage && typeImage.indexOf("newspapers") > -1)
			itemType = "newspaperArticle";

		return itemType;
	}

	function detectWeb(url) {
		if (url.indexOf("hst-article-display") > -1)
			return "single";
		else if (url.indexOf("hst-sub-display") > -1)
			return "multiple";
		else
			return 'unknown';
	}


	function doWeb(doc, url) {
		var type = detectWeb(url);

		if (type == "single")
			importSingle(doc);
		else if (type == "multiple")
			importSearchPage(doc);
	}


	PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb });
}());
