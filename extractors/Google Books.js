(function () {
	var translatorSpec = {
		"translatorID": "127ff21d-c614-41f6-b4e8-007ea42dd6e0",
		"label": "Google Books",
		"creator": "PME",
		"lastUpdated": "03/24/2014"
	}
	var url_, doc_;

	function handleCreators(subset, selectors, attr)
	{
		var jAuthors = $(selectors, subset);
		var authors = (attr ? jAuthors.attr(attr) : jAuthors.text()).split(', ');//, n = 0;
		if (authors.length == 0)
			return [];
		var creators = [];
		for (var i = 0; i < authors.length; i++)
		{
			//first m. last, suffix - we just drop the suffix, we'll always have at least one element
			authors[i] = authors[i].split(',')[0];//first m. last jr, suffix

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

	function getSelectorString(field)
	{
		return 'tr.metadata_row:has(td.metadata_label:contains("' + field + '")) td.metadata_value';
	}

	function googleBookId(url)
	{
		if (/id=(.*?)(?:&|$)/.exec(url))
			return RegExp.$1;
		return undefined;
	}
	function doEBook()
	{
		PME.debug("ebook")
		var item = new PME.Item('book');
		var subset = $('#metadata_content', doc_);
		item.title = $(getSelectorString("Title")+'>span', subset).text();
		if (/(.*), (\d{4})/g.exec($(getSelectorString("Publisher"), subset).text()))
		{
			item.publisher = RegExp.$1;
			item.date = RegExp.$2;
		}
		if (/(\d+)/.exec($(getSelectorString("Length"), subset).text()))
			item.pages = RegExp.$1;
		if (/(\d+)/.exec($(getSelectorString("ISBN"), subset).text()))
			item.ISBN = RegExp.$1;

		item.edition = $(getSelectorString("Edition"), subset).text();
		item.abstractNote = $("#summary_content_table #bookinfo #synopsistext", doc_).text(); 
		item.url = url_;
		item.creators = handleCreators(subset, getSelectorString("Author"));
		item.googlebooksid = googleBookId(url_);
		item.complete();
	}
	function doStorebook()
	{
		PME.debug("storebook")
		var item = new PME.Item('book');
		var subset = $('div.info-container', doc_);
		item.title = $('div.document-title', subset).text(); 
		item.creators = handleCreators(subset, 'div[itemprop="author"] meta[itemprop="name"]', 'content');
		item.publisher = $('div:has(>div.document-subtitle:contains("Publisher")) div.document-subtitle.primary', doc_).text();
		var description = $.parseHTML('<div>' + $('div.details-section.description>meta[itemprop="description"]', doc_).attr("content") + '</div>')[0]
		item.abstractNote = description.innerText || description.textContent;
		var othersubset = $('div.details-section.metadata div.meta-info:has(div.title:contains("Other"))', doc_);
		if (/(\d*,?\d+)/.exec($('div[itemprop="numberOfPages"]', othersubset).text()))
			item.pages = RegExp.$1.replace(",", "");
		if (/(\d+)/.exec($('div[itemprop="isbn"]', othersubset).text()))
			item.ISBN = RegExp.$1;
		item.url = url_;
		item.googlebooksid = googleBookId(url_);
		item.complete();
	}
	function doSliders()
	{
		PME.debug("sliders")
		var sliders = $('div.slider_content')
			.not('h3.slider_title:has(a:contains("Magazines")) ~ div.slider_content')
			.find("div.slider-drawables");

		//will round up if over .45
		var maxPerSlider = Math.round(sliders.eq(0).width() / sliders.find("div.slider-drawable").eq(0).width() + 0.05);
		var URLs = [];
		$.each(sliders, function ()
		{
			var slider = $(this);
			var items = slider.find("div.slider-drawable").not(':has(div.slider-empty-shelf-content)');
			var firstViewed = Math.round(slider.scrollLeft() / items.eq(0).width());
			var max = items.size() > maxPerSlider ? maxPerSlider : items.size();
			for (var n = 0; n < max; n++)
			{
				URLs.push(items.eq(n + firstViewed).find(">a").attr("href"));
			}					
		});
		PME.Util.processDocuments(URLs, doWeb);
	}
	function doBookshelf()
	{
		PME.debug('bookshelf');
		var URLs = [];
		$.each($("h2 a", $("td.coverwrapper ~ td")), function () { URLs.push($(this).attr('href')); });
		PME.Util.processDocuments(URLs, doWeb);
	}
	function doStorelist()
	{
		PME.debug('storelist')
		var URLs = [];
		$.each($('div.card:not(.hidden-card) div.cover a'), function ()
		{
			URLs.push(window.location.protocol + '//' + window.location.host + $(this).attr('href'));
			if (URLs.length == 20)
				return false;
		});
		PME.Util.processDocuments(URLs, doWeb);
	}
	function doMybooks()
	{
		PME.debug('mybooks');
		var URLs = [];
		$.each($("div.card-content a.bfe-cover-overlay"), function ()
		{
			var id = googleBookId($(this).attr("href"));
			if (id)
				URLs.push(window.location.protocol + '//' + window.location.host + '/store/books/details?id=' + id);
		});
		PME.Util.processDocuments(URLs, doWeb);
		
	}
	function doSearch()
	{
		PME.debug('search')
		var URLs = [];
		$.each($('#search li.g h3 a'), function ()
		{
			var item = new PME.Item('book');
			url = $(this).attr("href");
			item.googlebooksid = googleBookId(url);
			item.url = url;
			item.complete();
		});
	}
	function bookReader(loc)
	{
		PME.debug('bookReader');
		var itemurl = url_;
		var id = googleBookId(url_);
		var url;
		switch (loc)
		{
			case 'books':
				url = window.location.protocol + '//books.google.com/books?id=' + id;
				break;
			case 'store':
				url = window.location.protocol + '//' + window.location.host + '/store/books/details?id=' + id;
		}
		PME.Util.processDocuments(url, doWeb, function () { PME.items[0].url = itemurl; });
		
	}

	function detectWeb(doc, url) {
		//not used
	}
	function doWeb(doc, url)
	{
		PME.debug('\n--------------------GOOGLE BOOKS-----------------------')

		doc_ = doc;
		url_ = url;

		if ($("div.gb-reader-container", doc_).size() > 0)
			bookReader('store');
		else if ($("#toolbar_container", doc_).size() > 0)
			bookReader('books');

		else if (url_.match(/books\.google\.com\/books/i))
		{
			if ($('div.vertical_module_list_row:has(h3.about_title)', doc_).size() > 0)
				doEBook();
			else if ($("div.slider-drawables", "#hp_table, #slider_container").size() > 0)
				doSliders();
			else if ($("div.bookshelf-holder", doc_).size() > 0)
				doBookshelf();
		}
		else if (url_.match(/play\.google\.com\/store\/books\/details/i))
			doStorebook();
		else if (url_.match(/play\.google\.com\/store\/(?:books)|(?:.+c=books)/i))
			doStorelist();
		else if (url_.match(/play\.google\.com\/books/i))
			doMybooks();
		else if (url_.match(/www\.google\.com\/search/i) && $('div.hdtb_mitem.hdtb_msel:contains("Books")', doc_).size() > 0)
			doSearch();
	}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://books.google.com/books?id=afqfFW8WV9cC&as_brr=3&ei=rQ0zU5emNISwlQSKjICADg&source=gbs_slider_subject_list_homepage",
		"items": [
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Nielsen",
						"firstName" : "Michael"
					}
				],		
				"title" : "Reinventing Discovery: The New Era of Networked Science",
				"publisher" : "Princeton University Press",
				"date" : "2012",
				"pages" : "264",
				"ISBN" : "0691148902",
				"edition" : "illustrated",
				"abstractNote" : "In Reinventing Discovery, Michael Nielsen argues that we are living at the dawn of the most dramatic change in science in more than 300 years. This change is being driven by powerful new cognitive tools, enabled by the internet, which are greatly accelerating scientific discovery. There are many books about how the internet is changing business or the workplace or government. But this is the first book about something much more fundamental: how the internet is transforming the nature of our collective intelligence and how we understand the world. Reinventing Discovery tells the exciting story of an unprecedented new era of networked science. We learn, for example, how mathematicians in the Polymath Project are spontaneously coming together to collaborate online, tackling and rapidly demolishing previously unsolved problems. We learn how 250,000 amateur astronomers are working together in a project called Galaxy Zoo to understand the large-scale structure of the Universe, and how they are making astonishing discoveries, including an entirely new kind of galaxy. These efforts are just a small part of the larger story told in this book--the story of how scientists are using the internet to dramatically expand our problem-solving ability and increase our combined brainpower. This is a book for anyone who wants to understand how the online world is revolutionizing scientific discovery today--and why the revolution is just beginning.",
				"url" : "http://books.google.com/books?id=afqfFW8WV9cC&as_brr=3&ei=rQ0zU5emNISwlQSKjICADg&source=gbs_slider_subject_list_homepage",
				"googlebooksid" : "afqfFW8WV9cC"
			}
		]	
	},
	{
		"type": "web",
		"url": "https://play.google.com/store/books/details/L_Frank_Baum_The_Wonderful_Wizard_of_Oz?id=qbV65PabTEYC",
		"items": [
			{
				"itemType" : "book",
				"creators" : [
					{
						"0" : "",
						"lastName" : "Baum",
						"firstName" : "L."
					}
				],	
				"title" : " The Wonderful Wizard of Oz ",
				"publisher" : "Random House Books for Young Readers",
				"abstractNote" : "In the first of L. Frank Baum's time-honored Oz novels, country girl Dorothy Gale gets whisked away by a cyclone to the fantastical Land of Oz. Dropped into the midst of trouble when her farmhouse crushes a tyrannical sorceress, Dorothy incurs the wrath of the Wicked Witch of the West. Dorothy is desperate to return to her native Kansas, and, aided by the Good Witch of the North, she sets out for the Emerald City to get help from the legendary Wizard. On her way, she meets three unlikely allies who embody key human virtues—the Scarecrow, the Tin Woodman, and the Cowardly Lion.",
				"pages" : "191",
				"url" : "https://play.google.com/store/books/details/L_Frank_Baum_The_Wonderful_Wizard_of_Oz?id=qbV65PabTEYC",
				"googlebooksid" : "qbV65PabTEYC"
			}
		]	
	}
]
/** END TEST CASES **/


	PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb, testCases: testCases });
}());