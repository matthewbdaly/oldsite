---
layout: post
title: "My first jQuery plugin"
date: 2013-04-21 22:06
comments: true
categories: 
- javascript
- jquery
- development
---

In my day job, I recently finished [PagePooch](https://www.pagepooch.com/), a tool for monitoring web pages for changes in content or prices. It's a project that I'm immensely proud of, because it was my first big and largely solo project as a developer.

During the development of this, I initially created the user interface with jQuery Mobile, but later on added a desktop interface as well. During development of the desktop interface, I needed to recreate the functionality of the filter available for listviews in jQuery Mobile, and wound up creating a plugin for jQuery to do so.

I recently got permission to open-source this, as I figured the functionality was trivial enough that we couldn't reasonably sell it, but by making it freely available, we'd maybe get some goodwill, and if we were really lucky, a few bugfixes and/or improvements.

It's [now available](http://plugins.jquery.com/listfilter/) via the jQuery plugin registry. Please let me know what you think, and feel free to fork it and hack on it as you see fit.
