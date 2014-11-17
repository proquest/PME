// These are DEFAULT prefs for the install.
//
// Add new user-adjustable hidden preferences to
// http://www.pme.org/documentation/hidden_prefs

pref("extensions.pme.firstRun2", true);
pref("extensions.pme.saveRelativeAttachmentPath", false);
pref("extensions.pme.baseAttachmentPath", '');
pref("extensions.pme.useDataDir", false);
pref("extensions.pme.dataDir", '');
pref("extensions.pme.lastDataDir", '');
pref("extensions.pme.debug.log", false);
pref("extensions.pme.debug.stackTrace", false);
pref("extensions.pme.debug.store", false);
pref("extensions.pme.debug.store.limit", 500000);
pref("extensions.pme.debug.store.submitSize", 10000000);
pref("extensions.pme.debug.store.submitLineLength", 10000);
pref("extensions.pme.debug.level", 5);
pref("extensions.pme.debug.time", false);
pref("extensions.pme.automaticScraperUpdates", true);
pref("extensions.pme.zoteroDotOrgVersionHeader", true);
pref("extensions.pme.triggerProxyAuthentication", true);
// Proxy auth URLs should respond successfully to HEAD requests over HTTP and HTTPS (in case of forced HTTPS requests)
pref("extensions.pme.proxyAuthenticationURLs", 'http://www.acm.org,http://www.ebscohost.com,http://www.elsevier.com,http://www.ieee.org,http://www.jstor.org,http://www.ovid.com,http://www.springer.com,http://www.tandfonline.com');
pref("extensions.pme.cacheTranslatorData", true);
pref("extensions.pme.showIn", 1);
pref("extensions.pme.statusBarIcon", 2);
pref("extensions.pme.browserContentContextMenu", true);
pref("extensions.pme.openURL.resolver", "http://worldcatlibraries.org/registry/gateway");
pref("extensions.pme.openURL.version", "1.0");
pref("extensions.pme.parseEndNoteMIMETypes", true);
pref("extensions.pme.automaticSnapshots", true);
pref("extensions.pme.downloadAssociatedFiles", true);
pref("extensions.pme.reportTranslationFailure", true);
pref("extensions.pme.automaticTags", true);
pref("extensions.pme.fontSize", "1.0");
pref("extensions.pme.recursiveCollections", false);
pref("extensions.pme.attachmentRenameFormatString", '{%c - }{%y - }{%t{50}}');
pref("extensions.pme.capitalizeTitles", false);
pref("extensions.pme.launchNonNativeFiles", false);
pref("extensions.pme.sortNotesChronologically", false);
pref("extensions.pme.sortAttachmentsChronologically", false);
pref("extensions.pme.showTrashWhenEmpty", true);
pref("extensions.pme.trashAutoEmptyDays", 30);
pref("extensions.pme.viewOnDoubleClick", true);

pref("extensions.pme.groups.copyChildLinks", true);
pref("extensions.pme.groups.copyChildFileAttachments", true);
pref("extensions.pme.groups.copyChildNotes", true);
pref("extensions.pme.groups.copyTags", true);

pref("extensions.pme.backup.numBackups", 2);
pref("extensions.pme.backup.interval", 1440);

pref("extensions.pme.lastCreatorFieldMode", 0);
pref("extensions.pme.lastAbstractExpand", 0);
pref("extensions.pme.lastRenameAssociatedFile", false);
pref("extensions.pme.lastViewedFolder", 'L');
pref("extensions.pme.lastLongTagMode", 0);
pref("extensions.pme.lastLongTagDelimiter", ";");

pref("extensions.pme.fallbackSort", 'firstCreator,date,title,dateAdded');
pref("extensions.pme.sortCreatorAsString", false);

//Tag Cloud
pref("extensions.pme.tagCloud", false);

// Keyboard shortcuts
pref("extensions.pme.keys.openZotero", 'Z');
pref("extensions.pme.keys.toggleFullscreen", 'F');
pref("extensions.pme.keys.saveToZotero", 'S');
pref("extensions.pme.keys.newItem", 'N');
pref("extensions.pme.keys.newNote", 'O');
pref("extensions.pme.keys.importFromClipboard", 'V');
pref("extensions.pme.keys.library", 'L');
pref("extensions.pme.keys.quicksearch", 'K');
pref("extensions.pme.keys.copySelectedItemCitationsToClipboard", 'A');
pref("extensions.pme.keys.copySelectedItemsToClipboard", 'C');
pref("extensions.pme.keys.toggleTagSelector", 'T');

// Fulltext indexing
pref("extensions.pme.fulltext.textMaxLength", 500000);
pref("extensions.pme.fulltext.pdfMaxPages", 100);
pref("extensions.pme.search.useLeftBound", true);

