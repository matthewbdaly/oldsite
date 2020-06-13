---
title: "Flow typed AJAX responses with React Hooks"
date: 2020-06-13 13:50:41 +0100
categories:
- javascript
- react
- flow
comments: true
---

I'm a big fan of type systems in general. Using Psalm to find missing type declarations and incorrect calls in PHP has helped me out tremendously. However, I'm not a big fan of Typescript. The idea of creating a whole new language, primarily just to add types to Javascript, strikes me as a fundamentally bad idea given how many languages that compile to Javascript have fallen by the wayside. Flow seems like a much better approach since it adds types to the language rather than creating a new language, and I've been using it on my React components for a good while now. However, there are a few edge cases that can be difficult to figure out, and one of those is any generic AJAX component that may be reused for different requests.

A while back I wrote the following custom hook, loosely inspired by axios-hooks (but using the Fetch API) to make a query to a GraphQL endpoint:

```javascript
import { useCallback, useState, useEffect } from "react";

function useFetch(url, query) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({query: query})
    }).then(r => r.json())
      .then((data) => {
        setData(data.data);
        setLoading(false);
        setError(false);
      });
  }, [url, query]);

  useEffect(() => {
    fetchData();
  }, [url, query, fetchData]);

  return [{
    data: data,
    loading: loading,
    error: error
  }, fetchData];
};

export default useFetch;
```

When called, the hook receives two parameters, the URL to hit, and the query to make, and returns an array that contains a function for reloading, and an object containing the following values:

* `loading` - a boolean that specifies if the hook is loading right now
* `error` - a boolean that specifies if an error has occurred
* `data` - the response data from the endpoint, or null

Using this hook, it was then possible to make an AJAX request when a component was loaded to populate the data, as in this example:

```javascript
import React from 'react';
import useFetch from './Hooks/useFetch';
import marked from 'marked';
import './App.css';

function App() {
  const url = `/graphql`;
  const query = `query {
    posts {
      title
      slug
      content
      tags {
        name
      }
    }
  }`;

  const [{data, loading, error}] = useFetch(url, query);

  if (loading) {
    return (<h1>Loading...</h1>);
  }

  if (error) {
    return (<h1>Error!</h1>);
  }

  const posts = data ? data.posts.map((item) => (
    <div key={item.slug}>
      <h2>{item.title}</h2>
      <div dangerouslySetInnerHTML={{__html: marked(item.content)}} />
    </div>
  )) : [];
  return (
    <div className="App">
      {posts}
    </div>
  );
}

export default App;
```

This hook is simple, and easy to reuse. However, it's difficult to type the value of `data` correctly, since it will be different for different endpoints, and given that it may be reused for almost any endpoint, you can't cover *all* the acceptable response types. We need to be able to specify the response that is acceptable in that particular context.

Generics to the rescue
----------------------

Flow provides a solution for this in the shape of [generic types](https://flow.org/en/docs/types/generics/). By passing in a polymorphic type using `<T>` in the function declaration, we can then refer to that type when specifying what `data` should look like:

```flow
//@flow
import { useCallback, useState, useEffect } from "react";

function useFetch<T>(url: string, query: string): [{
  data: ?T,
  loading: boolean,
  error: boolean
}, () => void] {
  const [data, setData]: [?T, ((?T => ?T) | ?T) => void] = useState(null);
  const [loading, setLoading]: [boolean, ((boolean => boolean) | boolean) => void] = useState(false);
  const [error, setError]: [boolean, ((boolean => boolean) | boolean) => void] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({query: query})
    }).then(r => r.json())
      .then((data) => {
        setData(data.data);
        setLoading(false);
        setError(false);
      });
  }, [url, query]);

  useEffect(() => {
    fetchData();
  }, [url, query, fetchData]);

  return [{
    data: data,
    loading: loading,
    error: error
  }, fetchData];
};

export default useFetch;
```

Then, when calling the hook, we can define a type that represents the expected shape of the data (here called `<Data>`, and specify that type when calling the hook, as in this example:

```javascript
//@flow
import React from 'react';
import useFetch from './Hooks/useFetch';
import marked from 'marked';
import './App.css';

type Data = {
  posts: Array<{
    title: string,
    slug: string,
    content: string,
    name: Array<string>
  }>
};

function App() {
  const url = `/graphql`;
  const query = `query {
    posts {
      title
      slug
      content
      tags {
        name
      }
    }
  }`;

  const [{data, loading, error}] = useFetch<Data>(url, query);

  if (loading) {
    return (<h1>Loading...</h1>);
  }

  if (error) {
    return (<h1>Error!</h1>);
  }

  const posts = data ? data.posts.map((item) => (
    <div key={item.slug}>
      <h2>{item.title}</h2>
      <div dangerouslySetInnerHTML={{__html: marked(item.content)}} />
    </div>
  )) : [];
  return (
    <div className="App">
      {posts}
    </div>
  );
}

export default App;
```

That way, we can specify a completely different shape for our response data every time we call a different endpoint, without creating a different hook for every different endpoint, and still enjoy properly typed responses from our hook.

Generics can be useful for many other purposes, such as specifying the contents of collections. For instance, if you had a `Collection` object, you could use a generic type to specify that any one instance must consist of instances of a given type. Flow would then flag it as an error if you assigned an item of the wrong type to that collection, thus making some unit tests redundant.
