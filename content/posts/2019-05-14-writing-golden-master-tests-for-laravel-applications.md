---
title: "Writing golden master tests for Laravel applications"
date: 2019-05-14 12:15:17 +0100
categories:
- php
- laravel
- tdd
comments: true
---

Last year I wrote [a post illustrating how to write golden master tests for PHP applications in general](https://matthewdaly.co.uk/blog/2018/10/08/an-approach-to-writing-golden-master-tests-for-php-web-applications/). This approach works, but has a number of issues:

* Because it uses a headless browser such as Goutte, it's inevitably slow (a typical test run for the legacy application I wrote those tests for is 3-4 minutes)
* It can't allow for differing content, so any changes to the content will break the tests

These factors limit its utility for many PHP applications. However, for a Laravel application you're in a much better position:

* You can use Browserkit rather than a headless browser, resulting in much faster response times
* You can set up a testing database, and populate it with the same data each time, ensuring that the only thing that can change is how that data is processed to create the required HTML

Here I'll show you how to adapt that approach to work with a Laravel application.

We rely on Browserkit testing for this approach, so you need to install that:

```bash
$ composer require --dev laravel/browser-kit-testing
```

Next, we need to create our base golden master test case:

```php
<?php

namespace Tests;

use Tests\BrowserTestCase;

class GoldenMasterTestCase extends BrowserTestCase
{
    use CreatesApplication;

    public $baseUrl = 'http://localhost';

    protected $snapshotDir = "tests/snapshots/";

    protected $response;

    protected $path;

    public function goto($path)
    {
        $this->path = $path;
        $this->response = $this->call('GET', $path);
        $this->assertNotEquals(404, $this->response->status());
        return $this;
    }

    public function saveHtml()
    {
        if (!$this->snapshotExists()) {
            $this->saveSnapshot();
        }
        return $this;
    }

    public function assertSnapshotsMatch()
    {
        $path = $this->getPath();
        $newHtml = $this->processHtml($this->getHtml());
        $oldHtml = $this->getOldHtml();
        $diff = "";
        if (function_exists('xdiff_string_diff')) {
            $diff = xdiff_string_diff($oldHtml, $newHtml);
        }
        $message = "The path $path does not match the snapshot\n$diff";
        self::assertThat($newHtml == $oldHtml, self::isTrue(), $message);
    }

    protected function getHtml()
    {
        return $this->response->getContent();
    }

    protected function getPath()
    {
        return $this->path;
    }

    protected function getEscapedPath()
    {
        return $this->snapshotDir.str_replace('/', '_', $this->getPath()).'.snap';
    }

    protected function snapshotExists()
    {
        return file_exists($this->getEscapedPath());
    }

    protected function processHtml($html)
    {
        return preg_replace('/(<input type="hidden"[^>]+\>|<meta name="csrf-token" content="([a-zA-Z0-9]+)">)/i', '', $html);
    }

    protected function saveSnapshot()
    {
        $html = $this->processHtml($this->getHtml());
        file_put_contents($this->getEscapedPath(), $html);
    }

    protected function getOldHtml()
    {
        return file_get_contents($this->getEscapedPath());
    }
}
```

The `goto()` method sets the current path on the object, then fetches the page. It verifies the page was found, and then returns an instance of the object, to allow for method chaining.

Another method of note is the `saveHtml()` method. This checks to see if the snapshot exists - if not, it saves it. The snapshot is essentially just the HTML returned from that route, but certain content may need to be stripped out, which is done in the `processHtml()` method. In this case we've stripped out hidden fields and the CSRF token meta tag, as CSRF tokens are generated anew each time and will break the snapshots.

The last method we'll look at is the `assertSnapshotsMatch()` method. This will get the current HTML, and that for any snapshot for that route, and then compare them. If they differ, it will fail the assertion. In addition, if `xdiff_string_diff` is available, it will show a diff of the two files - be warned, these can sometimes be large, but they can be helpful in debugging.

Also, note our snapshots directory - `tests/snapshots`. If you do make a breaking change and want to delete a snapshot, then you can find it in there - the format replaces forward slashes with underscores, and appends a file extension of `.snap`,  but feel free to customise this to your needs.

Next, we'll create a test for routes that don't require authentication, at `tests/GoldenMaster/ExampleTest.php`:

```php
<?php

namespace Tests\GoldenMaster;

use Tests\GoldenMasterTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\User;

class ExampleTest extends GoldenMasterTestCase
{
    use RefreshDatabase;

    /**
     * @dataProvider nonAuthDataProvider
     */
    public function testNonAuthPages($data)
    {
        $this->goto($data)
            ->saveHtml()
            ->assertSnapshotsMatch();
    }

    public function nonAuthDataProvider()
    {
        return [
            ['/register'],
            ['/login'],
        ];
    }
}
```

Note the use of the data provider. We want to be able to step through a list of routes, and verify each in turn, so it makes sense to set up a data provider method as `nonAuthDataProvider()`, which will return an array of routes. If you haven't used data providers before, they are an easy way to reduce boilerplate in your tests when you need to test the same thing over and over with different data, and you can learn more [here](https://tighten.co/blog/tidying-up-your-phpunit-tests-with-data-providers).

Now, having seen the methods used, it should be easy to understand `testNonAuthPages()`. It goes through the following steps:

* Visit the route passed through, eg `/register`
* Save the HTML to a snapshot, if not already saved
* Assert that the current content matches the snapshot

Using this method, you can test a lot of routes for unexpected changes quite easily. If you've used snapshot tests with something like Jest, this is a similar approach.

Authenticated routes
--------------------

This won't quite work with authenticated routes, so a few more changes are required. You'll get a response, but if you look at the HTML it will clearly show the user is being redirected for all of them, so there's not much point in testing them.

If your content does not differ between users, you can add the trait `Illuminate\Foundation\Testing\WithoutMiddleware` to your test to disable the authentication and allow the test to get the content without being redirected.

If, however, your content does differ between users, you need to instead create a user object, and use the `actingAs()` method already available in Laravel tests to set the user, as follows:

```php
<?php

namespace Tests\GoldenMaster;

use Tests\GoldenMasterTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\User;

class ExampleTest extends GoldenMasterTestCase
{
    use RefreshDatabase;

    /**
     * @dataProvider authDataProvider
     */
    public function testAuthPages($data)
    {
        $user = factory(User::class)->create([
            'email' => 'eric@example.com',
            'name' => 'Eric Smith',
            'password' => 'password'
        ]);
        $this->actingAs($user)
            ->goto($data)
            ->saveHtml()
            ->assertSnapshotsMatch();
    }

    public function authDataProvider()
    {
        return [
            ['/'],
        ];
    }
}
```

This will allow us to visit a specific page as a user, without being redirected.

Summary
-------

This can be a useful technique to catch unexpected breakages in applications, particularly ones which have little or no conventional test coverage. While I originated this technique on a Zend 1 legacy code base, leveraging the tools available in Laravel makes this technique much faster and more useful. If your existing Laravel application is not as well tested as you'd like, and you have some substantial changes to make that risk breaking some of the functionality, having these sorts of golden master tests set up can be a quick and easy way of catching any problems as soon as possible.
