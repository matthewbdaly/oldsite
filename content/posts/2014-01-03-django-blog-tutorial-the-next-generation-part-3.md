---
layout: post
title: "Django Blog Tutorial - the Next Generation - Part 3"
date: 2014-01-03 12:57:30 +0000
comments: true
categories: 
- python
- django
- tdd
---

Hello again! In this instalment, we're going to do the following:

* Add support for flat pages
* Add support for multiple authors
* Add a third-party comment system

Flat pages
----------

Django ships with a number of useful apps - we've already used the admin interface. The flat pages app is another very handy app that comes with Django, and we'll use it to allow the blog author to create a handful of flat pages.

First of all, you'll need to install the flatpages app. Edit the `INSTALLED_APPS` setting as follows:

```python
INSTALLED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'south',
    'blogengine',
    'django.contrib.sites',
    'django.contrib.flatpages',
)
```
Note that we needed to enable the `sites` framework as well. You'll also need to set the `SITE_ID` setting:

```python
SITE_ID = 1
```

With that done, run `python manage.py syncdb` to create the required database tables. Now, let's use the `sqlall` command to take a look at the database structure generated for the flat pages:

```sql
BEGIN;
CREATE TABLE "django_flatpage_sites" (
    "id" integer NOT NULL PRIMARY KEY,
    "flatpage_id" integer NOT NULL,
    "site_id" integer NOT NULL REFERENCES "django_site" ("id"),
    UNIQUE ("flatpage_id", "site_id")
)
;
CREATE TABLE "django_flatpage" (
    "id" integer NOT NULL PRIMARY KEY,
    "url" varchar(100) NOT NULL,
    "title" varchar(200) NOT NULL,
    "content" text NOT NULL,
    "enable_comments" bool NOT NULL,
    "template_name" varchar(70) NOT NULL,
    "registration_required" bool NOT NULL
)
;
CREATE INDEX "django_flatpage_sites_872c4601" ON "django_flatpage_sites" ("flatpage_id");
CREATE INDEX "django_flatpage_sites_99732b5c" ON "django_flatpage_sites" ("site_id");
CREATE INDEX "django_flatpage_c379dc61" ON "django_flatpage" ("url");

COMMIT;
```

As mentioned previously, all models in Django have an `id` attribute by default. Each flat page also has a URL, title, and content. 

Also note the separate `django_flatpage_sites` table, which maps sites to flat pages. Django can run multiple sites from the same web app, and so flat pages must be allocated to a specific site. This relationship is a many-to-many relationship, so one flat page can appear on more than one site.

