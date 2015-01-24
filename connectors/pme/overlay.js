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

/*
 * This object contains the various functions for the interface
 */
var PMEOverlay = new function() {
	this.onLoad = function() {
		try {
			var addonBar = document.getElementById('addon-bar');

			// If this is the first run, add icon to add-on bar if not in the window already
			var tool_bar_button = document.getElementById("pme-toolbar-button")
			if(!tool_bar_button) {
				addonBar.insertItem("pme-toolbar-button");
				addonBar.setAttribute("currentset", addonBar.currentSet);
				document.persist(addonBar.id, "currentset");
				addonBar.setAttribute("collapsed", false);
				document.persist(addonBar.id, "collapsed");
			}
			tool_bar_button.tooltipText = "ProQuest Flow";

		}
		catch(e) {
			PME.debug(e);
		}
	}
}

window.addEventListener("load", function(e) { PMEOverlay.onLoad(e); }, false);
