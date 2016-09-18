---
title: "Building a Phonegap app with Laravel and Angular - Part 2"
date: 2016-09-18 23:18:06 +0100
categories:
- php
- laravel
- javascript
- angular
- phonegap
comments: true
---

In this lesson, the initial scope of the app will be extremely simple. We will implement functionality that:

* Allows users to log in and out
* Displays the home page

That's fairly simple, and easily achievable within a fairly short timeframe. We'll also write automated tests for our app. By the end of this lesson, we'll have built a first pass for our app using Angular.js.

NOTE: As at time of writing, Angular 2 has just come out. I'm using Angular 1 here, and the two are not compatible, so make sure you're using Angular 1.

Creating our app
----------------

Start by creating a new folder, separate from the backend, for the app. Then, in there, run the following command:

```bash
$ npm init -y
```

Then let's install our dependencies:

```bash
$ npm install --save-dev gulp karma karma-browserify karma-phantomjs-launcher browserify angular angular-route angular-mocks angular-animate angular-messages angular-sanitize angular-material angular-resource vinyl-buffer vinyl-source-stream gulp-sass karma-coverage karma-jasmine jasmine-core gulp-webserver
```

We're going to use [Angular Material](https://material.angularjs.org/latest/) for our user interface as it includes support out of the box for swiping left and right. You'll notice it mentioned as one of the dependencies above.

We'll also use Karma for running our tests. Save the following as `karma.conf.js`:

```javascript
module.exports = function(config) {
    config.set({
        basePath: '',
        frameworks: ['browserify', 'jasmine'],
        files: [
            'node_modules/angular/angular.min.js',
            'node_modules/angular-mocks/angular-mocks.js',
            'node_modules/angular-material/angular-material-mocks.js',
            'js/*.js',
            'test/*.js'
        ],
        exclude: [
        ],
        preprocessors: {
            'js/*.js': ['browserify', 'coverage'],
            'tests/js': ['browserify']
        },
        browserify: {
          debug: true
        },
        reporters: ['progress', 'coverage'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_DEBUG,
        autoWatch: true,
        browsers: ['PhantomJS'],
        singleRun: true,
        coverageReporter: {
          dir : 'coverage/',
          reporters: [
            { type: 'html', subdir: 'report-html' },
            { type: 'cobertura', subdir: 'report-cobertura' }
          ]
        }
    });
};
```

This is our Karma configuration. Karma can run the same test in multiple browsers. Here we're going to use PhantomJS, but it's trivial to amend the `browsers` section to add more. You just need to make sure you install the appropriate launchers for those browsers.

We'll use Gulp to build the app. Here's the `gulpfile.js`:

```javascript
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var sass = require('gulp-sass');
var server = require('gulp-webserver');

var paths = {
  scripts: ['js/*.js'],
  styles: ['sass/*.scss']
};

gulp.task('sass', function() {
  gulp.src('sass/style.scss')
   .pipe(sass().on('error', sass.logError))
   .pipe(gulp.dest('www/css'));
});;

gulp.task('js', function () {
  return browserify({ entries: ['js/main.js'], debug: true })
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(buffer())
    .pipe(gulp.dest('www/js/'));
});

gulp.task('server', function () {
  gulp.src('www/')
    .pipe(server({
      livereload: true,
      open: true,
      port: 5000
    }));
});


gulp.task('watch', function () {
  gulp.watch(paths.scripts, ['js']);
  gulp.watch(paths.styles, ['sass']);
});

gulp.task('default', ['sass','js','server', 'watch']);
```

Note that we're going to be using Browserify to handle our dependencies. If you haven't used it before, it lets you use the `require()` syntax from Node.js to include other JavaScript files, including ones available via NPM such as jQuery or Angular, allowing you to compile them all into a single file.

We should be able to test and run the app using NPM, so add these scripts to `package.json`:

```javascript
  "scripts": {
    "test": "karma start",
    "run": "gulp"
  },
```

We also need an HTML file. Save this as `www/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=0">
        <title>My New Animal Friend</title>
        <link href="/css/style.css" rel="stylesheet" type="text/css">
    </head>
    <body>
    <div>
        <div ng-app="mynewanimalfriend" ng-cloak>
            <div ng-view></div>
        </div>
    </div>
    </body>
    <script language="javascript" type="text/javascript" src="/js/bundle.js"></script>
</html>
```

Note the use of the Angular directives. `ng-app` denotes the name of the app namespace, `ng-cloak` hides the application until it's fully loaded, and `ng-view` denotes the area containing our content.

You should also create the files `js/main.js`, `sass/style.scss`, and the `test` folder.

Creating our first routes
-------------------------

Our first task is to create the routes we need. Our default route will be `/`, representing the home page. However, users will need to be logged in to see this. Otherwise, they should be redirected to the login route, which will be `/login`, appropriately enough. We'll also have a `/logout` route, which should be self-explanatory.

Before we implement these routes, we need to write a test for them. We'll start with our login route, and we'll test that for this route, the controller will be `LoginCtrl` and the template will be `templates/login.html`. The significance of these will become apparent later. Save this as `test/routes.spec.js`:

```javascript
'use strict';

describe('Routes', function () {

  beforeEach(angular.mock.module('mynewanimalfriend'));
  it('should map login route to login controller', function () {
    inject(function ($route) {
      expect($route.routes['/login'].controller).toBe('LoginCtrl');
      expect($route.routes['/login'].templateUrl).toEqual('templates/login.html');
    });
  });
});
```

Note the `beforeEach()` hook. This is used to set up the application.

We can run this test with `npm test` as that calls Karma directly. Note that we're using Jasmine to write our tests.