The other fields [are hidden by default in the admin](http://127.0.0.1:8000/admin/flatpages/flatpage/add/) and can be ignored. Let's have a go with Django's handy shell to explore the flatpage. Run `python manage.py shell` and you'll be able to interact with your Django application interactively:

```python
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py shell
Python 2.7.6 (default, Nov 23 2013, 13:53:45)
[GCC 4.2.1 (Apple Inc. build 5666) (dot 3)] on darwin
Type "help", "copyright", "credits" or "license" for more information.
(InteractiveConsole)
>>> from django.contrib.flatpages.models import *
>>> FlatPage
<class 'django.contrib.flatpages.models.FlatPage'>
>>> from django.contrib.sites.models import Site
>>> Site.objects.all()
[<Site: example.com>]
```

As you can see, `flatpages` is a Django app similar to the `blogengine` one, with its own models, as is `sites`. You can see that the `FlatPage` class is a model. We can create an instance of it and save it interactively:

```python
>>> f = FlatPage()
>>> f.url = '/about/'
>>> f.title = 'About me'
>>> f.content = 'All about me'
>>> f.save()
>>> f.sites.add(Site.objects.all()[0])
>>> f.save()
```

Note that because the relationship between the site and the flat page is a many-to-many relationship, we need to save it first, then use the `add` method to add the site to the list of sites.

We can retrieve it:

```python
>>> FlatPage.objects.all()
[<FlatPage: /about/ -- About me>]
>>> FlatPage.objects.all()[0]
<FlatPage: /about/ -- About me>
>>> FlatPage.objects.all()[0].title
u'About me'
```

This command is often handy for debugging problems with your models interactively. If you now run the server and visit the admin, you should notice that the Flatpages app is now visible there, and the 'About me' flat page is now shown in there.

Let's also take a look at the SQL required for the `Site` model. Run `python manage.py sqlall sites`:

```sql
BEGIN;
CREATE TABLE "django_site" (
    "id" integer NOT NULL PRIMARY KEY,
    "domain" varchar(100) NOT NULL,
    "name" varchar(50) NOT NULL
)
;

COMMIT;
```
Again, very simple - just a domain and a name.

So, now that we have a good idea of how the flat page system works, we can write a test for it. We don't need to write unit tests for the model because Django already does that, but we do need to write an acceptance test to ensure we can create flat pages and they will be where we expect them to be. Add the following to the top of the test file:

```python
from django.contrib.flatpages.models import FlatPage
from django.contrib.sites.models import Site
```

Now, before we write this test, there's some duplication to resolve. We have two tests that subclass `LiveServerTestCase`, and both have the same method, `setUp`. We can save ourselves some hassle by creating a new class containing this method and having both these tests inherit from it. We'll do that now because the flat page test can also be based on it. Create the following class just after `PostTest`:

```python
class BaseAcceptanceTest(LiveServerTestCase):
    def setUp(self):
        self.client = Client()
```

Then remove the setUp method from each of the two tests based on `LiveServerTestCase`, and change their parent class to `BaseAcceptanceTest`:

```python
class AdminTest(BaseAcceptanceTest):

class PostViewTest(BaseAcceptanceTest):
```

With that done, run the tests and they should pass. Commit your changes:

```bash
$ git add blogengine/tests.py django_tutorial_blog_ng/settings.py
$ git commit -m 'Added flatpages to installed apps'
```

Now we can get started in earnest on our test for the flat pages:

```python
class FlatPageViewTest(BaseAcceptanceTest):
    def test_create_flat_page(self):
        # Create flat page
        page = FlatPage()
        page.url = '/about/'
        page.title = 'About me'
        page.content = 'All about me'
        page.save()

        # Add the site
        page.sites.add(Site.objects.all()[0])
        page.save()

        # Check new page saved
        all_pages = FlatPage.objects.all()
        self.assertEquals(len(all_pages), 1)
        only_page = all_pages[0]
        self.assertEquals(only_page, page)

        # Check data correct
        self.assertEquals(only_page.url, '/about/')
        self.assertEquals(only_page.title, 'About me')
        self.assertEquals(only_page.content, 'All about me')

        # Get URL
        page_url = only_page.get_absolute_url()

        # Get the page
        response = self.client.get(page_url)
        self.assertEquals(response.status_code, 200)

        # Check title and content in response
        self.assertTrue('About me' in response.content)
        self.assertTrue('All about me' in response.content)
```

Let's run our tests:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test
Creating test database for alias 'default'...
......F..
======================================================================
FAIL: test_create_flat_page (blogengine.tests.FlatPageViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 272, in test_create_flat_page
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

----------------------------------------------------------------------
Ran 9 tests in 2.760s

FAILED (failures=1)
```

We can see why it's failed - in our flat page test, the status code is 404, indicating the page was not found. This just means we haven't put flat page support into our URLconf. So let's fix that:

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
    url(r'', include('blogengine.urls')),

    # Flat pages
    url(r'', include('django.contrib.flatpages.urls')),
)
```

Let's run our tests again:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test
Creating test database for alias 'default'...
......E..
======================================================================
ERROR: test_create_flat_page (blogengine.tests.FlatPageViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 276, in test_create_flat_page
    response = self.client.get(page_url)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/test/client.py", line 473, in get
    response = super(Client, self).get(path, data=data, **extra)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/test/client.py", line 280, in get
    return self.request(**r)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/test/client.py", line 444, in request
    six.reraise(*exc_info)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/core/handlers/base.py", line 114, in get_response
    response = wrapped_callback(request, *callback_args, **callback_kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/contrib/flatpages/views.py", line 45, in flatpage
    return render_flatpage(request, f)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/utils/decorators.py", line 99, in _wrapped_view
    response = view_func(request, *args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/contrib/flatpages/views.py", line 60, in render_flatpage
    t = loader.get_template(DEFAULT_TEMPLATE)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/template/loader.py", line 138, in get_template
    template, origin = find_template(template_name)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/template/loader.py", line 131, in find_template
    raise TemplateDoesNotExist(name)
TemplateDoesNotExist: flatpages/default.html

----------------------------------------------------------------------
Ran 9 tests in 3.557s

FAILED (errors=1)
Destroying test database for alias 'default'...
```

Our test still fails, but we can easily see  why - the template `flatpages/default.html` doesn't exist. So we create it:

```django
{% extends "blogengine/includes/base.html" %}

    {% load custom_markdown %}

    {% block content %}
        <div class="post">
        <h1>{{ flatpage.title }}</h1>
        {{ flatpage.content|custom_markdown }}
        </div>

    {% endblock %}
```

This template is based on the blog post one, and just changes a handful of variable names. Note that it can still inherit from the blogengine base template, and in this case we're using that for the sake of consistency.

If you run your tests, you should now see that they pass, so we'll commit our changes:

```bash
$ git add templates/ django_tutorial_blog_ng/ blogengine/
$ git commit -m 'Implemented flat page support'
```

Multiple authors
----------------

Next we'll add support for multiple authors. Now, Django already has a User model, and we'll leverage that to represent the authors. But first we'll write our test:

```python
from django.test import TestCase, LiveServerTestCase, Client
from django.utils import timezone
from blogengine.models import Post
from django.contrib.flatpages.models import FlatPage
from django.contrib.sites.models import Site
from django.contrib.auth.models import User
import markdown

# Create your tests here.
class PostTest(TestCase):
    def test_create_post(self):
        # Create the author
        author = User.objects.create_user('testuser', 'user@example.com', 'password')
        author.save()
        
        # Create the post
        post = Post()

        # Set the attributes
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.slug = 'my-first-post'
        post.pub_date = timezone.now()
        post.author = author

        # Save it
        post.save()

        # Check we can find it
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)
        only_post = all_posts[0]
        self.assertEquals(only_post, post)

        # Check attributes
        self.assertEquals(only_post.title, 'My first post')
        self.assertEquals(only_post.text, 'This is my first blog post')
        self.assertEquals(only_post.slug, 'my-first-post')
        self.assertEquals(only_post.pub_date.day, post.pub_date.day)
        self.assertEquals(only_post.pub_date.month, post.pub_date.month)
        self.assertEquals(only_post.pub_date.year, post.pub_date.year)
        self.assertEquals(only_post.pub_date.hour, post.pub_date.hour)
        self.assertEquals(only_post.pub_date.minute, post.pub_date.minute)
        self.assertEquals(only_post.pub_date.second, post.pub_date.second)
        self.assertEquals(only_post.author.username, 'testuser')
        self.assertEquals(only_post.author.email, 'user@example.com')

class BaseAcceptanceTest(LiveServerTestCase):
    def setUp(self):
        self.client = Client()


class AdminTest(BaseAcceptanceTest):
    fixtures = ['users.json']

    def test_login(self):
        # Get login page
        response = self.client.get('/admin/')

        # Check response code
        self.assertEquals(response.status_code, 200)

        # Check 'Log in' in response
        self.assertTrue('Log in' in response.content)

        # Log the user in
        self.client.login(username='bobsmith', password="password")

        # Check response code
        response = self.client.get('/admin/')
        self.assertEquals(response.status_code, 200)

        # Check 'Log out' in response
        self.assertTrue('Log out' in response.content)

    def test_logout(self):
        # Log in
        self.client.login(username='bobsmith', password="password")

        # Check response code
        response = self.client.get('/admin/')
        self.assertEquals(response.status_code, 200)

        # Check 'Log out' in response
        self.assertTrue('Log out' in response.content)

        # Log out
        self.client.logout()

        # Check response code
        response = self.client.get('/admin/')
        self.assertEquals(response.status_code, 200)

        # Check 'Log in' in response
        self.assertTrue('Log in' in response.content)

    def test_create_post(self):
        # Log in
        self.client.login(username='bobsmith', password="password")

        # Check response code
        response = self.client.get('/admin/blogengine/post/add/')
        self.assertEquals(response.status_code, 200)

        # Create the new post
        response = self.client.post('/admin/blogengine/post/add/', {
            'title': 'My first post',
            'text': 'This is my first post',
            'pub_date_0': '2013-12-28',
            'pub_date_1': '22:00:04',
            'slug': 'my-first-post'
        },
        follow=True
        )
        self.assertEquals(response.status_code, 200)

        # Check added successfully
        self.assertTrue('added successfully' in response.content)

        # Check new post now in database
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)

    def test_edit_post(self):
        # Create the author
        author = User.objects.create_user('testuser', 'user@example.com', 'password')
        author.save()
        
        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.slug = 'my-first-post'
        post.pub_date = timezone.now()
        post.author = author
        post.save()

        # Log in
        self.client.login(username='bobsmith', password="password")

        # Edit the post
        response = self.client.post('/admin/blogengine/post/1/', {
            'title': 'My second post',
            'text': 'This is my second blog post',
            'pub_date_0': '2013-12-28',
            'pub_date_1': '22:00:04',
            'slug': 'my-second-post'
        },
        follow=True
        )
        self.assertEquals(response.status_code, 200)

        # Check changed successfully
        self.assertTrue('changed successfully' in response.content)

        # Check post amended
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)
        only_post = all_posts[0]
        self.assertEquals(only_post.title, 'My second post')
        self.assertEquals(only_post.text, 'This is my second blog post')

    def test_delete_post(self):
        # Create the author
        author = User.objects.create_user('testuser', 'user@example.com', 'password')
        author.save()
        
        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.slug = 'my-first-post'
        post.pub_date = timezone.now()
        post.author = author
        post.save()

        # Check new post saved
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)

        # Log in
        self.client.login(username='bobsmith', password="password")

        # Delete the post
        response = self.client.post('/admin/blogengine/post/1/delete/', {
            'post': 'yes'
        }, follow=True)
        self.assertEquals(response.status_code, 200)

        # Check deleted successfully
        self.assertTrue('deleted successfully' in response.content)

        # Check post amended
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 0)

