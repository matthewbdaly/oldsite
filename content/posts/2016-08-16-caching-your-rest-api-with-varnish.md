---
title: "Caching your REST API with Varnish"
date: 2016-08-16 17:47:59 +0100
categories:
- caching
- varnish
- api
comments: true
draft: true
---

I've [written before about how useful Varnish is](http://matthewdaly.co.uk/blog/2015/09/19/a-quick-and-easy-varnish-primer/) for caching content-based sites. However, with a little careful thought, it's often possible to use it to improve the performance of a REST API as well.

When using Varnish with your REST API, the concerns you may have are different. For example, cookies shouldn't be an issue the way they are with a website, but you'll still need to worry about authentication. Any HTTP request that changes the state of something must not be cached, and making that HTTP request will usually require you to invalidate at least part of the cache.

I'll demonstrate one possible caching strategy for a REST API using Varnish with my [Demo API](https://github.com/matthewbdaly/demoapi) I built the other day. In this case, the API did not use any kind of authentication, which makes this example simpler.

Can you cache your API?
-----------------------

The first question you need to ask is, can you cache your API responses at all? For instance, if you need to authenticate every single request, you probably won't want to cache your responses because Varnish would then return data to people who shouldn't be receiving it. Also, if every user will see different data for the same request, then again Varnish will return the wrong data. You can still cache this data, but it needs to be done in the application, using something like Memcached or Redis, so that you can ensure you return the right data to the right user.

However, if your API is at least somewhat accessible to unauthenticated users, then Varnish may be useful. For instance, if you have an API that return latest news items, and does not require user authentication, then you could consider caching responses.
