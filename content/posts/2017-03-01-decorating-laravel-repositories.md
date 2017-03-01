---
title: "Decorating Laravel repositories"
date: 2017-03-01 23:16:57 +0000
categories:
- php
- laravel
comments: true
---

[As mentioned previously](/blog/2016/11/13/building-a-phonegap-app-with-laravel-and-angular-part-4/), when building any nontrivial Laravel application, it's prudent to decouple our controllers from the Eloquent ORM (or any other ORM or data source we may be using) by creating an interface, and then writing a repository that implements that interface. We can then resolve the interface to our repository, and use the repository to interact with our data source. Should we need to switch to a different implementation, we then need only create the new repository and amend how Laravel resolves that interface.

The same principle applies when it comes to caching. Database queries are typically a major bottleneck in a web application, and so it's prudent to implement some form of caching for your queries. However, it's a bad idea to do so in your controllers, because just as with Eloquent models, you're tying yourself to one particular implementation and won't be able to switch without rewriting a good chunk of your controllers, as well as possibly having to maintain large amounts of duplicate code for when a query is made in several places.

Alternatively, you could implement caching within the methods of your repository, which might make sense for smaller projects. However, it means that your repository is now dependent on both the ORM and cache you chose. If you decide you want to change your ORM but retain the same caching system, or vice versa, you're stuck with writing a new repository to handle both, duplicating work you've already done.

Fortunately, there's a more elegant solution. Using the [decorator pattern](http://designpatternsphp.readthedocs.io/en/latest/Structural/Decorator/README.html), we can create a second repository that implements the same interface and "wraps" the original repository. Each of its methods will call its counterpart in the original, and if appropriate cache the response. That way, our caching is implemented separately from our database interactions, and we can easily create a repository for a new data source without affecting the caching in the slightest.

Say we have the following interface for our `User` model:

```php
<?php

namespace App\Repositories\Interfaces;

interface UserRepositoryInterface {
    public function all();

    public function findOrFail($id);

    public function create($input);
}
```

And the following repository implements that interface:

```php
<?php

namespace App\Repositories;
 
use App\User;
use App\Repositories\Interfaces\UserRepositoryInterface;
use Hash;
 
class EloquentUserRepository implements UserRepositoryInterface {
 
    private $model;

    public function __construct(User $model)
    {
        $this->model = $model;
    }

    public function all()
    {
        return $this->model->all();
    }
 
    public function findOrFail($id)
    {
        return $this->model->findOrFail($id);
    }
 
    public function create($input)
    {
        $user = new $this->model;
        $user->email = $input['email'];
        $user->name = $input['name'];
        $user->password = Hash::make($input['password']);
        $user->save();
        return $user;
    }
}
```

We might implement the following repository class to handle caching:

```php
<?php

namespace App\Repositories\Decorators;
 
use App\Repositories\Interfaces\UserRepositoryInterface;
use Illuminate\Contracts\Cache\Repository as Cache;
 
class CachingUserRepository implements UserRepositoryInterface {
 
    protected $repository;

    protected $cache;

    public function __construct(UserRepositoryInterface $repository, Cache $cache)
    {
        $this->repository = $repository;
        $this->cache = $cache;
    }

    public function all()
    {
        return $this->cache->tags('users')->remember('all', 60, function () {
            return $this->repository->all();
        });
    }
 
    public function findOrFail($id)
    {
        return $this->cache->tags('users')->remember($id, 60, function () use ($id) {
            return $this->repository->findOrFail($id);
        });
    }
 
    public function create($input)
    {
        $this->cache->tags('users')->flush();
        return $this->repository->create($input);
    }
}
```

Note how each method doesn't actually do any querying. Instead, the constructor accepts an implementation of the same interface and the cache, and we defer all interactions with the database to that implementation. Each call that queries the database is wrapped in a callback so that it's stored in Laravel's cache when it's returned, without touching the original implementation. When a user is created, the users tag is flushed from the cache so that stale results don't get served.

