/*
    ***** BEGIN LICENSE BLOCK *****
    
    Copyright © 2009 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://zotero.org
    
    This file is part of PME.
    
    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    
    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with PME.  If not, see <http://www.gnu.org/licenses/>.
    
    
    Based on code from Greasemonkey and PiggyBank
    
    ***** END LICENSE BLOCK *****
*/

//
// Zotero Ingester Browser Functions
//

//////////////////////////////////////////////////////////////////////////////
//
// PME_Browser
//
//////////////////////////////////////////////////////////////////////////////

// Class to interface with the browser when ingesting data

var PME_Browser = new function() {
	this.init = init;
	this.scrapeThisPage = scrapeThisPage;
	this.chromeLoad = chromeLoad;
	this.contentLoad = contentLoad;
	this.itemUpdated = itemUpdated;
	this.contentHide = contentHide;
	
	this.tabbrowser = null;
	this.appcontent = null;
	this.isScraping = false;
	
	var _browserData = new Object();
	var _attachmentsMap = new WeakMap();
	
	var _blacklist = [
		"googlesyndication.com",
		"doubleclick.net",
		"questionmarket.com",
		"atdmt.com",
		"aggregateknowledge.com",
		"ad.yieldmanager.com",
		"addthis.com",
		"ssl-images-amazon.com",
		"images-amazon.com"
	];
	
	var _locationBlacklist = [
		"zotero://debug/"
	];

	//////////////////////////////////////////////////////////////////////////////
	//
	// Public PME_Browser methods
	//
	//////////////////////////////////////////////////////////////////////////////
	
	
	/**
	 * Initialize some variables and prepare event listeners for when chrome is done loading
	 */
	function init() {
		PME.debug("PME_Browser.init")
		if (!window.hasOwnProperty("gBrowser")) {
			return;
		}

		PME_Browser.chromeLoad();
	}
	
	/**
	 * Scrapes a page (called when the capture icon is clicked
	 * @return	void
	 */
	function scrapeThisPage(translator)
	{
		// Perform translation
		var tab = _getTabObject(PME_Browser.tabbrowser.selectedBrowser);
		if(tab.page.translators && tab.page.translators.length) {
			tab.page.translate.setTranslator(translator || tab.page.translators[0]);
			PME_Browser.performTranslation(tab.page.translate);
		}
	}

	/*
	 * When chrome loads, register our event handlers with the appropriate interfaces
	 */
	function chromeLoad() {
		this.tabbrowser = gBrowser;
		this.appcontent = document.getElementById("appcontent");
		// this is for pageshow, for updating the status of the book icon
		this.appcontent.addEventListener("pageshow", contentLoad, true);
		// this is for turning off the book icon when a user navigates away from a page
		this.appcontent.addEventListener("pagehide",contentHide, true);
	}
	
	/*
	 * An event handler called when a new document is loaded. Creates a new document
	 * object, and updates the status of the capture icon
	 */
	function contentLoad(event) {
		var doc = event.originalTarget;
		var isHTML = doc instanceof HTMLDocument;
		var rootDoc = (doc instanceof HTMLDocument ? doc.defaultView.top.document : doc);
		var browser = PME_Browser.tabbrowser.getBrowserForDocument(rootDoc);
		if(!browser) return;
		
		if(isHTML) {
			// ignore blacklisted domains
			try {
				if(doc.domain) {
					for each(var blacklistedURL in _blacklist) {
						if(doc.domain.substr(doc.domain.length-blacklistedURL.length) == blacklistedURL) {
							//PME.debug("Ignoring blacklisted URL "+doc.location);
							return;
						}
					}
				}
			}
			catch (e) {}
		}
		
		try {
			if (_locationBlacklist.indexOf(doc.location.href) != -1) {
				return;
			}
			
			// Ignore TinyMCE popups
			if (!doc.location.host && doc.location.href.indexOf("tinymce/") != -1) {
				return;
			}

			//ignore script/style files
			if (doc.location.href.indexOf(doc.location.href.length - 4, ".js") != -1
				|| doc.location.href.indexOf(doc.location.href.length - 5, ".css") != -1) {
				return;
			}
		}
		catch (e) {}
		
		// get data object
		var tab = _getTabObject(browser);
		
		// detect translators
		tab.detectTranslators(rootDoc, doc);
		
		// register metadata updated event
		if(isHTML) {
			var contentWin = doc.defaultView;
			if(!contentWin.haveZoteroEventListener) {
				contentWin.addEventListener("ZoteroItemUpdated", function(event) { itemUpdated(event.originalTarget) }, false);
				contentWin.haveZoteroEventListener = true;
			}
		}
	}

	/*
	 * called to unregister Zotero icon, etc.
	 */
	function contentHide(event) {
		var doc = event.originalTarget;
		if(!(doc instanceof HTMLDocument)) return;
	
		var rootDoc = (doc instanceof HTMLDocument ? doc.defaultView.top.document : doc);
		var browser = PME_Browser.tabbrowser.getBrowserForDocument(rootDoc);
		if(!browser) return;
		
		var tab = _getTabObject(browser);
		if(!tab) return;
		
		if(doc == tab.page.document || doc == rootDoc) {
			// clear translator only if the page on which the pagehide event was called is
			// either the page to which the translator corresponded, or the root document
			// (the second check is probably paranoid, but won't hurt)
			tab.clear();
		}
	}
	
	/**
	 * Called when item should be updated due to a DOM event
	 */
	function itemUpdated(doc) {
		try {
			var rootDoc = (doc instanceof HTMLDocument ? doc.defaultView.top.document : doc);
			var browser = PME_Browser.tabbrowser.getBrowserForDocument(rootDoc);
			var tab = _getTabObject(browser);
			if(doc == tab.page.document || doc == rootDoc) tab.clear();
			tab.detectTranslators(rootDoc, doc);
		} catch(e) {
			PME.debug(e);
		}
	}

	/**
	 * Translates using the specified translation instance. setTranslator() must already
	 * have been called
	 * @param {PME.Translate} translate
	 */
	this.performTranslation = function(translate, libraryID, collection) {
		translate.translate(libraryID);
	}
	
	
	//////////////////////////////////////////////////////////////////////////////
	//
	// Private PME_Browser methods
	//
	//////////////////////////////////////////////////////////////////////////////
	/*
	 * Gets a data object given a browser window object
	 */
	function _getTabObject(browser) {
		if(!browser) return false;
		if(!browser.pmeBrowserData) {
			browser.pmeBrowserData = new PME_Browser.Tab(browser);
		}
		return browser.pmeBrowserData;
	}
}


