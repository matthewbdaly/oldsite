---
title: "Creating a personal dashboard with React and Webpack"
date: 2016-08-15 23:18:00 +0100
categories:
- javascript
- react
- webpack
comments: true
---

The Raspberry Pi is a great device for running simple web apps at home on a permanent basis, and you can pick up a small touchscreen for it quite cheaply. This makes it easy to build and host a small personal dashboard that pulls important data from various APIs or RSS feeds and displays it. You'll often see dashboards like this on Raspberry Pi forums and subreddits. As I'm currently between jobs, and have some time to spare before my new job starts, I decided to start creating my own version of it. It was obvious that React.js is a good fit for this as it allows you to break up your user interface into multiple independent components and keep the functionality close to the UI. It also makes it easy to reuse widgets by passing different parameters through each time.

In this tutorial I'll show you how to start building a simple personal dashboard using React and Webpack. You can then install Nginx on your Raspberry Pi and host it from there. In the process, you'll be able to pick up a bit of knowledge about Webpack and ECMAScript 2015 (using Babel). Our initial implementation will have only two widgets, a clock and a feed, but those should show you enough of the basics that you should then be able to build other widgets you may have in mind.

Installing our dependencies
---------------------------

First, let's create our `package.json`:

```bash
$ npm init -y
```

Then install the dependencies:

```bash
$ npm install --save-dev babel-cli babel-register babel-core babel-eslint babel-loader babel-preset-es2015 babel-preset-react chai css-loader eslint eslint-loader eslint-plugin-react file-loader istanbul@^1.0.0-alpha.2 jquery jsdom mocha moment node-sass react react-addons-pure-render-mixin react-addons-test-utils react-dom react-hot-loader request sass-loader style-loader url-loader webpack webpack-dev-server
```

Note that we need to install a specific version of Istanbul to get code coverage.

Next, we create our Webpack config. Save this as `webpack.config.js`:

```javascript
var webpack = require('webpack');  
module.exports = {  
    entry: [
      'webpack/hot/only-dev-server',
      "./js/app.js"
    ],
    debug: true,
    devtool: 'source-map',
    output: {
        path: __dirname + '/static',
        filename: "bundle.js"
    },
    module: {
        preLoaders: [
          {
            test: /(\.js$|\.jsx$)/, 
            exclude: /node_modules/, 
            loader: "eslint-loader"
          }
        ],
        loaders: [
            { test: /\.jsx?$/, loaders: ['react-hot', 'babel'], exclude: /node_modules/ },
            { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'},
            { test: /\.woff2?$/, loader: "url-loader?limit=25000" },
            { test: /\.(eot|svg|ttf)?$/, loader: "file-loader" },
            { test: /\.scss$/, loader: "style!css!sass" }
        ]
    },
    eslint: {
      configFile: '.eslintrc.yml'
    },
    plugins: [
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoErrorsPlugin()
    ]
};
```

Note the various loaders we're using. We use ESLint to lint our Javascript files for code quality, and the build will fail if they do not match the required standards. We're also using loaders for CSS, Sass, Babel (so we can use ES2015 for our Javascript) and fonts. Also, note the hot module replacement plugin - this allows us to reload the application automatically. If you haven't used Webpack before, this config should be sufficient to get you started, but I recommend reading the [documentation](https://webpack.github.io/).

We also need to configure ESLint how we want. Here is the configuration we will be using, which should be saved as `.eslintrc.yml`:

```yaml
rules:
  no-debugger:
    - 0
  no-console:
    - 0
  no-unused-vars:
    - 0
  indent:
    - 2
    - 2
  quotes:
    - 2
    - single
  linebreak-style:
    - 2
    - unix
  semi:
    - 2
    - always
env:
  es6: true
  browser: true
  node: true
extends: 'eslint:recommended'
parserOptions:
  sourceType: module
  ecmaFeatures:
    jsx: true
    experimentalObjectRestSpread: true
    modules: true
plugins:
  - react
```

We also need a base HTML file. Save this as `index.html`:

```html
<!doctype html>  
<html lang="en">  
  <head>
    <meta charset="utf-8">
    <title>Personal Dashboard</title>
  </head>
  <body>
    <div id="view"></section>
    <script src="bundle.js"></script>
  </body>
</html>
```

We also need to set the commands for building and testing our app in `package.json`:

