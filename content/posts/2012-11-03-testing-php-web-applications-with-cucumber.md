---
layout: post
title: "Testing PHP web applications with Cucumber"
date: 2012-11-03 16:43
comments: true
categories: 
- PHP
- ruby
- cucumber
- webdevelopment
- testing
---

Ever since I first heard of [Cucumber](http://cukes.info/), it's seemed like something I would find really useful. Like many developers, especially those who use PHP regularly, I know full well that I should make a point of writing proper automated tests for my web apps, but invariably wind up just thinking "I haven't got time to get my head around a testing framework and it'll take ages to set up, so I'll just click around and look for bugs". This does get very, very tedious quite quickly, however.

At work I've reached a point with  a web app I'm building where I needed to test it extensively to make sure it worked OK. I soon began to get very, very fed up of the repetitive clicking around necessary to test the application, so I began looking around for a solution. I gave Selenium IDE a try, but I found that to be annoyingly unreliable when recording tests. I'd heard of Cucumber, so I did some googling, found some resources, and began tinkering with that. Quite quickly, I had a few basic acceptance tests up and running that were much more reliable than Selenium IDE, and much less tedious to use than manual testing. Within a very short space of time, I realised that Cucumber was one of those tools that was going to dramatically improve my coding experience, much like when I switched from Subversion to Git.

What's so great about Cucumber compared to other acceptance testing solutions?

* Cucumber scenarios are written using Gherkin, a simple syntax that makes it easy for customers to set out exactly what behaviour they want to see. Far from being tedious requirement documents, these set out in a simple and intuitive way what should happen once the application is complete. By requiring customers to think carefully about what they want and get it down in writing, you can ensure the customer has a good idea what they want before you write any code, making it much less likely they'll turn around afterwards and say "No, that's not what we want". This, more than anything, is for me the true power of Cucumber - it allows customers and developers to easily collaborate to set out what the web app will do, and gets you automated tests into the bargain as well.
* Because Cucumber is packaged as a Ruby gem, it's easy to install it and any other Ruby modules it may require.
* You can use Capybara to test your web app. Capybara is a very handy Ruby gem that allows you to easily interact with your web app, and it allows several different drivers to be used. If you don't need JavaScript, for instance, you can use Mechanize for faster tests. If you do, you can use selenium-webdriver to automate the browser instead, and it will load an instance of Firefox and use that for testing.
* It can also be used for testing RESTful web services. HTTParty is another handy Ruby gem that can be used for testing an API.

One question you may ask is 'Why use a Ruby tool to test PHP apps?'. Well, there is [Behat](http://behat.org/), a very similar tool for PHP, so you can use that if you'd prefer. However, I personally have found that it's not too much of a problem switching context between writing Ruby code for the acceptance tests and PHP code for the application itself. Ruby also has some advantages here - [RVM](https://rvm.io/) is a very handy tool for running multiple instances of Ruby, and RubyGems makes it easy to install any additional modules you may need. You don't really need to know much Ruby to use it - this is essentially my first encounter with Ruby barring a few small tutorials, but I haven't had any significant issues with it. Finally, the Cucumber community seems to be very active, which is always a plus.

When searching for a tutorial on getting Cucumber working with PHP, I only found [one good one](http://jamieonsoftware.com/journal/2011/1/2/high-level-testing-php-applications-with-cucumber.html), and that didn't cover a lot of the issues I'd have liked to cover, not did it cover actually using Cucumber as part of the development process, so I had to puzzle out much of it myself. So hopefully, by covering more of the ground that your average PHP developer is likely to need, I can show you just how useful Cucumber can be when added to your PHP development toolkit.

In this tutorial, we'll build a very simple todo-list application using the Slim framework, but we'll use Cucumber to test it throughout to ensure that it works the way we want it to. Hopefully, by doing this, we'll get a rock-solid web app that meets our requirements exactly.

First of all, you'll want to install RVM to make it easier to manage multiple Ruby installs. You may be able to use your system's Ruby install, but RVM is usually a safer bet:

```bash
\curl -L https://get.rvm.io | bash -s stable --ruby
```

This was sufficient to install RVM on Mac OS X. On Ubuntu, I also had to install the openssl and zlib packages. Before installing RVM, use apt-get to install the required packages:

```bash
sudo apt-get install curl git git-core zlib1g-dev zlibc libxml2-dev libxslt1-dev libyaml-dev build-essential checkinstall openssl libreadline6 libreadline6-dev zlib1g libssl-dev libsqlite3-dev sqlite3 autoconf libc6-dev ncurses-dev automake libtool bison subversion pkg-config
```

Once RVM is installed, then close and reopen your terminal so that RVM is loaded. Then, install the correct packages:

```bash
rvm pkg install openssl zlib
```

Now we can install our new copy of Ruby. On Ubuntu, I had to install Ruby 1.8.7 first:

```bash
rvm install 1.8.7
rvm use 1.8.7
```

Then I installed Ruby 1.9.3:

```bash
rvm install 1.9.3 --with-openssl-dir=$HOME/.rvm/usr
```

Whereas on OS X, this is all that was required:

```bash
rvm install 1.9.3
```

Once that's done, run the following to set the version of Ruby being used

```bash
rvm use 1.9.3
```

With that done, you should be able to install the required Ruby gems. Now, you could install these manually, like this:

```bash
gem install cucumber
gem install rspec
gem install mechanize
gem install capybara
gem install selenium-webdriver
gem install capybara-mechanize
```

However, there's a more convenient way. First, create a file in the project's root directory called Gemfile and put the following content into it:

```ruby
source "http://rubygems.org"
gem "cucumber"
gem "rspec"
gem "mechanize"
gem "capybara"
gem "selenium-webdriver"
gem "capybara-mechanize"
```

Then install the Bundler gem:

```bash
gem install bundler
```

Then use Bundler to install the required gems:

```bash
bundle install
```

This makes it easier to get your project set up somewhere else because you can put the Gemfile under version control, making it easier to duplicate this setup elsewhere.

With that out of the way, let's start work on our app. To save time, we'll use the Slim framework to do some of the heavy lifting for our application. Download [Slim](http://www.slimframework.com/) and put it in a folder on your local web server.

Now, before we actually write any code, we'll set out our first Cucumber scenario. Create a folder inside the folder you put Slim inside and call it `features`. Inside it, create a new file called `todo.feature` and put the following content into it:

```gherkin
Feature: Todo

    In order to use the site
    As a user
    I want to be able to submit, view and delete to-do list items

    Scenario: New item
        Given I am on the home page
        When I click on New Item
        And I fill in the item
        And I click the button Submit
        Then I should see the new item added to the list
```

Notice how simple this is? Everything is written as an example of how an end user would interact with the site. There's nothing hard about this - it just describes what the site needs to do.

The first line is just the name of this feature. The following three lines are just a comment. Then the Scenario line gives a name to this particular scenario - a Scenario is just a series of steps that describes an action.

Then, we see the Given line. This sets out the starting conditions. Note that you can easily set out multiple starting conditions using the And keyword on subsequent lines, as we do later in the file. Here, we're just making sure we're on the home page.

Next, we see the When line. This, and the subsequent And lines, set out what actions we want to take when going through this step. In this example, we're clicking on a link marked 'New Item', filling in a text input, and clicking the Submit button. So we're already thinking about how our application is going to work, before we've written a line of code.

Finally, we see the Then line. This sets out what should have happened once we've finished going through this step. Here we want to make sure the new item has been added to the list.

Now, go to the folder you unpacked Slim into and run `cucumber` from the shell. You should see something like this:
```sh
Feature: Todo
  
    In order to use the site
    As a user
    I want to be able to submit, view and delete to-do list items

  Scenario: New item                                 # features/todo.feature:7
    Given I am on the home page                      # features/todo.feature:8
    When I click on New Item                         # features/todo.feature:9
    And I fill in the item                           # features/todo.feature:10
    And I click the button Submit                    # features/todo.feature:11
    Then I should see the new item added to the list # features/todo.feature:12

1 scenario (1 undefined)
5 steps (5 undefined)
0m0.004s

You can implement step definitions for undefined steps with these snippets:

Given /^I am on the home page$/ do
  pending # express the regexp above with the code you wish you had
end

When /^I click on New Item$/ do
  pending # express the regexp above with the code you wish you had
end

When /^I fill in the item$/ do
  pending # express the regexp above with the code you wish you had
end

When /^I click the button Submit$/ do
  pending # express the regexp above with the code you wish you had
end

Then /^I should see the new item added to the list$/ do
  pending # express the regexp above with the code you wish you had
end

If you want snippets in a different programming language,
just make sure a file with the appropriate file extension
exists where cucumber looks for step definitions.
```

At this stage, Cucumber isn't doing anything much, it's just telling you that these steps haven't been defined as yet. To define a step, you simply write some Ruby code that expresses that step.

Let's do that. Under `features`, create a new directory called `step_definitions`. Inside that, create a file called `todo_steps.rb` and paste the code snippets returned by Cucumber into it. Once that has been saved, run `cucumber` again and you should see something like this:

```bash
Feature: Todo
  
    In order to use the site
    As a user
    I want to be able to submit, view and delete to-do list items

  Scenario: New item                                 # features/todo.feature:7
    Given I am on the home page                      # features/step_definitions/todo_steps.rb:1
      TODO (Cucumber::Pending)
      ./features/step_definitions/todo_steps.rb:2:in `/^I am on the home page$/'
      features/todo.feature:8:in `Given I am on the home page'
    When I click on New Item                         # features/step_definitions/todo_steps.rb:5
    And I fill in the item                           # features/step_definitions/todo_steps.rb:9
    And I click the button Submit                    # features/step_definitions/todo_steps.rb:13
    Then I should see the new item added to the list # features/step_definitions/todo_steps.rb:17

1 scenario (1 pending)
5 steps (4 skipped, 1 pending)
0m0.004s
```

So far, the steps we've written don't actually do anything - each step contains nothing but the pending statement. We need to replace the code inside each of those steps with some Ruby code that implements that step. As the first step in this scenario is still pending, Cucumber skips all the remaining steps.

Let's implement these steps. First of all, we need to set some configuration options. In the `features` folder, create a new folder called `support`, and under that create a new file called `env.rb`. In there, place the following code:

```ruby
require 'rspec/expectations'
require 'capybara'
require 'capybara/mechanize'
require 'capybara/cucumber'
require 'test/unit/assertions'
require 'mechanize'

World(Test::Unit::Assertions)

Capybara.default_driver = :mechanize
Capybara.app_host = "http://localhost"
World(Capybara)
```

This includes all of the Ruby gems required for our purposes, and sets Capybara to use the Mechanize driver for testing web apps. If you've not heard of it before, Capybara can be thought of as a way of scripting a web browser that supports numerous drivers, some of which are headless and some of which aren't. Here we're using Mechanize, which is headless, but later on we'll use Selenium to show you how it would work with a non-headless web browser.

With that done, the next job is to actually implement the steps. Head back to `features/step_definitions/todo_steps.rb` and edit it as follows:

```ruby
Given /^I am on the home page$/ do
    visit "http://localhost/~matthewdaly/todo/index.php"
end

When /^I click on New Item$/ do
      pending # express the regexp above with the code you wish you had
end

When /^I fill in the item$/ do
      pending # express the regexp above with the code you wish you had
end

When /^I click the button Submit$/ do
      pending # express the regexp above with the code you wish you had
end

Then /^I should see the new item added to the list$/ do
      pending # express the regexp above with the code you wish you had
end
```

Don't forget to replace the URL in that first step with the one pointing at your index.php for your local copy of Slim. At this point we're only implementing the first step, so that's all we need to do for now. Once that's done, go back to the root of the web app and run `cucumber` again. You should see something like this:

```bash
Feature: Todo
  
    In order to use the site
    As a user
    I want to be able to submit, view and delete to-do list items

  Scenario: New item                                 # features/todo.feature:7
    Given I am on the home page                      # features/step_definitions/todo_steps.rb:1
    When I click on New Item                         # features/step_definitions/todo_steps.rb:5
      TODO (Cucumber::Pending)
      ./features/step_definitions/todo_steps.rb:6:in `/^I click on New Item$/'
      features/todo.feature:9:in `When I click on New Item'
    And I fill in the item                           # features/step_definitions/todo_steps.rb:9
    And I click the button Submit                    # features/step_definitions/todo_steps.rb:13
    Then I should see the new item added to the list # features/step_definitions/todo_steps.rb:17

1 scenario (1 pending)
5 steps (3 skipped, 1 pending, 1 passed)
0m0.036s
```

Our first step has passed! Now, we move onto the next step. Open features/step_definitions/todo_steps.rb again, and amend the second step definition as follows:

```ruby
When /^I click on New Item$/ do
   click_link ('New Item')
end
```

Now, hang on a minute here. This Ruby code is pretty easy to understand - it just clicks on a link with the title, ID or text 'New Item'. But we don't want to have to rewrite this step for every single link in the application. Wouldn't it be great if we could have this step definition accept any text and click on the appropriate link, so we could reuse it elsewhere? Well, we can. Change the second step to look like this:

```ruby
When /^I click on (.*)$/ do |link|
    click_link (link)
end
```

What's happening here is that we capture the text after the word 'on' using a regular expression and pass it through to the step definition as the variable `link`. Then, we have Capybara click on that link. Pretty simple, and it saves us on some work in future.

Now run `cucumber` again, and you should see something like this:

```bash
Feature: Todo
  
    In order to use the site
    As a user
    I want to be able to submit, view and delete to-do list items

  Scenario: New item                                 # features/todo.feature:7
    Given I am on the home page                      # features/step_definitions/todo_steps.rb:1
    When I click on New Item                         # features/step_definitions/todo_steps.rb:5
      no link with title, id or text 'New Item' found (Capybara::ElementNotFound)
      (eval):2:in `send'
      (eval):2:in `click_link'
      ./features/step_definitions/todo_steps.rb:6:in `/^I click on (.*)$/'
      features/todo.feature:9:in `When I click on New Item'
    And I fill in the item                           # features/step_definitions/todo_steps.rb:9
    And I click the button Submit                    # features/step_definitions/todo_steps.rb:13
    Then I should see the new item added to the list # features/step_definitions/todo_steps.rb:17

Failing Scenarios:
cucumber features/todo.feature:7 # Scenario: New item

1 scenario (1 failed)
5 steps (1 failed, 3 skipped, 1 passed)
0m0.042s
```

We've got our second step in place, but it's failing because there is no link with the text 'New Item'. Let's remedy that. Head back to the folder you put Slim in, and open index.php.

```php
<?php
require 'Slim/Slim.php';

\Slim\Slim::registerAutoloader();

$app = new \Slim\Slim();

// GET route
$app->get('/', function () {
    $template = <<<EOT
<!DOCTYPE html>
<html>
    <head>
        <title>Todo list</title>
    </head>
    <body>
        <a href="index.php/newitem">New Item</a>
    </body>
</html>
EOT;
    echo $template;
});

$app->run();
?>
```

Here I've stripped out most of the default code and comments so we can see more easily what's happening. If you haven't used Slim before, it works by letting you define routes that are accessed via HTTP GET, POST, PUT or DELETE methods, and define what the response will be to each one. Here, we've defined a simple controller for GET requests to '/', and we return a template that includes a link with the text 'New Item'.

Now, run `cucumber` again and you should see the following:

```bash
Feature: Todo
  
    In order to use the site
    As a user
    I want to be able to submit, view and delete to-do list items

  Scenario: New item                                 # features/todo.feature:7
    Given I am on the home page                      # features/step_definitions/todo_steps.rb:1
    When I click on New Item                         # features/step_definitions/todo_steps.rb:5
      Received the following error for a GET request to http://localhost/~matthewdaly/todo/newitem: '404 => Net::HTTPNotFound for http://localhost/~matthewdaly/todo/newitem -- unhandled response' (RuntimeError)
      (eval):2:in `send'
      (eval):2:in `click_link'
      ./features/step_definitions/todo_steps.rb:6:in `/^I click on (.*)$/'
      features/todo.feature:9:in `When I click on New Item'
    And I fill in the item                           # features/step_definitions/todo_steps.rb:9
    And I click the button Submit                    # features/step_definitions/todo_steps.rb:13
    Then I should see the new item added to the list # features/step_definitions/todo_steps.rb:17

Failing Scenarios:
cucumber features/todo.feature:7 # Scenario: New item

1 scenario (1 failed)
5 steps (1 failed, 3 skipped, 1 passed)
0m0.153s
```

Our second step is still failing, but only because we haven't yet defined a route for the destination when we click on the link, so let's fix that. Open up index.php again and change it to look like this:

```php
<?php
require 'Slim/Slim.php';

\Slim\Slim::registerAutoloader();

$app = new \Slim\Slim();

// GET route
$app->get('/', function () {
    $template = <<<EOT
<!DOCTYPE html>
<html>
    <head>
        <title>Todo list</title>
    </head>
    <body>
        <a href="index.php/newitem">New Item</a>
    </body>
</html>
EOT;
    echo $template;
});

$app->get('/newitem', function () {
    $template = <<<EOT
<!DOCTYPE html>
<html>
    <head>
        <title>Todo list</title>
    </head>
    <body>
        <form action="index.php/submitnewitem" method="POST">
            <label>New todo item text<input type="text" name="item" /></label>
            <input type="submit" value="Submit" />
        </form>
    </body>
</html>
EOT;
    echo $template;
});

$app->run();
?>
```

We're just adding a new route to handle what happens when we click the link here. The new page also has a form for submitting the new item.

With that done, the second step should be in place. Run `cucumber` again and you should see something like this:

```bash
Feature: Todo
  
    In order to use the site
    As a user
    I want to be able to submit, view and delete to-do list items

  Scenario: New item                                 # features/todo.feature:7
    Given I am on the home page                      # features/step_definitions/todo_steps.rb:1
    When I click on New Item                         # features/step_definitions/todo_steps.rb:5
    And I fill in the item                           # features/step_definitions/todo_steps.rb:9
      TODO (Cucumber::Pending)
      ./features/step_definitions/todo_steps.rb:10:in `/^I fill in the item$/'
      features/todo.feature:10:in `And I fill in the item'
    And I click the button Submit                    # features/step_definitions/todo_steps.rb:13
    Then I should see the new item added to the list # features/step_definitions/todo_steps.rb:17

1 scenario (1 pending)
5 steps (2 skipped, 1 pending, 2 passed)
0m0.048s
```

So onto the third step. We've already created the input for filling in the item, so all we need to do to make this step pass is write an appropriate step definition:

```ruby
When /^I fill in the item$/ do
    fill_in 'item', :with => 'Feed cat'
end
```

With that done, run `cucumber` again and this step should pass:

```bash
Feature: Todo
  
    In order to use the site
    As a user
    I want to be able to submit, view and delete to-do list items

  Scenario: New item                                 # features/todo.feature:7
    Given I am on the home page                      # features/step_definitions/todo_steps.rb:1
    When I click on New Item                         # features/step_definitions/todo_steps.rb:5
    And I fill in the item                           # features/step_definitions/todo_steps.rb:9
    And I click the button Submit                    # features/step_definitions/todo_steps.rb:13
      TODO (Cucumber::Pending)
      ./features/step_definitions/todo_steps.rb:14:in `/^I click the button Submit$/'
      features/todo.feature:11:in `And I click the button Submit'
    Then I should see the new item added to the list # features/step_definitions/todo_steps.rb:17

1 scenario (1 pending)
5 steps (1 skipped, 1 pending, 3 passed)
0m0.117s
```

Now we need to implement the step for clicking the Submit button. As with clicking on the New Item link, we can make this step generic to save us time later:

```ruby
When /^I click the button (.*)$/ do |button|
    click_button (button)
end
```

With that done, run `cucumber` again and you should see something like this:

```bash
Feature: Todo
  
    In order to use the site
    As a user
    I want to be able to submit, view and delete to-do list items

  Scenario: New item                                 # features/todo.feature:7
    Given I am on the home page                      # features/step_definitions/todo_steps.rb:1
    When I click on New Item                         # features/step_definitions/todo_steps.rb:5
    And I fill in the item                           # features/step_definitions/todo_steps.rb:9
    And I click the button Submit                    # features/step_definitions/todo_steps.rb:13
      Received the following error for a POST request to http://localhost/~matthewdaly/todo/index.php/index.php/submitnewitem: '404 => Net::HTTPNotFound for http://localhost/~matthewdaly/todo/index.php/index.php/submitnewitem -- unhandled response' (RuntimeError)
      (eval):2:in `send'
      (eval):2:in `click_button'
      ./features/step_definitions/todo_steps.rb:14:in `/^I click the button (.*)$/'
      features/todo.feature:11:in `And I click the button Submit'
    Then I should see the new item added to the list # features/step_definitions/todo_steps.rb:17

Failing Scenarios:
cucumber features/todo.feature:7 # Scenario: New item

1 scenario (1 failed)
5 steps (1 failed, 1 skipped, 3 passed)
0m0.210s
```

The step is failing here because submitting the new item generates a 404 error. We need to handle the POST. Open up index.php again and edit it to look like this:

```php
<?php
require 'Slim/Slim.php';

\Slim\Slim::registerAutoloader();

$app = new \Slim\Slim();

// GET route
$app->get('/', function () {
    $template = <<<EOT
<!DOCTYPE html>
<html>
    <head>
        <title>Todo list</title>
    </head>
    <body>
        <a href="index.php/newitem">New Item</a>
    </body>
</html>
EOT;
    echo $template;
});

$app->get('/newitem', function () {
    $template = <<<EOT
<!DOCTYPE html>
<html>
    <head>
        <title>Todo list</title>
    </head>
    <body>
        <form action="index.php/submitnewitem" method="POST">
            <label>New todo item text<input type="text" name="item" /></label>
            <input type="submit" value="Submit" />
        </form>
    </body>
</html>
EOT;
    echo $template;
});

$app->post('/submitnewitem', function () {
    $item = $_POST['item'];
    $template = <<<EOT
<!DOCTYPE html>
<html>
    <head>
        <title>Todo list</title>
    </head>
    <body>
        <p>$item</p>
    </body>
</html>
EOT;
    echo $template;
});

$app->run();
?>
```

Here we're cheating a little bit. In a working application we'd want to store the to-do list items in a database, but to keep this tutorial simple we'll just output the result of the POST request and leave implementing a database to store the items as an exercise for the reader.

Now, run `cucumber` again and you should see that this step now passes:

```bash
Feature: Todo
  
    In order to use the site
    As a user
    I want to be able to submit, view and delete to-do list items

  Scenario: New item                                 # features/todo.feature:7
    Given I am on the home page                      # features/step_definitions/todo_steps.rb:1
    When I click on New Item                         # features/step_definitions/todo_steps.rb:5
    And I fill in the item                           # features/step_definitions/todo_steps.rb:9
    And I click the button Submit                    # features/step_definitions/todo_steps.rb:13
    Then I should see the new item added to the list # features/step_definitions/todo_steps.rb:17
      TODO (Cucumber::Pending)
      ./features/step_definitions/todo_steps.rb:18:in `/^I should see the new item added to the list$/'
      features/todo.feature:12:in `Then I should see the new item added to the list'

1 scenario (1 pending)
5 steps (1 pending, 4 passed)
0m0.067s
```

On to our final step. We want to make sure the page contains the text we submitted, which is very easy to do with Capybara. Change the final step to look like this:

```ruby
Then /^I should see the new item added to the list$/ do
    page.should have_content('Feed cat')
end
```

Now run `cucumber` again and you should see that the scenario has now passed:

```bash
Feature: Todo
  
    In order to use the site
    As a user
    I want to be able to submit, view and delete to-do list items

  Scenario: New item                                 # features/todo.feature:7
    Given I am on the home page                      # features/step_definitions/todo_steps.rb:1
    When I click on New Item                         # features/step_definitions/todo_steps.rb:5
    And I fill in the item                           # features/step_definitions/todo_steps.rb:9
    And I click the button Submit                    # features/step_definitions/todo_steps.rb:13
    Then I should see the new item added to the list # features/step_definitions/todo_steps.rb:17

1 scenario (1 passed)
5 steps (5 passed)
0m0.068s
```

We're nearly done here, but first there's a couple of other handy things you can do with Cucumber that I'd like to show you. We've been using the Mechanize driver for Capybara, which is very fast and efficient. However, it's effectively a text-mode browser like Lynx, so it can't be used to test any functionality that relies on JavaScript. However, Mechanize isn't the only driver available for Capybara, and you can switch to the JavaScript driver when necessary so you can test. The default JavaScript driver is Selenium, which will launch an instance of Firefox and use that for the test.

It's easy to switch to the JavaScript driver when you need it. Just tag the scenario with @javascript, as in this example:

```gherkin
Feature: Todo

    In order to use the site
    As a user
    I want to be able to submit, view and delete to-do list items

    @javascript
    Scenario: New item
        Given I am on the home page
        When I click on New Item
        And I fill in the item
        And I click the button Submit
        Then I should see the new item added to the list
```

Now run `cucumber` again and this time it will fire up an instance of Firefox and use that to run the tests. This can also be handy for debugging purposes since, unlike with Mechanize, you can see the pages.

Finally, what about if you want to test the same functionality multiple times with different input? You don't want to have to write out multiple scenarios that are virtually identical, even if you have refactored them to make them more useful. What you need is a way to repeat the same test, only with different input each time.

Handily, Cucumber can do this too. First, let's refactor the code for our step definitions so the final step can handle any text:

```ruby
Given /^I am on the home page$/ do
    visit "http://localhost/~matthewdaly/todo/index.php"
end

When /^I click on (.*)$/ do |link|
    click_link (link)
end

When /^I fill in the item with (.*)$/ do |item|
    fill_in 'item', :with => item
end

When /^I click the button (.*)$/ do |button|
    click_button (button)
end

Then /^I should see the text (.*)$/ do |text|
    page.should have_content(text)
end
```

Here we've changed the third and fifth items so we can pass any value we want through to them. As I mentioned earlier, this is good practice since it means we don't have to write more code for our tests than we need to.

With that done, open up the feature file and amend it to look like this:

```gherkin
Feature: Todo

    In order to use the site
    As a user
    I want to be able to submit, view and delete to-do list items

    @javascript
    Scenario Outline: New item
        Given I am on the home page
        When I click on New Item
        And I fill in the item with <item>
        And I click the button Submit
        Then I should see the text <item>
    Examples:
        | item                      |   
        | Feed cat                  |   
        | Stop milk                 |   
        | Take over world           |
```

If you then run `cucumber` again, the scenario should run three times, each time entering different text:

```bash
Feature: Todo
  
    In order to use the site
    As a user
    I want to be able to submit, view and delete to-do list items

  @javascript
  Scenario Outline: New item           # features/todo.feature:8
    Given I am on the home page        # features/step_definitions/todo_steps.rb:1
    When I click on New Item           # features/step_definitions/todo_steps.rb:5
    And I fill in the item with <item> # features/step_definitions/todo_steps.rb:9
    And I click the button Submit      # features/step_definitions/todo_steps.rb:13
    Then I should see the text <item>  # features/step_definitions/todo_steps.rb:17

    Examples: 
      | item            |
      | Feed cat        |
      | Stop milk       |
      | Take over world |

3 scenarios (3 passed)
15 steps (15 passed)
0m25.936s
```

With only a few changes, we're now running the same scenario over and over again with different input, and testing the output is correct for each one. This makes it very easy to test repetitive content. For instance, if you had an e-commerce site with lots of products and you wanted to test the pages for some of the products, you could put them in a table like this. You can have more than one column if necessary, so you could write a scenario like this:

```gherkin
    Scenario Outline: Test products
        Given I am on the home page
        When I search for <product>
        And I click on the first result
        Then I should not see any errors
        And I should see the text <productname>

    Examples:
        | product           | productname                           |
        | supersprocket     | Super Sprocket 3000                   |
```

As you can see, Cucumber is a really simple way to start testing your web apps, and can really improve the quality of your code. Even if you've never used Ruby before, [Capybara's API](https://github.com/jnicklas/capybara#readme) is very simple and intuitive, and should adequately cover most of what you need to do when testing a web app.

As I mentioned, the PHP community in general has been a bit slack in terms of getting proper automated tests working. But Cucumber makes it so simple, and offers so many other benefits, such as human-readable tests and getting stakeholders more involved in the development process, that there's really no excuse not to use it. Hope you've enjoyed this tutorial, and that it's encouraged you to start using Cucumber to test your own web apps.
