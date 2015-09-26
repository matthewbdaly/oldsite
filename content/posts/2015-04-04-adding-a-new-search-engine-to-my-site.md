---
title: "Adding a new search engine to my site"
date: 2015-04-04 01:47:43 +0100
categories: 
- grunt
- yeoman
- lunr
comments: true
---

I've just finished implementing a new search engine for this site. Obviously, with it using a static site generator, searching a relational database isn't an option. For a long while I'd just been getting by with Google's site-specific search, which worked, but meant leaving the site to view the search results.

Now, I've implemented a client-side search system using [Lunr.js](http://lunrjs.com/). It wasn't too time consuming, and as the index is generated with the rest of the site and loaded with the page, the response is almost instantaneous. I may write a future blog post on how to integrate Lunr.js with your site, as it's very handy and is an ideal solution for implementing search on a static site.