```json
  "scripts": {
    "test": "istanbul cover _mocha -- --compilers js:babel-core/register --require ./test/setup.js 'test/**/*.@(js|jsx)'",
    "test:watch": "npm run test -- --watch",
    "start": "webpack-dev-server --progress --colors",
    "build": "webpack --progress --colors"
  },
  "babel": {
    "presets": [
      "es2015",
      "react"
    ]
  },
```

The `npm test` command will call Mocha to run the tests, but will also use Istanbul to generate test coverage. For the sake of brevity, our tests won't be terribly comprehensive. The `npm start` command will run a development server, while `npm run build` will build our application.

We also need to create the `test/` folder and the `test/setup.js` file:

```javascript
import jsdom from 'jsdom';
import chai from 'chai';

const doc = jsdom.jsdom('<!doctype html><html><body></body></html>');
const win = doc.defaultView;

global.document = doc;
global.window = win;

Object.keys(window).forEach((key) => {
  if (!(key in global)) {
    global[key] = window[key];
  }
});
```

This sets up Chai and creates a dummy DOM for our tests. We also need to create the folder `js/` and the file `js/app.js`. You can leave that file empty for now.

If you now run `npm start` and navigate to [http://localhost:8080/webpack-dev-server/](http://localhost:8080/webpack-dev-server/), you can see the current state of the application.

Our dashboard component
-----------------------

Our first React component will be a wrapper for all the other ones. Each of the rest of the components will be a self-contained widget that will populate itself without the need for a centralised data store like Redux. I will mention that Redux is a very useful library, and for larger React applications it makes a lot of sense to use it, but here we're better off having each widget manage its own data internally, rather than have it be passed down from a single data store.

Save the following as `test/components/dashboard.js`:

```javascript
import TestUtils from 'react-addons-test-utils';
import React from 'react';
import {findDOMNode} from 'react-dom';
import Dashboard from '../../js/components/dashboard';
import {expect} from 'chai';

const {renderIntoDocument, scryRenderedDOMComponentsWithClass, Simulate} = TestUtils;

describe('Dashboard', () => {
  it('renders the dashboard', () => {
    const component = renderIntoDocument(
      <Dashboard title="My Dashboard" />
    );
    const title = findDOMNode(component.refs.title);
    expect(title).to.be.ok;
    expect(title.textContent).to.contain('My Dashboard');
  });
}
```

This tests that we can set the title of our dashboard component. Let's run our tests:

```bash
$ npm test

> personal-dashboard@1.0.0 test /home/matthew/Projects/personal-dashboard
> istanbul cover _mocha -- --compilers js:babel-core/register --require ./test/setup.js 'test/**/*.@(js|jsx)'

No coverage information was collected, exit without writing coverage information
module.js:327
    throw err;
    ^

Error: Cannot find module '../../js/components/dashboard'
    at Function.Module._resolveFilename (module.js:325:15)
    at Function.Module._load (module.js:276:25)
    at Module.require (module.js:353:17)
    at require (internal/module.js:12:17)
    at Object.<anonymous> (dashboard.js:4:1)
    at Module._compile (module.js:409:26)
    at loader (/home/matthew/Projects/personal-dashboard/node_modules/babel-register/lib/node.js:148:5)
    at Object.require.extensions.(anonymous function) [as .js] (/home/matthew/Projects/personal-dashboard/node_modules/babel-register/lib/node.js:158:7)
    at Module.load (module.js:343:32)
    at Function.Module._load (module.js:300:12)
    at Module.require (module.js:353:17)
    at require (internal/module.js:12:17)
    at /home/matthew/Projects/personal-dashboard/node_modules/mocha/lib/mocha.js:220:27
    at Array.forEach (native)
    at Mocha.loadFiles (/home/matthew/Projects/personal-dashboard/node_modules/mocha/lib/mocha.js:217:14)
    at Mocha.run (/home/matthew/Projects/personal-dashboard/node_modules/mocha/lib/mocha.js:485:10)
    at Object.<anonymous> (/home/matthew/Projects/personal-dashboard/node_modules/mocha/bin/_mocha:403:18)
    at Module._compile (module.js:409:26)
    at Object.Module._extensions..js (module.js:416:10)
    at Object.Module._extensions.(anonymous function) (/home/matthew/Projects/personal-dashboard/node_modules/istanbul/lib/hook.js:109:37)
    at Module.load (module.js:343:32)
    at Function.Module._load (module.js:300:12)
    at Function.Module.runMain (module.js:441:10)
    at runFn (/home/matthew/Projects/personal-dashboard/node_modules/istanbul/lib/command/common/run-with-cover.js:122:16)
    at /home/matthew/Projects/personal-dashboard/node_modules/istanbul/lib/command/common/run-with-cover.js:251:17
    at /home/matthew/Projects/personal-dashboard/node_modules/istanbul/lib/util/file-matcher.js:68:16
    at /home/matthew/Projects/personal-dashboard/node_modules/async/lib/async.js:52:16
    at /home/matthew/Projects/personal-dashboard/node_modules/async/lib/async.js:361:13
    at /home/matthew/Projects/personal-dashboard/node_modules/async/lib/async.js:52:16
    at done (/home/matthew/Projects/personal-dashboard/node_modules/async/lib/async.js:246:17)
    at /home/matthew/Projects/personal-dashboard/node_modules/async/lib/async.js:44:16
    at /home/matthew/Projects/personal-dashboard/node_modules/async/lib/async.js:358:17
    at LOOP (fs.js:1530:14)
    at nextTickCallbackWith0Args (node.js:420:9)
    at process._tickCallback (node.js:349:13)
npm ERR! Test failed.  See above for more details.
```

Our dashboard file doesn't exist. So let's create it:

```bash
$ mkdir js/components
$ touch js/components/dashboard.js
```

And run our test again:

```bash
$ npm test

> personal-dashboard@1.0.0 test /home/matthew/Projects/personal-dashboard
> istanbul cover _mocha -- --compilers js:babel-core/register --require ./test/setup.js 'test/**/*.@(js|jsx)'



  Dashboard
Warning: React.createElement: type should not be null, undefined, boolean, or number. It should be a string (for DOM elements) or a ReactClass (for composite components).
    1) renders the dashboard


  0 passing (31ms)
  1 failing

  1) Dashboard renders the dashboard:
     Invariant Violation: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: object.
      at invariant (node_modules/fbjs/lib/invariant.js:38:15)
      at [object Object].instantiateReactComponent [as _instantiateReactComponent] (node_modules/react/lib/instantiateReactComponent.js:86:134)
      at [object Object].ReactCompositeComponentMixin.performInitialMount (node_modules/react/lib/ReactCompositeComponent.js:388:22)
      at [object Object].ReactCompositeComponentMixin.mountComponent (node_modules/react/lib/ReactCompositeComponent.js:262:21)
      at Object.ReactReconciler.mountComponent (node_modules/react/lib/ReactReconciler.js:47:35)
      at mountComponentIntoNode (node_modules/react/lib/ReactMount.js:105:32)
      at ReactReconcileTransaction.Mixin.perform (node_modules/react/lib/Transaction.js:138:20)
      at batchedMountComponentIntoNode (node_modules/react/lib/ReactMount.js:126:15)
      at ReactDefaultBatchingStrategyTransaction.Mixin.perform (node_modules/react/lib/Transaction.js:138:20)
      at Object.ReactDefaultBatchingStrategy.batchedUpdates (node_modules/react/lib/ReactDefaultBatchingStrategy.js:63:19)
      at Object.batchedUpdates (node_modules/react/lib/ReactUpdates.js:98:20)
      at Object.ReactMount._renderNewRootComponent (node_modules/react/lib/ReactMount.js:285:18)
      at Object.ReactMount._renderSubtreeIntoContainer (node_modules/react/lib/ReactMount.js:371:32)
      at Object.ReactMount.render (node_modules/react/lib/ReactMount.js:392:23)
      at ReactTestUtils.renderIntoDocument (node_modules/react/lib/ReactTestUtils.js:85:21)
      at Context.<anonymous> (dashboard.js:11:23)



No coverage information was collected, exit without writing coverage information
npm ERR! Test failed.  See above for more details.
```

Now we have a failing test, we can create our component. Save this as `js/components/dashboard.js`:

```javascript
import React from 'react';

export default React.createClass({
  render() {
    return (
      <div className="dashboard">
        <h1 ref="title">{this.props.title}</h1>
        <div className="wrapper">
        </div>
      </div>
    );
  }
});
```

And let's run our tests again:

```bash
$ npm test

> personal-dashboard@1.0.0 test /home/matthew/Projects/personal-dashboard
> istanbul cover _mocha -- --compilers js:babel-core/register --require ./test/setup.js 'test/**/*.@(js|jsx)'



  Dashboard
    ✓ renders the dashboard


  1 passing (50ms)

No coverage information was collected, exit without writing coverage information
```

Our first component is in place. However, it isn't getting loaded. We also need to start thinking about styling. Create the file `scss/style.scss`, but leave it blank for now. Then save this in `js/app.js`:

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import Dashboard from './components/dashboard';
import styles from '../scss/style.scss';

ReactDOM.render(
  <Dashboard title="My Dashboard" />,
  document.getElementById('view')
);
```

Note that we're importing CSS or Sass files in the same way as Javascript files. This is unique to Webpack, and while it takes a bit of getting used to, it has its advantages - if you import only the styles relating to each component, you can be sure there's no orphaned CSS files. Here, we only have one CSS file anyway, so it's a non-issue.

If you now run `npm start`, our dashboard gets loaded and the title is displayed. With our dashboard in place, we can now implement our first widget.

Creating the clock widget
-------------------------

Our first widget will be a simple clock. This demonstrates changing the state of the widget on an interval. First let's write a test - save this as `test/components/clockwidget.js`:

```javascript
import TestUtils from 'react-addons-test-utils';
import React from 'react';
import {findDOMNode} from 'react-dom';
import ClockWidget from '../../js/components/clockwidget';
import {expect} from 'chai';

const {renderIntoDocument, scryRenderedDOMComponentsWithClass, Simulate} = TestUtils;

describe('Clock Widget', () => {
  it('renders the clock widget', () => {
    const currentTime = 1465160300530;
    const component = renderIntoDocument(
      <ClockWidget time={currentTime} />
    );
    const time = findDOMNode(component.refs.time);
    expect(time).to.be.ok;
    expect(time.textContent).to.contain('Sunday');
  });
});
```

And create an empty file at `js/components/clockwidget.js`. Then we run our tests again:

```bash
$ npm test

> personal-dashboard@1.0.0 test /home/matthew/Projects/personal-dashboard
> istanbul cover _mocha -- --compilers js:babel-core/register --require ./test/setup.js 'test/**/*.@(js|jsx)'



  Clock Widget
Warning: React.createElement: type should not be null, undefined, boolean, or number. It should be a string (for DOM elements) or a ReactClass (for composite components).
    1) renders the clock widget

  Dashboard
    ✓ renders the dashboard


  1 passing (46ms)
  1 failing

  1) Clock Widget renders the clock widget:
     Invariant Violation: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: object.
      at invariant (node_modules/fbjs/lib/invariant.js:38:15)
      at [object Object].instantiateReactComponent [as _instantiateReactComponent] (node_modules/react/lib/instantiateReactComponent.js:86:134)
      at [object Object].ReactCompositeComponentMixin.performInitialMount (node_modules/react/lib/ReactCompositeComponent.js:388:22)
      at [object Object].ReactCompositeComponentMixin.mountComponent (node_modules/react/lib/ReactCompositeComponent.js:262:21)
      at Object.ReactReconciler.mountComponent (node_modules/react/lib/ReactReconciler.js:47:35)
      at mountComponentIntoNode (node_modules/react/lib/ReactMount.js:105:32)
      at ReactReconcileTransaction.Mixin.perform (node_modules/react/lib/Transaction.js:138:20)
      at batchedMountComponentIntoNode (node_modules/react/lib/ReactMount.js:126:15)
      at ReactDefaultBatchingStrategyTransaction.Mixin.perform (node_modules/react/lib/Transaction.js:138:20)
      at Object.ReactDefaultBatchingStrategy.batchedUpdates (node_modules/react/lib/ReactDefaultBatchingStrategy.js:63:19)
      at Object.batchedUpdates (node_modules/react/lib/ReactUpdates.js:98:20)
      at Object.ReactMount._renderNewRootComponent (node_modules/react/lib/ReactMount.js:285:18)
      at Object.ReactMount._renderSubtreeIntoContainer (node_modules/react/lib/ReactMount.js:371:32)
      at Object.ReactMount.render (node_modules/react/lib/ReactMount.js:392:23)
      at ReactTestUtils.renderIntoDocument (node_modules/react/lib/ReactTestUtils.js:85:21)
      at Context.<anonymous> (clockwidget.js:12:23)



