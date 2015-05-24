---
layout: post
title: "Django blog tutorial - the next generation - part 1"
date: 2013-12-28 15:00:32 +0000
comments: true
categories: 
- python
- django
- tdd
---

My series of Django tutorials for building a blogging engine are by far the most popular posts I've ever written on here. I've had a lot of people contact me with questions or just to express their thanks, for which I'm very grateful!

However, these tutorials haven't really aged well. I've since had the opportunity to use Django in a professional capacity, which has significantly improved my understanding of the framework and the whole Python ecosystem, and there's a lot of best practices that I didn't follow and now wish I had. There's also been a few gotchas that have hindered a few people in the past that I'd like to have the opportunity to correct.

So, I'm therefore creating a brand new series of tutorials to remedy this situation. This series will cover exactly the same basic idea of using Django to build a blogging engine, but will expand on what the original series did in many ways. We will cover such additional topics as:

* Using Twitter Bootstrap to make your blog look good without too much hassle
* Using Virtualenv to sandbox your blog application
* Using South to effectively manage changes to your database structure
* Writing some simple unit tests
* Deploying the finished application to Heroku

Ready? Let's get started!

Getting everything set up
-------------------------

Now, first of all, I'm going to assume you're using some variant of Unix, such as Linux or Mac OS X. I'm not saying you can't follow this tutorial with Windows, but you'll have a harder time, because Windows just isn't as developer-friendly as Unix in general. A modern Linux distro like Ubuntu is generally pretty easy to use, and you can easily run it in Virtualbox, so if you use Windows I would recommend you use that to make things easier.

You should also have at least a basic grasp of the command line, such as how to create and navigate directories. You don't have to be a wizard with it, though.

You also need a proper programmer's text editor. I use Vim, but I freely admit that Vim has a very steep learning curve and you may have trouble picking it up at the same time as following this tutorial. Emacs is also a very powerful text editor, and if you like it, feel free to use it. If you haven't yet found a programmer's text editor you like, I suggest you check out [Sublime Text](http://www.sublimetext.com/), which is easy to get started with, but also very powerful, and can be used without purchasing a license. Don't worry too much about your text editor - it's not vitally import that you use what I use, just find one that works for you. That said, I will say one thing - DON'T use an IDE. IDE's hide too many details from new users and make it harder to figure out what's going on.

You will also need to ensure you have the following installed:

* Python. I recommend installing Python 2.7, because you may have issues with Python 2.6, and Python 3 isn't universally supported yet so you might have some issues with that
* Virtualenv
* Pip
* Git

On most Linux distros, you can find packages for all of these items easily enough using your package manager. On Mac OS X, I recommend using Homebrew to install them, though if you have another package manager installed you can use that too. If you have issues with installing any of these, a quick Google search should be sufficient to resolve the issue.

Beginning work
--------------

With all that done, we're ready to get started. Create a folder in a suitable place on your file system and switch into it. I generally keep a dedicated folder in my home directory called `Projects` to use for all of my projects, and give each project a folder within it - in this case the project is called `django_tutorial_blog_ng`.

Now, we'll use Git to keep track of our source code. If you prefer Mercurial, feel free to use that, but this tutorial will assume use of Git, so you'll want to adapt the commands used accordingly. Start tracking your project with the following command from the shell, when you're in the project directory:

```bash
$ git init
```

If you haven't used Git before, you'll also want to [configure it](http://git-scm.com/book/en/Getting-Started-First-Time-Git-Setup).

Next, we set up our virtualenv. Run the following command:

```bash
$ virtualenv venv --distribute
```

Followed by:

```bash
$ source venv/bin/activate
```

Every time you come back to work on this project, you'll need to run the previous command to make sure you're running the version of Python installed under venv/ rather than your system Python. You can tell it's using this because your shell prompt will be prefixed with `(venv)`.

Why do this? Well, it means you can install whatever version of a Python module you like, without having root access, and means the Python install you're using will only have those modules you explicitly install, rather than all of those ones available with your operating system. For instance, you could have multiple projects using different versions of Django, rather than having to update a global installation of Django and potentially break existing applications.

Now that our virtualenv is set up, we'll install Django, as well as several other useful Python modules. Run the following command:

```bash
$ pip install django-toolbelt South
```

A little explanation is called for here. The package `django-toolbelt` includes a number of packages we'll be using, including Django, as well as Gunicorn (a simple web server we'll use when the time comes to deploy the app to Heroku). South is a migration tool that is commonly used with Django - basically, if you make changes to existing models, Django doesn't natively have the capacity to apply those changes (yet - native migrations are planned at some point in the future), so South can be used to apply those changes for you without having to either manually change the database structure or dump the database and rebuild it.

