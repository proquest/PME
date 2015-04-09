console.log("______________________________________________________");
var extensions = require('./lib/extensions'),
    bookmark = require('./lib/bookmarklet'),
    firefox = require('./lib/firefox');

///// The following block grabs the common file ref-type-fields.js from Flow and recreates the PME UI with its contents.
//    This allows us to commonize the reference editor form fields across Flow and PME.

var https = require('https');
var fs = require('fs');

if (!https)
	console.log('http module is missing');

if (!fs)
	console.log('fs module is missing');

var req = https.get("https://flow.proquest.com/public/js/ref-type-fields.js", function(res) {
	res.on('data', function(data) {
		var UIcode = fs.readFileSync('./pme/pme_ui.js', {encoding: 'utf8'});
		fs.writeFileSync('./pme/pme_ui.js', data.toString());
		fs.appendFileSync('./pme/pme_ui.js', "\n\n");
		fs.appendFileSync('./pme/pme_ui.js', UIcode.slice(UIcode.indexOf('/////')));
	});
});

///// Proceed with building the add-on

var connector = '',
    debug = false,
    help =
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
    (new firefox(debug)).buildFirefox();
    (new extensions(debug)).buildChrome();
    (new extensions(debug)).buildSafari();
    break;
  default:
    console.log('invalid connector');
    return;
}
