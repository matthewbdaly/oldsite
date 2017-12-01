---
title: "Building a postcode lookup client with HTTPlug and PHPSpec"
date: 2017-11-28 11:40:39 +0000
categories:
- php
- tdd
- phpspec
- http
- httplug
comments: true
---

While PHPUnit is my normal go-to PHP testing framework, for some applications I find [PHPSpec](http://www.phpspec.net/en/stable/) superior, in particular REST API clients. I've found that it makes for a better flow when doing test-driven development, because it makes it very natural to write a test first, then run it, then make the test pass.

In this tutorial I'll show you how to build a lookup API client for UK postcodes. In the process of doing so, we'll use PHPSpec to drive our development process. We'll also use [HTTPlug](http://docs.php-http.org/en/latest/httplug/tutorial.html) as our underlying HTTP library. The advantage of this over using something like Guzzle is that we give library users the freedom to choose the HTTP library they feel is most appropriate to their situation.

Background
----------

If you're unfamiliar with it, the UK postcode system is our equivalent of a zip code in the US, but with two major differences:

* The codes themselves are alphanumeric instead of numeric, with the first part including one or two letters usually (but not always) derived from the nearest large town or city (eg L for Liverpool, B for Birmingham, OX for Oxford), or for London, based on the part of the city (eg NW for the north-west of London)
* A full postcode is in two parts (eg NW1 8TQ), and the first part narrows the location down to a similar area to a US-style zip code, while the second part usually narrows it down to a street (although sometimes large organisations that receive a lot of mail will have a postcode to themselves).

This means that if you have someone's postcode and house name or address, you can use those details to look up the rest of their address details. This obviously makes it easier for users to fill out a form, such as when placing an order on an e-commerce site - you can just request those two details and then autofill the rest from them.

Unfortunately, it's not quite that simple. The data is owned by Royal Mail, and they charge through the nose for access to the raw data, which places this data well outside the budgets of many web app developers. Fortunately, [Ideal Postcodes](https://ideal-postcodes.co.uk/) offer a REST API for querying this data. It's not free, but at 2.5p per request it's not going to break the bank unless used excessively, and they offer some dummy postcodes that are free to query, which is perfectly fine for testing.

For those of you outside the UK, this may not be of much immediate use, but the underlying principles will still be useful, and you can probably build a similar client for your own nation's postal code system. For instance, there's a [Zipcode API](https://www.zipcodeapi.com/API) that those of you in the US can use, and if you understand what's going on here it shouldn't be hard to adapt it to work with that. If you do produce a similar client for your country's postal code system, submit a pull request to update the README with a link to it and I'll include it.

Setting up
----------

First we'll create a `composer.json` to specify our dependencies:

```json
{
    "name": "matthewbdaly/postcode-client",
    "description": "A postcode lookup client.",
    "type": "library",
    "keywords": ["postcode"],
    "require": {
        "psr/http-message": "^1.0",
        "php-http/client-implementation": "^1.0",
        "php-http/httplug": "^1.0",
        "php-http/message-factory": "^1.0",
        "php-http/discovery": "^1.0"
    },
    "require-dev": {
        "psy/psysh": "^0.8.0",
        "phpspec/phpspec": "^3.2",
        "squizlabs/php_codesniffer": "^2.7",
        "php-http/mock-client": "^1.0",
        "php-http/message": "^1.0",
        "guzzlehttp/psr7": "^1.0"
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
            "Matthewbdaly\\Postcode\\": "src/"
        }
    }
}
```

Note that we don't install an actual HTTPlug client, other than the mock one, which is only useful for testing. This is deliberate - we're giving developers working with this library the choice of working with whatever HTTP client they see fit. We do use the Guzzle PSR7 library, but that's just for the PSR7 library.

Then we install our dependencies:

```bash
$ composer install
```

We also need to tell PHPSpec what our namespace will be. Save this as `phpspec.yml`:

```yml
suites:
    test_suite:
        namespace: Matthewbdaly\Postcode
        psr4_prefix: Matthewbdaly\Postcode
```

Don't forget to update the namespace in both files to whatever you're using, which should have a vendor name and a package name.

With that done, it's time to introduce the next component.

Introducing HTTPlug
-------------------

In the past I've usually used either Curl or Guzzle to carry out HTTP requests. However, the problem with this approach is that you're forcing whoever uses your library to use whatever HTTP client, and whatever version of that client, that you deem appropriate. If they're also using another library that someone else has written and they made different choices, you could have problems.

HTTPlug is an excellent way of solving this problem. By requiring only an interface and not a concrete implementation, using HTTPlug means that you can specify that the consumer of the library must provide a suitable implementation of that library, but leave the choice of implementation up to them. This means that they can choose whatever implementation best fits their use case. There are [adapters for many different clients](http://docs.php-http.org/en/latest/clients.html), so it's unlikely that they won't be able to find one that meets their needs.

In addition, HTTPlug provides the means to automatically determine what HTTP client to use, so that if one is not explicitly provided, it can be resolved without any action on the part of the developer. As long as a suitable HTTP adapter is installed, it will be used.

Getting started
---------------

One advantage of PHPSpec is that it will automatically generate much of the boilerplate for our client and specs. To create our client spec, run this command:

```bash
$ vendor/bin/phpspec desc Matthewbdaly/Postcode/Client
Specification for Matthewbdaly\Postcode\Client created in /home/matthew/Projects/postcode-client/spec/ClientSpec.php.
```

Now that we have a spec for our client, we can generate the client itself:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/Postcode/Client                                                    
  11  - it is initializable
      class Matthewbdaly\Postcode\Client does not exist.

                                      100%                                       1
1 specs
1 example (1 broken)
14ms

                                                                                
  Do you want me to create `Matthewbdaly\Postcode\Client` for you?              
                                                                         [Y/n] 
y
Class Matthewbdaly\Postcode\Client created in /home/matthew/Projects/postcode-client/src/Client.php.

                                      100%                                       1
1 specs
1 example (1 passed)
16ms
```

You will need to enter `Y` when prompted. We now have an empty class for our client.

Next, we need to make sure that the constructor for our client accepts two parameters:

* The HTTP client
* A message factory instance, which is used to create the request

Amend `spec/ClientSpec.php` as follows:

```php
<?php

namespace spec\Matthewbdaly\Postcode;

use Matthewbdaly\Postcode\Client;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;
use Http\Client\HttpClient;
use Http\Message\MessageFactory;

class ClientSpec extends ObjectBehavior
{
    function let (HttpClient $client, MessageFactory $messageFactory)
    {
        $this->beConstructedWith($client, $messageFactory);
    }

    function it_is_initializable()
    {
        $this->shouldHaveType(Client::class);
    }
}
```

Note the use of the `let()` method here. This lets us specify how the object is constructed, with the `beConstructedWith()` method. Also, note that `$this` refers not to the test, but to the object being tested - this takes a bit of getting used to if you're used to working with PHPUnit.

Also, note that the objects passed through are not actual instances of those objects - instead they are mocks created automatically by PHPSpec. This makes mocking extremely easy, and you can easily set up your own expectations on those mock objects in the test. If you want to use a real object, you can instantiate it in the spec as usual. If we need any other mocks, we can typehint them in our method in exactly the same way.

If we once again use `vendor/bin/phpspec run` we can now generate a constructor:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/Postcode/Client                                                    
  18  - it is initializable
      method Matthewbdaly\Postcode\Client::__construct not found.

                                      100%                                       1
1 specs
1 example (1 broken)
281ms

                                                                                
  Do you want me to create `Matthewbdaly\Postcode\Client::__construct()` for    
  you?                                                                          
                                                                         [Y/n] 
y
  Method Matthewbdaly\Postcode\Client::__construct() has been created.
  
                                      100%                                       1
1 specs
1 example (1 passed)
50ms
```

This will only create a placeholder for the constructor. You need to populate it yourself, so update `src/Client.php` as follows:

```php
<?php

namespace Matthewbdaly\Postcode;

use Http\Client\HttpClient;
use Http\Discovery\HttpClientDiscovery;
use Http\Message\MessageFactory;
use Http\Discovery\MessageFactoryDiscovery;

class Client
{
    public function __construct(HttpClient $client = null, MessageFactory $messageFactory = null)
    {
        $this->client = $client ?: HttpClientDiscovery::find();
        $this->messageFactory = $messageFactory ?: MessageFactoryDiscovery::find();
    }
}
```

A little explanation is called for here. We need two arguments in our construct:

* An instance of `Http\Client\HttpClient` to send the request
* An instance of `Http\Message\MessageFactory` to create the request

However, we don't want to force the user to create one. Therefore if they are not set, we use `Http\Discovery\HttpClientDiscovery` and `Http\Discovery\MessageFactoryDiscovery` to create them for us.

If we re-run PHPSpec, it should now pass:

```bash
$ vendor/bin/phpspec run
                                      100%                                       1
1 specs
1 example (1 passed)
31ms
```

Next, we want to have a method for retrieving the endpoint. Add the following method to `spec/ClientSpec.php`:

```php
    function it_can_retrieve_the_base_url()
    {
        $this->getBaseUrl()->shouldReturn('https://api.ideal-postcodes.co.uk/v1/postcodes/');
    }
```

Here we're asserting that fetching the base URL returns the given result. Note how much simpler and more intuitive this syntax is than PHPUnit would be:

```php
$this->assertEquals('https://api.ideal-postcodes.co.uk/v1/postcodes/', $client->getBaseUrl());
```

Running the tests again should prompt us to create the boilerplate for the new method:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/Postcode/Client                                                      
  23  - it can retrieve the base url
      method Matthewbdaly\Postcode\Client::getBaseUrl not found.

                  50%                                     50%                    2
1 specs
2 examples (1 passed, 1 broken)
40ms

                                                                                
  Do you want me to create `Matthewbdaly\Postcode\Client::getBaseUrl()` for     
  you?                                                                          
                                                                         [Y/n] 
y
  Method Matthewbdaly\Postcode\Client::getBaseUrl() has been created.
  
Matthewbdaly/Postcode/Client                                                      
  23  - it can retrieve the base url
      expected "https://api.ideal-postcod...", but got null.

                  50%                                     50%                    2
1 specs
2 examples (1 passed, 1 failed)
72ms
```

Now we need to update that method to work as expected:

```php
    protected $baseUrl = 'https://api.ideal-postcodes.co.uk/v1/postcodes/';

	 ...

    public function getBaseUrl()
    {
        return $this->baseUrl;
    }
```

This should make the tests pass:

```bash
$ vendor/bin/phpspec run
                                      100%                                       2
1 specs
2 examples (2 passed)
34ms
```

Next, we need to be able to get and set the API key. Add the following to `spec/ClientSpec.php`:

```php
    function it_can_get_and_set_the_key()
    {
        $this->getKey()->shouldReturn(null);
        $this->setKey('foo')->shouldReturn($this);
        $this->getKey()->shouldReturn('foo');
    }
```

Note that we expect `$this->setKey('foo')` to return `$this`. This is an example of a *fluent* interface - by returning an instance of the object, it enables methods to be chained, eg `$client->setKey('foo')->get()`. Obviously it won't work for anything that has to return a value, but it's a useful way of making your classes more intuitive to use.

Next, run the tests again and agree to the prompts as before:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/Postcode/Client                                                      
  28  - it can get and set the key
      method Matthewbdaly\Postcode\Client::getKey not found.

                         66%                                     33%             3
1 specs
3 examples (2 passed, 1 broken)
51ms

                                                                                
  Do you want me to create `Matthewbdaly\Postcode\Client::getKey()` for you?    
                                                                         [Y/n] 
y
  Method Matthewbdaly\Postcode\Client::getKey() has been created.
  
Matthewbdaly/Postcode/Client                                                      
  28  - it can get and set the key
      method Matthewbdaly\Postcode\Client::setKey not found.

                         66%                                     33%             3
1 specs
3 examples (2 passed, 1 broken)
43ms

                                                                                
  Do you want me to create `Matthewbdaly\Postcode\Client::setKey()` for you?    
                                                                         [Y/n] 
y
  Method Matthewbdaly\Postcode\Client::setKey() has been created.
  
Matthewbdaly/Postcode/Client                                                      
  28  - it can get and set the key
      expected [obj:Matthewbdaly\Postcode\Client], but got null.

                         66%                                     33%             3
1 specs
3 examples (2 passed, 1 failed)
52ms
```

Next, add our getter and setter for the key, as well as declaring the property `$key`:

```php
    protected $key;

    public function getKey()
    {
        return $this->key;
    }

    public function setKey(string $key)
    {
        $this->key = $key;
        return $this;
    }
```

That should make the tests pass:

```bash
$ vendor/bin/phpspec run
                                      100%                                       3
1 specs
3 examples (3 passed)
38ms
```

With that done, our final task is to be able to handle sending requests. Add the following imports at the top of `spec/ClientSpec.php`:

```php
use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\StreamInterface;
```

And add the following method at the bottom of the same file:

```php
    function it_can_send_the_request(HttpClient $client, MessageFactory $messageFactory, RequestInterface $request, ResponseInterface $response, StreamInterface $stream)
    {
        $this->beConstructedWith($client, $messageFactory);
        $this->setKey('foo');
        $data = json_encode([
            'result' => [
                "postcode" => "SW1A 2AA",
                "postcode_inward" => "2AA",
                "postcode_outward" => "SW1A",
                "post_town" => "LONDON",
                "dependant_locality" => "",
                "double_dependant_locality" => "",
                "thoroughfare" => "Downing Street",
                "dependant_thoroughfare" => "",
                "building_number" => "10",
                "building_name" => "",
                "sub_building_name" => "",
                "po_box" => "",
                "department_name" => "",
                "organisation_name" => "Prime Minister & First Lord Of The Treasury",
                "udprn" => 23747771,
                "umprn" => "",
                "postcode_type" => "L",
                "su_organisation_indicator" => "",
                "delivery_point_suffix" => "1A",
                "line_1" => "Prime Minister & First Lord Of The Treasury",
                "line_2" => "10 Downing Street",
                "line_3" => "",
                "premise" => "10",
                "longitude" => -0.127695242183412,
                "latitude" => 51.5035398826274,
                "eastings" => 530047,
                "northings" => 179951,
                "country" => "England",
                "traditional_county" => "Greater London",
                "administrative_county" => "",
                "postal_county" => "London",
                "county" => "London",
            ]
        ]);
        $messageFactory->createRequest('GET', 'https://api.ideal-postcodes.co.uk/v1/postcodes/SW1A%202AA?api_key=foo', [], null, '1.1')->willReturn($request);
        $client->sendRequest($request)->willReturn($response);
        $response->getStatusCode()->willReturn(200);
        $response->getBody()->willReturn($stream);
        $stream->getContents()->willReturn($data);
        $this->get('SW1A 2AA')->shouldBeLike(json_decode($data, true));
    }
```

This test is by far the biggest so far, so it merits some degree of explanation.

Note that we don't make a real HTTP request against the API. This may sound strange, but bear with me. We have no control whatsoever over that API, and it could in theory become inaccessible or be subject to breaking changes at any time. We also don't want to be shelling out for a paid service just to test our API client works. All we can do is test that our implementation will send the request we expect it to send - we don't want our test suite reporting a bug when the API goes down.

We therefore typehint not just the dependencies for the constructor, but a request, response and stream instance. We mock our our responses from those instances using the `willReturn()` method, so we have complete control over what we pass to our client. That way we can return any appropriate response or throw any exception we deem fit to test the behaviour under those circumstances. For the message factory, we specify what arguments it should receive to create the request, and return our mocked-out request object.

Also, note we use `shouldBeLike()` to verify the response - this is effectively using the `==` operator, whereas `shouldBe()` uses the `===` operator, making it stricter.

Let's run the tests, and don't forget the prompt:

```php
$ vendor/bin/phpspec run
Matthewbdaly/Postcode/Client                                                      
  38  - it can send the request
      method Matthewbdaly\Postcode\Client::get not found.

                            75%                                     25%          4
1 specs
4 examples (3 passed, 1 broken)
55ms

                                                                                
  Do you want me to create `Matthewbdaly\Postcode\Client::get()` for you?       
                                                                         [Y/n] 
y
  Method Matthewbdaly\Postcode\Client::get() has been created.
  
Matthewbdaly/Postcode/Client                                                      
  38  - it can send the request
      expected [array:1], but got null.

                            75%                                     25%          4
1 specs
4 examples (3 passed, 1 failed)
56ms
```

Now we can implement the `get()` method:

```php
    public function get(string $postcode)
    {
        $url = $this->getBaseUrl() . rawurlencode($postcode) . '?' . http_build_query([
            'api_key' => $this->getKey()
        ]);
        $request = $this->messageFactory->createRequest(
            'GET',
            $url,
            [],
            null,
            '1.1'
        );
        $response = $this->client->sendRequest($request);
        $data = json_decode($response->getBody()->getContents(), true);
        return $data;
    }
```

We first build up our URL, before using the message factory to create a request object. We then pass the built request to our client to send, before decoding the response into the format we want.

This should make our tests pass:

```bash
$ vendor/bin/phpspec run
                                      100%                                       4
1 specs
4 examples (4 passed)
307ms
```

Our client now works, but there are a couple of situations we need to account for. First, the API will raise a 402 if you make a request for a real postcode without having paid. We need to catch this and throw an exception. Add this to `spec/ClientSpec.php`:

```php
use Matthewbdaly\Postcode\Exceptions\PaymentRequired;

    ...

    function it_throws_an_exception_if_payment_required(HttpClient $client, MessageFactory $messageFactory, RequestInterface $request, ResponseInterface $response, StreamInterface $stream)
    {
        $this->beConstructedWith($client, $messageFactory);
        $this->setKey('foo');
        $messageFactory->createRequest('GET', 'https://api.ideal-postcodes.co.uk/v1/postcodes/SW1A%202AA?api_key=foo', [], null, '1.1')->willReturn($request);
        $client->sendRequest($request)->willReturn($response);
        $response->getStatusCode()->willReturn(402);
        $this->shouldThrow(PaymentRequired::class)->duringGet('SW1A 2AA');
    }
```

With that done, run the tests again:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/Postcode/Client                                                      
  87  - it throws an exception if payment required
      expected exception of class "Matthewbdaly\Postcode\Exc...", but got
      [exc:Prophecy\Exception\Call\UnexpectedCallException("Method call:
        - getBody()
      on Double\ResponseInterface\P15 was not expected, expected calls were:
        - getStatusCode()")].

                              80%                                     20%        5
1 specs
5 examples (4 passed, 1 failed)
130ms
```

Let's amend the client to throw this exception:

```php
use Matthewbdaly\Postcode\Exceptions\PaymentRequired;

    ...

    public function get(string $postcode)
    {
        $url = $this->getBaseUrl() . rawurlencode($postcode) . '?' . http_build_query([
            'api_key' => $this->getKey()
        ]);
        $request = $this->messageFactory->createRequest(
            'GET',
            $url,
            [],
            null,
            '1.1'
        );
        $response = $this->client->sendRequest($request);
        if ($response->getStatusCode() == 402) {
            throw new PaymentRequired;
        }
        $data = json_decode($response->getBody()->getContents(), true);
        return $data;
    }
```

And let's re-run the tests:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/Postcode/Client                                                    
  87  - it throws an exception if payment required
      expected exception of class "Matthewbdaly\Postcode\Exc...", but got [obj:Error] with the
      message: "Class 'Matthewbdaly\Postcode\Exceptions\PaymentRequired' not found"

                              80%                                     20%        5
1 specs
5 examples (4 passed, 1 failed)
389ms
```

It fails now because the exception doesn't exist. Let's create it at `src/Exceptions/PaymentRequired.php`:

```php
<?php

namespace Matthewbdaly\Postcode\Exceptions;

class PaymentRequired extends \Exception
{
}
```

That should be enough to make our tests pass:

```bash
$ vendor/bin/phpspec run
                                      100%                                       5
1 specs
5 examples (5 passed)
89ms
```

We also need to raise an exception when the postcode is not found, which raises a 404 error. Add the following spec:

```php
use Matthewbdaly\Postcode\Exceptions\PostcodeNotFound;
    ...
    function it_throws_an_exception_if_postcode_not_found(HttpClient $client, MessageFactory $messageFactory, RequestInterface $request, ResponseInterface $response, StreamInterface $stream)
    {
        $this->beConstructedWith($client, $messageFactory);
        $this->setKey('foo');
        $messageFactory->createRequest('GET', 'https://api.ideal-postcodes.co.uk/v1/postcodes/SW1A%202AA?api_key=foo', [], null, '1.1')->willReturn($request);
        $client->sendRequest($request)->willReturn($response);
        $response->getStatusCode()->willReturn(404);
        $this->shouldThrow(PostcodeNotFound::class)->duringGet('SW1A 2AA');
    }
```

Run the tests:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/Postcode/Client                                                    
  98  - it throws an exception if postcode not found
      expected exception of class "Matthewbdaly\Postcode\Exc...", but got
      [exc:Prophecy\Exception\Call\UnexpectedCallException("Method call:
        - getBody()
      on Double\ResponseInterface\P20 was not expected, expected calls were:
        - getStatusCode()")].

                                83%                                     16%      6
1 specs
6 examples (5 passed, 1 failed)
538ms
```

This time we'll create the exception class before updating the client. Create the following class at `src/Exceptions/PostcodeNotFound.php`:

```php
<?php

namespace Matthewbdaly\Postcode\Exceptions;

/**
 * Postcode not found exception
 *
 */
class PostcodeNotFound extends \Exception
{
}
```

And update the client:

```php
use Matthewbdaly\Postcode\Exceptions\PostcodeNotFound;
    ...
    public function get(string $postcode)
    {
        $url = $this->getBaseUrl() . rawurlencode($postcode) . '?' . http_build_query([
            'api_key' => $this->getKey()
        ]);
        $request = $this->messageFactory->createRequest(
            'GET',
            $url,
            [],
            null,
            '1.1'
        );
        $response = $this->client->sendRequest($request);
        if ($response->getStatusCode() == 402) {
            throw new PaymentRequired;
        }
        if ($response->getStatusCode() == 404) {
            throw new PostcodeNotFound;
        }
        $data = json_decode($response->getBody()->getContents(), true);
        return $data;
    }
```

Re-run the tests:

```bash
$ vendor/bin/phpspec run
                                      100%                                       6
1 specs
6 examples (6 passed)
103ms
```

And our API client is feature complete! You can find the source code of the finished client [here](https://github.com/matthewbdaly/postcode-client).

Summary
-------

Personally, I find that while PHPSpec isn't appropriate for every use case, it's particularly handy for API clients and it's generally my go-to testing solution for them. It handles producing a lot of the boilerplate for me, and it results in a much better workflow for test-driven development as it makes it very natural to write the test first, then make it pass.

HTTPlug has been a revelation for me. While it takes a bit of getting used to if you're used to something like Guzzle, it means that you're giving consumers of your library the freedom to choose the HTTP client of their choice, meaning they don't have to fight with several different libraries requiring different versions of Guzzle. It also allows for easy resolution of the HTTP client, rather than having to explicitly pass through an instance when instantiating your client. I'm planning to use it extensively in the future.
