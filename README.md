#What is PME?
PME (Publication Metadata Extraction) allows users to extract, display, and save article metadata from webpages using Zotero Translators. Zotero Translators are the de-facto language for extracting metadata from webpages and we want to provide a way for them to be used in all bibliographic management software.

PME is a freely available open source project, licensed under AGPLv3. It is based on the Zotero Connectors project. PME adapts this work, creating a tool capable of building add-ons that incorporate the functionality of Translators, and allows for a configurable UI capable of saving metadata to any web service.

PME is a work in progress, many of its functions are not yet complete.

#How do I use PME?
PME is a node.js application which pulls together parts of Zotero, Zotero Connectors, and Zotero Translators, along with its own code and your configurations to create a browser add-on. The add-on created uses the code you configure to show and save metadata which is found by Zotero Translators.

To get started, clone Zotero (https://github.com/zotero/zotero.git), Zotero Connectors (https://github.com/zotero/zotero-connectors.git), and Zotero Translators (https://github.com/zotero/translators.git) to your machine.

Next, you’ll need to point PME to these locations. Change config.js to point to the correct locations for all three, and update the build path while you’re at it.

Now, run ‘npm install’ followed by ‘grunt less’ and then ‘node build.js -f’. Your Firefox add-on will show up in the build directory you configured.

Still with us? Now on to the fun part, make PME look and feel the way you want it to. We’ve included a default configuration in the file “pme_ui.js”. There are three important functions: entry, selection, and single. Entry is called at the same time as the translator is loaded; it should initialize your UI and prepare for the results of translation. Next, either single or selection will be called, depending on whether we’re looking at a single article or a result list.

Each of these functions is called with the page url, and document object. Selection is also passed an object of {id:title} pairs (for each article found), and a callback function to get the full article metadata. The callback function of selection should be passed back an object with only the ids the user selects. The callback function will result in single being called with the full metadata of those selected.

entry(doc,url)
doc: This is the document object for the page where PME was invoked.
url: This is the url of the page where PME was invoked.

selection(doc,url,items,callback)
items: A javascript object containing id:title pairs for items which can be selected. example: {“1234”:”the title one two three four”, “5678”:”some other title”}
callback: A callback function which instructs the translator to get full metadata for a list of ids from items. The parameter should be a subset of items.

single(doc,url,item)
item: A javascript object containing all metadata found by the translator. It is in Zotero format.

# AGPL v3 License

Publication Metadata Extraction
Copyright (C) 2013-2014 ProQuest LLC

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