class PostViewTest(BaseAcceptanceTest):
    def test_index(self):
        # Create the author
        author = User.objects.create_user('testuser', 'user@example.com', 'password')
        author.save()
        
        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is [my first blog post](http://127.0.0.1:8000/)'
        post.slug = 'my-first-post'
        post.pub_date = timezone.now()
        post.author = author
        post.save()

        # Check new post saved
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)

        # Fetch the index
        response = self.client.get('/')
        self.assertEquals(response.status_code, 200)

        # Check the post title is in the response
        self.assertTrue(post.title in response.content)

        # Check the post text is in the response
        self.assertTrue(markdown.markdown(post.text) in response.content)

        # Check the post date is in the response
        self.assertTrue(str(post.pub_date.year) in response.content)
        self.assertTrue(post.pub_date.strftime('%b') in response.content)
        self.assertTrue(str(post.pub_date.day) in response.content)

        # Check the link is marked up properly
        self.assertTrue('<a href="http://127.0.0.1:8000/">my first blog post</a>' in response.content)

    def test_post_page(self):
        # Create the author
        author = User.objects.create_user('testuser', 'user@example.com', 'password')
        author.save()
        
        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is [my first blog post](http://127.0.0.1:8000/)'
        post.slug = 'my-first-post'
        post.pub_date = timezone.now()
        post.author = author
        post.save()

        # Check new post saved
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)
        only_post = all_posts[0]
        self.assertEquals(only_post, post)

        # Get the post URL
        post_url = only_post.get_absolute_url()

        # Fetch the post
        response = self.client.get(post_url)
        self.assertEquals(response.status_code, 200)

        # Check the post title is in the response
        self.assertTrue(post.title in response.content)

        # Check the post text is in the response
        self.assertTrue(markdown.markdown(post.text) in response.content)

        # Check the post date is in the response
        self.assertTrue(str(post.pub_date.year) in response.content)
        self.assertTrue(post.pub_date.strftime('%b') in response.content)
        self.assertTrue(str(post.pub_date.day) in response.content)

        # Check the link is marked up properly
        self.assertTrue('<a href="http://127.0.0.1:8000/">my first blog post</a>' in response.content)


