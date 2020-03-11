---
title: "Caching the Laravel user provider with a decorator"
date: 2020-03-11 21:20:14 +0000
categories:
- php
- laravel
comments: true
---

A couple of years ago I posted [this article](https://matthewdaly.co.uk/blog/2018/01/12/creating-a-caching-user-provider-for-laravel/) about constructing a caching user provider for Laravel. It worked, but with the benefit of hindsight I can now see that there were a number of issues with this solution:

* Because it extended the existing Eloquent user provider, it was dependent on the internals of that remaining largely the same - any change in how that worked could potentially break it
* For the same reason, if you wanted to switch to a different user provider, you'd need to add the same functionality to that provider, either by writing a new provider from scratch or extending an existing one

I've used the decorator pattern a few times in the past, and it's a good fit for situations like this where you want to add functionality to something that implements an interface. It allows you to separate out one part of the functionality (in this case, caching) into its own layer, so it's not dependent on any one implementation and can wrap any other implementation of that same interface you wish. Also, as long as the interface remains the same, there likely won't be any need to change it when the implementation that is wrapped changes. Here I'll demonstrate how to create a decorator to wrap the existing user providers.

If we only want to cache the `retrieveById()` method, like the previous implementation, the decorator class might look something like this:

```php
<?php

namespace App\Auth;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\UserProvider;
use Illuminate\Contracts\Cache\Repository;

final class UserProviderDecorator implements UserProvider
{
    /**
     * @var UserProvider
     */
    private $provider;

    /**
     * @var Repository
     */
    private $cache;

    public function __construct(UserProvider $provider, Repository $cache)
    {
        $this->provider = $provider;
        $this->cache = $cache;
    }

    /**
     * {@inheritDoc}
     */
    public function retrieveById($identifier)
    {
        return $this->cache->remember('id-' . $identifier, 60, function () use ($identifier) {
            return $this->provider->retrieveById($identifier);
        });
    }

    /**
     * {@inheritDoc}
     */
    public function retrieveByToken($identifier, $token)
    {
        return $this->provider->retrieveById($identifier, $token);
    }

    /**
     * {@inheritDoc}
     */
    public function updateRememberToken(Authenticatable $user, $token)
    {
        return $this->provider->updateRememberToken($user, $token);
    }

    /**
     * {@inheritDoc}
     */
    public function retrieveByCredentials(array $credentials)
    {
        return $this->provider->retrieveByCredentials($credentials);
    }

    /**
     * {@inheritDoc}
     */
    public function validateCredentials(Authenticatable $user, array $credentials)
    {
        return $this->provider->validateCredentials($user, $credentials);
    }
}
```

It implements the same interface as the user providers, but accepts two arguments in the constructor, which are injected and stored as properties:

* Another instance of `Illuminate\Contracts\Auth\UserProvider`
* An instance of the cache repository `Illuminate\Contracts\Cache\Repository`

Most of the methods just defer to their counterparts on the wrapped instance - in this example I have cached the response to `retrieveById()` only, but you can add caching to the other methods easily enough if need be. You do of course still need to flush the cache at appropriate times, which is out of scope for this example, but can be handled by model events as appropriate, as described in the prior article.

Then you add the new decorator as a custom user provider, but crucially, you need to first resolve the provider you're going to use, then wrap it in the decorator:

```php
<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Contracts\Auth\UserProvider;
use Auth;
use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Cache\Repository;
use App\Auth\UserProviderDecorator;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array
     */
    protected $policies = [
        'App\Model' => 'App\Policies\ModelPolicy',
    ];

    /**
     * Register any authentication / authorization services.
     *
     * @return void
     */
    public function boot()
    {
        $this->registerPolicies();

        Auth::provider('cached', function ($app, array $config) {
            $provider = new EloquentUserProvider($app['hash'], $config['model']);
            $cache = $app->make(Repository::class);
            return new UserProviderDecorator($provider, $cache);
        });
    }
}
```

Finally, set up the config to use the caching provider:

```php
    'providers' => [
        'users' => [
            'driver' => 'cached',
            'model' => App\Eloquent\Models\User::class,
        ],
    ],
```

This is pretty rough and ready, and could possibly be improved upon by allowing you to specify a particular provider to wrap in the config, as well as caching more of the methods, but it demonstrates the principle effectively.

By wrapping the existing providers, you can change the behaviour of the user provider without touching the existing implementation, which is in line with the idea of composition over inheritance. Arguably it's more complex, but it's also more flexible - if need be you can swap out the wrapped user provider easily, and still retain the same caching functionality.
