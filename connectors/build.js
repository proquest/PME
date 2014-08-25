console.log("______________________________________________________");
var _buildID = (new Date()).valueOf();
var _baseUrl = "http://localhost:8082/bookmarklet/";

var fs = require('fs');
var path = require('path');
var uglifyjs = require('uglify-js');

var _defaultVersion = "3.0.999";
var _builderConfigFilesLocation = path.resolve("config");
var _connectorsCommonFilesLocation = path.resolve("zotero-connectors/src/common");
var _zoteroFilesLocation = path.resolve("proquest_zotero");
var _zoteroSrcFilesLocation = path.resolve("zotero-connectors/src");
var _buildLocation = path.resolve("build");

var _debug = false;
var _needUglify = false;
var _asyncProcessCnt = 0;
if (process.argv[2] == 'debug')
  _debug = true;
if(_debug) {
  _buildID = '(new Date()).valueOf()';
}
var _UIConfigURL = '"http://localhost:8083/pme_ui.js?" + ' + _buildID;

console.log('choose chrome|safari|bookmark|all:')
process.stdin.on('data', function(module) {
  module = module.toString().substr(0, module.length - 1);
  switch(module.toString()) {
    case 'chrome':
      buildChrome();
      break;
    case 'safari':
      buildSafari();
      break;
    case 'bookmark':
      buildBookmarklet();
      break;
    case 'all':
      buildChrome();
      buildSafari();
      buildBookmarklet();
      break;
    default:
      console.log('invalid module');
      break;
  }
})

function clearInt(id, func) {
  if(_asyncProcessCnt == 0) {
    clearInterval(id);
    func();
  }
}

function complete(func) {
  var interval = setInterval(function() {
    clearInt(interval, func);
  }, 10);
}

function buildChrome() {
  console.log("Starting Chrome");
  var root = path.join(_buildLocation, "chrome");
  buildChromeOrSafari(root, "chrome", "manifest.json");
  complete(function() {
    //build Chrome package
    console.log("complete Chrome");
  })
}

function buildSafari() {
  console.log('Starting Safari build');
  var root = path.join(_buildLocation, "safari");//maybe safari.safariextension?
  buildChromeOrSafari(root, "safari", "Info.plist");
  complete(function() {
    //build Safari package
    console.log("complete Safari");
  })
}

