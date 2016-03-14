/******** BEGIN inject_base.js ********/
/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2011 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://zotero.org

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/

var pos = (Zotero.isIE && document.compatMode === "BackCompat" ? "absolute" : "fixed");
var cssBookmarkletFrameDimmer = {"background":"black", "opacity":"0.5", "position":pos,
	"top":"0px", "bottom":"0px", "left":"0px", "right":"0px", "zIndex":"1000000092",
	"height":"100%", "width":"100%", "filter":"alpha(opacity = 50);"};
var cssBookmarkletFrame = {"position":pos, "zIndex":"1000000093", "top":"0",
	"right":"0", "bottom": 0, "background":"white", "border-left":"1px solid #CCC"};

Zotero.initInject();
Zotero.Connector_Types.init();

/**
 * Creates a new frame with the specified width and height
 * @constructor
 */
var BookmarkletFrame = function(url, width, height, name) {
	var parentWin = window.parent,
		parentDoc = parentWin.document;

	this._appendFrameTo = (document.body ? document.body : document.documentElement);
	this._appendDimmerTo = (parentDoc.body ? parentDoc.body : parentDoc.documentElement);

	// Make sure iframe is not bigger than window
	var windowWidth, windowHeight;
	if(parentWin.innerWidth) {
		windowWidth = parentWin.innerWidth;
		windowHeight = parentWin.innerHeight;
	} else if(parentDoc.documentElement.offsetWidth) {
		windowWidth = parentDoc.documentElement.offsetWidth;
		windowHeight = parentDoc.documentElement.offsetHeight;
	} else if(parentDoc.body && parentDoc.body.offsetWidth) {
		windowWidth = parentDoc.body.offsetWidth;
		windowHeight = parentDoc.body.offsetHeight;
	} else {
		windowWidth = windowHeight = Infinity;
	}

	// Add width and height
	height = Math.min(windowHeight-10, height);
	width = Math.min(windowWidth-10, width);


	// Add iframe
	if(url || name) {
		this._frame = document.createElement("iframe");
		if(name) this._frame.name = name;
		if(url) this._frame.src = url + "?referrer=" + document.referrer+"&EXT_SERVICE_PROVIDER="+encodeURIComponent(window.EXT_SERVICE_PROVIDER) + "&PME_SERVICE_PROVIDER="+encodeURIComponent(window.PME_SERVICE_PROVIDER);
	} else {
		this._frame = zoteroIFrame;
		zoteroIFrame.style.display = "block";
	}
	this._frame.style.position = "absolute";
	this._frame.style.top = "0px";
	this._frame.style.left = "0px";
	this._frame.style.width = "100%";
	this._frame.style.height = "100%";
	this._frame.style.borderStyle = "none";
	this._frame.setAttribute("frameborder", "0");

	var frameElementStyle = window.frameElement.style;
	for(var i in cssBookmarkletFrame) frameElementStyle[i] = cssBookmarkletFrame[i];
	frameElementStyle.display = "block";
	//frameElementStyle.margin = "-"+height/2+"px 0 0 -"+width/2+"px";
	frameElementStyle.width = width+"px";
	//frameElementStyle.height = height+"px";
	frameElementStyle.height = "100%";
	if(url || name) this._appendFrameTo.appendChild(this._frame);



}

/**
 * Removes the frame
 */
BookmarkletFrame.prototype.remove = function() {
	this._appendDimmerTo.removeChild(this._dimmer);
	if(this._frame == zoteroIFrame) {
		zoteroIFrame.style.display = "none";
	} else {
		this._appendFrameTo.removeChild(this._frame);
	}
	window.frameElement.style.display = "none";
}

var translate = new Zotero.Translate.Web(),
	selectCallback, cancelled, haveItem, attachmentsSaving;
