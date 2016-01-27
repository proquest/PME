/******** BEGIN zotero_config.js ********/
/*
 ***** BEGIN LICENSE BLOCK *****

 Copyright © 2011 Center for History and New Media
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



var ZOTERO_CONFIG = {
	REPOSITORY_URL: "https://s3.amazonaws.com/pme.proquest.com",
	API_URL: window.EXT_SERVICE_PROVIDER+"/",//change this to review instance e.g. http://ec2-23-20-68-31.compute-1.amazonaws.com
	LOGIN_URL: window.EXT_SERVICE_PROVIDER+'/login/',//change this to review instance e.g. http://ec2-23-20-68-31.compute-1.amazonaws.com/login/
	BOOKMARKLET_ORIGIN : window.PME_SERVICE_PROVIDER,//change this to the url you're using for the bookmark https://s3.amazonaws.com/pme.proquest.com/review/new-pme
	HTTP_BOOKMARKLET_ORIGIN : window.PME_SERVICE_PROVIDER,//change this to the url you're using for the bookmark https://pme.proquest.com/review/new-pme
	BOOKMARKLET_URL: window.PME_SERVICE_PROVIDER+"/",//change this to the url you're using for the bookmark https://s3.amazonaws.com/pme.proquest.com/review/new-pme
	HTTP_BOOKMARKLET_URL: window.PME_SERVICE_PROVIDER+"/",//change this to the url you're using for the bookmark http://pme.proquest.com/review/new-pme
	AUTH_COMPLETE_URL: window.EXT_SERVICE_PROVIDER+'/auth_complete/',//change this to review instance e.g. http://ec2-23-20-68-31.compute-1.amazonaws.com/auth_complete/
	S3_URL: 'https://zoterofilestorage.s3.amazonaws.com/'
};
Zotero.isBookmarklet = true;

/******** END zotero_config.js ********/