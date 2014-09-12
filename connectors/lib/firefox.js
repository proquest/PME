var fs = require('fs');
var path = require('path');
var stack = require('./stack');
var c = require('./common'),
    _zoteroFilesLocation,
    _pmeLocation,
    _buildLocation;

function setConfig(common) {
  _zoteroFilesLocation = common.config.zoteroFilesLocation;
  _pmeLocation = common.config.pmeFilesLocation;
  _buildLocation = common.config.buildLocation;
}

module.exports = function(debug) {
  this.buildFirefox = function() {
    console.log("Starting Firefox");
    var common = new c(debug,  new stack(function() {
      common.stackInst = new stack(function() {
        function addFolderToZip(cnt) {
          var dir = directories[cnt];
          zip.zipFolder(path.join(root, dir), function() {
            zip.writeToFile(extFile + "zip", function() {
              if(++cnt < directories.length)
                addFolderToZip(cnt);
              else {
                common.deleteDirectory(root, function() {
                  fs.rename(extFile + "zip", extFile + "xpi", function() {
                    console.log("Firefox complete");
                  });
                });
              }
            });
          });
        }
        if(!common.debug) {
          console.log('creating .xpi file')
          var EasyZip = require('./easy-zip').EasyZip;
          var zip = new EasyZip();
          var directories = [];
          var stk = new stack(function(){addFolderToZip(0)},'xpi');
          stk.push();
          fs.readdir(root, function(err, objects) {
            objects.forEach(function(obj) {
              var objPath = path.join(root, obj);
              stk.push();
              fs.stat(objPath, function(err, st) {
                if(st.isDirectory()) {
                  directories.push(obj);
                }
                else {
                  zip.addFile(obj, objPath, function() {
                    zip.writeToFile(extFile + "zip");
                  })
                }
                stk.pop();
              });
            });
            stk.pop();
          });
        }
        else
          console.log("Firefox complete. No extension file")
      });
      common.copyCode(_pmeLocation, path.join(root, "chrome/content/zotero/xpcom"), ["progressWindow.js"]);
      common.copyCode(_pmeLocation, path.join(root, "chrome/content/zotero"), ["overlay.xul"]);
      common.appendCode([
        path.join(_pmeLocation, 'translate.js')
      ], path.join(root, 'chrome/content/zotero/xpcom/translation/translate.js'), null, false);
      common.appendCode([
        path.join(_pmeLocation, 'utilities_translate.js')
      ], path.join(root, 'chrome/content/zotero/xpcom/utilities_translate.js'), null, false);
    }));

    setConfig(common);
    var root = path.join(_buildLocation, "firefox");
    var extFile = path.join(_buildLocation, "firefoxConnector.");
    fs.unlink(extFile + "xpi", function() {
    });

    common.doPrepWork(root, function() {
      common.stackInst.push();
      fs.mkdir(root, function() {
        common.copyCode(_zoteroFilesLocation, root);
        common.stackInst.pop();
      });
    });
  }
}