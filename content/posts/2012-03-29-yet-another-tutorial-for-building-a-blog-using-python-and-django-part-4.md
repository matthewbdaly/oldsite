---
date: '2012-03-29 21:29:59'
layout: post
slug: yet-another-tutorial-for-building-a-blog-using-python-and-django-part-4
status: publish
title: Yet another tutorial for building a blog using Python and Django - part 4
wordpress_id: '780'
categories:
- django
- python
- web development
---

Welcome back! In this tutorial we'll continue extending our Django-powered blogging engine. We'll add the capability to assign blog posts to categories, and comment on posts. We'll also generate an RSS feed for our blog posts.

Categories are somewhat tougher to implement than most of what we've done beforehand. One category can be assigned to many blog posts, and many categories can be assigned to one blog post, so this relationship is described as a "many to many relationship" when drawing up the database structure. What it means is that you can't directly map categories onto posts and vice versa - you have to create an intermediate database table for the relationship between posts and categories.

Here's what your models.py should look like:

```python
from django.db import models 
from django.contrib.auth.models import User

# Create your models here. 
class Category(models.Model): 
    title = models.CharField(max_length=200) 
    slug = models.SlugField(max_length=40, unique=True) 
    description = models.TextField() 
 
    class Meta: 
        verbose_name_plural = "Categories" 
 
    def __unicode__(self): 
        return self.title

    def get_absolute_url(self):
        return "/categories/%s/" % self.slug

class Post(models.Model):
    title = models.CharField(max_length=200)
    pub_date = models.DateTimeField()
    text = models.TextField()
    slug = models.SlugField(max_length=40, unique=True)
    author = models.ForeignKey(User)
    categories = models.ManyToManyField(Category, blank=True, null=True, through='CategoryToPost')

    def __unicode__(self):
        return self.title

    def get_absolute_url(self):
        return "/%s/%s/%s/" % (self.pub_date.year, self.pub_date.month, self.slug)

class CategoryToPost(models.Model):
    post = models.ForeignKey(Post)
    category = models.ForeignKey(Category)
```

We're adding quite a bit of new code here. First of all we're defining a new model called Category. Each category has a title, a description, and a slug (so we can have a dedicated page for each category). As usual, we define methods for __unicode__ and get_absolute_url, but also note the class Meta. Here we're defining some metadata for the class (ie, data about the data). The only thing we do here is essentially telling the admin interface that the plural of Category is not "Categorys" but "Categories".

Then, in Post we add an additional field called Category, which we define as a ManyToManyField. Note the parameters passed through - we're saying here that a post need not be assigned a category, and that CategoryToPost should be used as an intermediate table to link posts to categories.

Finally, we define the aforementioned CategoryToPost model, which has two fields, post and category. Both of these are foreign keys, mapping to a blog post and a category respectively. By creating entries in this table, a link can be created between a post and a category.

With our model changed, it's time to update our admin.py as well:

```python
import models
from django.contrib import admin
from django.contrib.auth.models import User

class CategoryAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("title",)}

class CategoryToPostInline(admin.TabularInline):
    model = models.CategoryToPost
    extra = 1 

class PostAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("title",)}
    exclude = ('author',)
    inlines = [CategoryToPostInline]

    def save_model(self, request, obj, form, change):
        obj.author = request.user
        obj.save()

admin.site.register(models.Post, PostAdmin)
admin.site.register(models.Category, CategoryAdmin)
```

Here we define a new class called CategoryAdmin, which details how we're changing the admin interface for Category from the defaults generated from the fields provided. The only change we make here is that we prepopulate the slug field from the title, much like we did with blog posts.

Next, we define an inline for the relationships between categories and post, called CategoryToPostInline. This is a new concept - essentially it means that the category to post relationships can be defined in another model's admin interface. We define the model this applies to, and that by default we will only add one additional field for adding categories when writing or editing a post (though users can add as many as they wish, or none). Note that the model this is based on is admin.TabularInline - this represents a tabular layout. If you prefer, you can use an alternative layout by using StackedInline instead.

Then, in PostAdmin we add our newly declared CategoryToPostInline to the PostAdmin class as an inline. Finally, at the bottom we register Category with the admin interface, so we can create and manage categories easily.

With that done, it's time to edit our views.py:

