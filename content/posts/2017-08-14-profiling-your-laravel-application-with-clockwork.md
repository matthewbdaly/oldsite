---
title: "Profiling your Laravel application with Clockwork"
date: 2017-08-14 12:40:00 +0100
categories:
- php
- laravel
- profiling
comments: true
---

If you're building any non-trivial application, it's always a good idea to profile it to find performance problems. [Laravel Debugbar](https://github.com/barryvdh/laravel-debugbar) is the usual solution for profiling Laravel web applications, but it isn't really much use for REST API's or single-page web apps that consume them.

Recently I was introduced to [Clockwork](https://github.com/itsgoingd/clockwork), which is a server-side extension for profiling PHP applications. It's made it a whole lot easier to track down issues like excessive numbers of queries when building an API, and as a result I've been able to dramatically improve the performance of an API I've been working on. Here I'll show you how you can use it on a project.

Installing Clockwork
--------------------

Clockwork is available via Composer:

```bash
$ composer require itsgoingd/clockwork
```

You also need to register the service provider in `config/app.php`:

```php
   Clockwork\Support\Laravel\ClockworkServiceProvider::class,
```

And register the middleware globally in `app/Http/Kernel.php`:

```php
protected $middleware = [
      \Clockwork\Support\Laravel\ClockworkMiddleware::class,
]
```

Note that it only works when `APP_DEBUG` is set to true in your `.env` file. This means that you can keep it in your application without worrying about exposing too much data in production, as long as debug mode is not active on your production server (which it shouldn't be anyway).

You will also need to install the [Chrome extension](https://chrome.google.com/webstore/detail/clockwork/dmggabnehkmmfmdffgajcflpdjlnoemp?hl=en) in order to actually work with the returned data. Clockwork works by adding its own route to your Laravel application, and this extension makes sure that it makes the appropriate request on loading a page, and then displays the data in the dev tools.

Once it's all installed and your application is running, open the dev tools and you should see the new **Clockwork** tab in there. On the left of this tab is a list of requests - if you make a request, you'll see it added to the list. When you click on each request, you'll see the following tabs, where applicable:

Request
-------

![Request tab](/static/images/clockwork1.png)

This is similar to Chrome's network tab in that it shows all of the headers for a given request. It's not anything you can't get using Chrome's existing dev tools, but because it doesn't show any static content it's arguably a bit easier to navigate.

Timeline
--------

![Timeline tab](/static/images/clockwork2.png)

This shows how long the response takes to respond, which can be helpful in identifying slower requests.

In addition, you can create your own events using the `clock()` helper, which will appear in the timeline, as in this example:

```php
clock()->startEvent('email_sent', 'Email sent.');
clock()->endEvent('email_sent');
```

Log
---

![Log tab](/static/images/clockwork8.png)

The log tab is only displayed if you use the `clock()` helper to log data. You can log text or JSON objects as appropriate:

```php
clock('Message text.'); // 'Message text.' appears in Clockwork log tab
clock(['hello' => 'world']); // logs json representation of the array
```

This is arguably more convenient than using the `Log` facade to write to the application log, since it's kept in the browser and you can easily see what request caused what message to be logged.

Database
--------

![Database tab](/static/images/clockwork3.png)

The database tab displays details of the queries made by a request. This is useful for identifying things such as:

* Repeated queries that should be cached
* The n+1 problem (which can be resolved by use of eager loading)
* Slow queries that need to be optimised

Note that if a particular endpoint does not trigger a query, this tab will not be visible.

Cookies
-------

![Cookies tab](/static/images/clockwork4.png)

For a REST API, you shouldn't really have much use for cookies, but if you do, this tab lets you view the cookies set on the request.

Session
-------

![Session tab](/static/images/clockwork5.png)

As with cookies, the session isn't normally something you'd use for an API, but this tab lets you view it.

Views
-----

![Views tab](/static/images/clockwork6.png)

This tab shows the views used on the page, and all of the data passed to them.

Routes
------

![Routes tab](/static/images/clockwork7.png)

This tab shows all of the routes defined within your application.

Clockwork isn't limited to Laravel - you can also use it with Lumen, Slim 2, and CodeIgniter 2.1, and it's possible to write your own integration for other frameworks. It's still fundamentally browser-based, so it's difficult to use it if your API doesn't have at least some kind of web front end (whether that's a single page web app or Phonegap app that consumes the API, or that the API is itself browsable and returns HTML in a web browser), but I've found it to be superior to Laravel Debugbar for most of what I do.
