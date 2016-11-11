---
layout: post
title: "Django blog tutorial - the next generation - part 4"
date: 2014-02-15 17:45:00 +0000
comments: true
categories: 
- python
- django
- tdd
- django-blog-tutorial
---

Hello again! As promised, in this instalment we'll implement categories and tags, as well as an RSS feed.

As usual, we need to switch into our virtualenv:

```bash
$ source venv/bin/activate
```

Categories
----------

It's worth taking a little time at this point to set out what we mean by categories and tags in this case, as the two can be very similar. In this case, we'll use the following criteria:

* A post can have only one category, or none, but a category can be applied to any number of posts
* A post can have any number of tags, and a tag can be applied to any number of posts

If you're not too familiar with relational database theory, the significance of this may not be apparent, so here's a quick explanation. Because the categories are limited to one per post, the relationship between a post and a category is known as *one-to-many*. In other words, one post can only have one category, but one category can have many posts. You can therefore define the categories in one table in your database, and refer to them by their ID (the reference to the category in the post table is referred to as a *foreign key*).

As usual, we will write a test first. Open up `blogengine/tests.py` and edit the line importing the `Post` model as follows:

```python
from blogengine.models import Post, Category
```

Also, add the following method before `test_create_post`:

```python
    def test_create_category(self):
        # Create the category
        category = Category()

        # Add attributes
        category.name = 'python'
        category.description = 'The Python programming language'

        # Save it
        category.save()

        # Check we can find it
        all_categories = Category.objects.all()
        self.assertEquals(len(all_categories), 1)
        only_category = all_categories[0]
        self.assertEquals(only_category, category)

        # Check attributes
        self.assertEquals(only_category.name, 'python')
        self.assertEquals(only_category.description, 'The Python programming language')
```

This test checks that we can create categories. But categories aren't much use unless we can actually apply them to our posts. So we need to edit our `Post` model as well, and to do so we need to have a test in place first. Edit the `test_create_post` method as follows:

```python
    def test_create_post(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

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
        post.category = category

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
        self.assertEquals(only_post.category.name, 'python')
        self.assertEquals(only_post.category.description, 'The Python programming language')
```

What we're doing here is adding a `category` attribute to the posts. This attribute contains a reference to a `Category` object.

Now, we also want to test adding, editing, and deleting a category from the admin interface. Add this code to the `AdminTest` class:

```python
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

        # Check added successfully
        self.assertTrue('added successfully' in response.content)

        # Check new category now in database
        all_categories = Category.objects.all()
        self.assertEquals(len(all_categories), 1)

    def test_edit_category(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

        # Log in
        self.client.login(username='bobsmith', password="password")

        # Edit the category
        response = self.client.post('/admin/blogengine/category/1/', {
            'name': 'perl',
            'description': 'The Perl programming language'
            }, follow=True)
        self.assertEquals(response.status_code, 200)

        # Check changed successfully
        self.assertTrue('changed successfully' in response.content)

        # Check category amended
        all_categories = Category.objects.all()
        self.assertEquals(len(all_categories), 1)
        only_category = all_categories[0]
        self.assertEquals(only_category.name, 'perl')
        self.assertEquals(only_category.description, 'The Perl programming language')

    def test_delete_category(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

        # Log in
        self.client.login(username='bobsmith', password="password")

        # Delete the category
        response = self.client.post('/admin/blogengine/category/1/delete/', {
            'post': 'yes'
        }, follow=True)
        self.assertEquals(response.status_code, 200)

        # Check deleted successfully
        self.assertTrue('deleted successfully' in response.content)

        # Check category deleted
        all_categories = Category.objects.all()
        self.assertEquals(len(all_categories), 0) 
```

This is very similar to the prior code for the posts, and just checks we can create categories via the admin. We also need to check we can apply these categories to posts, and that they don't break the existing tests:

```python
    def test_create_post(self):
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

    def test_edit_post(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

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
            'site': '1',
            'category': '1'
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
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

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
        post.category = category
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

        # Check post deleted
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 0)
```

Here we basically take our existing post tests in the admin interface and add the category to them. Finally, we edit the `PostViewTest` class to include categories:

```python
class PostViewTest(BaseAcceptanceTest):
    def test_index(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

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
        post.category = category
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
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

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
        post.category = category
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

Now it's time to run our tests:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test blogengine
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
    from blogengine.models import Post, Category
ImportError: cannot import name Category


----------------------------------------------------------------------
Ran 1 test in 0.000s

FAILED (errors=1)
Destroying test database for alias 'default'...
```

This is the expected result. We need to create our Category model. So let's do that:

```python
from django.db import models
from django.contrib.auth.models import User
from django.contrib.sites.models import Site

# Create your models here.
class Category(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()


class Post(models.Model):
    title = models.CharField(max_length=200)
    pub_date = models.DateTimeField()
    text = models.TextField()
    slug = models.SlugField(max_length=40, unique=True)
    author = models.ForeignKey(User)
    site = models.ForeignKey(Site)
    category = models.ForeignKey(Category, blank=True, null=True)

    def get_absolute_url(self):
        return "/%s/%s/%s/" % (self.pub_date.year, self.pub_date.month, self.slug)

    def __unicode__(self):
        return self.title

    class Meta:
        ordering = ["-pub_date"]
```

