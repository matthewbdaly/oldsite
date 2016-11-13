---
title: "Building a Phonegap App with Laravel and Angular - Part 4"
date: 2016-11-13 16:15:00 +0000
categories:
- php
- laravel
- javascript
- angular
- phonegap
- laravel-phonegap-tutorial
comments: true
---

In this instalment we'll return to the back end. What we've done so far is typical of the kind of proof of concept we might do for a client early on, before going back and implementing the full set of features later on. Now we'll go back and start to improve on that rather quick-and-dirty API by making sure we follow a few best practices.

For those of you who want to follow the Laravel Phonegap tutorials, I've created a dedicated category [here](/blog/categories/laravel-phonegap-tutorial/) for those tutorials. This category include RSS and Atom feeds, so if you only want to read those posts, you can do so. I've also done the same for the [Django tutorials](/blog/categories/django-blog-tutorial/).

The Repository pattern
----------------------

One of the issues we currently have with our API is that we're passing our Eloquent models into our controllers. This may not seem like a huge issue, but it means that our controllers are tightly coupled to the Eloquent ORM, so if we wanted to switch to another ORM, or to a completely different database such as MongoDB, we'd have to amend our controllers. That's not good.

However, using the [Repository pattern](http://designpatternsphp.readthedocs.io/en/latest/More/Repository/README.html) we can first of all define an interface for our repository, and then create a repository class that implements that interface. That way we can interact with the repository class in our controllers, rather than using Eloquent models directly. Then, if we want to switch databases, we merely amend the repository class to change the implementation of those methods, without having to touch our controllers. Also, it makes it much easier to test our controllers in isolation, because we can easily mock our repository class using Mockery and hard-code the response, so our tests won't touch the database and will therefore run more quickly. We won't touch on that this time, but it's a very significant advantage.

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
```

And add a new binding in `app/Providers/AppServiceProvider.php`:

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

Now that we've got our repositories in place, we're no longer tightly coupled to Eloquent, and have a more flexible implementation which is easier to test.


Separating our models from our JSON with Fractal
------------------------------------------------

Another problem with our API is that our representation of our data is tightly coupled to our underlying implementation of our models. We therefore can't change our models without potentially changing the data returned by the API. We need to separate our representation of our data from our actual model so that we can more easily specify the exact data we want to return, regardless of the underlying database structure.

Enter [Fractal](http://fractal.thephpleague.com/). From the website:

> Fractal provides a presentation and transformation layer for complex data output, the like found in RESTful APIs, and works really well with JSON. Think of this as a view layer for your JSON/YAML/etc.

In other words, Fractal lets you specify the format your data will take in one place so that it's easier to return that data in a desired format. We'll use Fractal to specify how we want our API responses to be formatted.

Install Fractal with the following command:

```php
$ composer require league/fractal
```

Then amend the classmap in `composer.json`:

```json
    "autoload": {
        "classmap": [
            "database",
            "app/Repositories",
            "app/Transformers"
        ],
        "psr-4": {
            "AnimalFriend\\": "app/"
        }
    },
```

Then create the folder `app/Transformers` and run `composer dump-autoload`. We're now ready to write our first transformer. Save this as `app/Transformers/PetTransformer.php`:

```php
<?php

namespace AnimalFriend\Transformers;

use AnimalFriend\Pet;
use League\Fractal;

class PetTransformer extends Fractal\TransformerAbstract
{
    public function transform(Pet $pet)
    {
        return [
            'id'            => (int) $pet->id,
            'name'          => (string) $pet->name,
            'type'          => (string) $pet->type,
            'available'     => (bool) $pet->available,
            'picture'       => (string) $pet->picture
        ];
    }
}
```

The `transform` method specifies how we want to represent our objects with our API. We can return only those attributes we want to expose, and amend the structure as we see fit. We could easily represemt relations in whatever manner we see fit, whereas before we needed to amend our queries to return the data in the right format, which would potentially be cumbersome.

Now let's amend `PetController.php` to use this:

```php
<?php

namespace AnimalFriend\Http\Controllers;

use Illuminate\Http\Request;

use AnimalFriend\Http\Requests;
use AnimalFriend\Repositories\Interfaces\PetRepositoryInterface as Pet;
use AnimalFriend\Transformers\PetTransformer;
use League\Fractal;
use League\Fractal\Manager;

class PetController extends Controller
{
    private $pet, $fractal;

    public function __construct(Pet $pet, Manager $fractal) {
        $this->pet = $pet;
        $this->fractal = $fractal;
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

        // Format it
        $resource = new Fractal\Resource\Collection($pets, new PetTransformer);
        $data = $this->fractal->createData($resource)->toArray();

        // Send response
        return response()->json($data, 200);
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

        // Format it
        $resource = new Fractal\Resource\Item($pet, new PetTransformer);
        $data = $this->fractal->createData($resource)->toArray();

        // Send response
        return response()->json($data, 200);
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

Note that by default, Fractal places our data inside a dedicated `data` namespace. This is good because it leaves a place for us to put metadata such as pagination links, but it does mean our controller test has been broken. Let's fix it:

```php
<?php

use Illuminate\Foundation\Testing\DatabaseMigrations;

class PetControllerTest extends TestCase
{
    use DatabaseMigrations;

    /**
     * Test fetching pets when unauthorised
     *
     * @return void
     */
    public function testFetchingPetsWhenUnauthorised()
    {
        // Create a Pet
        $pet = factory(AnimalFriend\Pet::class)->create([
            'name' => 'Freddie',
            'type' => 'Cat',
        ]);
        $this->seeInDatabase('pets', ['type' => 'Cat']);

        // Create request
        $response = $this->call('GET', '/api/pets');
        $this->assertResponseStatus(400);
    }

    /**
     * Test fetching pets when authorised
     *
     * @return void
     */
    public function testFetchingPets()
    {
        // Create a Pet
        $pet = factory(AnimalFriend\Pet::class)->create([
            'name' => 'Freddie',
            'type' => 'Cat',
        ]);
        $this->seeInDatabase('pets', ['type' => 'Cat']);

        // Create a User
        $user = factory(AnimalFriend\User::class)->create([
            'name' => 'bobsmith',
            'email' => 'bob@example.com',
        ]);
        $this->seeInDatabase('users', ['email' => 'bob@example.com']);

        // Create request
        $token = JWTAuth::fromUser($user);
        $headers = array(
            'Authorization' => 'Bearer '.$token
        );

        // Send it
        $this->json('GET', '/api/pets', [], $headers)
            ->seeJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'type',
                        'available',
                        'picture'
                    ]
                ]
            ]);
        $this->assertResponseStatus(200);
    }

    /**
     * Test fetching pet when unauthorised
     *
     * @return void
     */
    public function testFetchingPetWhenUnauthorised()
    {
        // Create a Pet
        $pet = factory(AnimalFriend\Pet::class)->create([
            'name' => 'Freddie',
            'type' => 'Cat',
        ]);
        $this->seeInDatabase('pets', ['type' => 'Cat']);

        // Send request
        $response = $this->call('GET', '/api/pets/'.$pet->id);
        $this->assertResponseStatus(400);
    }

    /**
     * Test fetching pet which does not exist
     *
     * @return void
     */
    public function testFetchingPetDoesNotExist()
    {
        // Create a User
        $user = factory(AnimalFriend\User::class)->create([
            'name' => 'bobsmith',
            'email' => 'bob@example.com',
        ]);
        $this->seeInDatabase('users', ['email' => 'bob@example.com']);

        // Create request
        $token = JWTAuth::fromUser($user);
        $headers = array(
            'Authorization' => 'Bearer '.$token
        );

        // Send it
        $this->json('GET', '/api/pets/1', [], $headers);
        $this->assertResponseStatus(404);
    }

    /**
     * Test fetching pet when authorised
     *
     * @return void
     */
    public function testFetchingPet()
    {
        // Create a Pet
        $pet = factory(AnimalFriend\Pet::class)->create([
            'name' => 'Freddie',
            'type' => 'Cat',
        ]);
        $this->seeInDatabase('pets', ['type' => 'Cat']);

        // Create a User
        $user = factory(AnimalFriend\User::class)->create([
            'name' => 'bobsmith',
            'email' => 'bob@example.com',
        ]);
        $this->seeInDatabase('users', ['email' => 'bob@example.com']);

        // Create request
        $token = JWTAuth::fromUser($user);
        $headers = array(
            'Authorization' => 'Bearer '.$token
        );

        // Send it
        $this->json('GET', '/api/pets/'.$pet->id, [], $headers)
            ->seeJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'type',
                    'available',
                    'picture'
                ]
            ]);
        $this->assertResponseStatus(200);
    }
}
```

We're also going to amend our test settings to use the array backend for the cache, as this does not require any external dependencies, but still allows us to tag our cache keys (I'll cover that in a future instalment). Change the cache settings in `phpunit.xml` as follows:

```xml
        <env name="CACHE_DRIVER" value="array"/>
```

Let's run our tests to make sure everything's fine:

```bash
$ vendor/bin/phpunit 
PHPUnit 5.5.4 by Sebastian Bergmann and contributors.

............                                                      12 / 12 (100%)

Time: 859 ms, Memory: 18.00MB

OK (12 tests, 44 assertions)
```

At present our `User` controller doesn't actually return anything, and the auth only ever returns the token, so it's not worth while adding a transformer now.

Wrapping up
-----------

That ends this lesson. We haven't added any functionality, but we have improved the design of our API, and we're now ready to develop it further. As usual, the backend repository has been tagged as `lesson-4`.

Next time we'll start adding the additional functionality we need to our API.
