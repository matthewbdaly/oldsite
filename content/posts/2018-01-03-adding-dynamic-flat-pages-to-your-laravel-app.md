---
title: "Adding dynamic flat pages to your Laravel app"
date: 2018-01-03 11:49:11 +0000
categories:
- php
- laravel
- flatpages
comments: true
---

Most web apps have at least some need for some additional flat pages, for purposes such as:

* Terms and conditions
* Cookie/privacy policy
* FAQ

You can of course hard-code this content in a view file, but if this content is likely to change often it may be useful to give the site owners the capability to manage this themselves.

[Laravel Flatpages](https://github.com/matthewbdaly/laravel-flatpages) is a package I wrote that adds a flatpage model, controller and view to your application. It's loosely inspired by Django's flatpages app. Using it, you can quickly and easily build a very simple brochure-style CMS. Each page contains fields for the title, content, slug, and an optional template field that specifies which view to use.

Note that it doesn't include any kind of admin functionality, so you'll need to add this yourself or find a package for it. It uses my [repositories package](http://github.com/matthewbdaly/laravel-repositories) to access the database, and this has caching built in, so when you create, update or delete a flatpage, you should either resolve `Matthewbdaly\LaravelFlatpages\Contracts\Repositories\Flatpage` and use the methods on that to make the changes (in which case the appropriate caches should be flushed automatically), or flush the cache. It also requires a cache backend that supports tags, such as Memcached or Redis.

It does not include routing in the package itself because I couldn't find a way to guarantee that it would always be the last route, so instead you should put this in your `routes/web.php` and make sure it's always the last route:

```php
Route::get('{path}', '\Matthewbdaly\LaravelFlatpages\Http\Controllers\FlatpageController@page');
```
Otherwise you could wind up with problems. The reason for that is that it has to check the path against the slugs of the flat pages in the database, and if it doesn't find any it raises a 404.

Or, if you prefer, you can use the middleware at `Matthewbdaly\LaravelFlatpages\Http\Middleware\FlatpageMiddleware`, which may be more convenient in many case. This should be added as the last global middleware in `app\Http\Kernel.php`.
