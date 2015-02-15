---
layout: post
title: "My first Grunt plugin"
date: 2014-12-28 17:04:41 +0000
comments: true
categories: 
- grunt
- yeoman
- javascript
---

A while back, I mentioned that I'd written a Yeoman generator for creating a flat HTML blog, called [generator-simple-static-blog](https://github.com/matthewbdaly/generator-simple-static-blog). For this, I'd used the first Grunt plugin I could find for the purpose, which was [grunt-markdown-blog](https://github.com/testdouble/grunt-markdown-blog). This worked, but I wasn't really very happy with it.

The ideal Grunt plugin I had in mind was as follows:

* Used Handlebars for templating
* Generated posts from Markdown files
* Saved files in named folders with a single `index.html` file in each one (like Octopress does) so that no file extension is visible on a page
* Generated index pages, rather than just showing the latest post as the first page

Unfortunately, `grunt-markdown-blog` only fulfilled the second criteria, so it was never going to be something I stuck with long-term. However, I couldn't find anything else that would do the trick, so it looked like my only option was to write a suitable plugin myself.

I started a new Git repository a while back, but didn't make much progress. Then, on Christmas Eve, I suddenly got the urge to start working on this again, and in a matter of a few hours I'd gotten a working Grunt plugin that ticked all of these boxes. I had to delay getting it integrated into the generator due to Christmas day, and then an unfortunate bout of flu, but I've now published it as [grunt-blogbuilder](https://github.com/matthewbdaly/grunt-blogbuilder) and amended the Yeoman generator to use it instead.

I'm really pleased with the outcome, and while I'm still not yet ready to migrate over to it from Octopress, it's a massive step forward, and building a Grunt plugin has been an interesting experience.
