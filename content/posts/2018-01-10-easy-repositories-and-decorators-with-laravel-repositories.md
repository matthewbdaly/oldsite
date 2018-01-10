---
title: "Easy repositories and decorators with Laravel Repositories"
date: 2018-01-10 12:22:44 +0000
categories:
- php
- laravel
comments: true
---

Creating repositories for your Laravel models, as well as creating caching decorators for them, is a useful way of not only implementing caching in your web app, but decoupling the application from a specific ORM. Unfortunately, it can involve writing a fair amount of boilerplate code.

[Laravel Repositories](https://github.com/matthewbdaly/laravel-repositories) is a set of base classes and interfaces for creating repositories and decorators in your application. It consists of:

* A generic interface for repositories
* A base repository that implements the interface and can be extended for your own repositories
* A base decorator that also implements the interface and can similarly be extended

By using these, not only are you able to implement caching quickly and easily for most use cases, but you can easily extend the base classes to add additional methods for your use case. By creating new interfaces that extend the base interface, then having your repositories extend the repository and decorator, you can minimise the amount of work required to set up new repositories.

The main interface used is `Matthewbdaly\LaravelRepositories\Repositories\Interfaces\AbstractRepositoryInterface`, and your interfaces should extend this. Your decorators should extend `Matthewbdaly\LaravelRepositories\Repositories\Decorators\BaseDecorator`, and your repositories should extend `Matthewbdaly\LaravelRepositories\Repositories\Base`. Then, if you add any additional methods to your interface and ensure your repository and decorator implement that interface, it should be straightforward to type-hint the interface and get back the decorated repository, which will handle caching for you.

To be able to type-hint the repositories, you need to set them up in a service provider:

```php
<?php

namespace App\Providers;

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
        //
    }

    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        $this->app->singleton('App\Repositories\Interfaces\ExampleRepositoryInterface', function () {
            $baseRepo = new \App\Repositories\EloquentExampleRepository(new \App\Example);
            $cachingRepo = new \App\Repositories\Decorators\ExampleDecorator($baseRepo, $this->app['cache.store']);
            return $cachingRepo;
        });
    }
}
```

Also, note that the cache backend used must be one that supports tags, such as Redis or Memcached. Data is cached using a tag derived from the model name. This also means you have to be careful when eager-loading relations, as the data will be cached under the main model's name, not that of the relation. You may want to set up separate model events to flush those tags when the related field is updated.