```python
# Create your views here.
from django.shortcuts import render_to_response
from django.core.paginator import Paginator, EmptyPage
from blogengine.models import Post, Category

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
    return render_to_response('posts.html', { 'posts':returned_page.object_list, 'page':returned_page})

def getPost(request, postSlug):
    # Get specified post
    post = Post.objects.filter(slug=postSlug)

    # Display specified post
    return render_to_response('single.html', { 'posts':post})

def getCategory(request, categorySlug, selected_page=1):
    # Get specified category
    posts = Post.objects.all().order_by('-pub_date')
    category_posts = []
    for post in posts:
        if post.categories.filter(slug=categorySlug):
            category_posts.append(post)

    # Add pagination
    pages = Paginator(category_posts, 5)

    # Get the category
    category = Category.objects.filter(slug=categorySlug)[0]

    # Get the specified page
    try:
        returned_page = pages.page(selected_page)
    except EmptyPage:
        returned_page = pages.page(pages.num_pages)

    # Display all the posts
    return render_to_response('category.html', { 'posts': returned_page.object_list, 'page': returned_page, 'category': category})
```

Here we import the Category model as well as the Post model. Then, the only additional change we need to make is to add a brand new getCategory view function. Note that this is quite similar to the getPosts function - we set up pagination in the same way, and rather than get all the posts, we get just those in the specified category. Also note that we're using the template category.html rather than posts.html here, and we pass through category as well as posts and page when we return the render_to_response.

The next change we need to make is adding category.html. Go into your template directory and save the code below as category.html:

```html
{% include 'header.html' %}
        <h1>Posts for {{ category.title }}</h1>
        {% if posts %}
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
        {% else %}
        <p>No posts matched</p>
        {% endif %}
{% include 'footer.html' %}
```

With our template in place, the last step is to add an appropriate URLconf. Edit urls.py to look like this:

```python
from django.conf.urls.defaults import patterns, include, url 

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'blog.views.home', name='home'),
    # url(r'^blog/', include('blog.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),

    # Home page
    url(r'^$', 'blogengine.views.getPosts'),
    url(r'^(?P<selected_page>\d+)/?$', 'blogengine.views.getPosts'),

    # Blog posts
    url(r'^\d{4}/\d{1,2}/(?P[-a-zA-Z0-9]+)/?$', 'blogengine.views.getPost'),

    # Categories
    url(r'^categories/(?P<categorySlug>\w+)/?$', 'blogengine.views.getCategory'),
    url(r'^categories/(?P<categorySlug>\w+)/(?P<selected_page>\d+)/?$', 'blogengine.views.getCategory'),

    # Flat pages
    url(r'', include('django.contrib.flatpages.urls')),
)
```

Now, if you run python manage.py syncdb again, the category system should be up and running.

The next step is to add the facility to handle comments. Again, Django has its own application built in for handling comments, so go into setings.py and enter the following under INSTALLED_APPS:

```python
     'django.contrib.comments',
```

Then run python manage.py syncdb again to generate the appropriate database tables. You'll also need to amend urls.py to provide a dedicated URL for comments:

```python
    # Comments
    url(r'^comments/', include('django.contrib.comments.urls')),
```

Place this before the URLconf for the flat pages.

Comments can be attached to any type of content, but we only want to attach them to blog posts, and they should only be visible in the single post template. But first of all, let's add a comment count to posts in posts.html and category.html. Replace posts.html with this:

```html
{% include 'header.html' %}
        {% load comments %}
        {% if posts %}
        {% for post in posts %}
        <h1><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h1>
        {{ post.text }}
        {% get_comment_count for post as comment_count %}
        <h3>Comments: {{ comment_count }}</h3>
        {% endfor %}
        <br />
        {% if page.has_previous %}
        <a href="/{{ page.previous_page_number }}/">Previous Page</a>
        {% endif %}
        {% if page.has_next %}
        <a href="/{{ page.next_page_number }}/">Next Page</a>
        {% endif %}
        {% else %}
        <p>No posts matched</p>
        {% endif %}
{% include 'footer.html' %}
```

And replace category.html with this:

```html
{% include 'header.html' %}
        {% load comments %}
        <h1>Posts for {{ category.title }}</h1>
        {% if posts %}
        {% for post in posts %}
        <h1><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h1>
        {{ post.text }}
        {% get_comment_count for post as comment_count %}
        <h3>Comments: {{ comment_count }}</h3>
        {% endfor %}
        <br />
        {% if page.has_previous %}
        <a href="/{{ page.previous_page_number }}/">Previous Page</a>
        {% endif %}
        {% if page.has_next %}
        <a href="/{{ page.next_page_number }}/">Next Page</a>
        {% endif %}
        {% else %}
        <p>No posts matched</p>
        {% endif %}
{% include 'footer.html' %}
```

