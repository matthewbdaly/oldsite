---
title: "Rendering different views for mobile and desktop clients in Laravel"
date: 2018-04-22 22:50:10 +0000
categories:
- php
- laravel
comments: true
---

This was a bit of a weird post to write. It started out explaining how I resolved an issue years ago on a CodeIgniter site, but amended to work for Laravel. In the process, I realised it made sense to implement it as middleware, and I ended up pulling it out into [a package](https://github.com/matthewbdaly/laravel-dynamic-serving). However, it's still useful to understand the concept behind it, even if you prefer to just install the complete package, because your needs might be slightly different to mine.

On web development forums, it's quite common to see variants of the following question:

> How do I redirect a user on a mobile device to a mobile version of the site?

It's quite surprising that this is still an issue that crops up. For many years, it's been widely accepted that the correct solution for this problem is responsive design. However, there are ways in which this may not be adequate for certain applications. For instance, you may have an application where certain functionality only makes sense in a certain context, or your user interface may need to be optimised for specific environments.

The trouble is that a dedicated mobile site isn't a good idea either. Among other things, it means that users can't easily use the same bookmarks between desktop and mobile versions, and can result in at least some of the server-side logic being duplicated.

Fortunately, there is another way - [dynamic serving](https://developers.google.com/search/mobile-sites/mobile-seo/dynamic-serving) allows you to render different content based on the user agent. You can also easily enable users to switch between desktop and mobile versions themselves if their client isn't detected correctly or they just prefer the other one. I've implemented this years ago for a CodeIgniter site. Here's how you might implement it in Laravel, although if you understand the principle behind it, it should be easy to adapt for any other framework.

Don't try to implement mobile user agent detection yourself. Instead, find an implementation that's actively maintained and install it with Composer. That way you can be reasonably sure that as new mobile devices come onto the market the package will detect them correctly as long as you keep it up to date. I would be inclined to go for [Agent](https://github.com/jenssegers/agent), since it has Laravel support baked in.

We could just use Agent to serve up different content based on the user agent. However, user agent strings are notoriously unreliable - if a new mobile device appears and it doesn't show up correctly in Agent, users could find themselves forced to use the wrong UI. Instead, we need to check for a flag in the session that indicates if the session is mobile or not. If it's not set, we set it based on the user agent. That way, if you need to offer functionality to override the detected session type, you can just update that session variable to correct that elsewhere in the application. I would be inclined to use a button in the footer that makes an AJAX request to toggle the flag, then reloads the page.

You also need to set the HTTP response header `Vary: User-Agent` to notify clients (including not only search engines, but also proxies at either end of the connection, such as Varnish or Squid) that the response will differ by user agent, in order to prevent users being served the wrong version.

Middleware is the obvious place to do this. Here's a middleware that sets the session variable and the appropriate response headers:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Jenssegers\Agent\Agent;
use Illuminate\Contracts\Session\Session;

class DetectMobile
{
    protected $agent;

    protected $session;

    public function __construct(Agent $agent, Session $session)
    {
        $this->agent = $agent;
        $this->session = $session;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        if (!$this->session->exists('mobile')) {
            if ($this->agent->isMobile() || $this->agent->isTablet()) {
                $this->session->put('mobile', true);
            } else {
                $this->session->put('mobile', false);
            }
        }
        $response = $next($request);
        return $response->setVary('User-Agent');
    }
}
```

Now, you could then work with the session directly to retrieve the `mobile` flag, but as you may be working in the view, it makes sense to create helpers for this:

```php
<?php

if (!function_exists('is_mobile')) {
    function is_mobile()
    {
        $session = app()->make('Illuminate\Contracts\Session\Session');
        return $session->get('mobile') == true;
    }
}

if (!function_exists('is_desktop')) {
    function is_desktop()
    {
        $session = app()->make('Illuminate\Contracts\Session\Session');
        return $session->get('mobile') == false;
    }
}
```

Now, if you want to serve up completely different views, you can use these helpers in your controllers. If you instead want to selectively show and hide parts of the UI based on the user agent, you can instead use these in the views to determine what parts of the page should be shown.

Agent offers more functionality than just detecting if a user agent is a mobile or desktop device, and you may find this useful as a starting point for developing middleware for detecting bots, or showing different content to users based on their device type or operating system. If you just need to detect if a user is a mobile or desktop client, this middleware should be sufficient.
