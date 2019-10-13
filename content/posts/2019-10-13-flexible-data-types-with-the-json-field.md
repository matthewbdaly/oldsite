---
title: "Flexible data types with the JSON field"
date: 2019-10-13 23:10:43 +0100
categories:
- php
- laravel
- mysql
comments: true
---

Relational databases have many advantages over other data stores. They're (mostly) solid, mature products, they have the means to prevent data duplication while still allowing related data to be accessed, and they allow for easy enforcement of data types. However, the latter point has also historically made them less flexible compared to document databases such as MongoDB, which allow for fields to be set dynamically, making it much easier to set content arbitrarily.

One area in which this has caused particular problems is with content management systems, where you might want to be able to set custom content types that need to be treated the same in some circumstances, and have some fields in common, but store different data. If you want to be able to store arbitrary data against a particular entity, historically the main way to do that is to create a meta table to contain keys and values, and set the entity ID as a foreign key in the new table.

Wordpress is a common example of this. Any piece of content is stored in the `wp_posts` table, which in addition to the generic structure of a post, also includes the `post_type` field. It's possible to create and register your own post types, but it's not possible to store additional custom data in that table. Instead, it's stored as keys and values in the `wp_postmeta` table, meaning you need to do a join to retrieve that content at the same time, making for more complex queries.

Another approach is to have a generic entity table that contains the common fields, and separate tables for the rest, and then set up a one-to-one relationship between them. However, that can be fiddly too because it doesn't allow for custom types in the same way, so it may not fit with your use case if you need to be able to create arbitrary content types, such as for a CMS that allowed for custom content types.

Introducing JSON fields
-----------------------

JSON fields allow you to bring some of the flexibility of document databases to the relational world. They allow you to store whatever arbitrary text data you wish as JSON, and retrieve it as usual. More importantly, they also allow you to query by that data, so you can easily filter by fields that need not be set in stone with a database schema.

This means that in the above example of a CMS, instead of having a separate meta table, you can instead store the meta values in a JSON field, thus removing the need for a join and simplifying querying by those values.

PostgreSQL has had this capability for a long time, but it's only comparatively recently that MySQL and MariaDB versions that support it have become widespread. Here I'll show you how you might use it in a Laravel application.

The example will be a content management system with flexible content types. The first step is to create the migration to add the new content table:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateContent extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('content', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('type', 20);
            $table->json('attributes');
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
        Schema::dropIfExists('content');
    }
}
```

Here we're specifying the following fields:

* An auto-incrementing ID (feel free to swap this out for a UUID if it makes sense for your application)
* A string denoting the content type. If you want to limit the values these can accept, you can replace it with an `ENUM` field
* The JSON field, named `attributes`
* The standard Laravel timestamp fields, `created_at` and `updated_at`

If there are certain fields that are common to all of your content types, it would also make sense to define them as fields in the usual way, rather than use the JSON field, since compulsory fields should be enforced by the database.

Next, we'll create the model:

```php
<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Content extends Model
{
    protected $table = 'content';

    protected $casts = [
        'attributes' => 'array'
    ];
}
```

Note that we cast the `attributes` field to an array. If we didn't do this, we'd need to manually run `json_encode()` and `json_decode()` on the field to get it back in a usable form. As it is, we can now easily retrieve fields using array access.

With that done, we can now set up some data:

```php
<?php
$c = new App\Content;
$c->type = 'page';
$c->attributes = [ 
    "type" => "info",
    "title" => "Terms",
    "content" => "Our Terms",
    "layout" => "info",
];
$c->save();
$c = new App\Content;
$c->type = 'link';
$c->attributes = [ 
    "type" => "external",
    "link" => "http://example.com",
];
$c->save();
$c = new App\Content;
$c->type = 'page';
$c->attributes = [ 
    "type" => "promotional",
    "title" => "My page",
    "content" => "This is my page",
    "layout" => "default",
];
$c->save();
```

As you can see, we've been able to set out whatever arbitrary fields we wish on these items. We can then call `toArray()` on a model to get all the fields, including the attributes, or we can call `$c->attributes` to get all those attributes together. We can also get a field via array access, eg `$c->attributes['type']`.

Querying the data
-----------------

The syntax for querying JSON fields is a little bit fiddly:

```sql
SELECT * FROM `content` WHERE attributes -> '$.type' = 'promotional';
```

Fortunately, Eloquent makes it much simpler:

```php
<?php
Content::where('attributes->type', 'promotional')->get();
```

It's also possible to order by a JSON field value, but at the time of writing there's no neat syntax for it, so you have to drop down to writing it using `orderByRaw` in Eloquent:

```php
<?php
Content::orderByRaw("attributes-> '$.type'")->get();
```

Eloquent also supports a few other JSON query types, such as querying if an array contains a value, and I suggest [referring to the documentation](https://laravel.com/docs/6.x/queries#json-where-clauses) if you want to know more.

Other applications
------------------

There are many other scenarios where this approach can be useful. For instance, e-commerce sites often sell many different products that may have arbitrary properties, and it may be necessary to sort and filter by different properties for different types of products. A store that sells, among other things, shoes and storage containers, might need a colour and capacity field for storage containers, and a colour and size field for shoes. Using this approach, you can set up your database in such a way that those arbitrary fields can be set up when needed, and used for filtering.

This approach is not without its downsides. Any data that's stored in a JSON field can't be validated by the database in the same way, so the burden of ensuring that it remains in a consistent state is moved to your application code. However, it's no worse than it would be if you used a document database, and unlike with a document database you can combine JSON and more traditional fields as you see fit.