Please note that one of the packages, `psycopg2`, may fail if you don't have PostgreSQL installed, but don't worry about installing it. We'll be using SQLite for developing the application locally, and we'll be deploying the finished product to Heroku, which does have it installed.

Once the installation is complete, run the following command to record the new modules installed:

```bash
$ pip freeze > requirements.txt
```

The file `requirements.txt` will be created, which stores the packages and versions you have installed so that they can be easily recreated. If you had issues installing `psycopg2`, then here's what your `requirements.txt` should look like - feel free to edit it manually to look like this, as when we deploy it to Heroku, it will need to be correct to ensure that our application can be deployed successfully:

```bash
Django==1.6.1
South==0.8.4
dj-database-url==0.2.2
dj-static==0.0.5
django-toolbelt==0.0.1
gunicorn==18.0
psycopg2==2.5.1
static==0.4
wsgiref==0.1.2
```

Next, we'll commit these changes with Git:

```bash
$ git add requirements.txt
$ git commit -m 'Committed requirements'
```

Next we'll add a `.gitignore` file to ignore our virtualenv - we want to keep this out of version control because it's something specific to that install. We have all we need to recreate it so we don't want to store it. In addition, we also want to ignore any compiled Python files (identifiable by the .pyc suffix):

```bash
venv/
*.pyc
```

Let's commit that too:

```bash
$ git add .gitignore
$ git commit -m 'Added a gitignore file'
```

Now, let's generate our project's basic skeleton:

```bash
$ django-admin.py startproject django_tutorial_blog_ng .
```

This application skeleton includes a basic configuration which will be sufficient for now, but you will also want to add the SQLite database file to your `.gitignore`:

```bash
env/
*.pyc
db.sqlite3
```

Let's commit what we've done:

```bash
$ git add .gitignore django_tutorial_blog_ng/ manage.py
$ git commit -m 'Created project skeleton'
```

Now, before we create our database, we need to ensure we are using South. Go into `django_tutorial_blog_ng/settings.py` and find `INSTALLED_APPS`. Edit it to look like this:

```python
INSTALLED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'south',
)
```

Now, you can create your database. Run the following command:

```bash
$ python manage.py syncdb
```

You'll be prompted to create a superuser - go ahead and fill in the details. Now, run the following command:

```bash
$ python manage.py runserver
```

This will run Django's built-in web server on port 8000, and if you click [here](http://127.0.0.1:8000), you should see a page congratulating you on your first Django-powered page. Once you're finished with it, you can stop the web server with <kbd>Ctrl-C</kbd>.

Don't forget to commit your changes:

```bash
$ git add django_tutorial_blog_ng/settings.py
$ git commit -m 'Added South to installed apps'
```

Your first app
--------------

Django distinguishes between the concepts of **projects** and **apps**. A project is a specific project that may consist of one or more apps, such as a web app, whereas an app is a set of functionality within a project. For instance, one website might include some flat pages, an admin interface, and a blogging engine, and these could easily be different apps. By encouraging you to separate different types of functionality into different apps, Django makes it easier for you to reuse existing content elsewhere.

We're going to create our first app, which is the blogging engine. Run the following command to create a basic skeleton for this app:

```bash
$ python manage.py startapp blogengine
```