translate.setDocument(window.parent.document);
translate.setHandler("translators", function(obj, translators) {
	selectCallback = cancelled = haveItem = null;

	if(translators && translators.length) {
		if(translators[0].runMode === Zotero.Translator.RUN_MODE_IN_BROWSER) {
			Zotero.ProgressWindow.changeHeadline("Analyzing...");
		} else if(translators[0].runMode === Zotero.Translator.RUN_MODE_ZOTERO_SERVER) {
			Zotero.ProgressWindow.changeHeadline("Saving via Server...");
		} else {
			Zotero.ProgressWindow.changeHeadline("Saving via Zotero Standalone...");
		}

		translate.setTranslator(translators[0]);
		translate.translate();
	} else {
		Zotero.ProgressWindow.changeHeadline("No Translators Found");
		Zotero.API.createItem({
				"items":[]
			},
			function(statusCode, response) {
			});
	}
});
var originalCallback;
translate.setHandler("select", function(obj, items, callback) {
	for(var i in items) {
		var title;
		if(items[i] && typeof(items[i]) == "object" && items[i].title !== undefined) {
			title = items[i].title;
		} else {
			title = items[i];
		}
		items[i].title = title;
	}

	//callback(items);
	if (Zotero.getDetails === true){
		originalCallback(items);
	} else {
		originalCallback = callback;
		var payload = {items:items};
		Zotero.API.createSelection(payload,function(){console.log("completed Zotero.API.createSelection")});
	}
});
var _itemProgress = {};
translate.setHandler("itemSaving", function(obj, item) {
	Zotero.API.notifyFullReference(item);
	/*if(!_itemProgress[item.id]) {
		_itemProgress[item.id] = new Zotero.ProgressWindow.ItemProgress(
			Zotero.ItemTypes.getImageSrc(item.itemType), item.title);
	}*/
});
translate.setHandler("itemDone", function(obj, dbItem, item) {
	var itemProgress = _itemProgress[item.id];
	if(!itemProgress) {
		itemProgress = _itemProgress[item.id] = new Zotero.ProgressWindow.ItemProgress(
			Zotero.ItemTypes.getImageSrc(item.itemType), item.title);
	}
	itemProgress.setProgress(100);
	haveItem = true;
	for(var i=0; i<item.attachments.length; i++) {
		var attachment = item.attachments[i];
		_itemProgress[attachment.id] = new Zotero.ProgressWindow.ItemProgress(
			Zotero.ItemTypes.getImageSrc(attachment.mimeType === "application/pdf"
				? "attachment-pdf" : "attachment-snapshot"), attachment.title, itemProgress);
	}
});
translate.setHandler("attachmentProgress", function(obj, attachment, progress) {
	var attachmentProgress = _itemProgress[attachment.id];
	if(!attachmentProgress) return;
	if(progress === false) {
		attachmentProgress.setError();
	} else {
		if(attachment.linkMode === "linked_url") {
			attachmentProgress.setIcon(Zotero.ItemTypes.getImageSrc("attachment-web-link"));
		}
		attachmentProgress.setProgress(progress);
	}
});
translate.setHandler("done", function(obj, returnValue) {
	if(returnValue && haveItem) {
		Zotero.ProgressWindow.startCloseTimer(2500);
	} else if(!cancelled) {
		new Zotero.ProgressWindow.ErrorMessage("translationError");
		Zotero.ProgressWindow.startCloseTimer(8000);
	}
	cleanup();
});

// Add message listener for translate, so we don't call until the iframe is loaded
Zotero.Messaging.addMessageListener("translate", function(data, event) {
	Zotero.ProgressWindow.changeHeadline("Looking for Translators...");
	if(Zotero.isIE) wgxpath.install(window.parent);
	if(event.origin.substr(0, 6) === "https:" && ZOTERO_CONFIG.BOOKMARKLET_URL.substr(0, 5) === "http:") {
		ZOTERO_CONFIG.BOOKMARKLET_URL = "https:"+ZOTERO_CONFIG.BOOKMARKLET_URL.substr(5);
	}
	translate.getTranslators();
});
Zotero.Messaging.addMessageListener("selectDone", function(returnItems) {
	Zotero.getDetails = true;
	Zotero.Translate.Sandbox.Web.selectItems(translate, returnItems);
});

// We use these for OAuth, so that we can load the OAuth pages in a child frame of the privileged
// iframe
var revealedFrame;
Zotero.Messaging.addMessageListener("revealZoteroIFrame", function() {
	if(revealedFrame) return;
	revealedFrame = new BookmarkletFrame(null, 400, 400);
});
Zotero.Messaging.addMessageListener("hideZoteroIFrame", function() {
	revealedFrame.remove();
});

Zotero.Messaging.addMessageListener("_getAttachment", function(args) {
	var itemSaver = new Zotero.Translate.ItemSaver(undefined, "ATTACHMENT_MODE_FILE", undefined, undefined, undefined, undefined);
	itemSaver._saveAttachmentsToServer(args.attachments, {automaticSnapshots: true, downloadAssociatedFiles: true}, itemSaver.notifyAttachmentProgress);
});

Zotero.Messaging.addMessageListener("cleanup", function() {
	Zotero.ProgressWindow.close();
	cleanup();
});

// For IE, load from http to avoid a warning
if(Zotero.isIE && window.parent.location.protocol === "http:") {
	ZOTERO_CONFIG.BOOKMARKLET_URL = ZOTERO_CONFIG.BOOKMARKLET_URL.replace("https", "http");
}

var zoteroIFrame;

/**
 * Load privileged iframe and begin translation
 */
function startTranslation() {
	Zotero.ProgressWindow.show();
	zoteroIFrame = document.createElement("iframe");
	zoteroIFrame.id = "zotero-privileged-iframe";
	var ie = Zotero.isIE ? "_ie" : "";
	var referrer = document.referrer ? document.referrer : window.parent.location.href;
	zoteroIFrame.src = ZOTERO_CONFIG.BOOKMARKLET_URL + "iframe" + ie + ".html" + "?referrer=" + referrer + "&pageTitle=" + window.parent.document.title + "&EXT_SERVICE_PROVIDER="+encodeURIComponent(window.EXT_SERVICE_PROVIDER) + "&PME_SERVICE_PROVIDER="+encodeURIComponent(window.PME_SERVICE_PROVIDER);
	zoteroIFrame.style.display = "none";
	document.body.appendChild(zoteroIFrame);
	document.body.style.overflow = "hidden";

}

/**
 * Remove the frames
 */
function cleanup() {
	zoteroIFrame.parentNode.removeChild(zoteroIFrame);
	window.frameElement.parentNode.removeChild(window.frameElement);
}


if(document.readyState && document.readyState !== "interactive" && document.readyState !== "complete") {
	window.onload = startTranslation;
} else {
	startTranslation();
}

/******** END inject_base.js ********/
