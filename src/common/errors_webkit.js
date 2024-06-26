/******** BEGIN errors_webkit.js ********/
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

Zotero.Errors = new function() {
	var _output = [];

	/**
	 * Error handler
	 * @param {String} string Error string
	 * @param {String} url URL of error
	 * @param {Number} line Line where error occurred
	 */
	this.log = function(string, url, line) {
		var err = ['[JavaScript Error: "', string, '"'];
		if(url || line) {
			var info = [];
			if(url) info.push('file: "'+url+'"');
			if(line) info.push('line: '+line);
			err.push(" {"+info.join(" ")+"}");
		}
		err.push("]");
		err = err.join("");
		_output.push(err);
	}

	/**
	 * Gets errors as an array of strings
	 */
	this.getErrors = function(callback) {
		callback(_output.slice());
	}

}
/******** END errors_webkit.js ********/
