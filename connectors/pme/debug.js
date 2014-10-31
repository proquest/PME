/*
 ***** BEGIN LICENSE BLOCK *****

 Copyright © 2009 Center for History and New Media
 George Mason University, Fairfax, Virginia, USA
 http://zotero.org

 This file is part of Zotero.

 Zotero is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 Zotero is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

 ***** END LICENSE BLOCK *****
 */


PME.Debug = new function () {
	var _level, _time, _lastTime;

	this.init = function (forceDebugLog) {
	}

	this.log = function (message, level) {
		if (typeof message != 'string') {
			message = PME.Utilities.varDump(message);
		}

		if (!level) {
			level = 3;
		}

		// If level above debug.level value, don't display
		if (level > _level) {
			//return;
		}

		var delta = 0;
		var d = new Date();
		if (_lastTime) {
			delta = d - _lastTime;
		}
		_lastTime = d;

		while (("" + delta).length < 7) {
			delta = '0' + delta;
		}

		deltaStr = '(+' + delta + ')';
		if (level < 3){
			var stack = (new Error()).stack;
			var nl1Index = stack.indexOf("\n")
			var nl2Index = stack.indexOf("\n", nl1Index + 1);
			var line2 = stack.substring(nl1Index + 2, nl2Index - 1);
			var debugLine = line2.substr(line2.indexOf("@"));

			stack = stack.substring(nl2Index, stack.length - 1);
			message += "\n" + debugLine + stack;
		}
		var output = 'zotero(' + level + ')' + (_time ? deltaStr : '') + ': ' + message;
		if (window.console) {
			window.console.log(output);
		}
		else {
			var ConsoleObj = Components.utils.import("resource://gre/modules/devtools/Console.jsm", {});
			if (ConsoleObj)
				ConsoleObj.console.log(output);
		}
	}


	this.get = function (maxChars, maxLineLength) {}
	this.setStore = function (enable) {}
	this.count = function () {}
	this.clear = function () {}
}
