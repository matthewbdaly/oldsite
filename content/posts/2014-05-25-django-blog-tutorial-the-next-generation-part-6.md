---
layout: post
title: "Django Blog Tutorial - the Next Generation - Part 6"
date: 2014-05-25 17:23:28 +0100
comments: true
categories: 
- python
- django
- tdd
---

Welcome back! In this tutorial we'll cover the following:

* Fixing bugs the TDD way
* Setting up syntax highlighting for code snippets
* Tidying up the front end

Apologies, but I'm holding over implementing the search and additional feeds for a future instalment - in the past I've tried to cover too much in one post and that has led to me putting them off for much too long. So this instalment and future ones are going to be shorter so I can get them out the door quicker.

Ready? Let's get started!

Fixing bugs
===========

When someone reports a bug, it's tempting to just dive straight in and start fixing it. But TDD cautions us against this practice. If we have a bug, then our tests should have caught it. If they don't, then before we fix the bug, we have to make sure we can catch it if it crops up in future by implementing a test for it, and ensuring that it fails. Once that test is in place, we can then go ahead and fix the bug, safe in the knowledge that if it should reappear in future, we will be warned when our tests run.

As it happens, we have a bug in our web app. If you activate your virtualenv in the usual way and run the development server, and then try to create a new post without adding a tag, you'll see that it fails as the tag is empty. Now, it's pretty obvious that this is because the `tags` attribute of the `Post` model cannot be blank, so we have a good idea of what we need to do to fix this. But to make sure it never occurs again, we need to implement a test first.

Add the following method to `AdminTest`:

```python
    def test_create_post_without_tag(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

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
            'category': '1'
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

This is virtually identical to our previous method for adding a post, but doesn't add a tag to the post. If you run `python manage.py jenkins`, the test should fail. Let's commit our changes:

```bash
$ git add blogengine/tests.py
$ git commit -m 'Added failing test for posts without tags'
```

Now we're in a position to fix our bug. Let's take a look at our models:

```python
class Post(models.Model):
    title = models.CharField(max_length=200)
    pub_date = models.DateTimeField()
    text = models.TextField()
    slug = models.SlugField(max_length=40, unique=True)
    author = models.ForeignKey(User)
    site = models.ForeignKey(Site)
    category = models.ForeignKey(Category, blank=True, null=True)
    tags = models.ManyToManyField(Tag)
```

If you compare `category` and `tags`, you'll immediately see that `category` has the additional parameters `blank` and `null` both set to `True`. So that's what we need to do for `tags` as well. Amend the model to look like this:

```python
class Post(models.Model):
    title = models.CharField(max_length=200)
    pub_date = models.DateTimeField()
    text = models.TextField()
    slug = models.SlugField(max_length=40, unique=True)
    author = models.ForeignKey(User)
    site = models.ForeignKey(Site)
    category = models.ForeignKey(Category, blank=True, null=True)
    tags = models.ManyToManyField(Tag, blank=True, null=True)
```

You shouldn't have to create a migration for this. Let's run our tests:

```bash
$ python manage.py jenkins --coverage-html-report=htmlcov
Creating test database for alias 'default'...
.......................
----------------------------------------------------------------------
Ran 23 tests in 7.634s

OK
Destroying test database for alias 'default'...
```

Our tests pass! So we've fixed our bug, and we've ensured that if it happens again, we'll catch it. With that done, it's time to commit:

```bash
$ git add blogengine/models.py
$ git commit -m 'Fixed a bug with the Post model'
```

**Remember**: Always make the effort to create a test to reproduce your bug before fixing it. That way, you know you can catch it in future.

Syntax highlighting
===================

This is one feature that not everyone will want to implement. If you want to be able to show code snippets on your blog, then implementing syntax highlighting is well worth your time. However, if that's not what you want to use your blog for, feel free to skip over this section.

Now, earlier in the series we implemented Markdown support. In Markdown there are two main ways to denote a code block. One is to indent the code by four spaces, while the other is to use [fenced code blocks with syntax highlighting](https://help.github.com/articles/github-flavored-markdown#syntax-highlighting). There are many flavours of Markdown available for Python, and unfortunately the one we've been using so far doesn't support fenced code blocks, so we'll be switching to one that does.

We also need to be able to generate a suitable stylesheet to highlight the code appropriately. For that, we'll be using [Pygments](http://pygments.org/). So let's first uninstall our existing implementation of Markdown:

```bash
$ pip uninstall Markdown
```

And install the new modules:

```bash
$ pip install markdown2 Pygments
```

Don't forget to record the changes:

```bash
$ pip freeze > requirements.txt
```

Now, we need to amend our Markdown template tags to use the new version of Markdown:

```python
import markdown2

