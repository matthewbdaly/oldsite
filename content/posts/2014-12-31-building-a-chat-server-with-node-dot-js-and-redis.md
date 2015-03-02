---
layout: post
title: "Building a chat server with Node.js and Redis"
date: 2014-12-31 14:10:57 +0000
comments: true
categories: 
- node.js
- redis
---

One of the more interesting capabilities Redis offers is its support for Pub/Sub. This allows you to subscribe to a specific channel, and then react when some content is published to that channel. In this tutorial, we'll build a very simple web-based chat system that demonstrates Redis's Pub/Sub support in action. Chat systems are pretty much synonymous with Node.js - it's widely considered the "Hello, World!" of Node.js. Since we already used Node with the prior Redis tutorial, then it also makes sense to stick with it for this project too.

Installing Node.js
------------------

Since the last tutorial, I've discovered [NVM](https://github.com/creationix/nvm), and if you're using any flavour of Unix, I highly recommend using it. It's not an option if you're using Windows, however Redis doesn't officially support Windows anyway, so if you want to follow along on a Windows machine I'd recommend using a VM.

If you followed the URL shortener tutorial, you should already have everything you need, though I'd still recommend switching to NVM as it's very convenient. We'll be using Grunt again, so you'll need to make sure you have `grunt-cli` installed with the following command:

```bash
$ npm install -g grunt-cli
```

This assumes you used NVM to install Node - if it's installed globally, you may need to use `sudo`.

Installing dependencies
-----------------------

As usual with a Node.js project, our first step is to create our `package.json` file:

```bash
$ npm init
```

Answer the questions so you end up with something like this (or just paste this into `package.json` and amend it as you see fit):

```json
{
  "name": "babblr",
  "version": "1.0.0",
  "description": "Chat client",
  "main": "index.js",
  "scripts": {
    "test": "grunt test --verbose"
  },
  "keywords": [
    "chat"
  ],
  "author": "Matthew Daly <matthew@matthewdaly.co.uk> (http://matthewdaly.co.uk/)",
  "license": "GPLv2"
}
```

Now let's install our dependencies:

```bash
$ npm install express hbs redis hiredis socket.io socket.io-client --save
$ npm install chai grunt grunt-contrib-jshint grunt-coveralls grunt-mocha-istanbul istanbul mocha request --save-dev
```

These two commands will install our dependencies.

Now, if you followed on with the URL shortener tutorial, you'll notice that we aren't using Jade - instead we're going to use Handlebars. Jade is quite a nice templating system, but I find it gets in the way for larger projects - you spend too much time looking up the syntax for things you already know in HTML. Handlebars is closer to HTML so we will use that. We'll also use Socket.IO extensively on this project.

Support files
-------------

As before, we'll also use Mocha for our unit tests and Istanbul to generate coverage stats. We'll need a Grunt configuration for that, so here it is:

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
                    reportFormats: ['cobertura', 'html', 'lcovonly']
                }
            }
        },
        coveralls: {
            options: {
                src: 'coverage/lcov.info',
                force: false
            },
            app: {
                src: 'coverage/lcov.info'
            }
        }
    });

    // Load tasks
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-coveralls');
    grunt.loadNpmTasks('grunt-mocha-istanbul');

    // Register tasks
    grunt.registerTask('test', ['jshint', 'mocha_istanbul:coverage', 'coveralls']);
};
```

We also need a `.bowerrc`:

```json
{
    "directory": "static/bower_components"
}
```

And a `bower.json`:

```json
{
  "name": "babblr",
  "main": "index.js",
  "version": "1.0.0",
  "authors": [
    "Matthew Daly <matthewbdaly@gmail.com>"
  ],
  "description": "A simple chat server",
  "moduleType": [
    "node"
  ],
  "keywords": [
    "chat"
  ],
  "license": "GPLv2",
  "homepage": "http://www.matthewdaly.co.uk",
  "private": true,
  "ignore": [
    "**/.*",
    "node_modules",
    "bower_components",
    "test",
    "tests"
  ],
  "dependencies": {
    "html5-boilerplate": "~4.3.0",
    "jquery": "~2.1.1",
    "bootstrap": "~3.3.1"
  }
}
```

Then install the Bower dependencies:

```bash
$ bower install
```

We also need a `Procfile` so we can run it on Heroku:

```bash
web: node index.js
```

Now, let's create the main file:

```bash
$ touch index.js
```

And our test file:

```bash
$ mkdir test
$ touch test/test.js
```

Implementing the chat server
----------------------------

Next, let's implement our first test. First of all, we'll verify that the index route works:

```javascript
/*jslint node: true */
/*global describe: false, before: false, after: false, it: false */
"use strict";

