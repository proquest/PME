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


PME.ProgressWindowSet = new function() {
	this.add = add;
	this.tile = tile;
	this.remove = remove;
	this.updateTimers = updateTimers;
	
	var _progressWindows = [];
	
	const X_OFFSET = 25;
	const Y_OFFSET = 35;
	const Y_SEPARATOR = 12;
	const X_WINDOWLESS_OFFSET = 50;
	const Y_WINDOWLESS_OFFSET = 100;
	
	function add(progressWindow, instance) {
		_progressWindows.push({
			progressWindow: progressWindow,
			instance: instance
		});
	}
	
	
	function tile(progressWin) {
		var parent = progressWin.opener;
		var y_sub = null;
		
		for (var i=0; i<_progressWindows.length; i++) {
			var p = _progressWindows[i].progressWindow;
			
			// Skip progress windows from other windows
			if (p.opener != parent) {
				continue;
			}
			
			if (!y_sub) {
				y_sub = Y_OFFSET + p.outerHeight;
			}
			
			if (parent) {
				var right = parent.screenX + parent.outerWidth;
				var bottom = parent.screenY + parent.outerHeight;
			}
			else {
				var right = progressWin.screen.width + X_OFFSET - X_WINDOWLESS_OFFSET;
				var bottom = progressWin.screen.height + Y_OFFSET - Y_WINDOWLESS_OFFSET;
			}
			
			p.moveTo(right - p.outerWidth - X_OFFSET, bottom - y_sub);
			
			y_sub += p.outerHeight + Y_SEPARATOR;
		}
	}
	
	
	function remove(progressWin) {
		for (var i=0; i<_progressWindows.length; i++) {
			if (_progressWindows[i].progressWindow == progressWin) {
				_progressWindows.splice(i, 1);
			}
		}
	}
	
	
	function updateTimers() {
		if (!_progressWindows.length) {
			return;
		}
		
		for (var i=0; i<_progressWindows.length; i++) {
			// Pass |requireMouseOver| so that the window only closes
			// if the mouse was over it at some point
			_progressWindows[i].instance.startCloseTimer(null, true);
		}
	}
}


/*
 * Handles the display of a div showing progress in scraping, indexing, etc.
 *
 * Pass the active window into the constructor
 */
PME.ProgressWindow = function(_window){
	var self = this,
		_window = null,
		_progressWindow = null,
		_windowLoaded = false,
		_windowLoading = false,
		_timeoutID = false,
		_closing = false,
		_mouseWasOver = false,
		_deferredUntilWindowLoad = [],
		_deferredUntilWindowLoadThis = [],
		_deferredUntilWindowLoadArgs = [];
	
	/**
	 * Shows the progress window
	 */
	this.show = function show() {
		return true;
	}
	
	/**
	 * Changes the "headline" shown at the top of the progress window
	 */
	this.changeHeadline = _deferUntilWindowLoad(function changeHeadline(text, icon, postText) {
	});
	
	/**
	 * Adds a line to the progress window with the specified icon
	 */
	this.addLines = _deferUntilWindowLoad(function addLines(labels, icons) {
	});
	
	/**
	 * Add a description to the progress window
	 *
	 * <a> elements are turned into XUL links
	 */
	this.addDescription = _deferUntilWindowLoad(function addDescription(text) {
	});
	
	/**
	 * Sets a timer to close the progress window. If a previous close timer was set,
	 * clears it.
	 * @param {Integer} ms The number of milliseconds to wait before closing the progress
	 *     window.
	 * @param {Boolean} [requireMouseOver] If true, wait until the mouse has touched the
	 *     window before closing.
	 */
	this.startCloseTimer = function startCloseTimer(ms, requireMouseOver) {
	}
	
	/**
	 * Immediately closes the progress window if it is open.
	 */
	this.close = function close() {
	}
	
	/**
	 * Creates a new object representing a line in the progressWindow. This is the OO
	 * version of addLines() above.
	 */
	this.ItemProgress = _deferUntilWindowLoad(function(iconSrc, title, parentItemProgress) {
	});
	
	/**
	 * Sets the current save progress for this item.
	 * @param {Integer} percent A percentage from 0 to 100.
	 */
	this.ItemProgress.prototype.setProgress = _deferUntilWindowLoad(function(percent) {
	});
	
	/**
	 * Sets the icon for this item.
	 * @param {Integer} percent A percentage from 0 to 100.
	 */
	this.ItemProgress.prototype.setIcon = _deferUntilWindowLoad(function(iconSrc) {
	});
	
	/**
	 * Indicates that an error occurred saving this item.
	 */
	this.ItemProgress.prototype.setError = _deferUntilWindowLoad(function() {
	});


	/**
	 * Wraps a function to ensure it isn't called until the window is loaded
	 */
	function _deferUntilWindowLoad(fn) {
		return function() {
		}
	}
}
