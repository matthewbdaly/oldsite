---
title: "Integrating Behat with Laravel"
date: 2017-02-18 21:25:57 +0000
categories:
- php
- laravel
- behat
- tdd
- bdd
- testing
comments: true
---

The Gherkin format used by tools like Cucumber is a really great way of specifying how your application will work. It's easy for even non-technical stakeholders to understand, it makes it natural to break your tests into easily reusable steps, and it encourages you to think about the application from an end-user's perspective. It's also one of the easiest ways to get started writing automated tests when you first start out - it's much more intuitive to a junior developer than lower-level unit tests, and is easier to add to a legacy project that may not have been built with testability in mind - if you can drive a browser, you can test it.

[Behat](http://behat.org/en/latest/) is a PHP equivalent. Combined with [Mink](http://mink.behat.org/en/latest/), it allows for easy automated acceptance tests of a PHP application. However, out of the box it doesn't integrate well with Laravel. There is [Jeffrey Way's Behat Laravel extension](https://github.com/laracasts/Behat-Laravel-Extension), but it doesn't seem to be actively maintained and seems to be overkill for this purpose. I wanted something that I could use to run integration tests using PHPUnit's assertions and Laravel's testing utilities, and crucially, I wanted to do so as quickly as possible. That meant running a web server and using an automated web browser wasn't an option. Also, I often work on REST API's, and browser testing isn't appropriate for those - in API tests I'm more interested in setting up the fixtures, making a single request, and verifying that it does what it's meant to do, as quickly as possible.

As it turns out, integrating Behat and Laravel isn't that hard. When using Behat, your `FeatureContext.php` file must implement the `Behat\Behat\Context\Context` interface, but as this interface does not implement any methods, you can extend any existing class and declare that it implements that interface. That means we can just extend the existing `Tests\TestCase` class in Laravel 5.4 and gain access to all the same testing utilities we have in our regular Laravel tests.

Then, in the constructor we can set environment variables using `putenv()` so that we can set it up to use an in-memory SQLite database for faster tests. We also use the `@BeforeScenario` hook to migrate the database before each scenario, and the `@AfterScenario` hook to roll it back afterwards.

Here's the finished example:

```php
<?php

use Behat\Behat\Context\Context;
use Behat\Gherkin\Node\PyStringNode;
use Behat\Gherkin\Node\TableNode;
use Tests\TestCase;
use Behat\Behat\Tester\Exception\PendingException;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use App\User;
use Behat\Behat\Hook\Scope\BeforeScenarioScope;
use Behat\Behat\Hook\Scope\AfterScenarioScope;
use Illuminate\Contracts\Console\Kernel;

/**
 * Defines application features from the specific context.
 */
class FeatureContext extends TestCase implements Context
{
    use DatabaseMigrations;

    protected $content;

    /**
     * Initializes context.
     *
     * Every scenario gets its own context instance.
     * You can also pass arbitrary arguments to the
     * context constructor through behat.yml.
     */
    public function __construct()
    {
        putenv('DB_CONNECTION=sqlite');
        putenv('DB_DATABASE=:memory:');
        parent::setUp();
    }

    /** @BeforeScenario */
    public function before(BeforeScenarioScope $scope)
    {
        $this->artisan('migrate');

        $this->app[Kernel::class]->setArtisan(null);
    }

    /** @AfterScenario */
    public function after(AfterScenarioScope $scope)
    {
        $this->artisan('migrate:rollback');
    }

    /**
     * @Given I visit the path :path
     */
    public function iVisitThePath($path)
    {
        $response = $this->get('/');
        $this->assertEquals(200, $response->getStatusCode());
        $this->content = $response->getContent();
    }

    /**
     * @Then I should see the text :text
     */
    public function iShouldSeeTheText($text)
    {
        $this->assertContains($text, $this->content);
    }

    /**
     * @Given a user called :user exists
     */
    public function aUserCalledExists($user)
    {
        $user = factory(App\User::class)->create([
            'name' => $user,
        ]);
    }

    /**
     * @Given I am logged in as :user
     */
    public function iAmLoggedInAs($user)
    {
        $user = User::where('name', $user)->first();
        $this->be($user);
    }

}
```

Note that I've added a few basic example methods for our tests. As you can see, we can call the same methods we normally use in Laravel tests to make assertions and HTTP requests. If you're using Dusk, you can also call that in the same way you usually would.

We might then write the following feature file to demonstrate our application at work:

```gherkin
Feature: Login

    Background:
        Given a user called "Alan" exists
        And a user called "Bob" exists
        And a user called "Clare" exists
        And a user called "Derek" exists
        And a user called "Eric" exists

    Scenario: Log in as Alan
        Given I am logged in as "Alan"
        And I visit the path "/"
        Then I should see the text "Laravel"

    Scenario: Log in as Bob
        Given I am logged in as "Bob"
        And I visit the path "/"
        Then I should see the text "Laravel"

    Scenario: Log in as Clare
        Given I am logged in as "Clare"
        And I visit the path "/"
        Then I should see the text "Laravel"

    Scenario: Log in as Derek
        Given I am logged in as "Derek"
        And I visit the path "/"
        Then I should see the text "Laravel"

    Scenario: Log in as Eric
        Given I am logged in as "Eric"
        And I visit the path "/"
        Then I should see the text "Laravel"
```

We can then run these tests with `vendor/bin/behat`:

```bash
$ vendor/bin/behat 
Feature: Login

  Background:                         # features/auth.feature:3
    Given a user called "Alan" exists # FeatureContext::aUserCalledExists()
    And a user called "Bob" exists    # FeatureContext::aUserCalledExists()
    And a user called "Clare" exists  # FeatureContext::aUserCalledExists()
    And a user called "Derek" exists  # FeatureContext::aUserCalledExists()
    And a user called "Eric" exists   # FeatureContext::aUserCalledExists()

  Scenario: Log in as Alan               # features/auth.feature:10
    Given I am logged in as "Alan"       # FeatureContext::iAmLoggedInAs()
    And I visit the path "/"             # FeatureContext::iVisitThePath()
    Then I should see the text "Laravel" # FeatureContext::iShouldSeeTheText()

  Scenario: Log in as Bob                # features/auth.feature:15
    Given I am logged in as "Bob"        # FeatureContext::iAmLoggedInAs()
    And I visit the path "/"             # FeatureContext::iVisitThePath()
    Then I should see the text "Laravel" # FeatureContext::iShouldSeeTheText()

  Scenario: Log in as Clare              # features/auth.feature:20
    Given I am logged in as "Clare"      # FeatureContext::iAmLoggedInAs()
    And I visit the path "/"             # FeatureContext::iVisitThePath()
    Then I should see the text "Laravel" # FeatureContext::iShouldSeeTheText()

  Scenario: Log in as Derek              # features/auth.feature:25
    Given I am logged in as "Derek"      # FeatureContext::iAmLoggedInAs()
    And I visit the path "/"             # FeatureContext::iVisitThePath()
    Then I should see the text "Laravel" # FeatureContext::iShouldSeeTheText()

  Scenario: Log in as Eric               # features/auth.feature:30
    Given I am logged in as "Eric"       # FeatureContext::iAmLoggedInAs()
    And I visit the path "/"             # FeatureContext::iVisitThePath()
    Then I should see the text "Laravel" # FeatureContext::iShouldSeeTheText()

5 scenarios (5 passed)
40 steps (40 passed)
0m0.50s (19.87Mb)
```

Higher level tests can get very tedious if you're not careful - you wind up setting up the same fixtures and making the same requests many times over. By using Behat in this way, not only are you writing your tests in a way that is easy to understand, but you're also breaking it down into logical, repeatable steps, and by passing arguments in each step you limit the amount of repetition. It's also fast if you aren't running browser-based tests, making it particularly well-suited to API testing.
