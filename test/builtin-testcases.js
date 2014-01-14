test("whatever", function() {
	ok(PME, "Where's PME?");

	var transCache = PME.TranslatorClass.cache;
	ok(transCache, "Where's the TC cache?");

	var translatorIDs = Object.keys(transCache);
	ok(translatorIDs.length > 0, "There are no translators loaded.");

	translatorIDs.forEach(function(classID) {
		var tc = transCache[classID];

		if (tc.api.testCases)
			console.info("Class", tc.name, tc.spec.label, "has testcases.");
	});
});
