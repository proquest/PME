Zotero.Translate.Base.prototype["_translateTranslatorLoadedOld"] = Zotero.Translate.Base.prototype._translateTranslatorLoaded;

Zotero.Translate.Base.prototype["_translateTranslatorLoaded"] = function () {
    try {

        var fStream = Components.classes["@mozilla.org/network/file-input-stream;1"].
            createInstance(Components.interfaces.nsIFileInputStream);
        var cStream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
            createInstance(Components.interfaces.nsIConverterInputStream);
        var ui_file = Zotero.getTranslatorsDirectory().QueryInterface(Components.interfaces.nsILocalFile);
        ui_file.append("pme_ui.js");
        fStream.init(ui_file, -1, -1, 0);
        cStream.init(fStream, "UTF-8", 100000,
            Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

        var str = {};
        cStream.readString(100000, str);
        this._originWeb = true;
        this._sandboxManager.eval(str.value, ["entry", "selection", "single"], (this._currentTranslator.file ? this._currentTranslator.file.path : this._currentTranslator.label));
        Zotero.debug(this._sandboxManager.sandbox["entry"].apply(null, this._getParameters()));
        this._translateTranslatorLoadedOld();
        var _this = this;
        this.setHandler("error", function () {
            var params = _this._getParameters();
            params.push({});
            params.push(true)
            Zotero.debug(_this._sandboxManager.sandbox["single"].apply(null, params));
        });
    }
    catch (e) {
        Zotero.debug("Error _translateTranslatorLoaded: " + e.message);
    }
}

Zotero.Translate.Base.prototype["_saveItems"] = function (items) {
    var _this = this;

    function transferObject(obj) {
        return Zotero.isFx ? _this._sandboxManager.sandbox.JSON.parse(JSON.stringify(obj)) : obj;
    }

    Zotero.debug("~~~~translate._saveItems method overide");
    try {
        if (Object.prototype.toString.call(items) === "[object Array]")
            items = items[0];
        var params = this._getParameters().concat([transferObject(items), this.translator[0].translatorID == "8cb314cf-2628-40cd-9713-4e773b8ed5d4"]);
        Zotero.debug(this._sandboxManager.sandbox["single"].apply(null, params));
    }
    catch (e) {
        Zotero.debug("Error _saveItems: " + e.message);
    }
}

Zotero.Translate.Sandbox.Web.selectItems = function (translate, items, callback) {
    function transferObject(obj) {
        return Zotero.isFx ? translate._sandboxManager.sandbox.JSON.parse(JSON.stringify(obj)) : obj;
    }

    if (Zotero.Utilities.isEmpty(items))
        throw new Error("Translator called select items with no items");

    if (Object.prototype.toString.call(items) === "[object Array]") {
        translate._debug("WARNING: Zotero.selectItems should be called with an object, not an array");
        var itemsObj = {};
        for (var i in items) itemsObj[i] = items[i];
        items = transferObject(itemsObj);
    }
    translate._aborted = true;
    var params = translate._getParameters().concat([items, function (selectedItems) {
        callback(transferObject(selectedItems));
    }]);
    Zotero.debug(translate._sandboxManager.sandbox["selection"].apply(null, params));
    //some translators will not have a callback.
    //these will fail
}

Zotero.Translate.Sandbox.Web._itemDone = function (translate, item) {
    translate._aborted = false;
    Zotero.Translate.Sandbox.Base._itemDone(translate, item);
}

Zotero.Translate.Web.prototype.Sandbox = Zotero.Translate.Sandbox._inheritFromBase(Zotero.Translate.Sandbox.Web);