class FlatPageViewTest(BaseAcceptanceTest):
    def test_create_flat_page(self):
        # Create flat page
        page = FlatPage()
        page.url = '/about/'
        page.title = 'About me'
        page.content = 'All about me'
        page.save()

        # Add the site
        page.sites.add(Site.objects.all()[0])
        page.save()

        # Check new page saved
        all_pages = FlatPage.objects.all()
        self.assertEquals(len(all_pages), 1)
        only_page = all_pages[0]
        self.assertEquals(only_page, page)

        # Check data correct
        self.assertEquals(only_page.url, '/about/')
        self.assertEquals(only_page.title, 'About me')
        self.assertEquals(only_page.content, 'All about me')

        # Get URL
        page_url = str(only_page.get_absolute_url())

        # Get the page
        response = self.client.get(page_url)
        self.assertEquals(response.status_code, 200)

        # Check title and content in response
        self.assertTrue('About me' in response.content)
        self.assertTrue('All about me' in response.content)
```

Here we create a `User` object to represent the author. Note the `create_user` convenience method for creating new users quickly and easily.

We're going to exclude the author field from the admin - instead it's going to be automatically populated based on the session data, so that when a user creates a post they are automatically set as the author. We therefore don't need to make any changes for the acceptance tests for posts - our changes to the unit tests for the `Post` model are sufficient.

Run the tests, and they should fail:

```python
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test
Creating test database for alias 'default'...
E........
======================================================================
ERROR: test_create_post (blogengine.tests.PostTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 45, in test_create_post
    self.assertEquals(only_post.author.username, 'testuser')
AttributeError: 'Post' object has no attribute 'author'

----------------------------------------------------------------------
Ran 9 tests in 3.620s

FAILED (errors=1)
Destroying test database for alias 'default'...
```

Let's add the missing `author` attribute:

```python
from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Post(models.Model):
    title = models.CharField(max_length=200)
    pub_date = models.DateTimeField()
    text = models.TextField()
    slug = models.SlugField(max_length=40, unique=True)
    author = models.ForeignKey(User)

    def get_absolute_url(self):
        return "/%s/%s/%s/" % (self.pub_date.year, self.pub_date.month, self.slug)

    def __unicode__(self):
        return self.title

    class Meta:
        ordering = ["-pub_date"]
```

Next, create the migrations:

```bash
$ python manage.py schemamigration --auto blogengine
```

You'll be prompted to either quit or provide a default author ID - select option 2 to provide the ID, then enter 1, which should be your own user account ID. Then run the migrations:

```bash
$ python manage.py migrate
```

Let's run our tests again:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test
Creating test database for alias 'default'...
.F.F.....
======================================================================
FAIL: test_create_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 118, in test_create_post
    self.assertTrue('added successfully' in response.content)
AssertionError: False is not true

======================================================================
FAIL: test_edit_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 154, in test_edit_post
    self.assertTrue('changed successfully' in response.content)
AssertionError: False is not true

----------------------------------------------------------------------
Ran 9 tests in 3.390s

FAILED (failures=2)
Destroying test database for alias 'default'...
```

Our test still fails because the author field isn't set automatically. So we'll amend the admin to automatically set the author when the `Post` object is saved:

```python
import models
from django.contrib import admin
from django.contrib.auth.models import User

class PostAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("title",)}
    exclude = ('author',)

    def save_model(self, request, obj, form, change):
        obj.author = request.user
        obj.save()

admin.site.register(models.Post, PostAdmin)
```

This tells the admin to exclude the `author` field from any form for a post, and when the model is saved, to set the author to the user making the HTTP request. Now run the tests, and they should pass:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test
Creating test database for alias 'default'...
.........
----------------------------------------------------------------------
Ran 9 tests in 4.086s

OK
Destroying test database for alias 'default'...
```

Time to commit again:

```bash
$ git add blogengine/
$ git commit -m 'Added author field'
```

Comments
--------

The [previous version of this tutorial](http://matthewdaly.co.uk/blog/2012/03/29/yet-another-tutorial-for-building-a-blog-using-python-and-django-part-4/) implemented comments using Django's own comment system. However, this has since been deprecated from Django and turned into [a separate project](https://github.com/django/django-contrib-comments). So we have two options for how to implement comments:

* We can use [the comments system](http://django-contrib-comments.readthedocs.org/en/latest/)
* We can use a third-party comments system

Now, if you want to use the Django comment system, you can do so, and it shouldn't be too hard to puzzle out how to implement it using the documentation and my prior post. However, in my humble opinion, using a third-party comment system is the way to go for blog comments - they make it extremely easy for people to log in with multiple services without you having to write lots of additional code. They also make it significantly easier to moderate comments, and they're generally pretty good at handling comment spam.

Some of the available providers include:

* [Disqus](http://disqus.com/)
* [IntenseDebate](http://intensedebate.com/)
* [Facebook](https://developers.facebook.com/docs/plugins/comments/)

For demonstration purposes, we'll use Facebook comments, but this shouldn't require much work to adapt it to the other providers.

First of all, we need to include the Facebook JavaScript SDK:

```django
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
            <div class="navbar-inner">
                <div class="container">
                    <a class="btn btn-navbar" data-toggle="collapse" data-target=".nav-collapse">
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                    </a>
                    <a class="brand" href="/">My Django Blog</a>
                    <div class="nav-collapse collapse">
                    </div>
                </div>
            </div>
        </div>
```

Now, the Facebook comment system requires that you pass through the absolute page URL when initialising the comments. At present we can't do that without hard-coding the domain name in our template, which we want to avoid. So, we need to add a site field to each post to identify the site it's associated with.

As usual, we update our tests first:

```python
from django.test import TestCase, LiveServerTestCase, Client
from django.utils import timezone
from blogengine.models import Post
from django.contrib.flatpages.models import FlatPage
from django.contrib.sites.models import Site
from django.contrib.auth.models import User
import markdown

# Create your tests here.
class PostTest(TestCase):
    def test_create_post(self):
        # Create the author
        author = User.objects.create_user('testuser', 'user@example.com', 'password')
        author.save()

        # Create the site
        site = Site()
        site.name = 'example.com'
        site.domain = 'example.com'
        site.save()
        
        # Create the post
        post = Post()

        # Set the attributes
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.slug = 'my-first-post'
        post.pub_date = timezone.now()
        post.author = author
        post.site = site

        # Save it
        post.save()

        # Check we can find it
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)
        only_post = all_posts[0]
        self.assertEquals(only_post, post)

        # Check attributes
        self.assertEquals(only_post.title, 'My first post')
        self.assertEquals(only_post.text, 'This is my first blog post')
        self.assertEquals(only_post.slug, 'my-first-post')
        self.assertEquals(only_post.site.name, 'example.com')
        self.assertEquals(only_post.site.domain, 'example.com')
        self.assertEquals(only_post.pub_date.day, post.pub_date.day)
        self.assertEquals(only_post.pub_date.month, post.pub_date.month)
        self.assertEquals(only_post.pub_date.year, post.pub_date.year)
        self.assertEquals(only_post.pub_date.hour, post.pub_date.hour)
        self.assertEquals(only_post.pub_date.minute, post.pub_date.minute)
        self.assertEquals(only_post.pub_date.second, post.pub_date.second)
        self.assertEquals(only_post.author.username, 'testuser')
        self.assertEquals(only_post.author.email, 'user@example.com')