// Declare the variables used
var expect = require('chai').expect,
    request = require('request'),
    server = require('../index'),
    redis = require('redis'),
    io = require('socket.io-client'),
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
        it('should return a page with the title Babblr', function (done) {
            request.get({ url: 'http://localhost:5000/' }, function (error, response, body) {
                expect(body).to.include('Babblr');
                expect(response.statusCode).to.equal(200);
                expect(response.headers['content-type']).to.equal('text/html; charset=utf-8');
                done();
            });
        });
    });
});
```

Note that this is very similar to the first test for the URL shortener, because it's doing basically the same thing.

Now, run the test and make sure it fails:

```bash
$ grunt test
Running "jshint:all" (jshint) task
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task


  server
Starting the server
    Test the index route
      1) should return a page with the title Babblr
Stopping the server


  0 passing (873ms)
  1 failing

  1) server Test the index route should return a page with the title Babblr:
     Uncaught AssertionError: expected undefined to include 'Babblr'
      at Request._callback (/Users/matthewdaly/Projects/babblr/test/test.js:34:33)
      at self.callback (/Users/matthewdaly/Projects/babblr/node_modules/request/request.js:373:22)
      at Request.emit (events.js:95:17)
      at Request.onRequestError (/Users/matthewdaly/Projects/babblr/node_modules/request/request.js:971:8)
      at ClientRequest.emit (events.js:95:17)
      at Socket.socketErrorListener (http.js:1552:9)
      at Socket.emit (events.js:95:17)
      at net.js:441:14
      at process._tickCallback (node.js:442:13)



=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/babblr/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/babblr/coverage]
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

With that confirmed, we can start writing code to make the test pass:

```javascript
/*jslint node: true */
'use strict';

// Declare variables used
var app, base_url, client, express, hbs, io, port, rtg, subscribe;

// Define values
express = require('express');
app = express();
port = process.env.PORT || 5000;
base_url = process.env.BASE_URL || 'http://localhost:5000';
hbs = require('hbs');

// Set up connection to Redis
/* istanbul ignore if */
if (process.env.REDISTOGO_URL) {
    rtg  = require("url").parse(process.env.REDISTOGO_URL);
    client = require("redis").createClient(rtg.port, rtg.hostname);
    subscribe = require("redis").createClient(rtg.port, rtg.hostname);
    client.auth(rtg.auth.split(":")[1]);
    subscribe.auth(rtg.auth.split(":")[1]);
} else {
    client = require('redis').createClient();
    subscribe = require('redis').createClient();
}

// Set up templating
app.set('views', __dirname + '/views');
app.set('view engine', "hbs");
app.engine('hbs', require('hbs').__express);

// Register partials
hbs.registerPartials(__dirname + '/views/partials');

// Set URL
app.set('base_url', base_url);

// Define index route
app.get('/', function (req, res) {
    res.render('index');
});

// Serve static files
app.use(express.static(__dirname + '/static'));

// Listen
io = require('socket.io')({
}).listen(app.listen(port));
console.log("Listening on port " + port);
```

If you compare this to the code for the URL shortener, you'll notice a few fairly substantial differences. For one thing, we set up two Redis connections, not one - that's because we need to do so when using Pub/Sub with Redis. You'll also notice that we register Handlebars (`hbs`) rather than Jade, and define not just a directory for views, but another directory inside it for partials. Finally, setting it up to listen at the end is a bit more involved because we'll be using Socket.IO.

Now, you can run your tests again at this point, but they won't pass because we haven't created our views. So let's do that. Create the directory `views` and the subdirectory `partials` inside it. Then add the following content to `views/index.hbs`:

```hbs
{{> header }}
        <div class="container">
            <div class="row">
                <div class="col-md-8">
                    <div class="conversation">
                    </div>
                </div>
                <div class="col-md-4">
                    <form>
                        <div class="form-group">
                            <label for="message">Message</label>
                            <textarea class="form-control" id="message" rows="20"></textarea>
                            <a id="submitbutton" class="btn btn-primary form-control">Submit</a>
                        <div>
                    </form>
                </div>
            </div>
        </div>
{{> footer }}
```

Add this to `views/partials/header.hbs`:

```hbs
<!DOCTYPE html>
<!--[if lt IE 7]>      <html class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
<!--[if IE 7]>         <html class="no-js lt-ie9 lt-ie8"> <![endif]-->
<!--[if IE 8]>         <html class="no-js lt-ie9"> <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js"> <!--<![endif]-->
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Babblr</title>
        <meta name="description" content="">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <!-- Place favicon.ico and apple-touch-icon.png in the root directory -->

        <link rel="stylesheet" href="/bower_components/bootstrap/dist/css/bootstrap.min.css">
        <link rel="stylesheet" href="/bower_components/bootstrap/dist/css/bootstrap-theme.min.css">
        <link rel="stylesheet" href="/css/style.css">
    </head>
    <body>
        <!--[if lt IE 7]>
            <p class="browsehappy">You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> to improve your experience.</p>
        <![endif]-->
        <nav class="navbar navbar-inverse navbar-static-top" role="navigation">
            <div class="container">
                <div class="navbar-header">
                    <a class="navbar-brand" href="#">Babblr</a>
                </div>
            </div>
        </nav>
```

And add this to `views/partials/footer.hbs`:

```hbs

        <script src="/bower_components/jquery/dist/jquery.min.js"></script>
        <script src="/bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
        <script src="/socket.io/socket.io.js"></script>
        <script src="/js/main.js"></script>

    </body>
</html>
```

You'll also want to create placeholder CSS and JavaScript files:

```bash
$ mkdir static/js
$ mkdir static/css
$ touch static/js/main.js
$ touch static/css/style.css
```

The test should now pass:

```bash
$ grunt test
Running "jshint:all" (jshint) task
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Babblr (41ms)
Stopping the server


  1 passing (54ms)

=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/babblr/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/babblr/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 24/24 ), 5 ignored
Branches     : 100% ( 6/6 ), 1 ignored
Functions    : 100% ( 1/1 )
Lines        : 100% ( 24/24 )
================================================================================
>> Done. Check coverage folder.

Running "coveralls:app" (coveralls) task
>> Failed to submit 'coverage/lcov.info' to coveralls: Bad response: 422 {"message":"Couldn't find a repository matching this job.","error":true}
>> Failed to submit coverage results to coveralls
Warning: Task "coveralls:app" failed. Use --force to continue.

Aborted due to warnings.
```

Don't worry about the coveralls task failing, as that only needs to pass when it runs on Travis CI.

So we now have our main route in place. The next step is to actually implement the chat functionality. Add this code to the test file:

```javascript

    // Test sending a message
    describe('Test sending a message', function () {
        it("should return 'Message received'", function (done) {
            // Connect to server
            var socket = io.connect('http://localhost:5000', {
                'reconnection delay' : 0,
                'reopen delay' : 0,
                'force new connection' : true
            });

            // Handle the message being received
            socket.on('message', function (data) {
                expect(data).to.include('Message received');
                socket.disconnect();
                done();
            });

            // Send the message
            socket.emit('send', { message: 'Message received' });
        });
    });
```

This code should be fairly straightforward to understand. First, we connect to the server. Then, we set up a handler to verify the content of the message when it gets sent. Finally, we send the message. Let's run the tests to make sure we get the expected result:

```bash
$ grunt test
Running "jshint:all" (jshint) task
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Babblr (337ms)
    Test sending a message
      1) should return 'Message received'
Stopping the server


  1 passing (2s)
  1 failing

  1) server Test sending a message should return 'Message received':
     Error: timeout of 2000ms exceeded
      at null.<anonymous> (/Users/matthewdaly/Projects/babblr/node_modules/mocha/lib/runnable.js:159:19)
      at Timer.listOnTimeout [as ontimeout] (timers.js:112:15)



=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/babblr/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/babblr/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 24/24 ), 5 ignored
Branches     : 100% ( 6/6 ), 1 ignored
Functions    : 100% ( 1/1 )
Lines        : 100% ( 24/24 )
================================================================================
>>
Warning: Task "mocha_istanbul:coverage" failed. Use --force to continue.

Aborted due to warnings.
```

