var PME = {};
/*
 ***** BEGIN LICENSE BLOCK *****

 Copyright © 2009 Center for History and New Media
 George Mason University, Fairfax, Virginia, USA
 http://zotero.org

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

const PME_CONFIG = {
	GUID: 'refworks@proquest.com',
	DB_REBUILD: false, // erase DB and recreate from schema
	REPOSITORY_URL: 'https://repo.zotero.org/repo',
	REPOSITORY_CHECK_INTERVAL: 86400, // 24 hours
	REPOSITORY_RETRY_INTERVAL: 3600, // 1 hour
	BASE_URI: 'http://zotero.org/',
	WWW_BASE_URL: 'http://www.zotero.org/',
	PROXY_AUTH_URL: 'http://zotero.org.s3.amazonaws.com/proxy-auth',
	SYNC_URL: 'http://refworks.proquest.com',
	API_URL: 'http://refworks.proquest.com',
	API_VERSION: 2,
	PREF_BRANCH: 'extensions.pme.',
	BOOKMARKLET_ORIGIN: 'http://pme.proquest.com',
	HTTP_BOOKMARKLET_ORIGIN: 'http://pme.proquest.com',
	BOOKMARKLET_URL: 'http://pme.proquest.com',
	VERSION: "4.0.22.SOURCE"
};


// Commonly used imports accessible anywhere
Components.utils.import("resource://pme/q.js");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

/*
 * Core functions
 */
