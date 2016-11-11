---
layout: post
title: "Django Blog Tutorial - the Next Generation - Part 9"
date: 2014-09-28 20:51:02 +0100
comments: true
categories: 
- tdd
- python
- django
- django-blog-tutorial
---

Yes, I know the eight instalment was meant to be the last one! Within 24 hours of that post going live, Django 1.7 was released, so naturally I'd like to show you how to upgrade to it.

The biggest change is that Django 1.7 introduces its own migration system, which means South is now surplus to requirements. We therefore need to switch from South to Django's native migrations. Fortunately, this is fairly straightforward.

First of all, activate your virtualenv:

```bash
$ virtualenv venv
```

Then make sure your migrations are up to date:

```bash
$ python manage.py syncdb
$ python manage.py migrate
```

Then, upgrade your Django version and uninstall South:

```bash
$ pip install Django --upgrade
$ pip uninstall South
$ pip freeze > requirements.txt
```

Next, remove South from `INSTALLED_APPS` in `django_tutorial_blog_ng/settings.py`.

You now need to delete all of the numbered migration files in `blogengine/migrations/`, and the relevant `.pyc` files, but NOT the directory or the `__init__.py` file. You can do so with this command on Linux or OS X:

```bash
$ rm blogengine/migrations/00*
```

Next, we recreate our migrations with the following command:

```bash
$ python manage.py makemigrations
Migrations for 'blogengine':
  0001_initial.py:
    - Create model Category
    - Create model Post
    - Create model Tag
    - Add field tags to post
```

Then we run the migrations:

```bash
$ python manage.py migrate
Operations to perform:
  Synchronize unmigrated apps: sitemaps, django_jenkins, debug_toolbar
  Apply all migrations: sessions, admin, sites, flatpages, contenttypes, auth, blogengine
Synchronizing apps without migrations:
  Creating tables...
  Installing custom SQL...
  Installing indexes...
Running migrations:
  Applying contenttypes.0001_initial... FAKED
  Applying auth.0001_initial... FAKED
  Applying admin.0001_initial... FAKED
  Applying sites.0001_initial... FAKED
  Applying blogengine.0001_initial... FAKED
  Applying flatpages.0001_initial... FAKED
  Applying sessions.0001_initial... FAKED
```

Don't worry too much if the output doesn't look exactly the same as this - as long as it works, that's the main thing.

Let's run our test suite to ensure it works:

```bash
$ python manage.py jenkins
Creating test database for alias 'default'...
....FF.F.FFFFFF..............
======================================================================
FAIL: test_create_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 385, in test_create_post
    self.assertTrue('added successfully' in response.content)
AssertionError: False is not true

======================================================================
FAIL: test_create_post_without_tag (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 417, in test_create_post_without_tag
    self.assertTrue('added successfully' in response.content)
AssertionError: False is not true

======================================================================
FAIL: test_delete_category (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 278, in test_delete_category
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

======================================================================
FAIL: test_delete_tag (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 346, in test_delete_tag
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

======================================================================
FAIL: test_edit_category (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 255, in test_edit_category
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

======================================================================
FAIL: test_edit_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 447, in test_edit_post
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

======================================================================
FAIL: test_edit_tag (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 323, in test_edit_tag
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

======================================================================
FAIL: test_login (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 183, in test_login
    self.assertEquals(response.status_code, 200)
AssertionError: 302 != 200

======================================================================
FAIL: test_logout (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 214, in test_logout
    self.assertEquals(response.status_code, 200)
AssertionError: 302 != 200

----------------------------------------------------------------------
Ran 29 tests in 7.383s

FAILED (failures=9)
Destroying test database for alias 'default'...
```

We have an issue here. A load of the tests for the admin interface now fail. If we now try running the dev server, we see this error:

```bash
$ python manage.py runserver
Performing system checks...

System check identified no issues (0 silenced).
September 28, 2014 - 20:16:47
Django version 1.7, using settings 'django_tutorial_blog_ng.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
Unhandled exception in thread started by <function wrapper at 0x1024a5ed8>
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/utils/autoreload.py", line 222, in wrapper
    fn(*args, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/core/management/commands/runserver.py", line 132, in inner_run
    handler = self.get_handler(*args, **options)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/contrib/staticfiles/management/commands/runserver.py", line 25, in get_handler
    handler = super(Command, self).get_handler(*args, **options)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/core/management/commands/runserver.py", line 48, in get_handler
    return get_internal_wsgi_application()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/core/servers/basehttp.py", line 66, in get_internal_wsgi_application
    sys.exc_info()[2])
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/core/servers/basehttp.py", line 56, in get_internal_wsgi_application
    return import_string(app_path)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/utils/module_loading.py", line 26, in import_string
    module = import_module(module_path)
  File "/usr/local/Cellar/python/2.7.8_1/Frameworks/Python.framework/Versions/2.7/lib/python2.7/importlib/__init__.py", line 37, in import_module
    __import__(name)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/django_tutorial_blog_ng/wsgi.py", line 14, in <module>
    from dj_static import Cling
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/dj_static.py", line 7, in <module>
    from django.core.handlers.base import get_path_info
django.core.exceptions.ImproperlyConfigured: WSGI application 'django_tutorial_blog_ng.wsgi.application' could not be loaded; Error importing module: 'cannot import name get_path_info'
```

