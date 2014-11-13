var fs = require('graceful-fs');
var path = require('path');
var stack = require('./stack');
var archiver = require('archiver');
var c = require('./common'),
	_zoteroFilesLocation,
	_pmeLocation,
	_buildLocation,
	_builderConfigFilesLocation,
	_archiveInfo = []
_translatorsIndex = [];

function addZipInfo(from, st) {
	st.push();
	fs.readdir(from, function (err, objects) {
		objects.forEach(function (obj) {
			var fromPath = path.join(from, obj);
			st.push();
			fs.stat(fromPath, function (err, stats) {
				if (stats.isDirectory()) {
					addZipInfo(fromPath, st)
				}
				else {
					_archiveInfo.push(fromPath)
				}
				st.pop();
			});
		});
		st.pop();
	});
}
function addTranslatorToZip(st, root) {
	st.push();
	var translators = path.join(_zoteroFilesLocation, "translators"),
		translatorsCount,
		reID = /"translatorID":\s*"(.+)"/,
		reLabel = /"label":\s*"(.+)"/,
		reDate = /"lastUpdated":\s*"(.+)"/,
		output = fs.createWriteStream(path.join(root, "translators.zip")),
		archive = archiver('zip');

	archive.on('error', function (err) {
		throw err;
	});
	output.on('finish', function () {
		st.pop();
	});
	archive.pipe(output);
	var indexStack = new stack(function () {
		_translatorsIndex.forEach(function (o) {
			archive.append(fs.createReadStream(o.objPath), {name: o.name});
		});
		archive.finalize();
	})
	indexStack.push();
	fs.readdir(translators, function (err, objects) {
		translatorsCount = 0;
		var total = objects.length;
		objects.forEach(function (obj) {
			var objPath = path.join(translators, obj);
			if (path.extname(objPath) == ".js") {
				if (++translatorsCount == total) {
					objPath = path.join(_pmeLocation, "Empty.js");
				}
				indexStack.push();
				var indFile = path.join(root, "translators.index");
				addTranslatorToIndex(objPath, translatorsCount, indexStack, indFile, translatorsCount == total)
			}
			else {
				total--;
			}
		});
		indexStack.pop();
	});
}
function addTranslatorToIndex(objPath, count, st, file, last) {
	var reID = /"translatorID":\s*"(.+)"/,
		reLabel = /"label":\s*"(.+)"/,
		reDate = /"lastUpdated":\s*"(.+)"/;
	fs.readFile(objPath, function (err, data) {
		var id, label, date;
		var text = data.toString();
		reID.exec(text);
		id = RegExp.$1;
		reLabel.exec(text);
		label = RegExp.$1;
		reDate.exec(text);
		date = RegExp.$1;
		var newLine = [count + ".js", id, label, date].join(",") + "\n";
		fs.appendFile(file, newLine, function () {
		});
		_translatorsIndex.push({objPath: objPath, name: count + ".js"});
		if (last) {
			fs.appendFile(file,
					++count + ".js,9751de72-3d4b-4187-bfda-deb34b936620,pme_ui,n/a\n",
				function () {
				});
			_translatorsIndex.push({objPath: path.join(_pmeLocation, 'pme_ui.js'), name: count + ".js"});
		}
		st.pop();
	});

}

function setConfig(common) {
	_zoteroFilesLocation = common.config.zoteroFilesLocation;
	_pmeLocation = common.config.pmeFilesLocation;
	_buildLocation = common.config.buildLocation;
	_builderConfigFilesLocation = common.config.builderConfigFilesLocation;
}

