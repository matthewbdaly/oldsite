---
title: "My first Laravel package"
date: 2017-02-19 15:50:11 +0000
categories:
- php
- laravel
comments: true
---

For some time now I've had a Laravel middleware I use extensively to add ETags to HTTP requests. I often use it for work projects, but obviously copying and pasting it all the time was a pain. I always meant to create a package for it, but I didn't want to do so until such time as I had some proper tests for it. Now I've finally figured out how to test middleware in isolation and I've got around to adding tests and creating a proper package for it.

It's available on [Github](https://github.com/matthewbdaly/laravel-etag-middleware) and [Packagist](https://packagist.org/packages/matthewbdaly/laravel-etag-middleware) if you want to use it.