Next, we need to amend our settings to install this app:

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
)
```

Now, before we can use this app, we want to let South know about it so that changes to your database structure will be managed right from the start by South. Run the following command to create your initial migration:

```bash
$ python manage.py schemamigration --initial blogengine
```

That creates the file for your first migration,but doesn't run it. To migrate your database structure to the latest version, run the following:

```bash
$ python manage.py migrate
```

This won't actually make any changes, but it will ensure that all future changes to your models for the `blogengine` app are handled by South. Let's commit our app skeleton:

```bash
$ git add django_tutorial_blog_ng/settings.py blogengine/
$ git commit -m 'Added blogengine app skeleton'
```

So, we now have our first app set up, but it doesn't do anything much.

Remember that I mentioned how Django differentiates between projects and apps? Well, Django actually ships with a number of useful apps, and one of those is the admin interface. I consider the Django admin to be one of the framework's killer features because it's easy to use and customise, and saves you a lot of grief.

In the past, the admin interface needed a little work to get it working, but in Django 1.6 it's configured to work out of the box, so if you click [here](http://127.0.0.1:8000/admin/), you should see the login screen for it. You should be able to sign in using the username and password you set when you ran `syncdb`.

Next, we'll set up our first model.

An introduction to MVC
----------------------

MVC is a common pattern used in web development. Many web development frameworks can be loosely described as MVC, including Django, Rails, CodeIgniter, Laravel and Symfony, as well as some client-side frameworks like Backbone.js. The basic concept is that a web app is divided into three basic components:

* **Models** - the data managed with the application
* **Views** - the presentation of the data
* **Controllers** - an intermediary between the models and the views

Now, Django's interpretation of MVC is slightly different to many other frameworks. While in most frameworks the views are HTML templates for rendering the data, in Django this role is taken by the templates, and the views are functions or objects that render data from the models using a template. Effectively, you can think of Django's views as being like controllers in other frameworks, and Django templates as being views.

In Django, you create your models as Python classes that represent your data, and you use the Django ORM to query the database. As a result, it's rare to have to directly query your database using SQL, making it more portable between different databases.

Now, our first model is going to be of a blog post. At least initially, each post will have the following attributes:

* A title
* A publication date and time
* Some text

Now, we could just jump straight into creating our first model, but we're going to make a point of following the practices of test-driven development here. The basic concept of TDD is that you write a failing test before writing any code, then you write the code to pass that test afterwards. It does make things a bit slower, but it's all too easy to neglect writing tests at all if you leave it till later.

If you take a look in the `blogengine` folder you'll notice there's a file called `tests.py`. Open it up and you should see the following:

```python
from django.test import TestCase

# Create your tests here.
```

It's worth taking a little time to plan out what we want to test from our post model. Each post object will have the attributes I mentioned above, and what we want to be able to do is test that we can:

* Set the title
* Set the publication date and time
* Set the text
* Save it successfully
* Retrieve it successfully

So, let's create a test for our post model. We'll go through the relevant sections of the test bit by bit:

```python
from django.test import TestCase
from django.utils import timezone
from blogengine.models import Post

```

Here we're importing the required functionality. `TestCase` is provided by Django, and is an object all of your tests should inherit from. `timezone` is a utility for handling dates and times correctly. Finally, `Post` is our model, which we have yet to implement.

```python
# Create your tests here.
class PostTest(TestCase):
    def test_create_post(self):
        # Create the post
        post = Post()
```

Here we create the PostTest class, which represents a test for your `Post` model. So far it only has one method, but you can add additional ones if required.

```python

        # Set the attributes
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.pub_date = timezone.now()
```

Here we set the post's attributes.

```python

        # Save it
        post.save()
```

Now we save it. At this point it has been added to the database, and the rest of the test involves us ensuring it has been saved correctly and can be retrieved.

```python

        # Check we can find it
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)
        only_post = all_posts[0]
        self.assertEquals(only_post, post)
```

Here we use the Django database API to fetch all of the Post objects, assert that there is only 1 post object, retrieve that post object, and assert that it is the same object as the post object we just saved.

If unit testing is new to you, assertions may be new to you. Essentially you're saying to the Python interpreter, "I assert that X is true, so please raise an error if this is not true". Here we assert that the length of the variable `all_posts` is 1, and that that post is the same object as the previously saved object, so that the test will fail if that is not the case.

```python

        # Check attributes
        self.assertEquals(only_post.title, 'My first post')
        self.assertEquals(only_post.text, 'This is my first blog post')
        self.assertEquals(only_post.pub_date.day, post.pub_date.day)
        self.assertEquals(only_post.pub_date.month, post.pub_date.month)
        self.assertEquals(only_post.pub_date.year, post.pub_date.year)
        self.assertEquals(only_post.pub_date.hour, post.pub_date.hour)
        self.assertEquals(only_post.pub_date.minute, post.pub_date.minute)
        self.assertEquals(only_post.pub_date.second, post.pub_date.second)
