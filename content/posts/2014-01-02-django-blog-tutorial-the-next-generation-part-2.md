---
layout: post
title: "Django blog tutorial - the next generation - part 2"
date: 2014-01-02 11:28:48 +0000
comments: true
categories: 
- python
- django
- tdd
---

Welcome back! In this lesson, we'll use Twitter Bootstrap to make our blog look nicer, and we'll implement individual pages for each post.

Now, before we get started, don't forget to switch into your virtualenv. From within the directory for the project, run the following command:

```bash
$ source venv/bin/activate
```

If you haven't used Bootstrap before, you're in for a treat. With Bootstrap, it's easy to make a good-looking website quickly that's responsive and mobile-friendly. We'll also use HTML5 Boilerplate to get a basic HTML template in place.

Now, to install these easily, we'll use Bower, which requires [Node.js](http://nodejs.org/). Install Node.js first. On most Linux distros, you'll also need to set `NODE_PATH`, which can be done by pasting the following into your `.bashrc`:

```bash
NODE_PATH="/usr/local/lib/node_modules"
```

With that done, run the following command to install Bower:

```bash
$ sudo npm install -g bower
```

Next we need to create a Bower config. First, create the folder `blogengine/static`. Then create a new file called `.bowerrc` and paste in the following content:

```json
{
    "directory": "blogengine/static/bower_components"
}
```

This tells Bower where it should put downloaded libraries. Next, run the following command to gener Bower:

```bash
$ bower init
```

Answer all the questions it asks you - for those with defaults, these should be fine, and everything else should be easy enough. Next, run the following command to install Bootstrap and HTML5 Boilerplate:

```bash
$ bower install bootstrap html5-boilerplate --save
```

Note that as jQuery is a dependency of Bootstrap, it will also be installed automatically. Now, we need to keep our Bower-installed files out of version control - the `bower.json` file keeps track of them for us. So add the following to your .gitignore file:

```bash
blogengine/static/bower_components/
```

All done? Let's commit our changes:

```bash
$ git add .gitignore .bowerrc bower.json
$ git commit -m 'Added Bower config'
```

Now, let's make our template nicer. Django's templating system is very powerful and lets one template inherit from another. We're going to create a base template, using HTML5 Boilerplate as a starting point, that all of our web-facing pages will use. First, create a directory to hold the base template:

```bash
$ mkdir templates/blogengine/includes
```

Then copy the `index.html` file from HTML5 Boilerplate to this directory as `base.html`:

```bash
$ cp blogengine/static/bower_components/html5-boilerplate/index.html templates/blogengine/includes/base.html
```

Now amend this file to look like this:

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

        <!-- Place favicon.ico and apple-touch-icon.png in the root directory -->

        {% load staticfiles %}
        <link rel="stylesheet" href="{% static 'bower_components/html5-boilerplate/css/normalize.css' %}">
        <link rel="stylesheet" href="{% static 'bower_components/html5-boilerplate/css/main.css' %}">
        <link rel="stylesheet" href="{% static 'bower_components/bootstrap/dist/css/bootstrap.min.css' %}">
        <link rel="stylesheet" href="{% static 'bower_components/bootstrap/dist/css/bootstrap-theme.min.css' %}">
        <script src="{% static 'bower_components/html5-boilerplate/js/vendor/modernizr-2.6.2.min.js' %}"></script>
    </head>
    <body>
        <!--[if lt IE 7]>
            <p class="browsehappy">You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> to improve your experience.</p>
        <![endif]-->

        <!-- Add your site or application content here -->
        {% block content %}{% endblock %}

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

Note the following:

* We need to use `{% load staticfiles %}` to be able to load any static files.
* We use the `{% static %}` template tag to load static files such as CSS and HTML
* We define blocks called `title` and `content`. Any template that extends this one can override whatever is inside this template.

Please note that HTML5 Boilerplate may conceivable change in future, so bear in mind that all you really need to do is load the staticfiles app, use the `static` tag for any static files that need to be loaded, and define the blocks in the appropriate places.

Next, let's amend our existing template to inherit from this one:

```html
{% extends "blogengine/includes/base.html" %}

    {% block content %}
        {% for post in object_list %}
        <h1>{{ post.title }}</h1>
        <h3>{{ post.pub_date }}</h3>
        {{ post.text }}
        {% endfor %}
    {% endblock %}
```

Now fire up the server with `python manage.py runserver` and check everything is working OK. You should see that your new base template is now in use and the CSS and JS files are being loaded correctly. Let's commit again:

```bash
$ git add templates/
$ git commit -m 'Now use Bootstrap and HTML5 Boilerplate for templates'
```

Now, let's use Bootstrap to style our blog a little. First we'll add a navigation bar at the top of our blog. Edit the base template as follows:

```html
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
```

Note the footer copyright section. Here we output the current year using `now`. Also note the addition of the header block. This will let us override the page header if necessary.

We'll also wrap the posts in a div:

```html
{% extends "blogengine/includes/base.html" %}

    {% block content %}
        {% for post in object_list %}
        <div class="post">
        <h1>{{ post.title }}</h1>
        <h3>{{ post.pub_date }}</h3>
        {{ post.text }}
        </div>
        {% endfor %}
    {% endblock %}
```

Let's commit our changes:

```bash
$ git add templates/
$ git commit -m 'Amended templates'
```

Formatting our content
----------------------

As it stands right now, we can't do much to format our posts. It is possible to include HTML in our posts with Django, but by default it will strip it out. Also, we don't want users to have to write HTML manually - we want to make our blog user friendly!

There are two possible approaches. One is to embed a rich text editor like TinyMCE in the admin and use that for editing the files, but I've found things like that to be cumbersome. The alternative is to use some other form of lightweight markup, and that's the approach we'll take here. We're going to use Markdown for editing our posts.

Django has actually dropped support for Markdown, but it's not hard to implement your own version. First, install Markdown and add it to your `requirements.txt`:

```bash
$ pip install markdown
$ pip freeze > requirements.txt
```

Now, we shouldn't write any production code before writing a test, so let's amend our existing post test to check to see that Markdown is working as expected:

```python
class PostViewTest(LiveServerTestCase):
    def setUp(self):
        self.client = Client()

    def test_index(self):
        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is [my first blog post](http://127.0.0.1:8000/)'
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
        self.assertTrue(markdown.markdown(post.text) in response.content)

        # Check the post date is in the response
        self.assertTrue(str(post.pub_date.year) in response.content)
        self.assertTrue(post.pub_date.strftime('%b') in response.content)
        self.assertTrue(str(post.pub_date.day) in response.content)

        # Check the link is marked up properly
        self.assertTrue('<a href="http://127.0.0.1:8000/">my first blog post</a>' in response.content)
```

You'll also need to add the following at the top:

```python
import markdown
```

What we do here is we convert our post text to include a link using Markdown. We also need to render that post in markdown within the test so that what we have in the test matches what will be produced - otherwise our test will be broken. We also check that the link is marked up correctly.

Save the file and run the tests - they should fail. Now, create the following directory and file:

```bash
$ mkdir blogengine/templatetags
$ touch blogengine/templatetags/__init__.py
```

Note that the `__init__.py` file is meant to be blank.

Then create the following file and edit it to look like this:

```python
import markdown

from django import template
from django.template.defaultfilters import stringfilter
from django.utils.encoding import force_unicode
from django.utils.safestring import mark_safe

register = template.Library()

@register.filter(is_safe=True)
@stringfilter
def custom_markdown(value):
    extensions = ["nl2br", ]

    return mark_safe(markdown.markdown(force_unicode(value),
                                       extensions,
                                       safe_mode=True,
                                       enable_attributes=False))
```

Then just amend the post list template to use it:

```html
{% extends "blogengine/includes/base.html" %}

    {% load custom_markdown %}

    {% block content %}
        {% for post in object_list %}
        <div class="post">
        <h1>{{ post.title }}</h1>
        <h3>{{ post.pub_date }}</h3>
        {{ post.text|custom_markdown }}
        </div>
        {% endfor %}
    {% endblock %}
```

It's that easy to use a custom markup system with your blog!

Let's commit the changes:

```bash
$ git add requirements.txt templates/ blogengine/
$ git commit -m 'Added Markdown support'
```

Pagination
----------

As at right now, all of our posts are displayed on the index page. We want to fix that by implementing pagination. Fortunately, that's very easy for us because we're using Django's generic views. Go into `blogengine/urls.py` and amend it as follows:

```python
from django.conf.urls import patterns, url
from django.views.generic import ListView
from blogengine.models import Post

urlpatterns = patterns('',
    # Index
    url(r'^(?P<page>\d+)?/?$', ListView.as_view(
        model=Post,
        paginate_by=5,
        )),
)
```

That will automatically paginate our posts by 5 - feel free to change the value of `paginate_by` if you wish. However, we need to place the links in our template as well:

```html
{% extends "blogengine/includes/base.html" %}

    {% load custom_markdown %}

    {% block content %}
        {% for post in object_list %}
        <div class="post">
        <h1>{{ post.title }}</h1>
        <h3>{{ post.pub_date }}</h3>
        {{ post.text|custom_markdown }}
        </div>
        {% endfor %}

        {% if page_obj.has_previous %}
        <a href="/{{ page_obj.previous_page_number }}/">Previous Page</a>
        {% endif %}
        {% if page_obj.has_next %}
        <a href="/{{ page_obj.next_page_number }}/">Next Page</a>
        {% endif %}

    {% endblock %}
```

Try adding a few more blog posts, and you'll see the pagination links. But give them a try, and they won't work. Why not? Well, as it turns out there was a bug in the project-wide `urls.py` file (my bad!). Let's fix that:

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
)
```

If you try again, you'll see that the `blogengine` app now happily deals with the paginated posts. Let's commit our changes:

```bash
$ git add blogengine/ django_tutorial_blog_ng/ templates/
$ git commit -m 'Implemented pagination'
```

Viewing individual posts
------------------------

As our last task for today, we'll implement individual pages for each post. We want each post to have a nice, friendly URL that is as human-readable as possible, and also includes the date the post was created.

First of all, we'll implement our test for it, however:

```python
    def test_post_page(self):
        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is [my first blog post](http://127.0.0.1:8000/)'
        post.pub_date = timezone.now()
        post.save()

        # Check new post saved
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)
        only_post = all_posts[0]
        self.assertEquals(only_post, post)

        # Get the post URL
        post_url = only_post.get_absolute_url()

        # Fetch the post
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
```

Add this method to the `PostViewTest` class, after `test_index`. It's very similar to `test_index`, since it's testing much the same content. However, not that we fetch the post-specific URL using the method `get_absolute_url`, and we then fetch that page.

Now, if you run the test, it will fail because `get_absolute_url` isn't implemented. It's often a good idea to have a `get_absolute_url` method for your models, which defines a single URL scheme for that type of object. So let's create one. However, to implement our URL scheme we need to make some changes. Right now we have the date, but we don't have a text string we can use, known in Django as a *slug*. So we'll add a slug field, which will be prepopulated based on the post title. Edit your model as follows:

```python
from django.db import models

# Create your models here.
class Post(models.Model):
    title = models.CharField(max_length=200)
    pub_date = models.DateTimeField()
    text = models.TextField()
    slug = models.SlugField(max_length=40, unique=True)

    def get_absolute_url(self):
        return "/%s/%s/%s/" % (self.pub_date.year, self.pub_date.month, self.slug)

    def __unicode__(self):
        return self.title

    class Meta:
        ordering = ["-pub_date"]
```

Here we've added a slug field to the model, as well as implementing our `get_absolute_url` method. Note we've limited the date to year and month, but you can include days if you wish.

While we're in here, we've also implemented the `__unicode__` method. Essentially, this sets how Django describes the object in the admin - in this case, the post title is a logical way of describing that `Post` object, so it returns the post title.

We've also added the class Meta, with the ordering field. This tells Django that by default any list of posts should return them ordered by `pub_date` in reverse - in other words, latest first.

To have the slug filled in automatically, we need to customise the admin interface a little as well:

```python
import models
from django.contrib import admin

class PostAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("title",)}

admin.site.register(models.Post, PostAdmin)
```

Now, I recommend at this stage going into the admin and deleting all of your posts, because otherwise you'll have problems in migrating them. The issue is that each slug is compulsory and must be unique, and it's not practical to use South to automatically generate new slugs from the title on the fly, so by deleting them at this stage you'll avoid problems. Once that's done, run this command:

```bash
$ python manage.py schemamigration --auto blogengine
```

You'll be prompted to specify a one-off default value - enter any string you like, such as "blah". Then run the migration:

```bash
$ python manage.py migrate
```

Let's run our tests now:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test
Creating test database for alias 'default'...
.F.F...F
======================================================================
FAIL: test_create_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 103, in test_create_post
    self.assertTrue('added successfully' in response.content)
AssertionError: False is not true

======================================================================
FAIL: test_edit_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 132, in test_edit_post
    self.assertTrue('changed successfully' in response.content)
AssertionError: False is not true

======================================================================
FAIL: test_post_page (blogengine.tests.PostViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 222, in test_post_page
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

----------------------------------------------------------------------
Ran 8 tests in 2.180s

FAILED (failures=3)
Destroying test database for alias 'default'...
```

