---
date: '2012-04-23 21:55:40'
layout: post
slug: yet-another-tutorial-for-building-a-blog-using-python-and-django-part-5
status: publish
title: Yet another tutorial for building a blog using Python and Django - part 5
wordpress_id: '801'
categories:
- django
- python
- web development
---

In this instalment I'll be showing you how we can make our blogging engine a little nicer to look at by adding some CSS and images, as well as expanding on Django's templating system.

First of all, let's add some CSS to our blog. When developing a web app with Django, you should place static files such as stylesheets and images in a folder inside your app (not project) folder called static. My project is called DjangoBlog, and my app is called blogengine, so all my static content should go in DjangoBlog/blogengine/static/. Here's the stylesheet, which I've saved as style.css:

```css
body {
    background-color: #f0f0f0;
    font-family: Arial, Helvetica, sans-serif;
}

#main {
    width: 800px;
    height: 100%;
    margin: 50px auto;
}

ul#pageList {
    margin: 0px;
    padding: 10px 0px 10px 0px;
}

ul#pageList li {
    display: inline;
    margin-right: 10px;
    font-size: 18px;
}

.post, .page {
    width: 600px;
    padding: 20px;
    margin-bottom: 20px;
    background-color: #ffffff;
}
```

In the same folder, I have a PNG icon for an RSS feed, and if you had some JavaScript files you wanted to use (such as a copy of jQuery), you would put them here too. Note that there's nothing to stop you creating subfolders within /static, and in fact I would recommend you do so for any future project so you can separate out images, CSS and JavaScript easily.

With that done, we now need to change our templates to make use of this CSS. Here's what header.html should look like:

```django
<html>
    <head>
        <title>My Django Blog</title>
        <link rel="stylesheet" type="text/css" href="/static/style.css" />
    </head>
    <body>
        <div id="main">
            <h1>My Django Blog</h1>
            <a href="/feeds/posts/"><img src="/static/rss.png" width="50px" height="50px"></a>
            <ul id="pageList">
                <li><a href="/">Home</a></li>
                {% load flatpages %}
                {% get_flatpages as flatpages %}
                {% for flatpage in flatpages %}
                <li><a href="{{ flatpage.url }}">{{ flatpage.title }}</a></li>
                {% endfor %}
            </ul>
```

Next, here's footer.html:

```django
        </div>
    </body>
</html>
```

Now here's category.html:

```django
{% include 'header.html' %}
        {% load comments %}
        <h1>Posts for {{ category.title }}</h1>
        {% if posts %}
        {% for post in posts %}
        <div class="post">
        <h1><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h1>
        {{ post.text }}
        {% get_comment_count for post as comment_count %}
        <h3>Comments: {{ comment_count }}</h3>
        </div>
        {% endfor %}
        <br />
        {% if page.has_previous %}
        <a href="/{{ page.previous_page_number }}/">Previous Page</a>
        {% endif %}
        {% if page.has_next %}
        <a href="/{{ page.next_page_number }}/">Next Page</a>
        {% endif %}
        {% else %}
        <div class="post">
        <p>No posts matched</p>
        </div>
        {% endif %}
{% include 'footer.html' %}
```

Then, posts.html:

```django
{% include 'header.html' %}
        {% load comments %}
        {% if posts %}
        {% for post in posts %}
        <div class="post">
        <h1><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h1>
        {{ post.text }}
        {% get_comment_count for post as comment_count %}
        <h3>Comments: {{ comment_count }}</h3>
        </div>
        {% endfor %}
        <br />
        {% if page.has_previous %}
        <a href="/{{ page.previous_page_number }}/">Previous Page</a>
        {% endif %}
        {% if page.has_next %}
        <a href="/{{ page.next_page_number }}/">Next Page</a>
        {% endif %}
        {% else %}
        <div class="post">
        <p>No posts matched</p>
        </div>
        {% endif %}
{% include 'footer.html' %}
```

Here's single.html:

```django
{% include 'header.html' %}
        {% load comments %}
        {% for post in posts %}
        <div class="post">
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
        </ol>
        {% endfor %}
        {% render_comment_form for post %}
        {% endfor %}
        </div>
        <br />
        {% if page.has_previous %}
        <a href="/{{ page.previous_page_number }}/">Previous Page</a>
        {% endif %}
        {% if page.has_next %}
        <a href="/{{ page.next_page_number }}/">Next Page</a>
        {% endif %}
{% include 'footer.html' %}
```

And finally, flatpages/default.html:
```django
{% include 'header.html' %}
        <div class="page">
        <h1>{{ flatpage.title }}</h1>
        {{ flatpage.content }}
        </div>
{% include 'footer.html' %}
```

Phew! There's quite a lot there, so you may wish to grab these files from the GitHub repository rather than enter them yourself.

Now, all of the references to the CSS or image file need to refer to the /static folder under the root of the web server. Here's the reference to our stylesheet:

```django
<link rel="stylesheet" type="text/css" href="/static/style.css" />
```

And here's where we get the image:

```django
<a href="/feeds/posts/"><img src="/static/rss.png" width="50px" height="50px"></a>
```

All of our static files can be referenced via the /static folder by default, without needing to set up a rule to cover them in urls.py.

One other point worth noting is that we've added some code to the header to display links to all of the flat pages. This particular snippet of code in header.html is noteworthy:

```django
{% load flatpages %}
                {% get_flatpages as flatpages %}
                {% for flatpage in flatpages %}
                <li><a href="{{ flatpage.url }}">{{ flatpage.title }}</a></li>
                {% endfor %}
```

Here, we first of all load the flat pages. Then we retrieve them, and loop through each of them. For each page, we create a new list item containing a link to the flat page, with the text being the flat page's title. Note that we're just referring to each flatpage object's attributes here. Then we end the for loop.

The only problem with this is that all of the pages except the flat pages are handled by the blogengine application, not the flatpages one, so we can't get the values for the flat pages, so we need to amend blogengine/views.py. Open it and add the following line near the top:

```python
from django.contrib.flatpages.models import FlatPage
```

Now, nowhere else in the view is the FlatPage application needed, but it's required in the template, so by importing it here we make it available in the template.

With that done, our Django-powered blog is beginning to look a bit more presentable, so I'll leave it to you to style it however you wish, using this as a starting point. The blog is now pretty much feature-complete, however there's one more thing I'd like to demonstrate before we finish up, namely generic views.

As you may have gathered by now, Django uses slightly different terminology to many other web development frameworks. Although it can be considered an MVC (Model-View-Controller) framework like many others, it's generally referred to as an MTV (Model-Template-View) framework, with views containing the logic needed to present the data. While Django ships with a number of built-in applications to do certain repetitive tasks easily, not every task lends itself well to being handled by one generic application. However, these tasks may still require something similar be implemented over and over again, and that's what generic views are for.

We don't yet have a list of all of the available categories, so let's use a generic view to do that. In urls.py, add the following lines at the top:

```python
from django.views.generic import ListView
from blogengine.models import Category
```

Then, add the following lines at the top of the section for categories:

```python
    url(r'^categories/?$', ListView.as_view(
        model=Category,
        )),
```

Then, go into your templates folder and create a new folder in there called blogengine (or whatever you're calling your blog application). In there, create a new file called category_list.html and enter the following code in it:

```django
{% include 'header.html' %}
        {% for category in object_list %}
            <h3>{{ category.title }}</h3>
            <p>{{ category.description }}</p>
        {% endfor %}
{% include 'footer.html' %}
```

Now, ensure the development server is running, and go to http://127.0.0.1:8000/categories/, and you should see a list of your categories.

Now, you didn't write a view for this at all. Instead, this is handled by a generic view. In urls.py, we imported the ListView generic view, which is nothing more than a list of objects. We then import the Category model. Then, we define a URLconf that maps the categories/ url to ListView, which displays a list of all the Category objects. The template used is determined automatically, and we create that template as normal. Note that in the template we refer to object_list - this demonstrates that we're referring to the objects passed through generically, and in theory this same template could display any objects with attributes called title and description.

Now, it probably won't have escaped your notice that a blog is effectively a list of posts, so can't we use a generic view to display them? Well, yes we can! So why don't we cut down on the amount of code we need to maintain and use a generic view, rather than writing our own view?

Go into blogengine/views.py and delete the getPosts function in its entirety. Next, go into urls.py and delete the part that deals with showing the posts (the two lines just under the Home page comment), and replace them with this:

```python
    url(r'^(?P<page>\d+)?/?$', ListView.as_view(
        model=Post,
        paginate_by=5,
        )),
```

Note here that we specify how many items we paginate by. The ListView generic view supports pagination, making it ideally suited for any list of objects that may be spread across multiple pages - you just import the model you want and pass it through in the model parameter.

We also need to import the Post object in urls.py. Amend the line where you imported the Category model as follows:

```python
from blogengine.models import Category, Post
```

Then move posts.html into your templates/blogengine folder and rename it post_list.html, then amend it to look like the following:

```django
{% include 'header.html' %}
        {% load comments %}
        {% if object_list %}
        {% for post in object_list %}
        <div class="post">
        <h1><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h1>
        {{ post.text }}
        {% get_comment_count for post as comment_count %}
        <h3>Comments: {{ comment_count }}</h3>
        </div>
        {% endfor %}
        <br />
        {% if page_obj.has_previous %}
        <a href="/{{ page_obj.previous_page_number }}/">Previous Page</a>
        {% endif %}
        {% if page_obj.has_next %}
        <a href="/{{ page_obj.next_page_number }}/">Next Page</a>
        {% endif %}
        {% else %}
        <div class="post">
        <p>No posts matched</p>
        </div>
        {% endif %}
{% include 'footer.html' %}
```

The changes here are minimal, just adjusting the names of objects to what the generic view uses. Now, if you refresh the browser, you should be able to see your blog posts, only now they're being handled by Django's ListView generic view. But they're in the wrong order, so go into blogengine/models.py and add this code to the Post model:

```python
    class Meta:
        ordering = ["-pub_date"]
```

This defines the order the Post objects should be in the model, rather than the view. If you now refresh the browser, they should be in the right order.

A ListView is only one of the generic views available in Django. There are others that are useful under other circumstances, but they're beyond the scope of this tutorial, so I suggest that if you're interested, you take the time to learn more about them on your own. They can save you a lot of time and effort if used well.

Sadly, that brings this series of tutorials to an end. I hope you've enjoyed learning about Django, and I hope you'll be inspired to build something cool with it! As always, the code is available on [GitHub](https://github.com/matthewbdaly/Django-Tutorial-Blog), so feel free to download it, use it as the basis for your own projects, or whatever else you'd like to do with it.
