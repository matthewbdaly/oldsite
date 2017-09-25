---
title: "A generic PHP SMS library"
date: 2017-09-25 22:18:18 +0100
categories:
- php
- sms
comments: true
---

This weekend I published [sms-client](https://github.com/matthewbdaly/sms-client), a generic PHP library for sending SMS notifications. It's intended to offer a consistent interface when sending SMS notifications by using swappable drivers. That way, if your SMS service provider suddenly goes out of business or bumps up their prices, it's easy to switch to a new one.

Out of the box it comes with drivers for the following services:

* Nexmo
* ClockworkSMS

In addition, it provides the following test drivers:

* Null
* Log
* RequestBin

Here's an example of how you might use it with the ClockworkSMS driver:

```php
use GuzzleHttp\Client as GuzzleClient;
use GuzzleHttp\Psr7\Response;
use Matthewbdaly\SMS\Drivers\Clockwork;
use Matthewbdaly\SMS\Client;

$guzzle = new GuzzleClient;
$resp = new Response;
$driver = new Clockwork($guzzle, $resp, [
    'api_key' => 'MY_CLOCKWORK_API_KEY',
]);
$client = new Client($driver);
$msg = [
    'to'      => '+44 01234 567890',
    'content' => 'Just testing',
];
$client->send($msg);
```

If you want to roll your own driver for it, it should be easy - just create a class that implements the `Matthewbdaly\SMS\Contracts\Driver` interface. Most of the existing drivers work using Guzzle to send HTTP requests to an API, but you don't necessarily have to do that - for instance, you could create a driver for a mail-to-SMS gateway by using Swiftmailer or the PHP mail class. If you create a driver for it, please feel free to submit a pull request so I can add it to the repository.

For Laravel or Lumen users, there's [an integration package](https://github.com/matthewbdaly/laravel-sms) that should make it easier to use. For users of other frameworks, it should still be fairly straightforward to integrate.
