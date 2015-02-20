---
date: '2012-03-19 15:18:57'
layout: post
slug: yet-another-tutorial-for-building-a-blog-using-python-and-django-part-2
status: publish
title: Yet another tutorial for building a blog using Python and Django – Part 2
wordpress_id: '729'
categories:
- django
- python
- web development
---

In the first part of this tutorial, we got the core elements of our blogging application working - we set up our model for posts, and a view, template and URL configuration to view the index. Next we'll start extending this very basic functionality - we'll add a view for individual posts as well, and we'll allow for each post to have a separate URL.

First, we need to set up some pagination for the home page. At this point, it's worth taking the time to look at how we want our URL to look. Here, we'll work on the basis that by default, the home page will show the first five blog posts, and if someone wants to see later posts, they need to append a number to the end. Here's the URL for the second page assuming it's at example.com:

```
http://www.example.com/2/
```

So, we need two separate rules for the URLs. We need one for a URL with no number at the end, and one for a URL with a number at the end, and an optional forward slash. Open up urls.py and edit it so the Home page section looks like this:

```python
# Home page
url(r'^$', 'blogengine.views.getPosts'),
url(r'^(?P<selected_page>\d+)/?$', 'blogengine.views.getPosts'),
```

Note that I've edited the first rule to include ^$ as the regular expression. ^ denotes the start of a regex, and $ denotes the end, so this represents a URL with nothing added after the domain name, such as http://www.example.com. We've also changed getRecentPosts to getPosts, as that's now a more descriptive name.

The second line will match if there is a digit (denoted by the \d+ section) and will pass that digit through to the getPosts function as selected_page. With that done, we now need to make the necessary changes in the view, so move into the blogengine directory and amend views.py to look like this:

```python
# Create your views here.
from django.shortcuts import render_to_response
from django.core.paginator import Paginator
from blogengine.models import Post

def getPosts(request, selected_page=1):
    # Get all blog posts
    posts = Post.objects.all().order_by('-pub_date')

    # Add pagination
    pages = Paginator(posts, 5)
    returned_page = pages.page(selected_page)

    # Display all the posts
    return render_to_response('posts.html', {'posts':returned_page.object_list})
```

Again, note the change in function name from getRecentPosts to getPosts. Now, let's work through the rest of the code. You'll notice the following line near the top:

```python
from django.core.paginator import Paginator
```

This imports the Paginator class, which is very useful for creating pagination. Then, you'll notice the following line:

```python
def getPosts(request, selected_page=1):
```

If you know much about Python, you'll know that you can specify a default value for a parameter passed to a function or method. Here, what we're doing is setting the default value of selected_page to 1, so if someone visits http://www.example.com, for which the URLconf doesn't specify a number, this defaults to 1. If they visit http://www.example.com/2 instead, the default value for selected_page will be overriden to 2.

Then you'll note that we've refactored the lines that fetched the posts and sorted them into one line, and called that posts. After that we define pages as a Paginator object, and passed it the values of posts and 5. The first parameter is what we want to divide between pages, and the second is how many instances of this we should allow on an individual page. Here we're passing through all of the posts, and allowing 5 posts per page. We then define returned_page as the page from pages that matches the number submitted in the selected_page variable. Finally we pass a list of all the objects that make up returned_page through to the template as posts.

So, we now have basic pagination in place. Next, we'll add the capability to display individual posts.

Now, we could just be lazy and have each post referred to by the numerical ID that's automatically added by Django to the database, but why would we want to do that? We want a nice, human and search engine friendly URL that gives some idea what the blog post is about. Django is structured in such a way that nice, friendly URLs without cruft are very easy to create, and it actually has a special type of field in the models called a slug field that's ideal for creating URLs.

So first of all, go into blogengine/models.py and edit it to look like this:

```python
from django.db import models

# Create your models here.
class Post(models.Model):
    title = models.CharField(max_length=200)
    pub_date = models.DateTimeField()
    text = models.TextField()
    slug = models.SlugField(max_length=40, unique=True)

    def __unicode__(self):
        return self.title
```

The only change is the addition of the slug field. Like any other field, you'll be able to edit the slug field using the admin interface. But, why should you have to? Existing blogging solutions like WordPress will suggest a URL for a blog post, so that's what we want to do as well. Open blogengine/admin.py and edit it to look like this:

```python
import models
from django.contrib import admin

class PostAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("title",)}

admin.site.register(models.Post, PostAdmin)
```

If you know a little about object-oriented programming in Python, you should be able to grasp what's going on here. We're creating PostAdmin, which inherits from ModelAdmin, and using the title to prepopulate the slug field. We then register this as before, but using PostAdmin rather than the default ModelAdmin.

A fairly typical slug will be based on your title, but will strip out whitespace and other characters between the words and replace them with hyphens, and convert the result to lowercase, so a title like "My new bike" will become my-new-bike.