No coverage information was collected, exit without writing coverage information
npm ERR! Test failed.  See above for more details.
```

With a failing test in place, we can create our component:

```javascript
import React from 'react';
import moment from 'moment';

export default React.createClass({
  getInitialState() {
    return {
      time: this.props.time || moment()
    };
  },
  render() {
    const time = moment(this.state.time).format('dddd, Do MMMM YYYY, h:mm:ss a');
    return (
      <div className="clockwidget widget">
        <div className="widget-content">
          <h2 ref="time">{time}</h2>
        </div>
      </div>
    );
  }
});
```

Note that the component accepts a property of `time`. The `getInitialState()` method then converts `this.props.time` into `this.state.time` so that it can be displayed on render. Note we also set a default of the current time using Moment.js.

We also need to update the dashboard component to load this new component:

```javascript
import React from 'react';
import ClockWidget from './clockwidget';

export default React.createClass({
  render() {
    return (
      <div className="dashboard">
        <h1 ref="title">{this.props.title}</h1>
        <div className="wrapper">
          <ClockWidget />
        </div>
      </div>
    );
  }
});
```

Now, if you try running `npm start` and viewing the dashboard in the browser, you will see that it displays the current time and date, but it's not being updated. You can force the page to reload every now and then, but we can do better than that. We can set an interval in which the time will refresh. As the smallest unit we show is seconds, this interval should be 1 second.

Amend the clock component as follows:

```javascript
import React from 'react';
import moment from 'moment';

