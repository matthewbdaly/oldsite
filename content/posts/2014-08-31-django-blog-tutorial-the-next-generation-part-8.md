---
layout: post
title: "Django Blog Tutorial - the Next Generation - Part 8"
date: 2014-08-31 22:00:00 +0100
comments: true
categories: 
- tdd
- python
- django
---

Hello again! In our final instalment, we'll wrap up our blog by:

* Implementing a sitemap
* Optimising and tidying up the site
* Creating a Fabric task for easier deployment

I'll also cover development tools and practices that can make using Django easier. But first there's a few housekeeping tasks that need doing...

Don't forget to activate your virtualenv - you should know how to do this off by heart by now!

Upgrading Django
================

At the time of writing, Django 1.7 is due any day now, but it's not out yet so I won't cover it. The biggest change is the addition of a built-in migration system, but switching from South to this is well-documented. When Django 1.7 comes out, it shouldn't be difficult to upgrade to it - because we have good test coverage, we shouldn't have much trouble catching errors.

However, Django 1.6.6 was recently released, and we need to upgrade to it. Just enter the following command to upgrade:

```bash
$ pip install Django --upgrade
```

Then add it to your `requirements.txt`:

```bash
$ pip freeze > requirements.txt
```

Then commit your changes:

```bash
$ git add requirements.txt
$ git commit -m 'Upgraded Django version'
```

Implementing a sitemap
======================

Creating a sitemap for your blog is a good idea - it can be submitted to search engines, so that they can easily find your content. With Django, it's pretty straightforward too.

First, let's create a test for our sitemap. Add the following code at the end of `tests.py`:

```python
class SitemapTest(BaseAcceptanceTest):
    def test_sitemap(self):
        # Create a post
        post = PostFactory()

        # Create a flat page
        page = FlatPageFactory()

        # Get sitemap
        response = self.client.get('/sitemap.xml')
        self.assertEquals(response.status_code, 200)

        # Check post is present in sitemap
        self.assertTrue('my-first-post' in response.content)

        # Check page is present in sitemap
        self.assertTrue('/about/' in response.content)
```

Run it, and you should see the test fail:

```bash
$ python manage.py test blogengine
Creating test database for alias 'default'...
...........................F
======================================================================
FAIL: test_sitemap (blogengine.tests.SitemapTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 847, in test_sitemap
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

----------------------------------------------------------------------
Ran 28 tests in 6.873s

FAILED (failures=1)
Destroying test database for alias 'default'...
```

Now, let's implement our sitemap. The sitemap application comes with Django, and needs to be activated in your settings file, under `INSTALLED_APPS`:

```python
    'django.contrib.sitemaps',
```

Next, let's think about what content we want to include in the sitemap. We want to index our flat pages and our blog posts, so our sitemap should reflect that. Create a new file at `blogengine/sitemap.py` and enter the following text:

```python
from django.contrib.sitemaps import Sitemap
from django.contrib.flatpages.models import FlatPage
from blogengine.models import Post

class PostSitemap(Sitemap):
    changefreq = "always"
    priority = 0.5

    def items(self):
        return Post.objects.all()

    def lastmod(self, obj):
        return obj.pub_date


class FlatpageSitemap(Sitemap):
    changefreq = "always"
    priority = 0.5

    def items(self):
        return FlatPage.objects.all()
```

We define two sitemaps, one for all the posts, and the other for all the flat pages. Note that this works in a very similar way to the syndication framework.

Next, we amend our URLs. Add the following text after the existing imports in your URL file:

```python
from django.contrib.sitemaps.views import sitemap
from blogengine.sitemap import PostSitemap, FlatpageSitemap

# Define sitemaps
sitemaps = {
    'posts': PostSitemap,
    'pages': FlatpageSitemap
}
```

Then add the following after the existing routes:

```python
    # Sitemap
    url(r'^sitemap\.xml$', sitemap, {'sitemaps': sitemaps},
            name='django.contrib.sitemaps.views.sitemap'),
```

Here we define what sitemaps we're going to use, and we define a URL for them. It's pretty straightforward to use.

Let's run our tests:

```bash
$ python manage.py test blogengine
Creating test database for alias 'default'...
............................
----------------------------------------------------------------------
Ran 28 tests in 6.863s

OK
Destroying test database for alias 'default'...
```

And done! Let's commit our changes:

```bash
$ git add blogengine/ django_tutorial_blog_ng/settings.py
$ git commit -m 'Implemented a sitemap'
```

Fixing test coverage
====================