```bash
$ npm test

> mynewanimalfriend-app@1.0.0 test /home/matthew/Projects/mynewanimalfriend-app
> karma start

12 09 2016 22:22:34.168:DEBUG [config]: autoWatch set to false, because of singleRun
12 09 2016 22:22:34.172:DEBUG [plugin]: Loading karma-* from /home/matthew/Projects/mynewanimalfriend-app/node_modules
12 09 2016 22:22:34.176:DEBUG [plugin]: Loading plugin /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-browserify.
12 09 2016 22:22:34.314:DEBUG [plugin]: Loading plugin /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-coverage.
12 09 2016 22:22:34.484:DEBUG [plugin]: Loading plugin /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-jasmine.
12 09 2016 22:22:34.485:DEBUG [plugin]: Loading plugin /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-phantomjs-launcher.
12 09 2016 22:22:34.535:DEBUG [framework.browserify]: created browserify bundle: /tmp/f8c46bd8d72c5b8578e64552192273be.browserify
12 09 2016 22:22:34.553:DEBUG [framework.browserify]: add bundle to config.files at position 3
12 09 2016 22:22:34.559:DEBUG [web-server]: Instantiating middleware
12 09 2016 22:22:34.569:DEBUG [reporter]: Trying to load reporter: coverage
12 09 2016 22:22:34.570:DEBUG [reporter]: Trying to load color-version of reporter: coverage (coverage_color)
12 09 2016 22:22:34.571:DEBUG [reporter]: Couldn't load color-version.
12 09 2016 22:22:34.596:DEBUG [framework.browserify]: updating js/main.js in bundle
12 09 2016 22:22:34.597:DEBUG [framework.browserify]: building bundle
12 09 2016 22:22:35.302:DEBUG [framework.browserify]: bundling
12 09 2016 22:22:35.328:DEBUG [preprocessor.coverage]: Processing "/home/matthew/Projects/mynewanimalfriend-app/js/main.js".
12 09 2016 22:22:35.345:INFO [framework.browserify]: bundle built
12 09 2016 22:22:35.352:INFO [karma]: Karma v1.3.0 server started at http://localhost:9876/
12 09 2016 22:22:35.352:INFO [launcher]: Launching browser PhantomJS with unlimited concurrency
12 09 2016 22:22:35.361:INFO [launcher]: Starting browser PhantomJS
12 09 2016 22:22:35.361:DEBUG [temp-dir]: Creating temp dir at /tmp/karma-17657666
12 09 2016 22:22:35.364:DEBUG [launcher]: /home/matthew/Projects/mynewanimalfriend-app/node_modules/phantomjs-prebuilt/lib/phantom/bin/phantomjs /tmp/karma-17657666/capture.js
12 09 2016 22:22:35.466:DEBUG [web-server]: serving: /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma/static/client.html
12 09 2016 22:22:35.478:DEBUG [web-server]: serving: /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma/static/karma.js
12 09 2016 22:22:35.541:DEBUG [karma]: A browser has connected on socket /#dQYjOD4F_HJwPXiYAAAA
12 09 2016 22:22:35.564:DEBUG [web-server]: upgrade /socket.io/?EIO=3&transport=websocket&sid=dQYjOD4F_HJwPXiYAAAA
12 09 2016 22:22:35.629:INFO [PhantomJS 2.1.1 (Linux 0.0.0)]: Connected on socket /#dQYjOD4F_HJwPXiYAAAA with id 17657666
12 09 2016 22:22:35.630:DEBUG [launcher]: PhantomJS (id 17657666) captured in 0.277 secs
12 09 2016 22:22:35.642:DEBUG [phantomjs.launcher]: 

12 09 2016 22:22:35.643:DEBUG [middleware:karma]: custom files null null
12 09 2016 22:22:35.644:DEBUG [middleware:karma]: Serving static request /context.html
12 09 2016 22:22:35.646:DEBUG [web-server]: serving: /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma/static/context.html
12 09 2016 22:22:35.650:DEBUG [middleware:source-files]: Requesting /base/node_modules/jasmine-core/lib/jasmine-core/jasmine.js?b1682a1eb50e00abf147fc1fb28e31006d499aae /
12 09 2016 22:22:35.650:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/node_modules/jasmine-core/lib/jasmine-core/jasmine.js
12 09 2016 22:22:35.652:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/node_modules/jasmine-core/lib/jasmine-core/jasmine.js
12 09 2016 22:22:35.654:DEBUG [middleware:source-files]: Requesting /base/node_modules/angular-material/angular-material-mocks.js?9f31553e4bbbad4d6b52638351e3a274352311c2 /
12 09 2016 22:22:35.654:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/node_modules/angular-material/angular-material-mocks.js
12 09 2016 22:22:35.654:DEBUG [middleware:source-files]: Requesting /base/node_modules/karma-jasmine/lib/boot.js?945a38bf4e45ad2770eb94868231905a04a0bd3e /
12 09 2016 22:22:35.655:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-jasmine/lib/boot.js
12 09 2016 22:22:35.655:DEBUG [middleware:source-files]: Requesting /base/node_modules/karma-jasmine/lib/adapter.js?7975a273517f1eb29d7bd018790fd4c7b9a485d5 /
12 09 2016 22:22:35.655:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-jasmine/lib/adapter.js
12 09 2016 22:22:35.656:DEBUG [middleware:source-files]: Requesting /base/node_modules/angular/angular.min.js?78069f9f3a9ca9652cb04c13ccb0670d747666b8 /
12 09 2016 22:22:35.656:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/node_modules/angular/angular.min.js
12 09 2016 22:22:35.656:DEBUG [middleware:source-files]: Requesting /base/node_modules/angular-mocks/angular-mocks.js?cc56136dc551d94abe8195cf8475eb27a3aa3c4b /
12 09 2016 22:22:35.657:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/node_modules/angular-mocks/angular-mocks.js
12 09 2016 22:22:35.657:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/node_modules/angular-material/angular-material-mocks.js
12 09 2016 22:22:35.658:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-jasmine/lib/boot.js
12 09 2016 22:22:35.658:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-jasmine/lib/adapter.js
12 09 2016 22:22:35.659:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/node_modules/angular/angular.min.js
12 09 2016 22:22:35.659:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/node_modules/angular-mocks/angular-mocks.js
12 09 2016 22:22:35.660:DEBUG [web-server]: serving: /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma/static/context.js
12 09 2016 22:22:35.661:DEBUG [middleware:source-files]: Requesting /absolute/tmp/f8c46bd8d72c5b8578e64552192273be.browserify?8ffde4eef27d38e92cc62da4e8dd0ffa5a3a4a4c /
12 09 2016 22:22:35.661:DEBUG [middleware:source-files]: Fetching /tmp/f8c46bd8d72c5b8578e64552192273be.browserify
12 09 2016 22:22:35.662:DEBUG [middleware:source-files]: Requesting /base/js/main.js?41c850cecc07c24d7cd0421e914bd2420671e573 /
12 09 2016 22:22:35.662:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/js/main.js
12 09 2016 22:22:35.662:DEBUG [middleware:source-files]: Requesting /base/test/routes.spec.js?92b15bb7c24bc6ead636994fb1c737b91727d887 /
12 09 2016 22:22:35.662:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/test/routes.spec.js
12 09 2016 22:22:35.663:DEBUG [web-server]: serving (cached): /tmp/f8c46bd8d72c5b8578e64552192273be.browserify
12 09 2016 22:22:35.664:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/js/main.js
12 09 2016 22:22:35.664:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/test/routes.spec.js
PhantomJS 2.1.1 (Linux 0.0.0) Routes should map login route to login controller FAILED
        Error: [$injector:modulerr] http://errors.angularjs.org/1.5.8/$injector/modulerr?p0=mynewanimalfriend&p1=%5B%24injector%3Anomod%5D%20http%3A%2F%2Ferrors.angularjs.org%2F1.5.8%2F%24injector%2Fnomod%3Fp0%3Dmynewanimalfriend%0Ahttp%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fangular%2Fangular.min.js%3F78069f9f3a9ca9652cb04c13ccb0670d747666b8%3A25%3A111%0Ab%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fangular%2Fangular.min.js%3F78069f9f3a9ca9652cb04c13ccb0670d747666b8%3A24%3A143%0Ahttp%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fangular%2Fangular.min.js%3F78069f9f3a9ca9652cb04c13ccb0670d747666b8%3A24%3A489%0Ahttp%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fangular%2Fangular.min.js%3F78069f9f3a9ca9652cb04c13ccb0670d747666b8%3A39%3A473%0Aq%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fangular%2Fangular.min.js%3F78069f9f3a9ca9652cb04c13ccb0670d747666b8%3A7%3A359%0Ag%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fangular%2Fangular.min.js%3F78069f9f3a9ca9652cb04c13ccb0670d747666b8%3A39%3A320%0Acb%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fangular%2Fangular.min.js%3F78069f9f3a9ca9652cb04c13ccb0670d747666b8%3A43%3A337%0AworkFn%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fangular-mocks%2Fangular-mocks.js%3Fcc56136dc551d94abe8195cf8475eb27a3aa3c4b%3A3074%3A60%0Ainject%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fangular-mocks%2Fangular-mocks.js%3Fcc56136dc551d94abe8195cf8475eb27a3aa3c4b%3A3054%3A46%0Ahttp%3A%2F%2Flocalhost%3A9876%2Fbase%2Ftest%2Froutes.spec.js%3F92b15bb7c24bc6ead636994fb1c737b91727d887%3A5%3A11%0AattemptSync%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A1942%3A28%0Arun%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A1930%3A20%0Aexecute%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A1915%3A13%0AqueueRunnerFactory%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A710%3A42%0Aexecute%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A367%3A28%0Afn%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A2568%3A44%0AattemptAsync%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A1972%3A28%0Arun%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A1927%3A21%0Aexecute%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A1915%3A13%0AqueueRunnerFactory%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A710%3A42%0Afn%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A2553%3A31%0AattemptAsync%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A1972%3A28%0Arun%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A1927%3A21%0Aexecute%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A1915%3A13%0AqueueRunnerFactory%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A710%3A42%0Aexecute%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A2415%3A25%0Aexecute%40http%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fjasmine-core%2Flib%2Fjasmine-core%2Fjasmine.js%3Fb1682a1eb50e00abf147fc1fb28e31006d499aae%3A772%3A24%0Ahttp%3A%2F%2Flocalhost%3A9876%2Fbase%2Fnode_modules%2Fkarma-jasmine%2Flib%2Fadapter.js%3F7975a273517f1eb29d7bd018790fd4c7b9a485d5%3A320%3A23%0Aloaded%40http%3A%2F%2Flocalhost%3A9876%2Fcontext.js%3A151%3A17%0Aglobal%20code%40http%3A%2F%2Flocalhost%3A9876%2Fcontext.html%3A50%3A28 in node_modules/angular/angular.min.js (line 40)
        node_modules/angular/angular.min.js:40:260
        q@node_modules/angular/angular.min.js:7:359
        g@node_modules/angular/angular.min.js:39:320
        cb@node_modules/angular/angular.min.js:43:337
        workFn@node_modules/angular-mocks/angular-mocks.js:3074:60
        inject@node_modules/angular-mocks/angular-mocks.js:3054:46
        test/routes.spec.js:5:11
        loaded@http://localhost:9876/context.js:151:17
PhantomJS 2.1.1 (Linux 0.0.0): Executed 1 of 1 (1 FAILED) ERROR (0.044 secs / 0.006 secs)
12 09 2016 22:22:35.778:DEBUG [karma]: Run complete, exiting.
12 09 2016 22:22:35.778:DEBUG [launcher]: Disconnecting all browsers
12 09 2016 22:22:35.778:DEBUG [framework.browserify]: cleaning up
12 09 2016 22:22:35.782:DEBUG [coverage]: Writing coverage to /home/matthew/Projects/mynewanimalfriend-app/coverage/report-html
12 09 2016 22:22:35.876:DEBUG [coverage]: Writing coverage to /home/matthew/Projects/mynewanimalfriend-app/coverage/report-cobertura
12 09 2016 22:22:35.880:DEBUG [launcher]: Process PhantomJS exited with code 0
12 09 2016 22:22:35.881:DEBUG [temp-dir]: Cleaning temp dir /tmp/karma-17657666
12 09 2016 22:22:35.884:DEBUG [launcher]: Finished all browsers
npm ERR! Test failed.  See above for more details.
```

