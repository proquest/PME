Zotero.Utilities.Translate.prototype.setTimeout = function (f, d) {
    setTimeout(f, d);
};

Zotero.Utilities.Translate.prototype.promise = function (method, url, options, callback) {
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
                PME.debug("HTTP " + method + " " + url
                    + " succeeded with " + xmlhttp.status);
                PME.debug(xmlhttp.responseText);
            }
            var blob = new Blob([xmlhttp.response], {type: headers["Content-Type"]});
            callback(blob);
        } else {
            var msg = "HTTP " + method + " " + url + " failed: "
                + "Unexpected status code " + xmlhttp.status;
            PME.debug(msg, 1);
            if (options && options.debug) {
                PME.debug(xmlhttp.responseText);
            }
            //callback(xmlhttp);
            callback();
        }
    };

    xmlhttp.send((options && options.body) || null);
}

PME.Utilities.Translate.prototype.__exposedProps__["setTimeout"] = "r";
PME.Utilities.Translate.prototype.__exposedProps__["promise"] = "r";