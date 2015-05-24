---
date: '2012-02-24 16:17:10'
layout: post
slug: yet-another-tutorial-for-building-a-blog-using-python-and-django-part-1
status: publish
title: Yet another tutorial for building a blog using Python and Django - Part 1
wordpress_id: '698'
categories:
- django
- programming
- python
- webdevelopment
---

While I'm extremely fond of Perl for quick hacks and scripts, and have used PHP a fair amount for web development purposes (both on its own and with the CodeIgniter framework), there is one language I love above all others, and that's Python. I've found that, when compared to PHP or Perl, at least for me, it's a lot easier to "get into the zone" when programming in Python, the code I produce tends to be a lot more readable and easier to follow, and the interactive interpreter makes it really easy to figure out what's going on in a way that just isn't possible with PHP or Perl. Also, Python was always designed to be an object-oriented language, and IMHO has a better object model than either Perl or PHP.

While it would be fair to say that Python doesn't have a single web development framework that monopolises developer's attention the way Rails does for Ruby programmers, Django is undoubtedly the best-known Python framework. It's solid, easy to use, and has the best documentation of any web development framework I've ever seen (don't get me wrong, CodeIgniter in particular has very good documentation, but Django's is exceptional).

In this tutorial, we're going to build a very simple blogging engine using Django. In its initial stages, it will be an extremely simple web app - we won't bother with comments, tags, categories or multiple users , or any of the other niceties of a fully-fledged blogging engine. Instead, we will build a very basic Tumblr-style blogging engine, capable of publishing blog posts and very little else. As time goes by, we can add further functionality to this and build it up into a more capable blogging solution.

So, let's get started. Go to the [Django project website](https://www.djangoproject.com/) and download the latest release (NOTE: as at time of writing this was 1.3.1, but we're now up to 1.4.3 as at 14 January 2013, and some changes have been made to Django's structure). Follow the installation instructions given there, and you should be ready to go. Note that from here on, I'm assuming you're using a Unix-like operating system such as a Linux distro or Mac OS X - if you're using Windows, there's a few extra steps you'll have to take, such as installing Python, and some of the commands you use may be different.

Once Django is installed, find a suitable folder in which to store your new Django project (perhaps a Projects folder in your home directory might be a good place). Note that Django includes its own development server, so you don't need to install a full LAMP stack like you would if you were developing in PHP. Then, from the folder you want to store your project in, run the following command:

```bash
django-admin.py startproject DjangoBlog
```

This will create a brand-new directory containing all the files you need for your new Django project. If you now cd into this directory, you should see manage.py, as well as a folder called DjangoBlog containing the files `__init__.py`, `settings.py` and `urls.py`.

Let's go through what these files do. First of all, there's __init__.py - don't worry about this, it's a blank file and you don't need to touch it.

Next, manage.py contains a number of extremely useful commands that you will find handy when using Django. You're unlikely to need to edit it, but you'll use it a lot.

Next, settings.py is the settings for the web app you're building. It will specify details like what Django applications you're using, what timezone you're in, your database connection details and so on. You'll need to edit this, so open it up in your favourite text editor.

Look for a line that reads "DATABASES". Under here you'll notice the following line:

```python
      'ENGINE': 'django.db.backends.', # Add 'postgresql_psycopg2',     'postgresql', 'mysql', 'sqlite3' or 'oracle'.
```

You can use pretty much any relational database you like with Django, and because it uses its own Object-Relational Mapping (ORM), it generates the SQL needed for you, taking into account any quirks in that particular database engine. It therefore doesn't really matter what database you use, and it's easy to swap them out. For development purposes, we'll use SQLite as it ships with Python and requires less configuration, so change this line to read as follows:

```python
      'ENGINE': 'django.db.backends.sqlite3', # Add 'postgresql_psycopg2',     'postgresql', 'mysql', 'sqlite3' or 'oracle'.
```

Next you'll see this line:

```python
      'NAME': '',                      # Or path to database file if using sqlite3.
```

It really doesn't matter what you call the file. I tend to call mine backend.db, as follows:

```python
        'NAME': 'backend.db',                      # Or path to database file if using sqlite3.
```

