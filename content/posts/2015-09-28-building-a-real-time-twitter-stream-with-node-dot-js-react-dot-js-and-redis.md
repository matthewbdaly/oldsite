---
title: "Building a real-time Twitter stream with Node.js, React.js and Redis"
date: 2015-09-28 20:00:55 +0100
categories:
- node.js
- react.js
- redis
- socket.io
comments: true
---

In the last year or so, React.js has taken the world of web development by storm. A major reason for this is that it makes it possible to build **isomorphic web applications** - web apps where the same code can run on the client and the server. Using React.js, you can create a template that will be executed on the server when the page first loads, and then the same template can be used to re-render the content when it's updated, whether that's via AJAX, WebSockets or another method entirely.

In this tutorial, I'll show you how to build a simple Twitter streaming app using Node.js. I'm actually [not the only person to have built this to demonstrate React.js](https://scotch.io/tutorials/build-a-real-time-twitter-stream-with-node-and-react-js), but this is my own particular take on this idea, since it's such an obvious use case for React.

What is React.js?
-----------------

A lot of people get rather confused over this issue. It's not correct to compare React.js with frameworks like Angular.js or Backbone.js. It's often described as being just the V in MVC - it represents only the view layer. If you're familiar with Backbone.js, I think it's reasonable to compare it to Backbone's views, albeit with it's own templating syntax. It does not provide the following functionality like Angular and Backbone do:

* Support for models
* Any kind of helpers for AJAX requests
* Routing

If you want any of this functionality, you need to look elsewhere. There are other libraries around that offer this kind of functionality, so if you want to use React as part of some kind of MVC structure, you can do so - they're just not a part of the library itself.

React.js uses a so-called "virtual DOM" - rather than re-rendering the view from scratch when the state changes, it instead retains a virtual representation of the DOM in memory, updates that, then figures out what changes are required to update the existing DOM and applies them. This means it only needs to change what actually changes, making it faster than other client-side templating systems. Combined with the ability to render on the server side, React allows you to build high-performance apps that combine the initial speed and SEO advantages of conventional web apps with the responsiveness of single-page web apps.

To create components with React, it's common to use an XML-like syntax called JSX. It's not mandatory, but I highly recommend you do so as it's much more intuitive than creating elements with Javascript.

Getting started
---------------

You'll need a Twitter account, and you'll need to [create a new Twitter app](https://apps.twitter.com/) and obtain the security credentials to let you access the Twitter Streaming API. You'll also need to have Node.js installed (ideally using `nvm`) - at this time, however, you can't use Node 4.0 because of issues with Redis. You will also need to install Redis and hiredis - if you've worked through my previous Redis tutorials you'll have these already.

We'll be using Gulp.js as our build system, and Bower to install some client-side packages, so they need to be installed globally:

```bash
$ npm install -g gulp bower
```

We'll also be using Compass to help with our stylesheets:

```bash
$ sudo gem install compass
```

With that all done, let's start work on our app. First, run the following command to create your `package.json`:

```bash
$ npm init
```

I'm assuming you're well-acquainted enough with Node.js to know what this does, and can answer the questions without difficulty. I won't cover writing tests in this tutorial as, but set your test command to `gulp test` and you should be fine.

Next, we need to install our dependencies:

```bash
$ npm install --save babel compression express hbs hiredis lodash morgan react redis socket.io socket.io-client twitter
$ npm install --save-dev browserify chai gulp gulp-compass gulp-coveralls gulp-istanbul gulp-jshint gulp-mocha gulp-uglify jshint-stylish reactify request vinyl-buffer vinyl-source-stream
```

Planning our app
----------------

Now, it's worth taking a few minutes to plan the architecture of our app. We want to have the app listen to the Twitter Streaming API and filter for messages with any arbitrary string in them - in this case we'll be searching for "javascript", but you can set it to anything you like. That means that that part needs to be listening all the time, not just when someone is using the app. Also, it doesn't fit neatly into the usual request-response cycle - if several people visit the site at once, we could end up with multiple connections to fetch the same data, which is really not efficient, and could cause problems with duplicate tweets showing up.

Instead, we'll have a separate `worker.js` file which runs constantly. This will listen for any matching messages on Twitter. When one appears, rather than returning it itself, it will publish it to a Redis channel, as well as persisting it. Then, the web app, which will be the `index.js` file, will be subscribed to the same channel, and will receive the tweet and push it to all current users using Socket.io.

This is a good example of a message queue, and it's a common pattern. It allows you to create dedicated sections of your app for different tasks, and means that they will generally be more robust. In this case, if the worker goes down, users will still be able to see some tweets, and if the server goes down, the tweets will still be persisted to Redis. In theory, this would also allow you to scale your app more easily by allowing movement of different tasks to different servers, and several app servers could interface with a single worker process. The only downside I can think of is that on a platform like Heroku you'd need to have a separate dyno for the worker process - however, with Heroku's pricing model changing recently, since this needs to be listening all the time it won't be suitable for the free tier anyway.

First let's create our `gulpfile.js`:

```javascript
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var reactify = require('reactify');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var coveralls = require('gulp-coveralls');
var compass = require('gulp-compass');
var uglify = require('gulp-uglify');

var paths = {
    scripts: ['components/*.jsx'],
    styles: ['src/sass/*.scss']
};
gulp.task('lint', function () {
  return gulp.src([
      'index.js',
      'components/*.js'
      ])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('compass', function() {
  gulp.src('src/sass/*.scss')
    .pipe(compass({
      css: 'static/css',
      sass: 'src/sass'
    }))
    .pipe(gulp.dest('static/css'));
});;

gulp.task('test', function () {
  gulp.src('index.js')
    .pipe(istanbul())
    .pipe(istanbul.hookRequire())
    .on('finish', function () {
      gulp.src('test/test.js', {read: false})
        .pipe(mocha({ reporter: 'spec' }))
        .pipe(istanbul.writeReports({
          reporters: [
            'lcovonly',
            'cobertura',
            'html'
          ]
        }))
        .pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }))
        .once('error', function () {
          process.exit(0);
        })
        .once('end', function () {
          process.exit(0);
        });
    });
});

gulp.task('coveralls', function () {
  gulp.src('coverage/lcov.info')
    .pipe(coveralls());
});

gulp.task('react', function () {
  return browserify({ entries: ['components/index.jsx'], debug: true })
    .transform(reactify)
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest('static/jsx/'));
});

gulp.task('default', function () {
  gulp.watch(paths.scripts, ['react']);
  gulp.watch(paths.styles, ['compass']);
});
```

I've added tasks for the tests and JSHint if you choose to implement them, but the only ones I've actually used are the `compass` and `react` tasks. The `compass` task compiles our Sass files into CSS, while the `react` task uses Browserify to take our React components and various modules installed using NPM and build them for use in the browser, as well as minifying them. Note that we installed React and lodash with NPM? We're going to be able to use them in the browser and on the server, thanks to Browserify.

Next, let's create our `worker.js` file:

```javascript
/*jslint node: true */
'use strict';

// Get dependencies
var Twitter = require('twitter');

// Set up Twitter client
var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

// Set up connection to Redis
var redis;
if (process.env.REDIS_URL) {
  redis = require('redis').createClient(process.env.REDIS_URL);
} else {
  redis = require('redis').createClient();
}

client.stream('statuses/filter', {track: 'javascript', lang: 'en'}, function(stream) {
  stream.on('data', function(tweet) {
    // Log it to console
    console.log(tweet);

    // Publish it
    redis.publish('tweets', JSON.stringify(tweet));

    // Persist it to a Redis list
    redis.rpush('stream:tweets', JSON.stringify(tweet));
  });

  // Handle errors
  stream.on('error', function (error) {
    console.log(error);
  });
});
```

Most of this file should be fairly straightforward. We set up our connection to Twitter (you'll need to set the various environment variables listed here using the appropriate method for your operating system), and a connection to Redis.

We then stream the Twitter statuses that match our filter. When we receive a tweet, we log it to the console (feel free to comment this out in production if desired), publish it to a Redis channel called `tweets`, and push it to the end of a Redis list called `stream:tweets`. When an error occurs, we output it to the console.

Let's use Bootstrap to style the app. Create the following `.bowerrc` file:

```bash
{
    "directory": "static/bower_components"
}
```

Then run `bower init` to create your `bower.json` file, and install Bootstrap with `bower install --save sass-bootstrap`.

With that done, create the file `src/sass/style.scss` and enter the following:

```scss
@import "compass/css3/user-interface";
@import "compass/css3";
@import "../../static/bower_components/sass-bootstrap/lib/bootstrap.scss";
```

This includes some dependencies from Compass, as well as Bootstrap. We won't be using any of the Javascript features of Bootstrap, so we don't need to worry too much about that.

Next, we need to create our view files. As React will be used to render the main part of the page, these will be very basic, with just the header, footer, and a section where the content can be rendered. First, create `views/index.hbs`:

```handlebars
{{> header }}
        <div class="container">
            <div class="row">
                <div class="col-md-12">
                    <div id='view'>{{{ markup }}}</div>
                </div>
            </div>
        </div>
        <script id="initial-state" type="application/json">{{{state}}}</script>
{{> footer }}
```

As promised, this a very basic layout. Note the `markup` variable, which is where the markup generated by React will be inserted when rendered on the server, and the `state` variable, which will contain the JSON representation of the data used to generate that markup. By passing that data through, you can ensure that the instance of React on the client has access to the same raw data as was passed through to the view on the server side, so that when the data needs to be re-rendered, it can be done so correctly.

We'll also define partials for the header and footer. The header should be in `views/partials/header.hbs`:

```handlebars
<!DOCTYPE html>
<!--[if lt IE 7]>      <html class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
<!--[if IE 7]>         <html class="no-js lt-ie9 lt-ie8"> <![endif]-->
<!--[if IE 8]>         <html class="no-js lt-ie9"> <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js"> <!--<![endif]-->
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Tweet Stream</title>
        <meta name="description" content="">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <!-- Place favicon.ico and apple-touch-icon.png in the root directory -->

        <link rel="stylesheet" type="text/css" href="/css/style.css">
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
                    <a class="navbar-brand" href="/">Tweet Stream</a>
                    <div class="collapse navbar-collapse navbar-right" id="header-nav">
                    </div>
                </div>
            </div>
        </nav>
```

The footer should be in `views/partials/footer.hbs`:

```handlebars
        <script src="/jsx/bundle.js"></script>
    </body>
</html>
```

Note that we load the Javascript file `/jsx/bundle.js` - this is the output from the command `gulp react`.

Creating the back end
---------------------

The next step is to implement the back end of the website. Add the following code as `index.js`:

```javascript
/*jslint node: true */
'use strict';

require('babel/register');

// Get dependencies
var express = require('express');
var app = express();
var compression = require('compression');
var port = process.env.PORT || 5000;
var base_url = process.env.BASE_URL || 'http://localhost:5000';
var hbs = require('hbs');
var morgan = require('morgan');
var React = require('react');
var Tweets = React.createFactory(require('./components/tweets.jsx'));

// Set up connection to Redis
var redis, subscribe;
if (process.env.REDIS_URL) {
  redis = require('redis').createClient(process.env.REDIS_URL);
  subscribe = require('redis').createClient(process.env.REDIS_URL);
} else {
  redis = require('redis').createClient();
  subscribe = require('redis').createClient();
}

// Set up templating
app.set('views', __dirname + '/views');
app.set('view engine', "hbs");
app.engine('hbs', require('hbs').__express);

// Register partials
hbs.registerPartials(__dirname + '/views/partials');

// Set up logging
app.use(morgan('combined'));

// Compress responses
app.use(compression());

// Set URL
app.set('base_url', base_url);

// Serve static files
app.use(express.static(__dirname + '/static'));

// Render main view
app.get('/', function (req, res) {
  // Get tweets
  redis.lrange('stream:tweets', 0, -1, function (err, tweets) {
    if (err) {
      console.log(err);
    } else {
      // Get tweets
      var tweet_list = [];
      tweets.forEach(function (tweet, i) {
        tweet_list.push(JSON.parse(tweet));
      });

      // Render page
      var markup = React.renderToString(Tweets({ data: tweet_list.reverse() }));
      res.render('index', {
        markup: markup,
        state: JSON.stringify(tweet_list)
      });
    }
  });
});

// Listen
var io = require('socket.io')({
}).listen(app.listen(port));
console.log("Listening on port " + port);

// Handle connections
io.sockets.on('connection', function (socket) {
  // Subscribe to the Redis channel
  subscribe.subscribe('tweets');

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

Let's go through this bit by bit:

```javascript
/*jslint node: true */
'use strict';

require('babel/register');
```

Here we're using Babel, which is a library that allows you to use new features in Javascript even if the interpreter doesn't support it. It also includes support for JSX, allowing us to require JSX files in the same way we would require Javascript files.

```javascript
// Get dependencies
var express = require('express');
var app = express();
var compression = require('compression');
var port = process.env.PORT || 5000;
var base_url = process.env.BASE_URL || 'http://localhost:5000';
var hbs = require('hbs');
var morgan = require('morgan');
var React = require('react');
var Tweets = React.createFactory(require('./components/tweets.jsx'));
```

Here we include our dependencies. Most of this will be familiar if you've used Express before, but we also use React to create a factory for a React component called `Tweets`.

```javascript
// Set up connection to Redis
var redis, subscribe;
if (process.env.REDIS_URL) {
  redis = require('redis').createClient(process.env.REDIS_URL);
  subscribe = require('redis').createClient(process.env.REDIS_URL);
} else {
  redis = require('redis').createClient();
  subscribe = require('redis').createClient();
}

// Set up templating
app.set('views', __dirname + '/views');
app.set('view engine', "hbs");
app.engine('hbs', require('hbs').__express);

// Register partials
hbs.registerPartials(__dirname + '/views/partials');

// Set up logging
app.use(morgan('combined'));

// Compress responses
app.use(compression());

// Set URL
app.set('base_url', base_url);

// Serve static files
app.use(express.static(__dirname + '/static'));
```

This section sets up the various dependencies of our app. We set up two connections to Redis - one for handling subscriptions, the other for reading from Redis in order to populate the view.

We also set up our views, logging, compression of the HTTP response, a base URL, and serving static files.

```javascript
// Render main view
app.get('/', function (req, res) {
  // Get tweets
  redis.lrange('stream:tweets', 0, -1, function (err, tweets) {
    if (err) {
      console.log(err);
    } else {
      // Get tweets
      var tweet_list = [];
      tweets.forEach(function (tweet, i) {
        tweet_list.push(JSON.parse(tweet));
      });

      // Render page
      var markup = React.renderToString(Tweets({ data: tweet_list.reverse() }));
      res.render('index', {
        markup: markup,
        state: JSON.stringify(tweet_list)
      });
    }
  });
});
```

Our app only has a single view. When the root is loaded, we first of all fetch all of the tweets stored in the `stream:tweets` list. We then convert them into an array of objects.

Next, we render the `Tweets` component to a string, passing through our list of tweets, and store the resulting markup. We then pass through this markup and the string representation of the list of tweets to the template.

```javascript
// Listen
var io = require('socket.io')({
}).listen(app.listen(port));
console.log("Listening on port " + port);

// Handle connections
io.sockets.on('connection', function (socket) {
  // Subscribe to the Redis channel
  subscribe.subscribe('tweets');

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

Finally, we set up Socket.io. On a connection, we subscribe to the Redis channel `tweets`. When we receive a tweet from Redis, we emit that tweet so that it can be rendered on the client side. We also handle disconnections by removing our Redis subscription.

Creating our React components
-----------------------------

Now it's time to create our first React component. We'll create a folder called `components` to hold all of our component files. Our first file is `components/index.jsx`:

```javascript
var React = require('react');
var Tweets = require('./tweets.jsx');

var initialState = JSON.parse(document.getElementById('initial-state').innerHTML);

React.render(
  <Tweets data={initialState} />,
  document.getElementById('view')
);
```

First of all, we include React and the same `Tweets` component we require on the server side (note that we need to specify the `.jsx` extension). Then we fetch the initial state from the script tag we created earlier. Finally we render the `Tweets` components, passing through the initial state, and specify that it should be inserted into the element with an id of `view`. Note that we store the initial state in `data` - inside the component, this can be accessed as `this.props.data`.

This particular component is only ever used on the client side - when we render on the server side, we don't need any of this functionality since we insert the markup into the `view` element anyway, and we don't need to specify the initial data in the same way.

Next, we define the `Tweets` component in `components/tweets.jsx`:

```javascript
var React = require('react');
var io = require('socket.io-client');
var TweetList = require('./tweetlist.jsx');
var _ = require('lodash');

var Tweets = React.createClass({
  componentDidMount: function () {
    // Get reference to this item
    var that = this;
    
    // Set up the connection
    var socket = io.connect(window.location.href);

    // Handle incoming messages
    socket.on('message', function (data) {
      // Insert the message
      var tweets = that.props.data;
      tweets.push(JSON.parse(data));
      tweets = _.sortBy(tweets, function (item) {
        return item.created_at;
      }).reverse();
      that.setProps({data: tweets});
    });
  },
  getInitialState: function () {
    return {data: this.props.data};
  },
  render: function () {
    return (
      <div>
        <h1>Tweets</h1>
        <TweetList data={this.props.data} />
      </div>
    )
  }
});

module.exports = Tweets;
```

Let's work our way through each section in turn:

```javascript
var React = require('react');
var io = require('socket.io-client');
var TweetList = require('./tweetlist.jsx');
var _ = require('lodash');
```

Here we include React and the Socket.io client, as well as Lodash and our TweetList component. With React.js, it's recommend that you break up each individual part of your interface into a single component - here `Tweets` is a wrapper for the tweets that includes a heading. `TweetList` will be a list of tweets, and `TweetItem` will be an individual tweet.

```javascript
var Tweets = React.createClass({
  componentDidMount: function () {
    // Get reference to this item
    var that = this;
    
    // Set up the connection
    var socket = io.connect(window.location.href);

    // Handle incoming messages
    socket.on('message', function (data) {
      // Insert the message
      var tweets = that.props.data;
      tweets.push(JSON.parse(data));
      tweets = _.sortBy(tweets, function (item) {
        return item.created_at;
      }).reverse();
      that.setProps({data: tweets});
    });
  },

```

Note the use of the `componentDidMount` method - this fires when a component has been rendered on the client side for the first time. You can therefore use it to set up events. Here, we're setting up a callback so that when a new tweet is received, we get the existing tweets (stored in `this.props.data`, although we copy `this` to `that` so it works inside the callback), push the tweet to this list, sort it by the time created, and set `this.props.data` to the new value. This will result in the tweets being re-rendered.

```javascript
  getInitialState: function () {
    return {data: this.props.data};
  },
```

Here we set the initial state of the component - it sets the value of `this.state` to the object passed through. In this case, we pass through an object with the attribute `data` defined as the value of `this.props.data`, meaning that `this.state.data` is the same as `this.props.data`.

```javascript
  render: function () {
    return (
      <div>
        <h1>Tweets</h1>
        <TweetList data={this.props.data} />
      </div>
    )
  }
});

module.exports = Tweets;
```

Here we define our `render` function. This can be thought of as our template. Note that we include `TweetList` inside our template and pass through the data. Afterwards, we export `Tweets` so it can be used elsewhere.

Next, let's create `components/tweetlist.jsx`:

```javascript
var React = require('react');
var TweetItem = require('./tweetitem.jsx');

var TweetList = React.createClass({
  render: function () {
    var that = this;
    var tweetNodes = this.props.data.map(function (item, index) {
      return (
        <TweetItem key={index} text={item.text}></TweetItem>
      );
    });
    return (
      <ul className="tweets list-group">
        {tweetNodes}
      </ul>
    )
  }
});

module.exports = TweetList;
```

This component is much simpler - it only has a `render` method. First, we get our individual tweets and for each one define a `TweetItem` component. Then we create an unordered list and insert the tweet items into it. We then export it as `TweetList`.

Our final component is the `TweetItem` component. Create the following file at `components/tweetitem.jsx`:

```javascript
var React = require('react');

var TweetItem = React.createClass({
  render: function () {
    return (
      <li className="list-group-item">{this.props.text}</li>
    );
  }
});

module.exports = TweetItem;
```

This component is quite simple. It's just a single list item with the text set to the value of the tweet's `text` attribute.

That should be all of our components done. Time to compile our Sass and run Browserify:

```bash
$ gulp compass
$ gulp react
```

Now, if you make sure you have set the appropriate environment variables, and then run `node worker.js` in one terminal, and `node index.js` in another, and visit [http://localhost:5000/](http://localhost:5000/), you should see your Twitter stream in all its glory! You can also try it with Javascript disabled, or in a text-mode browser such as Lynx, to demonstrate that it still renders the page without having to do anything on the client side - you're only missing the constant updates.

Wrapping up
-----------

I hope this gives you some idea of how you can easily use React.js on both the client and server side to make web apps that are fast and search-engine friendly while also being easy to update dynamically. You can find the source code on [GitHub](https://github.com/matthewbdaly/twitter-stream).

Hopefully I'll be able to publish some later tutorials that build on this to show you how to build more substantial web apps with React.
