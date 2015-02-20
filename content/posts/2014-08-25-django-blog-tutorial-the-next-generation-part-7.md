---
layout: post
title: "Django Blog Tutorial - the Next Generation - Part 7"
date: 2014-08-25 17:15:01 +0100
comments: true
categories: 
 - tdd
 - python
 - django
---

Hello once again! In this instalment we'll cover:

* Caching your content with Memcached to improve your site's performance
* Refactoring and simplifying our tests
* Implementing additional feeds
* Creating a simple search engine

Don't forget to activate your virtualenv:

```bash
$ source venv/bin/activate
```

Now let's get started!

Memcached
=========

If you frequent (or used to frequent) social media sites like Reddit, Slashdot or Digg, you may be familiar with something called variously the Digg or Slashdot effect, whereby if a page gets submitted to a social media site, and subsequently becomes popular, it can be hit by a huge number of HTTP requests in a very short period of time, slowing it down or even taking the server down completely.

Now, as a general rule of thumb, for most dynamic websites such as blogs, the bottleneck is not the web server or the programming language, but the database. If you have a lot of people hitting the same page over and over again in quick succession, then you're essentially running the same query over and over again and getting the same result each time, which is expensive in terms of processing power. What you need to be able to do is cache the results of the query in memory for a given period of time so that the number of queries is reduced.

That's where Memcached comes in. It's a simple key-value store that allows you to store values in memory for a given period of time so that they can be retrieved without having to query the database. Memcached is a very common choice for caching, and is by far the fastest and most efficient type of cache available for Django. It's also available on Heroku's free tier.

Django has a very powerful caching framework that supports numerous types of cache in addition to Memcached, such as:

* Database caching
* Filesystem caching
* Local memory caching

There are also third-party backends for using other caching systems such as Redis.

Now, the cache can be used in a number of different ways. You can cache only certain parts of your site if you wish. However, because our site is heavily content-driven, we should be pretty safe to use the per-site cache, which is the simplest way to set up caching.

In order to set up Memcached, there's a couple of Python libraries we'll need. If you want to install them locally, however, you'll need to install both memcached and libmemcached (on Ubuntu, the packages you need are called `memcached` and `libmemcached-dev`) on your development machine. If you don't want to do this, then just copy and paste these lines into `requirements.txt` instead:

```bash
django-pylibmc-sasl==0.2.4
pylibmc==1.3.0
```

If you are happy to install these dependencies locally, then run this command once memcached and libmemcached are installed:

```bash
$ pip install pylibmc django-pylibmc-sasl
```

With that done let's configure Memcached. Open up the settings file and add the following at the bottom:

```python
def get_cache():
  import os
  try:
    os.environ['MEMCACHE_SERVERS'] = os.environ['MEMCACHIER_SERVERS'].replace(',', ';')
    os.environ['MEMCACHE_USERNAME'] = os.environ['MEMCACHIER_USERNAME']
    os.environ['MEMCACHE_PASSWORD'] = os.environ['MEMCACHIER_PASSWORD']
    return {
      'default': {
        'BACKEND': 'django_pylibmc.memcached.PyLibMCCache',
        'TIMEOUT': 300,
        'BINARY': True,
        'OPTIONS': { 'tcp_nodelay': True }
      }
    }
  except:
    return {
      'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'
      }
    }

CACHES = get_cache()
CACHE_MIDDLEWARE_ALIAS = 'default'
CACHE_MIDDLEWARE_SECONDS = 300
CACHE_MIDDLEWARE_KEY_PREFIX = ''
```

Then add the following to `MIDDLEWARE_CLASSES`:

```python
    'django.middleware.cache.UpdateCacheMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.cache.FetchFromCacheMiddleware',
```

That's it! The first section configures the application to use Memcached to cache the content when running on Heroku, and sets some configuration parameters, while the second  section tells Django to use the per-site cache in order to cache all the site content.

Now, Heroku doesn't include Memcached by default - instead it's available as an add-on called Memcachier. To use add-ons you need to set up a credit card for billing. We will set it up to use the free developer plan, but if you outgrow this you can easily switch to a paid plan. To add Memcachier, run this command:

```bash
$ heroku addons:add memcachier:dev
```

Please note that Memcachier can take a few minutes to get set up, so you may want to leave it a little while between adding it and pushing up your changes. Now we'll commit our changes:

```bash
$ git add requirements.txt django_tutorial_blog_ng/settings.py
$ git commit -m 'Implemented caching with Memcached'
```

Then we'll push them up to our remote repository and to Heroku:

```bash
$ git push origin master
$ git push heroku master
```

And that's all you need to do to set up Memcached. In addition to storing your query results in Memcached, enabling the caching framework in Django will also set various HTTP headers to enable web proxies and browsers to cache content for an appropriate length of time. If you open up your browser's developer tools and compare the response headers for your homepage on the latest version of the code with the previous version, you'll notice that a number of additional headers appear, including `Cache-Control`, `Expires` and `Last-Modified`. These tell web browsers and web proxies how often to request the latest version of the HTML document, in order to help you reduce the bandwidth used.

As you can see, for a site like this where you are the only person adding content, it's really easy to implement caching with Django, and for a blog there's very little reason not to do it. If you're not using Heroku and are instead hosting your site on a VPS, then the configuration will be somewhat different - see [here](https://docs.djangoproject.com/en/1.6/topics/cache/#memcached) for details. You can also find information on using other cache backends on the same page.

That isn't all you can do to speed up your site. Heroku doesn't seem to be very good for serving static files, and if your site is attracting a lot of traffic you might want to host your static files elsewhere, such as on Amazon's S3 service. Doing so is outside the scope of this tutorial, but for that use case, you should check out [django-storages](http://django-storages.readthedocs.org/en/latest/index.html).

Clearing the cache automatically
================================

There is one issue with this implementation. As it is right now, if you view the home page, add a post, then reload the page, you may not see the new post immediately because the cache will continue serving the old version until it has expired. That behaviour is less than ideal - we would like the cache to be cleared automatically when a new post gets added so that users will see the new version immediately. That response will still be cached afterwards, so it only means one extra query.

