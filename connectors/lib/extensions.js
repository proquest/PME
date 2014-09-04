var fs = require('fs');
var path = require('path');
var common = require('./common');
var ChromeExtension = require("crx")
var _defaultVersion = common.config.defaultVersion;
var _builderConfigFilesLocation = common.config.builderConfigFilesLocation;
var _connectorsCommonFilesLocation = common.config.connectorsCommonFilesLocation;
var _zoteroFilesLocation = common.config.zoteroFilesLocation;
var _zoteroSrcFilesLocation = common.config.zoteroSrcFilesLocation;
var _buildLocation = common.config.buildLocation;

function buildExtension(root, browser, config, oncomplete) {
  common.stackInst = new common.stack(oncomplete);
  common.doPrepWork(root, function() {
    common.stackInst.push();
    fs.mkdir(root, function() {
      common.copyCode(_connectorsCommonFilesLocation, root, [], [
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
        common.copyCode(path.join(_zoteroFilesLocation, 'chrome/content/zotero/xpcom'),
          rootZotero, [
            "utilities.js",
            "utilities_translate.js",
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
          common.copyCode(path.join(_zoteroFilesLocation, 'chrome/content/zotero/xpcom/translation'),
            translation, [
              "tlds.js",
              "translate.js"
            ], null, common.translateFix());
          common.stackInst.pop();
        });
        common.stackInst.pop();
      });
      common.copyImages(root);
      common.stackInst.pop();
    });
  });
}

module.exports = new function() {
  this.buildChrome = function() {
    console.log("Starting Chrome");
    var extFile = "chromeConnector.crx";
    fs.unlink(path.join(_buildLocation, extFile), function() {
    });
    var root = path.join(_buildLocation, "chrome");
    //common.complete()
    buildExtension(root, "chrome", "manifest.json", function() {
      if(!common.debug) {
        //build Chrome package
        var crx = new ChromeExtension({
          privateKey: fs.readFileSync(path.join(_buildLocation, "chrome.pem")),
          rootDirectory: root
        })

        crx.load(function(err) {
          if(err) throw err
          this.pack(function(err, data) {
            if(err) throw err

            fs.writeFile(path.join(_buildLocation, extFile), data, function() {
              common.deleteFilesAndFolders(root, function() {
                console.log("completed Chrome")
              })
            })
            this.destroy()
          })
        })
      }
      else
        console.log("Chrome complete");
    });
  }
  this.buildSafari = function() {
    console.log('Starting Safari build');
    var root = path.join(_buildLocation, "safari.safariextension");
    buildExtension(root, "safari", "Info.plist", function() {
      //build Safari package
      console.log("complete Safari");
    })
  }
}