---
title: "Building a Phonegap App with Laravel and Angular - Part 4"
date: 2016-11-03 21:02:43 +0000
categories:
- php
- laravel
- javascript
- angular
- phonegap
- laravel-phonegap-tutorial
comments: true
---

In this instalment we'll return to the back end. What we've done so far is typical of the kind of proof of concept we might do for a client early on, before going back and implementing the full set of features later on. Now we'll go back and improve on that rather quick-and-dirty API.

For those of you who want to follow the Laravel Phonegap tutorials, I've created a dedicated category [here](/blog/categories/laravel-phonegap-tutorial/) for those tutorials. This category include RSS and Atom feeds, so if you only want to read those posts, you can do so. I've also done the same for the [Django tutorials](/blog/categories/django-blog-tutorial/).

The Repository pattern
----------------------

One of the issues we currently have with our API is that we're passing our models into our controllers. This may not seem like a huge issue, but it means that our controllers are tightly coupled to the Eloquent ORM, so if we wanted to switch to another ORM, or to a completely different database such as MongoDB, we'd have to amend our controllers. That's not good.

However, using the [Repository pattern](http://designpatternsphp.readthedocs.io/en/latest/More/Repository/README.html) we can first of all define an interface for our repository, and then create a repository class that implements that interface. That way we can interact with the repository class in our controllers, rather than using Eloquent models directly. Then, if we want to switch databases, we merely amend the repository class to change the implementation of those methods, without having to touch our controllers. Also, it makes it much easier to test our controllers in isolation, because we can easily mock our repository class using Mockery and hard-code the response, so our tests won't touch the database and will therefore run more quickly. Functional tests that test the whole application have a place, but unit tests should be what we run the most, and these should test one thing in isolation, making them extremely fast.

If you haven't used interfaces before in PHP, they aren't that hard. They merely specify what methods an object implementing that method must have and what arguments they must accept, but do not specify the details of the implementation. This makes it easy to determine if a class implements an interface correctly, because it will throw an exception if it doesn't.

```php
<?php

namespace AnimalFriend\Repositories\Interfaces;

interface PetRepositoryInterface {
    public function all();

    public function findOrFail($id);

    public function create($input);
}
```

That's all there is to it. We define it using the `interface` keyword and we specify the methods it must implement. Save this file at `app/Repositories/Interfaces/PetRepositoryInterface.php`.

Next, we implement the repository class:

```php
<?php

namespace AnimalFriend\Repositories;
 
use AnimalFriend\Pet;
use AnimalFriend\Repositories\Interfaces\PetRepositoryInterface;
 
class EloquentPetRepository implements PetRepositoryInterface {
 
    private $pet;

    public function __construct(Pet $pet)
    {
        $this->pet = $pet;
    }

    public function all()
    {
        return $this->pet->all();
    }
 
    public function findOrFail($id)
    {
        return $this->pet->findOrFail($id);
    }
 
    public function create($input)
    {
        return $this->pet->create($input);
    }
}
```

Save this to `app/Repositories/EloquentPetRepository.php`. Note how the methods closely mirror the underlying Eloquent methods, but they don't need to - you could change the underlying implementation of each method, but the repository would still work in exactly the same way.

To make this work, we need to make a few changes elsewhere. In `composer.json`, we need to add the new `Repositories` folder to our classmap:

```json
    "autoload": {
        "classmap": [
            "database",
            "app/Repositories"
        ],
        "psr-4": {
            "AnimalFriend\\": "app/"
        }
    },
```

And in `app/Providers/AppServiceProvider.php`, we need to bind our new files:

```php
<?php

namespace AnimalFriend\Providers;

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
        $this->app->bind(
            'AnimalFriend\Repositories\Interfaces\PetRepositoryInterface',
            'AnimalFriend\Repositories\EloquentPetRepository'
        );
    }
}
```

With that done, we can now update `app/Http/Controllers/PetController.php` to use the repository:

```php
<?php

namespace AnimalFriend\Http\Controllers;

use Illuminate\Http\Request;

use AnimalFriend\Http\Requests;
use AnimalFriend\Repositories\Interfaces\PetRepositoryInterface as Pet;

class PetController extends Controller
{
    private $pet;

    public function __construct(Pet $pet) {
        $this->pet = $pet;
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        // Get all pets
        $pets = $this->pet->all();

        // Send response
        return response()->json($pets, 200);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        // Get pet
        $pet = $this->pet->findOrFail($id);

        // Send response
        return response()->json($pet, 200);
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }
}
```

Our repository is now injected automatically into the controller. To make this work we need to run the following command:

```bash
$ composer dump-autoload
```

Running our tests should confirm that everything is still working:

```bash
$ vendor/bin/phpunit
PHPUnit 5.5.4 by Sebastian Bergmann and contributors.
............                                                      12 / 12 (100%)

Time: 897 ms, Memory: 18.00MB

OK (12 tests, 46 assertions)
```

Let's do the same for the User model. First we implement our interface in `app/Repositories/Interfaces/UserRepositoryInterface.php`:

```php
<?php

namespace AnimalFriend\Repositories\Interfaces;

interface UserRepositoryInterface {
    public function all();

    public function findOrFail($id);

    public function create($input);
}
```

Next we create our repository at `app/Repositories/EloquentUserRepository.php`:

```php
<?php

namespace AnimalFriend\Repositories;
 
use AnimalFriend\User;
use AnimalFriend\Repositories\Interfaces\UserRepositoryInterface;
use JWTAuth;
use Hash;
 
class EloquentUserRepository implements UserRepositoryInterface {
 
    private $user;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function all()
    {
        return $this->user->all();
    }
 
    public function findOrFail($id)
    {
        return $this->user->findOrFail($id);
    }
 
    public function create($input)
    {
        $user = new $this->user;
        $user->email = $input['email'];
        $user->name = $input['name'];
        $user->password = Hash::make($input['password']);
        $user->save();

        // Create token
        return JWTAuth::fromUser($user);
    }
}
```

Note how we've moved much of the logic for creating a user into the `create()` method, and we return the token, not the user model. This makes sense as right now we only ever want to get a token back when we create a user. Later that may change, but there's nothing stopping us adding a new method to implement that behaviour alongside this.

Then we update `app/Http/Controllers/UserController.php` to use our repository:

```php
<?php

namespace AnimalFriend\Http\Controllers;

use Illuminate\Http\Request;

use AnimalFriend\Http\Requests;
use AnimalFriend\Repositories\Interfaces\UserRepositoryInterface as User;
use JWTAuth;
use Hash;

class UserController extends Controller
{
    private $user;

    public function __construct(User $user) {
        $this->user = $user;
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        // Validate request
        $valid = $this->validate($request, [
            'email' => 'required|email|unique:users,email',
            'name' => 'required|string',
            'password' => 'required|confirmed'
        ]);

        // Create token
        $token = $this->user->create($request->only(
            'email',
            'name',
            'password'
        ));

        // Send response
        return response()->json(['token' => $token], 201);
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }
}

And add a new binding in app/Providers/AppServiceProvider.php`:

```php
<?php

namespace AnimalFriend\Providers;

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
        $this->app->bind(
            'AnimalFriend\Repositories\Interfaces\PetRepositoryInterface',
            'AnimalFriend\Repositories\EloquentPetRepository'
        );
        $this->app->bind(
            'AnimalFriend\Repositories\Interfaces\UserRepositoryInterface',
            'AnimalFriend\Repositories\EloquentUserRepository'
        );
    }
}
```

Note that we bind the two sets separately - this allows Laravel to figure out which one maps to which.

Let's run our tests to make sure nothing is broken:

```bash
$ vendor/bin/phpunit 
PHPUnit 5.5.4 by Sebastian Bergmann and contributors.

............                                                      12 / 12 (100%)

Time: 956 ms, Memory: 18.00MB

OK (12 tests, 46 assertions)
```

Now that we've got our repositories in place, we're no longer tightly coupled to Eloquent, and have a more flexible implementation which is easier to test. Speaking of which...

Refactoring our tests
---------------------


Separating our models from our JSON with Fractal
------------------------------------------------

Another problem with our API is that our representation of our data is tightly coupled to our underlying implementation of our models. We therefore can't change our models without potentially changing the data returned by the API. We need to separate our representation of our data from our actual model so that we can more easily specify the exact data we want to return, regardless of the underlying database structure.

Enter [Fractal](http://fractal.thephpleague.com/). This PHP library works as a "view" layer for API responses. It lets you specify the format your data will take in one place so that it's easier to return that data in a desired format.