class BaseAcceptanceTest(LiveServerTestCase):
    def setUp(self):
        self.client = Client()


class AdminTest(BaseAcceptanceTest):
    fixtures = ['users.json']

    def test_login(self):
        # Get login page
        response = self.client.get('/admin/')

        # Check response code
        self.assertEquals(response.status_code, 200)

        # Check 'Log in' in response
        self.assertTrue('Log in' in response.content)

        # Log the user in
        self.client.login(username='bobsmith', password="password")

        # Check response code
        response = self.client.get('/admin/')
        self.assertEquals(response.status_code, 200)

        # Check 'Log out' in response
        self.assertTrue('Log out' in response.content)

    def test_logout(self):
        # Log in
        self.client.login(username='bobsmith', password="password")

        # Check response code
        response = self.client.get('/admin/')
        self.assertEquals(response.status_code, 200)

        # Check 'Log out' in response
        self.assertTrue('Log out' in response.content)

        # Log out
        self.client.logout()

        # Check response code
        response = self.client.get('/admin/')
        self.assertEquals(response.status_code, 200)

        # Check 'Log in' in response
        self.assertTrue('Log in' in response.content)

    def test_create_post(self):
        # Log in
        self.client.login(username='bobsmith', password="password")

        # Check response code
        response = self.client.get('/admin/blogengine/post/add/')
        self.assertEquals(response.status_code, 200)

        # Create the new post
        response = self.client.post('/admin/blogengine/post/add/', {
            'title': 'My first post',
            'text': 'This is my first post',
            'pub_date_0': '2013-12-28',
            'pub_date_1': '22:00:04',
            'slug': 'my-first-post',
            'site': '1'
        },
        follow=True
        )
        self.assertEquals(response.status_code, 200)

        # Check added successfully
        self.assertTrue('added successfully' in response.content)

        # Check new post now in database
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)

    def test_edit_post(self):
        # Create the author
        author = User.objects.create_user('testuser', 'user@example.com', 'password')
        author.save()

        # Create the site
        site = Site()
        site.name = 'example.com'
        site.domain = 'example.com'
        site.save()
        
        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.slug = 'my-first-post'
        post.pub_date = timezone.now()
        post.author = author
        post.site = site
        post.save()

        # Log in
        self.client.login(username='bobsmith', password="password")

        # Edit the post
        response = self.client.post('/admin/blogengine/post/1/', {
            'title': 'My second post',
            'text': 'This is my second blog post',
            'pub_date_0': '2013-12-28',
            'pub_date_1': '22:00:04',
            'slug': 'my-second-post',
            'site': '1'
        },
        follow=True
        )
        self.assertEquals(response.status_code, 200)

        # Check changed successfully
        self.assertTrue('changed successfully' in response.content)

        # Check post amended
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)
        only_post = all_posts[0]
        self.assertEquals(only_post.title, 'My second post')
        self.assertEquals(only_post.text, 'This is my second blog post')

    def test_delete_post(self):
        # Create the author
        author = User.objects.create_user('testuser', 'user@example.com', 'password')
        author.save()

        # Create the site
        site = Site()
        site.name = 'example.com'
        site.domain = 'example.com'
        site.save()
        
        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.slug = 'my-first-post'
        post.pub_date = timezone.now()
        post.site = site
        post.author = author
        post.save()

        # Check new post saved
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)

        # Log in
        self.client.login(username='bobsmith', password="password")

        # Delete the post
        response = self.client.post('/admin/blogengine/post/1/delete/', {
            'post': 'yes'
        }, follow=True)
        self.assertEquals(response.status_code, 200)

        # Check deleted successfully
        self.assertTrue('deleted successfully' in response.content)

        # Check post amended
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 0)