(function () {
	// Privileged (public) methods
	this.init = init;
	this.stateCheck = stateCheck;
	this.getProfileDirectory = getProfileDirectory;
	this.getZoteroDirectory = getZoteroDirectory;
	this.getStorageDirectory = getStorageDirectory;
	this.getZoteroDatabase = getZoteroDatabase;
	this.chooseZoteroDirectory = chooseZoteroDirectory;
	this.debug = debug;
	this.log = log;
	this.logError = logError;
	this.getErrors = getErrors;
	this.getSystemInfo = getSystemInfo;
	this.safeDebug = safeDebug;
	this.getString = getString;
	this.localeJoin = localeJoin;
	this.setFontSize = setFontSize;
	this.flattenArguments = flattenArguments;
	this.getAncestorByTagName = getAncestorByTagName;
	this.join = join;
	this.randomString = randomString;
	this.moveToUnique = moveToUnique;

	// Public properties
	this.initialized = false;
	this.skipLoading = false;
	this.startupError;
	this.__defineGetter__("startupErrorHandler", function () {
		return _startupErrorHandler;
	});
	this.version;
	this.platform;
	this.locale;
	this.dir; // locale direction: 'ltr' or 'rtl'
	this.isMac;
	this.isWin;
	this.initialURL; // used by Schema to show the changelog on upgrades


	this.__defineGetter__('userID', function () {
		if (_userID !== undefined) return _userID;
		var sql = "SELECT value FROM settings WHERE "
			+ "setting='account' AND key='userID'";
		return _userID = PME.DB.valueQuery(sql);
	});

	this.__defineSetter__('userID', function (val) {
		var sql = "REPLACE INTO settings VALUES ('account', 'userID', ?)";
		PME.DB.query(sql, parseInt(val));
		_userID = val;
	});

	this.__defineGetter__('libraryID', function () {
		if (_libraryID !== undefined) return _libraryID;
		var sql = "SELECT value FROM settings WHERE "
			+ "setting='account' AND key='libraryID'";
		return _libraryID = PME.DB.valueQuery(sql);
	});

	this.__defineSetter__('libraryID', function (val) {
		var sql = "REPLACE INTO settings VALUES ('account', 'libraryID', ?)";
		PME.DB.query(sql, parseInt(val));
		_libraryID = val;
	});

	this.__defineGetter__('username', function () {
		var sql = "SELECT value FROM settings WHERE "
			+ "setting='account' AND key='username'";
		return PME.DB.valueQuery(sql);
	});

	this.__defineSetter__('username', function (val) {
		var sql = "REPLACE INTO settings VALUES ('account', 'username', ?)";
		PME.DB.query(sql, val);
	});

	this.getActiveZoteroPane = function () {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
			.getService(Components.interfaces.nsIWindowMediator);
		var win = wm.getMostRecentWindow("navigator:browser");
		return win.ZoteroPane;
	};

	this.getLocalUserKey = function (generate) {
		if (_localUserKey) {
			return _localUserKey;
		}

		var sql = "SELECT value FROM settings WHERE "
			+ "setting='account' AND key='localUserKey'";
		var key = PME.DB.valueQuery(sql);

		// Generate a local user key if we don't have a global library id
		if (!key && generate) {
			key = PME.randomString(8);
			var sql = "INSERT INTO settings VALUES ('account', 'localUserKey', ?)";
			PME.DB.query(sql, key);
		}
		_localUserKey = key;
		return key;
	};

	/**
	 * @property    {Boolean}    waiting        Whether Zotero is waiting for other
	 *                                        main thread events to be processed
	 */
	this.__defineGetter__('waiting', function ()
	_waiting
	)
	;

	/**
	 * @property    {Boolean}    locked        Whether all Zotero panes are locked
	 *                                        with an overlay
	 */
	this.__defineGetter__('locked', function ()
	_locked
	)
	;

	/**
	 * @property    {Boolean}    suppressUIUpdates    Don't update UI on Notifier triggers
	 */
	this.suppressUIUpdates = false;

	/**
	 * @property    {Boolean}    closing        True if the application is closing.
	 */
	this.closing = false;

	var _startupErrorHandler;
	var _zoteroDirectory = false;
	var _localizedStringBundle;
	var _userID;
	var _libraryID;
	var _localUserKey;
	var _waiting = 0;

	var _locked;
	var _unlockCallbacks = [];
	var _shutdownListeners = [];
	var _progressMeters;
	var _progressPopup;
	var _lastPercentage;

	// whether we are waiting for another Zotero process to release its DB lock
	var _waitingForDBLock = false;

	/**
	 * Maintains nsITimers to be used when PME.wait() completes (to reduce performance penalty
	 * of initializing new objects)
	 */
	var _waitTimers = [];

	/**
	 * Maintains nsITimerCallbacks to be used when PME.wait() completes
	 */
	var _waitTimerCallbacks = [];

	/**
	 * Maintains running nsITimers in global scope, so that they don't disappear randomly
	 */
	var _runningTimers = [];

	// Errors that were in the console at startup
	var _startupErrors = [];
	// Number of errors to maintain in the recent errors buffer
	const ERROR_BUFFER_SIZE = 25;
	// A rolling buffer of the last ERROR_BUFFER_SIZE errors
	var _recentErrors = [];

	/**
	 * Initialize the extension
	 */
	function init(options) {
		if (this.initialized || this.skipLoading) {
			return false;
		}

		// Load in the preferences branch for the extension
		PME.Prefs.init();
		PME.Debug.init(options && options.forceDebugLog);

		if (options) {
			if (options.openPane) this.openPane = true;
		}

		this.mainThread = Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread;

		var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
			.getService(Components.interfaces.nsIXULAppInfo);
		this.platformVersion = appInfo.platformVersion;
		this.platformMajorVersion = parseInt(appInfo.platformVersion.match(/^[0-9]+/)[0]);
		this.isFx = true;

		this.isStandalone = appInfo.ID == PME_CONFIG['GUID'];
		if (this.isStandalone) {
			this.version = appInfo.version;
		} else {
			// Use until we collect version from extension manager
			this.version = PME_CONFIG['VERSION'];

			Components.utils.import("resource://gre/modules/AddonManager.jsm");
			AddonManager.getAddonByID(PME_CONFIG['GUID'],
				function (addon) {
					PME.version = addon.version;
				});
		}

		// OS platform
		var win = Components.classes["@mozilla.org/appshell/appShellService;1"]
			.getService(Components.interfaces.nsIAppShellService)
			.hiddenDOMWindow;
		this.platform = win.navigator.platform;
		this.isMac = (this.platform.substr(0, 3) == "Mac");
		this.isWin = (this.platform.substr(0, 3) == "Win");
		this.isLinux = (this.platform.substr(0, 5) == "Linux");
		this.oscpu = win.navigator.oscpu;

		// Browser
		PME.browser = "g";

		// Locale
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService),
			uaPrefs = prefs.getBranch("general.useragent.");
		try {
			this.locale = uaPrefs.getComplexValue("locale", Components.interfaces.nsIPrefLocalizedString);
		} catch (e) {
		}

		if (this.locale) {
			this.locale = this.locale.toString();
		} else {
			this.locale = uaPrefs.getCharPref("locale");
		}

		if (this.locale.length == 2) {
			this.locale = this.locale + '-' + this.locale.toUpperCase();
		}

		// Load in the localization stringbundle for use by getString(name)
		var stringBundleService =
			Components.classes["@mozilla.org/intl/stringbundle;1"]
				.getService(Components.interfaces.nsIStringBundleService);
		var localeService = Components.classes['@mozilla.org/intl/nslocaleservice;1'].
			getService(Components.interfaces.nsILocaleService);
		var appLocale = localeService.getApplicationLocale();

		_localizedStringBundle = stringBundleService.createBundle(
			"chrome://pme/locale/zotero.properties", appLocale);

		// Also load the brand as appName
		var brandBundle = stringBundleService.createBundle(
			"chrome://branding/locale/brand.properties", appLocale);
		this.appName = brandBundle.GetStringFromName("brandShortName");

		// Set the locale direction to PME.dir
		// DEBUG: is there a better way to get the entity from JS?
		var xmlhttp = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
			.createInstance();
		xmlhttp.open('GET', 'chrome://global/locale/global.dtd', false);
		xmlhttp.overrideMimeType('text/plain');
		xmlhttp.send(null);
		var matches = xmlhttp.responseText.match(/(ltr|rtl)/);
		if (matches && matches[0] == 'rtl') {
			PME.dir = 'rtl';
		}
		else {
			PME.dir = 'ltr';
		}

		// Make sure that Zotero Standalone is not running as root
		if (PME.isStandalone && !PME.isWin) _checkRoot();

		try {
			var dataDir = PME.getZoteroDirectory();
		}
		catch (e) {
			// Zotero dir not found
			if (e.name == 'NS_ERROR_FILE_NOT_FOUND') {
				PME.startupError = PME.getString('dataDir.notFound');
				_startupErrorHandler = function () {
					var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
						createInstance(Components.interfaces.nsIPromptService);
					var buttonFlags = (ps.BUTTON_POS_0) * (ps.BUTTON_TITLE_OK)
						+ (ps.BUTTON_POS_1) * (ps.BUTTON_TITLE_IS_STRING)
						+ (ps.BUTTON_POS_2) * (ps.BUTTON_TITLE_IS_STRING);
					var index = ps.confirmEx(null,
						PME.getString('general.error'),
							PME.startupError + '\n\n' +
							PME.getString('dataDir.previousDir') + ' '
							+ PME.Prefs.get('lastDataDir'),
						buttonFlags, null,
						PME.getString('dataDir.useProfileDir', PME.appName),
						PME.getString('general.locate'),
						null, {});

					// Revert to profile directory
					if (index == 1) {
						PME.chooseZoteroDirectory(false, true);
					}
					// Locate data directory
					else if (index == 2) {
						PME.chooseZoteroDirectory();
					}
				}
				return;
			} else if (e.name == "ZOTERO_DIR_MAY_EXIST") {
				var app = PME.isStandalone ? PME.getString('app.standalone') : PME.getString('app.firefox');
				var altApp = !PME.isStandalone ? PME.getString('app.standalone') : PME.getString('app.firefox');

				var message = PME.getString("dataDir.standaloneMigration.description", [app, altApp]);
				if (e.multipleProfiles) {
					message += "\n\n" + PME.getString("dataDir.standaloneMigration.multipleProfiles", [app, altApp]);
				}

				var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
					createInstance(Components.interfaces.nsIPromptService);
				var buttonFlags = (ps.BUTTON_POS_0) * (ps.BUTTON_TITLE_YES)
					+ (ps.BUTTON_POS_1) * (ps.BUTTON_TITLE_NO)
					+ (ps.BUTTON_POS_2) * (ps.BUTTON_TITLE_IS_STRING);
				var index = ps.confirmEx(null, PME.getString("dataDir.standaloneMigration.title"), message,
					buttonFlags, null, null,
					PME.getString('dataDir.standaloneMigration.selectCustom'),
					null, {});

				// Migrate data directory
				if (index == 0) {
					// copy prefs
					var prefsFile = e.profile.clone();
					prefsFile.append("prefs.js");
					if (prefsFile.exists()) {
						// build sandbox
						var sandbox = new Components.utils.Sandbox("http://www.example.com/");
						Components.utils.evalInSandbox(
								"var prefs = {};" +
								"function user_pref(key, val) {" +
								"prefs[key] = val;" +
								"}"
							, sandbox);

						// remove comments
						var prefsJs = PME.File.getContents(prefsFile);
						prefsJs = prefsJs.replace(/^#[^\r\n]*$/mg, "");

						// evaluate
						Components.utils.evalInSandbox(prefsJs, sandbox);
						var prefs = sandbox.prefs;
						for (var key in prefs) {
							if (key.substr(0, PME_CONFIG.PREF_BRANCH.length) === PME_CONFIG.PREF_BRANCH
								&& key !== "extensions.zotero.firstRun2") {
								PME.Prefs.set(key.substr(PME_CONFIG.PREF_BRANCH.length), prefs[key]);
							}
						}
					}

					// also set data dir if no custom data dir is now defined
					if (!PME.Prefs.get("useDataDir")) {
						var dir = e.dir.QueryInterface(Components.interfaces.nsILocalFile);
						PME.Prefs.set('dataDir', dir.persistentDescriptor);
						PME.Prefs.set('lastDataDir', dir.path);
						PME.Prefs.set('useDataDir', true);
					}
				}
				// Create new data directory
				else if (index == 1) {
					PME.File.createDirectoryIfMissing(e.curDir);
				}
				// Locate new data directory
				else if (index == 2) {
					PME.chooseZoteroDirectory(true);
				}
			}
			// DEBUG: handle more startup errors
			else {
				throw (e);
				return false;
			}
		}
try {
	PME.MIMETypeHandler.init();
	PME.Proxies.init();

}catch(e){PME.debug(e.message);}

		// Register shutdown handler to call PME.shutdown()
		var _shutdownObserver = {observe: function () {
			PME.shutdown().done()
		}};
		Services.obs.addObserver(_shutdownObserver, "quit-application", false);

		var cs = Components.classes["@mozilla.org/consoleservice;1"].
			getService(Components.interfaces.nsIConsoleService);
		// Get startup errors
		try {
			var messages = {};
			cs.getMessageArray(messages, {});
			_startupErrors = [msg for each(msg in messages.value) if(_shouldKeepError(msg))];
		} catch (e) {
			PME.logError(e);
		}
		// Register error observer
		cs.registerListener(ConsoleListener);

		// Add shutdown listener to remove quit-application observer and console listener
		this.addShutdownListener(function () {
			Services.obs.removeObserver(_shutdownObserver, "quit-application", false);
			cs.unregisterListener(ConsoleListener);
		});

		// Load additional info for connector or not
		if (PME.isConnector) {
			PME.debug("Loading in connector mode");
			PME.Connector_Types.init();

			// Store a startupError until we get information from Zotero Standalone
			PME.startupError = PME.getString("connector.loadInProgress")

			if (PME.isFirstLoadThisSession) {
				PME.initComplete();
			}
		} else {
			PME.debug("Loading in full mode");
			if (!_initFull()) return false;
			if (PME.isStandalone) PME.Standalone.init();
			PME.initComplete();
		}

		return true;
	}

	/**
	 * Triggers events when initialization finishes
	 */
	this.initComplete = function () {
		if (PME.initialized) return;
		this.initialized = true;
		delete this.startupError;

	}

	/**
	 * Initialization function to be called only if Zotero is in full mode
	 */
	function _initFull() {

		if (!_initDB()) return false;

		PME.Schema.updateSchema();

		PME.HTTP.triggerProxyAuth();

		return true;
	}

	/**
	 * Initializes the DB connection
	 */
	function _initDB(haveReleasedLock) {
		try {
			// Test read access
			PME.DB.test();

			var dbfile = PME.getZoteroDatabase();

			// Test write access on Zotero data directory
			if (!dbfile.parent.isWritable()) {
				var msg = 'Cannot write to ' + dbfile.parent.path + '/';
			}
			// Test write access on Zotero database
			else if (!dbfile.isWritable()) {
				var msg = 'Cannot write to ' + dbfile.path;
			}
			else {
				var msg = false;
			}

			if (msg) {
				var e = {
					name: 'NS_ERROR_FILE_ACCESS_DENIED',
					message: msg,
					toString: function () {
						return PME.name + ': ' + PME.message;
					}
				};
				throw (e);
			}
		}
		catch (e) {
			if (e.name == 'NS_ERROR_FILE_ACCESS_DENIED') {
				var msg = PME.localeJoin([
					PME.getString('startupError.databaseCannotBeOpened'),
					PME.getString('startupError.checkPermissions')
				]);
				PME.startupError = msg;
			} else if (e.name == "NS_ERROR_STORAGE_BUSY" || e.result == 2153971713) {
				if (PME.isStandalone) {
					// Standalone should force Fx to release lock
					if (!haveReleasedLock) {
						_waitingForDBLock = true;

						var timeout = Date.now() + 5000; // 5 second timeout
						while (_waitingForDBLock && !PME.closing && Date.now() < timeout) {
							// AMO Reviewer: This is used by Zotero Standalone, not Zotero for Firefox.
							PME.mainThread.processNextEvent(true);
						}
						if (PME.closing) return false;

						// Run a second init with haveReleasedLock = true, so that
						// if we still can't acquire a DB lock, we will give up
						return _initDB(true);
					}
				}

				var msg = PME.localeJoin([
					PME.getString('startupError.databaseInUse'),
					PME.getString(PME.isStandalone ? 'startupError.closeFirefox' : 'startupError.closeStandalone')
				]);
				PME.startupError = msg;
			}

			Components.utils.reportError(e);
			PME.skipLoading = true;
			return false;
		}

		return true;
	}

	/**
	 * Called when the DB has been released by another Zotero process to perform necessary
	 * initialization steps
	 */
	this.onDBLockReleased = function () {
		if (PME.isConnector) {
			// if DB lock is released, switch out of connector mode
			switchConnectorMode(false);
		} else if (_waitingForDBLock) {
			// if waiting for DB lock and we get it, continue init
			_waitingForDBLock = false;
		}
	}

	/*
	 * Check if a DB transaction is open and, if so, disable Zotero
	 */
	function stateCheck() {
		if (!PME.isConnector && PME.DB.transactionInProgress()) {
			PME.logError("State check failed due to transaction in progress");
			this.initialized = false;
			this.skipLoading = true;
			return false;
		}

		return true;
	}


	this.shutdown = function () {
		PME.debug("Shutting down Zotero");

		try {
			// set closing to true
			PME.closing = true;

			// run shutdown listener
			for each(var listener
		in
			_shutdownListeners
		)
			{
				try {
					listener();
				} catch (e) {
					PME.logError(e);
				}
			}

			// remove temp directory
			PME.removeTempDirectory();

			if (PME.DB && PME.DB._connection) {
				PME.debug("Closing database");

				// run GC to finalize open statements
				// TODO remove this and finalize statements created with
				// PME.DBConnection.getStatement() explicitly
				Components.utils.forceGC();

				// close DB
				return PME.DB.closeDatabase(true).then(function () {
					// broadcast that DB lock has been released
				});
			}

			return Q();
		} catch (e) {
			PME.debug(e);
			return Q.reject(e);
		}
	}


	function getProfileDirectory() {
		return Components.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
			.get("ProfD", Components.interfaces.nsIFile);
	}

	function getDefaultProfile(prefDir) {
		// find profiles.ini file
		var profilesIni = prefDir.clone();
		profilesIni.append("profiles.ini");
		if (!profilesIni.exists()) return false;
		var iniContents = PME.File.getContents(profilesIni);

		// cheap and dirty ini parser
		var curSection = null;
		var defaultSection = null;
		var nSections = 0;
		for each(var line
	in
		iniContents.split(/(?:\r?\n|\r)/)
	)
		{
			let tline = line.trim();
			if (tline[0] == "[" && tline[tline.length - 1] == "]") {
				curSection = {};
				if (tline != "[General]") nSections++;
			} else if (curSection && tline != "") {
				let equalsIndex = tline.indexOf("=");
				let key = tline.substr(0, equalsIndex);
				let val = tline.substr(equalsIndex + 1);
				curSection[key] = val;
				if (key == "Default" && val == "1") {
					defaultSection = curSection;
				}
			}
		}
		if (!defaultSection && curSection) defaultSection = curSection;

		// parse out ini to reveal profile
		if (!defaultSection || !defaultSection.Path) return false;


		if (defaultSection.IsRelative === "1") {
			var defaultProfile = prefDir.clone().QueryInterface(Components.interfaces.nsILocalFile);
			try {
				for each(var dir
			in
				defaultSection.Path.split("/")
			)
				defaultProfile.append(dir);
			} catch (e) {
				PME.logError("Could not find profile at " + defaultSection.Path);
				throw e;
			}
		} else {
			var defaultProfile = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsILocalFile);
			defaultProfile.initWithPath(defaultSection.Path);
		}

		if (!defaultProfile.exists()) return false;
		return [defaultProfile, nSections > 1];
	}

	function getZoteroDirectory() {
		if (_zoteroDirectory != false) {
			// Return a clone of the file pointer so that callers can modify it
			return _zoteroDirectory.clone();
		}

		if (PME.Prefs.get('useDataDir')) {
			var file = Components.classes["@mozilla.org/file/local;1"].
				createInstance(Components.interfaces.nsILocalFile);
			try {
				file.persistentDescriptor = PME.Prefs.get('dataDir');
			}
			catch (e) {
				PME.debug("Persistent descriptor in extensions.zotero.dataDir did not resolve", 1);
				e = { name: "NS_ERROR_FILE_NOT_FOUND" };
				throw (e);
			}
			if (!file.exists()) {
				var e = { name: "NS_ERROR_FILE_NOT_FOUND" };
				throw (e);
			}
		}
		else {
			var file = PME.getProfileDirectory();
			file.append('pme');

			// if standalone and no directory yet, check Firefox directory
			// or if in Firefox and no directory yet, check standalone Zotero directory
			if (!file.exists()) {
				var prefDir = Components.classes["@mozilla.org/file/directory_service;1"]
					.getService(Components.interfaces.nsIProperties)
					.get("DefProfRt", Components.interfaces.nsILocalFile).parent.parent;

				if (PME.isStandalone) {
					if (PME.isWin) {
						prefDir = prefDir.parent;
						prefDir.append("Mozilla");
						prefDir.append("Firefox");
					} else if (PME.isMac) {
						prefDir.append("Firefox");
					} else {
						prefDir.append(".mozilla");
						prefDir.append("firefox");
					}
				} else {
					if (PME.isWin) {
						prefDir = prefDir.parent;
						prefDir.append("pme");
						prefDir.append("pme");
					} else if (PME.isMac) {
						prefDir.append("pme");
					} else {
						prefDir.append(".pme");
						prefDir.append("pme");
					}
				}

				PME.debug("Looking for existing profile in " + prefDir.path);

				// get default profile
				var defProfile;
				try {
					defProfile = getDefaultProfile(prefDir);
				} catch (e) {
					PME.debug("An error occurred locating the Firefox profile; not " +
						"attempting to migrate from Zotero for Firefox");
					PME.logError(e);
				}

				if (defProfile) {
					// get Zotero directory
					var zoteroDir = defProfile[0].clone();
					zoteroDir.append("pme");

					if (zoteroDir.exists()) {
						// if Zotero directory exists in default profile for alternative app, ask
						// whether to use
						var e = { name: "ZOTERO_DIR_MAY_EXIST", curDir: file, profile: defProfile[0], dir: zoteroDir, multipleProfiles: defProfile[1] };
						throw (e);
					}
				}
			}

			PME.File.createDirectoryIfMissing(file);
		}
		PME.debug("Using data directory " + file.path);

		_zoteroDirectory = file;
		return file.clone();
	}


	function getStorageDirectory() {
		var file = PME.getZoteroDirectory();

		file.append('storage');
		PME.File.createDirectoryIfMissing(file);
		return file;
	}

	function getZoteroDatabase(name, ext) {
		name = name ? name + '.sqlite' : 'pme.sqlite';
		ext = ext ? '.' + ext : '';

		var file = PME.getZoteroDirectory();
		file.append(name + ext);
		return file;
	}


	/**
	 * @return    {nsIFile}
	 */
	this.getTempDirectory = function () {
		var tmp = this.getZoteroDirectory();
		tmp.append('tmp');
		PME.File.createDirectoryIfMissing(tmp);
		return tmp;
	}


	this.removeTempDirectory = function () {
		var tmp = this.getZoteroDirectory();
		tmp.append('tmp');
		if (tmp.exists()) {
			try {
				tmp.remove(true);
			}
			catch (e) {
			}
		}
	}


	this.getStylesDirectory = function () {
		var dir = this.getZoteroDirectory();
		dir.append('styles');
		PME.File.createDirectoryIfMissing(dir);
		return dir;
	}


	this.getTranslatorsDirectory = function () {
		var dir = this.getZoteroDirectory();
		dir.append('translators');
		PME.File.createDirectoryIfMissing(dir);
		return dir;
	}


	function chooseZoteroDirectory(forceQuitNow, useProfileDir, moreInfoCallback) {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
			.getService(Components.interfaces.nsIWindowMediator);
		var win = wm.getMostRecentWindow('navigator:browser');

		var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService);

		if (useProfileDir) {
			PME.Prefs.set('useDataDir', false);
		}
		else {
			var nsIFilePicker = Components.interfaces.nsIFilePicker;
			while (true) {
				var fp = Components.classes["@mozilla.org/filepicker;1"]
					.createInstance(nsIFilePicker);
				fp.init(win, PME.getString('dataDir.selectDir'), nsIFilePicker.modeGetFolder);
				fp.appendFilters(nsIFilePicker.filterAll);
				if (fp.show() == nsIFilePicker.returnOK) {
					var file = fp.file;

					if (file.directoryEntries.hasMoreElements()) {
						var dbfile = file.clone();
						dbfile.append('pme.sqlite');

						// Warn if non-empty and no zotero.sqlite
						if (!dbfile.exists()) {
							var buttonFlags = ps.STD_YES_NO_BUTTONS;
							if (moreInfoCallback) {
								buttonFlags += ps.BUTTON_POS_2 * ps.BUTTON_TITLE_IS_STRING;
							}
							var index = ps.confirmEx(null,
								PME.getString('dataDir.selectedDirNonEmpty.title'),
								PME.getString('dataDir.selectedDirNonEmpty.text'),
								buttonFlags,
								null,
								null,
								moreInfoCallback ? PME.getString('general.help') : null,
								null, {});

							// Not OK -- return to file picker
							if (index == 1) {
								continue;
							}
							else if (index == 2) {
								setTimeout(function () {
									moreInfoCallback();
								}, 1);
								return false;
							}
						}
					}
					else {
						var buttonFlags = ps.STD_YES_NO_BUTTONS;
						if (moreInfoCallback) {
							buttonFlags += ps.BUTTON_POS_2 * ps.BUTTON_TITLE_IS_STRING;
						}
						var index = ps.confirmEx(null,
							PME.getString('dataDir.selectedDirEmpty.title'),
								PME.getString('dataDir.selectedDirEmpty.text', PME.appName) + '\n\n'
								+ PME.getString('dataDir.selectedDirEmpty.useNewDir'),
							buttonFlags,
							null,
							null,
							moreInfoCallback ? PME.getString('general.moreInformation') : null,
							null, {});

						// Not OK -- return to file picker
						if (index == 1) {
							continue;
						}
						else if (index == 2) {
							setTimeout(function () {
								moreInfoCallback();
							}, 1);
							return false;
						}
					}


					// Set new data directory
					PME.Prefs.set('dataDir', file.persistentDescriptor);
					PME.Prefs.set('lastDataDir', file.path);
					PME.Prefs.set('useDataDir', true);

					break;
				}
				else {
					return false;
				}
			}
		}

		var buttonFlags = (ps.BUTTON_POS_0) * (ps.BUTTON_TITLE_IS_STRING);
		if (!forceQuitNow) {
			buttonFlags += (ps.BUTTON_POS_1) * (ps.BUTTON_TITLE_IS_STRING);
		}
		var app = PME.appName;
		var index = ps.confirmEx(null,
			PME.getString('general.restartRequired'),
				PME.getString('general.restartRequiredForChange', app)
				+ "\n\n" + PME.getString('dataDir.moveFilesToNewLocation', app),
			buttonFlags,
			PME.getString('general.quitApp', app),
			forceQuitNow ? null : PME.getString('general.restartLater'),
			null, null, {});

		if (index == 0) {
			var appStartup = Components.classes["@mozilla.org/toolkit/app-startup;1"]
				.getService(Components.interfaces.nsIAppStartup);
			appStartup.quit(Components.interfaces.nsIAppStartup.eAttemptQuit);
		}

		return useProfileDir ? true : file;
	}


	/**
	 * Launch a file, the best way we can
	 */
	this.launchFile = function (file) {
		try {
			file.launch();
		}
		catch (e) {
			PME.debug("launch() not supported -- trying fallback executable");

			try {
				if (PME.isWin) {
					var pref = "fallbackLauncher.windows";
				}
				else {
					var pref = "fallbackLauncher.unix";
				}
				var path = PME.Prefs.get(pref);

				var exec = Components.classes["@mozilla.org/file/local;1"]
					.createInstance(Components.interfaces.nsILocalFile);
				exec.initWithPath(path);
				if (!exec.exists()) {
					throw (path + " does not exist");
				}

				var proc = Components.classes["@mozilla.org/process/util;1"]
					.createInstance(Components.interfaces.nsIProcess);
				proc.init(exec);

				var args = [file.path];
				proc.runw(true, args, args.length);
			}
			catch (e) {
				PME.debug(e);
				PME.debug("Launching via executable failed -- passing to loadUrl()");

				// If nsILocalFile.launch() isn't available and the fallback
				// executable doesn't exist, we just let the Firefox external
				// helper app window handle it
				var nsIFPH = Components.classes["@mozilla.org/network/protocol;1?name=file"]
					.getService(Components.interfaces.nsIFileProtocolHandler);
				var uri = nsIFPH.newFileURI(file);

				var nsIEPS = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].
					getService(Components.interfaces.nsIExternalProtocolService);
				nsIEPS.loadUrl(uri);
			}
		}
	}


	/*
	 * Debug logging function
	 *
	 * Uses prefs e.z.debug.log and e.z.debug.level (restart required)
	 *
	 * Defaults to log level 3 if level not provided
	 */
	function debug(message, level) {
		PME.Debug.log(message, level);
	}


	/*
	 * Log a message to the Mozilla JS error console
	 *
	 * |type| is a string with one of the flag types in nsIScriptError:
	 *    'error', 'warning', 'exception', 'strict'
	 */
	function log(message, type, sourceName, sourceLine, lineNumber, columnNumber) {
		var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
			.getService(Components.interfaces.nsIConsoleService);
		var scriptError = Components.classes["@mozilla.org/scripterror;1"]
			.createInstance(Components.interfaces.nsIScriptError);

		if (!type) {
			type = 'warning';
		}
		var flags = scriptError[type + 'Flag'];

		scriptError.init(
			message,
			sourceName ? sourceName : null,
				sourceLine != undefined ? sourceLine : null,
				lineNumber != undefined ? lineNumber : null,
				columnNumber != undefined ? columnNumber : null,
			flags,
			'component javascript'
		);
		consoleService.logMessage(scriptError);
	}

	/**
	 * Log a JS error to the Mozilla JS error console.
	 * @param {Exception} err
	 */
	function logError(err) {
		log(err.message ? err.message : err.toString(), "error",
			err.fileName ? err.fileName : (err.filename ? err.filename : null), null,
			err.lineNumber ? err.lineNumber : null, null);
	}

	function getErrors(asStrings) {
		var errors = [];

		for each(var msg
	in
		_startupErrors.concat(_recentErrors)
	)
		{
			// Remove password in malformed XML messages
			if (msg.category == 'malformed-xml') {
				try {
					// msg.message is read-only, so store separately
					var altMessage = msg.message.replace(/(file: "https?:\/\/[^:]+:)([^@]+)(@[^"]+")/, "$1********$3");
				}
				catch (e) {
				}
			}

			if (asStrings) {
				errors.push(altMessage ? altMessage : msg.message)
			}
			else {
				errors.push(msg);
			}
		}
		return errors;
	}


	/**
	 * Get versions, platform, etc.
	 *
	 * Can be used synchronously or asynchronously; info on other add-ons
	 * is available only in async mode
	 */
	function getSystemInfo(callback) {
		var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].
			getService(Components.interfaces.nsIXULAppInfo);

		var info = {
			version: PME.version,
			platform: PME.platform,
			oscpu: PME.oscpu,
			locale: PME.locale,
			appName: appInfo.name,
			appVersion: appInfo.version
		};

		if (callback) {
			PME.getInstalledExtensions(function (extensions) {
				info.extensions = extensions.join(', ');

				var str = '';
				for (var key in info) {
					str += key + ' => ' + info[key] + ', ';
				}
				str = str.substr(0, str.length - 2);
				callback(str);
			});
		}

		var str = '';
		for (var key in info) {
			str += key + ' => ' + info[key] + ', ';
		}
		str = str.substr(0, str.length - 2);
		return str;
	}


	/**
	 * @return    {String[]}        Array of extension names and versions
	 */
	this.getInstalledExtensions = function (callback) {
		function onHaveInstalledAddons(installed) {
			installed.sort(function (a, b) {
				return ((a.appDisabled || a.userDisabled) ? 1 : 0) -
					((b.appDisabled || b.userDisabled) ? 1 : 0);
			});
			var addons = [];
			for each(var addon
		in
			installed
		)
			{
				switch (addon.id) {
					case "refworks@proquest.com":
					case "{972ce4c6-7e08-4474-a285-3208198ce6fd}": // Default theme
						continue;
				}

				addons.push(addon.name + " (" + addon.version
					+ (addon.type != 2 ? ", " + addon.type : "")
					+ ((addon.appDisabled || addon.userDisabled) ? ", disabled" : "")
					+ ")");
			}
			callback(addons);
		}

		Components.utils.import("resource://gre/modules/AddonManager.jsm");
		AddonManager.getAllAddons(onHaveInstalledAddons);
	}


	function safeDebug(obj) {
		for (var i in obj) {
			try {
				PME.debug(i + ': ' + obj[i]);
			}
			catch (e) {
				try {
					PME.debug(i + ': ERROR');
				}
				catch (e) {
				}
			}
		}
	}


	function getString(name, params) {
		try {
			if (params != undefined) {
				if (typeof params != 'object') {
					params = [params];
				}
				var l10n = _localizedStringBundle.formatStringFromName(name, params, params.length);
			}
			else {
				var l10n = _localizedStringBundle.GetStringFromName(name);
			}
		}
		catch (e) {
			throw ('Localized string not available for ' + name);
		}
		return l10n;
	}


	/*
	 * This function should be removed
	 *
	 * |separator| defaults to a space (not a comma like Array.join()) if
	 *   not specified
	 *
	 * TODO: Substitute localized characters (e.g. Arabic comma and semicolon)
	 */
	function localeJoin(arr, separator) {
		if (typeof separator == 'undefined') {
			separator = ' ';
		}
		return arr.join(separator);
	}


	this.getLocaleCollation = function () {
		if (this.collation) {
			return this.collation;
		}

		var localeService = Components.classes["@mozilla.org/intl/nslocaleservice;1"]
			.getService(Components.interfaces.nsILocaleService);
		var appLocale = localeService.getApplicationLocale();

		// Use nsICollation before Fx30
		if (PME.platformMajorVersion < 30) {
			var localeService = Components.classes["@mozilla.org/intl/nslocaleservice;1"]
				.getService(Components.interfaces.nsILocaleService);
			var collationFactory = Components.classes["@mozilla.org/intl/collation-factory;1"]
				.getService(Components.interfaces.nsICollationFactory);
			return this.collation = collationFactory.CreateCollation(appLocale);
		}

		try {
			var locale = appLocale.getCategory('NSILOCALE_COLLATE');
			// Extract a valid language tag
			locale = locale.match(/^[a-z]{2}(\-[A-Z]{2})?/)[0];
			var collator = new Intl.Collator(locale, {
				ignorePunctuation: true,
				numeric: true,
				sensitivity: 'base'
			});
		}
		catch (e) {
			PME.debug(e, 1);

			// If there's an error, just skip sorting
			collator = {
				compare: function (a, b) {
					return 0;
				}
			};
		}

		// Grab all ASCII punctuation and space at the begining of string
		var initPunctuationRE = /^[\x20-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]+/;
		// Punctuation that should be ignored when sorting
		var ignoreInitRE = /["'[{(]+$/;

		// Until old code is updated, pretend we're returning an nsICollation
		return this.collation = {
			compareString: function (_, a, b) {
				if (!a && !b) return 0;
				if (!a || !b) return b ? -1 : 1;

				// Compare initial punctuation
				var aInitP = initPunctuationRE.exec(a) || '';
				var bInitP = initPunctuationRE.exec(b) || '';

				var aWordStart = 0, bWordStart = 0;
				if (aInitP) {
					aWordStart = aInitP[0].length;
					aInitP = aInitP[0].replace(ignoreInitRE, '');
				}
				if (bInitP) {
					bWordStart = bInitP.length;
					bInitP = bInitP[0].replace(ignoreInitRE, '');
				}

				// If initial punctuation is equivalent, use collator comparison
				// that ignores all punctuation
				if (aInitP == bInitP || !aInitP && !bInitP) return collator.compare(a, b);

				// Otherwise consider "attached" words as well, e.g. the order should be
				// "__ n", "__z", "_a"
				// We don't actually care what the attached word is, just whether it's
				// there, since at this point we're guaranteed to have non-equivalent
				// initial punctuation
				if (aWordStart < a.length) aInitP += 'a';
				if (bWordStart < b.length) bInitP += 'a';

				return aInitP.localeCompare(bInitP);
			}
		};
	}


	/*
	 * Sets font size based on prefs -- intended for use on root element
	 *  (zotero-pane, note window, etc.)
	 */
	function setFontSize(rootElement) {
		var size = PME.Prefs.get('fontSize');
		rootElement.style.fontSize = size + 'em';
		if (size <= 1) {
			size = 'small';
		}
		else if (size <= 1.25) {
			size = 'medium';
		}
		else {
			size = 'large';
		}
		// Custom attribute -- allows for additional customizations in zotero.css
		rootElement.setAttribute('zoteroFontSize', size);
	}


	/*
	 * Flattens mixed arrays/values in a passed _arguments_ object and returns
	 * an array of values -- allows for functions to accept both arrays of
	 * values and/or an arbitrary number of individual values
	 */
	function flattenArguments(args) {
		// Put passed scalar values into an array
		if (args === null || typeof args == 'string' || typeof args.length == 'undefined') {
			args = [args];
		}

		var returns = [];
		for (var i = 0; i < args.length; i++) {
			var arg = args[i];
			if (!arg && arg !== 0) {
				continue;
			}
			if (Array.isArray(arg)) {
				for (var j = 0; j < arg.length; j++) {
					returns.push(arg[j]);
				}
			}
			else {
				returns.push(arg);
			}
		}
		return returns;
	}


	function getAncestorByTagName(elem, tagName) {
		while (elem.parentNode) {
			elem = elem.parentNode;
			if (elem.localName == tagName) {
				return elem;
			}
		}
		return false;
	}


	/*
	 * A version of join() that operates externally for use on objects other
	 * than arrays (e.g. _arguments_)
	 *
	 * Note that this is safer than extending Object()
	 */
	function join(obj, delim) {
		var a = [];
		for (var i = 0, len = obj.length; i < len; i++) {
			a.push(obj[i]);
		}
		return a.join(delim);
	}


	/**
	 * Generate a random string of length 'len' (defaults to 8)
	 **/
	function randomString(len, chars) {
		return PME.Utilities.randomString(len, chars);
	}


	function moveToUnique(file, newFile) {
		newFile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0644);
		var newName = newFile.leafName;
		newFile.remove(null);

		// Move file to unique name
		file.moveTo(newFile.parent, newName);
		return file;
	}


	/**
	 * Allow other events (e.g., UI updates) on main thread to be processed if necessary
	 *
	 * @param    {Integer}    [timeout=50]        Maximum number of milliseconds to wait
	 */
	this.wait = function (timeout) {
		if (timeout === undefined) {
			timeout = 50;
		}
		var mainThread = PME.mainThread;
		var endTime = Date.now() + timeout;
		var more;
		//var cycles = 0;

		_waiting++;

		PME.debug("Spinning event loop (" + _waiting + ")", 5);
		do {
			more = mainThread.processNextEvent(false);
			//cycles++;
		} while (more && Date.now() < endTime);

		_waiting--;

		// requeue nsITimerCallbacks that came up during PME.wait() but couldn't execute
		for (var i in _waitTimers) {
			_waitTimers[i].initWithCallback(_waitTimerCallbacks[i], 0, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
		}
		_waitTimers = [];
		_waitTimerCallbacks = [];

		//PME.debug("Waited " + cycles + " cycles");
		return;
	};

	/**
	 * Pumps a generator until it yields false. See itemTreeView.js for an example.
	 *
	 * If errorHandler is specified, exceptions in the generator will be caught
	 * and passed to the callback
	 */
	this.pumpGenerator = function (generator, ms, errorHandler, doneHandler) {
		_waiting++;

		var timer = Components.classes["@mozilla.org/timer;1"].
				createInstance(Components.interfaces.nsITimer),
			yielded,
			useJIT = Components.utils.methodjit;
		var timerCallback = {"notify": function () {
			// XXX Remove when we drop support for Fx <24
			if (useJIT !== undefined) Components.utils.methodjit = useJIT;

			var err = false;
			_waiting--;
			try {
				if ((yielded = generator.next()) !== false) {
					_waiting++;
					return;
				}
			}
			catch (e if e.toString() === "[object StopIteration]")
			{
				// There must be a better way to perform this check
			}
			catch (e)
			{
				err = e;
			}

			timer.cancel();
			_runningTimers.splice(_runningTimers.indexOf(timer), 1);

			// requeue nsITimerCallbacks that came up during generator pumping but couldn't execute
			for (var i in _waitTimers) {
				_waitTimers[i].initWithCallback(_waitTimerCallbacks[i], 0, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
			}
			_waitTimers = [];
			_waitTimerCallbacks = [];

			if (err) {
				if (errorHandler) {
					errorHandler(err);
				} else {
					throw err;
				}
			} else if (doneHandler) {
				doneHandler(yielded);
			}
		}}
		timer.initWithCallback(timerCallback, ms ? ms : 0, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		// add timer to global scope so that it doesn't get garbage collected before it completes
		_runningTimers.push(timer);
	};

	/**
	 * Pumps a generator until it yields false. Unlike the above, this returns a promise.
	 */
	this.promiseGenerator = function (generator, ms) {
		var deferred = Q.defer();
		this.pumpGenerator(generator, ms,
			function (e) {
				deferred.reject(e);
			},
			function (data) {
				deferred.resolve(data)
			});
		return deferred.promise;
	};

	/**
	 * Emulates the behavior of window.setTimeout, but ensures that callbacks do not get called
	 * during PME.wait()
	 *
	 * @param {Function} func            The function to be called
	 * @param {Integer} ms                The number of milliseconds to wait before calling func
	 * @param {Boolean} runWhenWaiting    True if the callback should be run even if PME.wait()
	 *                                  is executing
	 */
	this.setTimeout = function (func, ms, runWhenWaiting) {
		var timer = Components.classes["@mozilla.org/timer;1"].
				createInstance(Components.interfaces.nsITimer),
			useJIT = Components.utils.methodjit;
		var timerCallback = {"notify": function () {
			// XXX Remove when we drop support for Fx <24
			if (useJIT !== undefined) Components.utils.methodjit = useJIT;

			if (_waiting && !runWhenWaiting) {
				// if our callback gets called during PME.wait(), queue it to be set again
				// when PME.wait() completes
				_waitTimers.push(timer);
				_waitTimerCallbacks.push(timerCallback);
			} else {
				// execute callback function
				func();
				// remove timer from global scope, so it can be garbage collected
				_runningTimers.splice(_runningTimers.indexOf(timer), 1);
			}
		}}
		timer.initWithCallback(timerCallback, ms, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
		// add timer to global scope so that it doesn't get garbage collected before it completes
		_runningTimers.push(timer);
	}

	/**
	 * Show Zotero pane overlay and progress bar in all windows
	 *
	 * @param    {String}        msg
	 * @param    {Boolean}        [determinate=false]
	 * @return    void
	 */
	this.showZoteroPaneProgressMeter = function (msg, determinate, icon) {
	}


	/**
	 * @param    {Number}    percentage        Percentage complete as integer or float
	 */
	this.updateZoteroPaneProgressMeter = function (percentage) {
	}


	/**
	 * Hide Zotero pane overlay in all windows
	 */
	this.hideZoteroPaneOverlay = function () {
		// Run any queued callbacks
		if (_unlockCallbacks.length) {
			var func;
			while (func = _unlockCallbacks.shift()) {
				func();
			}
		}

		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
			.getService(Components.interfaces.nsIWindowMediator);
		var enumerator = wm.getEnumerator("navigator:browser");
		while (enumerator.hasMoreElements()) {
			var win = enumerator.getNext();
			if (win.ZoteroPane && win.ZoteroPane.document) {
				_hideWindowZoteroPaneOverlay(win.ZoteroPane.document);
			}
		}

		if (_progressPopup) {
			_progressPopup.close();
		}

		_locked = false;
		_progressMeters = [];
		_progressPopup = null;
		_lastPercentage = null;
	}


	/**
	 * Adds a callback to be called when the Zotero pane overlay closes
	 *
	 * @param    {Boolean}    TRUE if added, FALSE if not locked
	 */
	this.addUnlockCallback = function (callback) {
		if (!_locked) {
			return false;
		}
		_unlockCallbacks.push(callback);
		return true;
	}

	/**
	 * Adds a listener to be called when Zotero shuts down (even if Firefox is not shut down)
	 */
	this.addShutdownListener = function (listener) {
		_shutdownListeners.push(listener);
	}

	function _showWindowZoteroPaneOverlay(doc) {
		doc.getElementById('zotero-collections-tree').disabled = true;
		doc.getElementById('zotero-items-tree').disabled = true;
		doc.getElementById('zotero-pane-tab-catcher-top').hidden = false;
		doc.getElementById('zotero-pane-tab-catcher-bottom').hidden = false;
		doc.getElementById('zotero-pane-overlay').hidden = false;
	}


	function _hideWindowZoteroPaneOverlay(doc) {
		doc.getElementById('zotero-collections-tree').disabled = false;
		doc.getElementById('zotero-items-tree').disabled = false;
		doc.getElementById('zotero-pane-tab-catcher-top').hidden = true;
		doc.getElementById('zotero-pane-tab-catcher-bottom').hidden = true;
		doc.getElementById('zotero-pane-overlay').hidden = true;
	}


	this.updateQuickSearchBox = function (document) {
		var searchBox = document.getElementById('zotero-tb-search');
		if (!searchBox) return;

		var mode = PME.Prefs.get("search.quicksearch-mode");
		var prefix = 'zotero-tb-search-mode-';
		var prefixLen = prefix.length;

		var modes = {
			titleCreatorYear: {
				label: PME.getString('quickSearch.mode.titleCreatorYear')
			},

			fields: {
				label: PME.getString('quickSearch.mode.fieldsAndTags')
			},

			everything: {
				label: PME.getString('quickSearch.mode.everything')
			}
		};

		if (!modes[mode]) {
			PME.Prefs.set("search.quicksearch-mode", "fields");
			mode = 'fields';
		}
		// TEMP -- pre-3.0b3
		else if (modes[mode] == 'titlesAndCreators') {
			PME.Prefs.set("search.quicksearch-mode", "titleCreatorYear");
			mode = 'titleCreatorYear'
		}

		var hbox = document.getAnonymousNodes(searchBox)[0];
		var input = hbox.getElementsByAttribute('class', 'textbox-input')[0];

		// Already initialized, so just update selection
		var button = hbox.getElementsByAttribute('id', 'zotero-tb-search-menu-button');
		if (button.length) {
			PME.debug("already initialized search menu");
			button = button[0];
			var menupopup = button.firstChild;
			for each(var menuitem
		in
			menupopup.childNodes
		)
			{
				if (menuitem.id.substr(prefixLen) == mode) {
					menuitem.setAttribute('checked', true);
					searchBox.placeholder = modes[mode].label;
					return;
				}
			}
			return;
		}

		// Otherwise, build menu
		button = document.createElement('button');
		button.id = 'zotero-tb-search-menu-button';
		button.setAttribute('type', 'menu');

		var menupopup = document.createElement('menupopup');

		for (var i in modes) {
			var menuitem = document.createElement('menuitem');
			menuitem.setAttribute('id', prefix + i);
			menuitem.setAttribute('label', modes[i].label);
			menuitem.setAttribute('name', 'searchMode');
			menuitem.setAttribute('type', 'radio');
			//menuitem.setAttribute("tooltiptext", "");

			menupopup.appendChild(menuitem);

			if (mode == i) {
				menuitem.setAttribute('checked', true);
				menupopup.selectedItem = menuitem;
			}
		}

		menupopup.addEventListener("command", function (event) {
			var mode = event.target.id.substr(22);
			PME.Prefs.set("search.quicksearch-mode", mode);
			if (document.getElementById("zotero-tb-search").value == "") {
				event.stopPropagation();
			}
		}, false);

		button.appendChild(menupopup);
		hbox.insertBefore(button, input);

		searchBox.placeholder = modes[mode].label;

		// If Alt-Up/Down, show popup
		searchBox.addEventListener("keypress", function (event) {
			if (event.altKey && (event.keyCode == event.DOM_VK_UP || event.keyCode == event.DOM_VK_DOWN)) {
				document.getElementById('zotero-tb-search-menu-button').open = true;
				event.stopPropagation();
			}
		}, false);
	}


	/*
	 * Clear entries that no longer exist from various tables
	 */
	this.purgeDataObjects = function (skipStoragePurge) {
		PME.Creators.purge();
		PME.Tags.purge();
		// TEMP: Disabled until we have async DB (and maybe SQLite FTS)
		//PME.Fulltext.purgeUnusedWords();
		PME.Items.purge();
		// DEBUG: this might not need to be permanent
		PME.Relations.purge();
	}


	this.reloadDataObjects = function () {
		PME.Tags.reloadAll();
		PME.Collections.reloadAll();
		PME.Creators.reloadAll();
		PME.Items.reloadAll();
	}


	/**
	 * Brings Zotero Standalone to the foreground
	 */
	this.activateStandalone = function () {
		var io = Components.classes['@mozilla.org/network/io-service;1']
			.getService(Components.interfaces.nsIIOService);
		var uri = io.newURI('zotero://select', null, null);
		var handler = Components.classes['@mozilla.org/uriloader/external-protocol-service;1']
			.getService(Components.interfaces.nsIExternalProtocolService)
			.getProtocolHandlerInfo('zotero');
		handler.preferredAction = Components.interfaces.nsIHandlerInfo.useSystemDefault;
		handler.launchWithURI(uri, null);
	}

	/**
	 * Determines whether to keep an error message so that it can (potentially) be reported later
	 */
	function _shouldKeepError(msg) {
		const skip = ['CSS Parser', 'content javascript'];

		//PME.debug(msg);
		try {
			msg.QueryInterface(Components.interfaces.nsIScriptError);
			//PME.debug(msg);
			if (skip.indexOf(msg.category) != -1 || msg.flags & msg.warningFlag) {
				return false;
			}
		}
		catch (e) {
		}

		const blacklist = [
			"No chrome package registered for chrome://communicator",
			'[JavaScript Error: "Components is not defined" {file: "chrome://nightly/content/talkback/talkback.js',
			'[JavaScript Error: "document.getElementById("sanitizeItem")',
			'No chrome package registered for chrome://piggy-bank',
			'[JavaScript Error: "[Exception... "\'Component is not available\' when calling method: [nsIHandlerService::getTypeFromExtension',
			'[JavaScript Error: "this._uiElement is null',
			'Error: a._updateVisibleText is not a function',
			'[JavaScript Error: "Warning: unrecognized command line flag ',
			'LibX:',
			'function skype_',
			'[JavaScript Error: "uncaught exception: Permission denied to call method Location.toString"]',
			'CVE-2009-3555',
			'OpenGL',
			'trying to re-register CID',
			'Services.HealthReport',
			'[JavaScript Error: "this.docShell is null"',
			'[JavaScript Error: "downloadable font:',
			'[JavaScript Error: "Image corrupt or truncated:',
			'[JavaScript Error: "The character encoding of the',
			'nsLivemarkService.js',
			'Sync.Engine.Tabs',
			'content-sessionStore.js',
			'org.mozilla.appSessions'
		];

		for (var i = 0; i < blacklist.length; i++) {
			if (msg.message.indexOf(blacklist[i]) != -1) {
				//PME.debug("Skipping blacklisted error: " + msg.message);
				return false;
			}
		}

		return true;
	}

	/**
	 * Warn if Zotero Standalone is running as root and clobber the cache directory if it is
	 */
	function _checkRoot() {
		var env = Components.classes["@mozilla.org/process/environment;1"].
			getService(Components.interfaces.nsIEnvironment);
		var user = env.get("USER") || env.get("USERNAME");
		if (user === "root") {
			// Show warning
			if (Services.prompt.confirmEx(null, "", PME.getString("standalone.rootWarning"),
					Services.prompt.BUTTON_POS_0 * Services.prompt.BUTTON_TITLE_IS_STRING |
					Services.prompt.BUTTON_POS_1 * Services.prompt.BUTTON_TITLE_IS_STRING,
				PME.getString("standalone.rootWarning.exit"),
				PME.getString("standalone.rootWarning.continue"),
				null, null, {}) == 0) {
				Components.utils.import("resource://gre/modules/ctypes.jsm");
				// Zap cache files
				try {
					Services.dirsvc.get("ProfLD", Components.interfaces.nsIFile).remove(true);
				} catch (e) {
				}
				// Exit Zotero without giving XULRunner the opportunity to figure out the
				// cache is missing. Otherwise XULRunner will zap the prefs
				exit(0);
			}
		}
	}

	/**
	 * Observer for console messages
	 * @namespace
	 */
	var ConsoleListener = {
		"QueryInterface": XPCOMUtils.generateQI([Components.interfaces.nsIConsoleMessage,
			Components.interfaces.nsISupports]),
		"observe": function (msg) {
			if (!_shouldKeepError(msg)) return;
			if (_recentErrors.length === ERROR_BUFFER_SIZE) _recentErrors.shift();
			_recentErrors.push(msg);
		}
	};
}).call(PME);

PME.Prefs = new function () {
	// Privileged methods
	this.init = init;
	this.get = get;
	this.set = set;

	this.register = register;
	this.unregister = unregister;
	this.observe = observe;

	// Public properties
	this.prefBranch;

	function init() {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService);
		this.prefBranch = prefs.getBranch(PME_CONFIG.PREF_BRANCH);

		// Register observer to handle pref changes
		this.register();

		// Process pref version updates
		var fromVersion = this.get('prefVersion');
		if (!fromVersion) {
			fromVersion = 0;
		}
		var toVersion = 1;
		if (fromVersion < toVersion) {
			for (var i = fromVersion + 1; i <= toVersion; i++) {
				switch (i) {
					case 1:
						// If a sync username is entered and ZFS is enabled, turn
						// on-demand downloading off to maintain current behavior
						if (this.get('sync.server.username')) {
							if (this.get('sync.storage.enabled')
								&& this.get('sync.storage.protocol') == 'zotero') {
								this.set('sync.storage.downloadMode.personal', 'on-sync');
							}
							if (this.get('sync.storage.groups.enabled')) {
								this.set('sync.storage.downloadMode.groups', 'on-sync');
							}
						}
				}
			}
			this.set('prefVersion', toVersion);
		}
	}


	/**
	 * Retrieve a preference
	 **/
	function get(pref, global) {
		try {
			if (global) {
				var service = Components.classes["@mozilla.org/preferences-service;1"]
					.getService(Components.interfaces.nsIPrefService);
				var branch = service.getBranch("");
			}
			else {
				var branch = this.prefBranch;
			}

			switch (branch.getPrefType(pref)) {
				case branch.PREF_BOOL:
					return branch.getBoolPref(pref);
				case branch.PREF_STRING:
					return branch.getCharPref(pref);
				case branch.PREF_INT:
					return branch.getIntPref(pref);
			}
		}
		catch (e) {
			throw ("Invalid preference '" + pref + "' " + e.message + " " + PME_CONFIG.PREF_BRANCH + ": " + this.prefBranch);
		}
	}


	/**
	 * Set a preference
	 **/
	function set(pref, value) {
		try {
			switch (this.prefBranch.getPrefType(pref)) {
				case this.prefBranch.PREF_BOOL:
					return this.prefBranch.setBoolPref(pref, value);
				case this.prefBranch.PREF_STRING:
					let str = Cc["@mozilla.org/supports-string;1"]
						.createInstance(Ci.nsISupportsString);
					str.data = value;
					return this.prefBranch.setComplexValue(pref, Ci.nsISupportsString, str);
				case this.prefBranch.PREF_INT:
					return this.prefBranch.setIntPref(pref, value);

				// If not an existing pref, create appropriate type automatically
				case 0:
					if (typeof value == 'boolean') {
						PME.debug("Creating boolean pref '" + pref + "'");
						return this.prefBranch.setBoolPref(pref, value);
					}
					if (typeof value == 'string') {
						PME.debug("Creating string pref '" + pref + "'");
						return this.prefBranch.setCharPref(pref, value);
					}
					if (parseInt(value) == value) {
						PME.debug("Creating integer pref '" + pref + "'");
						return this.prefBranch.setIntPref(pref, value);
					}
					throw ("Invalid preference value '" + value + "' for pref '" + pref + "'");
			}
		}
		catch (e) {
			Components.utils.reportError(e);
			PME.debug(e, 1);
			throw ("Invalid preference '" + pref + "'");
		}
	}


	this.clear = function (pref) {
		try {
			this.prefBranch.clearUserPref(pref);
		}
		catch (e) {
			throw ("Invalid preference '" + pref + "'");
		}
	}


	// Import settings bundles
	this.importSettings = function (str, uri) {
		var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService);

		if (!uri.match(/https:\/\/([^\.]+\.)?zotero.org\//)) {
			PME.debug("Ignoring settings file not from https://zotero.org");
			return;
		}

		str = PME.Utilities.trim(str.replace(/<\?xml.*\?>\s*/, ''));
		PME.debug(str);

		var confirm = ps.confirm(
			null,
			"",
			"Apply settings from zotero.org?"
		);

		if (!confirm) {
			return;
		}

		// TODO: parse settings XML
	}


	//
	// Methods to register a preferences observer
	//
	function register() {
		this.prefBranch.QueryInterface(Components.interfaces.nsIPrefBranch2);
		this.prefBranch.addObserver("", this, false);
	}

	function unregister() {
		if (!this.prefBranch) {
			return;
		}
		this.prefBranch.removeObserver("", this);
	}

	function observe(subject, topic, data) {
		if (topic != "nsPref:changed") {
			return;
		}

		try {

			// subject is the nsIPrefBranch we're observing (after appropriate QI)
			// data is the name of the pref that's been changed (relative to subject)
			switch (data) {
				case "statusBarIcon":
					var doc = Components.classes["@mozilla.org/appshell/window-mediator;1"]
						.getService(Components.interfaces.nsIWindowMediator)
						.getMostRecentWindow("navigator:browser").document;

					var addonBar = doc.getElementById("addon-bar");
					var icon = doc.getElementById("zotero-toolbar-button");
					// When the customize window is open, toolbar buttons seem to
					// become wrapped in toolbarpaletteitems, which we need to remove
					// manually if we change the pref to hidden or else the customize
					// window doesn't close.
					var wrapper = doc.getElementById("wrapper-zotero-toolbar-button");
					var palette = doc.getElementById("navigator-toolbox").palette;
					var inAddonBar = false;
					if (icon) {
						// Because of the potential wrapper, don't just use .parentNode
						var toolbar = PME.getAncestorByTagName(icon, "toolbar");
						inAddonBar = toolbar == addonBar;
					}
					var val = this.get("statusBarIcon");
					if (val == 0) {
						// If showing in add-on bar, hide
						if (!icon || !inAddonBar) {
							return;
						}
						palette.appendChild(icon);
						if (wrapper) {
							addonBar.removeChild(wrapper);
						}
						addonBar.setAttribute("currentset", addonBar.currentSet);
						doc.persist(addonBar.id, "currentset");
					}
					else {
						// If showing somewhere else, remove it from there
						if (icon && !inAddonBar) {
							palette.appendChild(icon);
							if (wrapper) {
								toolbar.removeChild(wrapper);
							}
							toolbar.setAttribute("currentset", toolbar.currentSet);
							doc.persist(toolbar.id, "currentset");
						}

						// If not showing in add-on bar, add
						if (!inAddonBar) {
							var icon = addonBar.insertItem("zotero-toolbar-button");
							addonBar.setAttribute("currentset", addonBar.currentSet);
							doc.persist(addonBar.id, "currentset");
							addonBar.setAttribute("collapsed", false);
							doc.persist(addonBar.id, "collapsed");
						}
						// And make small
						if (val == 1) {
							icon.setAttribute("compact", true);
						}
						// Or large
						else if (val == 2) {
							icon.removeAttribute("compact");
						}
					}
					break;

				case "automaticScraperUpdates":
					if (this.get('automaticScraperUpdates')) {
						//PME.Schema.updateFromRepository();
					}
					else {
						//PME.Schema.stopRepositoryTimer();
					}
					break;

				case "note.fontSize":
					var val = this.get('note.fontSize');
					if (val < 6) {
						this.set('note.fontSize', 11);
					}
					break;

				case "sync.autoSync":
					if (this.get("sync.autoSync")) {
						PME.Sync.Runner.IdleListener.register();
					}
					else {
						PME.Sync.Runner.IdleListener.unregister();
					}
					break;

				// TEMP
				case "sync.fulltext.enabled":
					if (this.get("sync.fulltext.enabled")) {
						// Disable downgrades if full-text sync is enabled, since otherwise
						// we could miss full-text content updates
						if (PME.DB.valueQuery("SELECT version FROM version WHERE schema='userdata'") < 77) {
							PME.DB.query("UPDATE version SET version=77 WHERE schema='userdata'");
						}
					}
					break;

				case "search.quicksearch-mode":
					var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
						.getService(Components.interfaces.nsIWindowMediator);
					var enumerator = wm.getEnumerator("navigator:browser");
					while (enumerator.hasMoreElements()) {
						var win = enumerator.getNext();
						if (!win.ZoteroPane) continue;
						PME.updateQuickSearchBox(win.ZoteroPane.document);
					}

					var enumerator = wm.getEnumerator("zotero:item-selector");
					while (enumerator.hasMoreElements()) {
						var win = enumerator.getNext();
						if (!win.Zotero) continue;
						PME.updateQuickSearchBox(win.document);
					}
					break;
			}

		}
		catch (e) {
			PME.debug(e);
			throw (e);
		}
	}
}


/*
 * Handles keyboard shortcut initialization from preferences, optionally
 * overriding existing global shortcuts
 *
 * Actions are configured in ZoteroPane.handleKeyPress()
 */
PME.Keys = new function () {
	this.init = init;
	this.windowInit = windowInit;
	this.getCommand = getCommand;

	var _keys = {};


	/*
	 * Called by PME.init()
	 */
	function init() {
		var cmds = PME.Prefs.prefBranch.getChildList('keys', {}, {});

		// Get the key=>command mappings from the prefs
		for each(var cmd
	in
		cmds
	)
		{
			cmd = cmd.substr(5); // strips 'keys.'
			// Remove old pref
			if (cmd == 'overrideGlobal') {
				PME.Prefs.clear('keys.overrideGlobal');
				continue;
			}
			_keys[this.getKeyForCommand(cmd)] = cmd;
		}
	}


	/*
	 * Called by ZoteroPane.onLoad()
	 */
	function windowInit(document) {
		var globalKeys = [
			{
				name: 'saveToZotero',
				defaultKey: 'S'
			}
		];

		globalKeys.forEach(function (x) {
			let keyElem = document.getElementById('key_' + x.name);
			if (keyElem) {
				let prefKey = this.getKeyForCommand(x.name);
				// Only override the default with the pref if the <key> hasn't
				// been manually changed and the pref has been
				if (keyElem.getAttribute('key') == x.defaultKey
					&& keyElem.getAttribute('modifiers') == 'accel shift'
					&& prefKey != x.defaultKey) {
					keyElem.setAttribute('key', prefKey);
				}
			}
		}.bind(this));
	}


	function getCommand(key) {
		key = key.toUpperCase();
		return _keys[key] ? _keys[key] : false;
	}


	this.getKeyForCommand = function (cmd) {
		try {
			var key = PME.Prefs.get('keys.' + cmd);
		}
		catch (e) {
		}
		return key !== undefined ? key.toUpperCase() : false;
	}
}


PME.DragDrop = {
	currentDragEvent: null,
	currentTarget: null,
	currentOrientation: 0,

	getDataFromDataTransfer: function (dataTransfer, firstOnly) {
		var dt = dataTransfer;

		var dragData = {
			dataType: '',
			data: [],
			dropEffect: dt.dropEffect
		};

		var len = firstOnly ? 1 : dt.mozItemCount;

		if (dt.types.contains('zotero/collection')) {
			dragData.dataType = 'zotero/collection';
			var ids = dt.getData('zotero/collection').split(",");
			dragData.data = ids;
		}
		else if (dt.types.contains('zotero/item')) {
			dragData.dataType = 'zotero/item';
			var ids = dt.getData('zotero/item').split(",");
			dragData.data = ids;
		}
		else if (dt.types.contains('application/x-moz-file')) {
			dragData.dataType = 'application/x-moz-file';
			var files = [];
			for (var i = 0; i < len; i++) {
				var file = dt.mozGetDataAt("application/x-moz-file", i);
				file.QueryInterface(Components.interfaces.nsIFile);
				// Don't allow folder drag
				if (file.isDirectory()) {
					continue;
				}
				files.push(file);
			}
			dragData.data = files;
		}
		else if (dt.types.contains('text/x-moz-url')) {
			dragData.dataType = 'text/x-moz-url';
			var urls = [];
			for (var i = 0; i < len; i++) {
				var url = dt.getData("text/x-moz-url").split("\n")[0];
				urls.push(url);
			}
			dragData.data = urls;
		}

		return dragData;
	},


	getDragSource: function () {
		var dt = this.currentDragEvent.dataTransfer;
		if (!dt) {
			PME.debug("Drag data not available", 2);
			return false;
		}

		// For items, the drag source is the ItemGroup of the parent window
		// of the source tree
		if (dt.types.contains("zotero/item")) {
			var sourceNode = dt.mozSourceNode;
			if (!sourceNode || sourceNode.tagName != 'treechildren'
				|| sourceNode.parentElement.id != 'zotero-items-tree') {
				return false;
			}
			var win = sourceNode.ownerDocument.defaultView;
			return win.ZoteroPane.collectionsView.itemGroup;
		}
		else {
			return false;
		}
	},


	getDragTarget: function () {
		var event = this.currentDragEvent;
		var target = event.target;
		if (target.tagName == 'treechildren') {
			var tree = target.parentNode;
			if (tree.id == 'zotero-collections-tree') {
				let row = {}, col = {}, obj = {};
				tree.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, obj);
				let win = tree.ownerDocument.defaultView;
				return win.ZoteroPane.collectionsView.getItemGroupAtRow(row.value);
			}
		}
		return false;
	}
}