export default React.createClass({
  getInitialState() {
    return {
      time: this.props.time || moment()
    };
  },
  tick() {
    this.setState({
      time: moment()
    });
  },
  componentDidMount() {
    this.interval = setInterval(this.tick, 1000);
  },
  componentWillUnmount() {
    clearInterval(this.interval);
  },
  render() {
    const time = moment(this.state.time).format('dddd, Do MMMM YYYY, h:mm:ss a');
    return (
      <div className="clockwidget widget">
        <div className="widget-content">
          <h2 ref="time">{time}</h2>
        </div>
      </div>
    );
  }
});
```

When our component has mounted, we set an interval of 1,000 milliseconds, and each time it elapses we call the `tick()` method. This method sets the state to the current time, and as a result the user interface is automatically re-rendered. On unmount, we clear the interval.

In this case we're just calling a single function on a set interval. In principle, the same approach can be used to populate components in other ways, such as by making an AJAX request.

Creating an RSS widget
----------------------

Our next widget will be a simple RSS feed reader. We'll fetch the content with jQuery and render it using React. We'll also reload it regularly. First, let's create our test:

```javascript
import TestUtils from 'react-addons-test-utils';
import React from 'react';
import {findDOMNode} from 'react-dom';
import FeedWidget from '../../js/components/feedwidget';
import {expect} from 'chai';

