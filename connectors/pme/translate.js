PME.Translate.Base.prototype["_translateTranslatorLoadedOld"] = PME.Translate.Base.prototype._translateTranslatorLoaded;
PME.Translate.Base.prototype["completeOld"] = PME.Translate.Base.prototype.complete;

PME.Translate.Base.prototype["_translateTranslatorLoaded"] = function () {
	try {
		var _this = this,
			xmlhttp = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
		xmlhttp.mozBackgroundRequest = true;
		xmlhttp.open('GET', "chrome://pme/content/pme_ui.js", true);
		xmlhttp.onreadystatechange = function () {
			if (xmlhttp.readyState == 4) {
				_this._sandboxManager.eval(xmlhttp.responseText, ["entry", "selection", "single", "saveItems"], (_this._currentTranslator.file ? _this._currentTranslator.file.path : _this._currentTranslator.label));
				PME.debug(_this._sandboxManager.sandbox["entry"].apply(null, _this._getParameters(true)));
				_this._translateTranslatorLoadedOld();
				_this.setHandler("error", function () {
					var params = _this._getParameters(true);
					params.push({});
					params.push(true)
					PME.debug(_this._sandboxManager.sandbox["single"].apply(null, params));
				});
			}
		};
		xmlhttp.send(null);
	}
	catch (e) {
		PME.debug("Error _translateTranslatorLoaded: " + e.message);
	}
}

PME.Translate.Base.prototype["complete"] = function (returnValue, error) {
	try {
		if(error) {
			PME.debug("Translation using " +
				(this.translator && this.translator[0] && this.translator[0].label ? this.translator[0].label : "no translator") +
				" failed: \n" + this._generateErrorString(error), 2);

			PME.debug(this._sandboxManager.sandbox["single"].apply(null, this._getParameters(true).concat([undefined, true])))
		}
		else
			this.completeOld(returnValue, error);
	}
	catch(e) {
		PME.debug("Error complete: " + e.message);
	}
}

PME.Translate.Base.prototype["_saveItems"] = function (items) {
	var _this = this;

	function transferObject(obj) {
		if(PME.isFx) {
			if(Object.prototype.toString.call(obj) === "[object Array]") {
				var itemsObj = {};
				for(var i = 0; i < obj.length; i++) {
					itemsObj['item_' + i] = obj[i];

					if(obj[i].attachments && Array.isArray(obj[i].attachments)) {
						var attachments = obj[i].attachments.filter(function(att) {
							if(att.document)
								return false;
							return true;
						});
						itemsObj['item_' + i].attachments = attachments;
					}
				}
				obj = itemsObj;
			}

			return _this._sandboxManager.sandbox.JSON.wrappedJSObject ?
				_this._sandboxManager.sandbox.JSON.wrappedJSObject.parse(JSON.stringify(obj)) :
				_this._sandboxManager.sandbox.JSON.parse(JSON.stringify(obj));
		}
		return obj;
	}

	try {
//		if (Object.prototype.toString.call(items) === "[object Array]")
//			items = items[0];

		if (!this._parentTranslator) {
			var params = this._getParameters(true).concat([transferObject(items), this.translator[0].translatorID == "8cb314cf-2628-40cd-9713-4e773b8ed5d4"]);
			PME.debug(this._sandboxManager.sandbox["saveItems"].apply(null, params));
		}
	}
	catch (e) {
		PME.debug("Error _saveItems: " + e.message);
	}
}

PME.Translate.Sandbox.Web.selectItems = function (translate, items, callback) {
	function transferObject(obj) {
		if (PME.isFx) {
			if (obj.attachments && Array.isArray(obj.attachments)) {
				var attachments = obj.attachments.filter(function (att) {
					if (att.document)
						return false;
					return true;
				});
				obj.attachments = attachments;
			}
			return translate._sandboxManager.sandbox.JSON.wrappedJSObject ?
				translate._sandboxManager.sandbox.JSON.wrappedJSObject.parse(JSON.stringify(obj)) :
				translate._sandboxManager.sandbox.JSON.parse(JSON.stringify(obj));
		}
		return obj;
	}

	if(PME.Utilities.isEmpty(items))
		throw new Error("Translator called select items with no items");

	if(Object.prototype.toString.call(items) === "[object Array]") {
		translate._debug("WARNING: PME.selectItems should be called with an object, not an array");
		var itemsObj = {};
		for(var i in items) itemsObj[i] = items[i];
		items = transferObject(itemsObj);
	}
	translate._aborted = true;
	if(!translate._parentTranslator) {
		var params = translate._getParameters(true).concat([items, function (selectedItems) {
			callback(transferObject(selectedItems));
		}]);
		PME.debug(translate._sandboxManager.sandbox["selection"].apply(null, params));
	}
	//some translators will not have a callback.
	//these will fail
}

PME.Translate.Sandbox.Web._itemDone = function (translate, item) {
	translate._aborted = false;
	PME.Translate.Sandbox.Base._itemDone(translate, item);
}

PME.Translate.Web.prototype.Sandbox = PME.Translate.Sandbox._inheritFromBase(PME.Translate.Sandbox.Web);

PME.Translate.Search.prototype._getParameters = function (getDocument) {
	if (getDocument)
		return [this._parentTranslator.document, this._parentTranslator.location];
	if (PME.isFx) {
		return this._sandboxManager._copyObject ? [this._sandboxManager._copyObject(this.search)] : [this._sandboxManager.copyObject(this.search)];
	}
	return [this.search];
}
