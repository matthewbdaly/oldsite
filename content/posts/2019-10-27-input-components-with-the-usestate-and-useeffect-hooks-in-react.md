---
title: "Input components with the useState and useEffect hooks in React"
date: 2019-10-27 21:20:00 +0000
categories:
- javascript
- react
comments: true
---

Like many developers who use React.js, I've been eager to explore the Hooks API in the last year or so. They allow for easier ways to share functionality between components, and can allow for a more expressive syntax that's a better fit for Javascript than class-based components. Unfortunately, they became production ready around the time I rolled out a new React-based home page, so I didn't want to jump on them immediately in the context of a legacy application. I'm now finding myself with a bit of breathing space, so I've begun refactoring these components, and converting some to use hooks, in order to more easily reuse some code that currently resides in a big higher-order component.

The `useState` and `useEffect` hooks are by far the most common hooks in most applications. However, I've found that the React documentation, while OK at explaining how to use these individually, is not so good at explaining how to use them together, particularly in the case of an input component, which is a common use case when looking to convert existing components. For that reason, I'm going to provide a short example of how you might use them together for that use case.

A simple function component
---------------------------

A basic component for an input might look like this:

```jsx
//@flow
import React from 'react';

type Props = {
  name: string,
  id: string,
  value: string,
  placeholder: string
};

const Input = (props: Props) => {
  return (
    <input type="text" name={props.name} id={props.id} value={props.value} placeholder={props.placeholder} />
  );
}

export default Input;
```

Note I'm using Flow annotations to type the arguments passed to my components. If you prefer Typescript it should be straightforward to convert to that.

As you can see, this component accepts a name, ID, value and placeholder as props. If you add this to an existing React app, or use `create-react-app` to create one and add this to it, you can include it in another component as follows:

```jsx
<Input name="foo" id="foo" value="foo" placeholder="foo" />
```

Adding state
------------

This will render, but as the value will never change it's not actually of any use in a form. If you've written class-based React components before, you'll know that the usual way to handle this is to move the value of the input from props to state. Prior to the introduction of the Hooks API, while you could create a function component, you couldn't use state with it, making situations like this difficult to handle. Fortunately, the `useState` hook now allows you to add state to a function component as follows:

```jsx
//@flow
import React, { useState } from 'react';

type Props = {
  name: string,
  id: string,
  value: string,
  placeholder: string
};

const Input = (props: Props) => {
  const [value, setValue] = useState(props.value);

  return (
    <input type="text" name={props.name} id={props.id} value={value} placeholder={props.placeholder} onChange={(e) => setValue(e.target.value)} />
  );
}

export default Input;
```

We import the `useState` hook at the top, as usual. Then, within the body of the component, we call `useState()`, passing in the initial value of `props.value`, and get back two variables in response:

* `value` is the value of the state variable, and can be thought of as equivalent to what `this.state.value` would be in a class-based component
* `setValue` is a function for updating `value` - rather than explicitly defining a function for this, we can just get one back from `useState()`

Now we can set the value with `value={value}`. We also need to handle changes in the state, so we add `onChange={(e) => setValue(e.target.value)}` to call `setValue()` on a change event on the input.

Handling effects
----------------

The component will now allow you to edit the value. However, one problem remains. If you open the React dev tools, go to the props for this component, and set `value` manually, it won't be reflected in the input's value, because the state has diverged from the initial value passed in as a prop. We need to be able to pick up on changes in the props and pass them through as state.

In class-based components, there are lifecycle methods that fire at certain times, such as `componentDidMount()` and `componentDidUpdate()`, and we would use those to handle that situation. Hooks condense these into a single `useEffect` hook that is more widely useful. Here's how we might overcome this problem in our component:

```jsx
//@flow
import React, { useState, useEffect } from 'react';

type Props = {
  name: string,
  id: string,
  value: string,
  placeholder: string
};

const Input = (props: Props) => {
  const [value, setValue] = useState(props.value);

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  return (
    <input type="text" name={props.name} id={props.id} value={value} placeholder={props.placeholder} onChange={(e) => setValue(e.target.value)}/>
  );
}

export default Input;
```

`useEffect` takes one compulsory argument, in the form of a callback. Here we're using that callback to set our state variable back to the value of the prop passed through.

Note the second argument, which is an array of variables that should be watched for changes. If we had used the following code instead:

```jsx
  useEffect(() => {
    setValue(props.value);
  });
```

Then the callback would fire after every render, reverting the value back and possibly causing an infinite loop. For that reason, we pass through the second argument, which tells React to only fire the callback if one of the specified variables has changed. Here we only want to override the state when the value props passed down to the component changes, so we pass that prop in as an argument.

Summary
-------

This is only a simple example, but it does show how simple and expressive hooks can make your React components, and how to use the `useEffect` and `useState` hooks together, which was something I found the documentation didn't make clear. These two hooks cover a large chunk of the functionality of React, and knowledge of them is essential to using React effectively.
