---
title: "Creating Laravel Helpers"
date: 2018-01-09 17:26:26 +0000
categories:
- php
- laravel
comments: true
---

Although helpers are an important part of Laravel, the documentation doesn't really touch on creating them. Fortunately, doing so it fairly easy.

Here I'm building a helper for formatting dates for the HTML5 `datetime-local` form input. First we define the helper function in `app\Helpers.php`:

```php
<?php

use Carbon\Carbon;

if (!function_exists('format_date')) {
    function format_date(string $date)
    {
        return Carbon::parse($date, config('app.timezone'))->format('Y-m-d\TH:i:s');
    }
}
```

Then we create a service provider to load them:

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class HelperServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @return void
     */
    public function boot()
    {
        //
    }

    /**
     * Register the application services.
     *
     * @return void
     */
    public function register()
    {
        //
        require_once app_path() . '/Helpers.php';
    }
}
```

Finally,we register the service provider in `config/app.php`:

```php
    'providers' => [

       ...
        App\Providers\HelperServiceProvider::class,
   ],
```

Of course, once you have this all set up for one helper, it's easy to add more because they can all go in `app/Helpers.php`.

Creating your own helpers is a good way of refactoring unwanted logic out of your Blade templates or controllers and making it more reusable and maintainable, particularly for things like formatting dates or strings.
