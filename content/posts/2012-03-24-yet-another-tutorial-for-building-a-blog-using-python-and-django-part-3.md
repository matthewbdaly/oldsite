---
date: '2012-03-24 18:23:25'
layout: post
slug: yet-another-tutorial-for-building-a-blog-using-python-and-django-part-3
status: publish
title: Yet another tutorial for building a blog using Python and Django - Part 3
wordpress_id: '758'
categories:
- django
- python
- webdevelopment
---

Welcome back! In this installment, we’ll make some changes to our URL structure for blog posts, we’ll add support for multiple authors and static pages, and we’ll add some more templates.

First of all, our URL structure. The existing structure works fine, but it would be better if we included a representation of the date of publication. If you’re familiar with WordPress, you’ll know it offers several different URL forms, one of which is the post name alone as we’re using here, and another of which is the year, month and name. We’ll use the latter of these URL schemes with our blogging engine.

This seems like a good opportunity to introduce the interactive Python shell that comes with Django. Make sure you have a few dummy posts set up, then in the project directory (DjangoBlog/, not the top-level one but the one inside that), enter the following command:

```bash
python manage.py shell
```

This will start up an interactive Python shell which you can use to interact with your Post objects. Now, the first step is to import your Post model:

```python
>>> from blogengine.models import Post
```

We now have access to our Post objects – let’s take a look at them:

```python
>>> Post.objects.all()
[<Post: My first blog post>, <Post: My second blog post>, <Post: My third post>, <Post: My fourth post>, <Post: My fifth post>, <Post: My sixth post>]
```

You may have completely different post objects, or a different number of them, but that’s fine. Remember we set `__unicode__(self)` to return self.title? Here we see that each blog post is represented by its title. Now let’s get one of our Post objects:

```python
>>> p = Post.objects.get(pk=1)
>>> p
<Post: My first blog post>
```

In the first line above, we get the Post object with the primary key of 1, and store a reference to it as p. We then demonstrate that it is, indeed, one of our blog posts by outputting its title.

If you’re not familiar with relational database theory, a primary key is a value in a database table that refers uniquely to one entry in the table, so that if you refer to an entry by its primary key, you can be sure you’re getting the correct value. By default, Django models generate a field called id in addition to the ones you define, which is set as the primary key, and this is set to auto-increment, so for instance, every time you add an additional blog post, it gets the next number as its id. Here, we just want to get access to a single blog post object, so we just enter 1 as the primary key in order to get the earliest blog post.

Next, we get the publication date:

```python
>>> p.pub_date
datetime.datetime(2012, 3, 19, 12, 11, 10)
```

This returns a datetime.datetime object. If you look at the documentation for Python’s datetime module, you’ll notice that it has attributes called day, month and year. Here’s how we can use these to get the information we want:

```python
>>> p.pub_date.month
3
>>> p.pub_date.day
19
>>> p.pub_date.month
3
>>> p.pub_date.year
2012
```

It’s that simple – we just refer to the attribute we want to retrieve. So, it should now be pretty easy to understand how we can get the date for each blog post.

Exit your Python shell with Ctrl-D and head back into the blogengine/ folder. Then open models.py in your text editor and add the following method to the bottom of your Post class:

```python
    def get_absolute_url(self):
        return "/%s/%s/%s/" % (self.pub_date.year, self.pub_date.month, self.slug)
```

Now, you haven’t seen get_absolute_url before. Every time you create a model in Django, you should really create a get_absolute_url method for it. In essence, it defines a single, canonical URL for that object, whether it’s a blog post, a user, or what have you. By creating one method that defines the structure for the URL for this type of object and referring to it elsewhere, we only need to change it in one place if we want to make any changes to how we determine the URL for that type of object.

What we do here is we define the URL as being /year/month/slug/. If you want, you can quite easily make it include the day as well like this:

```python
    def get_absolute_url(self):
        return "/%s/%s/%s/%s/" % (self.pub_date.year, self.pub_date.month, self.pub_date.day, self.slug)
```

