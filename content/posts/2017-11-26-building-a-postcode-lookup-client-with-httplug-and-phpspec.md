---
title: "Building a postcode lookup client with HTTPlug and PHPSpec"
date: 2017-11-26 11:45:39 +0000
categories:
- php
- tdd
- phpspec
- http
- httplug
comments: true
---

While PHPUnit is my normal go-to PHP testing framework, for some applications I find [PHPSpec](http://www.phpspec.net/en/stable/) superior. I've found that it makes for a better flow when doing test-driven development

In this tutorial I'll show you how to build a lookup client for UK postcodes. In the process of doing so, we'll use PHPSpec to drive our development process. We'll also use [HTTPlug](http://docs.php-http.org/en/latest/httplug/tutorial.html) as our underlying HTTP library. The advantage of this over using something like Guzzle is that we give library users the freedom to choose the HTTP library they feel is most appropriate to their situation.

Background
----------

If you're unfamiliar with it, the UK postcode system is our equivalent of a zip code in the US, but with two major differences:

* The codes themselves are alphanumeric instead of numeric, with the first part including one or two letters usually (but not always) derived from the nearest large town or city (eg L for Liverpool, B for Birmingham, OX for Oxford), or for London, based on the part of the city (eg NW for the north-west of London)
* A full postcode is in two parts (eg NW1 8TQ), and the first part narrows the location down to a similar area to a US-style zip code, while the second part usually narrows it down to a street (although sometimes large organisations that receive a lot of mail will have a postcode to themselves).

This means that if you have someone's postcode and house name or address, you can use those details to look up the rest of their address details. This obviously makes it easier for users to fill out a form, such as when placing an order on an e-commerce site.

Unfortunately, it's not quite that simple. The data is owned by Royal Mail, and they charge through the nose for access to the raw data, which places this data well outside the budgets of many web app developers. Fortunately, [Ideal Postcodes](https://ideal-postcodes.co.uk/) offer a REST API for querying this data. It's not free, but at 2.5p per request it's not going to break the bank unless used excessively.

For those of you outside the UK, this may not be of much immediate use, but the underlying principles will still be useful, and you can probably build a similar client for your own nation's postal code system. For instance, there's a [Zipcode API](https://www.zipcodeapi.com/API) that those of you in the US can use, and if you understand what's going on here it shouldn't be hard to adapt it to work with that. If you do produce a similar client for your country's postal code system, submit a pull request to update the README with a link to it and I'll include it.

Setting up
----------

First we'll create a `composer.json` to specify our initial dependencies:

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
Then we install them:

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

HTTPlug is a very good way of solving this problem. By requiring only an interface and not a concrete implementation, HTTPlug means that you can merely specify that the consumer of the library must provide a suitable implementation of that library, but leave the choice of implementation up to them. This means that they can choose whatever implementation best fits their use case. There are [adapters for many different clients](http://docs.php-http.org/en/latest/clients.html), so it's unlikely that they won't be able to find one that meets their needs.

Getting started
---------------

One advantage of PHPSpec is that it will automatically generate much of the boilerplate for our client and specs. To create our client spec, run this command:

```bash
$ vendor/bin/phpspec desc Matthewbdaly/Postcode/Client
Specification for Matthewbdaly\Postcode\Client created in /home/matthew/Projects/postcode-client/spec/ClientSpec.php.
```

Now the we have a spec for our client, we can generate the client itself:

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

You will need to enter `Y` when prompted.

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

Our final task is to be able to handle sending requests. Add the following imports at the top of `spec/ClientSpec.php`:

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

Now we can implement this method:

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

This should make our tests pass:

```bash
$ vendor/bin/phpspec run
                                      100%                                       4
1 specs
4 examples (4 passed)
307ms
```

Finally, the API will raise a 402 if you make a request without having paid. We need to catch this:

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

```php
<?php

namespace Matthewbdaly\Postcode\Exceptions;

class PaymentRequired extends \Exception
{
}
```

```bash
$ vendor/bin/phpspec run
                                      100%                                       5
1 specs
5 examples (5 passed)
89ms
```

Source code [here](https://github.com/matthewbdaly/postcode-client).
