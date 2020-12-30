---
title: "Lightweight Laravel - deconstructing a full stack framework"
date: 2020-12-30 17:00:00 +0000
categories:
- php
- laravel
comments: true
---

Back when I used to work with Django, I read the book [Lightweight Django](https://www.oreilly.com/library/view/lightweight-django/9781491946275/), and it completely changed the way I thought about building web applications. For years I'd heard the same lines parroted about how Django was too large and bloated, and something like Flask was a better bet for many applications, and this book completely blew this misconception away. By demonstrating how it was possible to break the framework apart, use just what you need, and leave out what you don't, it showed how I could benefit from my familiarity with Django, while making it more suitable for smaller applications.

Laravel, like Django, is a full stack framework, and is often subject to similar misconceptions about bloat. But just because the framework ships with all this stuff, doesn't mean you're obliged to use it all. If you know you aren't going to need all of a framework's functionality, there's nothing stopping you getting rid of what you don't need, or even replacing it with something else. In this article, I'll show you how to apply the same methodology to a Laravel application to remove what you don't need. As part of this, we'll be building a simple placeholder image service. This was used in Lightweight Django as it's a good example of an application that is completely stateless, and doesn't need sessions or a database, so it's often seen as a bad fit for a full stack framework. Since the same applies here, it's a good example for us too.

Getting started
---------------

Run the following command in the shell to create a new Laravel application:

```bash
$ composer create-project --prefer-dist laravel/laravel lightweight-laravel
```

What this actually does is as follows:

* Resolve the latest release of the package `laravel/laravel` that will work on your system
* Copy it from the [repository](https://github.com/laravel/laravel) to the specified location
* Carry out any post-install scripts specified, such as creating the `.env` file and generating a key

However, that's just a standardised boilerplate for Laravel applications. Most of the functionality of the framework is in the package `laravel/framework`, which is included as a dependency in your `composer.json`. This makes sense, because by keeping as much of the actual framework out of the starter boilerplate and in a separate repository, it minimises the work required to update the application to a new version. It also means you can strip that boilerplate down to remove references to things you don't need, and even create your own custom boilerplates to save you work in future.

Stripping down the boilerplate
------------------------------

Let's start stripping out the things we don't need. Since our application is stateless, we have no need whatsoever of a database, so we can delete the `app/Models` and `database` folders. We'll want to support Redis for the cache, so we can't delete the file `config/database.php`, but we can remove any references to the database other than Redis from that file. We can delete some other files from the `config/` folder, namely `auth.php`, `broadcasting.php`, `filesystems.php`, `mail.php`, `queue.php`, `services.php` and `session.php`.

We also don't need a lot of the middleware that ships with Laravel. If you go into the file `app/Http/Kernel.php` you'll see that it assigns some middleware as global, some to the `web` and `api` groups, and some as optional route middleware. In this file:

* We don't need to make any POST requests to this application, so we can lose the `ValidatePostSize` middleware from the global middleware entirely
* The `web` group relates to cookies, sessions, CSRF, authentication and handling routing with substitute bindings. Since we don't need any of that we can empty this group entirely
* The `auth`, `auth.basic`, `can`, `guest`, `password.confirm`, and `verified` route middleware is also surplus to requirements and can go

As this change is a bit fiddly, here's a patch, which may be easier to read:

```patch
From 6bc87e9602e839d5635963b6d740279b2dbcf16b Mon Sep 17 00:00:00 2001
From: Matthew Daly <Matthew Daly 450801+matthewbdaly@users.noreply.github.com>
Date: Wed, 30 Dec 2020 11:54:56 +0000
Subject: [PATCH] Removed unwanted middleware

---
 app/Http/Kernel.php | 14 --------------
 1 file changed, 14 deletions(-)

diff --git a/app/Http/Kernel.php b/app/Http/Kernel.php
index 30020a5..10e150d 100644
--- a/app/Http/Kernel.php
+++ b/app/Http/Kernel.php
@@ -18,7 +18,6 @@ class Kernel extends HttpKernel
         \App\Http\Middleware\TrustProxies::class,
         \Fruitcake\Cors\HandleCors::class,
         \App\Http\Middleware\PreventRequestsDuringMaintenance::class,
-        \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
         \App\Http\Middleware\TrimStrings::class,
         \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
     ];
@@ -30,13 +29,6 @@ class Kernel extends HttpKernel
      */
     protected $middlewareGroups = [
         'web' => [
-            \App\Http\Middleware\EncryptCookies::class,
-            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
-            \Illuminate\Session\Middleware\StartSession::class,
-            // \Illuminate\Session\Middleware\AuthenticateSession::class,
-            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
-            \App\Http\Middleware\VerifyCsrfToken::class,
-            \Illuminate\Routing\Middleware\SubstituteBindings::class,
         ],
 
         'api' => [
@@ -53,14 +45,8 @@ class Kernel extends HttpKernel
      * @var array
      */
     protected $routeMiddleware = [
-        'auth' => \App\Http\Middleware\Authenticate::class,
-        'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
         'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,
-        'can' => \Illuminate\Auth\Middleware\Authorize::class,
-        'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
-        'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class,
         'signed' => \Illuminate\Routing\Middleware\ValidateSignature::class,
         'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
-        'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
     ];
 }
-- 
2.28.0

```

These changes also mean a lot of the service providers and facades are now redundant and can be removed from the application. If you go into `config/app.php` you can remove `AuthServiceProvider`, `BroadcastServiceProvider`, `CookieServiceProvider`, `MailServiceProvider`, `NotificationServiceProvider`, `PaginationServiceProvider`, `PasswordResetServiceProvider`, `SessionServiceProvider` and `TranslationServiceProvider` from the providers section, as well as the commented-out local `BroadcastServiceProvider`. You can also delete the facades for `Auth`, `Cookie`, `DB`, `Eloquent`, `Gate`, `Lang`, `Mail`, `Notification`, `Password`, `Queue`, `Schema`, `Session`, and `Storage`.

Again, here's a patch of the required changes:

```patch
From 66be3b836706ef488b890cdae6e97d4fc6195dd6 Mon Sep 17 00:00:00 2001
From: Matthew Daly <Matthew Daly 450801+matthewbdaly@users.noreply.github.com>
Date: Wed, 30 Dec 2020 12:10:25 +0000
Subject: [PATCH] Removed unused service providers and facades

---
 config/app.php | 26 --------------------------
 1 file changed, 26 deletions(-)

diff --git a/config/app.php b/config/app.php
index 2a2f0eb..b7a38c8 100644
--- a/config/app.php
+++ b/config/app.php
@@ -139,26 +139,17 @@ return [
         /*
          * Laravel Framework Service Providers...
          */
-        Illuminate\Auth\AuthServiceProvider::class,
-        Illuminate\Broadcasting\BroadcastServiceProvider::class,
         Illuminate\Bus\BusServiceProvider::class,
         Illuminate\Cache\CacheServiceProvider::class,
         Illuminate\Foundation\Providers\ConsoleSupportServiceProvider::class,
-        Illuminate\Cookie\CookieServiceProvider::class,
         Illuminate\Database\DatabaseServiceProvider::class,
         Illuminate\Encryption\EncryptionServiceProvider::class,
         Illuminate\Filesystem\FilesystemServiceProvider::class,
         Illuminate\Foundation\Providers\FoundationServiceProvider::class,
         Illuminate\Hashing\HashServiceProvider::class,
-        Illuminate\Mail\MailServiceProvider::class,
-        Illuminate\Notifications\NotificationServiceProvider::class,
-        Illuminate\Pagination\PaginationServiceProvider::class,
         Illuminate\Pipeline\PipelineServiceProvider::class,
         Illuminate\Queue\QueueServiceProvider::class,
         Illuminate\Redis\RedisServiceProvider::class,
-        Illuminate\Auth\Passwords\PasswordResetServiceProvider::class,
-        Illuminate\Session\SessionServiceProvider::class,
-        Illuminate\Translation\TranslationServiceProvider::class,
         Illuminate\Validation\ValidationServiceProvider::class,
         Illuminate\View\ViewServiceProvider::class,
 
@@ -170,9 +161,6 @@ return [
          * Application Service Providers...
          */
         App\Providers\AppServiceProvider::class,
-        App\Providers\AuthServiceProvider::class,
-        // App\Providers\BroadcastServiceProvider::class,
-        App\Providers\EventServiceProvider::class,
         App\Providers\RouteServiceProvider::class,
 
     ],
@@ -193,35 +181,21 @@ return [
         'App' => Illuminate\Support\Facades\App::class,
         'Arr' => Illuminate\Support\Arr::class,
         'Artisan' => Illuminate\Support\Facades\Artisan::class,
-        'Auth' => Illuminate\Support\Facades\Auth::class,
         'Blade' => Illuminate\Support\Facades\Blade::class,
         'Broadcast' => Illuminate\Support\Facades\Broadcast::class,
         'Bus' => Illuminate\Support\Facades\Bus::class,
         'Cache' => Illuminate\Support\Facades\Cache::class,
         'Config' => Illuminate\Support\Facades\Config::class,
-        'Cookie' => Illuminate\Support\Facades\Cookie::class,
         'Crypt' => Illuminate\Support\Facades\Crypt::class,
-        'DB' => Illuminate\Support\Facades\DB::class,
-        'Eloquent' => Illuminate\Database\Eloquent\Model::class,
-        'Event' => Illuminate\Support\Facades\Event::class,
         'File' => Illuminate\Support\Facades\File::class,
-        'Gate' => Illuminate\Support\Facades\Gate::class,
         'Hash' => Illuminate\Support\Facades\Hash::class,
         'Http' => Illuminate\Support\Facades\Http::class,
-        'Lang' => Illuminate\Support\Facades\Lang::class,
         'Log' => Illuminate\Support\Facades\Log::class,
-        'Mail' => Illuminate\Support\Facades\Mail::class,
-        'Notification' => Illuminate\Support\Facades\Notification::class,
-        'Password' => Illuminate\Support\Facades\Password::class,
-        'Queue' => Illuminate\Support\Facades\Queue::class,
         'Redirect' => Illuminate\Support\Facades\Redirect::class,
         // 'Redis' => Illuminate\Support\Facades\Redis::class,
         'Request' => Illuminate\Support\Facades\Request::class,
         'Response' => Illuminate\Support\Facades\Response::class,
         'Route' => Illuminate\Support\Facades\Route::class,
-        'Schema' => Illuminate\Support\Facades\Schema::class,
-        'Session' => Illuminate\Support\Facades\Session::class,
-        'Storage' => Illuminate\Support\Facades\Storage::class,
         'Str' => Illuminate\Support\Str::class,
         'URL' => Illuminate\Support\Facades\URL::class,
         'Validator' => Illuminate\Support\Facades\Validator::class,
-- 
2.28.0

```

There are a few service providers that ideally we'd strip out but are tightly integrated into the framework. For instance, the database and queue service providers are both used by some Artisan commands, and it's not very practical to disable only those commands, so removing them will stop Artisan from working. If you don't mind running the development server manually, you can go ahead and remove these.

Building the application
------------------------

Now, let's set out how our application will work. We will have two routes:

* A route that accepts width and height parameters in the route itself, and responds with a PNG response sized accordingly
* A route that returns a simple HTML homepage

You've no doubt seen various novelty placeholder sites like [placekitten.com](http://placekitten.com/) for use in web projects, and this will be similar to that. We'll use a simple black image with the dimensions in white text, but you should be able to use this as the basis of a more sophisticated placeholder service, such as if you wanted to use branded images for a particular client.

Since the home page will be fairly straightforward, let's do that first. Delete the existing `resources/views/welcome.blade.php` file and save this to `resources/views/home.blade.php`:

```blade.php
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Laravel Placeholder Images</title>
	<link href="{{ mix('css/app.css') }}" rel="stylesheet">
</head>
<body>
    <h1>Laravel Placeholder Images</h1>
    <p>This server can be used for serving placeholder
    images for any web page.</p>
    <p>To request a placeholder image of a given width and height
    simply include an image with the source pointing to
    <b>/image/&lt;width&gt;x&lt;height&gt;/</b>
    on this server such as:</p>
    <pre>
        &lt;img src="{{ $example }}" &gt;
    </pre>
    <h2>Examples</h2>
    <ul>
        <li><img src="{{{ route('placeholder', ['width' => 50, 'height' => 50]) }}}"></li>
        <li><img src="{{{ route('placeholder', ['width' => 100, 'height' => 50]) }}}"></li>
        <li><img src="{{{ route('placeholder', ['width' => 50, 'height' => 100]) }}}"></li>
    </ul>
</body>
</html>
```

Note we're using the `route()` helper to add some example images, even though it's not in place yet. Add this route to your `routes/web.php` as well:

```php
Route::get('/', function () {
    return view('home', [
        'example' => route('placeholder', ['width' => 50, 'height' => 50]),
    ]);
});
```

Again, note that we're using the `route()` helper to get the URL for the placeholder image. Next, we need to create the outline of the route for getting the placeholders:

```php
Route::get('/placeholder/{width}x{height}', function (int $width, int $height) {
})->where(['width' => '[0-9]+', 'height' => '[0-9]+'])
    ->name('placeholder');
```

Due to the limited scope of this application, we won't bother with full controllers, but you can add them if you wish. Note we've specified the name `placeholder` and set a regex to validate the `width` and `height` parameters.

Now let's populate the callback to generate a PNG file.

```php
Route::get('/placeholder/{width}x{height}', function (int $width, int $height) {
    if (!$img = imagecreatetruecolor($width, $height)) {
        abort();
    }
    $textColour = imagecolorallocate($img, 255, 255, 255);
    imagestring($img, 1, 5, 5, "$width X $height", $textColour);
    ob_start();
    imagepng($img);
    $file = ob_get_contents();
    ob_end_clean();
    return response()->make($file, 200, [
        'Content-type' => 'image/png'
    ]);
})->where(['width' => '[0-9]+', 'height' => '[0-9]+'])
    ->name('placeholder');
```

We'll also add some very basic CSS to the provided CSS file:

```css
body {
    text-align: center;
}

ul {
    list-type: none;
}

li {
    display: inline-block;
}
```

Don't forget to build this with `npm install && npm run production` too.

If you now run `php artisan serve` you should be able to see that it works - the homepage renders, and the embedded images are pulled in OK. However, there are three potential issues:

* The images themselves are regenerated each time. Since they never change, it's a no-brainer to cache them indefinitely for the best performance, and if we do need to change them in the future we can just flush the cache to resolve this
* Similarly, we should use ETags to allow the application to tell the browser when the image has changed
* There's no limit on how large images can be, so a malicious user could request a huge image to break the system

Let's tackle these in order. First, let's create some middleware to handle the caching:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

final class CacheImages
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $key = sprintf("%d.%d", $request->width, $request->height);
        return Cache::rememberForever($key, function () use ($next, $request) {
            return $next($request);
        });
    }
}
```

We construct a cache key from the request width and height, and use the `Cache::rememberForever()` method to cache the response. We then register this middleware as route middleware in `app\Http\Kernel.php`:

```php
    protected $routeMiddleware = [
        'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,
        'signed' => \Illuminate\Routing\Middleware\ValidateSignature::class,
        'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'cache.images' => \App\Http\Middleware\CacheImages::class,
    ];