Now that we have a failing test, we can set about making it pass. Save this at `js/main.js`:

```javascript
'use strict';

require('angular');
require('angular-route');
require('angular-animate');
require('angular-material');

angular.module('mynewanimalfriend', [
  'ngRoute',
  'ngAnimate',
  'ngMaterial'
])

.config(function ($routeProvider) {
  $routeProvider
  .when('/login', {
    templateUrl: 'templates/login.html',
    controller: 'LoginCtrl'
  });
});
```

As mentioned earlier, because we're using Browserify, we can use the `require()` syntax to import our dependencies. Note we also give our module a name and specify the dependencies. Finally, note that we use `$routeProvider` to set up our first route, and we map the template URL and controller to match our test.

Let's run the test again:

```bash
$ npm test

> mynewanimalfriend-app@1.0.0 test /home/matthew/Projects/mynewanimalfriend-app
> karma start

12 09 2016 22:35:51.231:DEBUG [config]: autoWatch set to false, because of singleRun
12 09 2016 22:35:51.235:DEBUG [plugin]: Loading karma-* from /home/matthew/Projects/mynewanimalfriend-app/node_modules
12 09 2016 22:35:51.237:DEBUG [plugin]: Loading plugin /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-browserify.
12 09 2016 22:35:51.354:DEBUG [plugin]: Loading plugin /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-coverage.
12 09 2016 22:35:51.496:DEBUG [plugin]: Loading plugin /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-jasmine.
12 09 2016 22:35:51.497:DEBUG [plugin]: Loading plugin /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-phantomjs-launcher.
12 09 2016 22:35:51.547:DEBUG [framework.browserify]: created browserify bundle: /tmp/02002698e6d413a542186462d3a0a6ce.browserify
12 09 2016 22:35:51.559:DEBUG [framework.browserify]: add bundle to config.files at position 3
12 09 2016 22:35:51.564:DEBUG [web-server]: Instantiating middleware
12 09 2016 22:35:51.581:DEBUG [reporter]: Trying to load reporter: coverage
12 09 2016 22:35:51.582:DEBUG [reporter]: Trying to load color-version of reporter: coverage (coverage_color)
12 09 2016 22:35:51.582:DEBUG [reporter]: Couldn't load color-version.
12 09 2016 22:35:51.602:DEBUG [framework.browserify]: updating js/main.js in bundle
12 09 2016 22:35:51.603:DEBUG [framework.browserify]: building bundle
12 09 2016 22:35:52.306:DEBUG [framework.browserify]: bundling
12 09 2016 22:35:54.095:DEBUG [preprocessor.coverage]: Processing "/home/matthew/Projects/mynewanimalfriend-app/js/main.js".
12 09 2016 22:35:54.170:INFO [framework.browserify]: bundle built
12 09 2016 22:35:54.189:INFO [karma]: Karma v1.3.0 server started at http://localhost:9876/
12 09 2016 22:35:54.189:INFO [launcher]: Launching browser PhantomJS with unlimited concurrency
12 09 2016 22:35:54.197:INFO [launcher]: Starting browser PhantomJS
12 09 2016 22:35:54.198:DEBUG [temp-dir]: Creating temp dir at /tmp/karma-91342786
12 09 2016 22:35:54.201:DEBUG [launcher]: /home/matthew/Projects/mynewanimalfriend-app/node_modules/phantomjs-prebuilt/lib/phantom/bin/phantomjs /tmp/karma-91342786/capture.js
12 09 2016 22:35:54.300:DEBUG [web-server]: serving: /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma/static/client.html
12 09 2016 22:35:54.308:DEBUG [web-server]: serving: /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma/static/karma.js
12 09 2016 22:35:54.366:DEBUG [karma]: A browser has connected on socket /#FpcuZAJUT-u6Dl4sAAAA
12 09 2016 22:35:54.386:DEBUG [web-server]: upgrade /socket.io/?EIO=3&transport=websocket&sid=FpcuZAJUT-u6Dl4sAAAA
12 09 2016 22:35:54.442:INFO [PhantomJS 2.1.1 (Linux 0.0.0)]: Connected on socket /#FpcuZAJUT-u6Dl4sAAAA with id 91342786
12 09 2016 22:35:54.442:DEBUG [launcher]: PhantomJS (id 91342786) captured in 0.253 secs
12 09 2016 22:35:54.447:DEBUG [phantomjs.launcher]: 

12 09 2016 22:35:54.448:DEBUG [middleware:karma]: custom files null null
12 09 2016 22:35:54.448:DEBUG [middleware:karma]: Serving static request /context.html
12 09 2016 22:35:54.449:DEBUG [web-server]: serving: /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma/static/context.html
12 09 2016 22:35:54.451:DEBUG [middleware:source-files]: Requesting /base/node_modules/jasmine-core/lib/jasmine-core/jasmine.js?b1682a1eb50e00abf147fc1fb28e31006d499aae /
12 09 2016 22:35:54.451:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/node_modules/jasmine-core/lib/jasmine-core/jasmine.js
12 09 2016 22:35:54.452:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/node_modules/jasmine-core/lib/jasmine-core/jasmine.js
12 09 2016 22:35:54.453:DEBUG [middleware:source-files]: Requesting /base/node_modules/angular-material/angular-material-mocks.js?9f31553e4bbbad4d6b52638351e3a274352311c2 /
12 09 2016 22:35:54.453:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/node_modules/angular-material/angular-material-mocks.js
12 09 2016 22:35:54.453:DEBUG [middleware:source-files]: Requesting /base/node_modules/karma-jasmine/lib/boot.js?945a38bf4e45ad2770eb94868231905a04a0bd3e /
12 09 2016 22:35:54.454:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-jasmine/lib/boot.js
12 09 2016 22:35:54.454:DEBUG [middleware:source-files]: Requesting /base/node_modules/karma-jasmine/lib/adapter.js?7975a273517f1eb29d7bd018790fd4c7b9a485d5 /
12 09 2016 22:35:54.454:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-jasmine/lib/adapter.js
12 09 2016 22:35:54.454:DEBUG [middleware:source-files]: Requesting /base/node_modules/angular-mocks/angular-mocks.js?cc56136dc551d94abe8195cf8475eb27a3aa3c4b /
12 09 2016 22:35:54.454:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/node_modules/angular-mocks/angular-mocks.js
12 09 2016 22:35:54.455:DEBUG [middleware:source-files]: Requesting /base/node_modules/angular/angular.min.js?78069f9f3a9ca9652cb04c13ccb0670d747666b8 /
12 09 2016 22:35:54.455:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/node_modules/angular/angular.min.js
12 09 2016 22:35:54.455:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/node_modules/angular-material/angular-material-mocks.js
12 09 2016 22:35:54.455:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-jasmine/lib/boot.js
12 09 2016 22:35:54.455:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma-jasmine/lib/adapter.js
12 09 2016 22:35:54.456:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/node_modules/angular-mocks/angular-mocks.js
12 09 2016 22:35:54.457:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/node_modules/angular/angular.min.js
12 09 2016 22:35:54.458:DEBUG [middleware:source-files]: Requesting /absolute/tmp/02002698e6d413a542186462d3a0a6ce.browserify?f4c82dc0618d979f84c89967ea1c412e646a5fe5 /
12 09 2016 22:35:54.458:DEBUG [middleware:source-files]: Fetching /tmp/02002698e6d413a542186462d3a0a6ce.browserify
12 09 2016 22:35:54.458:DEBUG [middleware:source-files]: Requesting /base/js/main.js?41c850cecc07c24d7cd0421e914bd2420671e573 /
12 09 2016 22:35:54.459:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/js/main.js
12 09 2016 22:35:54.460:DEBUG [middleware:source-files]: Requesting /base/test/routes.spec.js?92b15bb7c24bc6ead636994fb1c737b91727d887 /
12 09 2016 22:35:54.461:DEBUG [middleware:source-files]: Fetching /home/matthew/Projects/mynewanimalfriend-app/test/routes.spec.js
12 09 2016 22:35:54.461:DEBUG [web-server]: serving (cached): /tmp/02002698e6d413a542186462d3a0a6ce.browserify
12 09 2016 22:35:54.496:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/js/main.js
12 09 2016 22:35:54.497:DEBUG [web-server]: serving (cached): /home/matthew/Projects/mynewanimalfriend-app/test/routes.spec.js
12 09 2016 22:35:54.497:DEBUG [web-server]: serving: /home/matthew/Projects/mynewanimalfriend-app/node_modules/karma/static/context.js
12 09 2016 22:35:54.582:DEBUG [phantomjs.launcher]: WARNING: Tried to load angular more than once.

PhantomJS 2.1.1 (Linux 0.0.0) LOG: 'WARNING: Tried to load angular more than once.'

PhantomJS 2.1.1 (Linux 0.0.0): Executed 1 of 1 SUCCESS (0.004 secs / 0.358 secs)
12 09 2016 22:35:55.003:DEBUG [karma]: Run complete, exiting.
12 09 2016 22:35:55.003:DEBUG [launcher]: Disconnecting all browsers
12 09 2016 22:35:55.003:DEBUG [framework.browserify]: cleaning up
12 09 2016 22:35:55.006:DEBUG [coverage]: Writing coverage to /home/matthew/Projects/mynewanimalfriend-app/coverage/report-html
12 09 2016 22:35:55.078:DEBUG [coverage]: Writing coverage to /home/matthew/Projects/mynewanimalfriend-app/coverage/report-cobertura
12 09 2016 22:35:55.082:DEBUG [launcher]: Process PhantomJS exited with code 0
12 09 2016 22:35:55.082:DEBUG [temp-dir]: Cleaning temp dir /tmp/karma-91342786
12 09 2016 22:35:55.085:DEBUG [launcher]: Finished all browsers
```

