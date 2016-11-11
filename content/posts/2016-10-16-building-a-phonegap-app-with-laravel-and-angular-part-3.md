---
title: "Building a Phonegap app with Laravel and Angular - Part 3"
date: 2016-10-16 18:10:13 +0100
categories:
- php
- laravel
- javascript
- angular
- phonegap
- laravel-phonegap-tutorial
comments: true
---

Apologies for how long it's taken for this post to appear. I've got a lot on my plate at present as I recently started a new job, so I haven't been able to devote as much time to this series as I'd like.

In this instalment we'll begin extending our app beyond the basic authentication we've already implemented. We'll start by adding the means to sign up, before adding the list of pets.

Adding a signup method to our backend
-------------------------------------

We'll create a controller for our users in the Laravel backend. First we'll create our tests:

```bash
$ php artisan make:test UserControllerTest
```

We'll create three tests. The first will check to see that an invalid request raises the correct status code (422). The second will check that a valid request returns the correct status code (201) and creates the user. The third will check that trying to create a duplicate user raises an error. Here they are - they should be saved in the new `tests/UserControllerTest.php` file:

```php
<?php

use Illuminate\Foundation\Testing\DatabaseMigrations;

class UserControllerTest extends TestCase
{
    /**
     * Test creating a user - invalid
     *
     * @return void
     */
    public function testPostingInvalidUser()
    {
        // Create a request
        $data = array(
            'name' => 'Bob Smith',
            'email' => 'bob@example.com'
        );
        $this->json('POST', '/api/users', $data);
        $this->assertResponseStatus(422);
    }

    /**
     * Test creating a user
     *
     * @return void
     */
    public function testPostingUser()
    {
        // Create a request
        $data = array(
            'name' => 'Bob Smith',
            'email' => 'bob@example.com',
            'password' => 'password',
            'password_confirmation' => 'password'
        );
        $this->json('POST', '/api/users', $data);
        $this->assertResponseStatus(201);
        $this->seeInDatabase('users', ['email' => 'bob@example.com']);

        // Check user exists
        $saved = User::first();
        $this->assertEquals($saved->email, 'bob@example.com');
        $this->assertEquals($saved->name, 'Bob Smith');
    }

    /**
     * Test creating a duplicate user
     *
     * @return void
     */
    public function testPostingDuplicateUser()
    {
        // Create user
        $user = factory(AnimalFriend\User::class)->create([
            'name' => 'Bob Smith',
            'email' => 'bob@example.com',
            'password' => 'password'
        ]);
        $this->seeInDatabase('users', ['email' => 'bob@example.com']);

        // Create a request
        $data = array(
            'name' => 'Bob Smith',
            'email' => 'bob@example.com',
            'password' => 'password',
            'password_confirmation' => 'password'
        );
        $this->json('POST', '/api/users', $data);
        $this->assertResponseStatus(422);
    }
}
```

Note the use of `$this->json()` to make the request. This method is ideal for testing a REST API.

Running our tests should confirm that they fail:

```bash
$ vendor/bin/phpunit
PHPUnit 5.5.4 by Sebastian Bergmann and contributors.

........FFF.                                                      12 / 12 (100%)

Time: 827 ms, Memory: 18.00MB

There were 3 failures:

1) UserControllerTest::testPostingInvalidUser
Expected status code 422, got 404.
Failed asserting that 404 matches expected 422.

/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Testing/Concerns/MakesHttpRequests.php:648
/home/matthew/Projects/mynewanimalfriend-backend/tests/UserControllerTest.php:21

2) UserControllerTest::testPostingUser
Expected status code 201, got 404.
Failed asserting that 404 matches expected 201.

/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Testing/Concerns/MakesHttpRequests.php:648
/home/matthew/Projects/mynewanimalfriend-backend/tests/UserControllerTest.php:39

3) UserControllerTest::testPostingDuplicateUser
Expected status code 422, got 404.
Failed asserting that 404 matches expected 422.

/home/matthew/Projects/mynewanimalfriend-backend/vendor/laravel/framework/src/Illuminate/Foundation/Testing/Concerns/MakesHttpRequests.php:648
/home/matthew/Projects/mynewanimalfriend-backend/tests/UserControllerTest.php:71

FAILURES!
Tests: 12, Assertions: 43, Failures: 3.
```

