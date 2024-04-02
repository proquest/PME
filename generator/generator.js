'use strict';

var async = require("async"),
		AWS = require('aws-sdk'),
		fs = require('graceful-fs'),
		path = require('path'),
		moment = require('moment'),
		_ = require('lodash');

var s3bucket = "pme.proquest.com",
		s3 = new AWS.S3(),
		masterkey = "masterlist.js",
		translatorskey = "translators/",
		zoteroListPath = "translators",
		repoPath = process.cwd(),
		// Force to add these translators to S3
		whiteList = [
			"05d07af9-105a-4572-99f6-a8e231c0daef",
			"0e2235e7-babf-413c-9acf-f27cce5f059c",
			"11645bd1-0420-45c1-badb-53fb41eeb753",
			"14763d25-8ba0-45df-8f52-b8d1108e7ac9",
			"1a3506da-a303-4b0a-a1cd-f216e6138d86",
			"24d9f058-3eb3-4d70-b78f-1ba1aef2128d",
			"2abe2519-2f0a-48c0-ad3a-b87b9c059459",
			"32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7",
			"594ebe3c-90a0-4830-83bc-9502825a6810",
			"59e7e93e-4ef0-4777-8388-d6eddb3261bf",
			"5e3ad958-ac79-463d-812b-a86a9235c28f",
			"5f0ca39b-898a-4b1e-b98d-8cd0d6ce9801",
			"881f60f2-0802-411a-9228-ce5f47b64c7d",
			"91acf493-0de7-4473-8b62-89fd141e6c74",
			"9cb70025-a888-4a29-a210-93ec52da40d4",
			"a6ee60df-1ddc-4aae-bb25-45e0537be973",
			"bc03b4fe-436d-4a1f-ba59-de4d2d7a63f7",
			"c73a4a8c-3ef1-4ec8-8229-7531ee384cc4",
			"eb7059a4-35ec-4961-a915-3cf58eb9784b",
			"edd87d07-9194-42f8-b2ad-997c4c7deefd",
			"fcf41bed-0cbc-3704-85c7-8062a0068a7a",
			"efd737c9-a227-4113-866e-d57fbc0684ca",
			"b28d0d42-8549-4c6d-83fc-8382874a5cb9",
			"93514073-b541-4e02-9180-c36d2f3bb401"
		],
		// Keep the old translators and don't update them from Zotero
		blackList = [
			"951c027d-74ac-47d4-a107-9c3069ab7b48"
		],
		skipDeleteTranslators = [
			"951c027d-74ac-47d4-a107-9c3069ab7b48.js"
		];

function copyObjectInS3(key, cb) {
	var dateStamp = moment().format("YYYY-MM-DD");
	s3.copyObject({
		Bucket: s3bucket,
		CopySource: encodeURIComponent(s3bucket + "/" + key),
		Key: "archive_" + dateStamp + "/" + key
	}, cb)
}

function listS3Objects(listOfFiles, marker, cb) {
	s3.listObjects({Bucket: s3bucket, Prefix: translatorskey, Marker: marker, Delimiter: ';'}, function(err, response) {
		listOfFiles = _.union(listOfFiles, _.map(response.Contents, "Key"));
		if(response.IsTruncated) {
			listS3Objects(listOfFiles, response.NextMarker)
		}
		else {
			cb(listOfFiles);
		}
	})
}

function archiveExisting(fn) {
	var existingList;
	async.parallel([
		function(cb1) {
			listS3Objects([], undefined, function(list) {
				existingList = list;
				async.each(list, function(obj, cb) {
					copyObjectInS3(obj, cb);
				}, cb1);
			});
		},
		copyObjectInS3.bind(null, masterkey)
	], function() {
		fn(null, _.map(existingList, function(name) {
			return name.replace(translatorskey, "");
		}));
	});
}

function deleteUnused(list, fn) {
	var keys = _.map(list, function(name) {
		if (skipDeleteTranslators.indexOf(name) < 0) {
			return {Key: translatorskey + name}
		}
	});
	s3.deleteObjects({
		Bucket: s3bucket,
		Delete: {Objects: keys}
	}, fn);
}

function updateList(existingList, fn) {
	var translators = [];
	var sPath = path.join(repoPath, zoteroListPath);
	fs.readdir(sPath, function(err, files) {
		async.eachLimit(files, 10, function(file, cb) {
			if(path.extname(file) == ".js"){
				fs.readFile(path.join(sPath, file), function(err, data) {
					var fileContent = data.toString();
					if(fileContent.match(/(^\s*{[\s\S]*?\n})/)) {
						try {
							var transObj = JSON.parse(RegExp.$1);
							if(
									(whiteList.indexOf(transObj.translatorID) >= 0) ||
									(transObj.browserSupport && transObj.browserSupport.indexOf('b') > -1 &&
										transObj.translatorType && (transObj.translatorType & 4) == 4)
								) {
								translators.push({
									translatorID: transObj.translatorID,
									target: transObj.target,
									label: transObj.label,
									priority: transObj.priority
								});
								if (blackList.indexOf(transObj.translatorID) < 0) {
									putObjectToS3(translatorskey + transObj.translatorID + ".js", fileContent, function (){})
								} else {
									console.log("Translator exists in blackList, keep the old version and don't update it from Zotero: " + transObj.label + " (" + transObj.translatorID + ")")
								}
							}
							else {
								console.log("skipping: "+transObj.label+" ("+transObj.translatorID+")")
							}
						}
						catch (e){console.log("unexpected file format", file, e);}
					}
					else {
						console.log("unexpected file format", file);
					}
					cb();
				})
			}
			else {
				cb();
			}
		}, function() {
			var unsupported = _.difference(existingList, _.map(translators, function(trans) {
				return trans.translatorID + ".js";
			}));
			putObjectToS3(masterkey, "Zotero.TranslatorMasterList = " + JSON.stringify(translators), function() {
				fn(null, unsupported)
			})
		});
	});
}

function putObjectToS3(key, content, cb) {
	s3.putObject({Bucket: s3bucket, Key: key, Body:content, ACL: 'public-read'}, cb)
}

async.waterfall([
	archiveExisting,
	updateList,
	deleteUnused
], function(err, res){console.log('complete')});
