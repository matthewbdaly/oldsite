---
title: "Rendering different views for mobile and desktop clients in Laravel"
date: 2018-03-24 11:50:10 +0000
categories:
- php
- laravel
comments: true
---

On web development forums, it's quite common to see variants of the following question:

> How do I redirect a user on a mobile device to a mobile version of the site?

This is despite years and years of responsive design being widely accepted as the most appropriate solution.

Fortunately, there is another way - [dynamic serving](https://developers.google.com/search/mobile-sites/mobile-seo/dynamic-serving).

I've implemented this years ago for a CodeIgniter site. Here's how you might implement it in Laravel.

Don't try to implement mobile user agent detection yourself. Instead, find one that's actively maintained and install it with Composer. That way you can be reasonably sure that as new mobile devices come onto the market the package will detect them correctly as long as you keep it up to date. I would be inclined to go for [Agent](https://github.com/jenssegers/agent), since it has Laravel support baked in.

You need to set the HTTP response header `Vary: User-Agent` to notify clients (including not only search engines, but also proxies at either end of the connection, such as Varnish or Squid) that the response will differ by user agent.