Next, we create our new controller:

```bash
$ php artisan make:controller UserController --resource
```

Let's populate it:

```php
<?php

namespace AnimalFriend\Http\Controllers;

use Illuminate\Http\Request;

use AnimalFriend\Http\Requests;
use AnimalFriend\User;
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
            'password' => 'required|confirmed',
        ]);

        // Create user
        $user = new $this->user;
        $user->email = $request->input('email');
        $user->name = $request->input('name');
        $user->password = Hash::make($request->input('password'));
        $user->save();

        // Create token
        $token = JWTAuth::fromUser($user);

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

For now we'll leave the other methods blank, but we'll be using them later so we won't get rid of them. At the top, note we load not only the `User` model, but also the `JWTAuth` and `Hash` facades. We use `JWTAuth::fromUser()` to return a JSON web token for the given user model.

In the `store()` method we first of all use [Laravel's validation support](https://laravel.com/docs/5.3/validation) to validate our input. We specify that the user must provide a unique email address, a username, and a password, which must be confirmed. Note that we don't need to specify an action if the request is invalid, as Laravel will do that for us. Also, note that the `confirmed` rule means that the `password` field must be accompanied by a matching `password_confirmation` field.

Next, we create the user. Note that we hash the password before storing it, which is a best practice (storing passwords in plain text is a REALLY bad idea!). Then we create the token for the new user and return it. From then on, the user can use that token to authenticate their requests.

We also need to add this route in `routes/api.php`:

```php
Route::resource('users', 'UserController');
```

Let's check the test passes:

```php
$ vendor/bin/phpunit 
PHPUnit 5.5.4 by Sebastian Bergmann and contributors.

............                                                      12 / 12 (100%)

Time: 905 ms, Memory: 20.00MB

OK (12 tests, 46 assertions)
```

Building the registration in the app
------------------------------------

With registration in place on the server side, we can move back to the app. We need to create another route for the registration form. Add this to `test/routes.spec.js`:

```javascript
  it('should map register route to register controller', function () {
    inject(function ($route) {
      expect($route.routes['/register'].controller).toBe('RegisterCtrl');
      expect($route.routes['/register'].templateUrl).toEqual('templates/register.html');
    });
  });
```

Running the tests should confirm that this fails. So next you should add this to the route provider section of `js/main.js`:

```javascript
  .when('/register', {
    templateUrl: 'templates/register.html',
    controller: 'RegisterCtrl'
  })
```

We also need to allow the register path to be accessed when not logged in:

```javascript
.run(['$rootScope', '$location', 'Auth', function ($rootScope, $location, Auth) {
  $rootScope.$on('$routeChangeStart', function (event) {

    if (!Auth.isLoggedIn()) {
      if ($location.path() !== '/login' && $location.path() !== '/register') {
        $location.path('/login');
      }
    }
  });
}])
```

Our next step is to create a service representing the `User` endpoint. Here's the test for it:

```javascript
  describe('User service', function () {
    var mockBackend, User;

    beforeEach(inject(function (_User_, _$httpBackend_) {
      User = _User_;
      mockBackend = _$httpBackend_;
    }));

    it('can create a new user', function () {
      mockBackend.expectPOST('http://localhost:8000/api/users', '{"email":"bob@example.com","name":"bobsmith","password":"password","password_confirmation":"password"}').respond({token: 'mytoken'});
      var user = new User({
        email: 'bob@example.com',
        name: 'bobsmith',
        password: 'password',
        password_confirmation: 'password'
      });
      user.$save(function (response) {
        expect(response).toEqualData({token: 'mytoken'});
      });
      mockBackend.flush();
    });
  });
