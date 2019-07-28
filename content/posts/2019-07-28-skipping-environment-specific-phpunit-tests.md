---
title: "Skipping environment specific PHPUnit tests"
date: 2019-07-28 20:55:14 +0100
categories:
- php
- tdd
comments: true
---

If you're doing client work, you don't generally have to worry too much about working with any services other than those that will be installed in your production environment. For instance, if you're using Memcached as your cache backend, you needn't go to the trouble of checking that it works with Redis too unless the project actively switches. However, for more general purpose software that may be deployed to a variety of different environments, you may have to test it in all of those environments, which can be a chore.

Lately I've been working on a micro CMS for a personal project, and ran into a bit of an issue. This CMS uses the Stash caching library, and I wanted it to actively support all of the cache backends Stash provides. The CMS is configured using YAML, and I'd written a factory class that takes in the cache configuration and returns an adapter. The problem was that there are three adapters that require additional software to be installed, namely the APC, Redis and Memcached adapters. Installing all the packages to use all three of the adapters is onerous, and while it's a good idea to test them all, it's generally not worth the bother of adding all of them to your local development environment where you need your tests to run as fast as possible. Instead you're better off deferring those tests that require additional dependencies to your continuous integration server, which can afford to be a lot slower.

Fortunately, PHPUnit allows you to mark a test as skipped by calling `markTestSkipped()`. In the past I've used this or the similar `markTestIncomplete()` method when a test wasn't finished, but it's also useful for skipping tests based on the environment. We can either test for the presence of the dependency and mark the test as skipped if it's not present, or set the test up inside a try...catch block and call `markTestSkipped()` if the test throws an exception due to a missing dependency, as in this example:

```php
<?php declare(strict_types = 1);

namespace Tests\Unit\Factories;

use Tests\TestCase;
use App\Factories\CacheFactory;
use Stash\Exception\RuntimeException;
use Mockery as m;

final class CacheFactoryTest extends TestCase
{
    public function testRedis()
    {
        $factory = new CacheFactory;
        try {
            $pool = $factory->make([
                'driver' => 'redis',
                'servers' => [[
                    '127.0.0.1',
                    '6379'
                ]]
            ]);
        } catch (RuntimeException $e) {
            $this->markTestSkipped('Dependency not installed');
        }
        $this->assertInstanceOf('Stash\Pool', $pool);
        $this->assertInstanceOf('Stash\Driver\Redis', $pool->getDriver());
    }
}
```

As a general rule of thumb, when running your tests locally, it's more important that your test suite run quickly than provide 100% coverage. Tests that are slower or require multiple services to be installed can still be run by your continuous integration server, which can afford to be slower since it's not a blocker in the same way. In addition, I'm only ever really interested in coverage stats on the CI server, since enabling that slows PHPUnit down a lot, so since coverage is a non-issue locally we can happily leave covering that dependency to our CI server. In this case, the project is hosted on Github and uses Travis CI for running the tests and Coveralls for recording coverage, so we can leave the full test suite to be run on Travis CI, ensuring full coverage, while skipping those tests that require Redis, Memcached or APC locally.

Having a comprehensive test suite, and running it regularly during development, is important, but that doesn't mean it's compulsory you run every test regularly. In a case like this, where there are multiple adapters for the same basic functionality, you can often afford to avoid running those that test adapters with more exacting requirements.