const {renderIntoDocument, scryRenderedDOMComponentsWithClass, Simulate} = TestUtils;

describe('Feed Widget', () => {
  it('renders the Feed widget', () => {
    const url = "http://feeds.bbci.co.uk/news/rss.xml?edition=uk"
    const component = renderIntoDocument(
      <FeedWidget feed={url} size={5} delay={60} />
    );
    const feed = findDOMNode(component.refs.feed);
    expect(feed).to.be.ok;
    expect(feed.textContent).to.contain(url);
  });
});
```

Our feed widget will accept an external URL as an argument, and will then poll this URL regularly to populate the feed. It also allows us to specify the `size` attribute, which denotes the number of feed items, and the `delay` attribute, which denotes the number of seconds it should wait before fetching the data again.

We also need to amend the dashboard component to include this widget:

```javascript
import React from 'react';
import ClockWidget from './clockwidget';
import FeedWidget from './feedwidget';

export default React.createClass({
  render() {
    return (
      <div className="dashboard">
        <h1 ref="title">{this.props.title}</h1>
        <div className="wrapper">
          <ClockWidget />
          <FeedWidget feed="http://feeds.bbci.co.uk/news/rss.xml?edition=uk" size="5" delay="60" />
        </div>
      </div>
    );
  }
});
```

If we then create `js/components/feedwidget.js` and run `npm test`:

```bash
$ npm test

> personal-dashboard@1.0.0 test /home/matthew/Projects/personal-dashboard
> istanbul cover _mocha -- --compilers js:babel-core/register --require ./test/setup.js 'test/**/*.@(js|jsx)'



  Clock Widget
    ✓ renders the clock widget (92ms)

  Dashboard
Warning: React.createElement: type should not be null, undefined, boolean, or number. It should be a string (for DOM elements) or a ReactClass (for composite components). Check the render method of `dashboard`.
    1) renders the dashboard

  Feed Widget