// Notes
pref("extensions.pme.note.fontFamily", "Lucida Grande, Tahoma, Verdana, Helvetica, sans-serif");
pref("extensions.pme.note.fontSize", "11");
pref("extensions.pme.note.css", "");

// Reports
pref("extensions.pme.report.includeAllChildItems", true);
pref("extensions.pme.report.combineChildItems", true);

// Export and citation settings
pref("extensions.pme.export.lastTranslator", '14763d24-8ba0-45df-8f52-b8d1108e7ac9');
pref("extensions.pme.export.translatorSettings", 'true,false');
pref("extensions.pme.export.lastStyle", 'http://www.pme.org/styles/chicago-note-bibliography');
pref("extensions.pme.export.bibliographySettings", 'save-as-rtf');
pref("extensions.pme.export.bibliographyLocale", '');
pref("extensions.pme.export.displayCharsetOption", false);
pref("extensions.pme.export.citePaperJournalArticleURL", false);
pref("extensions.pme.cite.automaticJournalAbbreviations", true);
pref("extensions.pme.import.charset", "auto");
pref("extensions.pme.import.createNewCollection.fromFileOpenHandler", true);
pref("extensions.pme.rtfScan.lastInputFile", "");
pref("extensions.pme.rtfScan.lastOutputFile", "");

pref("extensions.pme.export.quickCopy.setting", 'bibliography=http://www.pme.org/styles/chicago-note-bibliography');
pref("extensions.pme.export.quickCopy.dragLimit", 50);
pref("extensions.pme.export.quickCopy.quoteBlockquotes.plainText", true);
pref("extensions.pme.export.quickCopy.quoteBlockquotes.richText", true);
pref("extensions.pme.export.quickCopy.compatibility.indentBlockquotes", true);
pref("extensions.pme.export.quickCopy.compatibility.word", false);

// Integration settings
pref("extensions.pme.integration.port", 50001);
pref("extensions.pme.integration.autoRegenerate", -1);	// -1 = ask; 0 = no; 1 = yes
pref("extensions.pme.integration.useClassicAddCitationDialog", false);
pref("extensions.pme.integration.keepAddCitationDialogRaised", false);

// Connector settings
pref("extensions.pme.httpServer.enabled", false);	// TODO enabled for testing only
pref("extensions.pme.httpServer.port", 23119);	// ascii "ZO"

// Zeroconf
pref("extensions.pme.zeroconf.server.enabled", false);

// Annotation settings
pref("extensions.pme.annotations.warnOnClose", true);

// Sync
pref("extensions.pme.sync.autoSync", true);
pref("extensions.pme.sync.server.username", '');
pref("extensions.pme.sync.server.compressData", true);
pref("extensions.pme.sync.storage.enabled", true);
pref("extensions.pme.sync.storage.protocol", "zotero");
pref("extensions.pme.sync.storage.verified", false);
pref("extensions.pme.sync.storage.scheme", 'https');
pref("extensions.pme.sync.storage.url", '');
pref("extensions.pme.sync.storage.username", '');
pref("extensions.pme.sync.storage.maxDownloads", 4);
pref("extensions.pme.sync.storage.maxUploads", 2);
pref("extensions.pme.sync.storage.deleteDelayDays", 30);
pref("extensions.pme.sync.storage.groups.enabled", true);
pref("extensions.pme.sync.storage.downloadMode.personal", "on-sync");
pref("extensions.pme.sync.storage.downloadMode.groups", "on-sync");
pref("extensions.pme.sync.fulltext.enabled", true);

// Proxy
pref("extensions.pme.proxies.autoRecognize", true);
pref("extensions.pme.proxies.transparent", true);
pref("extensions.pme.proxies.disableByDomain", false);
pref("extensions.pme.proxies.disableByDomainString", ".edu");

// Data layer purging
pref("extensions.pme.purge.creators", false);
pref("extensions.pme.purge.fulltext", false);
pref("extensions.pme.purge.items", false);
pref("extensions.pme.purge.tags", false);

// Zotero pane persistent data
pref("extensions.pme.pane.persist", '');

// Domains allowed to import, separated by a semicolon
pref("extensions.pme.ingester.allowedSites", "");

// Connector
pref("extensions.pme.connector.repo.lastCheck.localTime", 0);
pref("extensions.pme.connector.repo.lastCheck.repoTime", 0);

// File/URL opening executable if launch() fails
pref("extensions.pme.fallbackLauncher.unix", "/usr/bin/xdg-open");
pref("extensions.pme.fallbackLauncher.windows", "");

//Translators
pref("extensions.pme.translators.attachSupplementary", false);
pref("extensions.pme.translators.supplementaryAsLink", false);
pref("extensions.pme.translators.RIS.import.ignoreUnknown", true);
pref("extensions.pme.translators.RIS.import.keepID", false);