Our first test has passed. Let's add tests for the other routes:

```javascript
'use strict';

describe('Routes', function () {

  beforeEach(angular.mock.module('mynewanimalfriend'));
  it('should map default route to home controller', function () {
    inject(function ($route) {
      expect($route.routes['/'].controller).toBe('HomeCtrl');
      expect($route.routes['/'].templateUrl).toEqual('templates/home.html');
    });
  });

  it('should map login route to login controller', function () {
    inject(function ($route) {
      expect($route.routes['/login'].controller).toBe('LoginCtrl');
      expect($route.routes['/login'].templateUrl).toEqual('templates/login.html');
    });
  });

  it('should map logout route to logout controller', function () {
    inject(function ($route) {
      expect($route.routes['/logout'].controller).toBe('LogoutCtrl');
      expect($route.routes['/logout'].templateUrl).toEqual('templates/login.html');
    });
  });
});
```

Note that the logout route uses the login template. This is because all it will do is redirect the user to the login form.

For the sake of brevity I won't display the test output, but two of these tests should now fail. We can easily set up the new routes in `js/main.js`:

```javascript
'use strict';

require('angular');
require('angular-route');
require('angular-animate');
require('angular-material');

angular.module('mynewanimalfriend', [
  'ngRoute',
  'ngAnimate',
  'ngMaterial'
])

.config(function ($routeProvider) {
  $routeProvider
  .when('/login', {
    templateUrl: 'templates/login.html',
    controller: 'LoginCtrl'
  })
  .when('/', {
    templateUrl: 'templates/home.html',
    controller: 'HomeCtrl'
  })
  .when('/logout', {
    templateUrl: 'templates/login.html',
    controller: 'LogoutCtrl'
  });
});
```