function buildChromeOrSafari(root, browser, config) {
  _needUglify=false;
  doPrepWork(root, function() {
    _asyncProcessCnt++;
    fs.mkdir(root, function() {
      _asyncProcessCnt--;
      copyCode(_connectorsCommonFilesLocation, root, [], [
        "inject",
//      "preferences",
        "itemSelector"
      ], versionFix());
      copyCode(_builderConfigFilesLocation, root, [config], null, {
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
      copyCode(path.join(_zoteroSrcFilesLocation, browser), root, ["!", config]);
      var rootZotero = path.join(root, "zotero");
      _asyncProcessCnt++;
      fs.mkdir(rootZotero, function() {
        _asyncProcessCnt--;
        copyCode(path.join(_zoteroFilesLocation, 'chrome/content/zotero/xpcom'),
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
        _asyncProcessCnt++;
        fs.mkdir(translation, function() {
          _asyncProcessCnt--;
          copyCode(path.join(_zoteroFilesLocation, 'chrome/content/zotero/xpcom/translation'),
            translation, [
              "tlds.js",
              "translate.js"
            ], null, translateFix());
        });
      });
      copyImages(root);
    });
  });
}

function buildBookmarklet() {
  console.log("Starting Bookmarklet");
  var root = path.join(_buildLocation, "bookmarklet");
  _needUglify = root;
  doPrepWork(root, function() {
    _asyncProcessCnt++;
    fs.mkdir(root, function() {
      _asyncProcessCnt--;
      var xpcom = path.join(_zoteroFilesLocation, "chrome/content/zotero/xpcom/");
      var bookmarklet = path.join(_zoteroSrcFilesLocation, "bookmarklet");
      var iframe_tmp = path.join(root, "iframe_tmp.js");
      var common_tmp = path.join(root, "common_tmp.js");
      var inject_tmp = path.join(root, "inject_tmp.js");

      appendCode([
        path.join(xpcom, "connector/connector.js"),
        path.join(xpcom, "translation/tlds.js"),
        path.join(bookmarklet, "translator.js"),
        path.join(_connectorsCommonFilesLocation, "messaging.js"),
        path.join(bookmarklet, "iframe_base.js")
      ], iframe_tmp/*, {
       fileName: ["connector.js"],
       pattern: /(CONNECTOR_URI = ")http:\/\/.+(\/";)/g,
       replacement: "$1https://www.zotero.org$2"
       }*/);
      appendCode([
        path.join(_connectorsCommonFilesLocation, "zotero.js"),
        path.join(_builderConfigFilesLocation, "config.js"),
        path.join(xpcom, "debug.js"),
        path.join(_connectorsCommonFilesLocation, "errors_webkit.js"),
        path.join(_connectorsCommonFilesLocation, "http.js"),
        path.join(xpcom, "xregexp/xregexp.js"),
        path.join(xpcom, "xregexp/addons/build.js"),
        path.join(xpcom, "xregexp/addons/matchrecursive.js"),
        path.join(xpcom, "xregexp/addons/unicode/unicode-base.js"),
        path.join(xpcom, "xregexp/addons/unicode/unicode-categories.js"),
        path.join(xpcom, "xregexp/addons/unicode/unicode-zotero.js"),
        path.join(xpcom, "utilities.js"),
        path.join(bookmarklet, "messages.js")
      ], common_tmp, versionFix());
      appendCode([
        path.join(xpcom, "connector/cachedTypes.js"),
        path.join(xpcom, "date.js"),
        path.join(_connectorsCommonFilesLocation, "inject/http.js"),
        path.join(xpcom, "openurl.js"),
        path.join(_connectorsCommonFilesLocation, "inject/progressWindow.js"),
        path.join(xpcom, "rdf/init.js"),
        path.join(xpcom, "rdf/uri.js"),
        path.join(xpcom, "rdf/term.js"),
        path.join(xpcom, "rdf/identity.js"),
        path.join(xpcom, "rdf/match.js"),
        path.join(xpcom, "rdf/rdfparser.js"),
        path.join(xpcom, "translation", "translate.js"),
        path.join(xpcom, "connector/translate_item.js"),
        path.join(_connectorsCommonFilesLocation, "inject/translate_inject.js"),
        path.join(_connectorsCommonFilesLocation, "inject/translator.js"),
        path.join(xpcom, "connector/typeSchemaData.js"),
        path.join(xpcom, "utilities_translate.js"),
        path.join(bookmarklet, "messaging_inject.js"),
        path.join(bookmarklet, "inject_base.js")
      ], inject_tmp, translateFix());

      copyCode(bookmarklet, root, [
          "loader.js",
          "ie_hack.js",
          "upload.js",
          "bookmarklet.html",
          "debug_mode.html",
          "iframe.html",
          "iframe_ie.html",
          "auth_complete.html",
          "itemSelector/itemSelector_browserSpecific.js"
        ], [
          path.join(_connectorsCommonFilesLocation, 'itemSelector')
        ],
        {
          fileName: ["loader.js", "iframe.html", "iframe_ie.html"],
          pattern: /(?:(baseURL\s*=\s*").+")|(?:(".js)")|(?:(<script .+\.js)"(><\/script>))|(\n<body><\/body>\n)/g,
          replacement: function($0, $1, $2, $3, $4, $5) {
            if($1)
              return $1 + _baseUrl + '"';
            if($2)
              return $2 + '?"+' + _buildID;
            if(($3 && $4) || $5) {
              if(_debug) {
                var ie = '';
                if(RegExp.leftContext.indexOf('_ie')>-1) {
                  ie = '_ie';
                }
                if($3 || $4)
                  return "";
                if ($5) {
                  var script = "<script>\n" +
                    "var d = new Date().valueOf();\n" +
                    "var script1 = document.createElement('script');\n" +
                    "script1.setAttribute('src', 'common" + ie + ".js?' + d);\n" +
                    "script1.onload = function(){\n" +
                    "\tvar script2 = document.createElement('script');\n" +
                    "\tscript2.setAttribute('src', 'iframe" + ie + ".js?' + d);\n" +
                    "\tdocument.getElementsByTagName('body')[0].appendChild(script2);\n" +
                    "}\n" +
                    "document.getElementsByTagName('body')[0].appendChild(script1);\n" +
                    "</script>\n";
                  return $5 + script;
                }
              }
              else
                return $3 + '?' + _buildID + '"' + $4;
            }
          }
        }
      );
      copyFile(path.join(bookmarklet, "htaccess"), path.join(root, ".htaccess"));

      copyImages(root);
    });
  })
  complete(function() {
    var interval = setInterval(function() {
      clearInt(interval, function() {
        console.log("complete bookmarklet");
      });
    }, 10);
    uglify();
  });
}

function doPrepWork(location, callback) {
  fs.exists(location, function(exists) {
    if(exists) {
      deleteFilesAndFolders(location, callback);
    }
    else
      callback()
  });
}

function deleteFilesAndFolders(fromDir, callback) {
  deleteAllFilesSync(fromDir);
  deleteAllFoldersSync(fromDir)
  callback();
}

function deleteAllFilesSync(fromDir) {
  var objects = fs.readdirSync(fromDir);
  objects.forEach(function(obj) {
    var objPath = path.join(fromDir, obj);
    var st = fs.statSync(objPath)
    if(st.isDirectory())
      deleteAllFilesSync(objPath)
    else
      fs.unlinkSync(objPath);
  })
}

function deleteAllFoldersSync(fromDir) {
  if(fs.existsSync(fromDir)) {
    var objects = fs.readdirSync(fromDir);
    if(objects.length == 0) {
      fs.rmdirSync(fromDir);
      deleteParentFolder(fromDir);
    }
    else {
      objects.forEach(function(obj) {
        var objPath = path.join(fromDir, obj);
        deleteAllFoldersSync(objPath)
      })
    }
  }
}

function deleteParentFolder(dir) {
  var parent = path.join(dir, "..");
  if(parent != _buildLocation)
    deleteAllFoldersSync(parent);
}

function copyCode(fromDir, toDir, files, directories, adjustments) {
  if(files === undefined)
    files = [];
  if(directories === undefined)
    directories = [];

  _asyncProcessCnt++;
  fs.readdir(fromDir, function(err, objects) {
    _asyncProcessCnt--;
    objects.every(function(obj) {
      var fromPath = path.join(fromDir, obj);
      var toPath = path.join(toDir, obj);
      _asyncProcessCnt++;
      fs.stat(fromPath, function(err, st) {
        _asyncProcessCnt--;
        if(st.isDirectory()) {
          if(directories === null || (directories.length > 0 && directories.indexOf(obj) == -1)) {
            return false;
          }
          var newDir = toPath;
          _asyncProcessCnt++
          fs.mkdir(newDir, function() {
            _asyncProcessCnt--;
            copyCode(fromPath, newDir);
          });
        }
        else {
          if(files.length > 0 && (
            (files[0] == "!" && files.indexOf(obj) > -1) ||
            (files[0] != "!" && files.indexOf(obj) == -1 ))
            )
            return false;
          else
            copyFile(fromPath, toPath, adjustments);
        }
      });
      return true;
    });
  });
}

function appendCode(fromFiles, toFile, adjustments, iefy) {
  fromFiles.forEach(function(file) {
    appendFromFileSync(file, toFile, adjustments);
  });

  if(iefy === undefined || iefy)
    explorerify(toFile);
}

//synchronous, because order matters
function appendFromFileSync(fromFile, toFile, adjustments) {
  var data = fs.readFileSync(fromFile)
  var s = data.toString();
  if(adjustments && adjustments.fileName.indexOf(path.basename(fromFile)) > -1 ) {
    s = s.replace(adjustments.pattern, adjustments.replacement);
  }
  fs.appendFileSync(toFile,
    "/************** BEGIN " + path.basename(fromFile) + " **************/\n" +
    s +
    "\n/************** END " + path.basename(fromFile) + " **************/\n"
  );
}

function copyFile(fromFile, toFile, adjustments, callback) {
//  console.log(fromFile)
   if(adjustments && adjustments.fileName.indexOf(path.basename(fromFile)) >-1 ) {
     _asyncProcessCnt++;
     fs.readFile(fromFile, function(err, data) {
       _asyncProcessCnt--;
       var s = data.toString().replace(adjustments.pattern, adjustments.replacement);
       _asyncProcessCnt++;
       fs.writeFile(toFile, s, function() {
         _asyncProcessCnt--;
         if(callback) {
           callback(toFile);
         }
       });
     })
   }
  else {
    fs.createReadStream(fromFile).pipe(fs.createWriteStream(toFile));
  }
}

function copyImages(inDir) {
  var images = path.join(inDir, "images");
  _asyncProcessCnt++;
  fs.mkdir(images, function() {
    _asyncProcessCnt--;
    copyCode(_builderConfigFilesLocation, images, [
      "flow16.png",
      "flow48.png",
      "flow128.png",
      "treesource-collection.png"
    ], null);
  });
}

function versionFix() {
  return {
    fileName: ["zotero.js"],
    pattern: /(\s+this.version\s*=\s*").+(";)/,
    replacement: '$1' + _defaultVersion + '$2'
  }
}

function translateFix() {
  return{
    fileName: ["translate.js"],
    pattern: /"%UIConfigURL%"/g,
    replacement: _UIConfigURL
  }
}

function explorerify(fileName) {
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
21. && (this.document.defaultView.toString().indexOf("Window") !== -1
20.	|| this.document.defaultView.toString().indexOf("XrayWrapper") !== -1)) {
18,19. const handlerIndex = this._handlers[type].indexOf(handler);
17. if(el['nodeName'].indexOf(":") >= 0)
15,16. const splice = base.indexOf("?") == -1 ? "?" : "&";
14. date.month = months.indexOf(m[2].toLowerCase()) % 12;
13. return itemType[4].indexOf(field[0]) !== -1;
12. if((this.browserSupport.indexOf(Zotero.browser) !== -1
11.			&& this.browserSupport.indexOf("b") !== -1)
10. skipWords.indexOf(lowerCaseVariant.replace(/[^a-zA-Z]+/, "")) != -1
9. if (splits[i].indexOf('<a ') == 0) {
7.8. if(str.indexOf("<") === -1 && str.indexOf("&") === -1) return str;
6. (var nl1Index = stack.indexOf("\n")
5. flags.indexOf(flag) > -1 ? '' : flag);
4. if (flags.indexOf('n') > -1) {
3. this.isFx = window.navigator.userAgent.indexOf("Netscape") !== -1
2. window.navigator.userAgent.toLowerCase().indexOf("webkit") !== -1
1. window.navigator.[userAgent.toLowerCase()].indexOf("webkit") !== -1
   */

  var ieFile = path.join(path.dirname(fileName), path.basename(fileName, '.js')+"_ie.js");
  copyFile(fileName, ieFile, {
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
    appendCode([path.join(_zoteroSrcFilesLocation, "bookmarklet", appendFile)], ieFile, undefined, false);
  });
}

function uglify() {
  console.log('Uglifying')
  var dir = _needUglify;
  _asyncProcessCnt++;
  fs.readdir(dir, function(err, files) {
    _asyncProcessCnt--;
    files.forEach(function(file) {
      if(path.extname(file) == ".js") {
        var origName = path.join(dir, file);
        var newName = path.join(dir, path.basename(file).replace("_tmp", ""));
        if(_debug) {
          _asyncProcessCnt++;
          fs.rename(origName, newName, function() {
            _asyncProcessCnt--;
          });
        }
        else {
          var result = uglifyjs.minify(origName);
          _asyncProcessCnt++;
          fs.writeFile(newName, result.code, function() {
            _asyncProcessCnt--;
            if(origName.indexOf("_tmp") > 0 && path.basename(newName).indexOf(path.basename(origName) == 0)) {
              _asyncProcessCnt++;
              fs.unlink(origName, function() {
                _asyncProcessCnt--
              });
            }
          });
        }
      }
    });
  });
}