```

And apply it to the image route:

```php
Route::get('/placeholder/{width}x{height}', function (int $width, int $height) {
    if (!$img = imagecreatetruecolor($width, $height)) {
        abort();
    }
    $textColour = imagecolorallocate($img, 255, 255, 255);
    imagestring($img, 1, 5, 5, "$width X $height", $textColour);
    ob_start();
    imagepng($img);
    $file = ob_get_contents();
    ob_end_clean();
    return response()->make($file, 200, [
        'Content-type' => 'image/png'
    ]);
})->where(['width' => '[0-9]+', 'height' => '[0-9]+'])
  ->name('placeholder')
  ->middleware('cache.images');
```

Next, let's set ETags on our images. Laravel comes with the `cache.headers` middleware, which we can easily wrap around our placeholder route:

```php
Route::middleware('cache.headers:public;etag')->group(function () {
    Route::get('/placeholder/{width}x{height}', function (int $width, int $height) {
        if (!$img = imagecreatetruecolor($width, $height)) {
            abort();
        }
        $textColour = imagecolorallocate($img, 255, 255, 255);
        imagestring($img, 1, 5, 5, "$width X $height", $textColour);
        ob_start();
        imagepng($img);
        $file = ob_get_contents();
        ob_end_clean();
        return response()->make($file, 200, [
            'Content-type' => 'image/png'
        ]);
    })->where(['width' => '[0-9]+', 'height' => '[0-9]+'])
      ->name('placeholder')
      ->middleware('cache.images');
});
```

Finally, let's handle the dimensions issue. Again, this is something that is probably best handled in middleware since that way it can be rejected before the point it gets to the route handler. All we need to do is to check to see if the width and height parameters exceed the intended value, and throw an error in the middleware:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

final class ValidateImageDimensions
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        if ($request->width > 2000 || $request->height > 2000) {
            abort(422, 'Height and width cannot exceed 2000 pixels');
        }
        return $next($request);
    }
}
```

