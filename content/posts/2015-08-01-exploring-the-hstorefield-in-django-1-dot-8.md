---
title: "Exploring the HStoreField in Django 1.8"
date: 2015-08-01 18:26:54 +0100
categories: 
- python
- django
- postgresql
---

One of the most interesting additions in Django 1.8 is the new Postgres-specific fields. I started using PostgreSQL in preference to MySQL for Django apps last year, and so I was interested in the additional functionality they offer.

By far the biggest deal out of all of these was the new `HStoreField` type. PostgreSQL added a JSON data type a little while back, and `HStoreField` allows you to use that field type. This is a really big deal because it allows you to store arbitrary data as JSON and query it. Previously, you could of course just store data as JSON in a text field, but that lacked the same ability to query it. This gives you many of the advantages of a NoSQL document database such as MongoDB in a relational database. For instance, you can store different products with different data about them, and crucially, query them by that data. Previously, the only way to add arbitrary product data and be able to query it was to have it in a separate table, and it was often cumbersome to join them when fetching multiple products.

Let's see a working example. We might be building an online store where products can have all kinds of arbitrary data stored about them. One product might be a plastic box, and you'd need to list the capacity as an additional attribute. Another product might be a pair of shoes, which have no capacity, but do have a size. It might be difficult to model this otherwise, but `HStoreField` is perfect for this kind of data.

First, let's set up our database. I'll assume you already have PostgreSQL up and running via your package manager. First, we need to create a superuser account so that it can install the extension `hstore`:

```bash
$ createdb djangostore
```

Next, we need to create a new user for this database with superuser access:

```bash
$ createuser store -s -P
```

You'll be prompted for a password - I'm assuming this will just be `password` here. Next, we need to connect to PostgreSQL using the `psql` utility:

```bash
$ psql djangostore -U store -W
```

You'll be prompted for your new password. Next, run the following command:

```psql
# CREATE EXTENSION IF NOT EXISTS hstore;
```

This installs the HStore extension. Next let's make sure our new user has the privileges required on the new database:

```psql
# GRANT ALL PRIVILEGES ON DATABASE djangostore TO store;
# \q
```

We've now created our database and a user to interact with it. Next, we'll set up our Django install:

```bash
$ cd Projects
$ mkdir djangostore
$ cd djangostore
$ pyvenv venv
$ source venv/bin/activate
$ pip install Django psycopg2 ipdb
$ django-admin.py startproject djangostore
$ python manage.py startapp store
```

I'm assuming here that you're using Python 3.4. On Ubuntu, getting it working is [a bit more involved](https://gist.github.com/denilsonsa/21e50a357f2d4920091e).

Next, open up `djangostore/settings.py` and amend `INSTALLED_APPS` to include the new app and the PostgreSQL-specific functionality:

```python
INSTALLED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.postgres',
    'store',
)
```

You'll also need to configure the database settings:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': 'djangostore',
        'USER': 'store',
        'PASSWORD': 'password',
        'HOST': 'localhost',
        'PORT': '',
    }
}
```

We need to create an empty migration to use `HStoreField`:

```bash
$ python manage.py makemigrations --empty store
```

This command should create the file `store/migrations/0001_initial.py`. Open this up and edit it to look like this:

```python
# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.contrib.postgres.operations import HStoreExtension


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        HStoreExtension(),
    ]
```

This will make sure the HStore extension is installed. Next, let's run these migrations:

```bash
$ python manage.py migrate
Operations to perform:
  Synchronize unmigrated apps: messages, staticfiles, postgres
  Apply all migrations: sessions, store, admin, auth, contenttypes
Synchronizing apps without migrations:
  Creating tables...
    Running deferred SQL...
  Installing custom SQL...
Running migrations:
  Rendering model states... DONE
  Applying contenttypes.0001_initial... OK
  Applying auth.0001_initial... OK
  Applying admin.0001_initial... OK
  Applying contenttypes.0002_remove_content_type_name... OK
  Applying auth.0002_alter_permission_name_max_length... OK
  Applying auth.0003_alter_user_email_max_length... OK
  Applying auth.0004_alter_user_username_opts... OK
  Applying auth.0005_alter_user_last_login_null... OK
  Applying auth.0006_require_contenttypes_0002... OK
  Applying sessions.0001_initial... OK
  Applying store.0001_initial... OK
```

Now, we're ready to start creating our `Product` model. Open up `store/models.py` and amend it as follows:

```python
from django.contrib.postgres.fields import HStoreField
from django.db import models