```

Finally, we assert that the values of each of the post's attributes as stored in the database match up with those in the post object we set. For the `title` and `text` fields, these are easy to validate as we can just check the values against those we set. For the `pub_date` field, things are a bit more complex, since this will be an object in its own right, so you need to check the day, month, year, hour, minute and second attributes separately.

The whole thing should look like this:

```python
from django.test import TestCase
from django.utils import timezone
from blogengine.models import Post

# Create your tests here.
class PostTest(TestCase):
    def test_create_post(self):
        # Create the post
        post = Post()

        # Set the attributes
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.pub_date = timezone.now()

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
        self.assertEquals(only_post.pub_date.day, post.pub_date.day)
        self.assertEquals(only_post.pub_date.month, post.pub_date.month)
        self.assertEquals(only_post.pub_date.year, post.pub_date.year)
        self.assertEquals(only_post.pub_date.hour, post.pub_date.hour)
        self.assertEquals(only_post.pub_date.minute, post.pub_date.minute)
        self.assertEquals(only_post.pub_date.second, post.pub_date.second)
```

With that in place, the time has come to run our test with the following command:

```bash
$ python manage.py test
```

You should see something like this:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test
Creating test database for alias 'default'...
E
======================================================================
ERROR: blogengine.tests (unittest.loader.ModuleImportFailure)
----------------------------------------------------------------------
ImportError: Failed to import test module: blogengine.tests
Traceback (most recent call last):
  File "/usr/local/Cellar/python/2.7.6/Frameworks/Python.framework/Versions/2.7/lib/python2.7/unittest/loader.py", line 254, in _find_tests
    module = self._get_module_from_name(name)
  File "/usr/local/Cellar/python/2.7.6/Frameworks/Python.framework/Versions/2.7/lib/python2.7/unittest/loader.py", line 232, in _get_module_from_name
    __import__(name)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 3, in <module>
    from blogengine.models import Post
ImportError: cannot import name Post


----------------------------------------------------------------------
Ran 1 test in 0.000s

FAILED (errors=1)
Destroying test database for alias 'default'...
```

Don't worry about the error - this is exactly what we expect to see because we haven't implemented our Post model yet. Now that we have a failing test in place, we can implement our model to make the test pass. Open up `blogengine/models.py` and enter the following:

```python
from django.db import models

# Create your models here.
class Post(models.Model):
    title = models.CharField(max_length=200)
    pub_date = models.DateTimeField()
    text = models.TextField()
```

Save the file and run the test again:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test
Creating test database for alias 'default'...
E
======================================================================
ERROR: test_create_post (blogengine.tests.PostTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 17, in test_create_post
    post.save()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/base.py", line 545, in save
    force_update=force_update, update_fields=update_fields)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/base.py", line 573, in save_base
    updated = self._save_table(raw, cls, force_insert, force_update, using, update_fields)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/base.py", line 654, in _save_table
    result = self._do_insert(cls._base_manager, using, fields, update_pk, raw)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/base.py", line 687, in _do_insert
    using=using, raw=raw)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/manager.py", line 232, in _insert
    return insert_query(self.model, objs, fields, **kwargs)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/query.py", line 1511, in insert_query
    return query.get_compiler(using=using).execute_sql(return_id)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/models/sql/compiler.py", line 898, in execute_sql
    cursor.execute(sql, params)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/backends/util.py", line 53, in execute
    return self.cursor.execute(sql, params)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/utils.py", line 99, in __exit__
    six.reraise(dj_exc_type, dj_exc_value, traceback)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/backends/util.py", line 53, in execute
    return self.cursor.execute(sql, params)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/venv/lib/python2.7/site-packages/django/db/backends/sqlite3/base.py", line 450, in execute
    return Database.Cursor.execute(self, query, params)
OperationalError: no such table: blogengine_post

----------------------------------------------------------------------
Ran 1 test in 0.059s