Whoops! Our tests are broken, because the slug field isn't being filled in. If you take a look at the page for adding a post, you'll notice that the slug is filled in using JavaScript, so our test fails because the test client doesn't interpret JavaScript. So in the tests we have to fill in the slug field manually.

Also, for the unit tests, the slug attribute isn't being created at all, so it can't be saved. Let's remedy that. First, edit the `test_create_post` method of `PostTest`:

```python
class PostTest(TestCase):
    def test_create_post(self):
        # Create the post
        post = Post()

        # Set the attributes
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.slug = 'my-first-post'
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
        self.assertEquals(only_post.slug, 'my-first-post')
        self.assertEquals(only_post.pub_date.day, post.pub_date.day)
        self.assertEquals(only_post.pub_date.month, post.pub_date.month)
        self.assertEquals(only_post.pub_date.year, post.pub_date.year)
        self.assertEquals(only_post.pub_date.hour, post.pub_date.hour)
        self.assertEquals(only_post.pub_date.minute, post.pub_date.minute)
        self.assertEquals(only_post.pub_date.second, post.pub_date.second)
```

Next, let's amend `AdminTest`:

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
        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.slug = 'my-first-post'
        post.pub_date = timezone.now()
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
        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.slug = 'my-first-post'
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

And `PostViewTest`:

```python
class PostViewTest(LiveServerTestCase):
    def setUp(self):
        self.client = Client()

    def test_index(self):
        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is [my first blog post](http://127.0.0.1:8000/)'
        post.slug = 'my-first-post'
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
        self.assertTrue(markdown.markdown(post.text) in response.content)

        # Check the post date is in the response
        self.assertTrue(str(post.pub_date.year) in response.content)
        self.assertTrue(post.pub_date.strftime('%b') in response.content)
        self.assertTrue(str(post.pub_date.day) in response.content)

        # Check the link is marked up properly
        self.assertTrue('<a href="http://127.0.0.1:8000/">my first blog post</a>' in response.content)

    def test_post_page(self):
        # Create the post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is [my first blog post](http://127.0.0.1:8000/)'
        post.slug = 'my-first-post'
        post.pub_date = timezone.now()
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
```

What we're doing here is that every time we create a Post object programmatically, we add the `post.slug` atttribute to it. Also, when submitting a post via the admin, we pass the `slug` parameter via HTTP POST, thus emulating how a form would submit this data.

If you run the tests again, you'll see that `test_post_page` still fails. This is because we haven't yet up the URLs, templates and views to do so. Let's fix that. We'll use another generic view, called a DetailView, to display the posts. Amend `blogengine/urls.py` as follows:

```python
rom django.conf.urls import patterns, url
from django.views.generic import ListView, DetailView
from blogengine.models import Post

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
)
```

Running our tests again will still fail, but now because the template `post_detail.html` has not been found. So let's create it:

```html
{% extends "blogengine/includes/base.html" %}

    {% load custom_markdown %}

    {% block content %}
        <div class="post">
        <h1>{{ object.title }}</h1>
        <h3>{{ object.pub_date }}</h3>
        {{ object.text|custom_markdown }}
        </div>

{% endblock %}
```

If you run your tests again, they should now pass. However, we still need to provide a hyperlink from each post in the index to the post page, so let's do that:

```html
{% extends "blogengine/includes/base.html" %}

    {% load custom_markdown %}

    {% block content %}
        {% for post in object_list %}
        <div class="post">
        <h1><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h1>
        <h3>{{ post.pub_date }}</h3>
        {{ post.text|custom_markdown }}
        </div>
        {% endfor %}

        {% if page_obj.has_previous %}
        <a href="/{{ page_obj.previous_page_number }}/">Previous Page</a>
        {% endif %}
        {% if page_obj.has_next %}
        <a href="/{{ page_obj.next_page_number }}/">Next Page</a>
        {% endif %}

    {% endblock %}
```

And that's all for today! We now have individual post pages, we've styled our blog a bit, and we've implemented Markdown support. All that remains is to commit our changes:

```bash
$ git add blogengine/ templates/
$ git commit -m 'Implemented post pages'
```

As before, I've tagged the final commit with 'lesson-2', so if you're following along, you can switch to this point with `git checkout lesson-2`.

Next time we'll add support for flat pages and multiple authors, as well as adding support for comments via a third-party commenting system.