/**
 * Functions for creating and destroying hidden browser objects
 **/
PME.Browser = new function () {
	var nBrowsers = 0;

	this.createHiddenBrowser = createHiddenBrowser;
	this.deleteHiddenBrowser = deleteHiddenBrowser;

	function createHiddenBrowser(win) {
		if (!win) {
			var win = Components.classes["@mozilla.org/appshell/window-mediator;1"]
				.getService(Components.interfaces.nsIWindowMediator)
				.getMostRecentWindow("navigator:browser");
			if (!win) {
				var win = Components.classes["@mozilla.org/appshell/window-mediator;1"]
					.getService(Components.interfaces.nsIWindowWatcher)
					.activeWindow;
			}
		}

		// Create a hidden browser
		var hiddenBrowser = win.document.createElement("browser");
		hiddenBrowser.setAttribute('type', 'content');
		hiddenBrowser.setAttribute('disablehistory', 'true');
		win.document.documentElement.appendChild(hiddenBrowser);
		// Disable some features
		hiddenBrowser.docShell.allowAuth = false;
		hiddenBrowser.docShell.allowDNSPrefetch = false;
		hiddenBrowser.docShell.allowImages = false;
		hiddenBrowser.docShell.allowJavascript = true;
		hiddenBrowser.docShell.allowMetaRedirects = false;
		hiddenBrowser.docShell.allowPlugins = false;
		PME.debug("Created hidden browser (" + (nBrowsers++) + ")");
		return hiddenBrowser;
	}

	function deleteHiddenBrowser(myBrowsers) {
		if (!(myBrowsers instanceof Array)) myBrowsers = [myBrowsers];
		for (var i = 0; i < myBrowsers.length; i++) {
			var myBrowser = myBrowsers[i];
			myBrowser.stop();
			myBrowser.destroy();
			myBrowser.parentNode.removeChild(myBrowser);
			myBrowser = null;
			PME.debug("Deleted hidden browser (" + (--nBrowsers) + ")");
		}
	}
}