Now, let's implement this functionality. Add this at the end of `index.js`:

```javascript
// Handle new messages
io.sockets.on('connection', function (socket) {
    // Subscribe to the Redis channel
    subscribe.subscribe('ChatChannel');

    // Handle incoming messages
    socket.on('send', function (data) {
        // Publish it
        client.publish('ChatChannel', data.message);
    });

    // Handle receiving messages
    var callback = function (channel, data) {
        socket.emit('message', data);
    };
    subscribe.on('message', callback);

    // Handle disconnect
    socket.on('disconnect', function () {
        subscribe.removeListener('message', callback);
    });
});
```

We'll go through this. First, we create a callback for when a new connection is received. Inside the callback, we then subscribe to a Pub/Sub channel in Redis called `ChatChannel`.

Then, we define another callback so that on a `send` event from Socket.IO, we get the message and publish it to `ChatChannel`. After that, we define another callback to handle receiving messages, and set it to run when a new message is published to `ChatChannel`. Finally, we set up a callback to handle removing the listener when a user disconnects.

Note the two different connections to Redis - `client` and `subscribe`. As mentioned earlier, you need to use two connections to Redis when using Pub/Sub. This is because a client subscribed to one or more channels should not issue commands, so we use `subscribe` as a dedicated connection to handle subscriptions, and use `client` to publish new messages.

We'll also need a bit of client-side JavaScript to handle sending and receiving messages. Amend `main.js` as follows:

```javascript
$(document).ready(function () {
    'use strict';

    // Set up the connection
    var field, socket, output;
    socket = io.connect(window.location.href);

    // Get a reference to the input
    field = $('textarea#message');

    // Get a reference to the output
    output = $('div.conversation');

    // Handle message submit
    $('a#submitbutton').on('click', function () {
        // Create the message
        var msg;
        msg = field.val();
        socket.emit('send', { message: msg });
        field.val('');
    });

    // Handle incoming messages
    socket.on('message', function (data) {
        // Insert the message
        output.append('<p>Anonymous Coward : ' + data + '</p>');
    });
});
```

Here we have one callback that handles sending messages, and another that handles receiving messages. Note that every message will be preceded with Anonymous Coward - we won't implement user names at this point (though I plan it for a future instalment).

We'll also add a little bit of additional styling:

```css
div.conversation {
    height: 500px;
    overflow-y: scroll;
    border: 1px solid #000;
    padding: 10px;
}
```

Now, if you run your tests, they should pass:

```bash
$ grunt test
Running "jshint:all" (jshint) task
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Babblr (40ms)
    Test sending a message
      ✓ should return 'Message received' (45ms)
Stopping the server


  2 passing (101ms)

=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/babblr/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/babblr/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 33/33 ), 5 ignored
Branches     : 100% ( 6/6 ), 1 ignored
Functions    : 100% ( 5/5 )
Lines        : 100% ( 33/33 )
================================================================================
>> Done. Check coverage folder.

Running "coveralls:app" (coveralls) task
>> Failed to submit 'coverage/lcov.info' to coveralls: Bad response: 422 {"message":"Couldn't find a repository matching this job.","error":true}
>> Failed to submit coverage results to coveralls
Warning: Task "coveralls:app" failed. Use --force to continue.

Aborted due to warnings.
```

If you now run the following command:

```bash
$ node index.js
```

Then visit `http://localhost:5000`, you should be able to create new messages. If you then open it up in a second tab, you can see messages added in one tab appear in another. Deploying to Heroku using Redis To Go will be straightforward, and you can then access it from multiple devices and see new chat messages appear in real time.

Wrapping up
-----------

This illustrates just how straightforward it is to use Redis's Pub/Sub capability. The chat system is still quite limited, so in a future instalment we'll develop it further. You can get the source code from the [Github repository](https://github.com/matthewbdaly/babblr) - just switch to the `lesson-1` tag.
