



/******** BEGIN iframe_base.js ********/
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

Zotero.API = new function() {
	/**
	 * Performs authorization
	 * @param {Function} callback Callback to execute when auth is complete. The first argument
	 *                            passed to the callback indicates whether authorization succeeded
	 *                            successfully. The second will be either a string error message
	 *                            (if authorization failed) or the username (if authorization
	 *                            succeeded)
	 */
	this.authorize = function(callback) {
		var iframe = document.createElement("iframe");
		iframe.src = ZOTERO_CONFIG.LOGIN_URL;
		iframe.style.borderStyle = "none";
		iframe.style.position = "absolute";
		iframe.style.top = "0px";
		iframe.style.left = "0px";
		iframe.style.width = "100%";
		iframe.style.height = "100%";

		iframe.onload = function() {
			var win = iframe.contentWindow;
			if(win.location.href === ZOTERO_CONFIG.AUTH_COMPLETE_URL) {
				// Authorization should be done
				var c = _getCredentials(win.document ? win.document : document),
					userID = c[0], sessionToken = c[1];
				if(!userID || !sessionToken) {
					if(!userID) {
						var str = "User ID";
					} else if(!sessionToken) {
						var str = "Session token";
					} else {
						var str = "User ID and session token";
					}
					str += " not available";
					callback(false, str);
					return;
				}

				Zotero.Messaging.sendMessage("hideZoteroIFrame", null);
				document.body.removeChild(iframe);
				callback(true);
			}
		};

		document.body.appendChild(iframe);
		Zotero.Messaging.sendMessage("revealZoteroIFrame", null);
	};
	/*this.selectDone = function(items){
		Zotero.Messaging.sendMessage("selectDone",items);
	}*/
	/**
	 * Creates a new item
	 * @param {Object} payload Item(s) to create, in the object format expected by the server.
	 * @param {String|null} itemKey Parent item key, or null if a top-level item.
	 * @param {Function} callback Callback to be executed upon request completion. Passed true if
	 *     succeeded, or false if failed, along with the response body.
	 * @param {Boolean} [askForAuth] If askForAuth === false, don't ask for authorization if not
	 *     already authorized.
	 */
	this.createItem = function(payload) {
		if (this.uiAlreadyCreated) return;	// occasionally createItem and createSelection will both be called, only call the first one.
		this.uiAlreadyCreated = true;
		var form = document.createElement("form");
		var textarea = document.createElement("textarea");
		var returnURL = document.createElement("input");
		var iframe = document.createElement("iframe");
		var referrer = getParameterByName("referrer");
		payload.referrer = referrer;
		payload.pageTitle = getParameterByName("pageTitle");
		form.action = ZOTERO_CONFIG.API_URL+"pme/list/";
		form.target = "API_URL";
		form.method = "POST";
		form.style.display = "none";
		form.acceptCharset = "UTF-8";
		textarea.style.display = "none";
		textarea.name = "payload";
		textarea.value = JSON.stringify(payload);
		form.appendChild(textarea);
		returnURL.name = "returnUrl";
		returnURL.value = encodeURIComponent(referrer);
		form.appendChild(returnURL);
		iframe.name = form.target;
		iframe.id = "RefWorks";
		iframe.style.borderStyle = "none";
		iframe.style.position = "absolute";
		iframe.style.top = "0px";
		iframe.style.left = "0px";
		iframe.style.width = "100%";
		iframe.style.height = "100%";
		iframe.setAttribute('allowtransparency', 'true');
		iframe.style.backgroundImage = "url(" + ZOTERO_CONFIG.API_URL + "public/img/loading-large.gif)";
		iframe.style.backgroundPosition = "center";
		iframe.style.backgroundRepeat = "no-repeat";

		document.body.appendChild(form);
		document.body.appendChild(iframe);
		form.submit();
		Zotero.Messaging.sendMessage("revealZoteroIFrame", null);
	};
	/**
	 * Creates a new selection
	 * @param {Object} payload Item(s) to create, in the object format expected by the server.
	 * @param {String|null} itemKey Parent item key, or null if a top-level item.
	 * @param {Function} callback Callback to be executed upon request completion. Passed true if
	 *     succeeded, or false if failed, along with the response body.
	 * @param {Boolean} [askForAuth] If askForAuth === false, don't ask for authorization if not
	 *     already authorized.
	 */
	this.createSelection = function(payload) {
		if (this.uiAlreadyCreated) return; // occasionally createItem and createSelection will both be called, only call the first one.
		this.uiAlreadyCreated = true;
		function getParameterByName(name) {
			name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
			var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
				results = regex.exec(window.location.search);
			return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
		}

		var form = document.createElement("form");
		var textarea = document.createElement("textarea");
		var returnURL = document.createElement("input");
		var iframe = document.createElement("iframe");
		var referrer = getParameterByName("referrer");
		payload.referrer = referrer;
		payload.pageTitle = getParameterByName("pageTitle");
		form.action = ZOTERO_CONFIG.API_URL+"pme/list/";
		form.target = "API_URL";
		form.method = "POST";
		form.style.display = "none";
		form.acceptCharset = "UTF-8";
		textarea.style.display = "none";
		textarea.name = "payload";
		textarea.value = JSON.stringify(payload);
		form.appendChild(textarea);
		returnURL.name = "returnUrl";
		returnURL.value = encodeURIComponent(referrer);
		form.appendChild(returnURL);
		iframe.name = form.target;
		iframe.id = "RefWorks";
		iframe.style.borderStyle = "none";
		iframe.style.position = "absolute";
		iframe.style.top = "0px";
		iframe.style.left = "0px";
		iframe.style.width = "100%";
		iframe.style.height = "100%";
		iframe.setAttribute('allowtransparency', 'true');
		iframe.style.backgroundImage = "url(" + ZOTERO_CONFIG.API_URL + "public/img/loading-large.gif)";
		iframe.style.backgroundPosition = "center";
		iframe.style.backgroundRepeat = "no-repeat";

		document.body.appendChild(form);
		document.body.appendChild(iframe);
		form.submit();
		Zotero.Messaging.sendMessage("revealZoteroIFrame", null);
	};
	/**
	 * Uploads an attachment to the Zotero server
	 * @param {Object} attachment An attachment object. This object must have the following keys<br>
	 *     id - a unique identifier for the attachment used to identifiy it in subsequent progress
	 *          messages<br>
	 *     data - the attachment contents, as a typed array<br>
	 *     filename - a filename for the attachment<br>
	 *     key - the attachment item key<br>
	 *     md5 - the MD5 hash of the attachment contents<br>
	 *     mimeType - the attachment MIME type
	 */
	this.uploadAttachment = function(attachment) {
		Zotero.Messaging.sendMessageToRefWorks("uploadAttachment", attachment);
	};

	this.notifyAttachmentProgress = function(args) {
		Zotero.Messaging.sendMessageToRefWorks("attachmentProgress", args);
	};

	this.notifyFullReference = function(item) {
		Zotero.Messaging.sendMessageToRefWorks("fullReference", item);
	};

	this.notifyFullReferenceFail = function(item) {
		Zotero.Messaging.sendMessageToRefWorks("fullReferenceFail", item);
	};

}

Zotero.isBookmarklet = true;
Zotero.Debug.init();

// Add message listeners to save attachments
Zotero.Messaging.addMessageListener("_getAttachment", function(args){
	Zotero.Messaging.sendMessage("_getAttachment", args);
});

// Add message listeners to get metadata
Zotero.Messaging.addMessageListener("getMetaData", function(items){
	Zotero.Messaging.sendMessage("selectDone", items);
});

Zotero.Messaging.addMessageListener("cleanup", function(){
	Zotero.Messaging.sendMessage("cleanup", null);
});



Zotero.Messaging.init();

if(Zotero.isIE) {
	Zotero.Connector.checkIsOnline(function(status) {
		if(!status && window.location.protocol === "http:") {
			Zotero.debug("Switching to https");
			window.location.replace("https:"+window.location.toString().substr(5));
		} else {
			Zotero.debug("Sending translate message");
			Zotero.Messaging.sendMessage("translate", null);
		}
	});
} else {
	Zotero.Messaging.sendMessage("translate", null);
}

/******** END iframe_base.js ********/
