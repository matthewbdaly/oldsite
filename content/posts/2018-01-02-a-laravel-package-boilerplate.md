---
title: "A Laravel package boilerplate"
date: 2018-01-02 12:12:15 +0000
categories:
- php
- laravel
- artisan
comments: true
---

The second package I've been working on recently is [Laravel Package Boilerplate](https://github.com/matthewbdaly/laravel-package-boilerplate). It's a basic starter boilerplate for building your own Laravel packages.

It's not meant to be installed as a project dependency. Instead, run the following command to create a new project boilerplate with it:

```bash
composer create-project --prefer-dist matthewbdaly/laravel-package-boilerplate <YOUR_NEW_PACKAGE_DIRECTORY>
```

This will create a new folder that includes a `src` folder containing a service provider, and a `tests` folder containing a preconfigured base test case, as well as a simple test case for tests that don't need the full application instantiated, in order to help keep your test suite as fast as possible.

In addition, it includes configuration files for:

* PHPUnit
* PHP CodeSniffer
* Travis CI

That way you can start your project off the right way with very little effort.

I've also added my Artisan Standalone project as a dependency - that way you can access any Artisan commands you need to generate files you need as follows:

```bash
$ vendor/bin/artisan
```

Hopefully this package should make it a lot easier to create new Laravel packages in future.
