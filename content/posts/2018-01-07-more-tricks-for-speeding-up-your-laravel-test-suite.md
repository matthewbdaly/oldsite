---
title: "More tricks for speeding up your Laravel test suite"
date: 2018-01-07 16:32:03 +0000
categories:
- php
- laravel
- tdd
comments: true
---

When you first start doing test-driven development with Laravel, it can be quite hard to produce a test suite that runs quickly enough. The first time I used Laravel for a large project, I had a test suite that at one time, took over seven minutes to run, which was pretty awful considering that the ideal time for a test suite to take to run is no more than ten seconds.

Fortunately, with experience you can pick up some techniques which can quite drastically speed up your test suite. Here are some of the ones I've learned that can be useful.

Note that some of these are contradictory, and what works for one use case won't necessarily work for another, so my advice is to try these and see what makes a difference for your use case.

Reduce the cost of hashing
--------------------------

Inside the `createApplication()` method of `tests\CreatesApplication.php`, place the following statement:

```php
        Hash::setRounds(4);
```

This makes hashing passwords quicker and less demanding, and since you don't care about the security of a password in a test, you're not losing out in any way by doing so.

This, by itself, can *massively* reduce the time taken by your test suite - your mileage may vary, but I've personally seen it cut to a third of the previous time by using this. In fact, it's recently been added to Laravel by default.

If you're creating a lot of fixtures for tests, do so in a transaction
----------------------------------------------------------------------

Sometimes, your application requires a lot of data to be added to the database just to be usable, and it's quite common to use seeders for this purpose. However, it can take some time to insert a lot of data, especially if it has to be re-run for every test. If you do have to insert a lot of data before a test, you can cut down the time substantially by wrapping the seeder calls in a transaction:

```php
<?php

use Illuminate\Database\Seeder;
use Illuminate\Database\Eloquent\Model;
use DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        Model::unguard();

        DB::beginTransaction();
        $this->call(GroupTableSeeder::class);
        $this->call(UserTableSeeder::class);
        $this->call(ProjectTableSeeder::class);
        DB::commit();

        Model::reguard();
    }
}
````

I've personally seen this trick cut the insert time by over half, every single time the database is seeded. If you don't have much data to insert, it may not help, but for large amounts of data it can make a big difference.

If a lot of tests need the same data, migrate and seed it first, then wrap the tests in transactions and roll them back afterwards
--------------------------------------------------------------------------------------------------

If multiple tests need to work with the same dataset, you should consider running the migrations and seeders before the first test, and then wrapping each test inside a transaction. That way the data will only be inserted once, and will be rolled back to that initial good state after each test.

```php
    protected static $migrated = false;

    public function setUp()
    {
        parent::setUp();
        DB::beginTransaction();
    }

    public function tearDown()
    {
        DB::rollback();
        parent::tearDown();
    }

    public static function setUpBeforeClass()
    {
        if (!self::$migrated) {
            Artisan::call('migrate:fresh');
            Artisan::call('db:seed');
            self::$migrated = true;
        }
    }
```

Using something like this instead of one of the existing testing traits may be a better fit under those circumstances. However, if your application uses transactions for some functionality this might cause problems.

Don't create a full instance of the Laravel application unless you have to
--------------------------------------------------------------------------

Not every test requires that you instantiate the full Laravel application, and doing so slows your tests down. If you don't absolutely need the full application instantiated in the test, consider having your test inherit from the below simple test case class instead:

```php
<?php

namespace Tests;

use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use PHPUnit\Framework\TestCase as BaseTestCase;

class SimpleTestCase extends BaseTestCase
{
    use MockeryPHPUnitIntegration;
}
```

For properly isolated unit tests, using this base class instead can have a noticeable effect on performance.

If you can, use an in-memory SQLite database for testing
--------------------------------------------------------

This isn't an option if you're relying on the features of another database, but if it is, this is usually the fastest way to go. Configure it as follows in `phpunit.xml`:

```xml
        <env name="DB_CONNECTION" value="sqlite"/>
        <env name="DB_DATABASE" value=":memory:"/>
```

Use the new Refresh Database trait
----------------------------------

```php
   use RefreshDatabase;
```

This testing trait is generally more efficient than migrating down and up, because it empties the database afterwards rather than stepping through the changes of each migration. If you have a non-trivial number of migrations, it will almost certainly be quicker than migrating down, then back up for the next test.

Mock what you can't control
---------------------------

You should never, ever be making calls to external APIs in your test suite, because you can't control whether those external API's work - if a third-party API goes down, you may get a failed test run even if your application is working perfectly, not to mention it will add the time taken to send the request and receive a response to the test time. Instead, mock the calls to the third-party API.

For large applications, consider moving parts into a separate package
---------------------------------------------------------------------

If you have a particularly large application, it's worth considering moving parts of it out into standalone packages and requiring them using Composer's support for private Git repositories. That way, those packages can have their own test suites, and the main application's test suite can cover the remaining functionality.

For instance, it's fairly straightforward to pull out your models and migrations and put them in a separate package, and the tests for them can go with them to that package.

You should also consider whether parts of your application would be useful as standalone packages, and if so pull them out along with their tests. That way, not only are you making your test suite quicker, but you're also saving yourself work by creating a reusable solution for a problem you might encounter again in the future.

Turn off XDebug
---------------

XDebug has a horrendous effect on the performance of the test suite. Turn it off unless you need it to generate test coverage. Better yet, set up continuous integration and have that generate the coverage for you.

Summary
-------

When you first start using Laravel, it can be hard to keep your test suite lean, and the longer a test suite takes to run, the less likely it is to actually get run regularly. To practice TDD properly, your test suite should not take long enough that your mind starts to wander, and ten seconds is a good target to aim for in this regard - you need to be able to run it several times a minute without problem. Obviously things like having a faster computer or an SSD will help, but there's a lot you can do to make your test suite more efficient, even when running on a quite basic machine.