To actually use this implementation, we need to update our service provider so that it resolves the interface to an implementation of our decorator:

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
        $this->app->singleton('App\Repositories\Interfaces\UserRepositoryInterface', function () {
            $baseRepo = new \App\Repositories\EloquentUserRepository(new \App\User);
            $cachingRepo = new \App\Repositories\Decorators\CachingUserRepository($baseRepo, $this->app['cache.store']);
            return $cachingRepo;
        });
    }
}
```

We instantiate the base repository, passing it the appropriate model. Then we instantiate the decorator, passing it the base repository and the cache, and return it. Now our controllers will start using the new decorator.

Testing the decorator
---------------------

Now that we have a working decorator, how do we test it? Just as with the decorator itself, we want our tests to be completely decoupled from any particular implementation of the dependencies. If in future we're asked to migrate the database to MongoDB, say, we'll have plenty of work writing our new database repositories, so we don't want to have to rewrite the tests for our decorator as well. Fortunately, using Mockery we can just mock the interface for the repository, and pass that mock into the constructor of the decorator in our test. That way we can have the mock return a known response and not involve either the database repository or the underlying models in any way.

We will also want to mock the cache itself, as this is a unit test and so as far as possible it should not be testing anything outside of the repository class. Here's an example of how we might test the above decorator.

```php
<?php

namespace Tests\Repositories\Decorators;

use Tests\TestCase;
use App\Repositories\Decorators\CachingUserRepository;
use Mockery as m;

class UserTest extends TestCase
{
    /**
     * Test fetching all items
     *
     * @return void
     */
    public function testFetchingAll()
    {
        // Create mock of decorated repository
        $repo = m::mock('App\Repositories\Interfaces\UserRepositoryInterface');
        $repo->shouldReceive('all')->andReturn([]);

        // Create mock of cache
        $cache = m::mock('Illuminate\Contracts\Cache\Repository');
        $cache->shouldReceive('tags')->with('users')->andReturn($cache);
        $cache->shouldReceive('remember')->andReturn([]);
            
        // Instantiate the repository
        $repository = new CachingUserRepository($repo, $cache);

        // Get all
        $items = $repository->all();
        $this->assertCount(0, $items);
    }

    /**
     * Test fetching a single item
     *
     * @return void
     */
    public function testFindOrFail()
    {
        // Create mock of decorated repository
        $repo = m::mock('App\Repositories\Interfaces\UserRepositoryInterface');
        $repo->shouldReceive('findOrFail')->with(1)->andReturn(null);

        // Create mock of cache
        $cache = m::mock('Illuminate\Contracts\Cache\Repository');
        $cache->shouldReceive('tags')->with('users')->andReturn($cache);
        $cache->shouldReceive('remember')->andReturn(null);
        
        // Instantiate the repository
        $repository = new CachingUserRepository($repo, $cache);

        // Get all
        $item = $repository->findOrFail(1);
        $this->assertNull($item);
    }

    /**
     * Test creating a single item
     *
     * @return void
     */
    public function testCreate()
    {
        // Create mock of decorated repository
        $repo = m::mock('App\Repositories\Interfaces\UserRepositoryInterface');
        $repo->shouldReceive('create')->with(['email' => 'bob@example.com'])->andReturn(true);

        // Create mock of cache
        $cache = m::mock('Illuminate\Contracts\Cache\Repository');
        $cache->shouldReceive('tags')->with('usersUser')->andReturn($cache);
        $cache->shouldReceive('flush')->andReturn(true);
        
        // Instantiate the repository
        $repository = new CachingUserRepository($repo, $cache);

        // Get all
        $item = $repository->create(['email' => 'bob@example.com']);
        $this->assertTrue($item);
    }

    public function tearDown()
    {
        m::close();
        parent::tearDown();
    }
}
```

As you can see, all we care about is that the underlying repository interface receives the correct method calls and arguments, nothing more. That way our test is fast and repository-agnositc.

Other applications
------------------

Here I've used this technique to cache the queries, but that's not the only use case for decorating a repository. For instance, you could decorate a repository to fire events when certain methods are called, and write different decorators when reusing these repositories for different applications. You could create one to log interactions with the repository, or you could use an external library to cache your quaries, all without touching your existing repository. Should we need to switch back to our base repository, it's just a matter of amending the service provider accordingly as both the decorator and the repository implement the same interface.

Creating decorators does mean you have to implement all of the interface's methods again, but if you have a base repository that your other ones inherit from, you can easily create a base decorator in a similar fashion that wraps methods common to all the repositories, and then just implement the additional methods for each decorator as required. Also, each method is likely to be fairly limited in scope so it's not generally too onerous.
