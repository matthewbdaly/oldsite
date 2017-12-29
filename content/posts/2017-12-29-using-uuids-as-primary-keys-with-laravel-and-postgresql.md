---
title: "Using UUIDs as primary keys with Laravel and PostgreSQL"
date: 2017-12-29 18:01:04 +0000
categories:
- php
- laravel
- postgresql
comments: true
---

For many applications, using UUID's as the primary keys on a database table can make a lot of sense. For mobile or offline apps, in particular, they mean you can create new objects locally and assign them a primary key without having to worry about it colliding with another object that was created in the meantime once it gets synchronised to the server. Also, they are less informative to nefarious users - an autoincrementing value in a URL tells a user that that value is the primary key, and means the app may potentially allow gathering of information via user enumeration (eg calling `/api/v1/users/1`, `/api/v1/users/2` etc).

It's fairly straightforward to use UUID's as primary keys on your models when using PostgreSQL. First, you need to set up your migrations to use the `uuid-ossp` extension and set up the `id` field as both a UUID and the primary key. You also need to set a default value manually so that if it's left empty it will generate a UUID for it.

```php
DB::statement('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
Schema::create('items', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->text('text')->nullable();
    $table->timestamps();
});
DB::statement('ALTER TABLE items ALTER COLUMN id SET DEFAULT uuid_generate_v4();');
```

Then, in the model definition, you need to tell Laravel to cast the `id` field to a string, and explicitly set the primary key to `id`:

```php
class Item extends Model
{
    protected $casts = [
        'id' => 'string',
    ];

    protected $primaryKey = "id";
}
```

Once this is done, the model should generate the primary keys for you as usual, except as UUID's. If your application needs to accept UUID primary keys that were created offline, such as in a mobile app, you will probably want to add the `id` field to the `$fillable` array on the model to allow this.
