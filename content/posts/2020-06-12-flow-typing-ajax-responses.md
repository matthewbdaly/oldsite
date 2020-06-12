---
title: "Flow typing AJAX responses"
date: 2020-06-13 00:12:41 +0100
categories:
- javascript
- react
- flow
comments: true
---

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

Here's the hook:

```javascript
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