class PostViewTest(BaseAcceptanceTest):
    def test_index(self):
        # Create the author
        author = User.objects.create_user('testuser', 'user@example.com', 'password')
        author.save()

        # Create the site
        site = Site()
        site.name = 'example.com'
        site.domain = 'example.com'
        site.save()

        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is [my first blog post](http://127.0.0.1:8000/)'
        post.slug = 'my-first-post'
        post.pub_date = timezone.now()
        post.author = author
        post.site = site
        post.save()

        # Check new post saved
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)

        # Fetch the index
        response = self.client.get('/')
        self.assertEquals(response.status_code, 200)

        # Check the post title is in the response
        self.assertTrue(post.title in response.content)

        # Check the post text is in the response
        self.assertTrue(markdown.markdown(post.text) in response.content)

        # Check the post date is in the response
        self.assertTrue(str(post.pub_date.year) in response.content)
        self.assertTrue(post.pub_date.strftime('%b') in response.content)
        self.assertTrue(str(post.pub_date.day) in response.content)

        # Check the link is marked up properly
        self.assertTrue('<a href="http://127.0.0.1:8000/">my first blog post</a>' in response.content)

    def test_post_page(self):
        # Create the author
        author = User.objects.create_user('testuser', 'user@example.com', 'password')
        author.save()

        # Create the site
        site = Site()
        site.name = 'example.com'
        site.domain = 'example.com'
        site.save()

        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is [my first blog post](http://127.0.0.1:8000/)'
        post.slug = 'my-first-post'
        post.pub_date = timezone.now()
        post.author = author
        post.site = site
        post.save()

        # Check new post saved
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)
        only_post = all_posts[0]
        self.assertEquals(only_post, post)

        # Get the post URL
        post_url = only_post.get_absolute_url()

        # Fetch the post
        response = self.client.get(post_url)
        self.assertEquals(response.status_code, 200)

        # Check the post title is in the response
        self.assertTrue(post.title in response.content)

        # Check the post text is in the response
        self.assertTrue(markdown.markdown(post.text) in response.content)

        # Check the post date is in the response
        self.assertTrue(str(post.pub_date.year) in response.content)
        self.assertTrue(post.pub_date.strftime('%b') in response.content)
        self.assertTrue(str(post.pub_date.day) in response.content)

        # Check the link is marked up properly
        self.assertTrue('<a href="http://127.0.0.1:8000/">my first blog post</a>' in response.content)