/**
 * Functions for disabling and enabling the unresponsive script indicator
 **/
PME.UnresponsiveScriptIndicator = new function () {
	this.disable = disable;
	this.enable = enable;

	// stores the state of the unresponsive script preference prior to disabling
	var _unresponsiveScriptPreference, _isDisabled;

	/**
	 * disables the "unresponsive script" warning; necessary for import and
	 * export, which can take quite a while to execute
	 **/
	function disable() {
		// don't do anything if already disabled
		if (_isDisabled) {
			return false;
		}

		var prefService = Components.classes["@mozilla.org/preferences-service;1"].
			getService(Components.interfaces.nsIPrefBranch);
		_unresponsiveScriptPreference = prefService.getIntPref("dom.max_chrome_script_run_time");
		prefService.setIntPref("dom.max_chrome_script_run_time", 0);

		_isDisabled = true;
		return true;
	}

	/**
	 * restores the "unresponsive script" warning
	 **/
	function enable() {
		var prefService = Components.classes["@mozilla.org/preferences-service;1"].
			getService(Components.interfaces.nsIPrefBranch);
		prefService.setIntPref("dom.max_chrome_script_run_time", _unresponsiveScriptPreference);

		_isDisabled = false;
	}
}


/*
 * Implements nsIWebProgressListener
 */