```

We're only interested in using this model to create new users at this point, so this is the full scope of this test for now. Make sure the test fails, then we're ready to create the new service in `js/services.js`:

```javascript
.factory('User', function ($resource) {
  return $resource('http://localhost:8000/api/users/:id', null, {
    'update': { method: 'PATCH' }
  });
})
```

Note that `angular-resource` does not support the `PUT` or `PATCH` methods by default, but as shown here it's easy to implement it ourselves. That should be sufficient to make our test pass.

Next, we need to create the controller for registration. Here's the test for it:

```javascript
  describe('Register Controller', function () {
    var mockBackend, scope;

    beforeEach(inject(function ($rootScope, $controller, _$httpBackend_) {
      mockBackend = _$httpBackend_;
      scope = $rootScope.$new();
      $controller('RegisterCtrl', {
        $scope: scope
      });
    }));

    // Test controller scope is defined
    it('should define the scope', function () {
      expect(scope).toBeDefined();
    });

    // Test doRegister is defined
    it('should define the register method', function () {
      expect(scope.doRegister).toBeDefined();
    });

    // Test doRegister works
    it('should allow the user to register', function () {
      // Mock the backend
      mockBackend.expectPOST('http://localhost:8000/api/users', '{"email":"user@example.com","name":"bobsmith","password":"password","password_confirmation":"password"}').respond({token: 123});

      // Define login data
      scope.credentials = {
        email: 'user@example.com',
        name: "bobsmith",
        password: 'password',
        password_confirmation: 'password'
      };

      //  Submit the request
      scope.doRegister();

      // Flush the backend
      mockBackend.flush();

      // Check login complete
      expect(localStorage.getItem('authHeader')).toEqual('Bearer 123');
    });
  });
```

Make sure the test fails before proceeding. Our `RegisterCtrl` is very similar to the login controller:

```javascript
.controller('RegisterCtrl', function ($scope, $location, User, Auth) {
  $scope.doRegister = function () {
    var user = new User($scope.credentials);
    user.$save(function (response) {
      if (response.token) {
        // Set up auth service
        Auth.setUser(response.token);

        // Redirect
        $location.path('/');
      }
    }, function (err) {
        alert('Unable to log in - please check your details are correct');
    });
  };
})
```

Check the tests pass,and we're ready to move on to creating our HTML template. Save this as `www/templates/register.html`:

```html
<md-content md-theme="default" layout-gt-sm="row" layout-padding>
	<div>
		<md-input-container class="md-block">
			<label>Email</label>
			<input ng-model="credentials.email" type="email">
		</md-input-container>

		<md-input-container class="md-block">
			<label>Username</label>
			<input ng-model="credentials.name" type="text">
		</md-input-container>

		<md-input-container class="md-block">
			<label>Password</label>
			<input ng-model="credentials.password" type="password">
		</md-input-container>

		<md-input-container class="md-block">
			<label>Confirm Password</label>
			<input ng-model="credentials.password_confirmation" type="password">
		</md-input-container>

		<md-button class="md-raised md-primary" ng-click="doRegister()">Submit</md-button>
		<md-button class="md-raised md-primary" href="/login">Log in</md-button>
	</div>
</md-content>
```

It's very similar to our login template. Speaking of which, we need to add a link to this route there:

```html
<md-content md-theme="default" layout-gt-sm="row" layout-padding>
	<div>
		<md-input-container class="md-block">
			<label>Email</label>
			<input ng-model="credentials.email" type="email" />
		</md-input-container>

		<md-input-container class="md-block">
			<label>Password</label>
			<input ng-model="credentials.password" type="password" />
		</md-input-container>
		<md-button class="md-raised md-primary" ng-click="doLogin()">Submit</md-button>
		<md-button class="md-raised md-primary" href="register">Register</md-button>
	</div>
</md-content>
```

With that done, you should now be able to run the Gulp server for the app with `gulp` and the Laravel backend with `php artisan serve` and create a new user account.

Adding pets to the home page
----------------------------

Our final task for this lesson is to display a list of pets on the home page. Later we'll refine that functionality, but for now we'll just get a list of all current pets and display them. First we need to write a test for our `Pet` service:

```javascript
  describe('Pet service', function () {
    var mockBackend, Pet;

    beforeEach(inject(function (_Pet_, _$httpBackend_) {
      Pet = _Pet_;
      mockBackend = _$httpBackend_;
    }));

    it('can fetch pets', function () {
      mockBackend.expectGET('http://localhost:8000/api/pets').respond([{id:1,name:"Freddie",type:"Cat"}]);
      expect(Pet).toBeDefined();
      var pets = Pet.query();
      mockBackend.flush();
      expect(pets).toEqualData([{id: 1,name:"Freddie",type:"Cat"}]);
    });
  });