//////////////////////////////////////////////////////////////////////////////
//
// PME_Browser.Tab
//
//////////////////////////////////////////////////////////////////////////////

PME_Browser.Tab = function(browser) {
	this.browser = browser;
	this.page = new Object();
}

/*
 * clears page-specific information
 */
PME_Browser.Tab.prototype.clear = function() {
	delete this.page;
	this.page = new Object();
}

/*
 * detects translators for this browser object
 */
PME_Browser.Tab.prototype.detectTranslators = function(rootDoc, doc) {	
	if(doc instanceof HTMLDocument && doc.documentURI.substr(0, 6) != "about:") {
		// get translators
		var me = this;
		
		var translate = new PME.Translate.Web();
		translate.setDocument(doc);
		translate.setHandler("translators", function(obj, item) { me._translatorsAvailable(obj, item) });
		translate.setHandler("pageModified", function(translate, doc) { PME_Browser.itemUpdated(doc) });
		translate.getTranslators(true);
	}
}


/**********CALLBACKS**********/

/*
 * called when translators are available
 */
PME_Browser.Tab.prototype._translatorsAvailable = function(translate, translators) {
	if(translators && translators.length) {
		//see if we should keep the previous set of translators
		if(//we already have a translator for part of this page
			this.page.translators && this.page.translators.length && this.page.document.location
			//and the page is still there
			&& this.page.document.defaultView && !this.page.document.defaultView.closed
			//this set of translators is not targeting the same URL as a previous set of translators,
			// because otherwise we want to use the newer set,
			// but only if it's not in a subframe of the previous set
			&& (this.page.document.location.href != translate.document.location.href ||
				PME.Utilities.Internal.isIframeOf(translate.document.defaultView, this.page.document.defaultView))
				//the best translator we had was of higher priority than the new set
			&& (this.page.translators[0].priority < translators[0].priority
				//or the priority was the same, but...
				|| (this.page.translators[0].priority == translators[0].priority
					//the previous set of translators targets the top frame or the current one does not either
					&& (this.page.document.defaultView == this.page.document.defaultView.top
						|| translate.document.defaultView !== this.page.document.defaultView.top)
			))
		) {
			PME.debug("Translate: a better translator was already found for this page");
			return; //keep what we had
		} else {
			this.clear(); //clear URL bar icon
		}
		
		PME.debug("Translate: found translators for page\n"
			+ "Best translator: " + translators[0].label + " with priority " + translators[0].priority);
		
		this.page.translate = translate;
		this.page.translators = translators;
		this.page.document = translate.document;
	}

	if(!translators || !translators.length) PME.debug("Translate: No translators found");
}

PME.init();
PME_Browser.init();