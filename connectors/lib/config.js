var path = require("path");
var repoPath = process.cwd();
var buildId = (new Date()).valueOf()
module.exports = {
  buildID: buildId,
  baseUrl: "http://localhost:8082/bookmarklet/",
  defaultVersion: "3.0.999",
  builderConfigFilesLocation: path.join(process.cwd(), "config"),
  pmeFilesLocation: path.join(process.cwd(), "pme"),
  connectorsCommonFilesLocation: path.join(repoPath, "zotero-connectors/src/common"),
  zoteroFilesLocation: path.join(repoPath, "zotero"),
  zoteroSrcFilesLocation: path.join(repoPath, "zotero-connectors/src"),
  buildLocation: path.join(repoPath, "build"),
  UIConfigURL : '"http://localhost:8083/pme_ui.js?" + ' + buildId
};