If you keep going down, you'll notice TIME_ZONE and LANGUAGE_CODE. You may wish to change these from their default settings (I change mine to Europe/London for TIME_ZONE and en-gb for LANGUAGE_CODE).

Even further down, you'll notice the INSTALLED_APPS section. Django distinguishes between a project and an application - while a project will normally be a single website, an application will be a set of functionality within that website. For instance, our blog will be a single application, but we could reuse that application on multiple projects. Django also includes a number of applications out of the box - for instance, the flatpages and admin applications can be used together if you wanted to use Django to build a simple CMS, without having to build a new application at all.

For now, we don't need to add any new applications, so let's save the changes we've made to settings.py and move on to urls.py. This handles directing any incoming HTTP requests to the appropriate place to deal with them. It uses simple regular expressions to evaluate the incoming requests, and maps them to specific view functions. Note that it already includes URLs for the admin functionality, but these are commented out by default.

Exit urls.py and head back to the main directory for your project. Now, we need to test that everything works OK. Run the following command:

```bash
python manage.py runserver
```

Remember I said that the manage.py script had a lot of useful functions? This is one of them. Django has its own simple web server so you don't have to faff around setting up Apache just for development purposes, and this launches it. If you go to http://127.0.0.1:8000, you should see a screen telling you that Django is running.

Now, you can stop the server for now using <kbd>Ctrl-C</kbd>, and we'll start work on your new app. Run the following command to create your new app:

```bash
python manage.py startapp blogengine
```

Again, note that you used manage.py to do this. There should now be a directory called blogengine in your project. Move into it, and you should find that it contains four files - __init__.py, models.py, tests.py and views.py. Again, __init__.py can be safely ignored, and tests.py can also be left alone, but models.py and views.py deserve closer examination.

If you haven't used an MVC framework before, then you'll need this explaining. MVC stands for Model-View-Controller, and it describes a method of logically separating out code for a web application to make it easier to work with. Models represent the data held by the application, views represent what end-users see of the application, and controllers represent the logic that ties the two together.

Django uses a slightly unusual interpretation of MVC. The models work exactly the same as they do in other frameworks, but the logic is handled by the view, and the presentation is handled by templates. Compared to more conventional MVC frameworks such as CodeIgniter, Django's views are more like controllers, and its templates are more like views. Django is therefore often described as an MTV framework (Model-Template-View), instead of an MVC one.

So, to create our blog, we first need to create a model to describe the data. Edit models.py so it looks like the following:

```python
from django.db import models

# Create your models here.
class Post(models.Model):
    title = models.CharField(max_length=200)
    pub_date = models.DateTimeField()
    text = models.TextField()

    def __unicode__(self):
        return self.title
```

To activate our new app, we also need to include it under INSTALLED_APPS in settings.py:

```python
    'blogengine',
```
In Django, you create your models as Python classes, which makes it very easy to grasp. Here, a blog post is an object, and it has a title, a publication date, and some text. Note that Post here inherits from models.Model, and has specific types of field that map to field types in the database table. For instance, models.CharField obviously maps to a VARCHAR field in the database, and TextField maps to a TEXT field. You can actually see the SQL that will generate the database table for this model by returning to the project's main directory and running python manage.py sqlall blogengine:

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

Note the "id" field. You didn't add this - by default, Django will create an id field in any new table, and will make this the primary key in that database table. You can, however, override this behaviour if you wish. Here it's exactly what we want so we'll stick with it for now.

Also note the __unicode__ method. This represents a string that describes that object. Here the title of a blog post seems the most logical way of describing it, so we return the object's title.

Now that we've got our model set up, how do we get the information into it? For a blog post, all of the information will be submitted by the user, so we need to set up some kind of administrative interface. Fortunately, one of Django's killer features is the admin interface that ships with it. This makes it really quick and easy to get certain kinds of sites up and running.

First of all, we need to activate the admin application. Head up to settings.py and uncomment the line that reads:

```python
    'django.contrib.admin',
```

Save it, then head for urls.py and uncomment the following lines:

```python
# from django.contrib import admin
# admin.autodiscover()
```

And:
```python
   # url(r'^admin/', include(admin.site.urls)),
```

