# PME (Publication Metadata Extraction)

Publication Metadata Extraction (PME) provides functionality for extracting document-specific journal/article metadata out of site-specific web pages, at the time of viewing the page in a user’s web browser.

PME is a freely available open source project, licensed under AGPLv3. It is based on the Zotero Web Translators ([on Github](https://github.com/zotero/translators); [project documentation](http://www.zotero.org/support/dev/translators)). PME adapts this work making the translators easier to use by implementing boiler plate code and adding cross-browser support. 

## Using PME

To use PME, simple include it with a `<script>` tag and call it from your scripts. PME exposes one function:

`getPageMetaData(callback: function) : PubItems`

_in:_

Function that is to be called when extracting successfully completes

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
