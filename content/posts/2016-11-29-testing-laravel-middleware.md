---
title: "Testing Laravel Middleware"
date: 2016-11-29 23:00:38 +0000
categories:
- php
- laravel
comments: true
---

It's widely accepted that high-level integration tests alone do not make for a good test suite. Ideally each individual component of your application should have unit tests, which test that component in isolation. These unit tests are usually much quicker to run, making it easier to practice test-driven development. However, it can sometimes be hard to grasp how to test that one component on its own.

The other day I had an issue with several middleware classes for a Laravel application and I wanted to verify that they were working as expected. Sounds like a job for dedicated unit tests, but I hadn't tested custom middleware in isolation before, and figuring out how to do so took a while.

Laravel middleware accepts an instance of `Illuminate\Http\Request`, itself based on the Symfony request object, as well as a closure for the action to take next. Depending on what the middleware does, it may return a redirect or simply amend the existing request or response. So in theory you can instantiate a request object, pass it to the middleware, and check the response. For middleware that does something simple, such as redirecting users based on certain conditions, this is fairly straightforward.

In this example we have a fairly useless piece of middleware that checks to see what the route is for a request and redirects it if it matches a certain pattern:

```php
<?php

namespace App\Http\Middleware;

use Closure;

class RedirectFromAdminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        if ($request->is('admin*')) {
            return redirect('/');
        }
        return $next($request);
    }
}
```

While this example is of limited use, it wouldn't take much work to develop it to redirect conditionally based on an account type, and it's simple enough to demonstrate the principles involved. In these tests, we create instances of `Illuminate\Http\Request` and pass them to the middleware's `handle()` method, along with an empty closure representing the response. If the middleware does not amend the request, we get the empty response from the closure. If it does amend the request, we get a redirect response.

```php
<?php

use Illuminate\Http\Request;

class RedirectFromAdminMiddlewareTest extends TestCase
{
    public function testRedirectMiddlewareCalledOnAdmin()
    {
        // Create request
        $request = Request::create('http://example.com/admin', 'GET');

        // Pass it to the middleware
        $middleware = new App\Http\Middleware\RedirectFromAdminMiddleware();
        $response = $middleware->handle($request, function () {});
        $this->assertEquals($response->getStatusCode(), 302);
    }

    public function testRedirectMiddlewareNotCalledOnNonAdmin()
    {
        // Create request
        $request = Request::create('http://example.com/pages', 'GET');

        // Pass it to the middleware
        $middleware = new App\Http\Middleware\RedirectFromAdminMiddleware();
        $response = $middleware->handle($request, function () {});
        $this->assertEquals($response, null);
    }
}
```

For middleware that fetches the response and acts on it, things are a little more complex. For instance, this is the Etag middleware I use on many projects:

```php
<?php

namespace App\Http\Middleware;

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

This acts on the response object, so we need to pass that through as well. Fortunately, Mockery allows us to create a mock of our response object and set it up to handle only those methods we anticipate being called:

```php
<?php

use Illuminate\Http\Request;

class ETagMiddlewareTest extends TestCase
{
    /**
     * Test new request not cached
     *
     * @return void
     */
    public function testModified()
    {
        // Create mock response
        $response = Mockery::mock('Illuminate\Http\Response')->shouldReceive('getContent')->once()->andReturn('blah')->getMock();
        $response->shouldReceive('setEtag')->with(md5('blah'));

        // Create request
        $request = Request::create('http://example.com/admin', 'GET');

        // Pass it to the middleware
        $middleware = new App\Http\Middleware\ETagMiddleware();
        $middlewareResponse = $middleware->handle($request, function () use ($response) { 
            return $response;
        });
    }

    /**
     * Test repeated request not modified
     *
     * @return void
     */
    public function testNotModified()
    {
        // Create mock response
        $response = Mockery::mock('Illuminate\Http\Response')->shouldReceive('getContent')->once()->andReturn('blah')->getMock();
        $response->shouldReceive('setEtag')->with(md5('blah'));
        $response->shouldReceive('setNotModified');

        // Create request
        $request = Request::create('http://example.com/admin', 'GET', [], [], [], [
            'ETag' => md5('blah')
        ]);

        // Pass it to the middleware
        $middleware = new App\Http\Middleware\ETagMiddleware();
        $middlewareResponse = $middleware->handle($request, function () use ($response) { 
            return $response;
        });
    }


    public function teardown()
    {
        Mockery::close();
    }
}
```

In the first example we mock out the `getContent()` and `setEtag()` methods of our response to make sure they get called, and then pass the request to the middleware, along with a closure that returns the response. In the second example, we also mock out `setNotModified()` to ensure that the correct status code of 304 is set, and add an ETag to our request. In this way we can easily test our middleware in isolation, rather than having to resort to building up our entire application just to test one small method.

Middleware is a convenient place to put functionality that's needed for many routes, but you shouldn't neglect testing it, and ideally you shouldn't have to resort to writing a slow integration test to test it works as expected. By mocking out your dependencies, it's generally not too hard to test it in isolation, resulting in faster and more robust test suites.
