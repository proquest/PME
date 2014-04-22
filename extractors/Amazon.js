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
		"url": "http://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=Those+Darn+Squirrels+and+the+Cat+Next+Door&rh=i%3Aaps%2Ck%3AThose+Darn+Squirrels+and+the+Cat+Next+Door",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"0": "",
						"lastName": "Rubin",
						"firstName": "Adam"
					}
				],
				"title": "Dragons Love Tacos",
				"abstractNote": "This scrumptious New York Times bestseller has a whole lot of kick!\n\nDragons love tacos. They love chicken tacos, beef tacos, great big tacos, and teeny tiny tacos. So if you want to lure a bunch of dragons to your party, you should definitely serve tacos. Buckets and buckets of tacos. Unfortunately, where there are tacos, there is also salsa. And if a dragon accidentally eats spicy salsa . . . oh, boy. You're in red-hot trouble.\n\nThe award-winning team behind Those Darn Squirrels! has created an unforgettable, laugh-until-salsa-comes-out-of-your-nose tale of new friends and the perfect snack.",
				"pages": "40",
				"publisher": "Dial",
				"date": "June 14, 2012",
				"language": "English",
				"ISBN": "978-0803736801",
				"url": "http://www.amazon.com/Dragons-Love-Tacos-Adam-Rubin/dp/0803736800/ref=sr_1_5?ie=UTF8&qid=1396289555&sr=8-5&keywords=Those+Darn+Squirrels+and+the+Cat+Next+Door"
			},
			{
				"itemType": "book",
				"creators": [
					{
						"0": "",
						"lastName": "Rubin",
						"firstName": "Adam"
					}
				],
				"title": "Secret Pizza Party",
				"abstractNote": "Shhhh! Don't tell anyone about this mouth-watering book from the New York Times bestselling creators of Dragons Love Tacos!\n\nHow does Racoon love pizza? Oh, let him count the ways. He loves the gooey cheesy-ness, salty pepperoni-ness, sweet sweet tomato-ness, and of course the crispity crunchity crust. But someone is always chasing poor Raccoon away from his favorite food with a broom! What's a hungry raccoon to do? Plan an elaborate secret pizza party, of course! \nBut shhh! It’s a secret! In fact, you should probably just forget I told you. Nope, no secret pizza party happening here.You didn’t already tell all your friends, did you? Uh oh . . .\n\nFans of Jon Klassen and Mo Willems's humor will gobble up this quirky ode to the lengths we will go to for our heart's desire.\n\nPraise for Dragons Love Tacos:\nNew York Times bestseller\nA New York Times Notable Children's Book of 2012\n\n\"Rubin and Salmieri are two of the weirdest, funniest guys working in kids’ lit today. The team lets its geek flag fly in an obsessive how-to guide for would-be dragon taco party hosts. Why a taco party? As Rubin explains, 'The only things dragons love more than parties or tacos, is taco parties.' If further proof is required, Salmieri—whose poker-faced watercolor, gouache, and color pencil drawings set a benchmark for oddball observational humor—shows one odd, scaly creature with a carryout bag from 'Taco Cave' and another beaming with anticipation as it eagerly circles the date for a taco party on its taco-themed calendar. But beware: even if all the tips and rules are followed to the letter (on quantity:'The best way to judge is to get a boat and fill the boat with tacos'), all will be for naught if spicy salsa makes its way into the taco filling. In fact, the dragons will bring a whole new meaning to 'housewarming.' Off-kilter fun for those who like their picture books (and salsa) zesty and fresh.\"–Publishers Weekly, starred review\n \n\"Dragons Love Tacos is a heaping helping of silly.  Little kids will relate to the anti-spicy bias and chuckle over Salmieri's watercolor and gouache cartoon illustrations showing literally boatloads of tacos and all sizes of dragons enjoying their favorite food at pool parties, costume parties and, well, taco parties.\" –San Francisco Chronicle\n \n\"The perfect book for kids who love dragons and mild tacos.\" –Kirkus Reviews\n \n\"The watercolor, gouache, and colored pencil cartoon illustrations are the real stars here. Regardless of, or perhaps because of, the absurdity of the story, this tale should be a big hit with anyone with an affinity for dragons.\" –School Library Journal",
				"pages": "40",
				"publisher": "Dial",
				"date": "September 3, 2013",
				"language": "English",
				"ISBN": "978-0803739475",
				"url": "http://www.amazon.com/Secret-Pizza-Party-Adam-Rubin/dp/0803739478/ref=sr_1_6?ie=UTF8&qid=1396289555&sr=8-6&keywords=Those+Darn+Squirrels+and+the+Cat+Next+Door"
			},
			{
				"itemType": "book",
				"creators": [
					{
						"0": "",
						"lastName": "Polette",
						"firstName": "Nancy",
					}
				],	
				"title": "The Brain Power Story Hour: Higher Order Thinking with Picture Books [Paperback]",
				"abstractNote": "While many texts explore ways to plan and implement story times in both school and public libraries, until now no work has brought together extensive book talks and follow-up activities specifically designed to develop thinking skills in young children. This innovative study offers age-appropriate book suggestions with related questions and activities tailored to a variety of thinking skills, including verbal or linguistic thinking, divergent and creative thinking, analytical and mathematical thinking, visual or spatial thinking, and many others.  The program presented in this volume was successfully developed and implemented in the preschool/kindergarten laboratory school of Lindenwood University in St. Charles, Missouri, with 90 percent of the participating children selected for gifted programs in both public and private schools. Ideal for children's librarians, school librarians, teachers of early childhood gifted programs, parents, and homeschoolers, this study provides the tools for making any story hour a \"brain power story hour.\"",
				"pages": "184",
				"publisher": "Mcfarland",
				"date": "May 7, 2012",
				"language": "English",
				"ISBN": "978-0786468539",
				"url": "http://www.amazon.com/The-Brain-Power-Story-Hour/dp/078646853X/ref=sr_1_10?ie=UTF8&qid=1396289555&sr=8-10&keywords=Those+Darn+Squirrels+and+the+Cat+Next+Door"
			},
			{
				"itemType": "book",
				"creators": [
					{
						"0": "",
						"lastName": "Rubin",
						"firstName": "Adam"
					}
				],		
				"title": "Those Darn Squirrels Fly South",
				"abstractNote": "Old Man Fookwire's one pleasure in life is painting the birds in his backyard. When fall arrives and the birds fly south, Fookwire is desolate. The squirrels are curious: Where are the birds going, and what do they do once they get there? With their usual ingenuity and engineering skills, the squirrels devise a way to follow the birds to their destination, a tropical paradise.A wonderful time is had by all—all but grumpy Old Man Fookwire, alone at home. But the squirrels have a solution for that, too. Readers will revel in this third off-the-wall comedy featuring Old Man Fookwire, a lot of birds, and those darn squirrels.",  
				"pages": "32",
				"publisher": "Clarion Books",
				"date": "September 11, 2012",
				"language": "English",
				"ISBN": "978-0547678238",
				"url": "http://www.amazon.com/Those-Darn-Squirrels-Fly-South/dp/0547678231/ref=sr_1_2?ie=UTF8&qid=1396289555&sr=8-2&keywords=Those+Darn+Squirrels+and+the+Cat+Next+Door"
	 		},
	 		{
				"itemType": "book",
				"creators": [
					{
						"0": "",
						"lastName": "Rubin",
						"firstName": "Adam"
					}
				],
				"title": "Those Darn Squirrels and the Cat Next Door",
				"abstractNote": "All is calm in old man Fookwire's yard until new neighbors'Little Old Lady Hu and her cat, Muffins'move in next door. Muffins is one mean dude! He terrorizes the birds, interrupts Fookwire's painting, and ties the squirrels' tails together. Fookwire is upset, but not nearly as upset as the squirrels, who devise an ingenious plan to stop Muffins cold. In this hilarious follow-up to Those Darn Squirrels!, the tongue-in-cheek text is perfectly complemented by the quirky, inventive illustrations.\n\nBook Details:\nFormat: Library Binding\nPublication Date: 5/2/2011\nPages: 32\nReading Level: Age 4 and Up",
				"pages": "32",
				"publisher": "Clarion Books; First Edition edition",
				"date": "May 2, 2011",
				"language": "English",
				"ISBN": "978-0547429229",
				"url": "http://www.amazon.com/Those-Darn-Squirrels-Next-Door/dp/0547429223/ref=sr_1_1?ie=UTF8&qid=1396289555&sr=8-1&keywords=Those+Darn+Squirrels+and+the+Cat+Next+Door"
			},
			{
				"itemType": "book",
				"creators": [
					{
						"0": "",
						"lastName": "Rubin",
						"firstName": "Adam"
					}
				],
				"title": "Those Darn Squirrels!",
				"abstractNote": "The story of what happens when a grumpy old man and some mischievous squirrels match wits—with hilarious results.\n\nOld Man Fookwire is a grump who only likes to paint pictures of birds that visit his backyard. The problem is, they fly south every winter, leaving him sad and lonely. So he decides to get them to stay by putting up beautiful birdfeeders filled with seeds and berries. Unfortunately, the squirrels like the treats, too, and make a daring raid on the feeders. The conflict escalates—until the birds depart (as usual), and the squirrels come up with a plan that charms the old grump.",
				"pages": "32",
				"publisher": "HMH Books for Young Readers; Reprint edition",
				"date": "September 6, 2011",
				"language": "English",
				"ISBN": "978-0547576817",
				"url": "http://www.amazon.com/Those-Darn-Squirrels-Adam-Rubin/dp/0547576811/ref=sr_1_3?ie=UTF8&qid=1396289555&sr=8-3&keywords=Those+Darn+Squirrels+and+the+Cat+Next+Door"
			}
	 	]		
	}
]
/** END TEST CASES **/

	PME.TranslatorClass.loaded(translatorSpec, { detectWeb: detectWeb, doWeb: doWeb, testCases: testCases });
}());