Register this middleware in `app/Http/Kernel.php`:

```php
    protected $routeMiddleware = [
        'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,
        'signed' => \Illuminate\Routing\Middleware\ValidateSignature::class,
        'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'cache.images' => \App\Http\Middleware\CacheImages::class,
        'validate.images' => \App\Http\Middleware\ValidateImageDimensions::class,
    ];
```

And apply it to the image route:

```php
Route::middleware('cache.headers:public;etag')->group(function () {
    Route::get('/placeholder/{width}x{height}', function (int $width, int $height) {
        if (!$img = imagecreatetruecolor($width, $height)) {
            abort();
        }
        $textColour = imagecolorallocate($img, 255, 255, 255);
        imagestring($img, 1, 5, 5, "$width X $height", $textColour);
        ob_start();
        imagepng($img);
        $file = ob_get_contents();
        ob_end_clean();
        return response()->make($file, 200, [
            'Content-type' => 'image/png'
        ]);
    })->where(['width' => '[0-9]+', 'height' => '[0-9]+'])
      ->name('placeholder')
      ->middleware(['validate.images', 'cache.images']);
});
```

And we're done! We now have a basic, but functional, stateless Laravel application that's been stripped of a lot of the unnecessary functionality. There are a few further changes that could be made to expand this if necessary, such as:

* Amend the project to allow requesting different image formats using an additional route parameter (hint - you'll want to use something like [Intervention for this](http://image.intervention.io/))
* Serve different images, either by using one as a starting template so they are all branded the same, or specifying one from several options in the URL, such as with [PlaceCage](https://www.placecage.com/)

However, I will leave these as an exercise for the reader. The code for this project is available on [Github](https://github.com/matthewbdaly/lightweight-laravel) if you get stuck at any point.

Hopefully, this article has given you some food for thought about how you can use Laravel for applications you might have previously considered too small to use it for. Don't worry too much about removing something that you need to add later - version control means you can always retrieve it if it turns out you do need it later. I'd also add that potentially the same approach can be applied to other full stack PHP frameworks, though you'll have to do some exploring on your own to determine this.