Fortunately, the error above is easy to fix by upgrading `dj_static`:

```bash
$ pip install dj_static --upgrade
$ pip freeze > requirements.txt
```

That resolves the error in serving static files, but not the error with the admin. If you run the dev server, you'll be able to see that the admin actually works fine. The problem is caused by the test client not following redirects in the admin. We can easily run just the admin tests with the following command:

```bash
$ python manage.py test blogengine.tests.AdminTest
Creating test database for alias 'default'...
.FF.F.FFFFFF
======================================================================
FAIL: test_create_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 385, in test_create_post
    self.assertTrue('added successfully' in response.content)
AssertionError: False is not true

======================================================================
FAIL: test_create_post_without_tag (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 417, in test_create_post_without_tag
    self.assertTrue('added successfully' in response.content)
AssertionError: False is not true

======================================================================
FAIL: test_delete_category (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 278, in test_delete_category
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

======================================================================
FAIL: test_delete_tag (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 346, in test_delete_tag
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

======================================================================
FAIL: test_edit_category (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 255, in test_edit_category
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

======================================================================
FAIL: test_edit_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 447, in test_edit_post
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

======================================================================
FAIL: test_edit_tag (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 323, in test_edit_tag
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

======================================================================
FAIL: test_login (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 183, in test_login
    self.assertEquals(response.status_code, 200)
AssertionError: 302 != 200

======================================================================
FAIL: test_logout (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 214, in test_logout
    self.assertEquals(response.status_code, 200)
AssertionError: 302 != 200

----------------------------------------------------------------------
Ran 12 tests in 3.283s

FAILED (failures=9)
Destroying test database for alias 'default'...
```

Let's commit our changes so far first:

```bash
$ git add django_tutorial_blog_ng/ requirements.txt blogengine/
$ git commit -m 'Upgraded to Django 1.7'
```

Now let's fix our tests. Here's the amended version of the `AdminTest` class:

```python
class AdminTest(BaseAcceptanceTest):
    fixtures = ['users.json']

    def test_login(self):
        # Get login page
        response = self.client.get('/admin/', follow=True)

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
        response = self.client.get('/admin/', follow=True)
        self.assertEquals(response.status_code, 200)

        # Check 'Log in' in response
        self.assertTrue('Log in' in response.content)

    def test_create_category(self):
        # Log in
        self.client.login(username='bobsmith', password="password")

        # Check response code
        response = self.client.get('/admin/blogengine/category/add/')
        self.assertEquals(response.status_code, 200)

        # Create the new category
        response = self.client.post('/admin/blogengine/category/add/', {
            'name': 'python',
            'description': 'The Python programming language'
            },
            follow=True
        )
        self.assertEquals(response.status_code, 200)

        # Check added successfully
        self.assertTrue('added successfully' in response.content)

        # Check new category now in database
        all_categories = Category.objects.all()
        self.assertEquals(len(all_categories), 1)

    def test_edit_category(self):
        # Create the category
        category = CategoryFactory()

        # Log in
        self.client.login(username='bobsmith', password="password")

        # Edit the category
        response = self.client.post('/admin/blogengine/category/' + str(category.pk) + '/', {
            'name': 'perl',
            'description': 'The Perl programming language'
            }, follow=True)
        self.assertEquals(response.status_code, 200)

        # Check changed successfully
        self.assertTrue('changed successfully' in response.content)

        # Check category amended
        all_categories = Category.objects.all()
        self.assertEquals(len(all_categories), 1)
        only_category = all_categories[0]
        self.assertEquals(only_category.name, 'perl')
        self.assertEquals(only_category.description, 'The Perl programming language')

    def test_delete_category(self):
        # Create the category
        category = CategoryFactory()

        # Log in
        self.client.login(username='bobsmith', password="password")

        # Delete the category
        response = self.client.post('/admin/blogengine/category/' + str(category.pk) + '/delete/', {
            'post': 'yes'
        }, follow=True)
        self.assertEquals(response.status_code, 200)

        # Check deleted successfully
        self.assertTrue('deleted successfully' in response.content)

        # Check category deleted
        all_categories = Category.objects.all()
        self.assertEquals(len(all_categories), 0)

    def test_create_tag(self):
        # Log in
        self.client.login(username='bobsmith', password="password")

        # Check response code
        response = self.client.get('/admin/blogengine/tag/add/')
        self.assertEquals(response.status_code, 200)

        # Create the new tag
        response = self.client.post('/admin/blogengine/tag/add/', {
            'name': 'python',
            'description': 'The Python programming language'
            },
            follow=True
        )
        self.assertEquals(response.status_code, 200)

        # Check added successfully
        self.assertTrue('added successfully' in response.content)

        # Check new tag now in database
        all_tags = Tag.objects.all()
        self.assertEquals(len(all_tags), 1)

    def test_edit_tag(self):
        # Create the tag
        tag = TagFactory()

        # Log in
        self.client.login(username='bobsmith', password="password")

        # Edit the tag
        response = self.client.post('/admin/blogengine/tag/' + str(tag.pk) + '/', {
            'name': 'perl',
            'description': 'The Perl programming language'
            }, follow=True)
        self.assertEquals(response.status_code, 200)

        # Check changed successfully
        self.assertTrue('changed successfully' in response.content)

        # Check tag amended
        all_tags = Tag.objects.all()
        self.assertEquals(len(all_tags), 1)
        only_tag = all_tags[0]
        self.assertEquals(only_tag.name, 'perl')
        self.assertEquals(only_tag.description, 'The Perl programming language')

    def test_delete_tag(self):
        # Create the tag
        tag = TagFactory()

        # Log in
        self.client.login(username='bobsmith', password="password")

        # Delete the tag
        response = self.client.post('/admin/blogengine/tag/' + str(tag.pk) + '/delete/', {
            'post': 'yes'
        }, follow=True)
        self.assertEquals(response.status_code, 200)

        # Check deleted successfully
        self.assertTrue('deleted successfully' in response.content)

        # Check tag deleted
        all_tags = Tag.objects.all()
        self.assertEquals(len(all_tags), 0)

    def test_create_post(self):
        # Create the category
        category = CategoryFactory()

        # Create the tag
        tag = TagFactory()

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
            'site': '1',
            'category': str(category.pk),
            'tags': str(tag.pk)
        },
        follow=True
        )
        self.assertEquals(response.status_code, 200)

        # Check added successfully
        self.assertTrue('added successfully' in response.content)

        # Check new post now in database
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)
    
    def test_create_post_without_tag(self):
        # Create the category
        category = CategoryFactory()

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
            'site': '1',
            'category': str(category.pk)
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
        # Create the post
        post = PostFactory()

        # Create the category
        category = CategoryFactory()

        # Create the tag
        tag = TagFactory()
        post.tags.add(tag)

        # Log in
        self.client.login(username='bobsmith', password="password")

        # Edit the post
        response = self.client.post('/admin/blogengine/post/' + str(post.pk) + '/', {
            'title': 'My second post',
            'text': 'This is my second blog post',
            'pub_date_0': '2013-12-28',
            'pub_date_1': '22:00:04',
            'slug': 'my-second-post',
            'site': '1',
            'category': str(category.pk),
            'tags': str(tag.pk)
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
        # Create the post
        post = PostFactory()

        # Create the tag
        tag = TagFactory()
        post.tags.add(tag)

        # Check new post saved
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)

        # Log in
        self.client.login(username='bobsmith', password="password")

        # Delete the post
        response = self.client.post('/admin/blogengine/post/' + str(post.pk) + '/delete/', {
            'post': 'yes'
        }, follow=True)
        self.assertEquals(response.status_code, 200)

        # Check deleted successfully
        self.assertTrue('deleted successfully' in response.content)

        # Check post deleted
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 0)
```

There are two main issues here. The first is that when we try to edit or delete an existing item, or refer to it when creating something else, we can no longer rely on the number representing the primary key being set to 1. So we need to specifically obtain this, rather than hard-coding it to 1. Therefore, whenever we pass through a number to represent an item (with the exception of the site, but including tags, categories and posts), we need to instead fetch its primary key and return it. So, above where we try to delete a post, we replace `1` with `str(post.pk)`. This will solve a lot of the problems. As there's a lot of them, I won't go through each one, but you can see the entire class above for reference, and if you've followed along so far, you shouldn't have any problems.

The other issue we need to fix is the login and logout tests. We simply add `follow=True` to these to ensure that the test client follows the redirects.

Let's run our tests to make sure they pass:

```bash
$ python manage.py jenkins
Creating test database for alias 'default'...
.............................
----------------------------------------------------------------------
Ran 29 tests in 8.210s

OK
Destroying test database for alias 'default'...
```

With that done, you can commit your changes:

```bash
$ git add blogengine/tests.py
$ git commit -m 'Fixed broken tests'
```

Don't forget to deploy your changes:

```bash
$ fab deploy
```

Our blog has now been happily migrated over to Django 1.7!