FAILED (errors=1)
Destroying test database for alias 'default'...
```

Our test still fails, but if we take a look at this error message, we can see why - there is no database table for the posts (called `blogengine_post`). Using South, we can easily remedy that by creating a new migration to create this table:

```bash
$ python manage.py schemamigration --auto blogengine
```

That creates the new migration. Now let's run it:

```bash
$ python manage.py migrate
```

Now, let's run our tests to check it's working as expected:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test
Creating test database for alias 'default'...
.
----------------------------------------------------------------------
Ran 1 test in 0.001s

OK
Destroying test database for alias 'default'...
```

Success! We now have a model in place that passes our test. Let's commit our changes:

```bash
$ git add blogengine/
$ git commit -m 'Added post model with passing test'
```

Now, Django's ORM is basically a layer on top of SQL that abstracts away differences between different relational databases, but the underlying queries are still being run. You can view the SQL created to generate the table by using the `sqlall` command. Just run `python manage.py sqlall blogengine` and you should see something like this:

```sql
BEGIN;
CREATE TABLE "blogengine_post" (
    "id" integer NOT NULL PRIMARY KEY,
    "title" varchar(200) NOT NULL,
    "pub_date" datetime NOT NULL,
    "text" text NOT NULL
)
;

COMMIT;
```

Note the addition of the `id` field as the primary key. If you're at all familiar with relational databases, you'll know that every table must have one field, called a primary key, that is a unique reference to that row. This can be overridden, but here it's exactly the behaviour we want.

Creating blog posts via the admin
---------------------------------

Now, we need a way to be able to create, edit and delete blog posts. Django's admin interface allows us to do so easily. However, before we do so, we want to create automated acceptance tests for this functionality, in order to test the ability to create posts from an end-user's perspective. While unit tests are for testing sections of an application's functionality from the perspective of other sections of the application, acceptance tests are testing from the user's perspective. In other words, they test what the application needs to do to be acceptable.

First, we will test logging into the admin. Open up `blogengine/tests.py` and amend it as follows:

```python
from django.test import TestCase, LiveServerTestCase, Client
from django.utils import timezone
from blogengine.models import Post

# Create your tests here.
class PostTest(TestCase):
    def test_create_post(self):
        # Create the post
        post = Post()

        # Set the attributes
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.pub_date = timezone.now()

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
        self.assertEquals(only_post.pub_date.day, post.pub_date.day)
        self.assertEquals(only_post.pub_date.month, post.pub_date.month)
        self.assertEquals(only_post.pub_date.year, post.pub_date.year)
        self.assertEquals(only_post.pub_date.hour, post.pub_date.hour)
        self.assertEquals(only_post.pub_date.minute, post.pub_date.minute)
        self.assertEquals(only_post.pub_date.second, post.pub_date.second)

class AdminTest(LiveServerTestCase):
    def test_login(self):
        # Create client
        c = Client()

        # Get login page
        response = c.get('/admin/')

        # Check response code
        self.assertEquals(response.status_code, 200)
```

First of all, we import two new objects from `django.test`, `LiveServerTestCase` and `Client`. Then we create the first part of our first test for the admin, named `AdminTest`. Eventually, this will test that we can log successfully into the admin interface. For now, we're just doing the following:

* Creating a Client object
* Fetching the `/admin/` route
* Asserting that the status code for this HTTP request is 200, (in other words, that the page was fetched successfully).

If you run `python manage.py test`, you should see that both tests pass successfully. Now we'll extend `AdminTest` - we'll verify that the response contains the string 'Log in', which in the Django admin interface, appears on the login page:

```python
class AdminTest(LiveServerTestCase):
    def test_login(self):
        # Create client
        c = Client()

        # Get login page
        response = c.get('/admin/')

        # Check response code
        self.assertEquals(response.status_code, 200)

        # Check 'Log in' in response
        self.assertTrue('Log in' in response.content)
```

Here `response.content` is a string containing the content of the HTTP response - we're asserting that the substring 'Log in' appears in there. If you run `python manage.py test` again, it should pass.

Now, we need to actually log in. This could be fiddly, but Django has a handy convenience method to log you in when testing:

```python
class AdminTest(LiveServerTestCase):
    def test_login(self):
        # Create client
        c = Client()

        # Get login page
        response = c.get('/admin/')

        # Check response code
        self.assertEquals(response.status_code, 200)

        # Check 'Log in' in response
        self.assertTrue('Log in' in response.content)

        # Log the user in
        c.login(username='bobsmith', password="password")

        # Check response code
        response = c.get('/admin/')
        self.assertEquals(response.status_code, 200)

        # Check 'Log out' in response
        self.assertTrue('Log out' in response.content)
```

Here, we use the `login` method of the `Client` object to log into the admin interface, and then we fetch the `/admin/` route again. We assert that we get a 200 status code, and we assert that the response contains the string 'Log out' - in other words, that we are logged in.

Try running `python manage.py test` and we'll get an error., because the user details we've used to log in don't exist. Let's resolve that.

Now, you could put your own credentials in there, but that's not a good idea because it's a security risk. Instead, we'll create a fixture for the test user that will be loaded when the tests are run. Run the following command:

```bash
$ python manage.py createsuperuser
```

Give the username as `bobsmith`, the email address as `bob@example.com`, and the password as `password`. Once that's done, run these commands to dump the existing users to a fixture:

```bash
$ mkdir blogengine/fixtures
$ python manage.py dumpdata auth.User --indent=2 > blogengine/fixtures/users.json
```

This will dump all of the existing users to `blogengine/fixtures/users.json`. You may wish to edit this file to remove your own superuser account and leave only the newly created one in there.

Next we need to amend our test to load this fixture:

```python
class AdminTest(LiveServerTestCase):
    fixtures = ['users.json']

    def test_login(self):
        # Create client
        c = Client()

        # Get login page
        response = c.get('/admin/')

        # Check response code
        self.assertEquals(response.status_code, 200)

        # Check 'Log in' in response
        self.assertTrue('Log in' in response.content)

        # Log the user in
        c.login(username='bobsmith', password="password")

        # Check response code
        response = c.get('/admin/')
        self.assertEquals(response.status_code, 200)

        # Check 'Log out' in response
        self.assertTrue('Log out' in response.content)
```

Now, if you run `python manage.py test`, you should find that the test passes. Next, we'll test that we can log out:

```python
class AdminTest(LiveServerTestCase):
    fixtures = ['users.json']

    def test_login(self):
        # Create client
        c = Client()

        # Get login page
        response = c.get('/admin/')

        # Check response code
        self.assertEquals(response.status_code, 200)

        # Check 'Log in' in response
        self.assertTrue('Log in' in response.content)

        # Log the user in
        c.login(username='bobsmith', password="password")

        # Check response code
        response = c.get('/admin/')
        self.assertEquals(response.status_code, 200)

        # Check 'Log out' in response
        self.assertTrue('Log out' in response.content)

    def test_logout(self):
        # Create client
        c = Client()

        # Log in
        c.login(username='bobsmith', password="password")

        # Check response code
        response = c.get('/admin/')
        self.assertEquals(response.status_code, 200)

        # Check 'Log out' in response
        self.assertTrue('Log out' in response.content)

        # Log out
        c.logout()

        # Check response code
        response = c.get('/admin/')
        self.assertEquals(response.status_code, 200)

        # Check 'Log in' in response
        self.assertTrue('Log in' in response.content)
```

This test works along very similar lines. We log in, verify that 'Log out' is in the response, then we log out, and verify that 'Log in' is in the response. Run the tests again, and they should pass. Assuming they do, let's commit our changes again:

```bash
$ git add blogengine/
$ git commit -m 'Added tests for admin auth'
```

This code is a little repetitive. We create the client twice, when we could do so only once. Amend the AdminTest class as follows:

```python
class AdminTest(LiveServerTestCase):
    fixtures = ['users.json']

    def setUp(self):
        self.client = Client()

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

```

The `setUp()` method is automatically run when the test runs, and ensures we only need to start up the client once. Run your tests to make sure they pass, then commit your changes:

```bash
$ git add blogengine/
$ git commit -m 'Refactored admin test'
```

Now, we'll implement a test for creating a new post. The admin interface implements URLs for creating new instances of a model in a consistent format of `/admin/app_name/model_name/add/`, so the URL for adding a new post will be `/admin/blogengine/post/add/`.

