---
layout: post
title: "Building a URL shortener with Node.js and Redis"
date: 2014-11-09 17:13:16 +0000
comments: true
categories: 
- node.js
- redis
---

The NoSQL movement is an exciting one for web developers. While relational databases such as MySQL are applicable to solving a wide range of problems, they aren't the best solution for every problem. Sometimes you may find yourself dealing with a problem where an alternative data store may make more sense.

Redis is one of the data stores that have appeared as part of this movement, and is arguably one of the more generally useful ones. Since it solves different problems to a relational database, it's not generally useful as an alternative to them - instead it is often used alongside them.

What is Redis?
----------

Redis is described as follows on the website:

> "Redis is an open source, BSD licensed, advanced key-value cache and store. It is often referred to as a data structure server since keys can contain strings, hashes, lists, sets, sorted sets, bitmaps and hyperloglogs".

In other words, its core functionality is that it allows you to store a value by a key, and later retrieve that data using the key. It also allows you to set an optional expiry time for that key-value pair. It's quite similar to Memcached in that respect, and indeed one obvious use case for Redis is as an alternative to Memcached. However, it offers a number of additional benefits - for one thing, it supports more data types, and for another, it allows you to persist your data to disk (unlike Memcached, which only retains the data in memory, meaning it's lost on restart or if Memcached crashes). The latter means that for some very simple web applications, Redis can be used as your sole data store.

In this tutorial, we'll build a simple URL shortener, using Redis as the sole data store. A URL shortener only really requires two fields:

* A string to identify the correct URL
* The URL

That makes Redis a good fit for this use case since all we need to do is generate an ID for each URL, then when a link is followed, look up the URL for that key, and redirect the user to it. As long as this is all our application needs to do, we can quite happily use Redis for this rather than a relational database, and it will be significantly faster than a relational database would be for this use case.

Getting started
---------------

We're more interested in the fundamentals of using Redis in our application than a specific language here. As JavaScript is pretty much required to be a web developer, I think it's a fairly safe bet to use Node.js rather than PHP or Python, since that way, even if your only experience of JavaScript is client-side, you shouldn't have too much trouble following along.

You'll need to have Node.js installed, and I'll leave the details of installing this to you. You'll also need the Grunt CLI - install this globally as follows:

```bash
$ sudo npm install -g grunt-cli
```

Finally, you'll want to have Redis itself installed. You might also want to install hiredis, which is a faster Redis client that gets used automatically where available.

Now, let's create our `package.json` file:

```bash
$ npm init
```

You'll see a number of questions. Your generated `package.json` file should look something like this:

```json
{
  "name": "url-shortener",
  "version": "1.0.0",
  "description": "A URL shortener",
  "main": "index.js",
  "scripts": {
    "test": "grunt test"
  },
  "keywords": [
    "URL",
    "shortener"
  ],
  "author": "Matthew Daly <matthew@matthewdaly.co.uk> (http://matthewdaly.co.uk/)",
  "license": "GPLv2"
}
```

Note in particular that we set our test command to `grunt test`.

Next, we install our required Node.js modules. First, install, the normal dependencies:

```bash
$ npm install --save body-parser express redis hiredis jade shortid
```

Next, install the development dependencies:

```bash
$ npm install --save-dev grunt grunt-contrib-jshint grunt-mocha-istanbul istanbul mocha chai request
```

Now, we're going to use Grunt to run our tests, so that we can easily lint the JavaScript and generate code coverage details. Here's the Gruntfile:

```javascript
module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        jshint: {
            all: [
                'test/*.js',
                'index.js'
            ]
        },
        mocha_istanbul: {
            coverage: {
                src: 'test', // the folder, not the files,
                options: {
                    mask: '*.js',
                    reportFormats: ['cobertura', 'html']
                }
            }
        }
    });

    // Load tasks
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-istanbul');

    // Register tasks
    grunt.registerTask('test', ['jshint', 'mocha_istanbul:coverage']);
};
```

We'll also create a `Procfile` in anticipation of deploying the app to Heroku:

```bash
web: node index.js
```

Creating the views
------------------