That's looking good so far. But what if someone navigates to a URL that doesn't exist? Our router should handle that. Add this to the test:

```javascript
  it('should redirect other or empty routes to the home controller', function () {
    inject(function ($route) {
      expect($route.routes[null].redirectTo).toEqual('/')
    });
  });
```

Once again, the test should fail. Fixing it is fairly straightforward - we'll use the `otherwise()` method to define a fallback route:

```javascript
'use strict';

require('angular');
require('angular-route');
require('angular-animate');
require('angular-material');

angular.module('mynewanimalfriend', [
  'ngRoute',
  'ngAnimate',
  'ngMaterial'
])

.config(function ($routeProvider) {
  $routeProvider
  .when('/login', {
    templateUrl: 'templates/login.html',
    controller: 'LoginCtrl'
  })
  .when('/', {
    templateUrl: 'templates/home.html',
    controller: 'HomeCtrl'
  })
  .when('/logout', {
    templateUrl: 'templates/login.html',
    controller: 'LogoutCtrl'
  })
  .otherwise({
    redirectTo: '/'
  });
});
```

Now our routes are in place, we need to implement the three controllers we will need. However, as two of these controllers deal with authentication, we'll first create some services to handle that, and they'll need to be tested. Save this as `test/services.spec.js`:

```javascript
'use strict';

describe('Services', function () {

  beforeEach(function(){
    jasmine.addMatchers({
      toEqualData: function(util, customEqualityTesters) {
        return {
          compare: function(actual, expected) {
            return {
              pass: angular.equals(actual, expected)
            };
          }
        };
      }
    });
  });

  beforeEach(angular.mock.module('mynewanimalfriend.services'));

  describe('Token service', function () {
    var Token;

    beforeEach(inject(function (_Token_, _$httpBackend_) {
      Token = _Token_;
      mockBackend = _$httpBackend_;
    }));

    it('can create a new token', function () {
      mockBackend.expectPOST('http://localhost:8000/api/authenticate', '{"email":"bob@example.com","password":"password"}').respond({token: 'mytoken'});
      var token = new Token({
        email: 'bob@example.com',
        password: 'password'
      });
      token.$save(function (response) {
        expect(response).toEqualData({token: 'mytoken'});
      });
      mockBackend.flush();
    });
  });
});
```