Warning: React.createElement: type should not be null, undefined, boolean, or number. It should be a string (for DOM elements) or a ReactClass (for composite components).
    2) renders the Feed widget


  1 passing (286ms)
  2 failing

  1) Dashboard renders the dashboard:
     Invariant Violation: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: object. Check the render method of `dashboard`.
      at invariant (node_modules/fbjs/lib/invariant.js:38:15)
      at instantiateReactComponent (node_modules/react/lib/instantiateReactComponent.js:86:134)
      at instantiateChild (node_modules/react/lib/ReactChildReconciler.js:43:28)
      at node_modules/react/lib/ReactChildReconciler.js:70:16
      at traverseAllChildrenImpl (node_modules/react/lib/traverseAllChildren.js:69:5)
      at traverseAllChildrenImpl (node_modules/react/lib/traverseAllChildren.js:85:23)
      at traverseAllChildren (node_modules/react/lib/traverseAllChildren.js:164:10)
      at Object.ReactChildReconciler.instantiateChildren (node_modules/react/lib/ReactChildReconciler.js:69:7)
      at ReactDOMComponent.ReactMultiChild.Mixin._reconcilerInstantiateChildren (node_modules/react/lib/ReactMultiChild.js:194:41)
      at ReactDOMComponent.ReactMultiChild.Mixin.mountChildren (node_modules/react/lib/ReactMultiChild.js:231:27)
      at ReactDOMComponent.Mixin._createInitialChildren (node_modules/react/lib/ReactDOMComponent.js:715:32)
      at ReactDOMComponent.Mixin.mountComponent (node_modules/react/lib/ReactDOMComponent.js:531:12)
      at Object.ReactReconciler.mountComponent (node_modules/react/lib/ReactReconciler.js:47:35)
      at ReactDOMComponent.ReactMultiChild.Mixin.mountChildren (node_modules/react/lib/ReactMultiChild.js:242:44)
      at ReactDOMComponent.Mixin._createInitialChildren (node_modules/react/lib/ReactDOMComponent.js:715:32)
      at ReactDOMComponent.Mixin.mountComponent (node_modules/react/lib/ReactDOMComponent.js:531:12)
      at Object.ReactReconciler.mountComponent (node_modules/react/lib/ReactReconciler.js:47:35)
      at [object Object].ReactCompositeComponentMixin.performInitialMount (node_modules/react/lib/ReactCompositeComponent.js:397:34)
      at [object Object].ReactCompositeComponentMixin.mountComponent (node_modules/react/lib/ReactCompositeComponent.js:262:21)
      at Object.ReactReconciler.mountComponent (node_modules/react/lib/ReactReconciler.js:47:35)
      at [object Object].ReactCompositeComponentMixin.performInitialMount (node_modules/react/lib/ReactCompositeComponent.js:397:34)
      at [object Object].ReactCompositeComponentMixin.mountComponent (node_modules/react/lib/ReactCompositeComponent.js:262:21)
      at Object.ReactReconciler.mountComponent (node_modules/react/lib/ReactReconciler.js:47:35)
      at mountComponentIntoNode (node_modules/react/lib/ReactMount.js:105:32)
      at ReactReconcileTransaction.Mixin.perform (node_modules/react/lib/Transaction.js:138:20)
      at batchedMountComponentIntoNode (node_modules/react/lib/ReactMount.js:126:15)
      at ReactDefaultBatchingStrategyTransaction.Mixin.perform (node_modules/react/lib/Transaction.js:138:20)
      at Object.ReactDefaultBatchingStrategy.batchedUpdates (node_modules/react/lib/ReactDefaultBatchingStrategy.js:63:19)
      at Object.batchedUpdates (node_modules/react/lib/ReactUpdates.js:98:20)
      at Object.ReactMount._renderNewRootComponent (node_modules/react/lib/ReactMount.js:285:18)
      at Object.ReactMount._renderSubtreeIntoContainer (node_modules/react/lib/ReactMount.js:371:32)
      at Object.ReactMount.render (node_modules/react/lib/ReactMount.js:392:23)
      at ReactTestUtils.renderIntoDocument (node_modules/react/lib/ReactTestUtils.js:85:21)
      at Context.<anonymous> (dashboard.js:11:23)

  2) Feed Widget renders the Feed widget:
     Invariant Violation: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: object.
      at invariant (node_modules/fbjs/lib/invariant.js:38:15)
      at [object Object].instantiateReactComponent [as _instantiateReactComponent] (node_modules/react/lib/instantiateReactComponent.js:86:134)
      at [object Object].ReactCompositeComponentMixin.performInitialMount (node_modules/react/lib/ReactCompositeComponent.js:388:22)
      at [object Object].ReactCompositeComponentMixin.mountComponent (node_modules/react/lib/ReactCompositeComponent.js:262:21)
      at Object.ReactReconciler.mountComponent (node_modules/react/lib/ReactReconciler.js:47:35)
      at mountComponentIntoNode (node_modules/react/lib/ReactMount.js:105:32)
      at ReactReconcileTransaction.Mixin.perform (node_modules/react/lib/Transaction.js:138:20)
      at batchedMountComponentIntoNode (node_modules/react/lib/ReactMount.js:126:15)
      at ReactDefaultBatchingStrategyTransaction.Mixin.perform (node_modules/react/lib/Transaction.js:138:20)
      at Object.ReactDefaultBatchingStrategy.batchedUpdates (node_modules/react/lib/ReactDefaultBatchingStrategy.js:63:19)
      at Object.batchedUpdates (node_modules/react/lib/ReactUpdates.js:98:20)
      at Object.ReactMount._renderNewRootComponent (node_modules/react/lib/ReactMount.js:285:18)
      at Object.ReactMount._renderSubtreeIntoContainer (node_modules/react/lib/ReactMount.js:371:32)
      at Object.ReactMount.render (node_modules/react/lib/ReactMount.js:392:23)
      at ReactTestUtils.renderIntoDocument (node_modules/react/lib/ReactTestUtils.js:85:21)
      at Context.<anonymous> (feedwidget.js:12:23)




