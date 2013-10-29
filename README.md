# PME (Publication Metadata Extraction)

Publication Metadata Extraction (PME) provides functionality for extracting document-specific journal/article metadata out of site-specific web pages, at the time of viewing the page in a user’s web browser.

PME is a freely available open source project, licensed under AGPLv3. It is based on the Zotero Web Translators ([on Github](https://github.com/zotero/translators); [project documentation](http://www.zotero.org/support/dev/translators)). PME adapts this work making the translators easier to use by implementing boiler plate code and adding cross-browser support. 

## Using PME

To use PME, simple include it with a `<script>` tag and call it from your scripts. PME exposes one function:

`getMetadataForPage(doc: HTMLDocument, url: string) : PubItems`

_in:_

A  HTML Document object of the page currently in the user’s browser, and the
current URL.

_out:_

An object with the following fields:

* `Item[] items`

where an item is:

* `string title`
* `string[] authors`
* `string siteName`
* `string publicationName`
* `string publicationDate`
* `int startPage`
* `int endPage`
* `int issue`
* `string docURL`

All fields are optional and dependent on the source page.


## Setting up the PME Tester

The PME test harness allows you to run and test PME without connecting to Flow. It consists of the files tester.js and TesterBookmark.js in the PME Git repository.

Place the PME files inside a /PME/ directory. Any extractor files should be inside the /PME/extractors/ subdirectory. Set up PME as a site on your localhost via IIS or other server manager.

When your localhost is set up, open the file TesterBookmark.js in a text editor.
1. Copy the line of JavaScript code found in the comments under ////bookmark////. (This code is duplicated above the comment and broken up with whitespace for reference.)
2. Open your browser of choice.
3. Create a new bookmark, and paste that line of JavaScript code into the "Location" or "URL" field.
4. Save the bookmark. If your bookmarks toolbar is not already visible, make it visible now.



This bookmarklet allows you to run and test PME without connecting to Flow. Clicking the bookmarklet will call PME, which will detect whether a scraper exists for the current website.
If a scraper exists, PME will call it and the tester script will output the results of the scrape directly in the browser window.
If no scraper exists for the site, the tester will output an error message.

The tester iterates through the PME results object and displays the data from each reference as a list of keys and values. It will display all results by default.


# AGPL v3 License

Publication Metadata Extraction – extracts metadata from online publication pages.
Copyright (C) 2013 ProQuest LLC

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
