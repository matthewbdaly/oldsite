---
title: "Higher-order components in React"
date: 2019-02-16 19:00:30 +0000
categories:
- javascript
- react
comments: true
---

In the last few weeks I've been working on a big rebuild of the homepage of the legacy application I maintain. As I've been slowly transitioning it to use React on the front end, I used that, and it's by far the largest React project I've worked on to date. This has pushed me to use some more advanced React techniques I hadn't touched on before. I've also had to create some different components that have common functionality.

React used to use mixins to share common functionality, but the consensus is now that [mixins are considered harmful](https://reactjs.org/blog/2016/07/13/mixins-considered-harmful.html), so they have been removed. Instead, developers are encouraged to create higher-order components to contain the shared functionality.

A higher-order component is a function that accepts a React component as an argument, and then returns another component that wraps the provided one. The shared functionality is defined inside the wrapping component, and so any state or methods defined in the wrapping component can then be passed as props into the wrapped one, as in this simple example:

```javascript
import React, { Component } from 'react';

export default function hocExample(WrappedComponent) {
  class hocExample extends Component {
    constructor(props) {
      this.state = {
        foo: false
      };
      this.doStuff = this.doStuff.bind(this);
    }
    doStuff() {
      this.setState({
        foo: true
      });
    }
    render() {
      return (
        <WrappedComponent foo={this.state.foo} doStuff={this.doStuff} />
      );
    }
  }
  return hocExample;
}
```

If you've been working with React for a while, even if you haven't written a higher-order component, you've probably used one. For instance, `withRouter()` from `react-router` is a good example of a higher-order component that forms part of an existing library.

A real-world example
====================

A very common use case I've come across is handling a click outside of a component. For instance, if you have a sidebar or popup component, it's common to want to close it when the user clicks outside the component. As such, it's worth taking the time to refactor it to make it reusable.

In principle you can achieve this on any component as follows:

* The component should accept two props - an `active` prop that denotes whether the component is active or not, and an `onClickOutside()` prop method that is called on a click outside
* On mount, an event listener should be added to the document to listen for `mousedown` events, and it should be removed on unmount
* When the event listener is fired, it should use a ref on the component to determine if the ref contains the event target. If so, and the status is active, the `onClickOutside()` method should be called

Moving this to a higher order component makes a couple of issues slightly more complex, but not very. We can't easily get a ref of the wrapped component, so I had to resort to using `ReactDOM.findDOMNode()` instead, which is potentially a bit dodgy as they're talking about deprecating that.

```javascript
import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';

export default function clicksOutside(WrappedComponent) {
  class clicksOutside extends Component {
    constructor(props) {
      super(props);
      this.setWrapperRef = this.setWrapperRef.bind(this);
      this.handleClickOutside = this.handleClickOutside.bind(this);
    }
    componentDidMount() {
      document.addEventListener('mousedown', this.handleClickOutside);
    }
    componentWillUnmount() {
      document.removeEventListener('mousedown', this.handleClickOutside);
    }
    setWrapperRef(node) {
      this.wrapperRef = node;
    }
    handleClickOutside(event) {
      const {target} = event;
      if (this.wrapperRef && target instanceof Node) {
        const ref = findDOMNode(this.wrapperRef);
        if (ref && !ref.contains(target) && this.props.active === true) {
          this.props.onClickOutside();
        }
      }
    }
    render() {
      return (
        <WrappedComponent {...this.props} ref={this.setWrapperRef} />
      );
    }
  };
  return clicksOutside;
}
```

Now we can use this as follows:

```javascript
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import Sidebar from './src/Components/Sidebar';
import clicksOutside from './src/Components/clicksOutside';

const SidebarComponent = clicksOutside(Sidebar);

function handleClickOutside() {
  alert('You have clicked outside');
}

ReactDOM.render(
  <SidebarComponent 
    links={links} 
    active={true} 
    onClickOutside={handleClickOutside} 
  />,
  document.getElementById('root')
);
```

Higher order components sound a lot harder than they actually are. In reality, they're actually quite simple to implement, but I'm not sure the [documentation](https://reactjs.org/docs/higher-order-components.html) is necessarily the best example to use since it's a bit on the complex side.
