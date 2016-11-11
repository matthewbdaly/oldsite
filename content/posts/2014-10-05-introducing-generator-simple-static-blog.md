---
layout: post
title: "Introducing generator-simple-static-blog"
date: 2014-10-05 19:56:46 +0100
comments: true
categories: 
- grunt
- yeoman
- javascript
---

I'm a big fan of static site generators. I ditched WordPress for Octopress over two years ago because it was free to host on GitHub Pages and much faster, had much better syntax highlighting, and I liked being able to write posts in Vim, and I've never looked back since.

That said, Octopress is written in Ruby, a language I've never been that keen on. Ideally I'd prefer to use Python or JavaScript, but none of the solutions I've found have been to my liking. Recently I've been using Grunt and Yeoman to some extent, and I've wondered about the idea of creating a Yeoman generator to build a static blogging engine. After discovering `grunt-markdown-blog`, I took the plunge and have built a simple blog generator called [generator-simple-static-blog](https://github.com/matthewbdaly/generator-simple-static-blog).

I've published it to NPM, so feel free to check it out. It includes code highlighting with the Zenburn colour scheme by default (although highlight.js includes many other themes, so just switch to another one if you want), and it should be easy to edit the templates. I've also included the ability to deploy automatically to GitHub Pages using Grunt.

I don't anticipate moving over to this from Octopress for the foreseeable future, but it's been an interesting project for the weekend.