The only significant changes here are that at the top we load comments, and underneath the post text we get the comment count for each post as the variable comment_count, then we display it underneath.

Now, we want to go further with our single post template. As well as a comment count, we want to add the actual comments themselves. Finally, we need a form for adding comments - in theory you can use the admin interface for doing this, but it's very unlikely you'd want to do so. Open up single.html and edit it to look like this:

```html
{% include 'header.html' %}
        {% load comments %}
        {% for post in posts %}
        <h1><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h1>
        <h3>{{ post.pub_date }}</h3>
        {{ post.text }}
        <h3>By {{ post.author.first_name }} {{ post.author.last_name }}</h3>
        <h3>Categories: {% for category in post.categories.all %} {{ category.title }} {% endfor %}</h3>
        {% get_comment_count for post as comment_count %}
        <h3>Comments: {{ comment_count }}</h3>
        <ol>
        {% get_comment_list for post as comments %}
        {% for comment in comments %}
        <li>{{ comment }}</li>
        {% endfor %}
        </ol>
        {% render_comment_form for post %}
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

This includes the same changes as the other two templates, so we load comments and display the comment count. Afterwards, we get the comment list for this post as comments, and then loop through the comments, showing them in an ordered list. Afterwards, we then use render_comment_form to show the default comment form for this post. If you'd prefer to create your own comment form, you can use get_comment_form instead to get a form object you can use in the template.

You'll also need to make some minor changes to the view to get the form working. Save single.html and open blogengine/views.py and add the following line of code to your import statements:

```python
from django.template import RequestContext
```

Then, amend the final line of the getPost function as follows:

```python
    return render_to_response('single.html', { 'posts':post}, context_instance=RequestContext(request))
```

The reason this needs to be changed is that the comment form includes the {% csrf_token %} tag, which requires information from the request object, and in order to do so rather than the default context, you need to pass through a RequestContext object instead, but don't worry too much about the details.

If you now ensure the development server is running and visit a blog post, you should now see that you can post comments. If you want to enhance this very basic comment form, take a look at the excellent documentation on the Django website. Alternatively, there are a number of third-party comment services, such as Disqus and IntenseDebate that can handle comments for you and just require you to paste a snippet of code into whatever template you want to enable comments on, and these may be more convenient.

Finally for this lesson, as promised, we'll implement our RSS feed. Again, there's an application bundled with Django that will do this - the syndication framework. Open settings.py and paste the following line in at the bottom of your INSTALLED_APPS:

```python
     'django.contrib.syndication',
```

Save the file and run python manage.py syncdb to add the appropriate tables to your database. Then, we need to add a URLconf for the RSS feed. We'll allow a consistent naming scheme for RSS feeds, so this will be /feeds/posts, and if you wanted to you could add /feeds/comments, for instance. Add this to you urls.py, before the url for flat pages:

```python
    # RSS feeds
    url(r'^feeds/posts/$', PostsFeed()),
```

We'll also need to tell urls.py where to find PostsFeed(). In this case, we're going to put it in the view, so add this import line near the top:

```python
from blogengine.views import PostsFeed
```

Now open blogengine/views.py and add the following line to the import statements at the top:

```python
from django.contrib.syndication.views import Feed
```

Then add the following class declaration to the bottom:

```python
class PostsFeed(Feed):
    title = "My Django Blog posts"
    link = "feeds/posts/"
    description = "Posts from My Django Blog"

    def items(self):
        return Post.objects.order_by('-pub_date')[:5]

    def item_title(self, item):
        return item.title

    def item_description(self, item):
        return item.text
```

This is pretty simple. We import the Feed class from thew views provided by the syndication framework, then we base PostsFeed on Feed. We set the title, the link for the feed, and a description for the feed. Then we get the last 5 Post objects in reverse chronological order, and we define each item's title as the post title. and each item's description as the text of the post. From here' it's pretty easy to see how you could create feeds based on comments, or pretty much any other object that might exist in the database.

And with that done, our blogging engine is pretty-much feature-complete. We have blog posts with comments, categories, an RSS feed, and flat pages, but the look and feel of the site definitely needs some attention. Next time, we'll make our blogging engine look a little nicer. Once again, the code is available on GitHub in case you find that more convenient.