Now, in order for the admin interface to be able to set up new blog posts, you need to also register it. In the blogengine directory containing your app, create a new file called admin.py, and fill it out with the following code:

```python
import models
from django.contrib import admin

admin.site.register(models.Post)
```

Once that's done, return to the project directory and run this command to create the database tables you need:

```bash
python manage.py syncdb
```

You'll get asked for some information to set up your user account - remember it as you'll need it to log into the admin interface. Once that's done, run python manage.py runserver again, and return to http://127.0.0.1:8000 again. You should be confronted with a 404 page - that's fine, that's exactly what we should be seeing. You'll note that the message states that Django tried the ^admin/ path without success - what this means is that this is the only URL pattern in urls.py at the moment, and the path you entered didn't match this.

If you change the URL in the browser to http://127.0.0.1:8000/admin, you should get a login screen. Enter the username and password you set when you ran syncdb and click Log in. You should now see Django's admin interface, with Posts available, and an Add and Change dialogue visible next to it. If you want to add a few blog posts, just to have some data to work with, go ahead. Note that for the Date and Time dialogues, Django automatically adds the Today and Now shortcuts.

So, our model is now sorted and we have some data in the web app. The next step is to write our views. You'll notice that the blogengine app contains a file called views.py - open this up and enter the following code:

```python
# Create your views here.
from django.shortcuts import render_to_response
from blogengine.models import Post

def getRecentPosts(request):
    # Get all blog posts
    posts = Post.objects.all()

    # Sort posts into chronological order
    sorted_posts = posts.order_by('-pub_date')
    
    # Display all the posts
    return render_to_response('posts.html', { 'posts':sorted_posts})
```

Let's go through this code. The first line imports the render_to_response method, which is used to render a template. The second line imports the Post model.

Next, we define the getRecentPosts view. For simplicity's sake, we aren't going to bother about pagination for the moment, so we'll just get all the posts. The view is written as a Python function, and we pass it the request object as the sole parameter.

Next, we get all of the Post objects, using Post.objects.all(), and assign it to a list called posts. As we want these to be in reverse chronological order, we then reorder them by pub_date (note the - sign at the beginning to denote reverse order) and assign the result to sorted_posts. Finally, we load the posts.html template and pass through sorted_posts as the value in a dictionary called posts.

With our view done, we now need to produce a template for it. Head back up to your main project directory and create a new folder called templates. Then, go into settings.py and find the line marked TEMPLATE_DIRS. Inside the brackets, underneath the comments, add the full, absolute path to the new templates folder, as in this example:

```bash
  "/Users/matthewdaly/Development/Python/Django/blog/templates"
```

You'll have to change this to the full, absolute path on your machine. This will tell Django to look for the templates in that folder. Now, go into templates, and create a new file called posts.html. Enter the following text into it:

```django
<html>
    <head>
        <title>My Django Blog</title>
    </head>
    <body>
        {% for post in posts %}
        <h1>{{ post.title }}</h1>
        <h3>{{ post.pub_date }}</h3>
        {{ post.text }}
        {% endfor %}
    </body>
</html>
```

Most of this is just plain old HTML, but you'll notice that {% %} denotes tags that can include some logic (such as a for loop in this case), and {{ }} denotes a variable. Remember that in the view we passed through a dictionary containing all of the Post objects, and here we're iterating through all of those post objects, outputting their title, publication date and text content.

With this done, we need to configure the routes to call the getRecentPosts view when someone visits the home page. Open urls.py again and add the following code underneath where you enabled the admin, but still inside the parentheses:

```python
    # Home page
    url(r'', 'blogengine.views.getRecentPosts'),
```

Now, this is a very simple regular expression. Here, this is our default page, so we leave the single quotes after the r empty. We then specify that this URL should be handled by the getRecentPosts function, inside views.py, in the blogengine application.

Save that, and start up the development server again with python manage.py runserver. Then, if you haven't already added a few test posts, do so via the admin interface. Then open http://127.0.0.1:8000, and you should see your blog posts.

So, we now have the beginnings of a blogging application! We'll leave it here for now, and will go on to add functionality like viewing individual posts and pagination later. We'll also look into adding further functionality to our blog, such as supporting multiple authors, tagging posts, and adding flat pages.
