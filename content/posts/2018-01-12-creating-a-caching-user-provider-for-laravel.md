---
title: "Creating a caching user provider for Laravel"
date: 2018-01-12 13:16:51 +0000
categories:
- php
- laravel
- caching
comments: true
---

EDIT: I no longer recommend this approach - please refer [here](https://matthewdaly.co.uk/blog/2020/03/11/caching-the-laravel-user-provider-with-a-decorator/) for an alternative approach to this.

If you have a Laravel application that requires users to log in and you use Clockwork or Laravel DebugBar to examine the queries that take place, you'll probably notice a query that fetches the user model occurs quite a lot. This is because the user's ID gets stored in the session, and is then used to retrieve the model.

This query is a good candidate for caching because not only is that query being made often, but it's also not something that changes all that often. If you're careful, it's quite easy to set your application up to cache the user without having to worry about invalidating the cache.

Laravel allows you to define your own user providers in order to fetch the user's details. These must implement `Illuminate\Contracts\Auth\UserProvider` and must return a user model from the identifier provided. Out of the box it comes with two implementations, `Illuminate\Auth\EloquentUserProvider` and `Illuminate\Auth\DatabaseUserProvider`, with the former being the default. Our caching user provider can extend the Eloquent one as follows:

```php
<?php

namespace App\Auth;

use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Cache\Repository;
use Illuminate\Contracts\Hashing\Hasher as HasherContract;

class CachingUserProvider extends EloquentUserProvider
{
    /**
     * The cache instance.
     *
     * @var Repository
     */
    protected $cache;

    /**
     * Create a new database user provider.
     *
     * @param  \Illuminate\Contracts\Hashing\Hasher  $hasher
     * @param  string  $model
     * @param  Repository  $cache
     * @return void
     */
    public function __construct(HasherContract $hasher, $model, Repository $cache)
    {
        $this->model = $model;
        $this->hasher = $hasher;
        $this->cache = $cache;
    }

    /**
     * Retrieve a user by their unique identifier.
     *
     * @param  mixed  $identifier
     * @return \Illuminate\Contracts\Auth\Authenticatable|null
     */
    public function retrieveById($identifier)
    {
        return $this->cache->tags($this->getModel())->remember('user_by_id_'.$identifier, 60, function () use ($identifier) {
            return parent::retrieveById($identifier);
        });
    }
}
```

Note that we override the constructor to accept a cache instance as well as the other arguments. We also override the `retrieveById()` method to wrap a call to the parent's implementation inside a callback that caches the response. I usually tag anything I cache with the model name, but if you need to use a cache backend that doesn't support tagging this may not be an option. Our cache key also includes the identifier so that it's unique to that user.

We then need to add our user provider to the auth service provider:

```php
<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use App\Auth\CachingUserProvider;
use Illuminate\Support\Facades\Auth;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * Register any authentication / authorization services.
     *
     * @return void
     */
    public function boot()
    {
        $this->registerPolicies();

        Auth::provider('caching', function ($app, array $config) {
            return new CachingUserProvider(
                $app->make('Illuminate\Contracts\Hashing\Hasher'),
                $config['model'],
                $app->make('Illuminate\Contracts\Cache\Repository')
            );
        });
    }
}
```

Note here that we call this provider `caching`, and we pass it the hasher, the model name, and an instance of the cache. Then, we need to update `config/auth.php` to use this provider:

```php
    'providers' => [
        'users' => [
            'driver' => 'caching',
            'model' => App\Eloquent\Models\User::class,
        ],
    ],
```

The only issue now is that our user models will continue to be cached, even when they are updated. To be able to flush the cache, we can create a model event that fires whenever the user model is updated:

```php
<?php

namespace App\Eloquent\Models;

use Illuminate\Notifications\Notifiable;
use Illuminate\Foundation\Auth\User as Authenticatable;
use App\Events\UserAmended;

class User extends Authenticatable
{
    use Notifiable;

    protected $dispatchesEvents = [
        'saved' => UserAmended::class,
        'deleted' => UserAmended::class,
        'restored' => UserAmended::class,
    ];
}
```

This will call the `UserAmended` event when a user model is created, updated, deleted or restored. Then we can define that event:

```php
<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Queue\SerializesModels;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use App\Eloquent\Models\User;

class UserAmended
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     *
     * @return void
     */
    public function __construct(User $model)
    {
        $this->model = $model;
    }
}
```

Note our event contains an instance of the user model. Then we set up a listener to do the work of clearing the cache:

```php
<?php

namespace App\Listeners;

use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use App\Events\UserAmended;
use Illuminate\Contracts\Cache\Repository;

class ClearUserId
{
    /**
     * Create the event listener.
     *
     * @return void
     */
    public function __construct(Repository $cache)
    {
        $this->cache = $cache;
    }

    /**
     * Handle the event.
     *
     * @param  object  $event
     * @return void
     */
    public function handle(UserAmended $event)
    {
        $this->cache->tags(get_class($event->model))->forget('user_by_id_'.$event->model->id);
    }
}
```

Here, we get the user model's class again, and clear the cache entry for that user model.

Finally, we hook up the event and listener in the event service provider:

```php
<?php

namespace App\Providers;

use Illuminate\Support\Facades\Event;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event listener mappings for the application.
     *
     * @var array
     */
    protected $listen = [
        'App\Events\UserAmended' => [
            'App\Listeners\ClearUserId',
        ],
    ];

    /**
     * Register any events for your application.
     *
     * @return void
     */
    public function boot()
    {
        parent::boot();

        //
    }
}
```

With that done, our user should be cached after the first load, and flushed when the model is amended.

Handling eager-loaded data
--------------------------

It may be that you're pulling in additional data from the user model in your application, such as roles, permissions, or a separate profile model. Under those circumstances it makes sense to treat that data in the same way by eager-loading it along with your user model.

```php
<?php

namespace App\Auth;

use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Cache\Repository;
use Illuminate\Contracts\Hashing\Hasher as HasherContract;

class CachingUserProvider extends EloquentUserProvider
{
    /**
     * The cache instance.
     *
     * @var Repository
     */
    protected $cache;

    /**
     * Create a new database user provider.
     *
     * @param  \Illuminate\Contracts\Hashing\Hasher  $hasher
     * @param  string  $model
     * @param  Repository  $cache
     * @return void
     */
    public function __construct(HasherContract $hasher, $model, Repository $cache)
    {
        $this->model = $model;
        $this->hasher = $hasher;
        $this->cache = $cache;
    }

    /**
     * Retrieve a user by their unique identifier.
     *
     * @param  mixed  $identifier
     * @return \Illuminate\Contracts\Auth\Authenticatable|null
     */
    public function retrieveById($identifier)
    {
        return $this->cache->tags($this->getModel())->remember('user_by_id_'.$identifier, 60, function () use ($identifier) {
          $model = $this->createModel();
          return $model->newQuery()
            ->with('roles', 'permissions', 'profile')
            ->where($model->getAuthIdentifierName(), $identifier)
            ->first();
        });
    }
}
```

Because we need to amend the query itself, we can't just defer to the parent implementation like we did above and must instead copy it over and amend it to eager-load the data.

You'll also need to set up model events to clear the cache whenever one of the related fields is updated, but it should be fairly straightforward to do so.

Summary
-------

Fetching a user model (and possibly some relations) on every page load while logged in can be a bit much, and it makes sense to cache as much as you can without risking serving stale data. Using this technique you can potentially cache a lot of repetitive, unnecessary queries and make your application faster.

This technique will also work in cases where you're using other methods of maintaining user state, such as JWT, as long as you're making use of a guard for authentication purposes, since all of these guards will still be using the same user provider. In fact, I first used this technique on a REST API that used JWT for authentication, and it's worked well in that case.
