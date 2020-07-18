---
title: "Extending our Node.js and Redis chat server"
date: 2015-03-02 23:03:48 +0000
categories: 
- node.js
- redis
comments: true
---

In this tutorial, we're going to extend the chat system we built in [the first tutorial](/blog/2014/12/31/building-a-chat-server-with-node-dot-js-and-redis/) to include the following functionality:

* Persisting the data
* Prompting users to sign in and storing their details in a Redis-backed session

In the process, we'll pick up a bit more about using Redis.

Persistence
-----------

Our first task is to make our messages persist when the session ends. Now, in order to do this, we're going to use a list. A list in Redis can be thought of as equivalent to an array or list in most programming languages, and can be retrieved by passing the key in a similar fashion to how you would retrieve a string.

As usual, we will write our test first. Open up `test/test.js` and replace the test for sending a message with this:

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

                client.lrange('chat:messages', 0, -1, function (err, messages) {
                    // Check message has been persisted
                    var message_list = [];
                    messages.forEach(function (message, i) {
                        message_list.push(message);
                    });
                    expect(message_list[0]).to.include('Message received');

                    // Finish up
                    socket.disconnect();
                    done();
                });
            });

            // Send the message
            socket.emit('send', { message: 'Message received' });
        });
    });
```

The main difference here is that we use our Redis client to get the list `chat:messages`, and check to see if our message appears in it. Now, let's run our test to ensure it fails:

```bash
$ npm test

> babblr@1.0.0 test /Users/matthewdaly/Projects/babblr
> grunt test --verbose

Initializing
Command-line options: --verbose

Reading "Gruntfile.js" Gruntfile...OK

Registering Gruntfile tasks.
Initializing config...OK

Registering "grunt-contrib-jshint" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-contrib-jshint/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-contrib-jshint/package.json...OK
Loading "jshint.js" tasks...OK
+ jshint

Registering "grunt-coveralls" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-coveralls/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-coveralls/package.json...OK
Loading "coverallsTask.js" tasks...OK
+ coveralls

Registering "grunt-mocha-istanbul" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-mocha-istanbul/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-mocha-istanbul/package.json...OK
Loading "index.js" tasks...OK
+ istanbul_check_coverage, mocha_istanbul
Loading "Gruntfile.js" tasks...OK
+ test

Running tasks: test

Running "test" task

Running "jshint" task

