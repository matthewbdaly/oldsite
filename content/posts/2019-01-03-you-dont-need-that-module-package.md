---
title: "You don't need that module package"
date: 2019-01-03 23:55:49 +0000
categories:
- php
- composer
comments: true
---

Lately I've seen a number of Laravel packages being posted on places like Reddit that offer ways to make your project more modular by letting you break their classes out of the usual structure and place them in a separate folder called something like `packages/` or `modules/`. However, these packages are completely redundant, and it requires very little work to achieve the same thing with Composer alone. In addition, much of it is not specific to Laravel and can also be applied to any other framework that uses Composer.

There are two main approaches I'm aware of - keeping it in a single project, and moving the modules to separate Composer packages.

Single project
==============

Suppose we have a brand new Laravel project with the namespace left as the default `App`. This is what the `autoload` section of the `composer.json` file will look like:

```json
    "autoload": {
        "psr-4": {
            "App\\": "app/"
        },
        "classmap": [
            "database/seeds",
            "database/factories"
        ]
    },
```

Composer allows for numerous ways to autoload classes and you can add additional namespaces as you wish. Probably the best approach is to use PSR-4 autoloading, as in this example:

```json
    "autoload": {
        "psr-4": {
            "App\\": "app/",
            "Packages\\": "packages"
        },
        "classmap": [
            "database/seeds",
            "database/factories"
        ]
    },
```

Now, if you put the model `Post.php` in the folder, `packages/Blog/Models/`, then this will map to the namespace `Packages\Blog\Models\Post`, and if you set the namespace to this in the file, and run `composer dump-autoload`, you should be able to import it from that namespace without trouble. As with the `App\` namespace, because it's using PSR-4 you're only specifying the top-level namespace and the folders and files underneath have to mirror the namespace, so for instance, `Packages\Foo\Bar` maps to `packages/Foo/Bar.php`. If for some reason PSR-4 autoloading doesn't map well to what you want to do, then there are other methods you can use - refer to the [relevant section of the Composer documentation](https://getcomposer.org/doc/04-schema.md#autoload) for the other methods available.

The controllers are the toughest part, because by default Laravel's routing works on the assumption that the controllers are all under the `App\Http\Controllers` namespace, so you can shorten the namespace used. There are two ways around this I'm aware of. One is to specify the full namespace when referencing each controller:

```php
Route::get('/', '\App\Modules\Http\Controllers\FooController@index');
```

The other option is to update the `RouteServiceProvider.php`'s namespace property. It defaults to this:

```php
protected $namespace = 'App\Http\Controllers';
```

If there's a more convenient namespace you want to place all your controllers under, then you can replace this, and it will become the default namespace applied in your route files.

Other application components such as migrations, routes and views can be loaded from a service provider very easily. Just create a service provider for your module, register it in `config/app.php`, and set up the `boot()` method to load whichever components you want from the appropriate place, as in this example:

```php
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
        $this->loadRoutesFrom(__DIR__.'/../routes.php');
        $this->loadViewsFrom(__DIR__.'/../views', 'comments');
```

Separate packages
=================

The above approach works particularly well in the initial stages of a project, when you may need to jump around a lot to edit different parts of the project. However, later on, once many parts of the project have stabilised, it may make more sense to pull the modules out into separate repositories and use Composer to pull them in as dependencies, using its support for private repositories. I've also often taken this approach right from the start without issue.

This approach has a number of advantages. It makes it easier to reuse parts of the project in other projects if need be. Also, if you put your tests in the packages containing the components they test, it means that rather than running one monolithic test suite for the whole project, you can instead run each module's tests each time you change it, and limit the test suite of the main project to those integration and acceptance tests that verify the whole thing, along with any unit tests for code that remains in the main repository, resulting in quicker test runs.

Don't get me wrong, making your code more modular is definitely a good thing and I'm wholly in favour of it. However, it only takes a little knowledge of Composer to be able to achieve this without any third party package at all, which is good because you're no longer dependent on a package that may at any time fall behind the curve or be abandoned.
