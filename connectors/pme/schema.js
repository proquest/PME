/*
    ***** BEGIN LICENSE BLOCK *****
    
    Copyright © 2009 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://PME.org
    
    This file is part of PME.
    
    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    
    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with PME.  If not, see <http://www.gnu.org/licenses/>.
    
    ***** END LICENSE BLOCK *****
*/

PME.Schema = new function(){
	this.skipDefaultData = false;
	this.dbInitialized = false;
	this.goToChangeLog = false;
	
	var _dbVersions = [];
	var _schemaVersions = [];
	var _repositoryTimer;
	var _remoteUpdateInProgress = false, _localUpdateInProgress = false;
	var _renamedStylesByNew = null;
	
	var self = this;

	/*
	 * Retrieve the DB schema version
	 */
	this.getDBVersion = function (schema) {
		if (_dbVersions[schema]){
			return _dbVersions[schema];
		}

		if (PME.DB.tableExists('version')){
			var dbVersion = PME.DB.valueQuery("SELECT version FROM "
				+ "version WHERE schema='" + schema + "'");
			_dbVersions[schema] = dbVersion;
			return dbVersion;
		}
		return false;
	}


	this.userDataUpgradeRequired = function () {
		var dbVersion = this.getDBVersion('userdata');
		var schemaVersion = _getSchemaSQLVersion('userdata');

		return dbVersion && (dbVersion < schemaVersion);
	}

	/*
	 * Checks if the DB schema exists and is up-to-date, updating if necessary
	 */
	this.updateSchema = function () {
		var dbVersion = this.getDBVersion('userdata');
		var dbVersion2 = this.getDBVersion('userdata2');

		// 'schema' check is for old (<= 1.0b1) schema system,
		// 'user' is for pre-1.0b2 'user' table
		if (!dbVersion && !this.getDBVersion('schema') && !this.getDBVersion('user')){
			PME.debug('Database does not exist -- creating\n');
			_initializeSchema();
			return true;
		}

		var schemaVersion = _getSchemaSQLVersion('userdata');

		try {
			PME.UnresponsiveScriptIndicator.disable();

			// If upgrading userdata, make backup of database first
			if (dbVersion < schemaVersion){
				PME.DB.backupDatabase(dbVersion);
				PME.wait(1000);
			}

			PME.DB.beginTransaction();

			try {
				// Old schema system
				if (!dbVersion){
					// Check for pre-1.0b2 'user' table
					 var user = this.getDBVersion('user');
					 if (user)
					 {
						 dbVersion = user;
						 var sql = "UPDATE version SET schema=? WHERE schema=?";
						 PME.DB.query(sql, ['userdata', 'user']);
					 }
					 else
					 {
						 dbVersion = 0;
					 }
				}

				var up2 = _migrateUserDataSchema(dbVersion);

				PME.DB.commitTransaction();
			}
			catch(e){
				PME.debug(e);
				PME.DB.rollbackTransaction();
				throw(e);
			}

			if (up2) {
				// Upgrade seems to have been a success -- delete any previous backups
				var maxPrevious = dbVersion - 1;
				var file = PME.getZoteroDirectory();
				var toDelete = [];
				try {
					var files = file.directoryEntries;
					while (files.hasMoreElements()) {
						var file = files.getNext();
						file.QueryInterface(Components.interfaces.nsIFile);
						if (file.isDirectory()) {
							continue;
						}
						var matches = file.leafName.match(/pme\.sqlite\.([0-9]{2,})\.bak/);
						if (!matches) {
							continue;
						}
						if (matches[1]>=28 && matches[1]<=maxPrevious) {
							toDelete.push(file);
						}
					}
					for each(var file in toDelete) {
						PME.debug('Removing previous backup file ' + file.leafName);
						file.remove(false);
					}
				}
				catch (e) {
					PME.debug(e);
				}
			}
		}
		finally {
			PME.UnresponsiveScriptIndicator.enable();
		}

		// After a delay, start update of bundled files and repo updates
		setTimeout(function () {
			PME.UnresponsiveScriptIndicator.disable();
			PME.Schema.updateBundledFiles(null, false, true)
			.finally(function () {
				PME.UnresponsiveScriptIndicator.enable();
			})
			.done();
		}, 5000);
	}
	
	/**
	 * Update styles and translators in data directory with versions from
	 * ZIP file (XPI) or directory (source) in extension directory
	 *
	 * @param	{String}	[mode]					'translators' or 'styles'
	 * @param	{Boolean}	[skipDeleteUpdated]		Skip updating of the file deleting version --
	 *												since deleting uses a single version table key,
	 * 												it should only be updated the last time through
	 */
	this.updateBundledFiles = function(mode, skipDeleteUpdate, runRemoteUpdateWhenComplete) {
		if (_localUpdateInProgress) return Q();
		
		return Q.fcall(function () {
			_localUpdateInProgress = true;
			
			// Get path to addon and then call updateBundledFilesCallback
			
			// Synchronous in Standalone
			if (PME.isStandalone) {
				var jar = Components.classes["@mozilla.org/file/directory_service;1"]
					.getService(Components.interfaces.nsIProperties)
					.get("AChrom", Components.interfaces.nsIFile).parent;
				jar.append("Zotero.jar");
				return _updateBundledFilesCallback(jar, mode, skipDeleteUpdate);
			}
			
			// Asynchronous in Firefox
			var deferred = Q.defer();
			Components.utils.import("resource://gre/modules/AddonManager.jsm");
			AddonManager.getAddonByID(
				PME_CONFIG['GUID'],
				function(addon) {
					var up = _updateBundledFilesCallback(
						addon.getResourceURI().QueryInterface(Components.interfaces.nsIFileURL).file,
						mode,
						skipDeleteUpdate
					);
					deferred.resolve(up);
				}
			);
			return deferred.promise;
		})
		.then(function (updated) {
			if (runRemoteUpdateWhenComplete) {
				var deferred = Q.defer();
				if (updated) {
					if (PME.Prefs.get('automaticScraperUpdates')) {
						PME.proxyAuthComplete
						.then(function () {
							PME.Schema.updateFromRepository(2, function () deferred.resolve());
						})
					}
				}
				else {
					PME.proxyAuthComplete
					.then(function () {
						PME.Schema.updateFromRepository(false, function () deferred.resolve());
					})
					.done();
				}
				return deferred.promise;
			}
		});
	}
	
	/**
	 * Callback to update bundled files, after finding the path to the Zotero install location
	 */
	function _updateBundledFilesCallback(installLocation, mode, skipDeleteUpdate) {
		_localUpdateInProgress = false;
		
		if (!mode) {
			var up1 = _updateBundledFilesCallback(installLocation, 'translators', true);
			return up1 || up2;
		}
		
		var xpiZipReader, isUnpacked = installLocation.isDirectory();
		if(!isUnpacked) {
			xpiZipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
					.createInstance(Components.interfaces.nsIZipReader);
			xpiZipReader.open(installLocation);

			if(PME.isStandalone && !xpiZipReader.hasEntry("translators.index")) {
				// Symlinked dev Standalone build
				var installLocation2 = installLocation.parent,
					translatorsDir = installLocation2.clone();
				translatorsDir.append("translators");
				if(translatorsDir.exists()) {
					installLocation = installLocation2;
					isUnpacked = true;
					xpiZipReader.close();
				}
			}
		}
		
		switch (mode) {
			case "translators":
				var titleField = 'label';
				var fileExt = ".js";
				break;

			default:
				throw ("Invalid mode '" + mode + "' in PME.Schema.updateBundledFiles()");
		}
		
		var modes = mode;
		mode = mode.substr(0, mode.length - 1);
		var Mode = mode[0].toUpperCase() + mode.substr(1);
		var Modes = Mode + "s";
		
		var repotime = PME.File.getContentsFromURL("resource://pme/schema/repotime.txt");
		var date = PME.Date.sqlToDate(repotime, true);
		repotime = PME.Date.toUnixTimestamp(date);
		
		var fileNameRE = new RegExp("^[^\.].+\\" + fileExt + "$");
		
		var destDir = PME["get" + Modes + "Directory"]();
		
		// If directory is empty, force reinstall
		var forceReinstall = true;
		var entries = destDir.directoryEntries;
		while (entries.hasMoreElements()) {
			var file = entries.getNext();
			file.QueryInterface(Components.interfaces.nsIFile);
			if (!file.leafName.match(fileNameRE) || file.isDirectory()) {
				continue;
			}
			// Not empty
			forceReinstall = false;
			break;
		}
		
		//
		// Delete obsolete files
		//
		var sql = "SELECT version FROM version WHERE schema='delete'";
		var lastVersion = PME.DB.valueQuery(sql);
		
		if(isUnpacked) {
			var deleted = installLocation.clone();
			deleted.append('deleted.txt');
			// In source builds, deleted.txt is in the translators directory
			if (!deleted.exists()) {
				deleted = installLocation.clone();
				deleted.append('translators');
				deleted.append('deleted.txt');
			}
			if (!deleted.exists()) {
				deleted = false;
			}
		} else {
			var deleted = xpiZipReader.getInputStream("deleted.txt");
		}
		
		deleted = PME.File.getContents(deleted);
		deleted = deleted.match(/^([^\s]+)/gm);
		var version = deleted.shift();
		
		if (!lastVersion || lastVersion < version) {
			var toDelete = [];
			var entries = destDir.directoryEntries;
			while (entries.hasMoreElements()) {
				var file = entries.getNext();
				file.QueryInterface(Components.interfaces.nsIFile);
				
				if (!file.exists() // symlink to non-existent file
						|| file.isDirectory()) {
					continue;
				}
				
				if (forceReinstall || !file.leafName.match(fileNameRE)) {
					continue;
				}
				
				var newObj = new PME[Mode](file);
				if (deleted.indexOf(newObj[mode + "ID"]) == -1) {
					continue;
				}
				toDelete.push(file);
			}
			
			for each(var file in toDelete) {
				PME.debug("Deleting " + file.path);
				try {
					file.remove(false);
				}
				catch (e) {
					PME.debug(e);
				}
			}
			
			if (!skipDeleteUpdate) {
				sql = "REPLACE INTO version (schema, version) VALUES ('delete', ?)";
				PME.DB.query(sql, version);
			}
		}
		
		//
		// Update files
		//
		var sql = "SELECT version FROM version WHERE schema=?";
		var lastModTime = PME.DB.valueQuery(sql, modes);
		
		var zipFileName = modes + ".zip", zipFile;
		if(isUnpacked) {
			zipFile = installLocation.clone();
			zipFile.append(zipFileName);
			if(!zipFile.exists()) zipFile = undefined;
		} else {
			if(xpiZipReader.hasEntry(zipFileName)) {
				zipFile = xpiZipReader.getEntry(zipFileName);
			}
		}
		
		// XPI installation
		if (zipFile) {
			var modTime = Math.round(zipFile.lastModifiedTime / 1000);
			
			if (!forceReinstall && lastModTime && modTime <= lastModTime) {
				PME.debug("Installed " + modes + " are up-to-date with " + zipFileName);
				return false;
			}
			
			PME.debug("Updating installed " + modes + " from " + zipFileName);
			
			if (mode == 'translator') {
				// Parse translators.index
				var indexFile;
				if(isUnpacked) {
					indexFile = installLocation.clone();
					indexFile.append('translators.index');
					if (!indexFile.exists()) {
						Components.utils.reportError("translators.index not found in PME.Schema.updateBundledFiles()");
						return false;
					}
				} else {
					if(!xpiZipReader.hasEntry("translators.index")) {
						Components.utils.reportError("translators.index not found in PME.Schema.updateBundledFiles()");
						return false;
					}
					var indexFile = xpiZipReader.getInputStream("translators.index");
				}
				
				indexFile = PME.File.getContents(indexFile);
				indexFile = indexFile.split("\n");
				var index = {};
				for each(var line in indexFile) {
					if (!line) {
						continue;
					}
					var [fileName, translatorID, label, lastUpdated] = line.split(',');
					if (!translatorID) {
						Components.utils.reportError("Invalid translatorID '" + translatorID + "' in PME.Schema.updateBundledFiles()");
						return false;
					}
					index[translatorID] = {
						label: label,
						lastUpdated: lastUpdated,
						fileName: fileName, // Numbered JS file within ZIP
						extract: true
					};
				}
				
				var sql = "SELECT translatorJSON FROM translatorCache";
				var dbCache = PME.DB.columnQuery(sql);
				// If there's anything in the cache, see what we actually need to extract
				if (dbCache) {
					for each(var json in dbCache) {
						var metadata = JSON.parse(json);
						var id = metadata.translatorID;
						if (index[id] && index[id].lastUpdated == metadata.lastUpdated) {
							index[id].extract = false;
						}
					}
				}
			}
			
			var zipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
					.createInstance(Components.interfaces.nsIZipReader);
			if(isUnpacked) {
				zipReader.open(zipFile);
			} else {
				zipReader.openInner(xpiZipReader, zipFileName);
			}
			var tmpDir = PME.getTempDirectory();
			
			if (mode == 'translator') {
				for (var translatorID in index) {
					// Use index file and DB cache for translator entries,
					// extracting only what's necessary
					var entry = index[translatorID];
					if (!entry.extract) {
						//PME.debug("Not extracting '" + entry.label + "' -- same version already in cache");
						continue;
					}
					
					var tmpFile = tmpDir.clone();
					tmpFile.append(entry.fileName);
					if (tmpFile.exists()) {
						tmpFile.remove(false);
					}
					zipReader.extract(entry.fileName, tmpFile);
					
					var existingObj = PME.Translators.get(translatorID);
					if (!existingObj) {
						PME.debug("Installing translator '" + entry.label + "'");
					}
					else {
						PME.debug("Updating translator '" + existingObj.label + "'");
						if (existingObj.file.exists()) {
							existingObj.file.remove(false);
						}
					}
					
					var fileName = PME.Translators.getFileNameFromLabel(
						entry.label, translatorID
					);
					
					var destFile = destDir.clone();
					destFile.append(fileName);
					if (destFile.exists()) {
						var msg = "Overwriting translator with same filename '"
							+ fileName + "'";
						PME.debug(msg, 1);
						Components.utils.reportError(msg + " in PME.Schema.updateBundledFiles()");
						destFile.remove(false);
					}
					
					tmpFile.moveTo(destDir, fileName);
					
					PME.wait();
				}
			}


			zipReader.close();
			if(xpiZipReader) xpiZipReader.close();
		}
		// Source installation
		else {
			var sourceDir = installLocation.clone();
			sourceDir.append(modes);
			if (!sourceDir.exists()) {
				Components.utils.reportError("No " + modes + " ZIP file or directory "
					+ " in PME.Schema.updateBundledFiles()");
				return false;
			}
			
			var entries = sourceDir.directoryEntries;
			var modTime = 0;
			var sourceFilesExist = false;
			while (entries.hasMoreElements()) {
				var file = entries.getNext();
				file.QueryInterface(Components.interfaces.nsIFile);
				// File might not exist in an source build with style symlinks
				if (!file.exists()
						|| !file.leafName.match(fileNameRE)
						|| file.isDirectory()) {
					continue;
				}
				sourceFilesExist = true;
				var fileModTime = Math.round(file.lastModifiedTime / 1000);
				if (fileModTime > modTime) {
					modTime = fileModTime;
				}
			}
			
			// Don't attempt installation for source build with missing styles
			if (!sourceFilesExist) {
				PME.debug("No source " + mode + " files exist -- skipping update");
				return false;
			}
			
			if (!forceReinstall && lastModTime && modTime <= lastModTime) {
				PME.debug("Installed " + modes + " are up-to-date with " + modes + " directory");
				return false;
			}
			
			PME.debug("Updating installed " + modes + " from " + modes + " directory");
			
			var entries = sourceDir.directoryEntries;
			while (entries.hasMoreElements()) {
				var file = entries.getNext();
				file.QueryInterface(Components.interfaces.nsIFile);
				if (!file.exists() || !file.leafName.match(fileNameRE) || file.isDirectory()) {
					continue;
				}
				var newObj = new PME[Mode](file);
				var existingObj = PME[Modes].get(newObj[mode + "ID"]);
				if (!existingObj) {
					PME.debug("Installing " + mode + " '" + newObj[titleField] + "'");
				}
				else {
					PME.debug("Updating "
						+ (existingObj.hidden ? "hidden " : "")
						+ mode + " '" + existingObj[titleField] + "'");
					if (existingObj.file.exists()) {
						existingObj.file.remove(false);
					}
				}
				
				if (mode == 'translator') {
					var fileName = PME.Translators.getFileNameFromLabel(
						newObj[titleField], newObj.translatorID
					);
				}
				
				try {
					var destFile = destDir.clone();
					destFile.append(fileName);
					if (destFile.exists()) {
						var msg = "Overwriting " + mode + " with same filename '"
							+ fileName + "'";
						PME.debug(msg, 1);
						Components.utils.reportError(msg + " in PME.Schema.updateBundledFiles()");
						destFile.remove(false);
					}
					
					if (!existingObj || !existingObj.hidden) {
						file.copyTo(destDir, fileName);
					}
					else {
						file.copyTo(hiddenDir, fileName);
					}
				}
				catch (e) {
					Components.utils.reportError("Error copying file " + fileName + ": " + e);
				}
				
				PME.wait();
			}
		}
		
		PME.DB.beginTransaction();
		
		var sql = "REPLACE INTO version VALUES (?, ?)";
		PME.DB.query(sql, [modes, modTime]);
		
		var sql = "REPLACE INTO version VALUES ('repository', ?)";
		PME.DB.query(sql, repotime);
		
		PME.DB.commitTransaction();
		
		PME[Modes].init();
		
		return true;
	}
	
	
	/**
	 * Send XMLHTTP request for updated translators and styles to the central repository
	 *
	 * @param	{Boolean}	force	Force a repository query regardless of how
	 *									long it's been since the last check
	 * @param	{Function}	callback
	 */
	this.updateFromRepository = function (force, callback) {
		if (!force){
			if (_remoteUpdateInProgress) {
				PME.debug("A remote update is already in progress -- not checking repository");
				return false;
			}
			
			// Check user preference for automatic updates
			if (!PME.Prefs.get('automaticScraperUpdates')){
				PME.debug('Automatic repository updating disabled -- not checking repository', 4);
				return false;
			}
			
			// Determine the earliest local time that we'd query the repository again
			var nextCheck = new Date();
			nextCheck.setTime((parseInt(this.getDBVersion('lastcheck'))
				+ PME_CONFIG['REPOSITORY_CHECK_INTERVAL']) * 1000); // JS uses ms
			var now = new Date();
			
			// If enough time hasn't passed, don't update
			if (now < nextCheck){
				PME.debug('Not enough time since last update -- not checking repository', 4);
				// Set the repository timer to the remaining time
				_setRepositoryTimer(Math.round((nextCheck.getTime() - now.getTime()) / 1000));
				return false;
			}
		}
		
		if (_localUpdateInProgress) {
			PME.debug('A local update is already in progress -- delaying repository check', 4);
			_setRepositoryTimer(600);
			return false;
		}
		
		if (PME.locked) {
			PME.debug('Zotero is locked -- delaying repository check', 4);
			_setRepositoryTimer(600);
			return false;
		}
		
		// If transaction already in progress, delay by ten minutes
		if (PME.DB.transactionInProgress()){
			PME.debug('Transaction in progress -- delaying repository check', 4)
			_setRepositoryTimer(600);
			return false;
		}
		
		// Get the last timestamp we got from the server
		var lastUpdated = this.getDBVersion('repository');
		
		var url = PME_CONFIG['REPOSITORY_URL'] + '/updated?'
			+ (lastUpdated ? 'last=' + lastUpdated + '&' : '')
			+ 'version=' + PME.version;
		
		PME.debug('Checking repository for updates');
		
		_remoteUpdateInProgress = true;
		
		if (force) {
			if (force == 2) {
				url += '&m=2';
			}
			else {
				url += '&m=1';
			}
		}
		

		var body = ''

		var get = PME.HTTP.doPost(url, body, function (xmlhttp) {
			var updated = _updateFromRepositoryCallback(xmlhttp, !!force);
			if (callback) {
				callback(xmlhttp, updated)
			}
		});
		
		// TODO: instead, add an observer to start and stop timer on online state change
		if (!get){
			PME.debug('Browser is offline -- skipping check');
			_setRepositoryTimer(PME_CONFIG['REPOSITORY_RETRY_INTERVAL']);
		}
	}
	
	
	this.stopRepositoryTimer = function () {
		if (_repositoryTimer){
			PME.debug('Stopping repository check timer');
			_repositoryTimer.cancel();
		}
	}
	
	
	this.resetTranslatorsAndStyles = function (callback) {
		PME.debug("Resetting translators and styles");
		
		var sql = "DELETE FROM version WHERE schema IN "
			+ "('translators', 'repository', 'lastcheck')";
		PME.DB.query(sql);
		_dbVersions.repository = null;
		_dbVersions.lastcheck = null;
		
		var translatorsDir = PME.getTranslatorsDirectory();
		translatorsDir.remove(true);
		PME.getTranslatorsDirectory(); // recreate directory
		PME.Translators.init();
		this.updateBundledFiles('translators', null, false);
	}
	
	
	this.resetTranslators = function (callback, skipUpdate) {
		PME.debug("Resetting translators");
		
		var sql = "DELETE FROM version WHERE schema IN "
			+ "('translators', 'repository', 'lastcheck')";
		PME.DB.query(sql);
		_dbVersions.repository = null;
		_dbVersions.lastcheck = null;
		
		var translatorsDir = PME.getTranslatorsDirectory();
		translatorsDir.remove(true);
		PME.getTranslatorsDirectory(); // recreate directory
		PME.Translators.init();
		this.updateBundledFiles('translators', null, true)
		.then(function () {
			if (callback) {
				callback();
			}
		})
		.done();
	}
	
	
	this.resetStyles = function (callback) {
	}
	
	
	this.integrityCheck = function (fix) {
		// Just as a sanity check, make sure combined field tables are populated,
		// so that we don't try to wipe out all data
		if (!PME.DB.valueQuery("SELECT COUNT(*) FROM fieldsCombined")
				|| !PME.DB.valueQuery("SELECT COUNT(*) FROM itemTypeFieldsCombined")) {
			return false;
		}
		
		// There should be an equivalent SELECT COUNT(*) statement for every
		// statement run by the DB Repair Tool
		var queries = [
			[
				"SELECT COUNT(*) FROM annotations WHERE itemID NOT IN (SELECT itemID FROM items)",
				"DELETE FROM annotations WHERE itemID NOT IN (SELECT itemID FROM items)"
			],
			[
				"SELECT COUNT(*) FROM collectionItems WHERE itemID NOT IN (SELECT itemID FROM items)",
				"DELETE FROM collectionItems WHERE itemID NOT IN (SELECT itemID FROM items)"
			],
			[
				"SELECT COUNT(*) FROM fulltextItems WHERE itemID NOT IN (SELECT itemID FROM items)",
				"DELETE FROM fulltextItems WHERE itemID NOT IN (SELECT itemID FROM items)"
			],
			[
				"SELECT COUNT(*) FROM fulltextItemWords WHERE itemID NOT IN (SELECT itemID FROM items)",
				"DELETE FROM fulltextItemWords WHERE itemID NOT IN (SELECT itemID FROM items)",
			],
			[
				"SELECT COUNT(*) FROM fulltextItemWords WHERE itemID NOT IN (SELECT itemID FROM fulltextItems)",
				"DELETE FROM fulltextItemWords WHERE itemID NOT IN (SELECT itemID FROM fulltextItems)",
			],
			[
				"SELECT COUNT(*) FROM highlights WHERE itemID NOT IN (SELECT itemID FROM items)",
				"DELETE FROM highlights WHERE itemID NOT IN (SELECT itemID FROM items)",
			],
			[
				"SELECT COUNT(*) FROM itemAttachments WHERE itemID NOT IN (SELECT itemID FROM items)",
				"DELETE FROM itemAttachments WHERE itemID NOT IN (SELECT itemID FROM items)",
			],
			[
				"SELECT COUNT(*) FROM itemCreators WHERE itemID NOT IN (SELECT itemID FROM items)",
				"DELETE FROM itemCreators WHERE itemID NOT IN (SELECT itemID FROM items)",
			],
			[
				"SELECT COUNT(*) FROM itemData WHERE itemID NOT IN (SELECT itemID FROM items)",
				"DELETE FROM itemData WHERE itemID NOT IN (SELECT itemID FROM items)",
			],
			[
				"SELECT COUNT(*) FROM itemNotes WHERE itemID NOT IN (SELECT itemID FROM items)",
				"DELETE FROM itemNotes WHERE itemID NOT IN (SELECT itemID FROM items)",
			],
			[
				"SELECT COUNT(*) FROM itemSeeAlso WHERE itemID NOT IN (SELECT itemID FROM items)",
				"DELETE FROM itemSeeAlso WHERE itemID NOT IN (SELECT itemID FROM items)",
			],
			[
				"SELECT COUNT(*) FROM itemSeeAlso WHERE linkedItemID NOT IN (SELECT itemID FROM items)",
				"DELETE FROM itemSeeAlso WHERE linkedItemID NOT IN (SELECT itemID FROM items)",
			],
			[
				"SELECT COUNT(*) FROM itemTags WHERE itemID NOT IN (SELECT itemID FROM items)",
				"DELETE FROM itemTags WHERE itemID NOT IN (SELECT itemID FROM items)",
			],
			[
				"SELECT COUNT(*) FROM itemTags WHERE tagID NOT IN (SELECT tagID FROM tags)",
				"DELETE FROM itemTags WHERE tagID NOT IN (SELECT tagID FROM tags)",
			],
			[
				"SELECT COUNT(*) FROM savedSearchConditions WHERE savedSearchID NOT IN (select savedSearchID FROM savedSearches)",
				"DELETE FROM savedSearchConditions WHERE savedSearchID NOT IN (select savedSearchID FROM savedSearches)",
			],
			[
				"SELECT COUNT(*) FROM items WHERE itemTypeID IS NULL",
				"DELETE FROM items WHERE itemTypeID IS NULL",
			],
			
			
			[
				"SELECT COUNT(*) FROM itemData WHERE valueID NOT IN (SELECT valueID FROM itemDataValues)",
				"DELETE FROM itemData WHERE valueID NOT IN (SELECT valueID FROM itemDataValues)",
			],
			[
				"SELECT COUNT(*) FROM fulltextItemWords WHERE wordID NOT IN (SELECT wordID FROM fulltextWords)",
				"DELETE FROM fulltextItemWords WHERE wordID NOT IN (SELECT wordID FROM fulltextWords)",
			],
			[
				"SELECT COUNT(*) FROM collectionItems WHERE collectionID NOT IN (SELECT collectionID FROM collections)",
				"DELETE FROM collectionItems WHERE collectionID NOT IN (SELECT collectionID FROM collections)",
			],
			[
				"SELECT COUNT(*) FROM itemCreators WHERE creatorID NOT IN (SELECT creatorID FROM creators)",
				"DELETE FROM itemCreators WHERE creatorID NOT IN (SELECT creatorID FROM creators)",
			],
			[
				"SELECT COUNT(*) FROM itemData WHERE fieldID NOT IN (SELECT fieldID FROM fieldsCombined)",
				"DELETE FROM itemData WHERE fieldID NOT IN (SELECT fieldID FROM fieldsCombined)",
			],
			[
				"SELECT COUNT(*) FROM itemData WHERE valueID NOT IN (SELECT valueID FROM itemDataValues)",
				"DELETE FROM itemData WHERE valueID NOT IN (SELECT valueID FROM itemDataValues)",
			],
			
			
			// Attachments row with itemTypeID != 14
			[
				"SELECT COUNT(*) FROM itemAttachments JOIN items USING (itemID) WHERE itemTypeID != 14",
				"UPDATE items SET itemTypeID=14, clientDateModified=CURRENT_TIMESTAMP WHERE itemTypeID != 14 AND itemID IN (SELECT itemID FROM itemAttachments)",
			],
			// Fields not in type
			[
				"SELECT COUNT(*) FROM itemData WHERE fieldID NOT IN (SELECT fieldID FROM itemTypeFieldsCombined WHERE itemTypeID=(SELECT itemTypeID FROM items WHERE itemID=itemData.itemID))",
				"DELETE FROM itemData WHERE fieldID NOT IN (SELECT fieldID FROM itemTypeFieldsCombined WHERE itemTypeID=(SELECT itemTypeID FROM items WHERE itemID=itemData.itemID))",
			],
			// Missing itemAttachments row
			[
				"SELECT COUNT(*) FROM items WHERE itemTypeID=14 AND itemID NOT IN (SELECT itemID FROM itemAttachments)",
				"INSERT INTO itemAttachments (itemID, linkMode) SELECT itemID, 0 FROM items WHERE itemTypeID=14 AND itemID NOT IN (SELECT itemID FROM itemAttachments)",
			],
			// Note/child parents
			[
				"SELECT COUNT(*) FROM itemAttachments WHERE sourceItemID IN (SELECT itemID FROM items WHERE itemTypeID IN (1,14))",
				"UPDATE itemAttachments SET sourceItemID=NULL WHERE sourceItemID IN (SELECT itemID FROM items WHERE itemTypeID IN (1,14))",
			],
			[
				"SELECT COUNT(*) FROM itemNotes WHERE sourceItemID IN (SELECT itemID FROM items WHERE itemTypeID IN (1,14))",
				"UPDATE itemNotes SET sourceItemID=NULL WHERE sourceItemID IN (SELECT itemID FROM items WHERE itemTypeID IN (1,14))",
			],
			
			// Wrong library tags
			[
				"SELECT COUNT(*) FROM tags NATURAL JOIN itemTags JOIN items USING (itemID) WHERE IFNULL(tags.libraryID, 0)!=IFNULL(items.libraryID,0)",
				[
					"CREATE TEMPORARY TABLE tmpWrongLibraryTags AS SELECT itemTags.ROWID AS tagRowID, tagID, name, itemID, IFNULL(tags.libraryID,0) AS tagLibraryID, IFNULL(items.libraryID,0) AS itemLibraryID FROM tags NATURAL JOIN itemTags JOIN items USING (itemID) WHERE IFNULL(tags.libraryID, 0)!=IFNULL(items.libraryID,0)",
					"DELETE FROM itemTags WHERE ROWID IN (SELECT tagRowID FROM tmpWrongLibraryTags)",
					"DROP TABLE tmpWrongLibraryTags"
				]
			],
			[
				"SELECT COUNT(*) FROM itemTags WHERE tagID IS NULL",
				"DELETE FROM itemTags WHERE tagID IS NULL",
			],
			[
				"SELECT COUNT(*) FROM itemAttachments WHERE charsetID='NULL'",
				"UPDATE itemAttachments SET charsetID=NULL WHERE charsetID='NULL'",
			],
			
			// Reported by one user
			// http://forums.PME.org/discussion/19347/continual-synching-error-message/
			// TODO: check 'libraries', not 'groups', but first add a
			// migration step to delete 'libraries' rows not in 'groups'
			//"SELECT COUNT(*) FROM syncDeleteLog WHERE libraryID != 0 AND libraryID NOT IN (SELECT libraryID FROM libraries)"
			[
				"SELECT COUNT(*) FROM syncDeleteLog WHERE libraryID != 0 AND libraryID NOT IN (SELECT libraryID FROM groups)",
				"DELETE FROM syncDeleteLog WHERE libraryID != 0 AND libraryID NOT IN (SELECT libraryID FROM libraries)",
			],
			
			
			// Delete empty creators
			// This may cause itemCreator gaps, but that's better than empty creators
			[
				"SELECT COUNT(*) FROM creatorData WHERE firstName='' AND lastName=''",
				[
					"DELETE FROM itemCreators WHERE creatorID IN (SELECT creatorID FROM creators WHERE creatorDataID IN (SELECT creatorDataID FROM creatorData WHERE firstName='' AND lastName=''))",
					"DELETE FROM creators WHERE creatorDataID IN (SELECT creatorDataID FROM creatorData WHERE firstName='' AND lastName='')",
					"DELETE FROM creatorData WHERE firstName='' AND lastName=''"
				],
			],
			
			// Non-attachment items in the full-text index
			[
				"SELECT COUNT(*) FROM fulltextItemWords WHERE itemID NOT IN (SELECT itemID FROM items WHERE itemTypeID=14)",
				[
					"DELETE FROM fulltextItemWords WHERE itemID NOT IN (SELECT itemID FROM items WHERE itemTypeID=14)",
					"SELECT 1"
				]
			],
			[
				"SELECT COUNT(*) FROM fulltextItems WHERE itemID NOT IN (SELECT itemID FROM items WHERE itemTypeID=14)",
				"DELETE FROM fulltextItems WHERE itemID NOT IN (SELECT itemID FROM items WHERE itemTypeID=14)"
			],
			[
				"SELECT COUNT(*) FROM syncedSettings WHERE libraryID != 0 AND libraryID NOT IN (SELECT libraryID FROM libraries)",
				"DELETE FROM syncedSettings WHERE libraryID != 0 AND libraryID NOT IN (SELECT libraryID FROM libraries)"
			]
		];
		
		for each(var sql in queries) {
			if (PME.DB.valueQuery(sql[0])) {
				PME.debug("Test failed!", 1);
				
				if (fix) {
					try {
						// Single query
						if (typeof sql[1] == 'string') {
							PME.DB.valueQuery(sql[1]);
						}
						// Multiple queries
						else {
							for each(var s in sql[1]) {
								PME.DB.valueQuery(s);
							}
						}
						continue;
					}
					catch (e) {
						PME.debug(e);
						Components.utils.reportError(e);
					}
				}
				
				return false;
			}
		}
		
		return true;
	}
	
	
	/////////////////////////////////////////////////////////////////
	//
	// Private methods
	//
	/////////////////////////////////////////////////////////////////
	
	/*
	 * Retrieve the version from the top line of the schema SQL file
	 */
	function _getSchemaSQLVersion(schema){
		// TEMP
		if (schema == 'userdata2') {
			schema = 'userdata';
			var newUserdata = true;
		}
		var sql = _getSchemaSQL(schema);
		
		// Fetch the schema version from the first line of the file
		var schemaVersion = parseInt(sql.match(/^-- ([0-9]+)/)[1]);
		
		// TEMP: For 'userdata', cap the version at 76
		// For 'userdata2', versions > 76 are allowed.
		if (schema == 'userdata' && !newUserdata) {
			schemaVersion = Math.min(76, schemaVersion);
		}
		
		_schemaVersions[schema] = schemaVersion;
		return schemaVersion;
	}
	
	
	/*
	 * Load in SQL schema
	 *
	 * Returns the contents of an SQL file for feeding into query()
	 */
	function _getSchemaSQL(schema){
		if (!schema){
			throw ('Schema type not provided to _getSchemaSQL()');
		}
		
		return PME.File.getContentsFromURL("resource://pme/schema/"+schema+".sql");
	}
	
	
	/*
	 * Determine the SQL statements necessary to drop the tables and indexed
	 * in a given schema file
	 *
	 * NOTE: This is not currently used.
	 *
	 * Returns the SQL statements as a string for feeding into query()
	 */
	function _getDropCommands(schema){
		var sql = _getSchemaSQL(schema);
		
		const re = /(?:[\r\n]|^)CREATE (TABLE|INDEX) IF NOT EXISTS ([^\s]+)/;
		var m, str="";
		while(matches = re.exec(sql)) {
			str += "DROP " + matches[1] + " IF EXISTS " + matches[2] + ";\n";
		}
		
		return str;
	}
	
	
	/*
	 * Create new DB schema
	 */
	function _initializeSchema(){
		PME.DB.beginTransaction();
		try {
			// Enable auto-vacuuming
			PME.DB.query("PRAGMA page_size = 4096");
			PME.DB.query("PRAGMA encoding = 'UTF-8'");
			PME.DB.query("PRAGMA auto_vacuum = 1");
			PME.DB.commitTransaction();
			self.dbInitialized = true;
		}
		catch(e){
			PME.debug(e, 1);
			PME.logError(e);
			PME.DB.rollbackTransaction();
			alert('Error initializing Zotero database');
			throw(e);
		}
		_migrateUserDataSchema();
		PME.Schema.updateBundledFiles(null, null, true)
		.catch(function (e) {
			PME.debug(e);
			PME.logError(e);
			alert('Error updating Zotero translators and styles');
		});
	}
	
	
	/*
	 * Update a DB schema version tag in an existing database
	 */
	function _updateDBVersion(schema, version){
		_dbVersions[schema] = version;
		var sql = "REPLACE INTO version (schema,version) VALUES (?,?)";
		return PME.DB.query(sql, [{'string':schema},{'int':version}]);
	}
	
	
	function _updateSchema(schema){
		var dbVersion = PME.Schema.getDBVersion(schema);
		var schemaVersion = _getSchemaSQLVersion(schema);
		
		if (dbVersion == schemaVersion){
			return false;
		}
		else if (dbVersion < schemaVersion){
			PME.DB.beginTransaction();
			try {
				PME.DB.query(_getSchemaSQL(schema));
				_updateDBVersion(schema, schemaVersion);
				PME.DB.commitTransaction();
			}
			catch (e){
				PME.debug(e, 1);
				PME.DB.rollbackTransaction();
				throw(e);
			}
			return true;
		}
		
		throw ("Zotero '" + schema + "' DB version (" + dbVersion
			+ ") is newer than SQL file (" + schemaVersion + ")");
	}
	
	
	/**
	* Process the response from the repository
	**/
	function _updateFromRepositoryCallback(xmlhttp, manual){
		if (!xmlhttp.responseXML){
			try {
				if (xmlhttp.status>1000){
					PME.debug('No network connection', 2);
				}
				else {
					PME.debug('Invalid response from repository', 2);
				}
			}
			catch (e){
				PME.debug('Repository cannot be contacted');
			}
			
			if (!manual){
				_setRepositoryTimer(PME_CONFIG['REPOSITORY_RETRY_INTERVAL']);
			}
			
			_remoteUpdateInProgress = false;
			return false;
		}
		
		var currentTime = xmlhttp.responseXML.
			getElementsByTagName('currentTime')[0].firstChild.nodeValue;
		var translatorUpdates = xmlhttp.responseXML.getElementsByTagName('translator');
		var styleUpdates = xmlhttp.responseXML.getElementsByTagName('style');
		
		PME.DB.beginTransaction();
		
		// TODO: clear DB version 'sync' from removed _updateDBVersion()
		
		// Store the timestamp provided by the server
		_updateDBVersion('repository', currentTime);
		
		if (!manual){
			// And the local timestamp of the update time
			var d = new Date();
			_updateDBVersion('lastcheck', Math.round(d.getTime()/1000)); // JS uses ms
		}
		
		if (!translatorUpdates.length && !styleUpdates.length){
			PME.debug('All translators and styles are up-to-date');
			PME.DB.commitTransaction();
			if (!manual){
				_setRepositoryTimer(PME_CONFIG['REPOSITORY_CHECK_INTERVAL']);
			}
			_remoteUpdateInProgress = false;
			return -1;
		}
		
		try {
			for (var i=0, len=translatorUpdates.length; i<len; i++){
				_translatorXMLToFile(translatorUpdates[i]);
			}
			
			// Rebuild caches
			PME.Translators.init();
		}
		catch (e) {
			PME.debug(e, 1);
			PME.DB.rollbackTransaction();
			if (!manual){
				_setRepositoryTimer(PME_CONFIG['REPOSITORY_RETRY_INTERVAL']);
			}
			_remoteUpdateInProgress = false;
			return false;
		}
		
		PME.DB.commitTransaction();
		if (!manual){
			_setRepositoryTimer(PME_CONFIG['REPOSITORY_CHECK_INTERVAL']);
		}
		_remoteUpdateInProgress = false;
		return true;
	}
	
	
	/**
	* Set the interval between repository queries
	*
	* We add an additional two seconds to avoid race conditions
	**/
	function _setRepositoryTimer(interval){
		if (!interval){
			interval = PME_CONFIG['REPOSITORY_CHECK_INTERVAL'];
		}
		
		var fudge = 2; // two seconds
		var displayInterval = interval + fudge;
		var interval = (interval + fudge) * 1000; // convert to ms
		
		if (!_repositoryTimer || _repositoryTimer.delay!=interval){
			PME.debug('Setting repository check interval to ' + displayInterval + ' seconds');
			_repositoryTimer = Components.classes["@mozilla.org/timer;1"].
				createInstance(Components.interfaces.nsITimer);
			_repositoryTimer.initWithCallback({
				// implements nsITimerCallback
				notify: function(timer){
					PME.Schema.updateFromRepository();
				}
			}, interval, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		}
	}
	
	
	/**
	* Traverse an XML translator node from the repository and
	* update the local translators folder with the translator data
	**/
	function _translatorXMLToFile(xmlnode) {
		// Don't split >4K chunks into multiple nodes
		// https://bugzilla.mozilla.org/show_bug.cgi?id=194231
		xmlnode.normalize();
		var translatorID = xmlnode.getAttribute('id');
		var translator = PME.Translators.get(translatorID);
		
		// Delete local version of remote translators with priority 0
		if (xmlnode.getElementsByTagName('priority')[0].firstChild.nodeValue === "0") {
			if (translator && translator.file.exists()) {
				PME.debug("Deleting translator '" + translator.label + "'");
				translator.file.remove(false);
			}
			return false;
		}
		
		var metadata = {
			translatorID: translatorID,
			translatorType: parseInt(xmlnode.getAttribute('type')),
			label: xmlnode.getElementsByTagName('label')[0].firstChild.nodeValue,
			creator: xmlnode.getElementsByTagName('creator')[0].firstChild.nodeValue,
			target: (xmlnode.getElementsByTagName('target').item(0) &&
						xmlnode.getElementsByTagName('target')[0].firstChild)
					? xmlnode.getElementsByTagName('target')[0].firstChild.nodeValue
					: null,
			minVersion: xmlnode.getAttribute('minVersion'),
			maxVersion: xmlnode.getAttribute('maxVersion'),
			priority: parseInt(
				xmlnode.getElementsByTagName('priority')[0].firstChild.nodeValue
			),
			inRepository: true,
		};
		
		var browserSupport = xmlnode.getAttribute('browserSupport');
		if (browserSupport) {
			metadata.browserSupport = browserSupport;
		}
		
		for each(var attr in ["configOptions", "displayOptions", "hiddenPrefs"]) {
			try {
				var tags = xmlnode.getElementsByTagName(attr);
				if(tags.length && tags[0].firstChild) {
					metadata[attr] = JSON.parse(tags[0].firstChild.nodeValue);
				}
			} catch(e) {
				PME.logError("Invalid JSON for "+attr+" in new version of "+metadata.label+" ("+translatorID+") from repository");
				return;
			}
		}
		
		metadata.lastUpdated = xmlnode.getAttribute('lastUpdated');
		
		// detectCode can not exist or be empty
		var detectCode = (xmlnode.getElementsByTagName('detectCode').item(0) &&
					xmlnode.getElementsByTagName('detectCode')[0].firstChild)
				? xmlnode.getElementsByTagName('detectCode')[0].firstChild.nodeValue
				: null;
		var code = xmlnode.getElementsByTagName('code')[0].firstChild.nodeValue;
		code = (detectCode ? detectCode + "\n\n" : "") + code;
		
		return PME.Translators.save(metadata, code);
	}

	/*
	 * Migrate user data schema from an older version, preserving data
	 */
	function _migrateUserDataSchema(){

		PME.DB.beginTransaction();
		
		try {

			PME.DB.query("DROP TABLE IF EXISTS translatorCache");
			PME.DB.query("CREATE TABLE translatorCache (\n	leafName TEXT PRIMARY KEY,\n	translatorJSON TEXT,\n	code TEXT,\n	lastModifiedTime INT\n)");
			PME.DB.query("DROP TABLE IF EXISTS version");
			PME.DB.query("CREATE TABLE version (schema TEXT PRIMARY KEY,version INT NOT NULL); CREATE INDEX schema ON version(schema);");
			PME.DB.commitTransaction();
		}
		catch (e) {
			PME.DB.rollbackTransaction();
			PME.debug(e);
		}
		
		return true;
	}
}
