---
layout: post
title: "Running the PHP development server with Laravel"
date: 2012-12-15 00:26
comments: true
categories: 
- PHP
- Laravel
- webdevelopment
---

One thing that I've really never liked about PHP is the requirement to install a full-blown web server, so I was pleased when PHP 5.4 shipped with a built-in development server. However, it seems like no PHP framework has yet embraced this to the extent that their counterparts for languages like Python have.

I've recently decided that CodeIgniter is no longer fulfilling what I need from my main go-to PHP framework, and I've been looking at Laravel as a likely replacement. It occurred to me that I could create an Artisan task to run the development server quite easily, and after a little tinkering, I put this together, which worked well:

```php
<?php

class Runserver_Task {

    public function run($arguments)
    {   
        $port = !isset($arguments[0]) ? 8000: $arguments[0];
        echo 'Running PHP development server on port '.$port.'...';
        passthru('php -S localhost:'.$port.' -t '.getcwd().'/public');
    }   
}
?>
```

Once this is in place, you can just run `php artisan runserver` to run the development server, and hit <kbd>Ctrl-C</kbd> to stop it, giving you an experience much like that with Django. Note this requires PHP 5.4 or greater. You also have the option of specifying a different port eg `php artisan runserver 7000` for port 7000.
