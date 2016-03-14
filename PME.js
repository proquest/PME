/*
    Publication Metadata Extraction - extracts metadata from online publication pages.
    Copyright (C) 2016 ProQuest LLC

    Based on the Zotero Web Translators - https://github.com/zotero/translators
    Project documentation at http://www.zotero.org/support/dev/translators.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
(function() {
// PME.js

	if(document.getElementById("zotero-iframe")) {
		alert("A previous translation process is still in progress. Please wait for it to complete, "+
			"or refresh the page.");
		return;
	};
	if(!window.PME_SERVICE_PROVIDER) window.PME_SERVICE_PROVIDER = "https://s3.amazonaws.com/pme.proquest.com";
	if(!window.EXT_SERVICE_PROVIDER) window.EXT_SERVICE_PROVIDER = "https://refworks.proquest.com";
	var baseURL = window.PME_SERVICE_PROVIDER+"/",
		ie = (!document.evaluate ? "_ie" : ""),
		common = baseURL+"common" + ie + ".js?_="+(new Date()),
		inject = baseURL+"inject" + ie + ".js?_="+(new Date());

	var iframe = document.createElement("iframe"),
		tag = document.body || document.documentElement;
	iframe.id = "zotero-iframe";
	iframe.style.display = "none";
	iframe.style.borderStyle = "none";
	iframe.setAttribute("frameborder", "0");
	var scriptLocations = 'window.PME_SERVICE_PROVIDER="'+window.PME_SERVICE_PROVIDER+'";window.EXT_SERVICE_PROVIDER="'+window.EXT_SERVICE_PROVIDER+'";';
	iframe.src = 'javascript:(function(){document.open();try{window.parent.document;}catch(e){document.domain="' + document.domain.replace(/[\\\"]/g, "\\$0")+'";}document.write(\'<!DOCTYPE html><html><head><script>'+scriptLocations+'</script><script src="'+common+'"></script><script src="'+inject+'"></script></head><body></body></html>\');document.close();})()';
	tag.appendChild(iframe);

}());