In this test we use the `$httpBackend` facility from `ngMock` to mock out our API endpoints. We already have a REST API capable of generating a token, and we set this test up to behave similarly. We specify that it should expect to receive a certain POST request, and should respond with the token `mytoken`. Run the test to make sure it fails, then save this as `js/services.js`:

```javascript
'use strict';

require('angular');
require("angular-resource");

angular.module('mynewanimalfriend.services', ['ngResource'])

.factory('Token', function ($resource) {
  return $resource('http://localhost:8000/api/authenticate/');
});
```

A little explanation is called for. In Angular, the `$resource` dependency represents an HTTP resource. By default it supports making HTTP requests to the denoted endpoint via GET, POST and DELETE, and it's trivial to add support for PUT or PATCH methods. Using `$resource`, you can easily interface with a RESTful web service, and it's one of my favourite things about Angular.


We also need to load `services.js` in our `main.js` file:


```javascript
'use strict';

require('angular');
require('angular-route');
require('angular-animate');
require('angular-material');
require('./services');

angular.module('mynewanimalfriend', [
  'ngRoute',
  'ngAnimate',
  'ngMaterial',
  'mynewanimalfriend.services'
])

.config(function ($routeProvider) {
  $routeProvider
  .when('/login', {
    templateUrl: 'templates/login.html',
    controller: 'LoginCtrl'
  })
  .when('/', {
    templateUrl: 'templates/home.html',
    controller: 'HomeCtrl'
  })
  .when('/logout', {
    templateUrl: 'templates/login.html',
    controller: 'LogoutCtrl'
  })
  .otherwise({
    redirectTo: '/'
  });
});
```

Now, running the tests should show that they pass.

With that in place, we will also create an authentication service that lets the app determine if the user is logged in. Add this to `test/services.spec.js`:

```javascript
  describe('Auth service', function () {
    var Auth;

    beforeEach(inject(function (_Auth_) {
      Auth = _Auth_;
    }));

    it('can set user', function () {
      Auth.setUser('mytoken');
      var token = localStorage.getItem('authHeader');
      expect(token).toEqual('Bearer mytoken');
    });

    it('can return login status', function () {
      localStorage.setItem('authHeader', 'Bearer mytoken');
      expect(Auth.isLoggedIn()).toBeTruthy();
    });

    it('can log the user out', function () {
      localStorage.setItem('authHeader', 'Bearer mytoken');
      Auth.logUserOut();
      expect(Auth.isLoggedIn()).toBeFalsy();
      expect(localStorage.getItem('authHeader')).toBeFalsy();
    });
  });
```

This service is expected to do three things:

* Set the current user's details in local storage
* Return whether the user is logged in
* Log the user out

Make sure the test fails, then amend `js/services.js` as follows:

```javascript
'use strict';

require('angular');
require("angular-resource");

angular.module('mynewanimalfriend.services', ['ngResource'])

.factory('Auth', function(){
  return{
    setUser : function (aUser) {
      localStorage.setItem('authHeader', 'Bearer ' + aUser);
    },
    isLoggedIn: function () {
      var user = localStorage.getItem('authHeader');
      return(user)? user : false;
    },
    logUserOut: function () {
      localStorage.removeItem('authHeader');
    }
  }
})

.factory('Token', function ($resource) {
  return $resource('http://localhost:8000/api/authenticate/');
});
```

When the user is set, we store the authentication details we need in local storage. We can then use that to determine if they are logged in. When they log out, we simply clear local storage,

That should be enough to make these tests pass. Now we can move on to our controllers. We'll do the login controller first. Save this as `test/controllers.spec.js`:

```javascript
'use strict';

describe('Controllers', function () {

  beforeEach(function(){
    jasmine.addMatchers({
      toEqualData: function(util, customEqualityTesters) {
        return {
          compare: function(actual, expected) {
            return {
              pass: angular.equals(actual, expected)
            };
          }
        };
      }
    });
  });

  beforeEach(angular.mock.module('mynewanimalfriend.controllers'));

  describe('Login Controller', function () {
    var mockBackend, scope;

    beforeEach(inject(function ($rootScope, $controller, _$httpBackend_) {
      mockBackend = _$httpBackend_;
      scope = $rootScope.$new();
      $controller('LoginCtrl', {
        $scope: scope
      });
    }));

    // Test controller scope is defined
    it('should define the scope', function () {
      expect(scope).toBeDefined();
    });

    // Test doLogin is defined
    it('should define the login method', function () {
      expect(scope.doLogin).toBeDefined();
    });

    // Test doLogin works
    it('should allow the user to log in', function () {
      // Mock the backend
      mockBackend.expectPOST('http://localhost:8000/api/authenticate', '{"email":"user@example.com","password":"password"}').respond({token: 123});

      // Define login data
      scope.credentials = {
        email: 'user@example.com',
        password: 'password'
      };

      //  Submit the request
      scope.doLogin();

      // Flush the backend
      mockBackend.flush();

      // Check login complete
      expect(localStorage.getItem('authHeader')).toEqual('Bearer 123');
    });
  });
});
```

We check that the scope and the `doLogin()` method are defined. We then mock the backend's `/api/authenticate` route to respond with a dummy token when our credentials are provided. Then, we set the credentials in the variable `$scope.credentials`, call `doLogin()`, flush the backend, and check the authentication header has been set.

