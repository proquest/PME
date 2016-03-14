#What is PME?
PME (Publication Metadata Extraction) allows users to extract, display, and save article metadata from webpages using Zotero Translators. Zotero Translators are the de-facto language for extracting metadata from webpages and we want to provide a way for them to be used in all bibliographic management software.

PME is a freely available open source project, licensed under AGPLv3. It is based on the Zotero Connectors project. PME adapts this work, creating a bookmarklet that incorporate the functionality of Translators, and allows for a configurable UI capable of saving metadata to any web service.

PME is a work in progress, many of its functions are not yet complete.

#How do I use PME?

PME is a node.js application which pulls together parts of Zotero, Zotero Connectors, and Zotero Translators, along with its own code and your configurations to create a browser bookmarklet. The bookmarklet created uses the code you configure to show and save metadata which is found by Zotero Translators.

There are two main parts, the generator which collects and publishes the latest translators and custom translator identification code to an s3 bucket, and the bookmarklet project which compiles the required files for the bookmarklet itself.

To run the generator, configure generator.js to point to your own s3 bucket and then go to the generator folder:

npm install
node generator.js

To compile the bookmarklet code configure zoter_config.js to point to your own servers and then go to the src folder:

npm install
node build.js


# AGPL v3 License

Publication Metadata Extraction
Copyright (C) 2015-2016 ProQuest LLC

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
