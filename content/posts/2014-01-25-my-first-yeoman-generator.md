---
layout: post
title: "My first Yeoman generator"
date: 2014-01-25 11:38:40 +0000
comments: true
categories: 
- javascript
- grunt
- yeoman
---

At work I use the [Skeleton boilerplate](http://www.getskeleton.com/) a lot - my boss, who handles most of the design work, likes it and generally uses it for his designs. I've also been using [Grunt](http://gruntjs.com/) a lot lately, so it was inevitable that I'd probably start to look for a [Yeoman](http://yeoman.io/) generator for working with it.

There was an existing Yeoman generator for Skeleton, but it didn't really do what I wanted. I wanted something that:

* Included jQuery and Modernizr
* Automatically concatenates and minifies all the JavaScript and CSS
* Will automatically rebuild on changes
* Includes LiveReload and a development server
* Includes automatic deployment via FTP

After looking through the documentation for Yeoman, it was actually quick and easy to throw together my own generator and put it up. It's available [here](https://npmjs.org/package/generator-skellington), and the GitHub repository is [here](https://github.com/matthewbdaly/generator-skellington).

Future plans for it include:

* Adding auto-prefixing for CSS
* Removing redundant CSS rules automatically
* Possibly, alternate deployment methods

Frustratingly, NPM seems to be playing up at present - it's not picking up the README file, and the Yeoman site isn't pulling it in. Any idea why, anyone?