class FlatPageViewTest(BaseAcceptanceTest):
    def test_create_flat_page(self):
        # Create flat page
        page = FlatPage()
        page.url = '/about/'
        page.title = 'About me'
        page.content = 'All about me'
        page.save()

        # Add the site
        page.sites.add(Site.objects.all()[0])
        page.save()

        # Check new page saved
        all_pages = FlatPage.objects.all()
        self.assertEquals(len(all_pages), 1)
        only_page = all_pages[0]
        self.assertEquals(only_page, page)

        # Check data correct
        self.assertEquals(only_page.url, '/about/')
        self.assertEquals(only_page.title, 'About me')
        self.assertEquals(only_page.content, 'All about me')

        # Get URL
        page_url = str(only_page.get_absolute_url())

        # Get the page
        response = self.client.get(page_url)
        self.assertEquals(response.status_code, 200)

        # Check title and content in response
        self.assertTrue('About me' in response.content)
        self.assertTrue('All about me' in response.content)
```

All we've done here is to add the `site` attribute when creating a new post using the Django database API, and when we create one via the admin, we add an additional `site` aparameter to the HTTP POST request with a value of 1. Run the tests and they should fail:

```bash
Creating test database for alias 'default'...
E........
======================================================================
ERROR: test_create_post (blogengine.tests.PostTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 46, in test_create_post
    self.assertEquals(only_post.site.name, 'example.com')
AttributeError: 'Post' object has no attribute 'site'

----------------------------------------------------------------------
Ran 9 tests in 4.313s

FAILED (errors=1)
Destroying test database for alias 'default'...
```

So we need to add the `site` attribute to the `Post` model. Let's do that:

```python
from django.db import models
from django.contrib.auth.models import User
from django.contrib.sites.models import Site

# Create your models here.
class Post(models.Model):
    title = models.CharField(max_length=200)
    pub_date = models.DateTimeField()
    text = models.TextField()
    slug = models.SlugField(max_length=40, unique=True)
    author = models.ForeignKey(User)
    site = models.ForeignKey(Site)

    def get_absolute_url(self):
        return "/%s/%s/%s/" % (self.pub_date.year, self.pub_date.month, self.slug)

    def __unicode__(self):
        return self.title

    class Meta:
        ordering = ["-pub_date"]
```

Now create and run the migrations - you'll be prompted to create a default value for the site attribute as well:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py schemamigration --auto blogengine
 ? The field 'Post.site' does not have a default specified, yet is NOT NULL.
 ? Since you are adding this field, you MUST specify a default
 ? value to use for existing rows. Would you like to:
 ?  1. Quit now, and add a default to the field in models.py
 ?  2. Specify a one-off value to use for existing columns now
 ? Please select a choice: 2
 ? Please enter Python code for your one-off default value.
 ? The datetime module is available, so you can do e.g. datetime.date.today()
 >>> 1
 + Added field site on blogengine.Post
Created 0005_auto__add_field_post_site.py. You can now apply this migration with: ./manage.py migrate blogengine
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py migrate
Running migrations for blogengine:
 - Migrating forwards to 0005_auto__add_field_post_site.
 > blogengine:0005_auto__add_field_post_site
 - Loading initial data for blogengine.
Installed 0 object(s) from 0 fixture(s)
```

Our tests should then pass:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test
Creating test database for alias 'default'...
.........
----------------------------------------------------------------------
Ran 9 tests in 4.261s

OK
Destroying test database for alias 'default'...
```

Now we can include our full page URL on the post detail page:

```django
{% extends "blogengine/includes/base.html" %}

    {% load custom_markdown %}

    {% block content %}
        <div class="post">
        <h1>{{ object.title }}</h1>
        <h3>{{ object.pub_date }}</h3>
        {{ object.text|custom_markdown }}

        <h4>Comments</h4>
        <div class="fb-comments" data-href="http://{{ post.site }}{{ post.get_absolute_url }}" data-width="470" data-num-posts="10"></div>

        </div>

    {% endblock %}
```

If you want to customise the comments, take a look at [the documentation for Facebook Comments](https://developers.facebook.com/docs/plugins/comments/).

With that done, we can commit our changes:

```bash
$ git add blogengine/ templates/
$ git commit -m 'Implemented Facebook comments'
```

And that wraps up this lesson. As usual, you can easily switch to today's lesson with `git checkout lesson-3`. Next time we'll implement categories and tags, and create an RSS feed for our blog posts.
