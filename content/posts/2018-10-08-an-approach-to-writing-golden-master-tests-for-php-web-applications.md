---
title: "An approach to writing golden master tests for PHP web applications"
date: 2018-10-08 11:20:53 +0100
categories:
- php
- testing
comments: true
---

Apologies if some of the spelling or formatting on this post is off - I wrote it on a long train journey down to London, with sunlight at an inconvenient angle.

Recently I had to carry out some substantial changes to the legacy web app I maintain as the lion's share of my current job. The client has several channels that represent different parts of the business that would expect to see different content on the home page, and access to content is limited first by channel, and then by location. The client wanted an additional channel added. Due to bad design earlier in the application's lifetime that isn't yet practical to refactor away, each type of location has its own model, so it was necessary to add a new location model. It also had to work seamlessly, in the same way as the other location types. Unfortunately, these branch types didn't use polymorphism, and instead used large switch statements, and it wasn't practical to refactor all that away in one go. This was therefore quite a high-risk job, especially considering the paucity of tests on a legacy code base.

I'd heard of the concept of a *golden master test* before. If you haven't heard of it before, the idea is that it works by running a process, capturing the output, and then comparing the output of that known good version against future runs. It's very much a test of last resort since, in the context of a web app, it's potentially very brittle since it depends on the state of the application remaining the same between runs to avoid false positives. I needed a set of simple "snapshot tests", similar to how snapshot testing works with Jest, to catch unexpected breakages in a large number of pages, and this approach seemed to fit the bill. Unfortunately, I hadn't been able to find a good example of how to do this for PHP applications, so it took a while to figure out something that worked.

Here is an example base test case I used for this approach:

```php
<?php

namespace Tests;

use PHPUnit_Framework_TestCase as BaseTestCase;
use Behat\Mink\Driver\GoutteDriver;
use Behat\Mink\Session;

class GoldenMasterTestCase extends BaseTestCase
{
    protected $driver;

    protected $session;

    protected $baseUrl = 'http://localhost:8000';

    protected $snapshotDir = "tests/snapshots/";

    public function setUp()
    {
        $this->driver = new GoutteDriver();
        $this->session = new Session($this->driver);
    }

    public function tearDown()
    {
        $this->session = null;
        $this->driver = null;
    }

    public function loginAs($username, $password)
    {
        $this->session->visit($this->baseUrl.'/login');
        $page = $this->session->getPage();
        $page->fillField("username", $username);
        $page->fillField("password", $password);
        $page->pressButton("Sign In");
        return $this;
    }

    public function goto($path)
    {
        $this->session->visit($this->baseUrl.$path);
        $this->assertNotEquals(404, $this->session->getStatusCode());
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
        return $this->session->getPage()->getHtml();
    }

    protected function getPath()
    {
        $url = $this->session->getCurrentUrl();
        $path = parse_url($url, PHP_URL_PATH);
        $query = parse_url($url, PHP_URL_QUERY);
        $frag = parse_url($url, PHP_URL_FRAGMENT);
        return $path.$query.$frag;
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
        return preg_replace('/<input type="hidden"[^>]+\>/i', '', $html);
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

Because this application is built with Zend 1 and doesn't have an easy way to get the HTML response without actually running the application, I was forced to use an actual HTTP client to fetch the content while the web server is running. I've used Mink together with Behat many times in the past, and the Goutte driver is fast and doesn't rely on Javascript, so that was the best bet for a simple way of retrieving the HTML. Had I been taking this approach with a Laravel application, I could have populated the testing database with a common set of fixtures, and passed a request object through the application and captured the response object's output rather than using an HTTP client, thereby eliminating the need to run a web server and making the tests faster and less brittle.

Another issue was CSRF handling. A CSRF token is, by definition, generated randomly each time the page is loaded, and so it broke those pages that had forms with CSRF tokens. The solution I came up with was to strip out the hidden input fields.

When each page is tested, the first step is to fetch the content of that page. The test case then checks to see if there's an existing snapshot. If not, the content is saved as a new snapshot file. Otherwise, the two snapshots are compared, and the test fails if they do not match.

Once that base test case was in place, it was then straightforward to extend it to test multiple pages. I wrote one test to check pages that did not require login, and another to check pages that did require login, and the paths for those pages were passed through using a data provider method, as shown below:

```php
<?php

namespace Tests\GoldenMaster;

use Tests\GoldenMasterTestCase;

class GoldenMasterTest extends GoldenMasterTestCase
{
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
            ['/login'],
        ];
    }

    /**
     * @dataProvider dataProvider
     */
    public function testPages($data)
    {
        $this->loginAs('foo', 'bar')
            ->goto($data)
            ->saveHtml()
            ->assertSnapshotsMatch();
    }

    public function dataProvider()
    {
        return [
            ['/foo'],
            ['/bar'],
        ];
    }
}
```

Be warned, this is *not* an approach I would advocate as a matter of course, and it should only ever be a last resort as an alternative to onerous manual testing for things that can't be tested in their current form. It's extremely brittle, and I've had to deal with a lot of false positives, although that would be easier if I could populate a testing database beforehand and use that as the basis of the tests. It's also very slow, with each test taking three or four seconds to run, although again this would be less of an issue if I could pass through a request object and get the response HTML directly. Nonetheless, I've found it to be a useful technique as a test of last resort for legacy applications.
