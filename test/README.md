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
`phantomjs` assumed that the module is available in a `node_modules` directory
inside this test directory. If this is not the case you may wish to soft link
your `node_modules` directory into this one or modify the `philtered` command
in this directory with the proper path to the `phantomjs` binary.


Usage
-----

The PME files need to be available to the pages that are being tested over
HTTP. The easiest way to do this is to run the following command inside the
PME root directory:

    python -m SimpleHTTPServer 8081

This will create a simple static file hosting server at the address that the
test scripts are configured to look for PME stuff.
If you want to host PME in a different way, make sure to update the
`PME_TEST_HOST` constant at the top of the `run-testcases-single.js` file.

__NOTE WELL__: be aware that the tester assumes that the files hosted using
this server are _the same_ as the ones in `../extractors/` relative from this
`test` directory. If they are not the resulting report may contain incorrect
data.

Now run the tests:

    node run-testcases-all.js

Running the tests will take anywhere from 2 to 10 minutes, depending on the
number of timeouts the test encounters.

Once the tests are ready, a report is saved inside the `reports` directory.
The report's filename has a timestamp and git branch name in it to easily
distinguish between reports.

Report files are completely stand-alone HTML files. Open them in any browser
to view the results.


Single Run
----------

If you wish to only test a single translator then you can do so by running:

    ./philtered run-testcases-single.js 'translator.js'

Where `translator.js` is the filename without of the translator you wish to
test. Don't include the path. The `philtered` script filters the output of
`phantomjs` as current versions may yield a ton of warnings about deprecated
API usage on Mac OS X.


Configuration
-------------

Certain parameters of the test are configurable by changing some constants
at the top of the `run-testcases-*.js` files. Inspect the sources for more
information.
