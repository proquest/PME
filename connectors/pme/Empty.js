{
  "translatorID": "8cb314cf-2628-40cd-9713-4e773b8ed5d4",
  "label": "Empty",
  "creator": "ProQuest",
  "target": "",
  "minVersion": "3.0.4",
  "maxVersion": "",
  "priority": 900,
  "inRepository": true,
  "translatorType": 4,
  "browserSupport": "gcsibv",
  "lastUpdated": "2014-07-01 05:42:40"
}

function detectWeb(doc, url) {
  return "journalArticle";
}

function doWeb(doc, url) {
  var item = new Zotero.Item("journalArticle");
  item.url = url;
  item.title = doc.title
  item.complete();
}