Also, note that in models.py, we pass the parameter unique=True for the slug. This indicates that the slug must be unique, so we can't have the same URL applied to two different posts.

With our model and admin amended, it's now time to create a view to deal with displaying an individual post. Add the following function to blogengine/views.py:

```python
def getPost(request, postSlug):
    # Get specified post
    post = Post.objects.filter(slug=postSlug)

    # Display specified post
    return render_to_response('posts.html', { 'posts':post})
```

This function receives the request object and a slug for the post. It then gets the specific post with that slug, and returns it. For now we'll just use the existing posts.html template, but we'll want to add a new template for single posts at some point.

With that done, the next step is to add a URLconf to handle blog posts. Open urls.py and add the following code after the lines for the home page:

```python
    # Blog posts
    url(r'^(?P<postSlug>[-a-zA-Z0-9]+)/?$', 'blogengine.views.getPost'),
```

So, now we have a dedicated URL for each post. But how do we get there? We need to create a link from the home page to each individual blog post. Open up your posts.html template and edit it to look like this:

```django
<html>
    <head>
        <title>My Django Blog</title>
    </head>
    <body>
        {% for post in posts %}
        <h1><a href="/{{ post.slug }}">{{ post.title }}</a></h1>
        <h3>{{ post.pub_date }}</h3>
        {{ post.text }}
        {% endfor %}
    </body>
</html>
```

Now, if you run python manage.py syncdb, the changes to your database schema will be made automatically. However, if you already have some test posts in the database, these won't have a slug and that could cause problems. So you can either add slugs to the existing posts manually using an UPDATE SQL command, or if you're using something like PHPMyAdmin you can use that to add slugs for these posts. Or if they're just test posts and you don't care about them in the slightest, just delete your database and start again from scratch.

With that done, if you then run python manage.py runserver, and then visit http://127.0.0.1:8000, you should see your home page. If you have at least one blog post set up, you should see those posts on the home page, and the title should be a hyperlink to that post. If you have more than 5 posts, you should be able to go to http://127.0.0.1:8000/2 and see the next 5 posts.

But wait! What if you don't have more posts? You want some code in place to handle what happens if you try to go to http://127.0.0.1:8000/2 and it isn't there. You also want to dynamically generate links for older and newer posts so that users can click back as far as they need to.

First of all, let's put something in place to catch nonexistent pages. Open blogengine/views.py and edit the getPosts function to look like this:

```python
# Create your views here.
from django.shortcuts import render_to_response
from django.core.paginator import Paginator, EmptyPage
from blogengine.models import Post

def getPosts(request, selected_page=1):
    # Get all blog posts
    posts = Post.objects.all().order_by('-pub_date')

    # Add pagination
    pages = Paginator(posts, 5)

    # Get the specified page
    try:
        returned_page = pages.page(selected_page)
    except EmptyPage:
        returned_page = pages.page(pages.num_pages)

    # Display all the posts
    return render_to_response('posts.html', { 'posts':returned_page.object_list})

def getPost(request, postSlug):
    # Get specified post
    post = Post.objects.filter(slug=postSlug)

    # Display specified post
    return render_to_response('posts.html', { 'posts':post})
```

The only differences here are that EmptyPage is imported, and we add error checking to returned_page so that if it throws an EmptyPage exception (meaning that the given page doesn't exist), then it defaults to returning the highest numbered page. The value of pages.num_pages is the number of pages in total, so you use this to get the last numbered page. If you prefer, you can change it to default to the first page by replacing pages.num_pages with 1.

With this done, the next step is to create links for the next and previous pages. Fortunately Django makes this really easy. First, you have to pass through the returned_page object in views.py, like this:

```python
    # Display all the posts
    return render_to_response('posts.html', { 'posts':returned_page.object_list, 'page':returned_page})
```

Here in addition to the existing posts object, we now pass through returned_page as page. Now, amend your posts.html template as follows:

```django
<html>
    <head>
        <title>My Django Blog</title>
    </head>
    <body>
        {% for post in posts %}
        <h1><a href="/{{ post.slug }}">{{ post.title }}</a></h1>
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

Here, if the given page has a previous page, we display a link to it, and if it has a next page, we display a link to that too. page.has_previous and page.has_next return True or False, and page.previous_page_number and page.next_page_number display a number for the appropriate page, so it's easy to use them to link to the appropriate page.

And that will do for now! We've gotten quite a lot done this time, and we actually have something that, although it's still missing many of the more sophisticated features of blogging platforms such as WordPress, is fundamentally usable as a blog as long as you either don't want comment functionality or are prepared to use a third-party system such as Disqus. Feel free to congratulate yourself with a beverage of your choice, and we'll carry on later.
