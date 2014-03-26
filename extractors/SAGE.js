(function () {
	var translatorSpec = {
		"translatorID": "6258ad6a-a789-409e-b01a-c41776db8650",
		"label": "SAGE",
		"creator": "PME",
		"lastUpdated": "03/24/2014"
	}
	var url_, doc_;

	function handleCreators(subset, selectors, attr)
	{
		var jAuthors = $(selectors, subset);
		var authors = [];//(attr ? jAuthors.attr(attr) : jAuthors.text()).split(', ');
		if (jAuthors.size() == 0)
			return [];

		var creators = [];
		for (var i = 0; i < jAuthors.size(); i++)
		{
			//first m. last, suffix - we just drop the suffix, we'll always have at least one element
			authors[i] = jAuthors.eq(i).text().split(',')[0];//first m. last jr, suffix

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

	function pageType()
	{
		if (url_.match("/knowledge\.sagepub\.com"))
		{
			if (url_.match(/\/view/))
				return 'knowledgesingle';
			if (url_.match(/\/browse/))
				return 'knowledgelist';
		}
		if (url_.match(/\/books\/Book\d*/))
			return 'single';
		if(url_.match(/\/productSearch/i))
			return 'list';
	}

	function doSingle()
	{
		PME.debug('\nsingle');
		var item = new PME.Item('book');
		var set = $("#title", doc_);
		item.title = $.trim($('h2, h3', set).text());
		item.creators = handleCreators(set, "#authorTbl td.col1");
		item.edition = $.trim($('>em', set).text().replace(/edition/i, ''));
		var infoset = $("#infoTbl", set);
		item.date = $.trim($("td.col1", infoset).text().replace(String.fromCharCode(169), ''));//'©'
		item.pages = $.trim($("td.col2", infoset).text().replace(/pages/i, ''));
		item.publisher = $.trim($("td.col3", infoset).text());
		item.ISBN = $("#detailsTbl td:contains('ISBN')~td:first").text();
		item.abstractNote=$.trim($("#description").text());
		item.complete();
	}

	function doList(selector)
	{
		PME.debug('\nlist');
		var URLs = [];
		$(selector).each(function ()
		{
			URLs.push(window.location.protocol + '//' + window.location.host + $(this).attr('href'));
		});
		PME.Util.processDocuments(URLs, doWeb);

	}

	function text(selector, jsubset)
	{
		return $.trim($(selector, jsubset).clone().children().remove().end().text());
	}

	function doKSingle()
	{
		PME.debug('\nknowledge single');
		var item = new PME.Item('book');
		var set = $("#topWrapper", doc_);
		item.title = $.trim($('#bookTitle', set).text());
		item.creators = handleCreators(set, "#authors a");
		var infoset = $("div.contentData", set);
		item.date = text("#onlinePubDate", infoset);
		item.DOI = text("#_doi a", infoset).replace("http://dx.doi.org/", "");
		item.publisher = text("strong:contains('Publisher')~span", infoset);
		item.ISBN = text("#_oisbn", infoset);

		//item.abstractNote could be taken from $('>a', infoset).attr('href'), 
		//however I am getting the 500 error trying to get to this location with $.ajax
		//maybe there is another way

		item.complete();

	}

	function detectWeb(doc, url) {
		//not used
	}
	function doWeb(doc, url)
	{
		PME.debug('\n--------------------SAGE-----------------------')

		doc_ = doc;
		url_ = url;

		switch (pageType())
		{
			case 'single':
				doSingle();
				break;
			case 'list':
				doList('#resultsTbl #title a');
				break;
			case 'knowledgesingle':
				doKSingle();
				break;
			case 'knowledgelist':
				doList('li div.result>a');
				break;
		}
	}

	PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb });
}());