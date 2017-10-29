---
title: "An Azure Filesystem integration for Laravel"
date: 2017-10-29 19:15:34 +0000
categories:
- azure
- php
- laravel
comments: true
---

[My earlier post about integrating Laravel and Azure storage](/blog/2016/10/24/creating-an-azure-storage-adapter-for-laravel/) seems to have become something of a go-to resource on this subject (I suspect this is because very few developers actually use Laravel and Azure together). Unfortunately it hasn't really aged terribly well - changes to the namespace and to Guzzle mean that it needs some work to integrate it.

I've therefore [created a package for it](https://github.com/matthewbdaly/laravel-azure-storage). That way, it's easier to keep it up to date as if someone finds and fixes an issue with it, they can submit their changes back.
