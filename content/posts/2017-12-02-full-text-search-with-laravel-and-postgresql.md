---
title: "Full text search with Laravel and PostgreSQL"
date: 2017-12-02 23:30:44 +0000
categories:
- postgresql
- laravel
- php
comments: true
---

I've touched on [using PostgreSQL to implement fuzzy search with Laravel before](/blog/2017/10/03/simple-fuzzy-search-with-laravel-and-postgresql/), but another type of search that PostgreSQL can handle fairly easily is full-text search. Here I'll show you how to use it in a Laravel application.

An obvious use case for this kind of search is a personal blogging engine. It's unlikely something like this is going to have enough content for it to be worth using a heavier solution like Elasticsearch, but a `LIKE` or `ILIKE` statement doesn't really cut it either, so Postgres's full text search is a good fit. Below you'll see a Laravel migration for the blog posts table:

```php
<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreatePostsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->increments('id');
            $table->string('title');
            $table->datetime('pub_date');
            $table->text('text');
            $table->string('slug');
            $table->integer('author_id');
            $table->timestamps();
        });
        DB::statement("ALTER TABLE posts ADD COLUMN searchtext TSVECTOR");
        DB::statement("UPDATE posts SET searchtext = to_tsvector('english', title || '' || text)");
        DB::statement("CREATE INDEX searchtext_gin ON posts USING GIN(searchtext)");
        DB::statement("CREATE TRIGGER ts_searchtext BEFORE INSERT OR UPDATE ON posts FOR EACH ROW EXECUTE PROCEDURE tsvector_update_trigger('searchtext', 'pg_catalog.english', 'title', 'text')");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::statement("DROP TRIGGER IF EXISTS tsvector_update_trigger ON posts");
        DB::statement("DROP INDEX IF EXISTS searchtext_gin");
        DB::statement("ALTER TABLE posts DROP COLUMN searchtext");
        Schema::dropIfExists('posts');
    }
}
```

Note that after we create the basic layout of our `posts` table, we then have to drop down to raw DB statements to achieve the next steps:

* We add a column called `searchtext` with a type of `TSVECTOR` (unfortunately Laravel doesn't have a convenient method to create this column type, so we need to do it with a raw statement). This column will hold our searchable document.
* We use the `to_tsvector()` method to generate a document on each row that combines the title and text fields and store it in the `searchtext` column. Note also that we specify the language as the first argument. This is because Postgres's full text search understands so-called "stopwords", which are words that are so common as to not be worth bothering with at all, such as "the" - these will obviously differ between languages, so it's prudent to explicitly state this so Postgres knows what stopwords to expect.
* We create a `GIN` index on the `posts` table using our new `searchtext` column.
* Finally we create a trigger which, when the table is amended, regenerates the search text.

With that done, we can now look at actually performing a full-text search. To facilitate easy re-use, we'll create a local scope on our `Post` model. If you haven't used scopes in Laravel before, they essentially allow you to break queries into reusable chunks. In this case, we expect our scope to receive two arguments, the query instance (which is passed through automatically), and the search text:

```php
<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    protected $fillable = [
        'title',
        'pub_date',
        'text',
        'slug',
        'author_id'
    ];

    public function scopeSearch($query, $search)
    {
        if (!$search) {
            return $query;
        }
        return $query->whereRaw('searchtext @@ to_tsquery(\'english\', ?)', [$search])
            ->orderByRaw('ts_rank(searchtext, to_tsquery(\'english\', ?)) DESC', [$search]);
    }
}
```

If `$search` is empty, we just return the query object as is. Otherwise, we first of all construct a `WHERE` clause that matches our search text against the `searchtext` column. Note the syntax used here:

```sql
searchtext @@ to_tsquery('english', 'foo')
```

We use the `to_tsquery()` method to match our text against our search document. As before, note that we specify the language.

Finally, we specify an order - we want the highest ranked matches to appear first, and this section of the query does that:

```sql
ts_rank(searchtext, to_tsquery('english', 'foo')) DESC
```

Here we use `ts_rank()` to ensure we get our results in the appropriate order. Note that for both queries, we passed the arguments through as parameterized queries, rather than constructing a raw string - we have to watch out for SQL injection when we're writing raw queries, but we can use PDO's parameterized queries from Eloquent in a raw statement, which makes things a bit easier.

Now we can call our new search scope as follows:

```php
$posts = Post::search($search)->get();
```

Because the scope receives and returns a query builder instance, you can continue to add the rest of your query, or paginate it, as necessary:

```php
$posts = Post::search($search)->where('draft', false)->simplePaginate(5);
```

If you're working in a language that makes heavy use of accents, such as French, you might also want to install the `unaccent` extension (you can do this in the migration with `CREATE EXTENSION unaccent`). Then, any time we call `to_tsvector()`, you should pass any strings through the `unaccent()` method to strip out the accents.

Do we need the migrations?
--------------------------

Technically, we could do without the additional changes to the database structure - we could create a document on the fly inside a subquery and use that to query against, which would look something like this in SQL:

```sql
SELECT *
FROM
  (SELECT *,
          to_tsvector('english', posts.title) || to_tsvector('english', posts.text) AS document
   FROM "posts") search
WHERE search.document @@ to_tsquery('Redis')
ORDER BY ts_rank(search.document, to_tsquery('english', 'Redis')) DESC;
```

However, the performance is likely to be significantly worse using this approach as it has to recreate the document, and doesn't have an existing index to query against. It's also a pig to write something like this with an ORM.

I'm currently working on a more generic solution for implementing full text search with Postgres and Laravel, however so far it looks like that solution will not only be considerably more complex than this (consistently producing a suitable query for unknown data is rather fiddly), but you can't create a column for the vector ahead of time, meaning the query will be slower. This approach, while it requires more work than simply installing a package, is not terribly hard to implement on a per-model basis and is easy to customise for your use case.
