## Requirements:
in the connectors directory

*	create "zotero" folder. Pull https://github.com/zotero/zotero.git into it
*	create "zotero-connectors" folder. Pull https://github.com/zotero/zotero-connectors.git into it
* create "translators" folder. Pull https://github.com/proquest/translators.git into it
*	create empty "build" folder. This is where extensions will go.
*	you will need to obtain certificates for chrome(chrome.pem) and safari. Add them to the "build"	folder.

NOTE: safari extension needs to be built manually using Safari's Extension Builder tool off of "safari.safariextension"
 folder 
	
## Install

`
npm install
`

## Usage

`
node build
`

## Arguments
  The following arguments are available
  
* -f: for Firefox extension
* -c: for Chrome extension
* -s: for Safari extension
* -b: for Bookmarklet
* -a: to build all at once
* -d: (optional) to run in debug mode. Use as an additional argument