module.exports = function (debug) {
	this.buildFirefox = function () {
		console.log("Starting Firefox");
		var common = new c(debug, new stack(function () {
			common.stackInst = new stack(function () {
				if (!common.debug) {
					console.log('creating .xpi file')
					var output = fs.createWriteStream(extFile);
					var archive = archiver('zip');
					archive.on('error', function (err) {
						throw err;
					});
					output.on('finish', function () {
						common.deleteDirectory(root, function () {
						})
						console.log('Firefox complete');
					});
					archive.pipe(output);
					addZipInfo(root, new stack(function () {
						_archiveInfo.forEach(function (fPath) {
							archive.append(fs.createReadStream(fPath), {name: fPath.replace(root, '')});
						});
						archive.finalize();
					}))
				}
				else
					console.log("Firefox complete. No extension file")
			});
			common.copyCode(_pmeLocation, path.join(root, "defaults/preferences"), ["pme_prefs.js"]);
			common.copyCode(_pmeLocation, path.join(root, "chrome/content/zotero"), ["include.js", "pme_ui.js", "overlay.xul", "browser.js"]);
			common.copyCode(_pmeLocation, path.join(root, "chrome/content/zotero/xpcom"), ["debug.js","schema.js"]);
			common.copyCode(path.join(_zoteroFilesLocation, "translators"), root, ["deleted.txt"]);
			common.copyCode(_pmeLocation, root, ["install.rdf", "update.rdf"]);
			common.copyCode(_builderConfigFilesLocation, root, ['chrome.manifest'])
			common.copyCode(_builderConfigFilesLocation, path.join(root, 'chrome/skin/default/zotero'), ['zotero-new-z-48px.png', 'zotero-new-z-16px.png', 'zotero-z-16px-australis.svg', 'zotero-z-32px-australis.svg']);
			common.appendCode([
				path.join(_pmeLocation, 'translate.js')
			], path.join(root, 'chrome/content/zotero/xpcom/translation/translate.js'), null, false);
			common.appendCode([
				path.join(_pmeLocation, 'utilities_translate.js')
			], path.join(root, 'chrome/content/zotero/xpcom/utilities_translate.js'), null, false);
		}));

		setConfig(common);
		var root = path.join(_buildLocation, "firefox");
		var extFile = path.join(_buildLocation, "firefoxConnector.xpi");
		fs.unlink(extFile, function () {
		});

		common.doPrepWork(root, function () {
			common.stackInst.push();
			fs.mkdir(root, function () {
				common.copyCode(_zoteroFilesLocation, root, ["xregexp.js", "q.js", "file.js", "date.js", "db.js", "zotero.css",
					"proxy.js","openurl.js", "translate.js", "translate_firefox.js", "translate_item.js", "translator.js", "tlds.js",
					"init.js","uri.js","term.js","identity.js","match.js","n3parser.js","serialize.js",
					"http.js", "utilities.js", "utilities_internal.js", "utilities_translate.js", "cachedTypes.js",
					"repotime.txt"], ["!", "translators"], [
					{
						fileName: 'all',
						pattern: /(?:((?:(?:chrome)|(?:resource)):\/\/)zotero((?:-platform)?\/))|(?:(\.append\(')zotero('\)))/g,
						replacement: function () {
							return (RegExp.$1 || RegExp.$3) + 'pme' + (RegExp.$2 || RegExp.$4);
						}
					},
					{
						fileName: 'all',
						pattern: /Zotero_Browser/g,
						replacement: "PME_Browser"
					},
					{
						fileName: 'all',
						pattern: /ZOTERO_CONFIG/g,
						replacement: "PME_CONFIG"
					},
					{
						fileName: 'all',
						pattern: /e4c61080-ec2d-11da-8ad9-0800200c9a66/g,
						replacement: "b1571583-82c5-499a-b578-b2e719ddc094"
					},
					{
						fileName: 'all',
						pattern: /zotero-toolbar-button/g,
						replacement: "pme-toolbar-button"
					},
					{
						fileName: ["schema.js","date.js","debug.js","db.js","error.js","file.js","http.js","mimeTypeHandler.js",
							"openurl.js","ipc.js","proxy.js","translate.js","translate_firefox.js","translate_item.js","translator.js","tlds.js",
							"utilities.js","utilities_internal.js","utilities_translate.js","browser.js","notifier.js","cachedTypes.js",
							"init.js", "uri.js", "term.js", "identity.js", "match.js", "n3parser.js", "serialize.js"],
						pattern: /Zotero\./g,
						replacement: "PME."
					},
					{
						fileName: ["zotero.js"],
						pattern: /\(Zotero\)/g,
						replacement: "(PME)"
					},
					{
						fileName: ["translate.js"],
						pattern: /"PME/g,
						replacement: "\"Zotero"
					},
					{
						fileName: ["translate.js"],
						pattern:/([^a-z]*[a-z]+)Zotero/g,
						replacement: function() {
							return RegExp.$1 + 'PME'
						}
					},
					{
						fileName: ["translate.js"],
						pattern: /_sandboxPME/g,
						replacement: "_sandboxZotero"
					},
					{
						fileName: ["db.js"],
						pattern: /'zotero'/g,
						replacement: "'pme'"
					}
				]);
				addTranslatorToZip(common.stackInst, root);
				common.stackInst.pop();
			});
		});
	}
}

