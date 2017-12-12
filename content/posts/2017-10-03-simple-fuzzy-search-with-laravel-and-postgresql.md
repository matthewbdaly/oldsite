---
title: "Simple fuzzy search with Laravel and PostgreSQL"
date: 2017-10-03 23:56:11 +0100
categories:
- laravel
- postgresql
comments: true
---

When implementing fuzzy search, many developers reach straight for specialised tools like Elasticsearch. However, for simple implementations, this is often overkill. PostgreSQL, my relational database of choice, can natively handle fuzzy search quite easily if you know how. Here's how you might use this with Laravel.

Suppose we have the following migration to create a `locations` table, storing towns, cities and villages:

```php
<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateLocations extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Create locations table
        Schema::create('locations', function (Blueprint $table) {
            $table->increments('id')->unsigned();
            $table->string('name');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Drop locations table
        Schema::drop('locations');
    }
}
```

The key to this implementation of fuzzy search is *trigrams*. A trigram is a group of three consecutive characters taken from a string. Using the `pg_trgm` module, which comes with PostgreSQL, we can break a string into as many trigrams as possible, and then return the strings with the most matching trigrams.

We can ensure that `pg_trgm` is set up on the database by creating a migration:

```php
<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddTrgmExtension extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::statement('DROP EXTENSION IF EXISTS pg_trgm');
    }
}
```

Make sure you run the migration as well. Once that is done, we can make a raw fuzzy query against the `name` field as follows:

```sql
SELECT * FROM locations WHERE 'burgh' % name;
```

Translating that to work with the Eloquent ORM, we can perform fuzzy queries against the `name` field as follows:

```php
$location = Location::whereRaw("'burgh' % name")->get();
```

This query might match both `Aldeburgh` and `Edinburgh`. It's also able to handle slight misspellings, as in this example:

```php
$location = Location::whereRaw("'hendrad' % name")->get();
```

This query will match `East Hendred` or `West Hendred` successfully. As you can see, we can match strings at any point in the name string, and handle slight mis-spellings without any problems.

In practice, rather than using `whereRaw()` every time, you'll probably want to create a local scope that accepts the name you want to match against. You'll also want to use query parameters to prevent SQL injection:

```php
$location = Location::whereRaw("? % name", [$name])->get();
```

Improving performance with an index
-----------------------------------

The performance of these queries isn't that great out of the box. We can improve them by creating an index:

```php
<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddTrgmExtension extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::statement('CREATE INDEX locations_name_trigram ON locations USING gist(name gist_trgm_ops);');
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::statement('DROP INDEX IF EXISTS locations_name_trigram');
        DB::statement('DROP EXTENSION IF EXISTS pg_trgm');
    }
}
```

Adding an index should produce a noticeable improvement in the response time.

Final thoughts
--------------

PostgreSQL's `pg_trgm` module is a fairly straightforward way of implementing fuzzy search. It's not much more involved than a `LIKE` or `ILIKE` clause in your query, and for many use cases, it's more than sufficient. If you don't have a huge number of records, it's probably a more appropriate choice than something like Elasticsearch, and has the advantage of a simpler stack. However, if you have a larger dataset, you may be better off with a dedicated search solution. As always, if you're unsure it's a good idea to try both and see what works best for that particular use case.
