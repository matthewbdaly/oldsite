---
title: "Building a Phonegap app with Laravel and Angular - Part 1"
date: 2016-09-11 19:33:41 +0100
categories:
- php
- laravel
- javascript
- angular
- phonegap
comments: true
---

A lot of my work over the last few years has been involved Phonegap apps. Phonegap isn't terribly hard to use, but the difference in context between that and a more conventional web app means that you have to move a lot of functionality to the client side, and unless you've used client-side Javascript frameworks before it can be a struggle.

In this series of tutorials I'll show you how I might build a Phonegap app. The work involved will include:

* Building a REST API using Laravel to expose the data
* Building an admin interface to manage the data
* Building a Phonegap app using Angular.js
* Testing and deploying it

In the process we'll cover issues like authentication, authorization, real-time notifications and working with REST APIs. Note that we won't cover the app submission process - you can find plenty of resources on that. We will, however, be using Phonegap Build to build the app.

The brief
---------

Let's say our new client is an animal shelter. The brief for the app is as follows:

> My New Animal Friend will be an app for finding a new pet. Once a user signs in, they'll be able to choose what type of pet they're looking for, then look through a list of pets available to adopt. They can reject them by swiping left or save them by swiping right. They can see more about the ones they swipe right on, and arrange to meet them, from within the app. Users can also message the staff to ask questions about a pet.

Nice idea, but there's a lot of work involved! Our very first task is to build the REST API, since everything else relies on that. Before starting, make sure you have the following installed:

* PHP (I'm using PHP 7, but 5.6 should be fine)
* Composer
* Git
* A compatible relational database (I use PostgreSQL)
* Redis
* Your usual text editor
* Node.js

As long as you have this, you should be ready to go. Using [Homestead](https://laravel.com/docs/5.3/homestead) is the simplest way to get started if you don't have all this stuff already.

Starting the API
----------------

To start building our REST API, run the following command from the shell:

```bash
$ composer create-project --prefer-dist laravel/laravel mynewanimalfriend-backend
```

We also have some other dependencies we need to install, so switch into the new directory and run the following command:

```bash
$ composer require barryvdh/laravel-cors tymon/jwt-auth predis/predis
```

Next, we need to add the new packages to the Laravel config. Open up `config/app.php` and add the following to the `providers` array:

```php
   Tymon\JWTAuth\Providers\JWTAuthServiceProvider::class,                                                                                                                                              
   Barryvdh\Cors\ServiceProvider::class,   
```

And the following to the `aliases` array:

```php
   'JWTAuth' => Tymon\JWTAuth\Facades\JWTAuth::class,
```

We also need to ensure that the CORS middleware is applied to all API routes. Open up `app/Http/Kernel.php` and under the `api` array in `protected $middlewareGroups` paste the following:

```php
   \Barryvdh\Cors\HandleCors::class,
```

Now that the packages are included, we can publish the files for them:

```bash
$ php artisan vendor:publish
```

Next, we need to set a key for our API authentication:

```bash
$ php artisan jwt:generate
```

And set a custom namespace:

```bash
$ php artisan app:name AnimalFriend
```

I had to change the namespace for the user model in `config/jwt.php` as well:

```php
    'user' => 'AnimalFriend\User',
```

I also tend to amend the settings in `phpunit.xml` as follows so that it uses an in-memory SQLite database for tests:

```xml
        <env name="APP_ENV" value="testing"/>
        <env name="SESSION_DRIVER" value="array"/>
        <env name="QUEUE_DRIVER" value="sync"/>
        <env name="CACHE_DRIVER" value="redis"/>
        <env name="DB_CONNECTION" value="sqlite"/>
        <env name="DB_DATABASE" value=":memory:"/>
```

Also, delete `tests/ExampleTest.php` and amend `tests/TestCase.php` as follows in order to use database migrations in tests:

```php
<?php

use Illuminate\Foundation\Testing\DatabaseMigrations;

abstract class TestCase extends Illuminate\Foundation\Testing\TestCase
{
    use DatabaseMigrations;

    /**
     * The base URL to use while testing the application.
     *
     * @var string
     */
    protected $baseUrl = 'http://localhost';

    /**
     * Creates the application.
     *
     * @return \Illuminate\Foundation\Application
     */
    public function createApplication()
    {
        $app = require __DIR__.'/../bootstrap/app.php';

        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

        return $app;
    }
}
```

With that in place, we can start work on our API proper.

Authenticating our API
----------------

We're going to start out with a very limited subset of our API. First, we'll implement the authentication for our app, then we'll add the facility to view a list of pets or an individual pet. Other functionality will come later. This will be sufficient to get the app working.

First, we need to create our user model. As we'll be practicing TDD throughout, we write a test for the user model first. Save the following as `tests/UserModelTest.php`:

```php
<?php

use AnimalFriend\User;

class UserModelTest extends TestCase
{
    /**
     * Test creating a user
     *
     * @return void
     */
    public function testCreatingAUser()
    {
        // Create a User
        $user = factory(AnimalFriend\User::class)->create([
            'name' => 'bobsmith',
            'email' => 'bob@example.com',
        ]);
        $this->seeInDatabase('users', ['email' => 'bob@example.com']);

        // Verify it works
        $saved = User::where('email', 'bob@example.com')->first();
        $this->assertEquals($saved->id, 1);
        $this->assertEquals($saved->name, 'bobsmith');
    }
}
```

If we run the tests:

```bash
$ vendor/bin/phpunit
PHPUnit 5.5.4 by Sebastian Bergmann and contributors.

.                                                                   1 / 1 (100%)

Time: 169 ms, Memory: 12.00MB

OK (1 test, 3 assertions)
```

We already have a perfectly good `User` model and the appropriate migrations, so our test already passes.

Next, we need to implement the authentication system. Save this as `tests/AuthTest.php`:

```php
<?php

use Illuminate\Foundation\Testing\DatabaseMigrations;

class AuthTest extends TestCase
{
    use DatabaseMigrations;

    /**
     * Test the auth
     *
     * @return void
     */
    public function testAuth()
    {
        // Create a User
        $user = factory(AnimalFriend\User::class)->create([
            'name' => 'bobsmith',
            'email' => 'bob@example.com',
            'password' => bcrypt('password')
        ]);

        // Create request
        $data = array(
            'email' => $user->email,
            'password' => 'password',
        );
        $response = $this->call('POST', 'api/authenticate', $data);
        $this->assertResponseStatus(200);
        $content = json_decode($response->getContent());
        $this->assertTrue(array_key_exists('token', $content));
    }

    /**
     * Test the auth when user does not exist
     *
     * @return void
     */
    public function testAuthFailure()
    {
        // Create data for request
        $data = array(
            'email' => 'user@example.com',
            'password' => 'password',
        );
        $response = $this->call('POST', 'api/authenticate', $data);

        // Check the status code
        $this->assertResponseStatus(401);
    }
}
```

The first test creates a user and sends an authentication request, then confirms that it returns the JSON Web Token. The second checks that a user that doesn't exist cannot log in.

Let's run the tests:

```bash
$ vendor/bin/phpunit
PHPUnit 5.5.4 by Sebastian Bergmann and contributors.

FF.                                                                 3 / 3 (100%)

Time: 328 ms, Memory: 14.00MB

There were 2 failures:

1) AuthTest::testAuth
Expected status code 200, got 404.
Failed asserting that 404 matches expected 200.

/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Testing/Concerns/MakesHttpRequests.php:648
/home/matthew/Projects/mynewanimalfriend-backend/tests/AuthTest.php:29

2) AuthTest::testAuthFailure
Expected status code 401, got 404.
Failed asserting that 404 matches expected 401.

/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Testing/Concerns/MakesHttpRequests.php:648
/home/matthew/Projects/mynewanimalfriend-backend/tests/AuthTest.php:49

FAILURES!
Tests: 3, Assertions: 5, Failures: 2.
```

With a failing test in place, we can implement login. First let's create our controller at `app/Http/Controllers/AuthenticateController.php`:

```php
<?php

namespace AnimalFriend\Http\Controllers;

use Illuminate\Http\Request;

use AnimalFriend\Http\Requests;
use AnimalFriend\Http\Controllers\Controller;
use JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;
use AnimalFriend\User;
use Hash;

class AuthenticateController extends Controller
{
    private $user;

    public function __construct(User $user) {
        $this->user = $user;
    }

    public function authenticate(Request $request)
    {
        // Get credentials
        $credentials = $request->only('email', 'password');

        // Get user
        $user = $this->user->where('email', $credentials['email'])->first();

        try {
            // attempt to verify the credentials and create a token for the user
            if (! $token = JWTAuth::attempt($credentials)) {
                return response()->json(['error' => 'invalid_credentials'], 401);
            }
        } catch (JWTException $e) {
            // something went wrong whilst attempting to encode the token
            return response()->json(['error' => 'could_not_create_token'], 500);
        }

        // all good so return the token
        return response()->json(compact('token'));
    }
}
```

And we need to set up the route in `routes/api.php`:

```php
<?php

use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::post('authenticate', 'AuthenticateController@authenticate');
```

Note that because it's an API route, it's automatically prefixed with `api/` without us having to do anything.

Now if we run our tests, they should pass:

```bash
$ vendor/bin/phpunit
PHPUnit 5.5.4 by Sebastian Bergmann and contributors.

...                                                                 3 / 3 (100%)

Time: 402 ms, Memory: 14.00MB

OK (3 tests, 6 assertions)
```

Now we can obtain a JSON Web Token to authenticate users with. To start with we'll only support existing users, but later we'll add a method to sign up. However, we need at least one user to test with, so we'll create a seeder for that at `database/seeds/UserTableSeeder.php`:

```php
<?php

use Illuminate\Database\Seeder;
use Carbon\Carbon;

class UserTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Add user
        DB::table('users')->insert([
            'name' => 'bobsmith',
            'email' => 'bob@example.com',
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
            'password' => Hash::make("password")
        ]);
    }
}
```

You can run `php artisan make:seeder UserTableSeeder` to generate the file, or just paste it in. You also need to amend `database/seeds/DatabaseSeeder.php` as follows:

```php
<?php

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $this->call(UserTableSeeder::class);
    }
}
```

This ensures the seeder will actually be called. Then, run the following commands:

```bash
$ php artisan migrate
$ php artisan db:seed
```

That sets up our user in the database.

Adding the Pets endpoint
------------------------

Our next step is to add the pets model and endpoint. Our `Pet` model should have the following fields:

* ID
* Timestamps (`created_at` and `updated_at`)
* Name
* Path to photo
* Availability
* Type (eg cat, dog)

Let's create a test for that model:

```php
<?php

use AnimalFriend\Pet;

class PetModelTest extends TestCase
{
    /**
     * Test creating a pet
     *
     * @return void
     */
    public function testCreatingAPet()
    {
        // Create a Pet
        $pet = factory(AnimalFriend\Pet::class)->create([
            'name' => 'Freddie',
            'type' => 'Cat',
        ]);
        $this->seeInDatabase('pets', ['type' => 'Cat']);

        // Verify it works
        $saved = Pet::where('name', 'Freddie')->first();
        $this->assertEquals($saved->id, 1);
        $this->assertEquals($saved->name, 'Freddie');
        $this->assertEquals($saved->type, 'Cat');
        $this->assertEquals($saved->available, 1);
        $this->assertEquals($saved->picture, '1.jpg');
    }
}
```

Save this as `tests/PetModelTest.php`. Then run the tests:

```bash
$ vendor/bin/phpunit
PHPUnit 5.5.4 by Sebastian Bergmann and contributors.

..E.                                                                4 / 4 (100%)

Time: 414 ms, Memory: 16.00MB

There was 1 error:

1) PetModelTest::testCreatingAUser
InvalidArgumentException: Unable to locate factory with name [default] [AnimalFriend\Pet].

/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Database/Eloquent/FactoryBuilder.php:126
/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Database/Eloquent/Model.php:2280
/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Database/Eloquent/FactoryBuilder.php:139
/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Database/Eloquent/FactoryBuilder.php:106
/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Database/Eloquent/FactoryBuilder.php:84
/home/matthew/Projects/mynewanimalfriend-backend/tests/PetModelTest.php:16

ERRORS!
Tests: 4, Assertions: 6, Errors: 1.
```

First we need to create a factory for creating a pet in `database/factories/ModelFactory.php`:

```php
$factory->define(AnimalFriend\Pet::class, function (Faker\Generator $faker) {
    return [
        'name' => $faker->firstNameMale,
        'type' => 'Cat',
        'available' => 1,
        'picture' => '1.jpg'
    ];
});
```

Then, we create the model:

```bash
$ php artisan make:model Pet
```

Next, we create a migration for the `Pet` model:

```bash
$ php artisan make:migration create_pets_table
Created Migration: 2016_09_11_145010_create_pets_table
```

And paste in the following code:

```php
<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreatePetsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('pets', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name');
            $table->string('type');
            $table->string('available');
            $table->string('picture')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::drop('pets');
    }
}
```

Time to run the tests again:

```bash
$ vendor/bin/phpunit
PHPUnit 5.5.4 by Sebastian Bergmann and contributors.

....                                                                4 / 4 (100%)

Time: 412 ms, Memory: 16.00MB

OK (4 tests, 12 assertions)
```

With that done, we can start work on implementing the endpoint. We need to check that unauthorised users cannot retrieve the data, and that authorised users can. First, let's create `tests/PetControllerTest.php`:

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
                '*' => [
                    'id',
                    'name',
                    'type',
                    'available',
                    'picture',
                    'created_at',
                    'updated_at'
                ]
            ]);
        $this->assertResponseStatus(200);
    }
}
```

First, we create a pet, make an HTTP request to `/api/pets`, and check we are not authorised. Next, we do the same, but also create a user and a JSON Web Token, and pass the token through in the request. Then we verify the response data and that it was successful.

Let's run the tests:

```bash
$ vendor/bin/phpunit 
PHPUnit 5.5.4 by Sebastian Bergmann and contributors.

