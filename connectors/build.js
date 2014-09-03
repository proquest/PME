console.log("______________________________________________________");
var common = require('./lib/common');
var extensions = require('./lib/extensions');
var bookmark = require('./lib/bookmarklet');
var config = common.config;

//if (process.argv[2] == 'debug')
//  common.debug = true;
//if(common.debug) {
//  common.config.buildID = '(new Date()).valueOf()';
//}

//////////////////////////////
//extensions.buildChrome()
//return
//////////////////////////////
var connector = '';
var help =
      "To build connectors enter a valid argument.\n" +
      "The following arguments are available\n" +
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
      common.debug = true;
      common.config.buildID = '(new Date()).valueOf()';
      break;
    default:
      console.log(help);
      break;
  }
}

//console.log('choose chrome|safari|bookmark|all:')
//process.stdin.on('data', function(module) {
//  module = module.toString().substr(0, module.length - 1);
  switch(connector) {
    case 'chrome':
      extensions.buildChrome();
      break;
    case 'safari':
      extensions.buildSafari();
      break;
    case 'bookmark':
      bookmark.buildBookmarklet();
      break;
    case 'all':
      extensions.buildChrome();
      extensions.buildSafari();
      bookmark.buildBookmarklet();
      break;
    default:
      console.log('invalid connector');
      return;
  }
//var i=setInterval(function(){console.log(common.asyncProcessCnt)},1)
//})