Add this method to the AdminTest class:

```python
    def test_create_post(self):
        # Log in
        self.client.login(username='bobsmith', password="password")

        # Check response code
        response = self.client.get('/admin/blogengine/post/add/')
        self.assertEquals(response.status_code, 200)
```

Try running it and this will fail, because we haven't registered the Post model in the Django admin. So we need to do that. To do so, open a new file at `blogengine/admin.py` and add the following code:

```python
import models
from django.contrib import admin

admin.site.register(models.Post)
```

Now, run `python manage.py test` and the test should pass. If you want to confirm that the post model appears in the admin, run `python manage.py runserver` and click [here](http://127.0.0.1:8000/admin/).

So now we can reach the page for adding a post, but we haven't yet tested that we can submit one. Let's remedy that:

```python
    def test_create_post(self):
        # Log in
        self.client.login(username='bobsmith', password="password")

        # Check response code
        response = self.client.get('/admin/blogengine/post/add/')
        self.assertEquals(response.status_code, 200)

        # Create the new post
        response = self.client.post('/admin/blogengine/post/add/', {
            'title': 'My first post',
            'text': 'This is my first post',
            'pub_date_0': '2013-12-28',
            'pub_date_1': '22:00:04'
        },
        follow=True
        )
        self.assertEquals(response.status_code, 200)

        # Check added successfully
        self.assertTrue('added successfully' in response.content)

        # Check new post now in database
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)
```

Here we submit the new post via HTTP POST, with all the data passed through. This mirrors the form created by the Django admin interface - if you take a look at the HTML generated by the admin, you'll see that the inputs are given names that match these. Note that the `pub_date` field, because it represents a datetime object, is split up into a separate date and time field. Also note the parameter `follow=True` - this denotes that the test client should follow any HTTP redirect.

We confirm that the POST request responded with a 200 code, denoting success. We also confirm that the response included the phrase 'added successfully'. Finally we confirm that there is now a single Post object in the database. Don't worry about any existing content - Django creates a dedicated test database and destroys it after the tests are done, so you can be sure that no posts are present unless you explicitly load them from a fixture.

We can now test creating a post, but we also need to ensure we can test editing and deleting them. First we'll add a test for editing posts:

```python
    def test_edit_post(self):
        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.pub_date = timezone.now()
        post.save()

        # Log in
        self.client.login(username='bobsmith', password="password")

        # Edit the post
        response = self.client.post('/admin/blogengine/post/1/', {
            'title': 'My second post',
            'text': 'This is my second blog post',
            'pub_date_0': '2013-12-28',
            'pub_date_1': '22:00:04'
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
```

Here we create a new blog post, then verify we can edit it by resubmitting it with different values, and checking that we get the expected response, and that the data in the database has been updated. Run `python manage.py test`, and this should pass.

Finally, we'll set up a test for deleting posts:

```python
    def test_delete_post(self):
        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.pub_date = timezone.now()
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
```

Again, this is pretty similar to what we did before. We create a new post, verify that it is the sole post in the database, and log into the admin. Then we delete the post via the admin, and confirm that the admin interface confirmed it has been deleted, and the post is gone from the database.

I think it's now time to commit again:

```bash
$ git add blogengine/
$ git commit -m 'Post admin tests in place'
```

So we now know that we can create, edit and delete posts, and we have tests in place to confirm this. So our next task is to be able to display our posts.

For now, to keep things simple, we're only going to implement the index view - in other words, all the posts in reverse chronological order. We'll use Django's generic views to keep things really easy.

Django's generic views are another really handy feature. As mentioned earlier, a view is a function or class that describes how a specific route should render an object. Now, there are many tasks that recur in web development. For instance, many web pages you may have seen may be a list of objects - in this case, the index page for a blog is a list of blog posts. For that reason, Django has the ListView generic view, which makes it easy to render a list of objects.

Now, like before, we want to have a test in place. Open up `blogengine/tests.py` and add the following class at the end of the file:

```python
class PostViewTest(LiveServerTestCase):
    def setUp(self):
        self.client = Client()

    def test_index(self):
        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.pub_date = timezone.now()
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
        self.assertTrue(post.text in response.content)

        # Check the post date is in the response
        self.assertTrue(str(post.pub_date.year) in response.content)
        self.assertTrue(post.pub_date.strftime('%b') in response.content)
        self.assertTrue(str(post.pub_date.day) in response.content)
```

Here we create the post, and assert that it is the sole post object. We then fetch the index page, and assert that the HTTP status code is 200 (ie. the page exists and is returned). We then verify that the response contains the post title, text and publication date.

Note that for the month, we need to do a bit of jiggery-pokery to get the month name. By default Django will return short month names (eg Jan, Feb etc), but Python stores months as numbers, so we need to format it as a short month name using `%b`.

If you run this, you will get an error because the index route isn't implemented. So let's fix that. Open up the existing `django_tutorial_blog_ng/urls.py` file and amend it to look like this:

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
    url(r'^.*$', include('blogengine.urls')),
)
```

Then, create a new file at `blogengine/urls.py` and edit it as follows:

```python
from django.conf.urls import patterns, url
from django.views.generic import ListView
from blogengine.models import Post

