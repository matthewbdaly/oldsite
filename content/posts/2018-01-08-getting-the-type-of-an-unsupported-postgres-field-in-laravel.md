---
title: "Getting the type of an unsupported Postgres field in Laravel"
date: 2018-01-08 14:00:15 +0000
categories:
- php
- laravel
- postgresql
comments: true
---

Today I've been working on a generic, reusable Laravel admin interface, loosely inspired by the Django admin, that dynamically picks up the field types and generates an appropriate input field accordingly.

One problem I've run into is that getting a representation of a database table's fields relies on `doctrine/dbal`, and its support for the more unusual PostgreSQL field types is spotty at best. I've been testing it out on a Laravel-based blogging engine, which has full-text search using the `TSVECTOR` field type, which isn't supported, and it threw a nasty `Unknown database type tsvector requested` error.

Fortunately, it's possible to register custom field type mappings easily enough. In this case we can safely treat a `TSVECTOR` field as a string` type anyway, so we can map it to the string type. We can do so in the boot method of a service provider:

```php
<?php

namespace LaravelBlog\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        // Register the TSVECTOR column
        $conn = $this->app->make('Illuminate\Database\ConnectionInterface');
        $conn->getDoctrineSchemaManager()
            ->getDatabasePlatform()
            ->registerDoctrineTypeMapping('tsvector', 'string');
    }

    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
       //
    }
}
```

We register a Doctrine type mapping that maps the `tsvector` type to a string. Now Doctrine will just treat it as a string.