..FF..                                                              6 / 6 (100%)

Time: 509 ms, Memory: 16.00MB

There were 2 failures:

1) PetControllerTest::testFetchingPetsWhenUnauthorised
Expected status code 400, got 404.
Failed asserting that 404 matches expected 400.

/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Testing/Concerns/MakesHttpRequests.php:648
/home/matthew/Projects/mynewanimalfriend-backend/tests/PetControllerTest.php:25

2) PetControllerTest::testFetchingPets
Failed asserting that null is of type "array".

/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Testing/Concerns/MakesHttpRequests.php:295
/home/matthew/Projects/mynewanimalfriend-backend/tests/PetControllerTest.php:67

FAILURES!
Tests: 6, Assertions: 17, Failures: 2.
```

That looks correct, so we can start building our endpoint. We can generate a boilerplate for it as follows:

```bash
$ $ php artisan make:controller PetController --resource
```

Note the `--resource` flag - this tells Laravel to set it up to be a RESTful controller with certain predefined functions. Next, let's amend the new file at `app\Http\Controllers/PetController.php` as follows:

```php
<?php

namespace AnimalFriend\Http\Controllers;

use Illuminate\Http\Request;

use AnimalFriend\Http\Requests;
use AnimalFriend\Pet;

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
        $pets = $this->pet->get();

        // Send response
        return response()->json($pets, 200);
    }
}
```
This implements an index route that shows all pets. Next, we hook up the route in `routes/api.php`:

```php
// Auth routes
Route::group(['middleware' => ['jwt.auth']], function () {
    Route::resource('pets', 'PetController');
});
```

Note that we wrap this resource in the `jwt.auth` middleware to prevent access by unauthorised users. Implementing this as middleware makes it very easy to reuse. Also note that we can specify it as a resource, meaning we don't have to explicitly hook up each route to a controller method.

Let's run the tests again:

```bash
$ vendor/bin/phpunit 
PHPUnit 5.5.4 by Sebastian Bergmann and contributors.

