var fs = require('fs');
var path = require('path');
var uglifyjs = require('uglify-js');
var c = require('./common'),
    common,
    _zoteroFilesLocation,
    _pmeLocation,
    _buildLocation;

function setConfig() {
  _zoteroFilesLocation = common.config.zoteroFilesLocation;
  _pmeLocation = common.config.pmeFilesLocation;
  _buildLocation = common.config.buildLocation;
}

module.exports = function(debug) {
  this.buildFirefox = function() {
    console.log("Starting Firefox");
    common = new c(debug, function() {
      common = new c(debug, function() {
        if(!common.debug) {
          //compress into .xpi
        }
        console.log("complete firefox")
      });
      // var overWrite = ['chrome/inject/progressWindow.js', 'chrome/content/zotero/overlay.xul', 'translators/Empty.js', 'translators/pme_ui.js'];
      // var append = ['chrome/zotero/utilities_translate.js', 'chrome/zotero/translation/translate.js'];
      common.copyCode(_pmeLocation, path.join(root, "chrome/content/zotero/xpcom"), ["progressWindow.js"]);
      common.copyCode(_pmeLocation, path.join(root, "chrome/content/zotero"), ["overlay.xul"]);
      common.appendCode([
        path.join(_zoteroFilesLocation, 'chrome/content/zotero/xpcom/translation/translate.js'),
        path.join(_pmeLocation, 'translate.js')
      ], path.join(root, 'chrome/content/zotero/xpcom/translation/translate.js'), null, false);
      common.appendCode([
        path.join(_zoteroFilesLocation, 'chrome/content/zotero/xpcom/utilities_translate.js'),
        path.join(_pmeLocation, 'utilities_translate.js')
      ], path.join(root, 'chrome/content/zotero/xpcom/utilities_translate.js'), null, false);
    });

    setConfig();
    var root = path.join(_buildLocation, "firefox");
    var extFile = "firefoxConnector.xpi";
    fs.unlink(path.join(_buildLocation, extFile), function() {
    });

    common.doPrepWork(root, function() {
      common.stackInst.push();
      fs.mkdir(root, function() {
        common.copyCode(_zoteroFilesLocation, root, ["!", "utilities_translate.js", "translate.js", "progressWindow.js"]);
        common.stackInst.pop();
      });
    });
  }
}