Running "jshint:all" (jshint) task
Verifying property jshint.all exists in config...OK
Files: test/test.js, index.js -> all
Options: force=false, reporterOutput=null
OK
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
Verifying property mocha_istanbul.coverage exists in config...OK
Files: test
Options: require=[], ui=false, globals=[], reporter=false, timeout=false, coverage=false, slow=false, grep=false, dryRun=false, quiet=false, recursive=false, mask="*.js", root=false, print=false, noColors=false, harmony=false, coverageFolder="coverage", reportFormats=["cobertura","html","lcovonly"], check={"statements":false,"lines":false,"functions":false,"branches":false}, excludes=false, mochaOptions=false, istanbulOptions=false
>> Will execute: node /Users/matthewdaly/Projects/babblr/node_modules/istanbul/lib/cli.js cover --dir=/Users/matthewdaly/Projects/babblr/coverage --report=cobertura --report=html --report=lcovonly /Users/matthewdaly/Projects/babblr/node_modules/mocha/bin/_mocha -- test/*.js
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Babblr (484ms)
    Test sending a message
      1) should return 'Message received'
Stopping the server


  1 passing (552ms)
  1 failing

  1) server Test sending a message should return 'Message received':
     Uncaught AssertionError: expected undefined to include 'Message received'
      at /Users/matthewdaly/Projects/babblr/test/test.js:62:48
      at try_callback (/Users/matthewdaly/Projects/babblr/node_modules/redis/index.js:592:9)
      at RedisClient.return_reply (/Users/matthewdaly/Projects/babblr/node_modules/redis/index.js:685:13)
      at HiredisReplyParser.<anonymous> (/Users/matthewdaly/Projects/babblr/node_modules/redis/index.js:321:14)
      at HiredisReplyParser.emit (events.js:95:17)
      at HiredisReplyParser.execute (/Users/matthewdaly/Projects/babblr/node_modules/redis/lib/parser/hiredis.js:43:18)
      at RedisClient.on_data (/Users/matthewdaly/Projects/babblr/node_modules/redis/index.js:547:27)
      at Socket.<anonymous> (/Users/matthewdaly/Projects/babblr/node_modules/redis/index.js:102:14)
      at Socket.emit (events.js:95:17)
      at Socket.<anonymous> (_stream_readable.js:765:14)
      at Socket.emit (events.js:92:17)
      at emitReadable_ (_stream_readable.js:427:10)
      at emitReadable (_stream_readable.js:423:5)
      at readableAddChunk (_stream_readable.js:166:9)
      at Socket.Readable.push (_stream_readable.js:128:10)
      at TCP.onread (net.js:529:21)



=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/babblr/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/babblr/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 96.97% ( 32/33 ), 5 ignored
Branches     : 100% ( 6/6 ), 1 ignored
Functions    : 80% ( 4/5 )
Lines        : 96.97% ( 32/33 )
================================================================================
>>
Warning: Task "mocha_istanbul:coverage" failed. Use --force to continue.

Aborted due to warnings.
npm ERR! Test failed.  See above for more details.
npm ERR! not ok code 0
```

Our test fails, so now we can start work on implementing the functionality we need. First of all, when a new message is sent, we need to push it to the list. Amend the new message handler in `index.js` to look like this:

```javascript
// Handle new messages
io.sockets.on('connection', function (socket) {
    // Subscribe to the Redis channel
    subscribe.subscribe('ChatChannel');

    // Handle incoming messages
    socket.on('send', function (data) {
        // Publish it
        client.publish('ChatChannel', data.message);

        // Persist it to a Redis list
        client.rpush('chat:messages', 'Anonymous Coward : ' + data.message);
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

The only significant change is the `Persist it to a Redis list` section. Here we call the `RPUSH` command to push the current message to `chat:messages`. `RPUSH` pushes a message to the end of the list. There's a similar command, `LPUSH`, which pushes an item to the beginning of the list, as well as `LPOP` and `RPOP`, which remove and return an item from the beginning and end of the list respectively.

Next we need to handle displaying the list when the main route loads. Replace the index route in `index.js` with this:

```javascript
// Define index route
app.get('/', function (req, res) {
    // Get messages
    client.lrange('chat:messages', 0, -1, function (err, messages) {
        /* istanbul ignore if */
        if (err) {
            console.log(err);
        } else {
            // Get messages
            var message_list = [];
            messages.forEach(function (message, i) {
                /* istanbul ignore next */
                message_list.push(message);
            });

            // Render page
            res.render('index', { messages: message_list});
        }
    });
});
```

Here we use the client to return all messages in the list by using the `LRANGE` command and defining the slice as being from the start to the end of the list. We then loop through the messages and push each to a list, before passing that list to the view.

Speaking of which, we also need to update `views/index.hbs`:

```handlebars
{{> header }}
        <div class="container">
            <div class="row">
                <div class="col-md-8">
                    <div class="conversation">
                        {{#each messages}}
                        <p>{{this}}</p>
                        {{/each}}
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

This just loops through the messages and prints each one in turn. Now let's run our tests and make sure they pass:

```bash
$ npm test

> babblr@1.0.0 test /Users/matthewdaly/Projects/babblr
> grunt test --verbose

Initializing
Command-line options: --verbose

Reading "Gruntfile.js" Gruntfile...OK

Registering Gruntfile tasks.
Initializing config...OK

Registering "grunt-contrib-jshint" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-contrib-jshint/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-contrib-jshint/package.json...OK
Loading "jshint.js" tasks...OK
+ jshint

Registering "grunt-coveralls" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-coveralls/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-coveralls/package.json...OK
Loading "coverallsTask.js" tasks...OK
+ coveralls

Registering "grunt-mocha-istanbul" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-mocha-istanbul/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-mocha-istanbul/package.json...OK
Loading "index.js" tasks...OK
+ istanbul_check_coverage, mocha_istanbul
Loading "Gruntfile.js" tasks...OK
+ test

Running tasks: test

Running "test" task

Running "jshint" task

Running "jshint:all" (jshint) task
Verifying property jshint.all exists in config...OK
Files: test/test.js, index.js -> all
Options: force=false, reporterOutput=null
OK
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
Verifying property mocha_istanbul.coverage exists in config...OK
Files: test
Options: require=[], ui=false, globals=[], reporter=false, timeout=false, coverage=false, slow=false, grep=false, dryRun=false, quiet=false, recursive=false, mask="*.js", root=false, print=false, noColors=false, harmony=false, coverageFolder="coverage", reportFormats=["cobertura","html","lcovonly"], check={"statements":false,"lines":false,"functions":false,"branches":false}, excludes=false, mochaOptions=false, istanbulOptions=false
>> Will execute: node /Users/matthewdaly/Projects/babblr/node_modules/istanbul/lib/cli.js cover --dir=/Users/matthewdaly/Projects/babblr/coverage --report=cobertura --report=html --report=lcovonly /Users/matthewdaly/Projects/babblr/node_modules/mocha/bin/_mocha -- test/*.js
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Babblr (1262ms)
    Test sending a message
      ✓ should return 'Message received' (48ms)
Stopping the server


  2 passing (2s)

=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/babblr/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/babblr/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 40/40 ), 7 ignored
Branches     : 100% ( 8/8 ), 2 ignored
Functions    : 85.71% ( 6/7 )
Lines        : 100% ( 40/40 )
================================================================================
>> Done. Check coverage folder.

Running "coveralls" task

Running "coveralls:app" (coveralls) task
Verifying property coveralls.app exists in config...OK
Files: coverage/lcov.info
Options: src="coverage/lcov.info", force=false
Submitting file to coveralls.io: coverage/lcov.info
>> Failed to submit 'coverage/lcov.info' to coveralls: Bad response: 422 {"message":"Couldn't find a repository matching this job.","error":true}
>> Failed to submit coverage results to coveralls
Warning: Task "coveralls:app" failed. Use --force to continue.

Aborted due to warnings.
npm ERR! Test failed.  See above for more details.
npm ERR! not ok code 0
```

As before, don't worry about Coveralls not working - it's only an issue when it runs on Travis CI. If everything else is fine, our chat server should now persist our changes.

Sessions and user login
-----------------------

At present, it's hard to carry on a conversation with someone using this site because you can't see who is responding to you. We need to implement a mechanism to obtain a username for each user, store it in a session, and then use it to identify all of a user's messages. In this case, we're going to just prompt the user to enter a username of their choice, but if you wish, you can use something like [Passport.js](http://passportjs.org/) to allow authentication using third-party services - I'll leave that as an exercise for the reader.

Now, Express doesn't include any support for sessions out of the box, so we have to install some additional libraries:

```bash
$ npm install connect-redis express-session body-parser --save
```

The `express-session` library is middleware for Express that allows for storing and retrieving session variables, while `connect-redis` allows it to use Redis to store this data. We used `body-parser` for the URL shortener to process `POST` data, so we will use it again here. Now, we need to set it up. Replace the part of `index.js` before we set up the templating with this:

```javascript
/*jslint node: true */
'use strict';

// Declare variables used
var app, base_url, client, express, hbs, io, port, RedisStore, rtg, session, subscribe;

// Define values
express = require('express');
app = express();
port = process.env.PORT || 5000;
base_url = process.env.BASE_URL || 'http://localhost:5000';
hbs = require('hbs');
session = require('express-session');
RedisStore = require('connect-redis')(session);

// Set up connection to Redis
/* istanbul ignore if */
if (process.env.REDISTOGO_URL) {
    rtg  = require('url').parse(process.env.REDISTOGO_URL);
    client = require('redis').createClient(rtg.port, rtg.hostname);
    subscribe = require('redis').createClient(rtg.port, rtg.hostname);
    client.auth(rtg.auth.split(':')[1]);
    subscribe.auth(rtg.auth.split(':')[1]);
} else {
    client = require('redis').createClient();
    subscribe = require('redis').createClient();
}

// Set up session
app.use(session({
    store: new RedisStore({
        client: client
    }),
    secret: 'blibble'
}));
```

This just sets up the session and configures it to use Redis as the back end. Don't forget to change the value of `secret`.

Now, let's plan out how our username system is going to work. If a user visits the site and there is no session set, then they should be redirected to a new route, `/login`. Here they will be prompted to enter a username. Once a satisfactory username (eg one or more characters) has been submitted via the form, it should be stored in the session and the user redirected to the index. There should also be a `/logout` route to destroy the session and redirect the user back to the login form.

First, let's implement a test for fetching the login form in `test/test.js`:

```javascript
    // Test submitting to the login route
    describe('Test submitting to the login route', function () {
        it('should store the username in the session and redirect the user to the index', function (done) {
            request.post({ url: 'http://localhost:5000/login',
                form:{username: 'bobsmith'},
                followRedirect: false},
                function (error, response, body) {
                    expect(response.headers.location).to.equal('/');
                    expect(response.statusCode).to.equal(302);
                    done();
            });
        });
    });
```

This test sends a `POST` request containing the field `username` with the value `bobsmith`. We expect to be redirected to the index route.

Let's run the test to make sure it fails:

```bash
$ npm test

> babblr@1.0.0 test /Users/matthewdaly/Projects/babblr
> grunt test --verbose

Initializing
Command-line options: --verbose

Reading "Gruntfile.js" Gruntfile...OK

Registering Gruntfile tasks.
Initializing config...OK

Registering "grunt-contrib-jshint" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-contrib-jshint/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-contrib-jshint/package.json...OK
Loading "jshint.js" tasks...OK
+ jshint

Registering "grunt-coveralls" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-coveralls/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-coveralls/package.json...OK
Loading "coverallsTask.js" tasks...OK
+ coveralls

Registering "grunt-mocha-istanbul" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-mocha-istanbul/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-mocha-istanbul/package.json...OK
Loading "index.js" tasks...OK
+ istanbul_check_coverage, mocha_istanbul
Loading "Gruntfile.js" tasks...OK
+ test

Running tasks: test

Running "test" task

Running "jshint" task

Running "jshint:all" (jshint) task
Verifying property jshint.all exists in config...OK
Files: test/test.js, index.js -> all
Options: force=false, reporterOutput=null
OK
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
Verifying property mocha_istanbul.coverage exists in config...OK
Files: test
Options: require=[], ui=false, globals=[], reporter=false, timeout=false, coverage=false, slow=false, grep=false, dryRun=false, quiet=false, recursive=false, mask="*.js", root=false, print=false, noColors=false, harmony=false, coverageFolder="coverage", reportFormats=["cobertura","html","lcovonly"], check={"statements":false,"lines":false,"functions":false,"branches":false}, excludes=false, mochaOptions=false, istanbulOptions=false
>> Will execute: node /Users/matthewdaly/Projects/babblr/node_modules/istanbul/lib/cli.js cover --dir=/Users/matthewdaly/Projects/babblr/coverage --report=cobertura --report=html --report=lcovonly /Users/matthewdaly/Projects/babblr/node_modules/mocha/bin/_mocha -- test/*.js
express-session deprecated undefined resave option; provide resave option index.js:9:1585
express-session deprecated undefined saveUninitialized option; provide saveUninitialized option index.js:9:1585
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Babblr (45ms)
    Test the login route
      ✓ should return a page with the text Please enter a handle
    Test submitting to the login route
      1) should store the username in the session and redirect the user to the index
    Test sending a message
      ✓ should return 'Message received' (42ms)
Stopping the server


  3 passing (122ms)
  1 failing

  1) server Test submitting to the login route should store the username in the session and redirect the user to the index:
     Uncaught AssertionError: expected undefined to equal '/'
      at Request._callback (/Users/matthewdaly/Projects/babblr/test/test.js:61:58)
      at Request.self.callback (/Users/matthewdaly/Projects/babblr/node_modules/request/request.js:373:22)
      at Request.emit (events.js:98:17)
      at Request.<anonymous> (/Users/matthewdaly/Projects/babblr/node_modules/request/request.js:1318:14)
      at Request.emit (events.js:117:20)
      at IncomingMessage.<anonymous> (/Users/matthewdaly/Projects/babblr/node_modules/request/request.js:1266:12)
      at IncomingMessage.emit (events.js:117:20)
      at _stream_readable.js:944:16
      at process._tickCallback (node.js:442:13)



=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/babblr/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/babblr/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 45/45 ), 7 ignored
Branches     : 100% ( 8/8 ), 2 ignored
Functions    : 87.5% ( 7/8 )
Lines        : 100% ( 45/45 )
================================================================================
>>
Warning: Task "mocha_istanbul:coverage" failed. Use --force to continue.

Aborted due to warnings.
npm ERR! Test failed.  See above for more details.
npm ERR! not ok code 0
```

Now, all we need to do to make this test pass is create a view containing the form and define a route to display it. First, we'll define our new route in `index.js`:

```javascript
// Define login route
app.get('/login', function (req, res) {
    // Render view
    res.render('login');
});
```

Next, we'll create our new template at `views/login.hbs`:

```handlebars
{{> header }}
        <div class="container">
            <div class="row">
                <div class="col-md-12">
                    <form action="/login" method="POST">
                        <div class="form-group">
                            <label for="Username">Please enter a handle</label>
                            <input type="text" class="form-control" size="20" required id="username" name="username"></input>
                            <input type="submit" class="btn btn-primary form-control"></input>
                        <div>
                    </form>
                </div>
            </div>
        </div>
{{> footer }}
```

Let's run our tests and make sure they pass:

```bash
$ npm test

> babblr@1.0.0 test /Users/matthewdaly/Projects/babblr
> grunt test --verbose

Initializing
Command-line options: --verbose

Reading "Gruntfile.js" Gruntfile...OK

Registering Gruntfile tasks.
Initializing config...OK

Registering "grunt-contrib-jshint" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-contrib-jshint/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-contrib-jshint/package.json...OK
Loading "jshint.js" tasks...OK
+ jshint

Registering "grunt-coveralls" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-coveralls/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-coveralls/package.json...OK
Loading "coverallsTask.js" tasks...OK
+ coveralls

Registering "grunt-mocha-istanbul" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-mocha-istanbul/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-mocha-istanbul/package.json...OK
Loading "index.js" tasks...OK
+ istanbul_check_coverage, mocha_istanbul
Loading "Gruntfile.js" tasks...OK
+ test

Running tasks: test

Running "test" task

Running "jshint" task

Running "jshint:all" (jshint) task
Verifying property jshint.all exists in config...OK
Files: test/test.js, index.js -> all
Options: force=false, reporterOutput=null
OK
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
Verifying property mocha_istanbul.coverage exists in config...OK
Files: test
Options: require=[], ui=false, globals=[], reporter=false, timeout=false, coverage=false, slow=false, grep=false, dryRun=false, quiet=false, recursive=false, mask="*.js", root=false, print=false, noColors=false, harmony=false, coverageFolder="coverage", reportFormats=["cobertura","html","lcovonly"], check={"statements":false,"lines":false,"functions":false,"branches":false}, excludes=false, mochaOptions=false, istanbulOptions=false
>> Will execute: node /Users/matthewdaly/Projects/babblr/node_modules/istanbul/lib/cli.js cover --dir=/Users/matthewdaly/Projects/babblr/coverage --report=cobertura --report=html --report=lcovonly /Users/matthewdaly/Projects/babblr/node_modules/mocha/bin/_mocha -- test/*.js
express-session deprecated undefined resave option; provide resave option index.js:9:1585
express-session deprecated undefined saveUninitialized option; provide saveUninitialized option index.js:9:1585
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Babblr (64ms)
    Test the login route
      ✓ should return a page with the text Please enter a handle
    Test sending a message
      ✓ should return 'Message received' (78ms)
Stopping the server


  3 passing (179ms)

=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/babblr/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/babblr/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 45/45 ), 7 ignored
Branches     : 100% ( 8/8 ), 2 ignored
Functions    : 87.5% ( 7/8 )
Lines        : 100% ( 45/45 )
================================================================================
>> Done. Check coverage folder.

Running "coveralls" task

Running "coveralls:app" (coveralls) task
Verifying property coveralls.app exists in config...OK
Files: coverage/lcov.info
Options: src="coverage/lcov.info", force=false
Submitting file to coveralls.io: coverage/lcov.info
>> Failed to submit 'coverage/lcov.info' to coveralls: Bad response: 422 {"message":"Couldn't find a repository matching this job.","error":true}
>> Failed to submit coverage results to coveralls
Warning: Task "coveralls:app" failed. Use --force to continue.

Aborted due to warnings.
npm ERR! Test failed.  See above for more details.
npm ERR! not ok code 0
```

Next, we need to process the submitted form, set the session, and redirect the user back to the index. First, let's add another test:

```javascript
    // Test submitting to the login route
    describe('Test submitting to the login route', function () {
        it('should store the username in the session and redirect the user to the index', function (done) {
            request.post({ url: 'http://localhost:5000/login',
                form:{username: 'bobsmith'},
                followRedirect: false},
                function (error, response, body) {
                    expect(response.headers.location).to.equal('http://localhost:5000');
                    expect(response.statusCode).to.equal(301);
                    done();
            });
        });
    });
```

This test submits the username, and makes sure that the response received is a 301 redirect to the index route. Let's check to make sure it fails:

```bash
$ npm test

> babblr@1.0.0 test /Users/matthewdaly/Projects/babblr
> grunt test --verbose

Initializing
Command-line options: --verbose

Reading "Gruntfile.js" Gruntfile...OK

Registering Gruntfile tasks.
Initializing config...OK

Registering "grunt-contrib-jshint" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-contrib-jshint/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-contrib-jshint/package.json...OK
Loading "jshint.js" tasks...OK
+ jshint

Registering "grunt-coveralls" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-coveralls/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-coveralls/package.json...OK
Loading "coverallsTask.js" tasks...OK
+ coveralls

Registering "grunt-mocha-istanbul" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-mocha-istanbul/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-mocha-istanbul/package.json...OK
Loading "index.js" tasks...OK
+ istanbul_check_coverage, mocha_istanbul
Loading "Gruntfile.js" tasks...OK
+ test

Running tasks: test

Running "test" task

Running "jshint" task

Running "jshint:all" (jshint) task
Verifying property jshint.all exists in config...OK
Files: test/test.js, index.js -> all
Options: force=false, reporterOutput=null
OK
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
Verifying property mocha_istanbul.coverage exists in config...OK
Files: test
Options: require=[], ui=false, globals=[], reporter=false, timeout=false, coverage=false, slow=false, grep=false, dryRun=false, quiet=false, recursive=false, mask="*.js", root=false, print=false, noColors=false, harmony=false, coverageFolder="coverage", reportFormats=["cobertura","html","lcovonly"], check={"statements":false,"lines":false,"functions":false,"branches":false}, excludes=false, mochaOptions=false, istanbulOptions=false
>> Will execute: node /Users/matthewdaly/Projects/babblr/node_modules/istanbul/lib/cli.js cover --dir=/Users/matthewdaly/Projects/babblr/coverage --report=cobertura --report=html --report=lcovonly /Users/matthewdaly/Projects/babblr/node_modules/mocha/bin/_mocha -- test/*.js
express-session deprecated undefined resave option; provide resave option index.js:9:1585
express-session deprecated undefined saveUninitialized option; provide saveUninitialized option index.js:9:1585
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Babblr (476ms)
    Test the login route
      ✓ should return a page with the text Please enter a handle
    Test submitting to the login route
      1) should store the username in the session and redirect the user to the index
    Test sending a message
      ✓ should return 'Message received' (42ms)
Stopping the server


  3 passing (557ms)
  1 failing

  1) server Test submitting to the login route should store the username in the session and redirect the user to the index:
     Uncaught AssertionError: expected undefined to equal 'http://localhost:5000'
      at Request._callback (/Users/matthewdaly/Projects/babblr/test/test.js:61:58)
      at Request.self.callback (/Users/matthewdaly/Projects/babblr/node_modules/request/request.js:373:22)
      at Request.emit (events.js:98:17)
      at Request.<anonymous> (/Users/matthewdaly/Projects/babblr/node_modules/request/request.js:1318:14)
      at Request.emit (events.js:117:20)
      at IncomingMessage.<anonymous> (/Users/matthewdaly/Projects/babblr/node_modules/request/request.js:1266:12)
      at IncomingMessage.emit (events.js:117:20)
      at _stream_readable.js:944:16
      at process._tickCallback (node.js:442:13)



=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/babblr/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/babblr/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 45/45 ), 7 ignored
Branches     : 100% ( 8/8 ), 2 ignored
Functions    : 87.5% ( 7/8 )
Lines        : 100% ( 45/45 )
================================================================================
>>
Warning: Task "mocha_istanbul:coverage" failed. Use --force to continue.

Aborted due to warnings.
npm ERR! Test failed.  See above for more details.
npm ERR! not ok code 0
```

Now, in order to process `POST` data we'll need to use `body-parser`. Amend the top of `index.js` to look like this::

```javascript
/*jslint node: true */
'use strict';

// Declare variables used
var app, base_url, bodyParser, client, express, hbs, io, port, RedisStore, rtg, session, subscribe;

// Define values
express = require('express');
app = express();
bodyParser = require('body-parser');
port = process.env.PORT || 5000;
base_url = process.env.BASE_URL || 'http://localhost:5000';
hbs = require('hbs');
session = require('express-session');
RedisStore = require('connect-redis')(session);

// Set up connection to Redis
/* istanbul ignore if */
if (process.env.REDISTOGO_URL) {
    rtg  = require('url').parse(process.env.REDISTOGO_URL);
    client = require('redis').createClient(rtg.port, rtg.hostname);
    subscribe = require('redis').createClient(rtg.port, rtg.hostname);
    client.auth(rtg.auth.split(':')[1]);
    subscribe.auth(rtg.auth.split(':')[1]);
} else {
    client = require('redis').createClient();
    subscribe = require('redis').createClient();
}

// Set up session
app.use(session({
    store: new RedisStore({
        client: client
    }),
    secret: 'blibble'
}));

// Set up templating
app.set('views', __dirname + '/views');
app.set('view engine', "hbs");
app.engine('hbs', require('hbs').__express);

// Register partials
hbs.registerPartials(__dirname + '/views/partials');

// Set URL
app.set('base_url', base_url);

// Handle POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
      extended: true
}));
```

Next, we define a `POST` route to handle the username input:

```javascript
// Process login
app.post('/login', function (req, res) {
    // Get username
    var username = req.body.username;

    // If username length is zero, reload the page
    if (username.length === 0) {
        res.render('login');
    } else {
        // Store username in session and redirect to index
        req.session.username = username;
        res.redirect('/');
    }
});
```

This should be fairly straightforward. This route accepts a username parameter. If this parameter is not present, the user will see the login form again. Otherwise, they are redirected back to the index.

Now, if you check `coverage/index.html` after running the tests again, you'll notice that there's a gap in our coverage for the scenario when a user submits an empty username. Let's fix that - add the following test to `test/test.js`:

```javascript
    // Test empty login
    describe('Test empty login', function () {
        it('should show the login form', function (done) {
            request.post({ url: 'http://localhost:5000/login',
                form:{username: ''},
                followRedirect: false},
                function (error, response, body) {
                    expect(response.statusCode).to.equal(200);
                    expect(body).to.include('Please enter a handle');
                    done();
            });
        });
    });
```

Let's run our tests again:

```bash
$ npm test

> babblr@1.0.0 test /Users/matthewdaly/Projects/babblr
> grunt test --verbose

Initializing
Command-line options: --verbose

Reading "Gruntfile.js" Gruntfile...OK

Registering Gruntfile tasks.
Initializing config...OK

Registering "grunt-contrib-jshint" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-contrib-jshint/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-contrib-jshint/package.json...OK
Loading "jshint.js" tasks...OK
+ jshint

Registering "grunt-coveralls" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-coveralls/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-coveralls/package.json...OK
Loading "coverallsTask.js" tasks...OK
+ coveralls

Registering "grunt-mocha-istanbul" local Npm module tasks.
Reading /Users/matthewdaly/Projects/babblr/node_modules/grunt-mocha-istanbul/package.json...OK
Parsing /Users/matthewdaly/Projects/babblr/node_modules/grunt-mocha-istanbul/package.json...OK
Loading "index.js" tasks...OK
+ istanbul_check_coverage, mocha_istanbul
Loading "Gruntfile.js" tasks...OK
+ test

Running tasks: test

Running "test" task

Running "jshint" task

Running "jshint:all" (jshint) task
Verifying property jshint.all exists in config...OK
Files: test/test.js, index.js -> all
Options: force=false, reporterOutput=null
OK
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
Verifying property mocha_istanbul.coverage exists in config...OK
Files: test
Options: require=[], ui=false, globals=[], reporter=false, timeout=false, coverage=false, slow=false, grep=false, dryRun=false, quiet=false, recursive=false, mask="*.js", root=false, print=false, noColors=false, harmony=false, coverageFolder="coverage", reportFormats=["cobertura","html","lcovonly"], check={"statements":false,"lines":false,"functions":false,"branches":false}, excludes=false, mochaOptions=false, istanbulOptions=false
>> Will execute: node /Users/matthewdaly/Projects/babblr/node_modules/istanbul/lib/cli.js cover --dir=/Users/matthewdaly/Projects/babblr/coverage --report=cobertura --report=html --report=lcovonly /Users/matthewdaly/Projects/babblr/node_modules/mocha/bin/_mocha -- test/*.js
express-session deprecated undefined resave option; provide resave option index.js:9:1669
express-session deprecated undefined saveUninitialized option; provide saveUninitialized option index.js:9:1669
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Babblr (44ms)
    Test the login route
      ✓ should return a page with the text Please enter a handle
    Test submitting to the login route
      ✓ should store the username in the session and redirect the user to the index
    Test empty login
      ✓ should show the login form
    Test sending a message
      ✓ should return 'Message received' (41ms)
Stopping the server


  5 passing (145ms)

=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/babblr/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/babblr/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 54/54 ), 7 ignored
Branches     : 100% ( 10/10 ), 2 ignored
Functions    : 88.89% ( 8/9 )
Lines        : 100% ( 54/54 )
================================================================================
>> Done. Check coverage folder.

Running "coveralls" task

Running "coveralls:app" (coveralls) task
Verifying property coveralls.app exists in config...OK
Files: coverage/lcov.info
Options: src="coverage/lcov.info", force=false
Submitting file to coveralls.io: coverage/lcov.info
>> Failed to submit 'coverage/lcov.info' to coveralls: Bad response: 422 {"message":"Couldn't find a repository matching this job.","error":true}
>> Failed to submit coverage results to coveralls
Warning: Task "coveralls:app" failed. Use --force to continue.

Aborted due to warnings.
npm ERR! Test failed.  See above for more details.
npm ERR! not ok code 0
```

Our test now passes (bar, of course, Coveralls failing). Our next step is to actually do something with the session. Now, the `request` module we use in our test requires a third-party module called `tough-cookie` to work with cookies, so we need to install that:

```bash
$ npm install tough-cookie --save-dev
```

Next, amend the login test as follows:

```javascript
    // Test submitting to the login route
    describe('Test submitting to the login route', function () {
        it('should store the username in the session and redirect the user to the index', function (done) {
            request.post({ url: 'http://localhost:5000/login',
                form:{username: 'bobsmith'},
                jar: true,
                followRedirect: false},
                function (error, response, body) {
                    expect(response.headers.location).to.equal('/');
                    expect(response.statusCode).to.equal(302);

                    // Check the username
                    request.get({ url: 'http://localhost:5000/', jar: true }, function (error, response, body) {
                        expect(body).to.include('bobsmith');
                        done();
                    });
            });
        });
    });
```

Here we're using a new parameter, namely `jar` - this tells `request` to store the cookies. We POST the username to the login form, and then we get the index route and verify that the username is shown in the request. Check the test fails, then amend the index route in `index.js` as follows:

```javascript
// Define index route
app.get('/', function (req, res) {
    // Get messages
    client.lrange('chat:messages', 0, -1, function (err, messages) {
        /* istanbul ignore if */
        if (err) {
            console.log(err);
        } else {
            // Get username
            var username = req.session.username;

            // Get messages
            var message_list = [];
            messages.forEach(function (message, i) {
                /* istanbul ignore next */
                message_list.push(message);
            });

            // Render page
            res.render('index', { messages: message_list, username: username });
        }
    });
});
```

Note we get the username and pass it through to the view. We need to adapt the header view to display the username. Amend `views/partials/header.hbs` to look like this:

```handlebars
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
            <div class="container-fluid">
                <div class="navbar-header">
                    <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#header-nav">
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                    </button>
                    <a class="navbar-brand" href="/">Babblr</a>
                    <div class="collapse navbar-collapse navbar-right" id="header-nav">
                        <ul class="nav navbar-nav">
                            {{#if username}}
                            <li><a href="/logout">Logged in as {{ username }}</a></li>
                            {{else}}
                            <li><a href="/login">Log in</a></li>
                            {{/if}}
                        </ul>
                    </div>
                </div>
            </div>
        </nav>
```

Note the addition of a logout link, which we will implement later. Let's check our tests pass:

```bash
$ grunt test
Running "jshint:all" (jshint) task
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
express-session deprecated undefined resave option; provide resave option index.js:9:1669
express-session deprecated undefined saveUninitialized option; provide saveUninitialized option index.js:9:1669
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Babblr (44ms)
    Test the login route
      ✓ should return a page with the text Please enter a handle
    Test submitting to the login route
      ✓ should store the username in the session and redirect the user to the index
    Test empty login
      ✓ should show the login form
    Test sending a message
      ✓ should return 'Message received' (45ms)
Stopping the server


  5 passing (156ms)

=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/babblr/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/babblr/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 55/55 ), 7 ignored
Branches     : 100% ( 10/10 ), 2 ignored
Functions    : 88.89% ( 8/9 )
Lines        : 100% ( 55/55 )
================================================================================
>> Done. Check coverage folder.

Running "coveralls:app" (coveralls) task
>> Failed to submit 'coverage/lcov.info' to coveralls: Bad response: 422 {"message":"Couldn't find a repository matching this job.","error":true}
>> Failed to submit coverage results to coveralls
Warning: Task "coveralls:app" failed. Use --force to continue.

Aborted due to warnings.
```

Excellent! Next, let's implement the test for our logout route:

```javascript
    // Test logout
    describe('Test logout', function () {
        it('should log the user out', function (done) {
            request.post({ url: 'http://localhost:5000/login',
                form:{username: 'bobsmith'},
                jar: true,
                followRedirect: false},
                function (error, response, body) {
                    expect(response.headers.location).to.equal('/');
                    expect(response.statusCode).to.equal(302);

                    // Check the username
                    request.get({ url: 'http://localhost:5000/', jar: true }, function (error, response, body) {
                        expect(body).to.include('bobsmith');

                        // Log the user out
                        request.get({ url: 'http://localhost:5000/logout', jar: true }, function (error, response, body) {
                            expect(body).to.include('Log in');
                            done();
                            });
                    });
            });
        });
    });
```

This is largely the same as the previous test, but adds some additional content at the end to test logging out afterwards. Let's run the test:

```bash
$ grunt test
Running "jshint:all" (jshint) task
>> 2 files lint free.

Running "mocha_istanbul:coverage" (mocha_istanbul) task
express-session deprecated undefined resave option; provide resave option index.js:9:1669
express-session deprecated undefined saveUninitialized option; provide saveUninitialized option index.js:9:1669
Listening on port 5000


  server
Starting the server
    Test the index route
      ✓ should return a page with the title Babblr (536ms)
    Test the login route
      ✓ should return a page with the text Please enter a handle
    Test submitting to the login route
      ✓ should store the username in the session and redirect the user to the index
    Test empty login
      ✓ should show the login form
    Test logout
      1) should log the user out
    Test sending a message
      ✓ should return 'Message received' (49ms)
Stopping the server


  5 passing (682ms)
  1 failing

  1) server Test logout should log the user out:
     Uncaught AssertionError: expected 'Cannot GET /logout\n' to include 'Log in'
      at Request._callback (/Users/matthewdaly/Projects/babblr/test/test.js:105:45)
      at Request.self.callback (/Users/matthewdaly/Projects/babblr/node_modules/request/request.js:373:22)
      at Request.emit (events.js:98:17)
      at Request.<anonymous> (/Users/matthewdaly/Projects/babblr/node_modules/request/request.js:1318:14)
      at Request.emit (events.js:117:20)
      at IncomingMessage.<anonymous> (/Users/matthewdaly/Projects/babblr/node_modules/request/request.js:1266:12)
      at IncomingMessage.emit (events.js:117:20)
      at _stream_readable.js:944:16
      at process._tickCallback (node.js:442:13)



=============================================================================
Writing coverage object [/Users/matthewdaly/Projects/babblr/coverage/coverage.json]
Writing coverage reports at [/Users/matthewdaly/Projects/babblr/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 55/55 ), 7 ignored
Branches     : 100% ( 10/10 ), 2 ignored
Functions    : 88.89% ( 8/9 )
Lines        : 100% ( 55/55 )
================================================================================
>>
Warning: Task "mocha_istanbul:coverage" failed. Use --force to continue.

Aborted due to warnings.
```

Now we have a failing test, let's implement our logout route. Add the following route to `index.js`:

```javascript
// Process logout
app.get('/logout', function (req, res) {
    // Delete username from session
    req.session.username = null;

    // Redirect user
    res.redirect('/');
});
```

If you run your tests again, they should now pass.

Now that we have the user's name stored in the session, we can make use of it. First, let's amend `static/js/main.js` so that it no longer adds a default username:

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
        output.append('<p>' + data + '</p>');
    });
});
```

Then, in `index.js`, we need to declare a variable for our session middleware, which will be shared between Socket.IO and Express:

```javascript
// Declare variables used
var app, base_url, bodyParser, client, express, hbs, io, port, RedisStore, rtg, session, sessionMiddleware, subscribe;
```

Then we amend the session setup to make it easier to reuse for Socket.IO:

```javascript
// Set up session
sessionMiddleware = session({
    store: new RedisStore({
        client: client
    }),
    secret: 'blibble'
});
app.use(sessionMiddleware);
```

Towards the end of the file, before we set up our handlers for Socket.IO, we integrate our sessions:

```javascript
// Integrate sessions
io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});
```

Finally, we rewrite our session handlers to use the username from the session:

```javascript
// Handle new messages
io.sockets.on('connection', function (socket) {
    // Subscribe to the Redis channel
    subscribe.subscribe('ChatChannel');

    // Handle incoming messages
    socket.on('send', function (data) {
        // Define variables
        var username, message;

        // Get username
        username = socket.request.session.username;
        if (!username) {
            username = 'Anonymous Coward';
        }
        message = username + ': ' + data.message;

        // Publish it
        client.publish('ChatChannel', message);

        // Persist it to a Redis list
        client.rpush('chat:messages', message);
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

Note here that when a message is sent, we get the username from the session, and if it's empty, set it to Anonymous Coward. We then prepend it to the message, publish it, and persist it.

One final thing...
------------------

One last job remains. At present, users can pass JavaScript through in messages, which is not terribly secure! We need to fix it. Amend the `send` handler as follows:

```javascript
    // Handle incoming messages
    socket.on('send', function (data) {
        // Define variables
        var username, message;

        // Strip tags from message
        message = data.message.replace(/<[^>]*>/g, '');

        // Get username
        username = socket.request.session.username;
        if (!username) {
            username = 'Anonymous Coward';
        }
        message = username + ': ' + message;

        // Publish it
        client.publish('ChatChannel', message);

        // Persist it to a Redis list
        client.rpush('chat:messages', message);
    });
```

Here we use a regex to strip out any HTML tags from the message - this will prevent anyone injecting JavaScript into our chat client.

And that's all, folks! If you want to check out the source for this lesson it's in the repository on GitHub, tagged `lesson-2`. If you want to carry on working on this on your own, there's still plenty you can do, such as:

* Adding support for multiple rooms
* Using Passport.js to allow logging in using third-party services such as Twitter or Facebook
* Adding formatting for messages, either by using something like Markdown, or a client-side rich text editor

As you can see, it's surprising how much you can accomplish using only Redis, and under certain circumstances it offers a lot of advantages over a relational database. It's always worth thinking about whether Redis can be used for your project.