..EE..                                                              6 / 6 (100%)

Time: 511 ms, Memory: 16.00MB

There were 2 errors:

1) PetControllerTest::testFetchingPetsWhenUnauthorised
ReflectionException: Class jwt.auth does not exist

/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Container/Container.php:734
/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Container/Container.php:629
/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Application.php:709
/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Http/Kernel.php:173
/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Testing/Concerns/MakesHttpRequests.php:517
/home/matthew/Projects/mynewanimalfriend-backend/tests/PetControllerTest.php:24

2) PetControllerTest::testFetchingPets
ReflectionException: Class jwt.auth does not exist

/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Container/Container.php:734
/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Container/Container.php:629
/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Application.php:709
/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Http/Kernel.php:173
/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Testing/Concerns/MakesHttpRequests.php:517
/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Testing/Concerns/MakesHttpRequests.php:72
/home/matthew/Projects/mynewanimalfriend-backend/tests/PetControllerTest.php:56

ERRORS!
Tests: 6, Assertions: 15, Errors: 2.
```

Looks like JWT isn't configured correctly. We can fix that in `app/Http/Kernel.php` by adding it to `$routeMiddleware`:

```php
        'jwt.auth' => 'Tymon\JWTAuth\Middleware\GetUserFromToken',
        'jwt.refresh' => 'Tymon\JWTAuth\Middleware\RefreshToken',
