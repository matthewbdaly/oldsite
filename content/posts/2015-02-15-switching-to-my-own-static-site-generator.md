---
title: "Switching to my own static site generator"
date: 2015-02-15 18:11:22 +0000
categories: 
- grunt
- yeoman
- javascript
comments: true
---

As you may have seen if you're visiting the site, I've finally switched over from Octopress to the static site generator I've been working on for the last few months. Apologies if you're seeing lots of old posts in your RSS reader - there must have been an inconsistency between the RSS feed for this and that for Octopress.

I actually still really like Octopress, however I'm not and have never been a big fan of Ruby. Python and JavaScript are my two main go-to languages (although I do a lot of work professionally with PHP as well), so I wanted a solution in one of those languages, but I wanted something that was very similar to Octopress in every other way. I also wanted the facility to easily concatenate and minify static files as part of my deployment process to make the whole thing as lean as possible, so it made sense to build it as a Grunt plugin and create a Yeoman generator for building the boilerplate for the blog. Also, it's always easier to work with your own code, and so using templates I wrote myself should make it quicker and easier for me to customise the blog how I want.

While deploying it did throw up a few errors that I've had to fix, it's gone fairly smoothly and I'm pretty happy with it, although I will no doubt spend some time tweaking it over the next few weeks. It's built with GitHub Pages in mind, but the fact that it's built using Grunt should make it straightforward to switch to a different deployment method - during development I've actually used `grunt-rsync` to deploy to my Raspberry Pi and `grunt-bitbucket-pages` to deploy to Bitbucket in order to test it and both work absolutely fine. There are also Grunt plugins for deploying via FTP around, so if you want to check it out, then as long as you have at least some familiarity with Grunt you should be able to deploy it however you wish. The generator is meant to be only a starting point for your own site, so by all means check it out, tinker with the styling and templates, and make it your own. I will be very happy indeed if I see someone else using it in the wild.

Static site generators are generally somewhat harder to use than a CMS like WordPress, but they have many advantages:

* Lighter - you can quite easily host a static site with just Nginx on a Raspberry Pi
* Faster - with no database or actual dynamic content on the server, just flat HTML, your site will be far quicker to load than a WordPress blog
* Cheaper to host
* Easy to deploy - if your workflow is very command-line based like mine is, it's very quick and easy to get blogging

If you can get away with using a static site generator rather than a database-driven blogging system, then it's well worth doing so.
