---
title: "Decorating service classes"
date: 2018-12-06 16:07:16 +0000
categories:
- php
comments: true
---

I've written before about using decorators to extend the functionality of existing classes, in the context of the repository pattern when working with Eloquent. However, the same practice is applicable in many other contexts.

Recently, I was asked to add RSS feeds to the home page of the legacy project that is my main focus these days. The resulting service class looked something like this:

```php
<?php

namespace App\Services;

use Rss\Feed\Reader;
use App\Contracts\Services\FeedFetcher;

class RssFetcher implements FeedFetcher
{
    public function fetch($url)
    {
        return Reader::import($url);
    }
}
```

In accordance with the principle of loose coupling, I also created an interface for it:

```php
<?php

namespace App\Contracts\Services;

interface FeedFetcher
{
    public function fetch($url);
}
```

I was recently able to add dependency injection to the project using PHP-DI, so now I can inject an instance of the feed fetcher into the controller by typehinting the interface and having it resolve to the `RssFetcher` class.

However, there was an issue. I didn't want the application to make multiple HTTP requests to fetch those feeds every time the page loads. At the same time, it was also a bit much to have a scheduled task running to fetch those feeds and store them in the database, since many times that would be unnecessary. The obvious solution was to cache the feed content for a specified length of time, in this case five minutes.

I *could* have integrated the caching into the service class itself, but that wasn't the best practice, because it would be tied to that implementation. If in future we needed to switch to a different feed handler, we'd have to re-implement the caching functionality. So I decided it made sense to decorate the service class.

The decorator class implemented the same interface as the feed fetcher, and accepted another instance of that interface in the constructor, along with a PSR6-compliant caching library. It looked something like this:

```php
<?php

namespace App\Services;

use App\Contracts\Services\FeedFetcher;
use Psr\Cache\CacheItemPoolInterface;

class FetcherCachingDecorator implements FeedFetcher
{
    protected $fetcher;

    protected $cache;

    public function __construct(FeedFetcher $fetcher, CacheItemPoolInterface $cache)
    {
        $this->fetcher = $fetcher;
        $this->cache = $cache;
    }

    public function fetch($url)
    {
        $item = $this->cache->getItem('feed_'.$url);
        if (!$item->isHit()) {
            $item->set($this->fetcher->fetch($url));
            $this->cache->save($item);
        }
        return $item->get();
    }
}
```

Now, when you instantiate the feed fetcher, you wrap it in the decorator as follows:

```php
<?php

$fetcher = new FetcherCachingDecorator(
        new App\Services\RssFetcher,
        $cache
);
```

As you can see, this solves our problem quite nicely. By wrapping our feed fetcher in this decorator, we keep the caching layer completely separate from any one implementation of the fetcher, so in the event we need to swap the current one out for another implementation, we don't have to touch the caching layer at all. As long as we're using dependency injection to resolve this interface, we're only looking at a little more code to instantiate it.

In addition, this same approach can be applied for other purposes, and you can wrap the fetcher as many times as necessary. For instance, if we wanted to log all the responses we got, we could write a logging decorator something like this:

```php
<?php

namespace App\Services;

use App\Contracts\Services\FeedFetcher;
use Psr\Log\LoggerInterface;

class FeedLoggingDecorator implements FeedFetcher
{
    protected $fetcher;

    protected logger;

    public function __construct(FeedFetcher $fetcher, LoggerInterface $logger)
    {
        $this->fetcher = $fetcher;
        $this->logger = $logger;
    }

    public function fetch($url)
    {
        $response = $this->fetcher->fetch($url);
        $this->logger->info($response);
        return $response;
    }
}
```

The same idea can be applied to an API client. For instance, say we have the following interface for an API client:

```php
<?php

namespace Foo\Bar\Contracts;

use Foo\Bar\Objects\Item;
use Foo\Bar\Objects\ItemCollection;

interface Client
{
    public function getAll(): ItemCollection;

    public function find(int $id): Item;

    public function create(array $data): Item;

    public function update(int $id, array $data): Item;

    public function delete(int $id);
}
```

Now, of course any good API client should respect HTTP headers and use those to do some caching itself, but depending on the use case, you may also want to cache these requests yourself. For instance, if the only changes to the entities stored by the third party API will be ones you've made, or they don't need to be 100% up to date, you may be better off caching those responses before they reach the actual API client. Under those circumstances, you might write a decorator like this to do the caching:

```php
<?php

namespace Foo\Bar\Services;

use Foo\Bar\Contracts\Client;
use Psr\Cache\CacheItemPoolInterface;

class CachingDecorator implements Client
{
    protected $client;

    protected $cache;

    public function __construct(Client $client, CacheItemPoolInterface $cache)
    {
        $this->client = $client;
        $this->cache = $cache;
    }

    public function getAll(): ItemCollection
    {
        $item = $this->cache->getItem('item_all');
        if (!$item->isHit()) {
            $item->set($this->client->getAll());
            $this->cache->save($item);
        }
        return $item->get();
    }

    public function find(int $id): Item
    {
        $item = $this->cache->getItem('item_'.$id);
        if (!$item->isHit()) {
            $item->set($this->client->find($id));
            $this->cache->save($item);
        }
        return $item->get();

    }

    public function create(array $data): Item
    {
        $this->cache->clear();
        return $this->client->create($data);
    }

    public function update(int $id, array $data): Item
    {
        $this->cache->clear();
        return $this->client->update($id, $data);
    }

    public function delete(int $id)
    {
        $this->cache->clear();
        return $this->client->delete($id);
    }
}
```

Any methods that change the state of the data on the remote API will clear the cache, while any that fetch data will first check the cache, only explicitly fetching data from the API when the cache is empty, and caching it again. I won't go into how you might write a logging decorator for this, but it should be straightforward to figure out for yourself.

The decorator pattern is a very powerful way of adding functionality to a class without tying it to a specific implementation. If you're familiar with how middleware works, decorators work in a very similar fashion in that you can wrap your service in as many layers as you wish in order to accomplish specific tasks, and they adhere to the single responsibility principle by allowing you to use different decorators for different tasks.
