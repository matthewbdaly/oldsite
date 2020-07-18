---
title: "Adding React to a legacy project"
date: 2018-10-16 09:00:29 +0100
categories:
- reactjs
- javascript
comments: true
---

The project I'm currently working on is a textbook example of what happens when a project uses jQuery when it really ought to use a proper Javascript framework, or it starts out just using jQuery and grows out of all proportion. It's also not helped by the fact that historically it's just been worked on when new functionality needs to be added, meaning that rather than refactoring the code base, it's been copied-and-pasted. As a result, there's lots of repetitive code in desperate need of refactoring, and huge reams of horrible jQuery spaghetti code.

When I first took over responsibility for the project, I integrated Laravel Mix into it so that I had the means to refactor some of the common functionality into separate files and require them during the build process, as well as use ES6. However, this was only the first step, as it didn't sort out the fundamental problem of repetitive boilerplate code being copied and pasted. What I needed was a refactor to use something more opinionated. As it happened, I was asked to add a couple of modals to the admin, and since the modals were one of the worst parts of the admin in terms of repetitive code, they were a strong candidate for implementing using a more suitable library.

I looked at a few options:

* I've used Angular 1 quite successfully in the past, but I didn't really want to use a framework that was being killed off, and it would be difficult to retrofit into a legacy application
* Angular 2+ is actively maintained, but it would again be difficult to retrofit it into a legacy application. In addition, the need for TypeScript would make it problematic.
* Vue was a possibility, but it did a bit too much for this use case, and it wasn't all that clear how to retrofit it to an existing application

Eventually, I settled on React.js, for the following reasons:

* It has a preset in Laravel Mix, making it easy to get started with it.
* It has a very limited target - React is closely focused on the view layer, dealing only with rendering and event handling, so it does just what I needed in this case.
* It has a strong record of use with legacy applications - after all, it was created by Facebook and they added it incrementally.
* It's easy to test - Jest's snapshot tests make it easy to verify the rendered content hasn't changed, and using Enzyme it's straightforward to test interactions with the component
* Higher order components provide a straightforward way to share functionality between components, which I needed to allow different modals to deal with another modal in the same way.
* By creating a series of components for common user interface elements, I could then re-use those components in future work, saving time and effort.

However, it wasn't entirely clear how I might go about integrating React into a legacy application. In the end, I managed to figure out an approach which worked.

Normally, I would create a single root for my application, something like this:

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';

ReactDOM.render(
    <App />,
    document.getElementById('root')
);
```

However, that wasn't an option here. The existing modals were using jQuery and Bootstrap, and the new modals had to work with them. I therefore needed to have only certain parts of the UI managed with React, and the rest wouldn't be touched. Here's an example of how I rendered the modal in the end:

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import higherOrderComponent from './components/higherOrderComponent';
import modalComponent from './components/modalComponent';

const Modal = higherOrderComponent(modalComponent);
window.componentWrapper = ReactDOM.render(
  <Modal />,
  document.getElementById('modalTarget')
);

window.componentWrapper.setState({
  foo: 'bar'
});
```

By extracting the duplicate functionality into a higher order component, I could easily wrap the new modals in that component and share that functionality between the modals. I could then render each component in a different target element, and assign it to a variable in the `window` namespace. The div with a ID of `modalTarget` needed to be added in the appropriate place, but otherwise the HTML didn't need to be touched, since the required markup was in the React component instead.

Then, when I needed to change a value int the state of the component, I could just call `window.componentWrapper.setState({})`, passing through the values to set, and these would propagate down to the child components as usual. I could also render multiple different modal components on the page, and refer to each one separately in order to set the state.

This isn't an approach I'd recommend on a greenfield project - state isn't really something you should be setting from outside a component like this, and normally I wouldn't do it. However, it seemed to be the easiest way for this particular use case. Over time I'll port more and more of the UI over to React, and eventually it won't be necessary as I'll be storing the application state in something like Redux.
