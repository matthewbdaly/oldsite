---
title: "Why the speed of your MVC framework is usually a red herring"
date: 2018-01-28 20:20:03 +0000
categories:
- performance
comments: true
---

Skim through any programming-related forum and you'll often find statements along the lines of the following:

* "I chose Lumen for my website because the benchmarks show it's faster than Laravel"
* "I'm using raw queries because they're faster than using an ORM"
* "I wrote the site in pure PHP to avoid the overhead of a framework"

Making my web apps performant is something I care deeply about. Yet every time I see something like this I cringe. Why? Because statements like these are full of wild misconceptions about the real performance bottlenecks in modern web applications. I don't blame framework vendors for publishing benchmarks of their applications, since the performance of web apps *is* a big issue, but they are often misleading even when they're correct, and it's all too easy for inexperienced developers to think that performance is a matter of picking the fastest framework, rather than following a methodology of identifying and dealing with performance bottlenecks.

In this post I'll explain why the performance of the framework, while not a non-issue, should come way down the list of factors involved in choosing a framework (or not to use one at all), behind functionality and developer productivity, and how many other factors not related to the choice of framework are involved.

Benchmarks don't include real-world optimisations
-------------------------------------------------

When benchmarking a number of frameworks together, you'll typically be testing some fairly basic behaviour such as rendering a view, and maybe making a database query. It's rare for them to also include things such as caching queries or sending the correct HTTP caching headers.

Also, it's quite common for the party creating the benchmark to have their own preference they're more familiar with, in which case they'll have a better idea of how to optimise that one. If they don't know how to optimise all of them to the same extent, the end results is going to be biased. For example, in the case of Laravel, running `php artisan optimize` can significantly improve application performance by caching large chunks of the application.

In addition, the configuration for the web server is quite likely to be suboptimal compared to a production server. For instance, they may not have the opcode cache installed, or Nginx may not set the right headers on static assets. Under these circumstances the benchmarks are very likely to be misleading. Ultimately, if you chose to completely rewrite an entire application from scratch in a new framework to claw back a few milliseconds, how do you know you'll actually see that translate into better performance in production for your particular use case?

And if you're even *considering* running a supposedly performance-critical application on shared hosting, you should hang your head in shame...

Your from-scratch implementation of functionality is probably slower than an existing one
-----------------------------------------------------------------------------------------

If you're building some functionality from scratch instead of using an off-the-shelf library on the basis of performance, just stop. Existing libraries have usually had a great deal of attention already, should have working test suites, and depending on how active the developer community around them is, they may well have found and resolved the most egregious performance bottlenecks. Yours, on the other hand, will be new, untested, and could easily have serious bottlenecks if you haven't profiled it extensively. It's therefore very, very unlikely that you'll be able to produce something more performant than the existing solutions, unless those existing solutions are old, barely maintained ones.

The *only* time this might be worthwhile is if all the existing implementations have boatloads of functionality, and you only need a small portion of that functionality. Even then, you should consider if it's worth your while for a tiny speed boost. Or if you want to write a new library for it, go ahead - just don't kid yourself about it being for the sake of performance.

Smaller frameworks are faster because they do less
--------------------------------------------------

Microframeworks such as Lumen *are* generally faster (at least in the artificial world of benchmarks), but that's because they leave out functionality that's not necessary for their targeted use case. Lumen is aimed at building microservices, and it leaves out things like templating, file handling, and other functionality not focused solely on building microservices. That means it's less useful for other use cases. Any code that gets added to the application will make it marginally slower just by virtue of being there.

Under these circumstances it's blindingly obvious that the framework that has to do less setup (eg instantiate fewer services, perform less operations on the request and response), is nearly always going to respond faster, regardless of suitability for more complex work.

If you start building a site with Lumen, but then discover that you need some functionality that Laravel has and Lumen doesn't, you have two choices:

* Switch to Laravel
* Add that functionality to your application (either through additional packages or rolling it yourself)

I've often had plans to use Lumen for a project in the past, but then discovered that it would benefit from some of Laravel's functionality. Under those circumstances I've switched straight over to Laravel - my time is too valuable to my employer to waste reimplementing functionality Laravel already has, and that functionality will inevitably have some overhead. Put it this way - I do a lot of Phonegap work, so building APIs is a big part of what I do, but I've only ever finished one project using Lumen (a push notification microservice). Every other time, sooner or later I've run into a situation where the additional functionality of Laravel would be useful and switched over.