For this application we'll be using the Express framework and the Jade templating system. We need three templates:

* Submission form
* Output form
* 404 page

Create the folder `views` under the application directory and add the files `views/index.jade`:

```jade
doctype html
html(lang="en")
    head
        title="Shortbread"

    body
        div.container
            div.row
                h1 Shortbread

            div.row
                form(action="/", method="POST")
                    input(type="url", name="url")
                    input(type="submit", value="Submit")
```

`views/output.jade`

```jade
doctype html
html(lang="en")
    head
        title="Shortbread"

    body
        div.container
            div.row
                h1 Shortbread
                p Your shortened URL is <a href='#{base_url}/#{id}'>#{base_url}/#{id}</a>
```
and `views/error.jade`:

```jade
doctype html
html(lang="en")
    head
        title="Shortbread"

    body
        div.container
            div.row
                h1 Shortbread
                p Link not found
```

Writing our first test
----------------------

We're going to use Mocha for our tests, together with the Chai assertion library. Create a folder called `test`, and put the following in `test/test.js`:

```javascript
/*jslint node: true */
/*global describe: false, before: false, after: false, it: false */
"use strict";

// Declare the variables used
var expect = require('chai').expect,
    request = require('request'),
    server = require('../index'),
    redis = require('redis'),
    client;
client = redis.createClient();

// Server tasks
describe('server', function () {

    // Beforehand, start the server
    before(function (done) {
        console.log('Starting the server');
        done();
    });

    // Afterwards, stop the server and empty the database
    after(function (done) {
        console.log('Stopping the server');
        client.flushdb();
        done();
    });

    // Test the index route
    describe('Test the index route', function () {
        it('should return a page with the title Shortbread', function (done) {
            request.get({ url: 'http://localhost:5000' }, function (error, response, body) {
                expect(body).to.include('Shortbread');
                expect(response.statusCode).to.equal(200);
                expect(response.headers['content-type']).to.equal('text/html; charset=utf-8');
                done();
            });
        });
    });
});
```

This code bears a little explanation. First, we import the required modules, as well as our `index.js` file (which we have yet to add). Then we create a callback to contain our tests.

Inside the callback, we call the `before()` and `after()` functions, which let us set up and tear down our tests. As part of the teardown process, we flush the Redis database.

Finally, we fetch our home page and verify that it returns a 200 status code and a content type of text/html, as well as including the name or our application.

We'll need to create our `index.js` file to avoid a nasty error, but we won't populate it just yet:

```bash
$ touch index.js
```

Let's run our tests:

```bash
$ grunt test
Running "jshint:all" (jshint) task
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task


  server
Starting the server
    Test the index route
      1) should return a page with the title Shortbread
Stopping the server


  0 passing (152ms)
  1 failing

  1) server Test the index route should return a page with the title Shortbread:
     Uncaught AssertionError: expected undefined to include 'Shortbread'
      at Request._callback (/Users/matthewdaly/Projects/url-shortener/test/test.js:33:33)
      at self.callback (/Users/matthewdaly/Projects/url-shortener/node_modules/request/request.js:372:22)
      at Request.emit (events.js:95:17)
      at Request.onRequestError (/Users/matthewdaly/Projects/url-shortener/node_modules/request/request.js:963:8)
      at ClientRequest.emit (events.js:95:17)
      at Socket.socketErrorListener (http.js:1551:9)
      at Socket.emit (events.js:95:17)
      at net.js:440:14
      at process._tickCallback (node.js:419:13)



=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/url-shortener/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/url-shortener/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 0/0 )
Branches     : 100% ( 0/0 )
Functions    : 100% ( 0/0 )
Lines        : 100% ( 0/0 )
================================================================================
>>
Warning: Task "mocha_istanbul:coverage" failed. Use --force to continue.

Aborted due to warnings.
```

Now that we have a failing test, we can start work on our app proper. Open up `index.js` and add the following code:

```javascript
/*jslint node: true */
'use strict';

// Declare variables used
var app, base_url, bodyParser, client, express, port, rtg, shortid;

// Define values
express = require('express');
app = express();
port = process.env.PORT || 5000;
shortid = require('shortid');
bodyParser = require('body-parser');
base_url = process.env.BASE_URL || 'http://localhost:5000';

// Set up connection to Redis
if (process.env.REDISTOGO_URL) {
  rtg  = require("url").parse(process.env.REDISTOGO_URL);
  client = require("redis").createClient(rtg.port, rtg.hostname);
  client.auth(rtg.auth.split(":")[1]);
} else {
  client = require('redis').createClient();
}

// Set up templating
app.set('views', __dirname + '/views');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);

// Set URL
app.set('base_url', base_url);

// Handle POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Define index route
app.get('/', function (req, res) {
  res.render('index');
});

// Serve static files
app.use(express.static(__dirname + '/static'));

// Listen
app.listen(port);
console.log('Listening on port ' + port);
```

Let's go through this code. First we confirm that linting tools should treat this as a Node app, and use strict mode (I recommend always using strict mode in JavaScript).

Then we declare our variables and import the required modules. Note here that we set the port to 5000, but can also set it based on the `PORT` environment variable, which is used by Heroku. We also define a base URL, which again can be overriden from an environment variable when hosted on Heroku.

We then set up our connection to our Redis instance. When we push the code up to Heroku, we'll use the Redis To Go addon, so we check for an environment variable containing the Redis URL. If it's set, we use that to connect. Otherwise, we just connect as normal.

We then set up templating using Jade, and define the folder containing our views, and store the base URL within the app. Then we set up `bodyParser` so that Express can handle POST data.

Next, we define our index route to just render the `index.jade` file. Finally, we set up our static folder and set the app to listen on the correct port.

Let's run our test:

```bash
$ grunt test
Running "jshint:all" (jshint) task
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Shortbread (116ms)
Stopping the server


  1 passing (128ms)

=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/url-shortener/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/url-shortener/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 86.96% ( 20/23 )
Branches     : 83.33% ( 5/6 )
Functions    : 100% ( 1/1 )
Lines        : 86.96% ( 20/23 )
================================================================================
>> Done. Check coverage folder.

Done, without errors.
```

Note that Istanbul will have generated a nice HTML coverage report, which will be at `coverage/index.html`, but this won't show 100% test coverage due to the Heroku-specific Redis section. To fix this, amend that section as follows:

```javascript
/* istanbul ignore if */
if (process.env.REDISTOGO_URL) {
    rtg  = require("url").parse(process.env.REDISTOGO_URL);
    client = require("redis").createClient(rtg.port, rtg.hostname);
    client.auth(rtg.auth.split(":")[1]);
} else {
    client = require('redis').createClient();
}
```

Telling Istanbul to ignore the if clause resolves that problem nicely.

Submitting a URL
----------------

Next, let's add the ability to add a URL. First, add the following test, after the one for the index:

```javascript
    // Test submitting a URL
    describe('Test submitting a URL', function () {
        it('should return the shortened URL', function (done) {
            request.post('http://localhost:5000', {form: {url: 'http://www.google.co.uk'}}, function (error, response, body) {
                expect(body).to.include('Your shortened URL is');
                expect(response.statusCode).to.equal(200);
                expect(response.headers['content-type']).to.equal('text/html; charset=utf-8');
                done();
            });
        });
    });
```

This test submits a URL via POST, and checks to see that the response view gets returned. Now, let's run our tests again:

```bash
$ grunt test
Running "jshint:all" (jshint) task
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Shortbread (223ms)
    Test submitting a URL
      1) should return the shortened URL
Stopping the server


  1 passing (318ms)
  1 failing

  1) server Test submitting a URL should return the shortened URL:
     Uncaught AssertionError: expected 'Cannot POST /\n' to include 'Your shortened URL is'
      at Request._callback (/Users/matthewdaly/Projects/url-shortener/test/test.js:45:33)
      at Request.self.callback (/Users/matthewdaly/Projects/url-shortener/node_modules/request/request.js:372:22)
      at Request.emit (events.js:98:17)
      at Request.<anonymous> (/Users/matthewdaly/Projects/url-shortener/node_modules/request/request.js:1310:14)
      at Request.emit (events.js:117:20)
      at IncomingMessage.<anonymous> (/Users/matthewdaly/Projects/url-shortener/node_modules/request/request.js:1258:12)
      at IncomingMessage.emit (events.js:117:20)
      at _stream_readable.js:943:16
      at process._tickCallback (node.js:419:13)



=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/url-shortener/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/url-shortener/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 23/23 ), 3 ignored
Branches     : 100% ( 6/6 ), 1 ignored
Functions    : 100% ( 1/1 )
Lines        : 100% ( 23/23 )
================================================================================
>>
Warning: Task "mocha_istanbul:coverage" failed. Use --force to continue.

Aborted due to warnings.
```