This is the ideal place to introduce [signals](https://docs.djangoproject.com/en/dev/topics/signals/). Signals are a way to carry out a given action when an event takes place. In our case, we plan to clear the cache when a post is saved (either created or updated).

Note that as we'll be testing the behaviour of the cache at this point, you'll need to install Memcached on your local machine, and we'll need to change the settings to fall back to our local Memcached instance:

```python
def get_cache():
  import os
  try:
    os.environ['MEMCACHE_SERVERS'] = os.environ['MEMCACHIER_SERVERS'].replace(',', ';')
    os.environ['MEMCACHE_USERNAME'] = os.environ['MEMCACHIER_USERNAME']
    os.environ['MEMCACHE_PASSWORD'] = os.environ['MEMCACHIER_PASSWORD']
    return {
      'default': {
        'BACKEND': 'django_pylibmc.memcached.PyLibMCCache',
        'TIMEOUT': 300,
        'BINARY': True,
        'OPTIONS': { 'tcp_nodelay': True }
      }
    }
  except:
    return {
      'default': {
        'BACKEND': 'django.core.cache.backends.memcached.PyLibMCCache',
        'LOCATION': '127.0.0.1:11211'
      }
    }

CACHES = get_cache()
CACHE_MIDDLEWARE_ALIAS = 'default'
CACHE_MIDDLEWARE_SECONDS = 300
CACHE_MIDDLEWARE_KEY_PREFIX = ''
```

If you don't want to install Memcached locally, you can skip this step, but be aware that the test we write for clearing the cache will always pass if you do skip it.

Then we'll run our tests to make sure nothing has been broken:

```bash
$ python manage.py jenkins blogengine
Creating test database for alias 'default'...
.......................
----------------------------------------------------------------------
Ran 23 tests in 6.164s

OK
```

Let's commit:

```bash
$ git add django_tutorial_blog_ng/settings.py
$ git commit -m 'Now use Memcached in development'
```

Now we'll add a test for clearing the cache to `PostViewTest`:

```python
    def test_clear_cache(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

        # Create the tag
        tag = Tag()
        tag.name = 'perl'
        tag.description = 'The Perl programming language'
        tag.save()

        # Create the author
        author = User.objects.create_user('testuser', 'user@example.com', 'password')
        author.save()

        # Create the site
        site = Site()
        site.name = 'example.com'
        site.domain = 'example.com'
        site.save()

        # Create the first post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is [my first blog post](http://127.0.0.1:8000/)'
        post.slug = 'my-first-post'
        post.pub_date = timezone.now()
        post.author = author
        post.site = site
        post.category = category
        post.save()
        post.tags.add(tag)

        # Check new post saved
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)

        # Fetch the index
        response = self.client.get('/')
        self.assertEquals(response.status_code, 200)

        # Create the second post
        post = Post()
        post.title = 'My second post'
        post.text = 'This is [my second blog post](http://127.0.0.1:8000/)'
        post.slug = 'my-second-post'
        post.pub_date = timezone.now()
        post.author = author
        post.site = site
        post.category = category
        post.save()
        post.tags.add(tag)

        # Fetch the index again
        response = self.client.get('/')

        # Check second post present
        self.assertTrue('my second blog post' in response.content)
```

This should be fairly self-explanatory. We create one post, and request the index page. We then add a second post, request the index page again, and check for the second post. The test should fail because the cached version is returned, rather than the version in the database.

Now we have a test in place, we can implement a fix. First, add this to the top of your `models.py`:

```python
from django.db.models.signals import post_save
from django.core.cache import cache
```

Then add the following at the bottom of the file:

```python

# Define signals
def new_post(sender, instance, created, **kwargs):
    cache.clear()

# Set up signals
post_save.connect(new_post, sender=Post)
```

This is fairly straightforward. What we're doing is first defining a function called `new_post` that is called when a new post is created. We then connect it to the `post_save` signal. When a post is saved, it calls `new_post`, which clears the cache, making sure users are seeing the latest and greatest version of your site immediately.

Let's test it:

```bash
$ python manage.py jenkins blogengine
Creating test database for alias 'default'...
........................
----------------------------------------------------------------------
Ran 24 tests in 8.473s

OK
Destroying test database for alias 'default'...
```

There are a number of signals available, and when you create one, you have access to the created object via the `instance` parameter. Using signals you can implement all kinds of functionality. For instance, you could implement the functionality to send an email when a new post is published.

If you're using Travis CI, you'll also need to update the config file:

```yaml
language: python
python:
- "2.7"
services: memcached
before_install:
    - sudo apt-get install -y libmemcached-dev
# command to install dependencies
install: "pip install -r requirements.txt"
# command to run tests
script: coverage run --include="blogengine/*" --omit="blogengine/migrations/*" manage.py test blogengine
after_success:
    coveralls
```

Time to commit:

```bash
$ git add blogengine/ .travis.yml
$ git commit -m 'Now clear cache when post added'
```

Formatting for RSS feeds
====================

Now, we want to offer more than one option for RSS feeds. For instance, if your blog is aggregated on a site such as [Planet Python](http://planet.python.org/), but you also blog about JavaScript, you may want to be able to provide a feed for posts in the `python` category only.

If you have written any posts that use any of Markdown's custom formatting, you may notice that if you load your RSS feed in a reader, it isn't formatted as Markdown. Let's fix that. First we'll amend our test:

```python
class FeedTest(BaseAcceptanceTest):
    def test_all_post_feed(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

        # Create the tag
        tag = Tag()
        tag.name = 'python'
        tag.description = 'The Python programming language'
        tag.save()

        # Create the author
        author = User.objects.create_user('testuser', 'user@example.com', 'password')
        author.save()

        # Create the site
        site = Site()
        site.name = 'example.com'
        site.domain = 'example.com'
        site.save()
 
        # Create a post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is my *first* blog post'
        post.slug = 'my-first-post'
        post.pub_date = timezone.now()
        post.author = author
        post.site = site
        post.category = category

        # Save it
        post.save()

        # Add the tag
        post.tags.add(tag)
        post.save()

        # Check we can find it
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)
        only_post = all_posts[0]
        self.assertEquals(only_post, post)

        # Fetch the feed
        response = self.client.get('/feeds/posts/')
        self.assertEquals(response.status_code, 200)

        # Parse the feed
        feed = feedparser.parse(response.content)

        # Check length
        self.assertEquals(len(feed.entries), 1)

        # Check post retrieved is the correct one
        feed_post = feed.entries[0]
        self.assertEquals(feed_post.title, post.title)
        self.assertTrue('This is my <em>first</em> blog post' in feed_post.description)
```

Don't forget to run the tests to make sure they fail. Now, let's fix it:

```python
from django.shortcuts import render
from django.views.generic import ListView
from blogengine.models import Category, Post, Tag
from django.contrib.syndication.views import Feed
from django.utils.encoding import force_unicode
from django.utils.safestring import mark_safe
import markdown2

# Create your views here.
class CategoryListView(ListView):
    def get_queryset(self):
        slug = self.kwargs['slug']
        try:
            category = Category.objects.get(slug=slug)
            return Post.objects.filter(category=category)
        except Category.DoesNotExist:
            return Post.objects.none()


class TagListView(ListView):
    def get_queryset(self):
        slug = self.kwargs['slug']
        try:
            tag = Tag.objects.get(slug=slug)
            return tag.post_set.all()
        except Tag.DoesNotExist:
            return Post.objects.none()


class PostsFeed(Feed):
    title = "RSS feed - posts"
    link = "feeds/posts/"
    description = "RSS feed - blog posts"

    def items(self):
        return Post.objects.order_by('-pub_date')

    def item_title(self, item):
        return item.title

    def item_description(self, item):
        extras = ["fenced-code-blocks"]
        content = mark_safe(markdown2.markdown(force_unicode(item.text),
                                               extras = extras))
        return content
```

All we're doing here is amending the `item_description` method of `PostsFeed` to render it as Markdown. Now let's run our tests again:

```bash
$ python manage.py jenkins
Creating test database for alias 'default'...
........................
----------------------------------------------------------------------
Ran 24 tests in 9.370s

OK
Destroying test database for alias 'default'...
```

With that done, we'll commit our changes:

```bash
$ git add blogengine/
$ git commit -m 'Fixed rendering for post feed'
```

Refactoring our tests
=====================

Now, before we get into implementing the feed, our tests are a bit verbose. We create a lot of items over and over again - let's sort that out. Factory Boy is a handy Python module that allows you to create easy-to-use factories for creating objects over and over again in tests. Let's install it:

```bash
$ pip install factory_boy
$ pip freeze > requirements.txt
$ git add requirements.txt
$ git commit -m 'Installed Factory Boy'
```

Now let's set up a factory for creating posts. Add this at the top of the test file:

```python
import factory.django
```

Then, before your actual tests, insert the following:

```python
# Factories
class SiteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Site
        django_get_or_create = (
            'name',
            'domain'
        )
        
    name = 'example.com'
    domain = 'example.com'
```

Now, wherever you call `Site()`, add its attributes, and save it, replace those lines with the following:

```python
        site = SiteFactory()
```

Much simpler and more concise, I'm sure you'll agree! Now, let's run the tests to make sure they aren't broken:

```bash
$ python manage.py test blogengine
Creating test database for alias 'default'...
........................
----------------------------------------------------------------------
Ran 24 tests in 7.482s

OK
Destroying test database for alias 'default'...
```

Let's commit again:
```bash
$ git add blogengine/tests.py
$ git commit -m 'Now use Factory Boy for site objects'
```

Let's do the same thing with `Category` objects:

```python
class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category
        django_get_or_create = (
            'name',
            'description',
            'slug'
        )

    name = 'python'
    description = 'The Python programming language'
    slug = 'python'
```

Again, just find every time we call `Category()` and replace it with the following:

```python
        category = CategoryFactory()
```

Now if we run our tests, we'll notice a serious error:

```bash
$ python manage.py test blogengine
Creating test database for alias 'default'...
EE..EE.EE.EE...E.EEE..E.
======================================================================
ERROR: test_create_category (blogengine.tests.PostTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 42, in test_create_category
    category = CategoryFactory()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 82, in __call__
    return cls.create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 585, in create
    return cls._generate(True, attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 510, in _generate
    obj = cls._prepare(create, **attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 485, in _prepare
    return cls._create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 151, in _create
    return cls._get_or_create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 142, in _get_or_create
    obj, _created = manager.get_or_create(*args, **key_fields)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/manager.py", line 154, in get_or_create
    return self.get_queryset().get_or_create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/query.py", line 383, in get_or_create
    obj.save(force_insert=True, using=self.db)
TypeError: save() got an unexpected keyword argument 'force_insert'

======================================================================
ERROR: test_create_post (blogengine.tests.PostTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 80, in test_create_post
    category = CategoryFactory()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 82, in __call__
    return cls.create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 585, in create
    return cls._generate(True, attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 510, in _generate
    obj = cls._prepare(create, **attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 485, in _prepare
    return cls._create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 151, in _create
    return cls._get_or_create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 142, in _get_or_create
    obj, _created = manager.get_or_create(*args, **key_fields)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/manager.py", line 154, in get_or_create
    return self.get_queryset().get_or_create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/query.py", line 383, in get_or_create
    obj.save(force_insert=True, using=self.db)
TypeError: save() got an unexpected keyword argument 'force_insert'

======================================================================
ERROR: test_create_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 339, in test_create_post
    category = CategoryFactory()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 82, in __call__
    return cls.create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 585, in create
    return cls._generate(True, attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 510, in _generate
    obj = cls._prepare(create, **attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 485, in _prepare
    return cls._create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 151, in _create
    return cls._get_or_create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 142, in _get_or_create
    obj, _created = manager.get_or_create(*args, **key_fields)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/manager.py", line 154, in get_or_create
    return self.get_queryset().get_or_create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/query.py", line 383, in get_or_create
    obj.save(force_insert=True, using=self.db)
TypeError: save() got an unexpected keyword argument 'force_insert'

======================================================================
ERROR: test_create_post_without_tag (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 378, in test_create_post_without_tag
    category = CategoryFactory()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 82, in __call__
    return cls.create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 585, in create
    return cls._generate(True, attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 510, in _generate
    obj = cls._prepare(create, **attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 485, in _prepare
    return cls._create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 151, in _create
    return cls._get_or_create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 142, in _get_or_create
    obj, _created = manager.get_or_create(*args, **key_fields)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/manager.py", line 154, in get_or_create
    return self.get_queryset().get_or_create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/query.py", line 383, in get_or_create
    obj.save(force_insert=True, using=self.db)
TypeError: save() got an unexpected keyword argument 'force_insert'

======================================================================
ERROR: test_delete_category (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 245, in test_delete_category
    category = CategoryFactory()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 82, in __call__
    return cls.create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 585, in create
    return cls._generate(True, attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 510, in _generate
    obj = cls._prepare(create, **attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 485, in _prepare
    return cls._create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 151, in _create
    return cls._get_or_create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 142, in _get_or_create
    obj, _created = manager.get_or_create(*args, **key_fields)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/manager.py", line 154, in get_or_create
    return self.get_queryset().get_or_create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/query.py", line 383, in get_or_create
    obj.save(force_insert=True, using=self.db)
TypeError: save() got an unexpected keyword argument 'force_insert'

======================================================================
ERROR: test_delete_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 467, in test_delete_post
    category = CategoryFactory()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 82, in __call__
    return cls.create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 585, in create
    return cls._generate(True, attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 510, in _generate
    obj = cls._prepare(create, **attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 485, in _prepare
    return cls._create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 151, in _create
    return cls._get_or_create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 142, in _get_or_create
    obj, _created = manager.get_or_create(*args, **key_fields)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/manager.py", line 154, in get_or_create
    return self.get_queryset().get_or_create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/query.py", line 383, in get_or_create
    obj.save(force_insert=True, using=self.db)
TypeError: save() got an unexpected keyword argument 'force_insert'

======================================================================
ERROR: test_edit_category (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 221, in test_edit_category
    category = CategoryFactory()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 82, in __call__
    return cls.create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 585, in create
    return cls._generate(True, attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 510, in _generate
    obj = cls._prepare(create, **attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 485, in _prepare
    return cls._create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 151, in _create
    return cls._get_or_create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 142, in _get_or_create
    obj, _created = manager.get_or_create(*args, **key_fields)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/manager.py", line 154, in get_or_create
    return self.get_queryset().get_or_create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/query.py", line 383, in get_or_create
    obj.save(force_insert=True, using=self.db)
TypeError: save() got an unexpected keyword argument 'force_insert'

======================================================================
ERROR: test_edit_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 410, in test_edit_post
    category = CategoryFactory()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 82, in __call__
    return cls.create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 585, in create
    return cls._generate(True, attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 510, in _generate
    obj = cls._prepare(create, **attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 485, in _prepare
    return cls._create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 151, in _create
    return cls._get_or_create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 142, in _get_or_create
    obj, _created = manager.get_or_create(*args, **key_fields)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/manager.py", line 154, in get_or_create
    return self.get_queryset().get_or_create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/query.py", line 383, in get_or_create
    obj.save(force_insert=True, using=self.db)
TypeError: save() got an unexpected keyword argument 'force_insert'

======================================================================
ERROR: test_all_post_feed (blogengine.tests.FeedTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 810, in test_all_post_feed
    category = CategoryFactory()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 82, in __call__
    return cls.create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 585, in create
    return cls._generate(True, attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 510, in _generate
    obj = cls._prepare(create, **attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 485, in _prepare
    return cls._create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 151, in _create
    return cls._get_or_create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 142, in _get_or_create
    obj, _created = manager.get_or_create(*args, **key_fields)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/manager.py", line 154, in get_or_create
    return self.get_queryset().get_or_create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/query.py", line 383, in get_or_create
    obj.save(force_insert=True, using=self.db)
TypeError: save() got an unexpected keyword argument 'force_insert'

======================================================================
ERROR: test_category_page (blogengine.tests.PostViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 640, in test_category_page
    category = CategoryFactory()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 82, in __call__
    return cls.create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 585, in create
    return cls._generate(True, attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 510, in _generate
    obj = cls._prepare(create, **attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 485, in _prepare
    return cls._create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 151, in _create
    return cls._get_or_create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 142, in _get_or_create
    obj, _created = manager.get_or_create(*args, **key_fields)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/manager.py", line 154, in get_or_create
    return self.get_queryset().get_or_create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/query.py", line 383, in get_or_create
    obj.save(force_insert=True, using=self.db)
TypeError: save() got an unexpected keyword argument 'force_insert'

======================================================================
ERROR: test_clear_cache (blogengine.tests.PostViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 753, in test_clear_cache
    category = CategoryFactory()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 82, in __call__
    return cls.create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 585, in create
    return cls._generate(True, attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 510, in _generate
    obj = cls._prepare(create, **attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 485, in _prepare
    return cls._create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 151, in _create
    return cls._get_or_create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 142, in _get_or_create
    obj, _created = manager.get_or_create(*args, **key_fields)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/manager.py", line 154, in get_or_create
    return self.get_queryset().get_or_create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/query.py", line 383, in get_or_create
    obj.save(force_insert=True, using=self.db)
TypeError: save() got an unexpected keyword argument 'force_insert'

======================================================================
ERROR: test_index (blogengine.tests.PostViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 518, in test_index
    category = CategoryFactory()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 82, in __call__
    return cls.create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 585, in create
    return cls._generate(True, attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 510, in _generate
    obj = cls._prepare(create, **attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 485, in _prepare
    return cls._create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 151, in _create
    return cls._get_or_create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 142, in _get_or_create


    obj, _created = manager.get_or_create(*args, **key_fields)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/manager.py", line 154, in get_or_create
    return self.get_queryset().get_or_create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/query.py", line 383, in get_or_create
    obj.save(force_insert=True, using=self.db)
TypeError: save() got an unexpected keyword argument 'force_insert'

======================================================================
ERROR: test_post_page (blogengine.tests.PostViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 576, in test_post_page
    category = CategoryFactory()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 82, in __call__
    return cls.create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 585, in create
    return cls._generate(True, attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 510, in _generate
    obj = cls._prepare(create, **attrs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/base.py", line 485, in _prepare
    return cls._create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 151, in _create


    return cls._get_or_create(model_class, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/factory/django.py", line 142, in _get_or_create
    obj, _created = manager.get_or_create(*args, **key_fields)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/manager.py", line 154, in get_or_create
    return self.get_queryset().get_or_create(**kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/query.py", line 383, in get_or_create
    obj.save(force_insert=True, using=self.db)
TypeError: save() got an unexpected keyword argument 'force_insert'

----------------------------------------------------------------------
Ran 24 tests in 5.162s

FAILED (errors=13)
Destroying test database for alias 'default'...
```

Thankfully, this is easy to fix. We just need to amend the custom `save()` method of the `Category` model:

```python
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(unicode(self.name))
        super(Category, self).save(*args, **kwargs)
```

That should resolve the issue:

```bash
$ python manage.py jenkins
Creating test database for alias 'default'...
........................
----------------------------------------------------------------------
Ran 24 tests in 7.749s

OK
Destroying test database for alias 'default'...
```

Let's commit again:

```bash
$ git add blogengine/
$ git commit -m 'Category now uses Factory Boy'
```

Now let's do the same thing for tags:

```python
class TagFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Tag
        django_get_or_create = (
            'name',
            'description',
            'slug'
        )

    name = 'python'
    description = 'The Python programming language'
    slug = 'python'
```

And replace the sections where we create new `Tag` objects:

```python
        tag = TagFactory()
```

Note that some tags have different values. We can easily pass different values to our `TagFactory()` to override the default values:

```python
        tag = TagFactory(name='perl', description='The Perl programming language')
```

The `Tag` model has the same issue as the `Category` one did, so let's fix that:

```python
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(unicode(self.name))
        super(Tag, self).save(*args, **kwargs)
```

We run our tests again:

```bash
$ python manage.py test blogengine/
Creating test database for alias 'default'...
........................
----------------------------------------------------------------------
Ran 24 tests in 7.153s

OK
Destroying test database for alias 'default'...
```

Time to commit again:

```bash
$ git add blogengine/
$ git commit -m 'Now use Factory Boy for tags'
```

Next we'll create a factory for adding users. Note that the factory name doesn't have to match the object name, so you can create factories for different types of users. Here we create a factory for authors - you could, for instance, create a separate factory for subscribers if you wanted:

```python
class AuthorFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ('username','email', 'password',)

    username = 'testuser'
    email = 'user@example.com'
    password = 'password'
```

And as before, replace those sections where we create users with the following:

```python
        author = AuthorFactory()
```

Run the tests again:

```bash
$ python manage.py test blogengine
Creating test database for alias 'default'...
........................
----------------------------------------------------------------------
Ran 24 tests in 5.808s

OK
Destroying test database for alias 'default'...
```

We commit our changes:

```bash
$ git add blogengine/
$ git commit -m 'Now use Factory Boy for creating authors'
```

Now we'll create a flat page factory:

```python


class FlatPageFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = FlatPage
        django_get_or_create = (
            'url',
            'title',
            'content'
        )

    url = '/about/'
    title = 'About me'
    content = 'All about me'
```

And use it for our flat page test:
```python
        page = FlatPageFactory()
```

Check the tests pass:

```bash
$ python manage.py test blogengine
Creating test database for alias 'default'...
........................
----------------------------------------------------------------------
Ran 24 tests in 5.796s

OK
Destroying test database for alias 'default'...
```

And commit again:

```bash
$ git add blogengine/
$ git commit -m 'Now use Factory Boy for flat page test'
```

Now we'll create a final factory for posts:

```python
class PostFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Post
        django_get_or_create = (
            'title',
            'text',
            'slug',
            'pub_date'
        )

    title = 'My first post'
    text = 'This is my first blog post'
    slug = 'my-first-post'
    pub_date = timezone.now()
    author = factory.SubFactory(AuthorFactory)
    site = factory.SubFactory(SiteFactory)
    category = factory.SubFactory(CategoryFactory)
```

This factory is a little bit different. Because our `Post` model depends on several others, we need to be able to create those additional objects on demand. By designating them as subfactories, we can easily create the associated objects for our `Post` object.

That means that not only can we get rid of our `Post()` calls, but we can also get rid of the factory calls to create the associated objects for `Post` models. Again, I'll leave actually doing this as an exercise for the reader, but you can always refer to the GitHub repository if you're not too sure.

Make sure your tests still pass, then commit the changes:

```bash
$ git add blogengine/
$ git commit -m 'Now use Factory Boy for testing posts'
```

Using Factory Boy made a big difference to the size of the test file - I was able to cut it down by over 200 lines of code. As your application gets bigger, it gets harder to maintain, so do what you can to keep the size down.

Additional RSS feeds
====================

Now, let's implement our additional RSS feeds. First, we'll write a test for the category feed. Add this to the `FeedTest` class:

```python
    def test_category_feed(self):
        # Create a post
        post = PostFactory(text='This is my *first* blog post')

        # Create another post in a different category
        category = CategoryFactory(name='perl', description='The Perl programming language', slug='perl')
        post2 = PostFactory(text='This is my *second* blog post', title='My second post', slug='my-second-post', category=category)

        # Fetch the feed
        response = self.client.get('/feeds/posts/category/python/')
        self.assertEquals(response.status_code, 200)

        # Parse the feed
        feed = feedparser.parse(response.content)

        # Check length
        self.assertEquals(len(feed.entries), 1)

        # Check post retrieved is the correct one
        feed_post = feed.entries[0]
        self.assertEquals(feed_post.title, post.title)
        self.assertTrue('This is my <em>first</em> blog post' in feed_post.description)

        # Check other post is not in this feed
        self.assertTrue('This is my <em>second</em> blog post' not in response.content)
```

Here we create two posts in different categories (note that we create a new category and override the post category for it). We then fetch `/feeds/posts/category/python/` and assert that it contains only one post, with the content of the first post and not the content of the second.

Run the tests and they should fail:

```bash
$ python manage.py test blogengine
Creating test database for alias 'default'...
................F........
======================================================================
FAIL: test_category_feed (blogengine.tests.FeedTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 716, in test_category_feed
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

----------------------------------------------------------------------
Ran 25 tests in 5.804s

FAILED (failures=1)
Destroying test database for alias 'default'...
```

Because we haven't yet implemented that route, we get a 404 error. So let's create a route for this:

```python
from django.conf.urls import patterns, url
from django.views.generic import ListView, DetailView
from blogengine.models import Post, Category, Tag
from blogengine.views import CategoryListView, TagListView, PostsFeed, CategoryPostsFeed

urlpatterns = patterns('',
    # Index
    url(r'^(?P<page>\d+)?/?$', ListView.as_view(
        model=Post,
        paginate_by=5,
        )),

    # Individual posts
    url(r'^(?P<pub_date__year>\d{4})/(?P<pub_date__month>\d{1,2})/(?P<slug>[a-zA-Z0-9-]+)/?$', DetailView.as_view(
        model=Post,
        )),

    # Categories
    url(r'^category/(?P<slug>[a-zA-Z0-9-]+)/?$', CategoryListView.as_view(
        paginate_by=5,
        model=Category,
        )),

    # Tags
    url(r'^tag/(?P<slug>[a-zA-Z0-9-]+)/?$', TagListView.as_view(
        paginate_by=5,
        model=Tag,
        )),

    # Post RSS feed
    url(r'^feeds/posts/$', PostsFeed()),

    # Category RSS feed
    url(r'^feeds/posts/category/(?P<slug>[a-zA-Z0-9-]+)/?$', CategoryPostsFeed()),
)
```

Note that the category RSS feed route is similar to the post RSS feed route, but accepts a `slug` parameter. We will use this to pass through the slug for the category in question. Also note we import the `CategoryPostsFeed` view. Now, we need to create that view. Fortunately, because it's written as a Python class, we can extend the existing `PostsFeed` class. Open up your views file and amend it to look like this:

```python
from django.shortcuts import get_object_or_404
from django.views.generic import ListView
from blogengine.models import Category, Post, Tag
from django.contrib.syndication.views import Feed
from django.utils.encoding import force_unicode
from django.utils.safestring import mark_safe
import markdown2

# Create your views here.
class CategoryListView(ListView):
    def get_queryset(self):
        slug = self.kwargs['slug']
        try:
            category = Category.objects.get(slug=slug)
            return Post.objects.filter(category=category)
        except Category.DoesNotExist:
            return Post.objects.none()


class TagListView(ListView):
    def get_queryset(self):
        slug = self.kwargs['slug']
        try:
            tag = Tag.objects.get(slug=slug)
            return tag.post_set.all()
        except Tag.DoesNotExist:
            return Post.objects.none()


class PostsFeed(Feed):
    title = "RSS feed - posts"
    description = "RSS feed - blog posts"
    link = '/'

    def items(self):
        return Post.objects.order_by('-pub_date')

    def item_title(self, item):
        return item.title

    def item_description(self, item):
        extras = ["fenced-code-blocks"]
        content = mark_safe(markdown2.markdown(force_unicode(item.text),
                                               extras = extras))
        return content


class CategoryPostsFeed(PostsFeed):
    def get_object(self, request, slug):
        return get_object_or_404(Category, slug=slug)

    def title(self, obj):
        return "RSS feed - blog posts in category %s" % obj.name

    def link(self, obj):
        return obj.get_absolute_url()

    def description(self, obj):
        return "RSS feed - blog posts in category %s" % obj.name

    def items(self, obj):
        return Post.objects.filter(category=obj).order_by('-pub_date')
```

Note that many of our fields don't have to be explicitly defined as they are inherited from `PostsFeed`. We can't hard-code the title, link or description because they depend on the category, so we instead define methods to return the appropriate text.

Also note `get_object()` - we define this so that we can ensure the category exists. If it doesn't exist, then it returns a 404 error rather than showing an empty feed.

We also override `items()` to filter it to just those posts that are in the given category.

If you run the tests again, they should now pass:

```bash
$ python manage.py test blogengine
Creating test database for alias 'default'...
.........................
----------------------------------------------------------------------
Ran 25 tests in 5.867s

OK
Destroying test database for alias 'default'...
```

Let's commit our changes:

```bash
$ git add blogengine/
$ git commit -m 'Implemented category RSS feed'
```

Now, we can get our category RSS feed, but how do we navigate to it? Let's add a link to each category page that directs a user to its RSS feed. To do so, we'll need to create a new template for category pages. First, let's add some code to our tests to ensure that the right template is used at all times. Add the following to the end of the `test_index` method of `PostViewTest`:

```python
        # Check the correct template was used
        self.assertTemplateUsed(response, 'blogengine/post_list.html')
```

Then, add this to the end of `test_post_page`:

```python

        # Check the correct template was used
        self.assertTemplateUsed(response, 'blogengine/post_detail.html')
```

Finally, add this to the end of `test_category_page`:

```python
        # Check the correct template was used
        self.assertTemplateUsed(response, 'blogengine/category_post_list.html')
```

These assertions confirm which template was used to generate which request.

Next, we head into our views file:

```python
class CategoryListView(ListView):
    template_name = 'blogengine/category_post_list.html'

    def get_queryset(self):
        slug = self.kwargs['slug']
        try:
            category = Category.objects.get(slug=slug)
            return Post.objects.filter(category=category)
        except Category.DoesNotExist:
            return Post.objects.none()

    def get_context_data(self, **kwargs):
        context = super(CategoryListView, self).get_context_data(**kwargs)
        slug = self.kwargs['slug']
        try:
            context['category'] = Category.objects.get(slug=slug)
        except Category.DoesNotExist:
            context['category'] = None
        return context
```

Note that we first of all change the template used by this view. Then, we override `get_context_data` to add in additional data. What we're doing is getting the slug that was passed through, looking up any category for which it is the slug, and returning it as additional context data. Using this method, you can easily add additional data that you may wish to render in your Django templates.

Finally, we create our new template:

```django
{% extends "blogengine/includes/base.html" %}

    {% load custom_markdown %}

    {% block content %}
        {% if object_list %}
            {% for post in object_list %}
            <div class="post col-md-12">
            <h1><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h1>
            <h3>{{ post.pub_date }}</h3>
            {{ post.text|custom_markdown }}
            </div>
            {% if post.category %}
            <div class="col-md-12">
            <a href="{{ post.category.get_absolute_url }}"><span class="label label-primary">{{ post.category.name }}</span></a>
            </div>
            {% endif %}
            {% if post.tags %}
            <div class="col-md-12">
            {% for tag in post.tags.all %}
            <a href="{{ tag.get_absolute_url }}"><span class="label label-success">{{ tag.name }}</span></a>
            {% endfor %}
            </div>
            {% endif %}
            {% endfor %}
        {% else %}
            <p>No posts found</p>
        {% endif %}

        <ul class="pager">
        {% if page_obj.has_previous %}
        <li class="previous"><a href="/{{ page_obj.previous_page_number }}/">Previous Page</a></li>
        {% endif %}
        {% if page_obj.has_next %}
        <li class="next"><a href="/{{ page_obj.next_page_number }}/">Next Page</a></li>
        {% endif %}
        </ul>

        <a href="/feeds/posts/category/{{ category.slug }}/">RSS feed for category {{ category.name }}</a>

    {% endblock %}
```

Note that the category has been passed through to the template and is now accessible. If you run the tests, they should now pass:

```bash
$ python manage.py jenkins
Creating test database for alias 'default'...
.........................
----------------------------------------------------------------------
Ran 25 tests in 7.232s

OK
Destroying test database for alias 'default'...
```

With that done. we can commit our changes:

```bash
$ git add templates/ blogengine/
$ git commit -m 'Added link to RSS feed from category page'
```

Next up, let's implement another RSS feed for tags. First, we'll implement our test:

```python
      def test_tag_feed(self):
          # Create a post
          post = PostFactory(text='This is my *first* blog post')
          tag = TagFactory()
          post.tags.add(tag)
          post.save()

          # Create another post with a different tag
          tag2 = TagFactory(name='perl', description='The Perl programming language', slug='perl')
          post2 = PostFactory(text='This is my *second* blog post', title='My second post', slug='my-second-post')
          post2.tags.add(tag2)
          post2.save()

          # Fetch the feed
          response = self.client.get('/feeds/posts/tag/python/')
          self.assertEquals(response.status_code, 200)

          # Parse the feed
          feed = feedparser.parse(response.content)

          # Check length
          self.assertEquals(len(feed.entries), 1)

          # Check post retrieved is the correct one
          feed_post = feed.entries[0]
          self.assertEquals(feed_post.title, post.title)
          self.assertTrue('This is my <em>first</em> blog post' in feed_post.description)

          # Check other post is not in this feed
          self.assertTrue('This is my <em>second</em> blog post' not in response.content)
```

This is virtually identical to the test for the categroy feed, but we adjust it to work with the `Tag` attribute and change the URL. Let's check that our test fails:

```bash
$ python manage.py test blogengine
Creating test database for alias 'default'...
.................F........
======================================================================
FAIL: test_tag_feed (blogengine.tests.FeedTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 757, in test_tag_feed
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

----------------------------------------------------------------------
Ran 26 tests in 5.760s

FAILED (failures=1)
Destroying test database for alias 'default'...
```

As before, we create a route for this:

```python
from django.conf.urls import patterns, url
from django.views.generic import ListView, DetailView
from blogengine.models import Post, Category, Tag
from blogengine.views import CategoryListView, TagListView, PostsFeed, CategoryPostsFeed, TagPostsFeed

urlpatterns = patterns('',
    # Index
    url(r'^(?P<page>\d+)?/?$', ListView.as_view(
        model=Post,
        paginate_by=5,
        )),

    # Individual posts
    url(r'^(?P<pub_date__year>\d{4})/(?P<pub_date__month>\d{1,2})/(?P<slug>[a-zA-Z0-9-]+)/?$', DetailView.as_view(
        model=Post,
        )),

    # Categories
    url(r'^category/(?P<slug>[a-zA-Z0-9-]+)/?$', CategoryListView.as_view(
        paginate_by=5,
        model=Category,
        )),

    # Tags
    url(r'^tag/(?P<slug>[a-zA-Z0-9-]+)/?$', TagListView.as_view(
        paginate_by=5,
        model=Tag,
        )),

    # Post RSS feed
    url(r'^feeds/posts/$', PostsFeed()),

    # Category RSS feed
    url(r'^feeds/posts/category/(?P<slug>[a-zA-Z0-9-]+)/?$', CategoryPostsFeed()),

    # Tag RSS feed
    url(r'^feeds/posts/tag/(?P<slug>[a-zA-Z0-9-]+)/?$', TagPostsFeed()),
)
```

Next, we create our view:

```python
class TagPostsFeed(PostsFeed):
    def get_object(self, request, slug):
        return get_object_or_404(Tag, slug=slug)

    def title(self, obj):
        return "RSS feed - blog posts tagged  %s" % obj.name

    def link(self, obj):
        return obj.get_absolute_url()

    def description(self, obj):
        return "RSS feed - blog posts tagged %s" % obj.name

    def items(self, obj):
        try:
            tag = Tag.objects.get(slug=obj.slug)
            return tag.post_set.all()
        except Tag.DoesNotExist:
            return Post.objects.none()
```

Again, this inherits from `PostsFeed`, but the syntax for getting posts matching a tag is slightly different because they use a many-to-many relationship.

We also need a template for the tag pages. Add this to the end of the `test_tag_page` method:

```python

        # Check the correct template was used
        self.assertTemplateUsed(response, 'blogengine/tag_post_list.html')
```

Let's create that template:

```django
{% extends "blogengine/includes/base.html" %}

    {% load custom_markdown %}

    {% block content %}
        {% if object_list %}
            {% for post in object_list %}
            <div class="post col-md-12">
            <h1><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h1>
            <h3>{{ post.pub_date }}</h3>
            {{ post.text|custom_markdown }}
            </div>
            {% if post.category %}
            <div class="col-md-12">
            <a href="{{ post.category.get_absolute_url }}"><span class="label label-primary">{{ post.category.name }}</span></a>
            </div>
            {% endif %}
            {% if post.tags %}
            <div class="col-md-12">
            {% for tag in post.tags.all %}
            <a href="{{ tag.get_absolute_url }}"><span class="label label-success">{{ tag.name }}</span></a>
            {% endfor %}
            </div>
            {% endif %}
            {% endfor %}
        {% else %}
            <p>No posts found</p>
        {% endif %}

        <ul class="pager">
        {% if page_obj.has_previous %}
        <li class="previous"><a href="/{{ page_obj.previous_page_number }}/">Previous Page</a></li>
        {% endif %}
        {% if page_obj.has_next %}
        <li class="next"><a href="/{{ page_obj.next_page_number }}/">Next Page</a></li>
        {% endif %}
        </ul>

        <a href="/feeds/posts/tag/{{ tag.slug }}/">RSS feed for tag {{ tag.name }}</a>

    {% endblock %}
```

This is virtually identical to the category template. You'll also need to apply this template in the view for the tag list, and pass the tag name through as context data:

```python
class TagListView(ListView):
    template_name = 'blogengine/tag_post_list.html'

    def get_queryset(self):
        slug = self.kwargs['slug']
        try:
            tag = Tag.objects.get(slug=slug)
            return tag.post_set.all()
        except Tag.DoesNotExist:
            return Post.objects.none()

    def get_context_data(self, **kwargs):
        context = super(TagListView, self).get_context_data(**kwargs)
        slug = self.kwargs['slug']
        try:
            context['tag'] = Tag.objects.get(slug=slug)
        except Tag.DoesNotExist:
            context['tag'] = None
        return context
```

Let's run our tests:

```bash
$ python manage.py test blogengine
Creating test database for alias 'default'...
..........................
----------------------------------------------------------------------
Ran 26 tests in 5.770s

OK
Destroying test database for alias 'default'...
```

You may want to do a quick check to ensure your tag feed link works as expected. Time to commit:

```bash
$ git add blogengine templates
$ git commit -m 'Implemented tag feeds'
```

Moving our templates
====================

Before we crack on with implementing search, there's one more piece of housekeeping. In Django, templates can be applied at project level or at app level. So far, we've been storing them in the project, but we would like our app to be as self-contained as possible so it can just be dropped into future projects where we need a blog. That way, it can be easily overridden for specific projects. You can move the folders and update the Git repository at the same time with this command:

```bash
$ git mv templates/ blogengine/
```

We run the tests to make sure nothing untoward has happened:

```bash
$ python manage.py test
Creating test database for alias 'default'...
..........................
----------------------------------------------------------------------
Ran 26 tests in 5.847s

OK
Destroying test database for alias 'default'...
```

And we commit:

```bash
$ git commit -m 'Moved templates'
```

Note that `git mv` updates Git and moves the files, so you don't need to call `git add`.

Implementing search
===================

For our final task today, we will be implementing a very simple search engine. Our requirements are:

* It should be in the header, to allow for easy access from anywhere in the front end.
* It should search the title and text of posts.

First, we'll write our tests:

```python
class SearchViewTest(BaseAcceptanceTest):
    def test_search(self):
        # Create a post
        post = PostFactory()

        # Create another post
        post2 = PostFactory(text='This is my *second* blog post', title='My second post', slug='my-second-post')

        # Search for first post
        response = self.client.get('/search?q=first')
        self.assertEquals(response.status_code, 200)

        # Check the first post is contained in the results
        self.assertTrue('My first post' in response.content)

        # Check the second post is not contained in the results
        self.assertTrue('My second post' not in response.content)

        # Search for second post
        response = self.client.get('/search?q=second')
        self.assertEquals(response.status_code, 200)

        # Check the first post is not contained in the results
        self.assertTrue('My first post' not in response.content)

        # Check the second post is contained in the results
        self.assertTrue('My second post' in response.content)
```

Don't forget to run the tests to make sure they fail:

```bash
$ python manage.py test
Creating test database for alias 'default'...
..........................F
======================================================================
FAIL: test_search (blogengine.tests.SearchViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 819, in test_search
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

----------------------------------------------------------------------
Ran 27 tests in 6.919s

FAILED (failures=1)
Destroying test database for alias 'default'...
```

With that done, we can add the search form to the header:

```django
<!DOCTYPE html>
<!--[if lt IE 7]>      <html class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
<!--[if IE 7]>         <html class="no-js lt-ie9 lt-ie8"> <![endif]-->
<!--[if IE 8]>         <html class="no-js lt-ie9"> <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js"> <!--<![endif]-->
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>{% block title %}My Django Blog{% endblock %}</title>
        <meta name="description" content="">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="alternate" type="application/rss+xml" title="Blog posts" href="/feeds/posts/" >

        <!-- Place favicon.ico and apple-touch-icon.png in the root directory -->

        {% load staticfiles %}
        <link rel="stylesheet" href="{% static 'bower_components/html5-boilerplate/css/normalize.css' %}">
        <link rel="stylesheet" href="{% static 'bower_components/html5-boilerplate/css/main.css' %}">
        <link rel="stylesheet" href="{% static 'bower_components/bootstrap/dist/css/bootstrap.min.css' %}">
        <link rel="stylesheet" href="{% static 'bower_components/bootstrap/dist/css/bootstrap-theme.min.css' %}">
        <link rel="stylesheet" href="{% static 'css/main.css' %}">
        <link rel="stylesheet" href="{% static 'css/code.css' %}">
        <script src="{% static 'bower_components/html5-boilerplate/js/vendor/modernizr-2.6.2.min.js' %}"></script>
    </head>
    <body>
        <!--[if lt IE 7]>
            <p class="browsehappy">You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> to improve your experience.</p>
        <![endif]-->

        <!-- Add your site or application content here -->

        <div id="fb-root"></div>
        <script>(function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
                js = d.createElement(s); js.id = id;
                js.src = "//connect.facebook.net/en_GB/all.js#xfbml=1";
                fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));</script>

        <div class="navbar navbar-static-top navbar-inverse">
            <div class="container-fluid">
                <div class="navbar-header">
                    <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#header-nav">
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                    </button>
                    <a class="navbar-brand" href="/">My Django Blog</a>
                </div>
                <div class="collapse navbar-collapse" id="header-nav">
                    <ul class="nav navbar-nav">
                        {% load flatpages %}
                        {% get_flatpages as flatpages %}
                        {% for flatpage in flatpages %}
                        <li><a href="{{ flatpage.url }}">{{ flatpage.title }}</a></li>
                        {% endfor %}
                        <li><a href="/feeds/posts/">RSS feed</a></li>

                        <form action="/search" method="GET" class="navbar-form navbar-left">
                            <div class="form-group">
                                <input type="text" name="q" placeholder="Search..." class="form-control"></input>
                            </div>
                            <button type="submit" class="btn btn-default">Search</button>
                        </form>
                    </ul>
                </div>
            </div>
        </div>

        <div class="container">
            {% block header %}
                <div class="page-header">
                    <h1>My Django Blog</h1>
                </div>
            {% endblock %}

            <div class="row">
                {% block content %}{% endblock %}
            </div>
        </div>

        <div class="container footer">
            <div class="row">
                <div class="span12">
                    <p>Copyright &copy; {% now "Y" %}</p>
                </div>
            </div>
        </div>

        <script src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
        <script>window.jQuery || document.write('<script src="{% static 'bower_components/html5-boilerplate/js/vendor/jquery-1.10.2.min.js' %}"><\/script>')</script>
        <script src="{% static 'bower_components/html5-boilerplate/js/plugins.js' %}"></script>
        <script src="{% static 'bower_components/bootstrap/dist/js/bootstrap.min.js' %}"></script>

        <!-- Google Analytics: change UA-XXXXX-X to be your site's ID. -->
        <script>
            (function(b,o,i,l,e,r){b.GoogleAnalyticsObject=l;b[l]||(b[l]=
            function(){(b[l].q=b[l].q||[]).push(arguments)});b[l].l=+new Date;
            e=o.createElement(i);r=o.getElementsByTagName(i)[0];
            e.src='//www.google-analytics.com/analytics.js';
            r.parentNode.insertBefore(e,r)}(window,document,'script','ga'));
            ga('create','UA-XXXXX-X');ga('send','pageview');
        </script>
    </body>
</html>
```

Now we'll actually implement our search. Implementing search using Django's generic views can be fiddly, so we'll write our search view as a function instead. First, amend the imports at the top of your view file to look like this:

```python
from django.shortcuts import get_object_or_404, render_to_response
from django.core.paginator import Paginator, EmptyPage
from django.db.models import Q
from django.views.generic import ListView
from blogengine.models import Category, Post, Tag
from django.contrib.syndication.views import Feed
from django.utils.encoding import force_unicode
from django.utils.safestring import mark_safe
import markdown2
```

Next, add the following code to the end of the file:

```python
def getSearchResults(request):
    """
    Search for a post by title or text
    """
    # Get the query data
    query = request.GET.get('q', '')
    page = request.GET.get('page', 1)

    # Query the database
    if query:
        results = Post.objects.filter(Q(text__icontains=query) | Q(title__icontains=query))
    else:
        results = None

    # Add pagination
    pages = Paginator(results, 5)

    # Get specified page
    try:
        returned_page = pages.page(page)
    except EmptyPage:
        returned_page = pages.page(pages.num_pages)

    # Display the search results
    return render_to_response('blogengine/search_post_list.html',
                              {'page_obj': returned_page,
                               'object_list': returned_page.object_list,
                               'search': query})
```

As this is the first time we've written a view without using generic views, a little explanation is called for. First we get the values of the `q` and `page` parameters passed to the view. `q` contains the query text and `page` contains the page number. Note also that our page defaults to 1 if not set.

We then use the Q object to perform a query. The Django ORM will `AND` together keyword argument queries, but that's not the behaviour we want here. Instead we want to be able to search for content in the title or text, so we need to use a query with an `OR` statement, which necessitates using the [Q](https://docs.djangoproject.com/en/dev/topics/db/queries/#complex-lookups-with-q-objects) object.

Next, we use the `Paginator` object to manually paginate the results, and if it raises an `EmptyPage` exception, to just show the last page instead. Finally we render the template `blogengine/search_post_list.html`, and pass through the parameters `page_obj` for the returned page, `object_list` for the objects, and `search` for the query.

We also need to add a route for our new view:

```python

    # Search posts
    url(r'^search', 'blogengine.views.getSearchResults'),
```

Finally, let's create a new template to show our results:

```django
{% extends "blogengine/includes/base.html" %}

    {% load custom_markdown %}

    {% block content %}
        {% if object_list %}
            {% for post in object_list %}
            <div class="post col-md-12">
            <h1><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h1>
            <h3>{{ post.pub_date }}</h3>
            {{ post.text|custom_markdown }}
            </div>
            {% if post.category %}
            <div class="col-md-12">
            <a href="{{ post.category.get_absolute_url }}"><span class="label label-primary">{{ post.category.name }}</span></a>
            </div>
            {% endif %}
            {% if post.tags %}
            <div class="col-md-12">
            {% for tag in post.tags.all %}
            <a href="{{ tag.get_absolute_url }}"><span class="label label-success">{{ tag.name }}</span></a>
            {% endfor %}
            </div>
            {% endif %}
            {% endfor %}
        {% else %}
            <p>No posts found</p>
        {% endif %}

        <ul class="pager">
        {% if page_obj.has_previous %}
        <li class="previous"><a href="/search?page={{ page_obj.previous_page_number }}&q={{ search }}">Previous Page</a></li>
        {% endif %}
        {% if page_obj.has_next %}
        <li class="next"><a href="/search?page={{ page_obj.next_page_number }}&q={{ search }}">Next Page</a></li>
        {% endif %}
        </ul>

    {% endblock %}
```

Let's run our tests:

```bash
$ python manage.py test
Creating test database for alias 'default'...
...........................
----------------------------------------------------------------------
Ran 27 tests in 6.421s

OK
Destroying test database for alias 'default'...
```

Don't forget to do a quick sense check to make sure it's all working as expected. Then it's time to commit:

```bash
$ git add blogengine/
$ git commit -m 'Implemented search'
```

And push up your changes:

```bash
$ git push origin master
$ git push heroku master
```

And that's the end of this instalment. Please note this particular search solution is quite basic, and if you want something more powerful, you may want to look at [Haystack](http://haystacksearch.org/).

As usual, you can get this lesson with `git checkout lesson-7` - if you have any problems, the [repository](https://github.com/matthewbdaly/django_tutorial_blog_ng) should be the first place you look for answers as this is the working code base for the application, and with judicious use of a tool like `diff`, it's generally pretty easy to track down most issues.

In our next, and final instalment, we'll cover:

* Tidying everything up
* Implementing an XML sitemap for search engines
* Optimising our site
* Using Fabric to make deployment easier

Hope to see you then!