Once you've verified these tests fail, we can start making them pass. Save this as `js/controllers.js`:

```javascript
'use strict';

require('angular');
require('angular-route');
require('./services');

angular.module('mynewanimalfriend.controllers', [
  'mynewanimalfriend.services',
  "ngMaterial"
])

.controller('LoginCtrl', function ($scope, $location, Token, Auth) {
  $scope.doLogin = function () {
    var token = new Token($scope.credentials);
    token.$save(function (response) {
      if (response.token) {
        // Set up auth service
        Auth.setUser(response.token);

        // Redirect
        $location.path('/');
      }
    }, function (err) {
        alert('Unable to log in - please check your details are correct');
    });
  };
});
```

The `LoginCtrl` controller accepts the scope, location, and our two services. When `doLogin()` is alled, it picks up the values in `$scope.credentials`, which we will set in our template later. It then makes a POST request to our endpoint including those credentials. Our API backend should return the new token in the response, and the token is stored using the `Auth` service. Otherwise, it raises an error.

Check the test now passes before moving onto the logout functionality. Add this to `test/controllers.spec.js`:

```javascript
  describe('Logout Controller', function () {
    var scope;
    
    beforeEach(inject(function ($rootScope, $controller, Auth) {
      Auth.setUser('Blah');
      scope = $rootScope.$new();
      $controller('LogoutCtrl', {
        $scope: scope
      });
    }));

    // Test controller scope is defined
    it('should define the scope', function () {
      expect(scope).toBeDefined();
    });

    // Test session cleared
    it('should clear the session', function () {
      expect(localStorage.getItem('authHeader')).toEqual(null);
    });
  });
```

We want to ensure that when the user navigates to the route managed by the `LogoutCtrl` controller, the session is cleared, so we set up an existing session, call the controller, check it's defined, and then check that local storage is empty.

Once you've verified that the test fails, amend the controllers as follows:

```javascript
'use strict';

require('angular');
require('angular-route');
require('./services');

angular.module('mynewanimalfriend.controllers', [
  'mynewanimalfriend.services',
  "ngMaterial"
])

.controller('LoginCtrl', function ($scope, $location, Token, Auth) {
  $scope.doLogin = function () {
    var token = new Token($scope.credentials);
    token.$save(function (response) {
      if (response.token) {
        // Set up auth service
        Auth.setUser(response.token);

        // Redirect
        $location.path('/');
      }
    }, function (err) {
        alert('Unable to log in - please check your details are correct');
    });
  };
})

.controller('LogoutCtrl', function ($scope, $location, Auth) {
  // Log user out
  Auth.logUserOut();

  // Redirect to login page
  $location.path('/login');
});
```

Our `LogoutCtrl` controller is very simple - it just logs the user out and redirects them back to the login form. Our final controller is for the home page:

```javascript
  describe('Home Controller', function () {
    var scope;

    beforeEach(inject(function ($rootScope, $controller) {
      scope = $rootScope.$new();
      $controller('HomeCtrl', {
        $scope: scope
      });
    }));

    // Test controller scope is defined
    it('should define the scope', function () {
      expect(scope).toBeDefined();
    });
  });
```

For now our home controller does nothing except define the scope, so it's easy to implement:

```javascript
'use strict';

require('angular');
require('angular-route');
require('./services');

angular.module('mynewanimalfriend.controllers', [
  'mynewanimalfriend.services',
  "ngMaterial"
])

.controller('LoginCtrl', function ($scope, $location, Token, Auth) {
  $scope.doLogin = function () {
    var token = new Token($scope.credentials);
    token.$save(function (response) {
      if (response.token) {
        // Set up auth service
        Auth.setUser(response.token);

        // Redirect
        $location.path('/');
      }
    }, function (err) {
        alert('Unable to log in - please check your details are correct');
    });
  };
})

.controller('LogoutCtrl', function ($scope, $location, Auth) {
  // Log user out
  Auth.logUserOut();

  // Redirect to login page
  $location.path('/login');
})

.controller('HomeCtrl', function ($scope) {
});
```

Verify that the tests pass, and our controllers are done for now. However, we still have some work to do to hook the various elements up. First, of all, our `main.js` unnecessarily loads our services - since we only use those services in our controllers, we don't need them there. We also need to be able to keep users out of routes other than `login` when not logged in. Here's what you `main.js` should look like:

```javascript
'use strict';

require('angular');
require('angular-route');
require('angular-animate');
require('angular-material');
require('./controllers');

angular.module('mynewanimalfriend', [
  'ngRoute',
  'ngAnimate',
  'ngMaterial',
  'mynewanimalfriend.controllers'
])

.run(['$rootScope', '$location', 'Auth', function ($rootScope, $location, Auth) {
  $rootScope.$on('$routeChangeStart', function (event) {

    if (!Auth.isLoggedIn()) {
      if ($location.path() !== '/login') {
        $location.path('/login');
      }
    }
  });
}])

.config(['$httpProvider', function($httpProvider) {
  $httpProvider.interceptors.push('sessionInjector');
  $httpProvider.interceptors.push('authInterceptor');
}])

.config(function ($routeProvider) {
  $routeProvider
  .when('/login', {
    templateUrl: 'templates/login.html',
    controller: 'LoginCtrl'
  })
  .when('/', {
    templateUrl: 'templates/home.html',
    controller: 'HomeCtrl'
  })
  .when('/logout', {
    templateUrl: 'templates/login.html',
    controller: 'LogoutCtrl'
  })
  .otherwise({
    redirectTo: '/'
  });
});
```

Note that we set it up to intercept the HTTP request with the session injector and the auth interceptor. Next we need to create these in `js/services.js`:

```javascript
'use strict';

require('angular');
require("angular-resource");

angular.module('mynewanimalfriend.services', ['ngResource'])

.factory('Auth', function(){
  return{
    setUser : function (aUser) {
      localStorage.setItem('authHeader', 'Bearer ' + aUser);
    },
    isLoggedIn: function () {
      var user = localStorage.getItem('authHeader');
      return(user)? user : false;
    },
    logUserOut: function () {
      localStorage.removeItem('authHeader');
    }
  }
})

.factory('Token', function ($resource) {
  return $resource('http://localhost:8000/api/authenticate/');
})

.factory('sessionInjector', function (Auth) {
  var sessionInjector = {
    request: function (config) {
      if (Auth.isLoggedIn()) {
        config.headers.Authorization = Auth.isLoggedIn();
      }
      return config;
    }
  };
  return sessionInjector;
})

.service('authInterceptor', function ($q, Auth, $location) {
  var service = this;

  service.responseError = function (response) {
    if (response.status == 400) {
      Auth.logUserOut();
      $location.path('/login');
    }
    return $q.reject(response);
  };
});
```

I'll walk you through these. `sessionInjector` adds the authorization HTTP header to every request to the server if the user is logged in, so that it returns the right user's details. `authInterceptor` catches any 400 errors, denoting that the user is not authenticated with a current JSON web token, and logs the user out. In this way we can handle the expiry of a user's token.

Now the logic of our app is in place, but that's no use without some content...

Angular templating
------------------

We have one very basic HTML template, but that's just a boilerplate for inserting the rest of our content. For the rest of the HTML we'll need to load templates dynamically, and we'll use Angular Material to help us build a nice UI quickly. Run the following commands to create the files:

```bash
$ mkdir www/templates
$ touch www/templates/login.html
$ touch www/templates/home.html
```

We need to import the CSS for Angular Material. Add this to `sass/style.scss`:

```scss
// Angular Material
@import "node_modules/angular-material/angular-material.scss";
```

With that done, we need to configure theming in `main.js`:

```javascript
'use strict';

require('angular');
require('angular-route');
require('angular-animate');
require('angular-material');
require('./controllers');

angular.module('mynewanimalfriend', [
  'ngRoute',
  'ngAnimate',
  'ngMaterial',
  'mynewanimalfriend.controllers'
])

.config(function ($mdThemingProvider) {
    $mdThemingProvider.theme('default')
      .primaryPalette('purple')
      .accentPalette('cyan');
})

.run(['$rootScope', '$location', 'Auth', function ($rootScope, $location, Auth) {
  $rootScope.$on('$routeChangeStart', function (event) {

    if (!Auth.isLoggedIn()) {
      if ($location.path() !== '/login') {
        $location.path('/login');
      }
    }
  });
}])

.config(['$httpProvider', function($httpProvider) {
  $httpProvider.interceptors.push('sessionInjector');
  $httpProvider.interceptors.push('authInterceptor');
}])

.config(function ($routeProvider) {
  $routeProvider
  .when('/login', {
    templateUrl: 'templates/login.html',
    controller: 'LoginCtrl'
  })
  .when('/', {
    templateUrl: 'templates/home.html',
    controller: 'HomeCtrl'
  })
  .when('/logout', {
    templateUrl: 'templates/login.html',
    controller: 'LogoutCtrl'
  })
  .otherwise({
    redirectTo: '/'
  });
});
```

You may want to look at the [documentation](https://material.angularjs.org/latest/Theming/01_introduction) for Angular Material to choose your own theme options. Next, let's create our login template at `www/templates/login.html`:

```html
<md-content md-theme="default" layout-gt-sm="row" layout-padding>
	<div>
		<md-input-container class="md-block">
			<label>Email</label>
			<input ng-model="credentials.email" type="email">
		</md-input-container>

		<md-input-container class="md-block">
			<label>Password</label>
			<input ng-model="credentials.password" type="password">
		</md-input-container>
		<md-button class="md-raised md-primary" ng-click="doLogin()">Submit</md-button>
	</div>
</md-content>
```

We're using Angular Material's input and button directives to make our inputs look a bit nicer. Note that the `ng-click` handler calls the `doLogin()` method of our controller, and that the `ng-model` attributes contain the `credentials` object that gets passed to the API. If you haven't used Angular before, `ng-model` essentially lets you bind a variable to an element's value so, for instance, when an input is changed, it can be easily accessed via the variable.

Next, we'll implement a placeholder for our home page with a log out button. Save this as `www/templates/home.html`:

```html
<md-toolbar>
    <div class="md-toolbar-tools">
        <md-button aria-label="Log out" href="#logout">
            Log out
        </md-button>
    </div>
</md-toolbar>
```

That should be all we need to demonstrate logging in and out of our app. Let's try it out. First run the Gulp task to show the app in the browser:

```bash
$ gulp
```

Then, in another shell session, switch to the directory with the backend and run the server for that:

```bash
$ php artisan serve
```

You should already have a user account set up and ready to use thanks to the seeder we wrote. The browser should show the login page by default, and if you fill in the login form and click the button you should see the home page. You should then be able to log out again.

Congratulations! We've got authentication working.

Switching to HTML5 routing
--------------------------

You may note that the URLs use hashes - they are in the format `http://localhost:5000/#/login`. Wouldn't it be better if we didn't use the hash? Fortunately modern browsers support this via the HTML5 pushState API, and Angular has built-in support for this.

To enable it, we first need to declare a base URL in `www/index.html`. Amend it as follows:

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=0">
        <title>My New Animal Friend</title>
        <link href="/css/style.css" rel="stylesheet" type="text/css">
        <base href="/">
    </head>
    <body>
    <div>
        <div ng-app="mynewanimalfriend" ng-cloak>
            <div ng-view></div>
        </div>
    </div>
    </body>
    <script language="javascript" type="text/javascript" src="/js/bundle.js"></script>
</html>
```

Here we've added the `<base href="/">` tag to denote our base URL. Next we configure Angular to use HTML5 routing in `main.js`:

```javascript
.config(function($locationProvider) {
  $locationProvider.html5Mode(true);
})
```

And amend the URL in the home template:

```html
<md-toolbar>
    <div class="md-toolbar-tools">
        <md-button aria-label="Log out" href="/logout">
            Log out
        </md-button>
    </div>
</md-toolbar>
```

Now, we should be using HTML5 routing throughout.

With that done, we can finish for today. We've got our basic app skeleton and authentication system up and running, and we'll be in a good place to continue developing the rest of the app next time. I've put the source code on [Github](https://github.com/matthewbdaly/mynewanimalfriend-app), and you can find this lesson's work under the `lesson-2` tag.

Next time we'll develop the app further, including implementing the pet search functionality.
