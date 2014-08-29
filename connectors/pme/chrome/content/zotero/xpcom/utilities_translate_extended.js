
/* Zotero.Utilities.Translate additions */
Zotero.Utilities.Translate.prototype.promise = function(method,url,options,callback) {
    var xmlhttp = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
    xmlhttp.mozBackgroundRequest = true;
    xmlhttp.open(method, url, true);

    // Send cookie even if "Allow third-party cookies" is disabled (>=Fx3.6 only)
    var channel = xmlhttp.channel;
    if (channel instanceof Components.interfaces.nsIHttpChannelInternal) {
        channel.forceAllowThirdPartyCookie = true;
    }
    if (options && options.responseType) {
        xmlhttp.responseType = options.responseType;
    }
    var headers = (options && options.headers) || {};
    if (options && options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/pdf";
    }
    for (var header in headers) {
        xmlhttp.setRequestHeader(header, headers[header]);
    }

    xmlhttp.onloadend = function () {
        if (xmlhttp.status >= 200 && xmlhttp.status < 300) {
            if (options && options.debug) {
                Zotero.debug("HTTP " + method + " " + dispURL
                    + " succeeded with " + xmlhttp.status);
                Zotero.debug(xmlhttp.responseText);
            }
            var blob = new Blob([http.response], {type: contentType});
            callback(blob);
        } else {
            var msg = "HTTP " + method + " " + dispURL + " failed: "
                + "Unexpected status code " + xmlhttp.status;
            Zotero.debug(msg, 1);
            if (options && options.debug) {
                Zotero.debug(xmlhttp.responseText);
            }
            callback(xmlhttp);
        }
    };

    xmlhttp.send((options && options.body) || null);
}

Zotero.Utilities.Translate.prototype.setTimeout = function(f,d){setTimeout(f,d);};

/* Zotero.Translate.Sandbox overrides*/
Zotero.Translate.Sandbox.Base._itemDone
/*
 var params = translate._getParameters();
 params.push(item);
 params.push(translate.translator[0].translatorID == "8cb314cf-2628-40cd-9713-4e773b8ed5d4")
 Zotero.debug(translate._sandboxManager.sandbox["single"].apply(null, params));

 move into "translate._runHandler("itemSaving", item);"
 "translate._saveItems" noop

*/

Zotero.Translate.Sandbox.Web.selectItems = function(){
    //new function, just pme
}

Zotero.Translate.Sandbox.Web._itemDone = function (translate, item) {
    Zotero.Translate.Sandbox.Base._itemDone(translate, item);
    //new function, just pme?
}