We have a failing test, so let's make it pass. Add the following route after the index one:

```javascript
// Define submit route
app.post('/', function (req, res) {
    // Declare variables
    var url, id;

    // Get URL
    url = req.body.url;

    // Create a hashed short version
    id = shortid.generate();

    // Store them in Redis
    client.set(id, url, function () {
        // Display the response
        res.render('output', { id: id, base_url: base_url });
    });
});
```

This route is fairly simple. It handles POST requests to the index route, and first of all it gets the URL from the POST request. Then it randomly generates a hash to use as the key.

The next part is where we see Redis in action. We create a new key-value pair, with the key set to the newly generated ID, and the value set to the URL. Once Redis confirms that has been done, the callback is fired, which renders the `output.jade` view with the ID and base URL passed through, so that we can see our shortened URL.

With that done, our test should pass:

```bash
$ grunt test
Running "jshint:all" (jshint) task
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Shortbread (89ms)
    Test submitting a URL
      ✓ should return the shortened URL (65ms)
Stopping the server


  2 passing (167ms)

=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/url-shortener/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/url-shortener/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 29/29 ), 3 ignored
Branches     : 100% ( 6/6 ), 1 ignored
Functions    : 100% ( 3/3 )
Lines        : 100% ( 29/29 )
================================================================================
>> Done. Check coverage folder.

Done, without errors.
```

Our final task is to implement the short URL handling. We want to check to see if a short URL exists. If it does, we redirect the user to the destination. If it doesn't, we raise a 404 error. For that we need two more tests. Here they are:

```javascript

    // Test following a URL
    describe('Test following a URL', function () {
        it('should redirect the user to the shortened URL', function (done) {
            // Create the URL
            client.set('testurl', 'http://www.google.com', function () {
                // Follow the link
                request.get({
                    url: 'http://localhost:5000/testurl',
                    followRedirect: false
                }, function (error, response, body) {
                    expect(response.headers.location).to.equal('http://www.google.com');
                    expect(response.statusCode).to.equal(301);
                    done();
                });
            });
        });
    });

    // Test non-existent link
    describe('Test following a non-existent-link', function () {
        it('should return a 404 error', function (done) {
            // Follow the link
            request.get({
                url: 'http://localhost:5000/nonexistenturl',
                followRedirect: false
            }, function (error, response, body) {
                expect(response.statusCode).to.equal(404);
                expect(body).to.include('Link not found');
                done();
            });
        });
    });
```

The first test creates a URL for testing purposes. It then navigates to that URL. Note that we set `followRedirect` to `true` - this is because, by default, `request` will follow any redirect, so we need to prevent it from doing so to ensure that the headers to redirect the user are set correctly.

Once the response has been received, we then check that the status code is 301 (Moved Permanently), and that the `Location` header is set to the correct destination. When a real browser visits this page, it will be redirected accordingly.

The second test tries to fetch a non-existent URL, and checks that the status code is 404, and the response contains the words `Link not found`.

If we run our tests, they should now fail:

```bash
$ grunt test
Running "jshint:all" (jshint) task
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Shortbread (252ms)
    Test submitting a URL
      ✓ should return the shortened URL (47ms)
    Test following a URL
      1) should redirect the user to the shortened URL
    Test following a non-existent-link
      2) should return a 404 error
Stopping the server


  2 passing (322ms)
  2 failing

  1) server Test following a URL should redirect the user to the shortened URL:
     Uncaught AssertionError: expected undefined to equal 'http://www.google.com'
      at Request._callback (/Users/matthewdaly/Projects/url-shortener/test/test.js:63:58)
      at Request.self.callback (/Users/matthewdaly/Projects/url-shortener/node_modules/request/request.js:372:22)
      at Request.emit (events.js:98:17)
      at Request.<anonymous> (/Users/matthewdaly/Projects/url-shortener/node_modules/request/request.js:1310:14)
      at Request.emit (events.js:117:20)
      at IncomingMessage.<anonymous> (/Users/matthewdaly/Projects/url-shortener/node_modules/request/request.js:1258:12)
      at IncomingMessage.emit (events.js:117:20)
      at _stream_readable.js:943:16
      at process._tickCallback (node.js:419:13)

  2) server Test following a non-existent-link should return a 404 error:
     Uncaught AssertionError: expected 'Cannot GET /nonexistenturl\n' to include 'Link not found'
      at Request._callback (/Users/matthewdaly/Projects/url-shortener/test/test.js:80:33)
      at Request.self.callback (/Users/matthewdaly/Projects/url-shortener/node_modules/request/request.js:372:22)
      at Request.emit (events.js:98:17)
      at Request.<anonymous> (/Users/matthewdaly/Projects/url-shortener/node_modules/request/request.js:1310:14)
      at Request.emit (events.js:117:20)
      at IncomingMessage.<anonymous> (/Users/matthewdaly/Projects/url-shortener/node_modules/request/request.js:1258:12)
      at IncomingMessage.emit (events.js:117:20)
      at _stream_readable.js:943:16
      at process._tickCallback (node.js:419:13)



=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/url-shortener/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/url-shortener/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 29/29 ), 3 ignored
Branches     : 100% ( 6/6 ), 1 ignored
Functions    : 100% ( 3/3 )
Lines        : 100% ( 29/29 )
================================================================================
>>
Warning: Task "mocha_istanbul:coverage" failed. Use --force to continue.

Aborted due to warnings.
```

Now, let's add our final route:

```javascript
// Define link route
app.route('/:id').all(function (req, res) {
    // Get ID
    var id = req.params.id.trim();

    // Look up the URL
    client.get(id, function (err, reply) {
        if (!err && reply) {
            // Redirect user to it
            res.status(301);
            res.set('Location', reply);
            res.send();
        } else {
            // Confirm no such link in database
            res.status(404);
            res.render('error');
        }
    });
});
```

We accept the ID as a parameter in the URL. We trim off any whitespace around it, and then we query Redis for a URL with that ID. If we find one, we set the status code to 301, and the location to the URL, and send the response. Otherwise, we set the status to 404 and render the error view.

Now, let's check it passes:

```bash
$ grunt test
Running "jshint:all" (jshint) task
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Shortbread (90ms)
    Test submitting a URL
      ✓ should return the shortened URL (47ms)
    Test following a URL
      ✓ should redirect the user to the shortened URL
    Test following a non-existent-link
      ✓ should return a 404 error
Stopping the server


  4 passing (191ms)

=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/url-shortener/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/url-shortener/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 38/38 ), 3 ignored
Branches     : 100% ( 10/10 ), 1 ignored
Functions    : 100% ( 5/5 )
Lines        : 100% ( 38/38 )
================================================================================
>> Done. Check coverage folder.

Done, without errors.
```

Excellent! Our URL shortener is now complete. From here, deploying it to Heroku is straightforward - you'll need to install the Redis to Go addon, and refer to Heroku's documentation on deploying Node.js applications for more details.

Wrapping up
-----------

You'll find the source for this application at [https://github.com/matthewbdaly/Shortbread](https://github.com/matthewbdaly/Shortbread) and a demo at [http://shortbread-example.herokuapp.com/](http://shortbread-example.herokuapp.com/).

I hope you've enjoyed this brief introduction to Redis, and that it's opened your eyes to at least one of the alternatives out there to a relational database. I'll hopefully be able to follow this up with examples of some other problems Redis is ideal for solving.
