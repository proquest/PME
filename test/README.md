PME Test Framework
==================

This is a node + phantomjs based test framework for PME whose function is to
automatically compare the embedded test case result info for each
translator to what is actually returned by running PME in each test case's
page.


Pre-requirements
----------------

NodeJS must be installed.

`phantomjs` must be installed as a node module. The wrapper command that calls
`phantomjs` assumes that the module is available in a `node_modules` directory
inside this test directory. If this is not the case you may wish to soft link
your `node_modules` directory into this one or modify the `philtered` command
in this directory with the proper path to the `phantomjs` binary.


Usage
-----

To run all the tests:

    node run-testcases-all.js

Depending on whether any timeouts occur and how the timeout values are
configured this may take a while (up to 10 mins)

Once the tests are ready, a report is saved inside the `reports` directory.
The report's filename has a timestamp and git branch name in it to easily
distinguish between reports.

Report files are completely stand-alone HTML files. Open them in any browser
to view the results.


Single Run
----------

If you wish to only test a single translator then do the following.

First you need to have a local PME server running. In full tests this is
provided automatically by the test runner but for single tests you have to
start one manually. The easiest way to do this is to open a terminal session,
navigate to the PME root directory and run:

    python -m SimpleHTTPServer 8082

The port number here is the default, if you change it you have to change the
`PME_SERVER_PORT` constant in `test_util.js`. This will host the files and
make them available to the client pages in the tester.

With the PME server up, run the following to test a single translator:

    ./philtered run-testcases-single.js 'translator.js'

Where `translator.js` is the filename of the translator you wish to test.
Don't include the path. The `philtered` script filters the output of
`phantomjs` as current versions may yield a ton of warnings about deprecated
API usage on Mac OS X.


Configuration
-------------

Certain parameters of the test are configurable by changing some constants
at the top of the `run-testcases-*.js` files. Inspect the sources for more
information.