Our blog is now feature-complete, but there are a few gaps in test coverage, so we'll fix them. If, like me, you're using Coveralls.io, [you can easily see via their web interface where there are gaps in the coverage](https://coveralls.io/builds/1151177).

Now, our gaps are all in our view file - if you [take a look at my build](https://coveralls.io/files/280228813), you can easily identify the gaps as they're marked in red.

The first gap is where a tag does not exist. Interestingly, if we look at the code in the view, we can see that some of it is redundant:

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

Under the `items` function, we check to see if the tag exists. However, under `get_object` we can see that if the object didn't exist, it would already have returned a 404 error. We can therefore safely amend `items` to not check, since that try statement will never fail:

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
        tag = Tag.objects.get(slug=obj.slug)
        return tag.post_set.all()
```

The other two gaps are in our search view - we never get an empty result for the search in the following section:

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

So replace it with this:

```python
def getSearchResults(request):
    """
    Search for a post by title or text
    """
    # Get the query data
    query = request.GET.get('q', '')
    page = request.GET.get('page', 1)

    # Query the database
    results = Post.objects.filter(Q(text__icontains=query) | Q(title__icontains=query))

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

We don't need to check whether `query` is defined because if `q` is left blank, the value of `query` will be an empty string, so we may as well pull out the redundant code.

Finally, the other gap is for when a user tries to get an empty search page (eg, page two of something with five or less results). So let's add another test to our `SearchViewTest` class:

```python
    def test_failing_search(self):
        # Search for something that is not present
        response = self.client.get('/search?q=wibble')
        self.assertEquals(response.status_code, 200)
        self.assertTrue('No posts found' in response.content)

        # Try to get nonexistent second page
        response = self.client.get('/search?q=wibble&page=2')
        self.assertEquals(response.status_code, 200)
        self.assertTrue('No posts found' in response.content)
```

Run our tests and check the coverage:

```bash
$ coverage run --include="blogengine/*" --omit="blogengine/migrations/*" manage.py test blogengine
$ coverage html
```

If you open `htmlcov/index.html` in your browser, you should see that the test coverage is back up to 100%. With that done, it's time to commit again:

```bash
$ git add blogengine/
$ git commit -m 'Fixed gaps in coverage'
```
Remember, it's not always possible to achieve 100% test coverage, and you shouldn't worry too much about it if it's not possible - [it's possible to ignore code](http://nedbatchelder.com/code/coverage/excluding.html) if necessary. However, it's a good idea to aim for 100%.

Using Fabric for deployment
===========================

Next we'll cover using Fabric, a handy tool for deploying your changes (any pretty much any other task you want to automate). First, you need to install it:

```bash
$ pip install Fabric
```

If you have any problems installing it, you should be able to resolve them via Google - most of them are likely to be absent libraries that Fabric depends upon. Once it's installed, add it to your `requirements.tzt`:

```bash
$ pip freeze > requirements.txt
```

Next, create a file called `fabfile.py` and enter the following text:

```python
#!/usr/bin/env python
from fabric.api import local

def deploy():
    """
    Deploy the latest version to Heroku
    """
    # Push changes to master
    local("git push origin master")

    # Push changes to Heroku
    local("git push heroku master")

    # Run migrations on Heroku
    local("heroku run python manage.py migrate")
```

Now, all this file does is push our changes to Github (or wherever else your repository is hosted) and to Heroku, and runs your migrations. It's not a terribly big task anyway, but it's handy to have it in place. Let's commit our changes:

```bash
$ git add fabfile.py requirements.txt
$ git commit -m 'Added Fabric task for deployment'
```

Then, let's try it out:

```bash
$ fab deploy
```

There, wasn't that more convenient? Fabric is much more powerful than this simple demonstration indicates, and can run tasks on remote servers via SSH easily. I recommend you take a look at the [documentation](http://www.fabfile.org/) to see what else you can do with it. If you're hosting your site on a VPS, you will probably find Fabric indispensable, as you will need to restart the application every time you push up a new revision.

Tidying up
==========

We want our blog application to play nicely with other Django apps. For instance, say you're working on a new site that includes a blogging engine. Wouldn't it make sense to just be able to drop in this blogging engine and have it work immediately? At the moment, some of our URL's are hard-coded, so we may have problems in doing so. Let's fix that.

First we'll amend our tests. Add this at the top of the tests file:

```python
from django.core.urlresolvers import reverse
```

Next, replace every instance of this:

```python
        response = self.client.get('/')
```

with this:

```python
response = self.client.get(reverse('blogengine:index'))
```

Then, rewrite the calls to the search route. For instance, this:

```python
        response = self.client.get('/search?q=first')
```

should become this:

```python
        response = self.client.get(reverse('blogengine:search') + '?q=first')
```

I'll leave changing these as an exercise for the reader, but check the repository if you get stuck.

Next, we need to assign a namespace to our app's routes:

```python
from django.conf.urls import patterns, include, url

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'django_tutorial_blog_ng.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),

    url(r'^admin/', include(admin.site.urls)),

    # Blog URLs
    url(r'', include('blogengine.urls', namespace="blogengine")),

    # Flat pages
    url(r'', include('django.contrib.flatpages.urls')),
)
```

We then assign names to our routes in the app's `urls.py`:

```python
from django.conf.urls import patterns, url
from django.views.generic import ListView, DetailView
from blogengine.models import Post, Category, Tag
from blogengine.views import CategoryListView, TagListView, PostsFeed, CategoryPostsFeed, TagPostsFeed, getSearchResults
from django.contrib.sitemaps.views import sitemap
from blogengine.sitemap import PostSitemap, FlatpageSitemap

# Define sitemaps
sitemaps = {
    'posts': PostSitemap,
    'pages': FlatpageSitemap
}

urlpatterns = patterns('',
    # Index
    url(r'^(?P<page>\d+)?/?$', ListView.as_view(
        model=Post,
        paginate_by=5,
        ),
        name='index'
        ),

    # Individual posts
    url(r'^(?P<pub_date__year>\d{4})/(?P<pub_date__month>\d{1,2})/(?P<slug>[a-zA-Z0-9-]+)/?$', DetailView.as_view(
        model=Post,
        ),
        name='post'
        ),

    # Categories
    url(r'^category/(?P<slug>[a-zA-Z0-9-]+)/?$', CategoryListView.as_view(
        paginate_by=5,
        model=Category,
        ),
        name='category'
        ),


    # Tags
    url(r'^tag/(?P<slug>[a-zA-Z0-9-]+)/?$', TagListView.as_view(
        paginate_by=5,
        model=Tag,
        ),
        name='tag'
        ),

    # Post RSS feed
    url(r'^feeds/posts/$', PostsFeed()),

    # Category RSS feed
    url(r'^feeds/posts/category/(?P<slug>[a-zA-Z0-9-]+)/?$', CategoryPostsFeed()),

    # Tag RSS feed
    url(r'^feeds/posts/tag/(?P<slug>[a-zA-Z0-9-]+)/?$', TagPostsFeed()),

    # Search posts
    url(r'^search', getSearchResults, name='search'),

    # Sitemap
    url(r'^sitemap\.xml$', sitemap, {'sitemaps': sitemaps},
            name='django.contrib.sitemaps.views.sitemap'),
)
```

You also need to amend two of your templates:

```html
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
                    <a class="navbar-brand" href="{% url 'blogengine:index' %}">My Django Blog</a>
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

```html
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
        <li class="previous"><a href="{% url 'blogengine:search' %}?page={{ page_obj.previous_page_number }}&q={{ search }}">Previous Page</a></li>
        {% endif %}
        {% if page_obj.has_next %}
        <li class="next"><a href="{% url 'blogengine:search' %}?page={{ page_obj.next_page_number }}&q={{ search }}">Next Page</a></li>
        {% endif %}
        </ul>

    {% endblock %}
```

Let's run our tests:

```bash
$ python manage.py test blogengine/
Creating test database for alias 'default'...
.............................
----------------------------------------------------------------------
Ran 29 tests in 10.456s

OK
Destroying test database for alias 'default'...
```

And commit our changes:

```bash
$ git add .
$ git commit -m 'Now use named routes'
```
 
Debugging Django
================

There are a number of handy ways to debug Django applications. One of the simplest is to use the Python debugger. To use it, just enter the following lines at the point you want to break at:

```python
import pdb
pdb.set_trace()
```

Now, whenever that line of code is run, you'll be dropped into an interactive shell that lets you play around to find out what's going wrong. However, it doesn't offer autocompletion, so we'll install `ipdb`, which is an improved version:

```bash
$ pip install ipdb
$ pip freeze > requirements.txt
```

Now you can use `ipdb` in much the same way as you would use `pdb`:

```python
import ipdb
ipdb.set_trace()
```

Now, `ipdb` is very useful, but it isn't much help for profiling your application. For that you need the Django Debug Toolbar. Run the following commands:

```bash
$ pip install django-debug-toolbar
$ pip freeze > requirements.txt
```

Then add the following line to `INSTALLED_APPS` in your settings file:

```python
    'debug_toolbar',
```

Then, try running the development server, and you'll see a toolbar on the right-hand side of the screen that allows you to view some useful data about your page. For instance, you'll notice a field called `SQL` - this contains details of the queries carried out when building the page. To actually see the queries carried out, you'll want to disable caching in your settings file by commenting out all the constants that start with `CACHE`.

We won't go into using the toolbar to optimise queries, but using this, you can easily see what queries are being executed on a specific page, how long they take, and the values they return. Sometimes, you may need to optimise a slow query - in this case, Django allows you to drop down to writing raw SQL if necessary.

Note that if you're running Django in production, you should set `DEBUG` to `False` as otherwise it gives rather too much information to potential attackers, and with Django Debug Toolbar installed, that's even more important.

Please also note that when you disable debug mode, Django no longer handles static files automatically, so you'll need to run `python manage.py collectstatic` and commit the `staticfiles` directory.

Once you've disabled debug mode, collected the static files, and re-enables caching, you can commit your changes:

```bash
$ git add .
$ git commit -m 'Installed debugging tools'
```

Optimising static files
=======================

We want our blog to get the best SEO results it can, so making it fast is essential. One of the simplest things you can do is to concatenate and minify static assets such as CSS and JavaScript. There are numerous ways to do this, but I generally use Grunt. Let's set up a Grunt config to concatenate and minify our CSS and JavaScript.

You'll need to have Node.js installed on your development machine for this. Then, you need to install the Grunt command-line interface:

```bash
$ sudo npm install -g grunt-cli
```

With that done, we need to create a `package.json` file. You can create one using the command `npm init`. Here's mine:

```json
{
  "name": "django_tutorial_blog_ng",
  "version": "1.0.0",
  "description": "Django Tutorial Blog NG =======================",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/matthewbdaly/django_tutorial_blog_ng.git"
  },
  "author": "Matthew Daly <matthew@matthewdaly.co.uk> (http://matthewdaly.co.uk/)",
  "license": "ISC",
  "bugs": {
    "url": "https://github.com/matthewbdaly/django_tutorial_blog_ng/issues"
  },
  "homepage": "https://github.com/matthewbdaly/django_tutorial_blog_ng"
}
```

Feel free to amend  it as you see fit.

Next we install Grunt and the required plugins:

```bash
$ npm install grunt grunt-contrib-cssmin grunt-contrib-concat grunt-contrib-uglify --save-dev
```

We now need to create a Gruntfile for our tasks:

```javascript
module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        concat: {
            dist: {
                src: [
                    'blogengine/static/bower_components/bootstrap/dist/css/bootstrap.css',
                    'blogengine/static/bower_components/bootstrap/dist/css/bootstrap-theme.css',
                    'blogengine/static/css/code.css',
                    'blogengine/static/css/main.css',
                ],
                dest: 'blogengine/static/css/style.css'
            }
        },
        uglify: {
            dist: {
                src: [
                    'blogengine/static/bower_components/jquery/jquery.js',
                    'blogengine/static/bower_components/bootstrap/dist/js/bootstrap.js'
                ],
                dest: 'blogengine/static/js/all.min.js'
            }
        },
        cssmin: {
            dist: {
                src: 'blogengine/static/css/style.css',
                dest: 'blogengine/static/css/style.min.css'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.registerTask('default', ['concat', 'uglify', 'cssmin']);
};
```

You'll also need to change the paths in your base HTML file to point to the minified versions:

```html
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
        <link rel="stylesheet" href="{% static 'css/style.min.css' %}">
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
                    <a class="navbar-brand" href="{% url 'blogengine:index' %}">My Django Blog</a>
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

        <script src="{% static 'js/all.min.js' %}"></script>

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

Now, run the Grunt task:

```bash
$ grunt
```

And collect the static files:

```bash
$ python manage.py collectstatic
```

You'll also want to add your `node_modules` folder to your `gitignore`:

```bash
venv/
*.pyc
db.sqlite3
reports/
htmlcov/
.coverage
node_modules/
```

Then commit your changes:

```bash
$ git add .
$ git commit -m 'Optimised static assets'
```

Now, our `package.json` will cause a problem - it will mean that this app is mistakenly identified as a Node.js app. To prevent this, create the `.slugignore` file:

```bash
package.json
```

Then commit your changes and push them up:

```bash
$ git add .slugignore
$ git commit -m 'Added slugignore'
$ fab deploy
```

If you check, your site should now be loading the minified versions of the static files.

That's our site done! As usual I've tagged the final commit with `lesson-8`.

Sadly, that's our final instalment over with! I hope you've enjoyed these tutorials, and I look forward to seeing what you create with them.
