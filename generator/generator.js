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
		zoteroListPath = "zotero-list",
		repoPath = process.cwd();

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
		listOfFiles = _.union(listOfFiles, _.pluck(response.Contents, "Key"));
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
		return {Key: translatorskey + name}
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
							if((transObj.translatorType == 3 || transObj.translatorType == 4) &&
								(transObj.browserSupport && transObj.browserSupport.indexOf('b') > -1)) {
								translators.push({
									translatorID: transObj.translatorID,
									target: transObj.target,
									priority: transObj.priority
								});
								putObjectToS3(translatorskey + transObj.translatorID + ".js", fileContent, function(){})
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