Note that we add `Category` before `Post` - this is because `Category` is a foreign key in `Post`, and must be defined in order to be used. Also, note that we add the `category` attribute as a `ForeignKey` field, like `User` and `Site`, indicating that it is an item in another table being references.

We also allow for `category` to be blank or null, so the user does not have to apply a category if they don't wish to.

If we run our tests, they should still fail:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test blogengine
Creating test database for alias 'default'...
EEFEEEEE...EE
======================================================================
ERROR: test_create_category (blogengine.tests.PostTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 20, in test_create_category
    category.save()
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
OperationalError: no such table: blogengine_category

======================================================================
ERROR: test_create_post (blogengine.tests.PostTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 37, in test_create_post
    category.save()
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
OperationalError: no such table: blogengine_category

======================================================================
ERROR: test_create_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 215, in test_create_post
    category.save()
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
OperationalError: no such table: blogengine_category

======================================================================
ERROR: test_delete_category (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 192, in test_delete_category
    category.save()
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
OperationalError: no such table: blogengine_category

======================================================================
ERROR: test_delete_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 304, in test_delete_post
    category.save()
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
OperationalError: no such table: blogengine_category

======================================================================
ERROR: test_edit_category (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 165, in test_edit_category
    category.save()
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
OperationalError: no such table: blogengine_category

======================================================================
ERROR: test_edit_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 250, in test_edit_post
    category.save()
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
OperationalError: no such table: blogengine_category

======================================================================
ERROR: test_index (blogengine.tests.PostViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 353, in test_index
    category.save()
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
OperationalError: no such table: blogengine_category

======================================================================
ERROR: test_post_page (blogengine.tests.PostViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 403, in test_post_page
    category.save()
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
OperationalError: no such table: blogengine_category

======================================================================
FAIL: test_create_category (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 142, in test_create_category
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

----------------------------------------------------------------------
Ran 13 tests in 3.393s

FAILED (failures=1, errors=9)
Destroying test database for alias 'default'...
```

The category table hasn't yet been created, so we need to use South to create and run the migrations:

```bash
$ python manage.py schemamigration --auto blogengine
$ python manage.py migrate
```

If we then run our tests again, some of them will still fail:

```bash
Creating test database for alias 'default'...
..F.F.F......
======================================================================
FAIL: test_create_category (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 142, in test_create_category
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

======================================================================
FAIL: test_delete_category (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 201, in test_delete_category
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

======================================================================
FAIL: test_edit_category (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 175, in test_edit_category
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

----------------------------------------------------------------------
Ran 13 tests in 4.047s

FAILED (failures=3)
Destroying test database for alias 'default'...
```

That's because we haven't registered the categories in the admin. So, that's our next job:

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

admin.site.register(models.Category)
admin.site.register(models.Post, PostAdmin)
```

Now we try again:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test blogengine
Creating test database for alias 'default'...
.............
----------------------------------------------------------------------
Ran 13 tests in 4.092s

OK
Destroying test database for alias 'default'...
```

It passes! Let's do a quick sense check before committing. Run the server:

```bash
$ python manage.py runserver
```

If you visit the [admin](http://127.0.0.1:8000/admin/), you'll see the text for category is `Categorys`, which is incorrect. We also don't have a good representation of the category in the admin. Let's fix that:


```python
from django.db import models
from django.contrib.auth.models import User
from django.contrib.sites.models import Site

# Create your models here.
class Category(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()

    def __unicode__(self):
        return self.name

    class Meta:
        verbose_name_plural = 'categories'


class Post(models.Model):
    title = models.CharField(max_length=200)
    pub_date = models.DateTimeField()
    text = models.TextField()
    slug = models.SlugField(max_length=40, unique=True)
    author = models.ForeignKey(User)
    site = models.ForeignKey(Site)
    category = models.ForeignKey(Category, blank=True, null=True)

    def get_absolute_url(self):
        return "/%s/%s/%s/" % (self.pub_date.year, self.pub_date.month, self.slug)

    def __unicode__(self):
        return self.title

    class Meta:
        ordering = ["-pub_date"]
```

Let's commit our changes:

```bash
$ git add blogengine/
$ git commit -m 'Implemented categories'
```

Now, as yet our categories don't actually do all that much. We would like to be able to:

* List all posts under a category
* Show the post category at the base of the post

So, let's implement that. First, as usual, we implement tests first:

```python
class PostViewTest(BaseAcceptanceTest):
    def test_index(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

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
        post.category = category
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

        # Check the post category is in the response
        self.assertTrue(post.category.name in response.content)

        # Check the post date is in the response
        self.assertTrue(str(post.pub_date.year) in response.content)
        self.assertTrue(post.pub_date.strftime('%b') in response.content)
        self.assertTrue(str(post.pub_date.day) in response.content)

        # Check the link is marked up properly
        self.assertTrue('<a href="http://127.0.0.1:8000/">my first blog post</a>' in response.content)

    def test_post_page(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

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
        post.category = category
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

        # Check the post category is in the response
        self.assertTrue(post.category.name in response.content)

        # Check the post text is in the response
        self.assertTrue(markdown.markdown(post.text) in response.content)

        # Check the post date is in the response
        self.assertTrue(str(post.pub_date.year) in response.content)
        self.assertTrue(post.pub_date.strftime('%b') in response.content)
        self.assertTrue(str(post.pub_date.day) in response.content)

        # Check the link is marked up properly
        self.assertTrue('<a href="http://127.0.0.1:8000/">my first blog post</a>' in response.content)
```

All we do here is assert that for both the post pages and the index, the text from the category name is shown in the response. We also need to check the category-specific route works. Add this method to `PostViewTest`:

```python
    def test_category_page(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

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
        post.category = category
        post.save()

        # Check new post saved
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)
        only_post = all_posts[0]
        self.assertEquals(only_post, post)

        # Get the category URL
        category_url = post.category.get_absolute_url()

        # Fetch the category
        response = self.client.get(category_url)
        self.assertEquals(response.status_code, 200)

        # Check the category name is in the response
        self.assertTrue(post.category.name in response.content)

        # Check the post text is in the response
        self.assertTrue(markdown.markdown(post.text) in response.content)

        # Check the post date is in the response
        self.assertTrue(str(post.pub_date.year) in response.content)
        self.assertTrue(post.pub_date.strftime('%b') in response.content)
        self.assertTrue(str(post.pub_date.day) in response.content)

        # Check the link is marked up properly
        self.assertTrue('<a href="http://127.0.0.1:8000/">my first blog post</a>' in response.content)
```

This is very similar to the previous tests, but fetches the absolute URL for the category, and ensures the category name and post content are shown. Now, let's run our new tests:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test blogengine
Creating test database for alias 'default'...
...........EFF
======================================================================
ERROR: test_category_page (blogengine.tests.PostViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 494, in test_category_page
    category_url = post.category.get_absolute_url()
AttributeError: 'Category' object has no attribute 'get_absolute_url'

======================================================================
FAIL: test_index (blogengine.tests.PostViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 391, in test_index
    self.assertTrue(post.category.name in response.content)
AssertionError: False is not true

======================================================================
FAIL: test_post_page (blogengine.tests.PostViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 446, in test_post_page
    self.assertTrue(post.category.name in response.content)
AssertionError: False is not true

----------------------------------------------------------------------
Ran 14 tests in 5.017s

FAILED (failures=2, errors=1)
Destroying test database for alias 'default'...
```

Let's take a look at why they failed. `test_category_page` failed because the `Category` object had no method `get_absolute_url`. So we need to implement one. To do so, we really need to add a slug field, like the posts already have. Ideally, we want this to be populated automatically, but with the option to create one manually. So, edit the models as follows:

```python
from django.db import models
from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.utils.text import slugify

# Create your models here.
class Category(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    slug = models.SlugField(max_length=40, unique=True, blank=True, null=True)

    def save(self):
        if not self.slug:
            self.slug = slugify(unicode(self.name))
        super(Category, self).save()

    def get_absolute_url(self):
        return "/category/%s/" % (self.slug)

    def __unicode__(self):
        return self.name

    class Meta:
        verbose_name_plural = 'categories'
    

class Post(models.Model):
    title = models.CharField(max_length=200)
    pub_date = models.DateTimeField()
    text = models.TextField()
    slug = models.SlugField(max_length=40, unique=True)
    author = models.ForeignKey(User)
    site = models.ForeignKey(Site)
    category = models.ForeignKey(Category, blank=True, null=True)

    def get_absolute_url(self):
        return "/%s/%s/%s/" % (self.pub_date.year, self.pub_date.month, self.slug)

    def __unicode__(self):
        return self.title

    class Meta:
        ordering = ["-pub_date"]
```

We're adding the `slug` attribute to the `Category` model here. However, we're also overriding the `save` method to detect if the slug is set, and if not, to create a slug using the `slugify` function, and set it as the category's slug. We also define an absolute URL for the category.

Now, if you run the tests, they will fail because we haven't made the changes to the database. So, we use South again:

```bash
$ python manage.py schemamigration --auto blogengine
```

Then run the migration:

```bash
$ python manage.py migrate
```

Now, running our tests will show that the tables are in place, but we still have some work to do. The index and post pages don't show our categories, so we'll fix that. First, we'll fix our post list:

```django
{% extends "blogengine/includes/base.html" %}

    {% load custom_markdown %}

    {% block content %}
        {% for post in object_list %}
        <div class="post">
        <h1><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h1>
        <h3>{{ post.pub_date }}</h3>
        {{ post.text|custom_markdown }}
        </div>
        <a href="{{ post.category.get_absolute_url }}">{{ post.category.name }}</a>
        {% endfor %}

        {% if page_obj.has_previous %}
        <a href="/{{ page_obj.previous_page_number }}/">Previous Page</a>
        {% endif %}
        {% if page_obj.has_next %}
        <a href="/{{ page_obj.next_page_number }}/">Next Page</a>
        {% endif %}

    {% endblock %}
```

Next, we'll take care of our post detail page:

```django
{% extends "blogengine/includes/base.html" %}

    {% load custom_markdown %}

    {% block content %}
        <div class="post">
        <h1>{{ object.title }}</h1>
        <h3>{{ object.pub_date }}</h3>
        {{ object.text|custom_markdown }}
        <a href="{{ object.category.get_absolute_url }}">{{ object.category.name }}</a>

        <h4>Comments</h4>
        <div class="fb-comments" data-href="http://{{ post.site }}{{ post.get_absolute_url }}" data-width="470" data-num-posts="10"></div>

        </div>

    {% endblock %}
```

Note that in both cases we include a link to the category URL.

Now, we should only have one failing test outstanding - the category page. For this, generic views aren't sufficient as we need to limit the queryset to only show those posts with a specific category. Fortunately, we can extend Django's generic views to add this functionality. First, we edit our URLconfs:

```python
from django.conf.urls import patterns, url
from django.views.generic import ListView, DetailView
from blogengine.models import Post, Category
from blogengine.views import CategoryListView

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

    # Categories
    url(r'^category/(?P<slug>[a-zA-Z0-9-]+)/?$', CategoryListView.as_view(
        paginate_by=5,
        model=Category,
        )),
)
```

Note we import a new view from `blogengine.views` called `CategoryListView`. Next, we create that listview:

```python
from django.shortcuts import render
from django.views.generic import ListView
from blogengine.models import Category, Post

# Create your views here.
class CategoryListView(ListView):
    def get_queryset(self):
        slug = self.kwargs['slug']
        try:
            category = Category.objects.get(slug=slug)
            return Post.objects.filter(category=category)
        except Category.DoesNotExist:
            return Post.objects.none()
```

This is quite simple. We import the `ListView`, as well as our models. Then we extend `ListView` by getting the slug from the request, fetching the appropriate category, and returning only those posts that have that category. If the category does not exist, we return the empty `Post` object list. We haven't had to set the template manually as it is inherited from `ListView`.

If you run the tests, they should now pass:

```bash
Creating test database for alias 'default'...
..............
----------------------------------------------------------------------
Ran 14 tests in 5.083s

OK
Destroying test database for alias 'default'...
```

So let's commit our changes:

```bash
$ git add blogengine/ templates/
$ git commit -m 'Categories are now shown'
```

Tags
----

Tags are fairly similar to categories, but more complex. The relationship they have is called *many-to-many* - in other words, a tag can be applied to many posts, and one post can have many tags. This is more difficult to model with a relational database. The usual way to do so is to create an intermediate table between the posts and tags, to identify mappings between the two. Fortunately, Django makes this quite easy.

Let's write the tests for our tagging system. As with the categories, we'll write the tests for creating and editing them first, and add in tests for them being visible later. First we'll create a test for creating a new tag object:

```python
    def test_create_tag(self):
        # Create the tag
        tag = Tag()

        # Add attributes
        tag.name = 'python'
        tag.description = 'The Python programming language'

        # Save it
        tag.save()

        # Check we can find it
        all_tags = Tag.objects.all()
        self.assertEquals(len(all_tags), 1)
        only_tag = all_tags[0]
        self.assertEquals(only_tag, tag)

        # Check attributes
        self.assertEquals(only_tag.name, 'python')
        self.assertEquals(only_tag.description, 'The Python programming language')
```

Next, we'll amend the test for creating a post to include tags:


```python
    def test_create_post(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

        # Create the tag
        tag = Tag()
        tag.name = 'python'
        tag.description = 'The Python programming language'
        tag.save()

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
        post.category = category

        # Save it
        post.save()

        # Add the tag
        post.tags.add(tag)
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
        self.assertEquals(only_post.category.name, 'python')
        self.assertEquals(only_post.category.description, 'The Python programming language')

        # Check tags
        post_tags = only_post.tags.all()
        self.assertEquals(len(post_tags), 1)
        only_post_tag = post_tags[0]
        self.assertEquals(only_post_tag, tag)
        self.assertEquals(only_post_tag.name, 'python')
        self.assertEquals(only_post_tag.description, 'The Python programming language')
```

Note the difference in how we apply the tags. Because a post can have more than one tag, we can't just define `post.tag` in the same way. Instead, we have `post.tags`, which you can think of as a list, and we use the `add` method to add a new tag. Note also that the post must already exist before we can add a tag.

We also need to create acceptance tests for creating, editing and deleting tags:

```python
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
        tag = Tag()
        tag.name = 'python'
        tag.description = 'The Python programming language'
        tag.save()

        # Log in
        self.client.login(username='bobsmith', password="password")

        # Edit the tag
        response = self.client.post('/admin/blogengine/tag/1/', {
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
        tag = Tag()
        tag.name = 'python'
        tag.description = 'The Python programming language'
        tag.save()

        # Log in
        self.client.login(username='bobsmith', password="password")

        # Delete the tag
        response = self.client.post('/admin/blogengine/tag/1/delete/', {
            'post': 'yes'
        }, follow=True)
        self.assertEquals(response.status_code, 200)

        # Check deleted successfully
        self.assertTrue('deleted successfully' in response.content)

        # Check tag deleted
        all_tags = Tag.objects.all()
        self.assertEquals(len(all_tags), 0)
```

These tests are virtually identical to those for the `Category` objects, as we plan for our `Tag` objects to be very similar. Finally, we need to amend the acceptance tests for `Post` objects to include a tag:

```python
    def test_create_post(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

        # Create the tag
        tag = Tag()
        tag.name = 'python'
        tag.description = 'The Python programming language'
        tag.save()

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
            'category': '1',
            'tags': '1'
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
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

        # Create the tag
        tag = Tag()
        tag.name = 'python'
        tag.description = 'The Python programming language'
        tag.save()

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
        post.tags.add(tag)
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
            'site': '1',
            'category': '1',
            'tags': '1'
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
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

        # Create the tag
        tag = Tag()
        tag.name = 'python'
        tag.description = 'The Python programming language'
        tag.save()

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
        post.category = category
        post.save()
        post.tags.add(tag)
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

        # Check post deleted
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 0)
```

Here we're just adding tags to our `Post` objects.

Now it's time to run our tests to make sure they fail as expected:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test blogengine
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
    from blogengine.models import Post, Category, Tag
ImportError: cannot import name Tag


----------------------------------------------------------------------
Ran 1 test in 0.000s

FAILED (errors=1)
Destroying test database for alias 'default'...
```

So here we can't import our `Tag` model, because we haven't created it. So, we'll do that:

```python
class Tag(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    slug = models.SlugField(max_length=40, unique=True, blank=True, null=True)

    def save(self):
        if not self.slug:
            self.slug = slugify(unicode(self.name))
        super(Tag, self).save()

    def get_absolute_url(self):
        return "/tag/%s/" % (self.slug)

    def __unicode__(self):
        return self.name
```

Our `Tag` model is very much like our `Category` model, but we don't need to change the `verbose_name_plural` value, and we amend the absolute URL to show it as a tag rather than a category.

We also need to amend our `Post` model to include a `tags` field:

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

    def get_absolute_url(self):
        return "/%s/%s/%s/" % (self.pub_date.year, self.pub_date.month, self.slug)

    def __unicode__(self):
        return self.title

    class Meta:
        ordering = ["-pub_date"]
```

Note that `tags` is a `ManyToManyField`, and we pass through the model we wish to use, much like we did with the categories. The difference is that one tag can be applied to many posts and a post can have many tags, so we need an intermediate database table to handle the relationship between the two. With Django's ORM we can handle this quickly and easily.

Run our tests and they should still fail:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test blogengine
Creating test database for alias 'default'...
.EE.EF.EE.EE......
======================================================================
ERROR: test_create_post (blogengine.tests.PostTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 64, in test_create_post
    tag.save()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/models.py", line 34, in save
    super(Tag, self).save()
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
OperationalError: no such table: blogengine_tag

======================================================================
ERROR: test_create_tag (blogengine.tests.PostTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 41, in test_create_tag
    tag.save()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/models.py", line 34, in save
    super(Tag, self).save()
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
OperationalError: no such table: blogengine_tag

======================================================================
ERROR: test_create_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 335, in test_create_post
    tag.save()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/models.py", line 34, in save
    super(Tag, self).save()
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
OperationalError: no such table: blogengine_tag

======================================================================
ERROR: test_delete_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 440, in test_delete_post
    tag.save()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/models.py", line 34, in save
    super(Tag, self).save()
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
OperationalError: no such table: blogengine_tag

======================================================================
ERROR: test_delete_tag (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 306, in test_delete_tag
    tag.save()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/models.py", line 34, in save
    super(Tag, self).save()
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
OperationalError: no such table: blogengine_tag

======================================================================
ERROR: test_edit_post (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 377, in test_edit_post
    tag.save()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/models.py", line 34, in save
    super(Tag, self).save()
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
OperationalError: no such table: blogengine_tag

======================================================================
ERROR: test_edit_tag (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 279, in test_edit_tag
    tag.save()
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/models.py", line 34, in save
    super(Tag, self).save()
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
OperationalError: no such table: blogengine_tag

======================================================================
FAIL: test_create_tag (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 256, in test_create_tag
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

----------------------------------------------------------------------
Ran 18 tests in 3.981s

FAILED (failures=1, errors=7)
Destroying test database for alias 'default'...
```

Again, we can easily see why they failed - the `blogengine_tag` table is not in place. So let's create and run our migrations to fix that:

```bash
$ python manage.py schemamigration --auto blogengine
$ python manage.py migrate
```

Now, we run our tests again:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test blogengine
Creating test database for alias 'default'...
.....F..F..F......
======================================================================
FAIL: test_create_tag (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 256, in test_create_tag
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

======================================================================
FAIL: test_delete_tag (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 315, in test_delete_tag
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

======================================================================
FAIL: test_edit_tag (blogengine.tests.AdminTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 289, in test_edit_tag
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

----------------------------------------------------------------------
Ran 18 tests in 5.124s

FAILED (failures=3)
Destroying test database for alias 'default'...
```

We can't yet amend our tags in the admin, because we haven't registered them. So we do that next:

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

admin.site.register(models.Category)
admin.site.register(models.Tag)
admin.site.register(models.Post, PostAdmin)
```

Now, if we run our tests, they should pass:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test blogengine
Creating test database for alias 'default'...
..................
----------------------------------------------------------------------
Ran 18 tests in 5.444s

OK
Destroying test database for alias 'default'...
```

Time to commit our changes:

```bash
$ git add blogengine/
$ git commit -m 'Implemented tags'
```

Now, like with the categories beforehand, we want to be able to show the tags applied to a post at the base of it, and list all posts for a specific tag. So, first of all, we'll amend our `PostViewTest` class to check for the tags:

```python
class PostViewTest(BaseAcceptanceTest):
    def test_index(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

        # Create the tag
        tag = Tag()
        tag.name = 'perl'
        tag.description = 'The Perl programming language'
        tag.save()

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
        post.category = category
        post.save()
        post.tags.add(tag)

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

        # Check the post category is in the response
        self.assertTrue(post.category.name in response.content)

        # Check the post tag is in the response
        post_tag = all_posts[0].tags.all()[0]
        self.assertTrue(post_tag.name in response.content)

        # Check the post date is in the response
        self.assertTrue(str(post.pub_date.year) in response.content)
        self.assertTrue(post.pub_date.strftime('%b') in response.content)
        self.assertTrue(str(post.pub_date.day) in response.content)

        # Check the link is marked up properly
        self.assertTrue('<a href="http://127.0.0.1:8000/">my first blog post</a>' in response.content)

    def test_post_page(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

        # Create the tag
        tag = Tag()
        tag.name = 'perl'
        tag.description = 'The Perl programming language'
        tag.save()

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
        post.category = category
        post.save()
        post.tags.add(tag)
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

        # Check the post category is in the response
        self.assertTrue(post.category.name in response.content)

        # Check the post tag is in the response
        post_tag = all_posts[0].tags.all()[0]
        self.assertTrue(post_tag.name in response.content)

        # Check the post text is in the response
        self.assertTrue(markdown.markdown(post.text) in response.content)

        # Check the post date is in the response
        self.assertTrue(str(post.pub_date.year) in response.content)
        self.assertTrue(post.pub_date.strftime('%b') in response.content)
        self.assertTrue(str(post.pub_date.day) in response.content)

        # Check the link is marked up properly
        self.assertTrue('<a href="http://127.0.0.1:8000/">my first blog post</a>' in response.content)
```

We create a tag near the top, and check for the text in the page (note that to avoid false positives from the categories, we set the name of the tags to something different). We do this on both the index and post pages.

We also need to put a test in place for the tag-specific page:

```python
    def test_tag_page(self):
        # Create the tag
        tag = Tag()
        tag.name = 'python'
        tag.description = 'The Python programming language'
        tag.save()

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
        post.tags.add(tag)

        # Check new post saved
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)
        only_post = all_posts[0]
        self.assertEquals(only_post, post)

        # Get the tag URL
        tag_url = post.tags.all()[0].get_absolute_url()

        # Fetch the tag
        response = self.client.get(tag_url)
        self.assertEquals(response.status_code, 200)

        # Check the tag name is in the response
        self.assertTrue(post.tags.all()[0].name in response.content)

        # Check the post text is in the response
        self.assertTrue(markdown.markdown(post.text) in response.content)

        # Check the post date is in the response
        self.assertTrue(str(post.pub_date.year) in response.content)
        self.assertTrue(post.pub_date.strftime('%b') in response.content)
        self.assertTrue(str(post.pub_date.day) in response.content)

        # Check the link is marked up properly
        self.assertTrue('<a href="http://127.0.0.1:8000/">my first blog post</a>' in response.content)
```

Again, this is virtually identical to the category page, adjusted to allow for the fact that we need to get a specific tag. If we now run our tests, they should fail as expected:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test blogengine
Creating test database for alias 'default'...
................FFF
======================================================================
FAIL: test_index (blogengine.tests.PostViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 540, in test_index
    self.assertTrue(post_tag.name in response.content)
AssertionError: False is not true

======================================================================
FAIL: test_post_page (blogengine.tests.PostViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 607, in test_post_page
    self.assertTrue(post_tag.name in response.content)
AssertionError: False is not true

======================================================================
FAIL: test_tag_page (blogengine.tests.PostViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 714, in test_tag_page
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

----------------------------------------------------------------------
Ran 19 tests in 5.375s

FAILED (failures=3)
Destroying test database for alias 'default'...
```

So, we need to implement the following things:

* Show tags on the index page
* Show tags on the post pages
* Create a page listing the posts with a specific tag

As we have seen already with the categories, this is actually quite simple. First, we'll sort out the tags on the index page:

```django
{% extends "blogengine/includes/base.html" %}

    {% load custom_markdown %}

    {% block content %}
        {% for post in object_list %}
        <div class="post">
        <h1><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h1>
        <h3>{{ post.pub_date }}</h3>
        {{ post.text|custom_markdown }}
        </div>
        <a href="{{ post.category.get_absolute_url }}">{{ post.category.name }}</a>
        {% for tag in post.tags.all %}
        <a href="{{ tag.get_absolute_url }}">{{ tag.name }}</a>
        {% endfor %}
        {% endfor %}

        {% if page_obj.has_previous %}
        <a href="/{{ page_obj.previous_page_number }}/">Previous Page</a>
        {% endif %}
        {% if page_obj.has_next %}
        <a href="/{{ page_obj.next_page_number }}/">Next Page</a>
        {% endif %}

    {% endblock %}
```

This is quite simple. We retrieve all the tags with `post.tags.all` and loop through them. We then do basically the same for the individual post pages:

```django
{% extends "blogengine/includes/base.html" %}

    {% load custom_markdown %}

    {% block content %}
        <div class="post">
        <h1>{{ object.title }}</h1>
        <h3>{{ object.pub_date }}</h3>
        {{ object.text|custom_markdown }}
        <a href="{{ object.category.get_absolute_url }}">{{ object.category.name }}</a>
        {% for tag in post.tags.all %}
        <a href="{{ tag.get_absolute_url }}">{{ tag.name }}</a>
        {% endfor %}

        <h4>Comments</h4>
        <div class="fb-comments" data-href="http://{{ post.site }}{{ post.get_absolute_url }}" data-width="470" data-num-posts="10"></div>

        </div>

    {% endblock %}

```

This should resolve two of our outstanding tests:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test blogengine
Creating test database for alias 'default'...
..................F
======================================================================
FAIL: test_tag_page (blogengine.tests.PostViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 714, in test_tag_page
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

----------------------------------------------------------------------
Ran 19 tests in 5.440s

FAILED (failures=1)
Destroying test database for alias 'default'...
```

The final test is for the tag pages. As we saw with the categories, we can limit our querysets on specific pages. So we'll extend the `ListView` generic view again to handle tags:

```python
from django.shortcuts import render
from django.views.generic import ListView
from blogengine.models import Category, Post, Tag

# Create your views here.
class CategoryListView(ListView):
    def get_queryset(self):
        slug = self.kwargs['slug']
        try:
            category = Category.objects.get(slug=slug)
            return Post.objects.filter(category=category)
        except Category.DoesNotExist:
            return Post.objects.none()


class TagListView(ListView):
    def get_queryset(self):
        slug = self.kwargs['slug']
        try:
            tag = Tag.objects.get(slug=slug)
            return tag.post_set.all()
        except Tag.DoesNotExist:
            return Post.objects.none()
```

Note that here, `Tag` objects have access to their assigned `Post` objects - we just use `post_set` to refer to them and get all of the posts associated with that tag. Next we'll add the URLconfs:

```python
from django.conf.urls import patterns, url
from django.views.generic import ListView, DetailView
from blogengine.models import Post, Category, Tag
from blogengine.views import CategoryListView, TagListView

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

    # Categories
    url(r'^category/(?P<slug>[a-zA-Z0-9-]+)/?$', CategoryListView.as_view(
        paginate_by=5,
        model=Category,
        )),

    # Tags
    url(r'^tag/(?P<slug>[a-zA-Z0-9-]+)/?$', TagListView.as_view(
        paginate_by=5,
        model=Tag,
        )),
)
```

We import the `Tag` model and the `TagListView` view, and use them to set up the tag page.

If we now run our tests again, they should pass:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test blogengine
Creating test database for alias 'default'...
...................
----------------------------------------------------------------------
Ran 19 tests in 5.473s

OK
Destroying test database for alias 'default'...
```

Well done! Time to commit:

```bash
$ git add templates/ blogengine/
$ git commit -m 'Tags are now shown'
```

RSS Feed
--------

For the final task today, we'll implement an RSS feed for our posts. Django ships with a handy syndication framework that makes it easy to implement this kind of functionality.

As usual, we'll create some tests first. In this case, we won't be adding any new models, so we don't need to test them. Instead we can jump straight into creating acceptance tests for our feed. For now we'll just create one type of feed: a feed of all the blog posts. In a later instalment we'll add feeds for categories and tags.

First of all, we'll implement our test. Now, in order to test our feed, we need to have a solution in place for parsing an RSS feed. Django won't do this natively, so we'll install the `feedparser` Python module. Run the following commands:

```bash
$ pip install feedparser
$ pip freeze > requirements.txt
```

Once that's done, feedparser should be available. You may wish to refer to the [documentation](http://pythonhosted.org/feedparser/) as we go to help.

Let's write our test for the RSS feed. First, we import feedparser near the top of the file:

```python
import feedparser
```

Then we define a new class for our feed tests. Put this towards the end of the file - I put it just before the flat page tests:

```python
class FeedTest(BaseAcceptanceTest):
    def test_all_post_feed(self):
        # Create the category
        category = Category()
        category.name = 'python'
        category.description = 'The Python programming language'
        category.save()

        # Create the tag
        tag = Tag()
        tag.name = 'python'
        tag.description = 'The Python programming language'
        tag.save()

        # Create the author
        author = User.objects.create_user('testuser', 'user@example.com', 'password')
        author.save()

        # Create the site
        site = Site()
        site.name = 'example.com'
        site.domain = 'example.com'
        site.save()
 
        # Create a post
        post = Post()
        post.title = 'My first post'
        post.text = 'This is my first blog post'
        post.slug = 'my-first-post'
        post.pub_date = timezone.now()
        post.author = author
        post.site = site
        post.category = category

        # Save it
        post.save()

        # Add the tag
        post.tags.add(tag)
        post.save()

        # Check we can find it
        all_posts = Post.objects.all()
        self.assertEquals(len(all_posts), 1)
        only_post = all_posts[0]
        self.assertEquals(only_post, post)

        # Fetch the feed
        response = self.client.get('/feeds/posts/')
        self.assertEquals(response.status_code, 200)

        # Parse the feed
        feed = feedparser.parse(response.content)

        # Check length
        self.assertEquals(len(feed.entries), 1)

        # Check post retrieved is the correct one
        feed_post = feed.entries[0]
        self.assertEquals(feed_post.title, post.title)
        self.assertEquals(feed_post.description, post.text)
```

Run the tests and you'll see something like this:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test blogengine
Creating test database for alias 'default'...
..............F.....
======================================================================
FAIL: test_all_post_feed (blogengine.tests.FeedTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/django_tutorial_blog_ng/blogengine/tests.py", line 781, in test_all_post_feed
    self.assertEquals(response.status_code, 200)
AssertionError: 404 != 200

----------------------------------------------------------------------
Ran 20 tests in 6.743s

FAILED (failures=1)
Destroying test database for alias 'default'...
```

We're getting a 404 error because the post feed isn't implemented. So let's implement it. We're going to use Django's syndication framework, which will make it easy, but we need to enable it. Open up `django_tutorial_blog_ng/settings/py` and add the following under `INSTALLED_APPS`:

```python
    'django.contrib.syndication',
```

Next, we need to enable the URLconf for this RSS feed. Open up `blogengine/urls.py and amend the import from `blogengine.views` near the top:

```python
from blogengine.views import CategoryListView, TagListView, PostsFeed
```

Further down, add in the following code to define the URL for the feed:

```python
    # Post RSS feed
    url(r'^feeds/posts/$', PostsFeed()),
```

Note that we imported the PostsFeed class, but that hasn't yet been defined. So we need to do that. First of all, add this line near the top:

```python
from django.contrib.syndication.views import Feed
```

This imports the syndication views - yes, they're another generic view! Our `PostsFeed` class is going to inherit from `Feed`. Next, we define the class:

```python
class PostsFeed(Feed):
    title = "RSS feed - posts"
    link = "feeds/posts/"
    description = "RSS feed - blog posts"

    def items(self):
        return Post.objects.order_by('-pub_date')

    def item_title(self, item):
        return item.title

    def item_description(self, item):
        return item.text
```

This is fairly straightforward. We define our title, link, and description for the feed inside the class definition. We define the `items` method which sets what items are returned by the RSS feed. We also define the `item_title` and `item_description` methods.

Now, if we run our tests, they should pass:

```bash
(venv)Smith:django_tutorial_blog_ng matthewdaly$ python manage.py test blogengine
Creating test database for alias 'default'...
....................
----------------------------------------------------------------------
Ran 20 tests in 5.933s

OK
Destroying test database for alias 'default'...
```

Let's commit our changes:

```bash
$ git add blogengine/ django_tutorial_blog_ng/ requirements.txt
$ git commit -m 'RSS feed implemented'
```

And that's enough for now. Don't forget, you can get the code for this lesson by cloning the repository from [Github](https://github.com/matthewbdaly/django_tutorial_blog_ng) and running `git checkout lesson-4` to switch to this lesson.

Next time we'll:

* Implement a search system
* Add feeds for categories and posts
* Tidy up the user interface

Hope to see you then!