```

Once you know that fails, it's time to implement the service:

```javascript
.factory('Pet', function ($resource) {
  return $resource('http://localhost:8000/api/pets/:id', null, {
    'update': { method: 'PATCH' }
  });
})
```

Next, we want to add the pets to the scope of the home controller. Amend the test for it as follows:

```javascript
  describe('Home Controller', function () {
    var pets, scope;

    beforeEach(inject(function ($rootScope, $controller, Pet) {
      pets = Pet;
      scope = $rootScope.$new();
      $controller('HomeCtrl', {
        $scope: scope,
        pets: [{id:1},{id:2}]
      });
    }));

    // Test controller scope is defined
    it('should define the scope', function () {
      expect(scope).toBeDefined();
    });

    // Test pets
    it('should define the pets', function () {
      expect(scope.pets).toEqualData([{id: 1}, {id: 2}]);
    });
  });
```

We check to see if the scope contains the `pets` variable. Once you have a failing test, amend the home controller as follows:

```javascript
.controller('HomeCtrl', function ($scope, Pet, pets) {
  $scope.pets = pets;
});
```

We could fetch the via AJAX inside the controller, but there's a better way. We'll create a loader for the pet data and have it resolve that before the page is displayed. To do so, first we need to add the loader service to `js/services.js`:

```javascript
.factory('PetsLoader', ['Pet', '$q', function (Pet, $q) {
  return function () {
    var delay = $q.defer();
    Pet.query(function (response) {
      delay.resolve(response);
    }, function () {
      delay.reject('Unable to fetch pets');
    });
    return delay.promise;
  };
}])
```

Then we set that route up to resolve it in `js/main.js`:

```javascript
  .when('/', {
    templateUrl: 'templates/home.html',
    controller: 'HomeCtrl',
    resolve: {
      pets: ['PetsLoader', function (PetsLoader) {
        return PetsLoader();
      }]
    }
  })
```

Now, when we load that route, it will first of all fetch those pets and populate `$scope.pets` with them.

Now, we need to have some pets in the database, so we'll make a seeder for it. Head back to the backend and run this command:

```bash
$ php artisan make:seeder PetTableSeeder
```

Then amend the file at `database/seeds/PetTableSeeder.php` as follows:

```php
<?php

use Illuminate\Database\Seeder;
use Carbon\Carbon;

class PetTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Add Pets
        DB::table('pets')->insert([[
            'name' => 'Freddie',
            'type' => 'Cat',
            'available' => 1,
            'picture'   => 'https://placekitten.com/300/300',
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ], [
            'name' => 'Sophie',
            'type' => 'Cat',
            'available' => 1,
            'picture'   => 'https://placekitten.com/300/300',
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]]);
    }
}
```

And we need to update `database/seeds/DatabaseSeeder.php` to call our seeder:

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
        $this->call(PetTableSeeder::class);
    }
}
```

For now we'll use placeholder images, but at a later point our backend will be set up to use images uploaded from the admin. Then we need to refresh our migrations and apply the seeders:

```bash
$ php artisan migrate:refresh
$ php artisan db:seed
```

Now we just need to amend our home template to show the pets and we're done for today:

```html
<md-toolbar>
	<div class="md-toolbar-tools">
		<md-button aria-label="Log out" href="/logout">
			Log out
		</md-button>
	</div>
</md-toolbar>

<div layout="column" flex="grow" layout-align="center stretch">
	<md-card md-theme="default" ng-repeat="pet in pets">
		<md-card-title>
			<md-card-title-text>
                <span class="md-headline">{{ pet.name }}</span>
                <span class="md-subhead">{{ pet.type }}</span>
			</md-card-title-text>
        </md-card-title>
        <md-card-content>
            <img class="md-card-image md-media-lg" ng-src="{{ pet.picture }}"></img>
        </md-card-content>
    </md-card>
</div>
```

Now we can see our pets in the app.

Wrapping up
-----------

That's enough for today - the fact that we can log in and out, register, and view the home page is sufficient as a proof of concept for a client. As usual, the results are on Github, tagged `lesson-3`. 

Next time, we'll concentrate exclusively on the back end. We'll build upon what we already have using Laravel to create a full REST API for our app. In a later instalment, we'll move on to build our admin interface for the staff, before switching back to finish off the app. I hope you'll join me then.
