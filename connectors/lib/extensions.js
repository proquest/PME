var fs = require('fs');
var path = require('path');
var stack = require('./stack');
var c = require('./common');
var ChromeExtension = require("crx")
var _defaultVersion,
    _builderConfigFilesLocation,
    _connectorsCommonFilesLocation,
    _zoteroFilesLocation,
    _zoteroSrcFilesLocation,
    _buildLocation,
    _pmeLocation;

function buildExtension(root, browser, config, common) {
  common.doPrepWork(root, function() {
    common.stackInst.push();
    fs.mkdir(root, function() {
      common.copyCode(_pmeLocation, root, ["pme_ui.js"]);
      common.copyCode(_connectorsCommonFilesLocation, root, ["!", "progressWindow.js"], [
        "inject",
        //"preferences",
        "itemSelector"
      ], common.versionFix());
      common.copyCode(_builderConfigFilesLocation, root, [config], null, {
        fileName: [config],
        pattern: /(?:(\s+"version"\s*:\s*").+(",))|(?:((?:(?:CFBundleShortVersionString)|CFBundleVersion)<\/key>\n.*<string>).+(<\/string>))/g,
        replacement: function() {
          var $1 = RegExp.$1, $2 = RegExp.$2, $3 = RegExp.$3, $4 = RegExp.$4;
          if($1 && $2)
            return $1 + _defaultVersion + $2;
          if($3 && $4)
            return $3 + _defaultVersion + $4;
        }
      });
      common.copyCode(path.join(_zoteroSrcFilesLocation, browser), root, ["!", config, "global.html"]);
      if(browser == 'safari') {
        common.copyCode(_builderConfigFilesLocation, root, ["global.html"]);
      }
      var rootZotero = path.join(root, "zotero");
      common.stackInst.push();
      fs.mkdir(rootZotero, function() {
        common.appendCode([
          path.join(_zoteroFilesLocation, 'chrome/content/zotero/xpcom/utilities_translate.js'),
          path.join(_pmeLocation, 'utilities_translate.js')
        ], path.join(rootZotero, 'utilities_translate.js'), null, false);
        common.copyCode(path.join(_zoteroFilesLocation, 'chrome/content/zotero/xpcom'),
          rootZotero, [
            "utilities.js",
            "date.js",
            "debug.js",
            "openurl.js"
          ], [
            "connector",
            "rdf",
            "xregexp"
          ]);
        var translation = path.join(rootZotero, "translation");
        common.stackInst.push();
        fs.mkdir(translation, function() {
          common.appendCode([
            path.join(_zoteroFilesLocation, 'chrome/content/zotero/xpcom/translation/translate.js'),
            path.join(_pmeLocation, 'translate.js')
          ], path.join(translation, 'translate.js'), null, false);
          common.copyCode(path.join(_zoteroFilesLocation, 'chrome/content/zotero/xpcom/translation'),
            translation, ["tlds.js"]);
          common.stackInst.pop();
        });
        common.stackInst.pop();
      });
      common.copyImages(root);
      common.stackInst.pop();
    });
  });
}

function setConfig(common) {
  _defaultVersion = common.config.defaultVersion;
  _builderConfigFilesLocation = common.config.builderConfigFilesLocation;
  _connectorsCommonFilesLocation = common.config.connectorsCommonFilesLocation;
  _zoteroFilesLocation = common.config.zoteroFilesLocation;
  _zoteroSrcFilesLocation = common.config.zoteroSrcFilesLocation;
  _buildLocation = common.config.buildLocation;
  _pmeLocation = common.config.pmeFilesLocation;
}

var extensions = function (debug) {
  this.buildChrome = function() {
    console.log("Starting Chrome");
    var common = new c(debug, new stack(function() {
      if(!common.debug) {
        console.log('creating .crx file');
        var crx = new ChromeExtension({
          privateKey: fs.readFileSync(path.join(_buildLocation, "chrome.pem")),
          rootDirectory: root
        })

        crx.load(function(err) {
          if(err) throw err
          this.pack(function(err, data) {
            if(err) throw err

            fs.writeFile(extFile, data, function() {
              common.deleteDirectory(root, function() {
                console.log("completed Chrome")
              })
            })
            this.destroy()
          })
        })
      }
      else
        console.log("Chrome complete. No extension file.");
    }))
    setConfig(common);
    var extFile = path.join(_buildLocation, "chromeConnector.crx");
    fs.unlink(extFile, function() {
    });
    var root = path.join(_buildLocation, "chrome");
    buildExtension(root, "chrome", "manifest.json", common);
  }
  this.buildSafari = function() {
    console.log('Starting Safari build');
    var common = new c(debug, new stack(function() {
      //build Safari package
      console.log("complete Safari");
    }))
    setConfig(common);
    var root = path.join(_buildLocation, "safari.safariextension");
    buildExtension(root, "safari", "Info.plist", common);
  }
}
module.exports = extensions;