---
title: "Full-text search with MariaDB"
date: 2018-05-13 14:55:42 +0100
categories:
- mysql
- mariadb
- sql
comments: true
---

Recently I had the occasion to check out MariaDB's implementation of full-text search. As it's a relatively recent arrival in MySQL and MariaDB, it doesn't seem to get all that much attention. In this post I'll show you how to use it, with a few Laravel-specific pointers. We'll be using the default `User` model in a new Laravel installation, which has columns for `name` and `email`.

Our first task is to create the fulltext index, which is necessary to perform the query. Run the following command:

```sql
ALTER TABLE users ADD FULLTEXT (name, email);
```

As you can see, we can specify multiple columns in our table to index.

If you're using Laravel, you'll want to create the following migration for this:

```php
<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddFulltextIndexForUsers extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        DB::statement('ALTER TABLE users ADD FULLTEXT(name, email)');
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::statement('ALTER TABLE users DROP INDEX IF EXISTS name');
    }
}
```

Note that the index is named after the first field passed to it, so when we drop it we refer to it as `name`. Then, to actually query the index, you should run a command something like this:

```sql
SELECT * FROM users WHERE MATCH(name, email) AGAINST ('jeff' IN NATURAL LANGUAGE MODE);
```

Note that `NATURAL LANGUAGE MODE` is actually the default, so you can leave it off if you wish. We also have to specify the columns to match against.

If you're using Laravel, you may want to create a reusable local scope for it:

```php
    public function scopeSearch($query, $search)
    {
        if (!$search) {
            return $query;
        }
        return $query->whereRaw('MATCH(name, email) AGAINST (?)', [$search]);
    }
```

Then you can call it as follows:

```php
User::search('jeff')->get();
```

I personally have noticed that the query using the `MATCH` keywords seems to be far more performant, with the response time being between five and ten times less than a similar command using `LIKE`, however this observation isn't very scientific (plus, we are talking about queries that still run in a fraction of a second). However, if you're doing a particularly expensive query that currently uses a `LIKE` statement, it's possible you may get better results by switching to a `MATCH` statement. Full-text search probably isn't all that useful in this context - it's only once we're talking about longer text, such as blog posts, that some of the advantages like support for stopwords comes into play.

From what I've seen this implementation of full-text search is a lot simpler than in PostgreSQL, which has ups and downs. On the one hand, it's a lot easier to implement, but conversely it's less useful - there's no obvious way to perform a full-text search against joined tables. However, it does seem to be superior to using a `LIKE` statement, so it's probably a good fit for smaller sites where something like Elasticsearch would be overkill.