from django import template
from django.template.defaultfilters import stringfilter
from django.utils.encoding import force_unicode
from django.utils.safestring import mark_safe

register = template.Library()

@register.filter(is_safe=True)
@stringfilter
def custom_markdown(value):
    extras = ["fenced-code-blocks"]

    return mark_safe(markdown2.markdown(force_unicode(value),
                                       extras = extras))
```

All we do here is change the Markdown module that gets imported, and amend how it is called. Note that we pass through the parameter `fenced-code-blocks` to enable this functionality.

If you now run the development server and create a post with some code in it (just copy the Ruby example from [here](https://help.github.com/articles/github-flavored-markdown#syntax-highlighting)), then view it on the site, you should be able to see that it's in a `<code>` block. However, it's not highlighted yet. Let's commit our changes:

```bash
$ git add requirements/txt blogengine/templatetags/custom_markdown.py
$ git commit -m 'Now use Markdown2 to allow for syntax highlighting'
```

Now, if you examine the markup for your code blocks using your browser's developer tools, you'll notice that the code is wrapped in many different spans with various classes. Pygments can generate a CSS file that uses those classes to highlight your code.

First, let's create a folder to store our CSS files in:

```bash
$ mkdir blogengine/static/css
```

Next, we'll add a blank CSS file for any other styling we may want to apply:

```bash
$ touch blogengine/static/css/main.css
```

Then, we generate our CSS file:

```bash
$ pygmentize -S default -f html > blogengine/static/css/code.css
```

We need to include our CSS files in our HTML template:

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

Now, if you run the development server and reload the page, your code will be highlighted using the default Pygments style. If you don't like it, there are plenty to choose from. Run the following command:

```bash
$ pygmentize -L styles
```

That will list the various styles available. For instance, let's say we want to try the Tango style:

```bash
$ pygmentize -S tango -f html > blogengine/static/css/code.css
```

If you like the Monokai theme in Sublime Text, there's a Pygments version of that:

```bash
$ pygmentize -S monokai -f html > blogengine/static/css/code.css
```

If you like the Solarized theme, that's not bundled with Pygments, but can be installed separately:

```bash
$ pip install pygments-style-solarized
```

Then run this for the light version:

```bash
$ pygmentize -S solarizedlight -f html > blogengine/static/css/code.css
```

And this for the dark version:

```bash
$ pygmentize -S solarizeddark -f html > blogengine/static/css/code.css
```

Pick one that you like - I'm going to go for the dark version of Solarized.

Note that this doesn't actually change the background colour of the code blocks. You will therefore need to set this manually using the CSS file we created earlier. If you're using Solarized Dark like I am, then this should set it correctly:

```css
div.codehilite pre {
    background-color: #002b36;
}
```

If you're using Solarized Light, then this should be more appropriate:

```css
div.codehilite pre {
    background-color: #fdf6e3;
}
```

Or, if you're using Monokai, black will do:

```css
div.codehilite pre {
    background-color: #000000;
}
```

With that done, let's record the additional Pygments style:

```bash
$ pip freeze > requirements.txt
```

And commit our changes:

```bash
$ git add requirements.txt blogengine/static/css/ templates/blogengine/includes/base.html
$ git commit -m 'Styled code with Solarized Dark'
```

Let's run our tests:

```bash
$ python manage.py jenkins
Creating test database for alias 'default'...
E
======================================================================
ERROR: blogengine.tests (unittest.loader.ModuleImportFailure)
----------------------------------------------------------------------
ImportError: Failed to import test module: blogengine.tests
Traceback (most recent call last):
  File "/usr/local/Cellar/python/2.7.6_1/Frameworks/Python.framework/Versions/2.7/lib/python2.7/unittest/loader.py", line 254, in _find_tests
    module = self._get_module_from_name(name)
  File "/usr/local/Cellar/python/2.7.6_1/Frameworks/Python.framework/Versions/2.7/lib/python2.7/unittest/loader.py", line 232, in _get_module_from_name
    __import__(name)
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 7, in <module>
    import markdown