=============================== Coverage summary ===============================
Statements   : 83.33% ( 10/12 )
Branches     : 50% ( 1/2 )
Functions    : 66.67% ( 4/6 )
Lines        : 83.33% ( 10/12 )
================================================================================
npm ERR! Test failed.  See above for more details.
```

Our test fails, so we can start work on the widget proper. Here it is:

```javascript
import React from 'react';
import jQuery from 'jquery';
window.jQuery = jQuery;

const FeedItem = React.createClass({
  render() {
    return (
      <a href={this.props.link} target="_blank">
        <li className="feeditem">{this.props.title}</li>
      </a>
    );
  }
});

export default React.createClass({
  getInitialState() {
    return {
      feed: [],
      size: this.props.size || 5
    };
  },
  componentDidMount() {
    this.getFeed();
    this.interval = setInterval(this.getFeed, (this.props.delay * 1000));
  },
  componentWillUnmount() {
    clearInterval(this.interval);
  },
  getFeed() {
    let that = this;
    jQuery.ajax({
      url: this.props.feed,
      success: function (response) {
        let xml = jQuery(response);
        let feed = [];
        xml.find('item').each(function () {
          let item = {};
          item.title = jQuery(this).find('title').text();
          item.link = jQuery(this).find('guid').text();
          feed.push(item);
        });
        that.setState({
          feed: feed.slice(0,that.state.size)
        });
      }
    });
  },
  render() {
    let feedItems = this.state.feed.map(function (item, index) {
      return (
        <FeedItem title={item.title} link={item.link} key={item.link}></FeedItem>
      );
    });
    return (
      <div className="feedwidget widget">
        <div className="widget-content">
          <h2 ref="feed"> Fetched from {this.props.feed}</h2>
          <ul>
            {feedItems}
          </ul>
        </div>
      </div>
    );
  }
});
```

This is by far the most complex component, so a little explanation is called for. We include jQuery as a dependency at the top of the file. Then we create a component for rendering an individual feed item, called `FeedItem`. This is very simple, consisting of an anchor tag wrapped around a list item. Note the use of the `const` keyword - in ES6 this denotes a constant.

Next, we move onto the feed widget proper. We set the initial state of the feed to be an empty array. Then, we define a `componentDidMount()` method that calls `getFeed()` and sets up an interval to call it again, based on the `delay` property. The `getFeed()` method fetches the URL in question and sets `this.state.feed` to an array of the most recent entries in the feed, with the size denoted by the `size` property passed through. We also clear that interval when the component is about to be unmounted.

Note that you may have problems with the `Access-Control-Allow-Origin` HTTP header. It's possible to disable this in your web browser, so if you want to run this as a dashboard you'll probably need to do so. On Chrome there's a useful [plugin](https://www.google.co.uk/url?sa=t&rct=j&q=&esrc=s&source=web&cd=1&cad=rja&uact=8&ved=0ahUKEwiw9Mm4r8TOAhVNOMAKHUicCF4QFggcMAA&url=https%3A%2F%2Fchrome.google.com%2Fwebstore%2Fdetail%2Fallow-control-allow-origi%2Fnlfbmbojpeacfghkpbjhddihlkkiljbi%3Fhl%3Den&usg=AFQjCNHSUFqc6ylxfxfbWzmmFJ6L5QUvyg&sig2=fJaf_HKgY8XDsd-JeY_PXg&bvm=bv.129422649,d.d24) that allows you to disable this when needed.

Because our `FeedWidget` has been created in a generic manner, we can then include multiple feed widgets easily, as in this example:

```javascript
import React from 'react';
import ClockWidget from './clockwidget';
import FeedWidget from './feedwidget';