There are occasions when a lighter framework like Lumen makes sense, but only when I simply don't need the additional functionality of Laravel. It just doesn't make sense to go for Lumen and then start adding functionality Laravel already has - any new implementation isn't likely to be as solid, well-tested and performant as Laravel's implementation.

Framework performance is often less relevant if you're using Varnish
-----------------------------------------------------------------

In my experience, if you have a site or API that is under heavy load, then if it's possible to use Varnish with it, that will have a far more significant effect on performance than switching between PHP frameworks.

Because Varnish sits in front of your web server, when you're serving cached content, anything after Varnish is completely irrelevant to the performance- it won't hit the backend again until the cached content has expired. Varnish is effectively a key-value store, and is written in C, so it's far more performant than just about any backend in any framework you could possibly write. And it's configurable enough that with sufficient experience it can usually be helpful for most applications.

Varnish isn't appropriate for every use case, and it doesn't help with uncached requests (except by reducing the load on the application) but where high performance is necessary it can be a very big help indeed. The speed boost from having Varnish in front of your site and properly configured dwarfs any boost of a few milliseconds from switching PHP framework.

There are other HTTP caching servers available too - for instance, it's possible to use Nginx as a web cache, and Cloudflare is a hosted service that offers similar performance benefits. Regardless, the same applies - if you can handle a request using the caching server rather than the application behind it, the performance will be immensely better, without having to change your application code.

ORM vs raw queries is a drop in the ocean
-----------------------------------------

There will always be *some* overhead from using any ORM. However, this is nearly always so minor as to be a non-issue.

For example, while there might be some slight performance increase from writing raw SQL instead of using an ORM, it's generally dwarfed by the cost of making the query in the first place. You can get a far, far bigger improvement in performance by efficiently caching the responses than by rewriting ORM queries in raw SQL.

An ORM does make certain types of slow inefficient queries more likely, as well as making "hidden" queries (such as in Laravel when it fetches the user from the session), but that's something that can be resolved by using a profiler like Clockwork to identify the slow or unnecessary queries and refactoring them. Most ORM's have tools to handle things like the N+1 problem - for instance, Eloquent has the `with()` method to eager-load related tables, which is generally a lot more convenient than explicitly writing a query to do the eager-loading for you.

Using an ORM also comes with significant benefits to developers:

* It's generally easier to express relations between tables
* It helps avoid the mental context switch between PHP and SQL
* It does a lot of the work of sanitizing data for you
* It helps make your application portable between different databases (eg so you can run your tests using an in-memory SQLite database but use MySQL in production)
* Where you have logic that can't be expressed using the ORM, it's generally easy to drop down to writing raw SQL for that part

In my experience, querying the database is almost always the single biggest bottleneck (the only other thing that can be as bad is if you're making requests to a slow third-party API), and any overhead from the ORM is a drop in the ocean in comparison. If you have a slow query in a web application, then rewriting it as a raw query is probably the very last thing you should consider doing, after:

* Refactoring the query or queries to be more efficient/remove unnecessary queries
* Making sure the appropriate indices are set on your database
* Caching the responses

Caching in particular is quite hard to do - it's difficult to come up with a reliable and reusable strategy for caching responses without serving stale content, but once you can do so, it makes a huge difference to application performance.

Writing all your queries as raw queries is a micro-optimisation - it's a lot of work for not that much payback, and it's hardly ever worth the bother. Even if you have a single, utterly horrendous query or set of queries that has a huge overhead, there are better ways to deal with it - under those circumstances I'd be inclined to create a stored procedure in a migration and call that rather than making the query directly.

Summary
-------

So to sum it up, if someone tells you you should use framework X because it's faster than framework Y, they might be *somewhat* right, but that misses the point completely. Benchmarks are so artificial as to be almost useless for determining how your production code will perform. Any half-decent framework will give you the tools you need to optimise performance, and your use of those tools will have a far, far more signficant effect on the response time of your application than picking between different frameworks. I've never found a single MVC framework whose core is slow enough that I can't make it fast enough with the capabilities provided.

Also, considering that these days server hardware is dirt cheap (at time of writing US$5 gets you a Digital Ocean droplet with 1GB of RAM for a month), whereas developers are far, far more expensive, it's more cost effective to optimise for the *developer's time*, not server time, so it makes sense to pick a framework that makes *you* productive, not one that makes the *application* productive. That's no excuse for slow, shitty applications, but when all else fails, spinning up additional servers is a far more cost-effective solution than spending days on end rewriting your entire application in a different framework that benchmarks show might perform better by a few milliseconds.