PME.WebProgressFinishListener = function (onFinish) {
	this.onStateChange = function (wp, req, stateFlags, status) {
		//PME.debug('onStageChange: ' + stateFlags);
		if ((stateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP)
			&& (stateFlags & Components.interfaces.nsIWebProgressListener.STATE_IS_NETWORK)) {
			onFinish();
		}
	}

	this.onProgressChange = function (wp, req, curSelfProgress, maxSelfProgress, curTotalProgress, maxTotalProgress) {
		//PME.debug('onProgressChange');
		//PME.debug('Current: ' + curTotalProgress);
		//PME.debug('Max: ' + maxTotalProgress);
	}

	this.onLocationChange = function (wp, req, location) {
	}
	this.onSecurityChange = function (wp, req, stateFlags, status) {
	}
	this.onStatusChange = function (wp, req, status, msg) {
	}
}

/*
 * Saves or loads JSON objects.
 */
PME.JSON = new function () {
	this.serialize = function (arg) {
		PME.debug("WARNING: PME.JSON.serialize() is deprecated; use JSON.stringify()");
		return JSON.stringify(arg);
	}

	this.unserialize = function (arg) {
		PME.debug("WARNING: PME.JSON.unserialize() is deprecated; use JSON.parse()");
		return JSON.parse(arg);
	}
}