export default React.createClass({
  render() {
    return (
      <div className="dashboard">
        <h1 ref="title">{this.props.title}</h1>
        <div className="wrapper">
          <ClockWidget />
          <FeedWidget feed="http://feeds.bbci.co.uk/news/rss.xml?edition=uk" size="5" delay="60" />
          <FeedWidget feed="https://www.sitepoint.com/feed/" size="10" delay="120" />
        </div>
      </div>
    );
  }
});
```

We also need to style our widgets. Save this as `scss/_colours.scss`:

```scss
$bgColour: #151515;
$txtColour: #cfcfcf;
$clockBg: #fa8c00;
$clockHoverBg: #0099ff;
$clockTxt: #fff;
$feedBg: #0099ff;
$feedTxt: #fff;
$feedHoverBg: #fa8c00;
```

And this as `scss/style.scss`:

```scss
@import 'colours';

html, body {
    background-color: $bgColour;
    color: $txtColour;
    font-family: Arial, Helvetica, sans-serif;
}

div.dashboard {
    padding: 10px;
}

div.wrapper {
    -moz-column-count: 4;
    -webkit-column-count: 4;
    column-count: 4;
    -moz-column-gap: 1em;
    -webkit-column-gap: 1em;
    column-gap: 1em;
}

div.widget {
    display: inline-block;
    margin: 0 0 1em;
    width: 100%;
    min-height: 100px;
    margin: 5px;
    opacity: 0.8;
    transition: opacity 1s;

    &:hover {
        opacity: 1;
    }

    h2, h4 {
        padding: 20px;
    }

    div.widget-content {
        width: 100%;
    }
}

div.clockwidget {
    background-color: $clockBg;
    color: $clockTxt;
}

div.feedwidget {
    background-color: $feedBg;
    color: $feedTxt;

    h2 {
        word-wrap: break-word;
    }

    ul {
        margin-left: 0;
        padding-left: 20px;

        a {
            text-decoration: none;
            padding: 5px;

            li {
                list-style-type: none;
                font-weight: bold;
                color: $feedTxt;
            }
        }
    }
}
```

The end result should look something like this:

![The personal dashboard in action](/static/images/dashboard.png)

With that done, feel free to add whatever other feeds you want to include.

Deploying our dashboard
-----------------------

The final step is deploying our dashboard to our Raspberry Pi or other device. Run the following command to generate the Javascript:

```bash
$ npm run build
```

This will create `static/bundle.js`. You can then copy that file over to your web server with `index.html` and place both files in the web root. I recommend using Nginx if you're using a Raspberry Pi as it's faster and simpler for static content. If you're likely to make a lot of changes you might want to create a command in the `scripts` section of your `package.json` to deploy the files more easily.

These basic widgets should be enough to get you started. You should be able to use the feed widget with virtually any RSS feed, and you should be able to use a similar approach to poll third-party APIs, although you might need to authenticate in some way (if you do, you won't want to expose your authentication details, so ensure that nobody from outside the network can view your application). I'll leave it to you to see what kind of interesting widgets you come up with for your own dashboard, but some ideas to get you started include:

* Public transport schedules/Traffic issues
* Weather reports
* Shopping lists/Todo lists, with HTML5 local storage used to persist them
* Galleries of recent photos on social networks
* Status of servers on cloud hosting providers

With a little thought, you can probably come up with a few more than that! I've created a [Github repository with the source code](https://github.com/matthewbdaly/personal-dashboard) so you can check your own implementation against it.