ImportError: No module named markdown


----------------------------------------------------------------------
Ran 1 test in 0.001s

FAILED (errors=1)
Destroying test database for alias 'default'...
```

Whoops! We introduced an error here. If we take a look, we can see that the problem is on line 7, where we import the Markdown module. That makes sense, as we now use a different implementation of Markdown. Fortunately, in Python you can import modules with a different name, which makes this a breeze to fix. Change the line to:

```python
import markdown2 as markdown
```

Now, if you run your tests, they should pass. It's important that if a test breaks, you fix it as soon as possible and don't put it off. Let's commit these changes:

```bash
$ git add blogengine/tests.py
$ git commit -m 'Fixed a broken test'
```

Our syntax highlighting is now done! If you want to see it in action using the Solarized Dark theme, check out the copy of this blogging engine hosted [here](http://blog.shellshocked.info/).

Tidying up
==========

Now that our blog is up and running on Heroku, it could do with a bit of work on the front end to make it look a bit nicer. If you recall, we're using Bootstrap for our front end, so you may want to refer to the documentation for that to give you some ideas on how you want to style your blog.

Bootstrap has a nifty pager class for Next and Previous links, so let's apply that to our post list template:

```django
<ul class="pager">
        {% if page_obj.has_previous %}
        <li class="previous"><a href="/{{ page_obj.previous_page_number }}/">Previous Page</a></li>
        {% endif %}
        {% if page_obj.has_next %}
        <li class="next"><a href="/{{ page_obj.next_page_number }}/">Next Page</a></li>
        {% endif %}
        </ul>
```

Let's also add labels to our categories and tags. We'll also place our posts and other content inside proper columns:

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

    {% endblock %}
```

We'll also want to tidy up the layout for our individual post pages:

```django
{% extends "blogengine/includes/base.html" %}

    {% load custom_markdown %}

    {% block content %}
        <div class="post col-md-12">
        <h1>{{ object.title }}</h1>
        <h3>{{ object.pub_date }}</h3>
        {{ object.text|custom_markdown }}
        </div>
        {% if object.category %}
        <div class="col-md-12">
        <a href="{{ object.category.get_absolute_url }}"><span class="label label-primary">{{ object.category.name }}</span></a>
        </div>
        {% endif %}
        {% if object.tags %}
        <div class="col-md-12">
        {% for tag in object.tags.all %}
        <a href="{{ tag.get_absolute_url }}"><span class="label label-success">{{ tag.name }}</span></a>
        {% endfor %}
        </div>
        {% endif %}

        <div class="col-md-12">
        <h4>Comments</h4>
        <div class="fb-comments" data-href="http://{{ object.site }}{{ object.get_absolute_url }}" data-width="470" data-num-posts="10"></div>
        </div>
        </div>

    {% endblock %}
```

Time to commit our changes:

```bash
$ git add templates/blogengine/
$ git commit -m 'Tidied up post templates'
```

With that done, let's turn our attention to our base template. We'll amend the header to collapse down at smaller screen widths. This is easy to do with Bootstrap:

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

Here we've also added a link to our RSS feed in the header, and another in the page head to facilitate working with browsers that support RSS better.

Our blog's now looking much more presentable. All that remains is to commit it:

```bash
$ git add templates/blogengine/includes/base.html
$ git commit -m 'Amended base template'
```

Now we can push it to GitHub and deploy it on Heroku:

```bash
$ git push origin master
$ git push heroku master
```

And we're done! Don't forget, you can grab this lesson with `git checkout lesson-6`.

Next time, we'll cover search (I promise!).
