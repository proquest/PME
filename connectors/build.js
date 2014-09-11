console.log("______________________________________________________");
var c = require('./lib/common');
var common = new c();
var extensions = require('./lib/extensions');
var bookmark = require('./lib/bookmarklet');
var firefox = require('./lib/firefox');
var config = common.config;

var connector = '',
    debug = false;
var help =
      "To build connectors enter a valid argument.\n" +
      "The following arguments are available\n" +
      "-f: for Firefox extension\n" +
      "-c: for Chrome extension\n" +
      "-s: for Safari extension\n" +
      "-b: for Bookmarklet\n" +
      "-a: to build all at once\n" +
      "-d: (optional) to run in debug mode.";

if(process.argv.length <= 2) {
  console.log(help);
  return;
}

for(var i = 2; i < process.argv.length; i++) {
  switch(process.argv[i]) {
    case '-f':
      connector = 'firefox';
      break;
    case '-c':
      connector = 'chrome';
      break;
    case '-s':
      connector = 'safari';
      break;
    case '-b':
      connector = 'bookmark';
      break;
    case '-a':
      connector = 'all';
      break;
    case '-d':
      debug = true;
       break;
    default:
      console.log(help);
      break;
  }
}

  switch(connector) {
    case 'firefox':
      (new firefox(debug)).buildFirefox();
      break;
    case 'chrome':
      (new extensions(debug)).buildChrome();
      break;
    case 'safari':
      (new extensions(debug)).buildSafari();
      break;
    case 'bookmark':
      (new bookmark(debug)).buildBookmarklet();
      break;
    case 'all':
      (new bookmark(debug)).buildBookmarklet();
      (new extensions(debug)).buildChrome();
      (new extensions(debug)).buildSafari();
      (new firefox(debug)).buildFirefox();
      break;
    default:
      console.log('invalid connector');
      return;
  }