With our model updated, let’s change our URLconf accordingly. Return to the inner DjangoBlog/ directory and open up urls.py, then amend the lines for the blog posts as follows:

```python
    # Blog posts
    url(r'^\d{4}/\d{1,2}/(?P<postSlug>[-a-zA-Z0-9]+)/?$', 'blogengine.views.getPost'),
```

What we’ve changed here is that we’ve told urls.py to expect blog posts that look like 4 digits, then a forward slash, then one or two digits, then another forward slash, then a slug that can include hyphens, upper or lower case letters, and numbers.

With that done, we just need to update our template. Edit templates/posts.html to look like this:

```django
<html>
    <head>
        <title>My Django Blog</title>
    </head>
    <body>
        {% for post in posts %}
        <h1><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h1>
        <h3>{{ post.pub_date }}</h3>
        {{ post.text }}
        {% endfor %}
        <br />
        {% if page.has_previous %}
        <a href="/{{ page.previous_page_number }}/">Previous Page</a>
        {% endif %}
        {% if page.has_next %}
        <a href="/{{ page.next_page_number }}/">Next Page</a>
        {% endif %}
    </body>
</html>
```

Literally all we do is replace post.slug with post.get_absolute_url and remove the leading forward slash. If you then run python manage.py syncdb, restart the development server and go clicking around your posts, you should be able to see that our new URL system is now up and running.

With that done, the next step is to add support for multiple authors. Now, you might think that we’re going to have to create a new model for users, but that’s not so – Django ships with a number of useful models already, and we’re going to use one of them here.

Now, first of all, we need to amend our Post model to include the author’s details. Edit your blogengine/models.py to look like this:

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

    def __unicode__(self):
        return self.title

    def get_absolute_url(self):
        return "%s/%s/%s/" % (self.pub_date.year, self.pub_date.month, self.slug)
