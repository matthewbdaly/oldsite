---
title: "Using Artisan from standalone Laravel packages"
date: 2018-01-02 12:01:10 +0000
categories:
- php
- laravel
- artisan
comments: true
---

Recently I've been building and publishing a significant number of Laravel packages, and I thought I'd share details of some of them over the next few days.

[Artisan Standalone](https://github/com/matthewbdaly/artisan-standalone) is a package that, when installed in a standalone Laravel package (eg, not in an actual Laravel install, but in a package that you're building that is intended for use with Laravel), allows you to use Artisan. It's intended largely to make it quicker and easier to build functionality as separate packages by giving you access to the same generator commands as you have when working with a Laravel application. It came about largely from a need to scratch my own itch, as when building packages I was having to either run Artisan commands in a Laravel app and move them over, or copy them from existing files, which was obviously a pain in the proverbial.

You can install it with the following command:

```bash
$ composer require --dev matthewbdaly/artisan-standalone
```

Once it's installed, you can access Artisan as follows:

```bash
$ vendor/bin/artisan
```

Note that it doesn't explicitly include Laravel as a dependency - you'll need to add that in the parent package to pull in the libraries it needs (which you should be doing anyway). It's possible that there are some commands that won't work in this context, but they're almost certainly ones you won't need here, such as the `migrate` command. As far as I can tell the generator commands, which are the only ones we're really interested in here, all work OK.