urlpatterns = patterns('',
    # Index
    url('^$', ListView.as_view(
        model=Post,
        )),
)
```

A little explanation is called for. The project has its own `urls.py` file that handles routing throughout the project. However, because Django encourages you to make your apps reusable, we want to keep the routes in the individual apps as far as possible. So, in the project file, we include the `blogengine/urls.py` file.

In the app-specific `urls.py`, we import the Post model and the ListView generic view. We then define a route for the index page - the regular expression `^$` will match only an empty string, so that page will be the index. For this route, we then call the `as_view()` method of the ListView object, and set the model as Post.

Now, if you either run the tests, or run the development server and visit [the index page](http://127.0.0.1:8000), you'll see that it isn't working yet - you should see the error `TemplateDoesNotExist: blogengine/post_list.html`. This tells us that we need to create a template called `blogengine/post_list.html`, so let's do that. First of all, add the following at the end of `django_tutorial_blog_ng/settings.py`:

```python

# Template directory
TEMPLATE_DIRS = [os.path.join(BASE_DIR, 'templates')]
```

Next, create the folders for the templates, and a blank `post_list.html` file:

```bash
$ mkdir templates
$ mkdir templates/blogengine
$ touch templates/blogengine/post_list.html
```

Now, run your tests again, and you'll see that the template now exists, but a new error is showing up:

```bash
Creating test database for alias 'default'...
......F
======================================================================
FAIL: test_index (blogengine.tests.PostViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 189, in test_index
    self.assertTrue(post.title in response.content)
AssertionError: False is not true

----------------------------------------------------------------------
Ran 7 tests in 2.162s

FAILED (failures=1)
Destroying test database for alias 'default'...
```

To fix this, we make sure the template shows the data we want. Open up `templates/blogengine/post_list.html` and enter the following:

```django
<html>
    <head>
        <title>My Django Blog</title>
    </head>
    <body>
        {% for post in object_list %}
        <h1>{{ post.title }}</h1>
        <h3>{{ post.pub_date }}</h3>
        {{ post.text }}
        {% endfor %}
    </body>
</html>
```

This is only a very basic template, and we'll expand upon it in future.

With that done, you can run `python manage.py test`, and it should pass. Well done! Don't forget to commit your changes:

```bash
$ git add django_tutorial_blog_ng/ templates/ blogengine/
$ git commit -m 'Implemented list view for posts'
```

And that's all for this lesson! We've done a hell of a lot in this lesson - set up our project, created a comprehensive test suite for it, and implemented the basic functionality. Next time we'll make it a bit prettier using Twitter Bootstrap, as well as implementing more of the basic functionality for the blog.

You can find the source code [on Github](https://github.com/matthewbdaly/django_tutorial_blog_ng). For your convenience, I've tagged this lesson as `lesson-1`, so you can just clone the repository and switch to the end of this lesson with the following commands:

```bash
$ git clone https://github.com/matthewbdaly/django_tutorial_blog_ng.git
$ cd django_tutorial_blog_ng
$ git checkout lesson-1
```

That way, you can easily check that what you've done matches up with the repository. Future lessons will be similarly tagged to make them easy to navigate.