```

There are two significant changes here. First, we import User from django.contrib.auth.models. User is a model provided by the auth model, and we’re going to use it here to represent the author of a given post. Then in the class definition of Post, we add a new field called author.

Note here that author is a foreign key field, and is passed a User object. Again for those unfamiliar with relational databases, a foreign key is a field in a database table that is also a primary key in another database table. Here we’re declaring that the author is one of the entries in the User table.

As well as this, we need to make some changes to the admin interface. By default, when we make a field in a model a foreign key, the admin interface will show a dropdown list of all of the instances of that object (so here, it would be a list of all the users on the system). But we don’t want that. We want the author to automatically be set as the current user, and for there to be no way to override this.

Open up admin.py and change it to look like this:

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

The changes made here are simple. We import the User model, and in the PostAdmin class definition we exclude the author field – this means that we don’t show this field at all.

Note the addition of the save_model method. In Django it’s easy to create a new object using your models:

```python
>>> from blogengine.models import Post
>>> p = Post()
>>> p
<Post: >
>>> p.title="My new blog post"
>>> p
<Post: My new blog post>
```

However, the new object won’t actually be stored in the database properly until you call the save() method. Here, you would need to enter p.save() (Note this won’t actually work unless you enter all the fields manually). What we’re doing in admin.py is overriding the default save() method to set the author to the name of the user who wrote the post.

Now run python manage.py syncdb again. Note that as you’ve changed the Post model, your existing posts will be lacking the required author field, and so you may need to add these again manually – this will be a numeric ID mapping to a user id. If you only have one user set up, you should just be able to set this to 1 by using an UPDATE SQL query.

If you now make sure the development server is running and log into the administrative interface, the first page you see should have a section marked “Auth”, with two items underneath named Groups and Users.

Now, cast your mind back to when you activated the admin interface and synced the database. If you recall, at this time you were asked to create a superuser account in order to log into the admin interface. This was actually provided by the django.contrib.auth application, one of the applications that are shipped with Django and are active by default. This contains the User and Group models.

If you’re familiar with Linux or Unix, the Auth application will feel very familiar. The account you created at the start was a superuser account, much like the root account on a Unix system, with unlimited privileges. Other users can be created, and given permissions on an individual basis. You can also create groups and add users to those groups, and then set the privileges for those groups en masse. For instance, in a large collaborative blog with many authors, you may have one group for people who contribute articles who can create new posts, editors who can edit existing posts and so on. Similarly, if you had a working comments system, you could easily set up a moderators group who can delete comments, and add people to that group.

Let’s create another user account so we have more than one. From the main admin page, click on the link for Add next to Users. You’ll be taken to a screen that prompts you for a username and password for the new user. Fill these in (there are two password fields for confirmation purposes) as you wish – here I’m setting the new user as bob. On the next screen you can add some additional details for the new user account, such as first name, last name and email address – do this so you have some information to work with.

Lower down you’ll see a dialogue for entering the permissions. You can make the new user a superuser so that they have permission to do anything, you can say whether or not they are staff (they need to be staff to use the admin interface, so check that), and whether they are active (making it easy to deactivate a user account without the need to delete it). Below you’ll see another dialogue showing the available permissions and allowing you to allocate them to that user. Further down, you’ll see a dialogue for changing the start date and last login date for the user, and finally a dialogue for adding new groups and adding the user to existing groups.

Save the user details once you’re done, then go into your superuser account and add a first and last name so we have some data to work with for that as well. Note that just as with a root account on a Unix box, it’s not a great idea to use a superuser account for everyday work (you should create an account that has the minimum privileges you need and use that), but we’ll stick with it for now just for learning purposes – don’t forget if you should roll out a public facing Django-powered site in future, though!

With that done, we now have some data to work with to identify the author of a given post. Let’s fire up the interactive shell again with python manage.py shell:
```python
>>> from blogengine.models import Post
>>> Post.objects.all()
[<Post: My first post>]
>>> p = Post.objects.get()
>>> p
<Post: My first post>
>>> p.author
<User: root>
>>> p.author.first_name
u'Matthew'
>>> p.author.last_name
u'Daly
```

Here, we can see that it’s easy to get the author’s details from the post. We define p as a reference to the single Post object,then we get the author, which in this case is called root. As I’ve defined a first and last name, we can get those too with p.author.first_name and p.author.last_name, which are strings containing the first and last name respectively. Note the ‘u’ before the string – this just indicates that the string is Unicode.

So from here, it’s pretty easy to display the author’s name in each post. Go into templates/posts.html and add the following line where you want your author details to appear:

```django
        <h3>By {{ post.author.first_name }} {{ post.author.last_name }}</h3>
```

Now, as long as you’ve added a first name and last name to that author’s details, if you visit http://127.0.0.1:8000, you should see the appropriate details.

Our next step is to add the facility to create flat pages, somewhat like the Pages functionality in WordPress. Again, Django comes with an application that will handle this, called flatpages, but it’s not enabled by default. Go into DjangoBlog/settings.py and at the bottom of INSTALLED_APPS, add the following:

```python
    'django.contrib.flatpages',
```

Then run python manage.py syncdb again to add the appropriate tables to your database. Now, we need to add a flat page. Go back to the main page of the admin interface, and you should see that you now have the facility to add flat pages. Click on the Add link for flat pages, and give your page a URL, a title, and some text (here I’m giving it a URL of /about/ and a title of About), add it to a site at the bottom (this will say example.com, but don’t worry about that, it’s to do with the Sites application, which we’re not looking at right now) then save it. You should now have a FlatPage object available.

Let’s take a look at the tables created for flatpages using the sqlall command:

```bash
python manage.py sqlall flatpages
```
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
CREATE INDEX "django_flatpage_a4b49ab" ON "django_flatpage" ("url");
COMMIT;
```

So we can see that django_flatpage, which contains the details about the actual flat pages, has the fields id, url, title, content, enable_comments, template_name, and registration_required. Some of these options are under the advanced options in the flat page interface, so you may have missed them.
Now fire up python manage.py shell again:

```python
>>> from django.contrib.flatpages.models import FlatPage
>>> f = FlatPage.objects.get()
>>> f
<FlatPage: /about/ -- About>
```

Here we have one FlatPage object only (note that get() should only be used if you will only get one result back), which is represented by a string that includes the URL and title.

```python
>>> f.content
u'This is my about page.'
```

We can easily access any of the fields in the flat page. Now, we need to define some URLs for our flat pages. Exit the Python shell and open urls.py, then insert the following rule underneath the one for blog posts:

```python
    # Flat pages
    url(r'', include('django.contrib.flatpages.urls')),
```

Note that this must be the last rule in your urls.py, because it will match anything. Now, you can try and load /about/, or whatever page you’ve created, but you’ll get an error stating that the template does not exist, so we need to create that. Go into your template directory, and create a directory inside that called flatpages. Then create a new file in there called default.html, and add the following code to it:

```django
<html>
    <head>
        <title>My Django Blog</title>
    </head>
    <body>
        <h1>{{ flatpage.title }}</h1>
        {{ flatpage.content }}
    </body>
</html>
```

Now, make sure you have the development server running and try to load http://127.0.0.1:8000/about/, or whatever your flat page URL is, and you should see your flat page’s title and content.

One final task for this lesson – we’re going to refactor our templates a little so that as little code as possible is duplicated and if we want to change anything we need to only do so in one place. Go to your template directory and edit posts.html to look like this:

```django
{% include 'header.html' %}
        {% for post in posts %}
        <h1><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h1>
        <h3>{{ post.pub_date }}</h3>
        {{ post.text }}
        <h3>By {{ post.author.first_name }} {{ post.author.last_name }}</h3>
        {% endfor %}
        <br />
        {% if page.has_previous %}
        <a href="/{{ page.previous_page_number }}/">Previous Page</a>
        {% endif %}
        {% if page.has_next %}
        <a href="/{{ page.next_page_number }}/">Next Page</a>
        {% endif %}
{% include 'footer.html' %}
```

Here we’re taking the header and footer of the page out and replacing them with code that includes another file there instead. Next, we need to create those files in the same directory. Here’s header.html:

```django
<html>
    <head>
        <title>My Django Blog</title>
    </head>
    <body>
```

And here’s footer.html:

```django
    </body>
</html>
```

None of this is terribly complex – we’re just moving the code into another file so that other templates can use the same files. Now save a copy of posts.html as single.html – we’re going to create a template for a single blog post. Edit the original posts.html to look like this:

```django
{% include 'header.html' %}
        {% for post in posts %}
        <h1><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h1>
        {{ post.text }}
        {% endfor %}
        <br />
        {% if page.has_previous %}
        <a href="/{{ page.previous_page_number }}/">Previous Page</a>
        {% endif %}
        {% if page.has_next %}
        <a href="/{{ page.next_page_number }}/">Next Page</a>
        {% endif %}
{% include 'footer.html' %}
```

We’re just removing the date and author details from the template that shows multiple posts. Our existing single.html file can remain as it is for now, since that still has all the additional information we want to include in an individual post.

While we’re here, let’s update our flat pages to use the same header and footer. Go into the flatpages directory and change default.html to look like this:

```django
{% include 'header.html' %}
        <h1>{{ flatpage.title }}</h1>
        {{ flatpage.content }}
{% include 'footer.html' %} 
```

Note that the path to the template files is not relative to flatpages/default.html, but relative to the root of the template directory.

The last thing to do is to amend the view for our blog to use the correct templates. Go into blogengine/views.py and change the getPost (NOT getPosts) function to pass the single.html template to render_to_response, instead of the posts.html template:

```python
    # Display specified post
    return render_to_response('single.html', { 'posts':post})
```

You should now notice that the single posts and multiple posts are using different templates.

Hope you’ve enjoyed this lesson, and I’ll do another one as soon as I can. The code is available on GitHub if you prefer to get it that way.