```

And run the tests again:

```bash
$ vendor/bin/phpunit
PHPUnit 5.5.4 by Sebastian Bergmann and contributors.

......                                                              6 / 6 (100%)

Time: 514 ms, Memory: 16.00MB

OK (6 tests, 25 assertions)
```

Our final task for today on the API is building a route for fetching a single pet. Our tests need to handle three situations:

* An unauthorised request
* A request for a pet that does not exist
* A request for a pet that does exist

Add these methods to `tests/PetControllerTest.php`:

```php
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
                'id',
                'name',
                'type',
                'available',
                'picture',
                'created_at',
                'updated_at'
            ]);
        $this->assertResponseStatus(200);
    }
```

Let's check our tests fail:

```bash
$ vendor/bin/phpunit 
PHPUnit 5.5.4 by Sebastian Bergmann and contributors.

.....FE..                                                           9 / 9 (100%)

Time: 974 ms, Memory: 16.00MB

There was 1 error:

1) PetControllerTest::testFetchingPet
PHPUnit_Framework_Exception: Argument #2 (No Value) of PHPUnit_Framework_Assert::assertArrayHasKey() must be a array or ArrayAccess

/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Testing/Concerns/MakesHttpRequests.php:304
/home/matthew/Projects/mynewanimalfriend-backend/tests/PetControllerTest.php:145

--

There was 1 failure:

1) PetControllerTest::testFetchingPetDoesNotExist
Expected status code 404, got 400.
Failed asserting that 400 matches expected 404.

/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Testing/Concerns/MakesHttpRequests.php:648
/home/matthew/Projects/mynewanimalfriend-backend/tests/PetControllerTest.php:112

ERRORS!
Tests: 9, Assertions: 31, Errors: 1, Failures: 1.
```

Now, we already have the `show()` method hooked up by default, so we just have to implement it in `app/Http/Controllers/PetController.php`:

```php
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
```

And let's run our tests again:

```bash
$ vendor/bin/phpunit 
PHPUnit 5.5.4 by Sebastian Bergmann and contributors.

.........                                                           9 / 9 (100%)

Time: 693 ms, Memory: 16.00MB

OK (9 tests, 39 assertions)
```

Now we have all the endpoints we need to get started with the app. You can find the source code for this backend on [Github](https://github.com/matthewbdaly/mynewanimalfriend-backend) - check out the `lesson-1` tag.

That seems like a good place to stop for now. We have our first pass at the back end. It's not complete by any means, but it's a good start, and is sufficient for us to get some basic functionality up and running in the app. In the next instalment we'll start working with Phonegap to build the first pass at the app itself. Later instalments will see us working with both the app and backend to build it into a more useful whole.
