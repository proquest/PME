# PME (Publication Metadata Extraction)

Publication Metadata Extraction (PME) provides functionality for extracting document-specific journal/article metadata out of site-specific web pages, at the time of viewing the page in a user’s web browser.

PME is a freely available open source project (licensed under AGPLv3) based on the Zotero Web Translators ([on Github](https://github.com/zotero/translators); [project documentation](http://www.zotero.org/support/dev/translators)). PME makes these translators easier to use by implementing some of the boiler plate code referred to in the translators. It also adds/improves on the translators a bit.

## Using PME

To use PME, simple include it with a `<script>` tag and call it from your scripts. PME exposes one function:

`getMetadataForPage(doc: HTMLDocument, url: string) : PubItems`

_in:_

A  HTML Document object of the page currently in the user’s browser, and the
current URL.

_out:_

An object with the following fields:

* `Item[] items`

The Item object:

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
