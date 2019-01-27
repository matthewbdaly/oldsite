---
title: "Understanding query objects"
date: 2019-01-27 23:10:39 +0000
categories:
- php
comments: true
---

The project I've been maintaining for the last year has inherited a rather dubious database structure that would currently be very difficult to refactor, which also makes many queries more convoluted than they should be. At present, I'm involved in buiding a whole new home page, which has necessitated adding some new queries. Since some of these involve carrying out unions between several similar tables (that should have been one table, grr...), they can involve some quite large chunks for each query.

As a result, it's made sense to break those queries down further. Since Zend 1 doesn't have anything analogous to scopes in Eloquent, I don't really have an easy way to break these queries up in the models (and I'm trying to get the query logic out of the models at present anyway), so I opted to make them into query objects instead, which is a pattern I hadn't used before (but probably should have).

A query object is pretty much what it says on the tin - it's a PHP object that executes a single, very specific query. This may seem like overkill, but it's only really useful for the most complex and convoluted of queries. It can accept parameters, as you'd expect, and some parts of the query may be optional based on that, but fundamentally it should build and run only one single query.

In this post I'll go through how you might create one, how it relates to the repository pattern, and when to create one.

Creating a query object class
=============================

I'm a big fan of the `__invoke()` magic method in PHP. For the uninitiated, it lets you instantiate the class, and then use it in the same way you would a function, making it very useful for callbacks. This also brings some other advantages:

* Unlike with a function, you can create private methods to do other parts of the work, making it easier to understand the main method.
* It can have a constructor, and can therefore both accept dependencies via the constructor, and be instantiated via dependency injection, simplifying setup and testing when compared to using a callback.
* Since `__invoke()` is an innate part of the PHP language, it makes more sense for classes that have a single responsibility to use that method name to do that, rather than picking something like `handle()` or `run()`.

As a result, my query objects generally use the `__invoke()` method to trigger the query.

Since Zend 1 is no longer supported, I won't bother displaying how I'd write the query in that specific context. I have yet to use this pattern with Laravel, but if I did, it would look something like this:

```php
<?php

namespace App\Queries;

use Illuminate\Database\DatabaseManager;

final class DashboardItems
{
    protected $db;

    public function __construct(DatabaseManager $db)
    {
        $this->db = $db;
    }

    public function __invoke(int $days = 7)
    {
        return $this->fooTable()
            ->union($this->barTable())
            ->whereRaw('start_date >= (NOW() - INTERVAL ? DAY)', [$days]);
            ->get();
    }

    private function fooTable()
    {
        return $this->db->table('foo')
			->where('type', '=', 'fooType');
    }

    private function barTable(int $days)
    {
        return $this->db->table('bar')
			->where('type', '=', 'barType');
    }
}
```

Note that we break each one of the tables we want to perform a `UNION` on into a private method. This is probably the biggest advantage of query objects - it lets you break particularly unwieldy queries up into logical steps, making them more readable. You could do this by adding private methods on a repository class too, but I'd be reluctant to add private methods to a repository that were only used in one query - to my mind, a query object is a better home for that.

What about repositories?
========================

I regularly use the repository pattern in my code bases, whether that's for Laravel projects or the current Zend 1-based legacy project. It's an ongoing effort to refactor it so that all the queries are called from repository classes, leaving the models to act as containers for the data. So how do query objects fit in here?

The relevant parts of the application structure for my current application looks a bit like this:

```bash
└── app
    ├── Queries
    │   └── DashboardItems.php
    └── Repositories
        └── DashboardRepository.php
```

And the repository might call the query object as follows:

```php
<?php

namespace App\Repositories;

use App\Queries\DashboardItems;

final class DashboardRepository
{
    public static function dashboardItems(int $days = 7)
    {
        $query = new DashboardItems;
        return $query($days);
    }
}
```

At present my repositories all use static methods as I'm still in the process of migrating the queries over to the repository classes. That also means I can't easily use dependency injection. For a Laravel application, a similar call might look like this:

```php
<?php

namespace App\Repositories;

use App\Queries\DashboardItems;

final class DashboardRepository
{
	protected $dashboardQuery;

	public function __construct(DashboardItems $dashboardQuery)
	{
		$this->dashboardQuery = $dashboardQuery;
	}

    public function dashboardItems(int $days = 7)
    {
        return $this->dashboardQuery($days);
    }
}
```

Th only real difference is that we can instantiate the query object out of the container, simplifying setup.

When to use query objects
=========================

I think it probably goes without saying, but it should be a rare query that actually needs to be implemented as a query object, especially if you're using an ORM like Eloquent that provides feaatures like scopes, and as yet I only have two using this pattern, as well as two others that were implemented as "reporter" classes, but could be query objects instead. So far, my experience has been that the sort of queries that are large enough to be worth considering include:

* Queries that generate reports, particularly if they have various options
* Queries that use unions, as in the above example, since it makes sense to use a private method to fetch each table
* Queries with multiple complex joins

Smaller queries will typically fit happily inside a single method in your repository classes. If that's the case, then they can live there without trouble. However, if you have a query that's becoming too big to fit inside a single method, rather than adding private methods to your repository class, it may make more sense to refactor it out into a query object in its own right. You can still call it via the same method on your repository class, but the repository can just defer to the query object. As I usually use decorators to cache the responses from my repository classes anyway, then it makes sense to stick with this approach to keep caching consistent too.

Query objects only offer any value for particularly large queries. However, they can be invaluable in those circumstances. By enabling you to break those big queries up into a series of steps, they help make them easier to understand.
