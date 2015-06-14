---
title: "Setting ETags in Laravel 5"
date: 2015-06-14 21:29:52 +0100
categories: 
- php
- laravel
---

Although I'd prefer to use Python or Node.js, there are some times when circumstances dictate that I need to use PHP for a project at work. In the past, I used CodeIgniter, but that was through nothing more than inertia. For some time I'd been planning to switch to Laravel, largely because of the baked-in PHPUnit support, but events conspired against me - one big project that came along had a lot in common with an earlier one, so I forked it rather than starting over.

Recently I built a REST API for a mobile app, and I decided to use that to try out Laravel (if it had been available at the time, I'd have gone for Lumen instead). I was very pleased with the results - I was able to quickly put together the back end I wanted, with good test coverage, and the `tinker` command in particular was useful in debugging. The end result is fast and efficient, with query caching in place using Memcached to improve response times.

I also implemented a simple middleware to add ETags to HTTP responses and compare them on incoming requests, returning a `304 Not Modified` status code if they are the same, which is given below:

```php
<?php namespace App\Http\Middleware;

use Closure;

class ETagMiddleware {

	/**
	 * Implement Etag support
	 *
	 * @param  \Illuminate\Http\Request  $request
	 * @param  \Closure  $next
	 * @return mixed
	 */
	public function handle($request, Closure $next)
	{
        // Get response
		$response = $next($request);

        // If this was a GET request...
        if ($request->isMethod('get')) {
            // Generate Etag
            $etag = md5($response->getContent());
            $requestEtag = str_replace('"', '', $request->getETags());

            // Check to see if Etag has changed
            if($requestEtag && $requestEtag[0] == $etag) {
                $response->setNotModified();
            }

            // Set Etag
            $response->setEtag($etag);
        }

        // Send response
        return $response;
    }

}
```

This is based on [a solution for Laravel 4 by Nick Verwymeren](https://www.nickv.codes/blog/etags-in-laravel-4/), but implemented as Laravel 5 middleware, not a Laravel 4 filter. To use this with Laravel 5, save this as `app/Http/Middleware/ETagMiddleware.php`. Then add this to the `$middleware` array in `app/Http/Kernel.php`:

```php
        'App\Http\Middleware\ETagMiddleware',
```

It's quite simple to write this kind of middleware with Laravel, and using something like this is a no-brainer for most web apps considering the bandwidth it will likely save your users.