# Create your models here.
class Product(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    name = models.CharField(max_length=200)
    description = models.TextField()
    price = models.FloatField()
    attributes = HStoreField()

    def __str__(self):
        return self.name
```

Note that `HStoreField` is not part of the standard group of model fields, and needs to be imported from the Postgres-specific fields module. Next, let's create and run our migrations:

```bash
$ python manage.py makemigrations
$ python manage.py migrate
```

We should now have a `Product` model where the attributes can be any arbitrary data we want. Note that we installed `ipdb` earlier - if you're not familiar with it, this is an improved Python debugger, and also pulls in `ipython`, an improved Python shell, which Django will use if available.

Open up the Django shell:

```bash
$ python manage.py shell
```

Then, import the `Product` model:

```python
from store.models import Product
```

Let's create our first product - a plastic storage box:

```python
box = Product()
box.name = 'Box'
box.description = 'A big box'
box.price = 5.99
box.attributes = { 'capacity': '1L', "colour": "blue"}
box.save()
```

If we take a look, we can see that the attributes can be returned as a Python dictionary:

```python
In [12]: Product.objects.all()[0].attributes
Out[12]: {'capacity': '1L', 'colour': 'blue'}
```

We can easily retrieve single values:

```python
In [15]: Product.objects.all()[0].attributes['capacity']
Out[15]: '1L'
```

Let's add a second product - a mop:

```python
mop = Product()
mop.name = 'Mop'
mop.description = 'A mop'
mop.price = 12.99
mop.attributes = { 'colour': "red" }
mop.save()
```

Now, we can filter out only the red items easily:

```python
In [2]: Product.objects.filter(attributes__contains={'colour': 'red'})
Out[2]: [<Product: Mop>]
```

Here we search for items where the `colour` attribute is set to `red`, and we only get back the mop. Let's do the same for blue items:

```python
In [3]: Product.objects.filter(attributes__contains={'colour': 'blue'})
Out[3]: [<Product: Box>]
```

Here it returns the box. Let's now search for an item with a capacity of 1L:

```python
In [4]: Product.objects.filter(attributes__contains={'capacity': '1L'})
Out[4]: [<Product: Box>]
```

Only the box has the capacity attribute at all, and it's the only one returned. Let's see what happens when we search for an item with a capacity of 2L, which we know is not present:

```python
In [5]: Product.objects.filter(attributes__contains={'capacity': '2L'})
Out[5]: []
```

No items returned, as expected. Let's look for any item with the `capacity` attribute:

```python
In [6]: Product.objects.filter(attributes__has_key='capacity')
Out[6]: [<Product: Box>]
```

Again, it only returns the box, as that's the only one where that key exists. Note that all of this is tightly integrated with the existing API for the Django ORM. Let's add a third product, a food hamper:

```python
In [3]: hamper = Product()

In [4]: hamper.name = 'Hamper'

In [5]: hamper.description = 'A food hamper'

In [6]: hamper.price = 19.99

In [7]: hamper.attributes = {
   ...: 'contents': 'ham, cheese, coffee',
   ...: 'size': '90cmx60cm'
   ...: }

In [8]: hamper.save()
```

Next, let's return only those items that have a `contents` attribute that contains `cheese`:

```python
In [9]: Product.objects.filter(attributes__contents__contains='cheese')
Out[9]: [<Product: Hamper>]
```

As you can see, the `HStoreField` type allows for quite complex queries, while allowing you to set arbitrary values for an individual item. This overcomes one of the biggest issues with relational databases - the inability to set arbitrary data. Previously, you might have to work around it in some fashion, such as creating a table containing attributes for individual items which had to be joined on the product table. This is very cumbersome and difficult to use, especially when you wanted to work with more than one product. With this approach, it's easy to filter products by multiple values in the HStore field, and you get back all of the attributes at once, as in this example:

```python
In [13]: Product.objects.filter(attributes__capacity='1L', attributes__colour='blue')
Out[13]: [<Product: Box>]
In [14]: Product.objects.filter(attributes__capacity='1L', attributes__colour='blue')[0].attributes
Out[14]: {'capacity': '1L', 'colour': 'blue'}
```

Similar functionality is coming in a future version of MySQL, so it wouldn't be entirely surprising to see `HStoreField` become more generally available in Django in the near future. For now, this functionality is extremely useful and makes for a good reason to ditch MySQL in favour of PostgreSQL for your future Django apps.
