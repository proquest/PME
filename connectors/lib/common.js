var fs = require('graceful-fs');
var path = require('path');
var config = require('./config');

var _defaultVersion = config.defaultVersion;
var _builderConfigFilesLocation = config.builderConfigFilesLocation;
var _zoteroSrcFilesLocation = config.zoteroSrcFilesLocation;
//var _buildLocation = config.buildLocation;
//var _UIConfigURL = config.UIConfigURL;

var commonObj = function(debug, stack) {
  var _this = this;

  this.config = config;
  this.debug = debug;
  this.stackInst = stack;

  if(this.debug) {
    this.config.buildID = '(new Date()).valueOf()';
  }

  this.doPrepWork = function(location, callback) {
    this.deleteDirectory(location, callback);
  }
  this.copyCode = function(fromDir, toDir, files, directories, adjustments) {
    if(arguments.length == 3 && !Array.isArray(arguments[2]))
      adjustments = arguments[2];
    if(files === undefined)
      files = [];
    if(directories === undefined)
      directories = [];
    _this.stackInst.push();
    fs.readdir(fromDir, function(err, objects) {
      objects.every(function(obj) {
        var fromPath = path.join(fromDir, obj);
        var toPath = path.join(toDir, obj);
        _this.stackInst.push();
        fs.stat(fromPath, function(err, st) {
          if(st.isDirectory()) {
            if(obj.indexOf(".") == 0 || directories === null ||
              (directories.length > 0 &&
                (directories[0] != "!" && directories.indexOf(obj) == -1) ||
                (directories[0] == "!" && directories.indexOf(obj) > -1)
              )) {
              _this.stackInst.pop()
              return false;
            }
            var newDir = toPath;
            _this.stackInst.push();
            fs.mkdir(newDir, function() {
              _this.copyCode(fromPath, newDir, adjustments);
              _this.stackInst.pop();
            });
          }
          else {
            if(obj.indexOf(".") == 0 ||
              (files.length > 0 && (
                (files[0] == "!" && files.indexOf(obj) > -1) ||
                (files[0] != "!" && files.indexOf(obj) == -1 ))
                )) {
              _this.stackInst.pop()
              return false;
            }
            else
              _this.copyFile(fromPath, toPath, adjustments);
          }
          _this.stackInst.pop();
        });
        return true;
      });
      _this.stackInst.pop();
    });
  }
  this.appendCode = function(fromFiles, toFile, adjustments, iefy) {
    fromFiles.forEach(function(file) {
      _this.appendFromFileSync(file, toFile, adjustments);
    });

    if(iefy === undefined || iefy)
      _this.explorerify(toFile);
  }
  this.appendFromFileSync = function(fromFile, toFile, adjustments) {
//synchronous, because order matters
    var data = fs.readFileSync(fromFile)
    var s = data.toString();
    if(adjustments && adjustments.fileName.indexOf(path.basename(fromFile)) > -1) {
      s = s.replace(adjustments.pattern, adjustments.replacement);
    }
    fs.appendFileSync(toFile,
        "/************** BEGIN " + path.basename(fromFile) + " **************/\n" +
        s +
        "\n/************** END " + path.basename(fromFile) + " **************/\n"
    );
  }
  this.copyFile = function(fromFile, toFile, adjustments, callback) {
    _this.stackInst.push();
    fs.readFile(fromFile, function(err, data) {
      if(adjustments && (adjustments.fileName == 'all' || adjustments.fileName.indexOf(path.basename(fromFile)) > -1))
        data = data.toString().replace(adjustments.pattern, adjustments.replacement);
      _this.stackInst.push();
      fs.writeFile(toFile, data, function() {
        if(callback) {
          callback(toFile);
        }
        _this.stackInst.pop();
      });
      _this.stackInst.pop();
    })
  }
  this.copyImages = function(inDir) {
    var images = path.join(inDir, "images");
    _this.stackInst.push();
    fs.mkdir(images, function() {
      _this.copyCode(_builderConfigFilesLocation, images, [
        "flow16.png",
        "flow48.png",
        "flow128.png",
        "treesource-collection.png"
      ], null);
      if(inDir.indexOf("safari") > -1) {
        _this.copyCode(_builderConfigFilesLocation, inDir, ["Icon.png"], null);
      }
      _this.stackInst.pop();
    });
  }
  this.versionFix = function() {
    return {
      fileName: ["zotero.js"],
      pattern: /(\s+this.version\s*=\s*").+(";)/,
      replacement: '$1' + _defaultVersion + '$2'
    }
  }
  this.explorerify = function(fileName) {
    /*
     replacing
     const -> var
     a.indexOf(b) -> indexOf(a,b)

     TEST CASES:
     -----------
     25. if(('' + val).indexOf('e') >= 0) dt = $rdf.Symbol.prototype.XSDfloat;
     24. && ["journalArticle", "bookSection", "conferencePaper"].indexOf(item.itemType) !== -1) {
     23. "if("+createArrays+".indexOf(key) !== -1) {"+
     22. line2.substr(line2.indexOf("@"));
     21. && (_this.document.defaultView.toString().indexOf("Window") !== -1
     20.	|| _this.document.defaultView.toString().indexOf("XrayWrapper") !== -1)) {
     18,19. const handlerIndex = _this._handlers[type].indexOf(handler);
     17. if(el['nodeName'].indexOf(":") >= 0)
     15,16. const splice = base.indexOf("?") == -1 ? "?" : "&";
     14. date.month = months.indexOf(m[2].toLowerCase()) % 12;
     13. return itemType[4].indexOf(field[0]) !== -1;
     12. if((_this.browserSupport.indexOf(Zotero.browser) !== -1
     11.			&& _this.browserSupport.indexOf("b") !== -1)
     10. skipWords.indexOf(lowerCaseVariant.replace(/[^a-zA-Z]+/, "")) != -1
     9. if (splits[i].indexOf('<a ') == 0) {
     7.8. if(str.indexOf("<") === -1 && str.indexOf("&") === -1) return str;
     6. (var nl1Index = stack.indexOf("\n")
     5. flags.indexOf(flag) > -1 ? '' : flag);
     4. if (flags.indexOf('n') > -1) {
     3. _this.isFx = window.navigator.userAgent.indexOf("Netscape") !== -1
     2. window.navigator.userAgent.toLowerCase().indexOf("webkit") !== -1
     1. window.navigator.[userAgent.toLowerCase()].indexOf("webkit") !== -1
     */

    var ieFile = path.join(path.dirname(fileName), path.basename(fileName, '.js') + "_ie.js");
    _this.copyFile(fileName, ieFile, {
      fileName: [path.basename(fileName)],
      pattern: /(?:(\W+)const(\W))|(?:((?:(?:[^\s\(])+(?:(?:\(\))|\[[^\]]*\])?)|(?:\[[^\]]*\])+)\.indexOf\((.+?)\))/g,
      replacement: function($0, $1, $2, $3, $4) {
        if($1 && $2)
          return $1 + "var" + $2;
        if($3 && $4)
          return "zindexOf(" + $3 + ", " + $4 + ")";
      }
    }, function(f) {
      var appendFile;
      switch(path.basename(f)) {
        case 'common_tmp_ie.js':
          appendFile = "ie_compat.js";
          break;
        case 'iframe_tmp_ie.js':
          appendFile = "iframe_ie_compat.js";
          break;
        case 'inject_tmp_ie.js':
          appendFile = "inject_ie_compat.js";
          break;
      }
      _this.appendCode([path.join(_zoteroSrcFilesLocation, "bookmarklet", appendFile)], ieFile, undefined, false);
    });
  }
  this.deleteDirectory = function(dir, callback) {
    var d = require('./delete');
    d.delete(dir, callback);
  }
  this.modifyZoteroConfig = function(filePath) {
    fs.readFile(filePath, function(err, data) {
      fs.readFile(path.join(_this.config.pmeFilesLocation, "zotero_config.js"), function(err, newdata) {
        fs.writeFile(filePath, data.toString().replace(/const ZOTERO_CONFIG = {(?:.|\n)+?};/, newdata.toString()), function() {
        });
      });
    });
  }
}

module.exports = commonObj;