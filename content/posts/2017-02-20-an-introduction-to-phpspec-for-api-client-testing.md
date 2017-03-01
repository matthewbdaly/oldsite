---
title: "An introduction to PHPSpec for API client testing"
date: 2017-02-19 20:05:04 +0000
categories:
- php
- testing
- tdd
comments: true
draft: true
---

Recently I had the occasion to try [PHPSpec](http://www.phpspec.net/en/stable/) for an API client project at work. It lacks the mindshare of PHPUnit, but for certain use cases I've found it to work much better, and API clients are one of those use cases.

One of the main differences I've found when using PHPSpec is that it makes it much more natural to embrace the red-green-refactor cycle of test-driven development. It also reduces the amount of boilerplate code you have to create manually - instead PHPSpec will generate the boilerplate for the classes you need. I've found working with PHPSpec to be some of the most enjoyable development I've ever done.

In this tutorial we'll use PHPSpec to build a generic REST API client that supports multiple services. I'll show you how to create tests for our client, and then use them to create the outline of each class. I'll also show you how to mock your dependencies easily so that each test is focused purely on the relevant class.

What we'll build
----------------

If you use any third-party services within a web or mobile app you build, there's always the worry that if something happens to those services, such as them closing down or their conditions changing to such an extent that it's no longer practical for you to continue using them, then you may need to rewrite some of your application to use a new service. They may offer great client libraries of their own, but if you use those libraries you have to be aware that switching to a different provider could be problematic.

However, if you use a more generic library that allows you to interact with multiple providers using the same interface, then switching becomes trivial. For instance, in 2015 I worked on a Laravel application that sent emails via Mandrill, using Laravel's Mail class. When Mandrill announced changes that made it impractical to continue using them, switching provider was a matter of merely switching the driver used.

SMS messaging is a similar proposition - ideally you want to be able to switch provider if a better deal becomes available. By implementing a system of interchangeable drivers, we can easily deal with multiple providers using the same interface, minimising the cost.

Which providers will we support?
--------------------------------

While I haven't had the occasion to implement SMS messaging before now, it is something that can be useful for all kinds of applications, and having the freedom to switch provider quickly and easily is potentially very useful. We will build drivers for [TextLocal](https://www.textlocal.com) and [Clockwork](https://www.clockworksms.com/), however if you understand the basic principles it should be straightforward to implement a driver for another provider if they have a suitable REST API. Even if they don't have a REST API, then you could still build a suitable driver that uses other methods, such as sending an email to a mail-to-SMS gateway.

If you want to implement a driver for another provider as an exercise for the reader, I am hosting the project we built on [Github](https://github.com/matthewbdaly/sms-client), so please feel free to fork it, implement your driver, and submit a merge request. As long as it appears to work and doesn't break the build, I'll be happy to accept it.

Getting started
---------------

First, let's create a folder for our library:

```bash
$ mkdir ~/Projects/sms-client
$ cd ~ /Projects/sms-client
```

Next, you can either run `composer init` to define your dependencies interactively, or copy and paste the following `composer.json` and amend it accordingly:

```json
{
    "name": "matthewbdaly/sms-client",
    "description": "A generic SMS client library. Supports multiple swappable drivers.",
    "type": "library",
    "require": {
        "guzzlehttp/guzzle": "^6.2"
    },
    "require-dev": {
        "psy/psysh": "^0.8.0",
        "phpspec/phpspec": "^3.2",
        "squizlabs/php_codesniffer": "^2.7"
    },
    "license": "MIT",
    "authors": [
        {
            "name": "Matthew Daly",
            "email": "matthewbdaly@gmail.com"
        }
    ],
    "autoload": {
        "psr-4": {
            "Matthewbdaly\\SMS\\": "src/"
        }
    }

}
```

Note the addition of the `autoload` section must be done manually. With that done, run `composer install` to add these dependencies.

Next, we need to add our PHPSpec config. Save this as `phpspec.yml`, adjusting the namespace as necessary:

````yaml
suites:
    test_suite:
        namespace: Matthewbdaly\SMS
        psr4_prefix: Matthewbdaly\SMS
```

Note that we're using [PSR4](http://www.php-fig.org/psr/psr-4/) for our namespace here. If, like me, you're also using Travis CI to run your tests, here's a working `.travis.yml` file for you. Other continuous integration services should be straightforward to set up:

```yaml
language: php

php:
    - 5.6
    - 7.0
    - 7.1
    - hhvm

before_script:
    - travis_retry composer self-update
    - travis_retry composer install --no-interaction --prefer-source --dev

script: vendor/bin/phpspec run
```

If you want to test against different PHP versions, it should be straightforward to amend this as required.

Creating our first class
------------------------

To get started on our client proper, run this command:

```bash
$ vendor/bin/phpspec desc Matthewbdaly/SMS/Client
Specification for Matthewbdaly\SMS\Client created in /home/matthew/Projects/sms-client/spec/ClientSpec.php.
```

Note how we get feedback saying that the spec class has been created? Let's take a look at `spec/ClientSpec.php`:

```php
<?php

namespace spec\Matthewbdaly\SMS;

use Matthewbdaly\SMS\Client;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;

class ClientSpec extends ObjectBehavior
{
    function it_is_initializable()
    {
        $this->shouldHaveType(Client::class);
    }
}
```

Some aspects of PHPSpec take a little getting used to. Within a spec file, `$this` doesn't refer to the spec class as you'd normally expect. Instead, it refers to the class being tested. It's logical, but it's not what you'd normally see in a PHP class.

Here we can clearly see that our first test has been generated for us, and it verifies that our class is an instance of `Matthewbdaly\SMS\Client`. Next, let's run our test with the following command:

```bash
$ vendor/bin/phpspec run
```

You'll be prompted to create the class - enter Y for this. Once finished, you should see something like this:

```bash
Matthewbdaly/SMS/Client                                                         
  11  - it is initializable
      class Matthewbdaly\SMS\Client does not exist.

                                      100%                                       1
1 specs
1 example (1 broken)
5ms

                                                                                
  Do you want me to create `Matthewbdaly\SMS\Client` for you?                   
                                                                         [Y/n]
y
Class Matthewbdaly\SMS\Client created in /home/matthew/Projects/sms-client/src/Client.php.

                                      100%                                       1
1 specs
1 example (1 passed)
5ms
```

Note that the test now passes. Let's take a look at the newly created `src/Client.php`:

```php
<?php

namespace Matthewbdaly\SMS;

class Client
{
}
```

Not much to it so far, just the minimum to make that first test pass.

Planning our API client
-----------------------

At this point, it's a good idea to take stock and think about how we want our API client to work. We will use [Guzzle](http://docs.guzzlephp.org/en/latest/) to actually send the HTTP requests for each API. Not only is it efficient, well-tested and easy to work with, but it also means we can easily mock it in our tests, ensuring that no actual network requests are made during the tests and we don't have embarrassing test messages going to end users if something is misconfigured.

(Note that individual drivers don't have to depend on Guzzle. We could write a driver that used Curl to send the request, or even one that sent an email to an SMS gateway using Swiftmailer, but as long as the driver implements the same interface, we can use it in the same way.)

However, Guzzle is still too low-level for us to use directly in our client class. Storing the logic for multiple different SMS APIs in the client would make it painful to maintain, so we really need to have a system of interchangeable drivers that allows us to store the logic for each API in the appropriate driver and then just load the driver we want.

Fortunately, we have an easy way to implement this in the shape of [interfaces](http://php.net/manual/en/language.oop5.interfaces.php). By defining an interface for our drivers, we can specify a set of methods that each driver must implement. However, we do not specify the content of any of these methods. Then, our client can specify only that the driver must implement our interface, and as long as they do so, the drivers can all be interacted with in the same way. I've found interfaces to be one of the most useful things I've ever learned in PHP, and if you haven't used them before, I'm sure you'll grow to like them. An additional advantage is that they can be mocked, so you can create a mock of your interface and test something that relies on that interface without having to actually create any classes that implement that interface. Not sure what that means? Don't worry, it'll all become clear in time.

We'll also want to create our own custom exceptions for various events so that they can be handled by the application in whatever way the developer sees fit.

First let's create our driver interface. Save this as `src/Contracts/Driver.php`:

```php
<?php

namespace Matthewbdaly\SMS\Contracts;

interface Driver
{
    public function getDriver();

    public function getEndpoint();

    public function sendRequest(array $message);
}
```

We have specified three methods here. The first one will return the name of the driver, the second will return the API endpoint, if applicable, and the third will accept the request.

With the driver interface in place, we can now start thinking about how our client will work, without having to actually implement a working driver. The constructor will need to accept the driver to use as a parameter, so we need to implement the constructor. But we should write our test first. Amend `spec/ClientSpec.php` as follows:

```php
<?php

namespace spec\Matthewbdaly\SMS;

use Matthewbdaly\SMS\Client;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;
use Matthewbdaly\SMS\Contracts\Driver;

class ClientSpec extends ObjectBehavior
{
    function let(Driver $driver)
    {
        $this->beConstructedWith($driver);
    }

    function it_is_initializable()
    {
        $this->shouldHaveType(Client::class);
    }
}
```

Note the `let()` method. This specifies the default arguments passed to our `Client` class's constructor in our tests. In this case, we're specifying that it should be constructed with an instance of the `Driver` interface. Even though we don't yet have a working driver that implements this interface, this is sufficient for us to test our client class for now because it's being automatically mocked our for us.

If we run our tests, we should be prompted to add our constructor:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/SMS/Client                                                         
  17  - it is initializable
      method Matthewbdaly\SMS\Client::__construct not found.

                                      100%                                       1
1 specs
1 example (1 broken)
8ms

                                                                                
  Do you want me to create `Matthewbdaly\SMS\Client::__construct()` for you?    
                                                                         [Y/n] 
y
  Method Matthewbdaly\SMS\Client::__construct() has been created.
  
                                      100%                                       1
1 specs
1 example (1 passed)
8ms

```

As before, note we haven't had to create the constructor manually - PHPSpec has created a placeholder. Let's check it out:

```php
<?php

namespace Matthewbdaly\SMS;

class Client
{
    public function __construct($argument1)
    {
        // TODO: write logic here
    }
}
```

Let's amend it do require an instance of our `Driver` interface:

```php
<?php

namespace Matthewbdaly\SMS;

use Matthewbdaly\SMS\Contracts\Driver;

class Client
{
    public function __construct(Driver $driver)
    {
        // TODO: write logic here
    }
}
```

Let's run our tests to make sure they pass:

```bash
$ vendor/bin/phpspec run
                                      100%                                       1
1 specs
1 example (1 passed)
8ms
```

Now, our constructor doesn't actually do anything so far. We'll want it to store the driver in the `Client` object, which should then return the name of the driver when queried. First, we add it to the spec:

```php
<?php

namespace spec\Matthewbdaly\SMS;

use Matthewbdaly\SMS\Client;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;
use Matthewbdaly\SMS\Contracts\Driver;

class ClientSpec extends ObjectBehavior
{
    function let(Driver $driver)
    {
        $this->beConstructedWith($driver);
    }

    function it_is_initializable()
    {
        $this->shouldHaveType(Client::class);
    }

    function it_returns_the_driver_name(Driver $driver)
    {
        $driver->getDriver()->willReturn('Test');
        $this->getDriver()->shouldReturn('Test');
    }
}
```

Here, we specify that when the `getDriver()` method of our driver is called, it should return `Test`. Next, we call our client's `getDriver()` method, which should call the method of the same name on the driver, and we should get `Test` back as the response.

Then, we can generate our boilerplate by running our tests:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/SMS/Client                                                         
  22  - it returns the driver name
      method Matthewbdaly\SMS\Client::getDriver not found.

                  50%                                     50%                    2
1 specs
2 examples (1 passed, 1 broken)
9ms

                                                                                
  Do you want me to create `Matthewbdaly\SMS\Client::getDriver()` for you?      
                                                                         [Y/n]
y
  Method Matthewbdaly\SMS\Client::getDriver() has been created.
  
Matthewbdaly/SMS/Client                                                           
  22  - it returns the driver name
      expected "Test", but got null.

                  50%                                     50%                    2
1 specs
2 examples (1 passed, 1 failed)
9ms
```

Note that our test fails because it doesn't yet implement the expected behaviour. A look at `src/Client.php` will explain why:

```php
<?php

namespace Matthewbdaly\SMS;

use Matthewbdaly\SMS\Contracts\Driver;

class Client
{
    public function __construct(Driver $driver)
    {
        // TODO: write logic here
    }

    public function getDriver()
    {
        // TODO: write logic here
    }
}
```

Neither our constructor nor our new method do anything. It's time to change that:

```php
<?php

namespace Matthewbdaly\SMS;

use Matthewbdaly\SMS\Contracts\Driver;

class Client
{
    private $driver;

    public function __construct(Driver $driver)
    {
        $this->driver = $driver;
    }

    public function getDriver()
    {
        return $this->driver->getDriver();
    }
}
```

This should make our tests pass:

```bash
$ vendor/bin/phpspec run
                                      100%                                       2
1 specs
2 examples (2 passed)
10ms
```

And it has. Notice that the natural flow of PHPSpec is for you to run your tests frequently, in order to generate the boilerplate for your classes. Any new methods you call in a test can be automatically added without lifting a finger. PHPSpec won't write the body of the method, but it will automate away writing lots of tedious boilerplate and makes test-driven development feel very natural.

Next, we will implement a method to send the request:

```php
<?php

namespace spec\Matthewbdaly\SMS;

use Matthewbdaly\SMS\Client;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;
use Matthewbdaly\SMS\Contracts\Driver;

class ClientSpec extends ObjectBehavior
{
    function let(Driver $driver)
    {
        $this->beConstructedWith($driver);
    }

    function it_is_initializable()
    {
        $this->shouldHaveType(Client::class);
    }

    function it_returns_the_driver_name(Driver $driver)
    {
        $driver->getDriver()->willReturn('Test');
        $this->getDriver()->shouldReturn('Test');
    }

    function it_sends_a_message(Driver $driver)
    {
        $msg = [
            'to' => '+44 01234 567890',
            'content' => 'Just testing'
        ];
        $driver->sendRequest($msg)->willReturn(true);
        $this->send($msg)->shouldReturn(true);
    }
}
```

Our argument passed to the `send()` method of the client is an array containing the recipient phone number and the content of the message to send. As the goal is to maintain a consistent interface across drivers, the drivers can handle any formatting of the recipient or content that those services require, as well as adding any additional fields. Our client should receive `true` from the mocked driver, and should in turn return the same response.

Running the tests will again result in us being prompted to create the required method:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/SMS/Client                                                           
  28  - it sends a message
      method Matthewbdaly\SMS\Client::send not found.

                         66%                                     33%             3
1 specs
3 examples (2 passed, 1 broken)
10ms

                                                                                
  Do you want me to create `Matthewbdaly\SMS\Client::send()` for you?           
                                                                         [Y/n] 
y
  Method Matthewbdaly\SMS\Client::send() has been created.
  
Matthewbdaly/SMS/Client                                                           
  28  - it sends a message
      expected true, but got null.

                         66%                                     33%             3
1 specs
3 examples (2 passed, 1 failed)
10ms
```

Our test will then fail. Let's make it pass:

```php
<?php

namespace Matthewbdaly\SMS;

use Matthewbdaly\SMS\Contracts\Driver;

class Client
{
    private $driver;

    public function __construct(Driver $driver)
    {
        $this->driver = $driver;
    }

    public function getDriver()
    {
        return $this->driver->getDriver();
    }

    public function send($msg)
    {
        return $this->driver->sendRequest($msg);
    }
}
```

And time to run our tests again:

```bash
$ vendor/bin/phpspec run
                                      100%                                       3
1 specs
3 examples (3 passed)
9ms
```

Now we have a working version of our client, we can move on to start implementing our drivers.

Our first driver
----------------

The first driver will be a "null" driver. It will do nothing with any requests it receives, and will simply return `true`. As such, it will be useful for testing purposes. Afterwards, we will implement our other two drivers. Run the following command to create the spec:

```bash
$ vendor/bin/phpspec desc Matthewbdaly/SMS/Drivers/NullDriver
```

Then we can run the tests and create the class:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/SMS/Drivers/NullDriver                                               
  11  - it is initializable
      class Matthewbdaly\SMS\Drivers\NullDriver does not exist.

                            75%                                     25%          4
2 specs
4 examples (3 passed, 1 broken)
12ms

                                                                                
  Do you want me to create `Matthewbdaly\SMS\Drivers\NullDriver` for you?       
                                                                         [Y/n] 
y
Class Matthewbdaly\SMS\Drivers\NullDriver created in /home/matthew/Projects/sms-client/src/Drivers/NullDriver.php.

                                      100%                                       4
2 specs
4 examples (4 passed)
9ms
```

Next, we need to ensure it implements our interface:

```php
<?php

namespace spec\Matthewbdaly\SMS\Drivers;

use Matthewbdaly\SMS\Drivers\NullDriver;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;

class NullDriverSpec extends ObjectBehavior
{
    function it_is_initializable()
    {
        $this->shouldHaveType(NullDriver::class);
    }

    function it_implements_interface()
    {
        $this->shouldImplement('Matthewbdaly\SMS\Contracts\Driver');
    }
}
```

Our next test run should fail:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/SMS/Drivers/NullDriver                                               
  16  - it implements interface
      expected an instance of Matthewbdaly\SMS\Contracts\Driver, but got
      [obj:Matthewbdaly\SMS\Drivers\NullDriver].

                              80%                                     20%        5
2 specs
5 examples (4 passed, 1 failed)
11ms
```

To make it pass, we first ensure our driver implements the interface:

```php
<?php

namespace Matthewbdaly\SMS\Drivers;

use Matthewbdaly\SMS\Contracts\Driver;

class NullDriver implements Driver
{
}
```

Running the tests will raise another issue:

```bash
$ vendor/bin/phpspec run
✘ Fatal error happened while executing the following                             1
    it is initializable 
    Class Matthewbdaly\SMS\Drivers\NullDriver contains 3 abstract methods and must therefore be declared abstract or implement the remaining methods (Matthewbdaly\SMS\Contracts\Driver::getDriver, Matthewbdaly\SMS\Contracts\Driver::getEndpoint, Matthewbdaly\SMS\Contracts\Driver::sendRequest) in /home/matthew/Projects/sms-client/src/Drivers/NullDriver.php on line 7 
```

For our class to implement this interface, we need to add the missing methods. For now, we'll create them, but leave them empty:

```php
<?php

namespace Matthewbdaly\SMS\Drivers;

use Matthewbdaly\SMS\Contracts\Driver;

class NullDriver implements Driver
{
    public function getDriver()
    {
    }

    public function getEndpoint()
    {
    }

    public function sendRequest(array $message)
    {
    }
}
```

That should get us back to a passing test:

```bash
$ vendor/bin/phpspec run
                                      100%                                       5
2 specs
5 examples (5 passed)
9ms
```

Our next step is to make sure that our driver allows us to pass through a Guzzle client and response object to the constructor. Amend it as follows:

```php
<?php

namespace spec\Matthewbdaly\SMS\Drivers;

use Matthewbdaly\SMS\Drivers\NullDriver;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;
use GuzzleHttp\Client as GuzzleClient;
use GuzzleHttp\Psr7\Response as GuzzleResponse;

class NullDriverSpec extends ObjectBehavior
{
    function let(GuzzleClient $client, GuzzleResponse $response)
    {
        $this->beConstructedWith($client, $response);
    }

    function it_is_initializable()
    {
        $this->shouldHaveType(NullDriver::class);
    }

    function it_implements_interface()
    {
        $this->shouldImplement('Matthewbdaly\SMS\Contracts\Driver');
    }
}
```

Running PHPSpec again should allow us to set up the constructor:

```bash
$ vendor/bin/phpspec run
                                      100%                                       5
2 specs
5 examples (5 passed)
25ms

matthew@matthew-XPS-13-9343:~/Projects/sms-client$ vendor/bin/phpspec run
Matthewbdaly/SMS/Drivers/NullDriver                                             
  18  - it is initializable
      method Matthewbdaly\SMS\Drivers\NullDriver::__construct not found.

Matthewbdaly/SMS/Drivers/NullDriver                                             
  23  - it implements interface
      method Matthewbdaly\SMS\Drivers\NullDriver::__construct not found.

                      60%                                     40%                5
2 specs
5 examples (3 passed, 2 broken)
34ms

                                                                                
  Do you want me to create                                                      
  `Matthewbdaly\SMS\Drivers\NullDriver::__construct()` for you?                 
                                                                         [Y/n]
y
  Method Matthewbdaly\SMS\Drivers\NullDriver::__construct() has been created.
  
                                      100%                                       5
2 specs
5 examples (5 passed)
18ms
```

Now, the driver should look like this:

```php
<?php

namespace Matthewbdaly\SMS\Drivers;

use Matthewbdaly\SMS\Contracts\Driver;

class NullDriver implements Driver
{
    public function __construct($argument1, $argument2)
    {
        // TODO: write logic here
    }

    public function getDriver()
    {
    }

    public function getEndpoint()
    {
    }

    public function sendRequest(array $message)
    {
    }
}
```

The constructor accepts two arguments, but they are not the correct ones. Let's fix that.


Next, let's get the `getDriver()` method working. Add this method to the spec:


So let's make them pass:



Summary
-------

I personally have found that working with PHPSpec often feels more intuitive than PHPUnit. It minimises the amount of boilerplate I have to write, offers a more intuitive API, and makes it absurdly easy to mock my dependencies when writing tests. While I'm not sure I'd want to use it for testing a Laravel application, I've found that it shines when building API clients.
