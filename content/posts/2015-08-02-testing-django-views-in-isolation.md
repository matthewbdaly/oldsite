---
title: "Testing Django views in isolation"
date: 2015-08-02 17:58:45 +0100
categories: 
- python
- django
- tdd
---

One thing you may hear said often about test-driven development is that as far as possible, you should test everything in isolation. However. it's not always immediately clear how you actually go about doing this. In Django, it's fairly easy to get your head around testing models in isolation because they're single objects that you can just create, save, and then check their attributes. Forms are also quite easy to test, because you can just set the parameters with the appropriate values and check that the validation works as expected. With views, it's much harder to imagine how you'd go about testing them in isolation, and often people just settle for writing higher-level functional tests instead. While functional tests are important, they're also slower than unit tests, which makes it less likely they'll be run often. So I thought I'd show you a quick and simple example of testing a Django view in isolation.

One of the little projects I've written in the past to help get my head around certain aspects of Django is a code-snippet sharing Django application which I named [Snippetr](https://github.com/matthewbdaly/snippetr). The index route of this application is a form for submitting a brand-new code snippet and I'll show you how we would write a test for that.

Testing a GET request
---------------------

Before now, you may well have used the Django test client to test views. That is fine for higher-level tests, but if you want to test a view in isolation, it's no use because it emulates a real web server and all of the middleware and authentication, which we want to keep out of the way. Instead, we need to use `RequestFactory`:

```python
from django.test import RequestFactory
```

`RequestFactory` actually implements a subset of the functionality of the Django test client, so while it will feel somewhat familiar, it won't have all the same functionality. For instance, it doesn't support middleware, so rather than logging in using the test client's `login()` method, you instead attach a user directly to the request, as in this example:

```python
request = RequestFactory()
request.user = user
```

You have to specify the URL in the request, but you also have to explicitly pass the request through to the view you want to test, which can be a bit confusing. Let's see it in context. First of all, we want to write a test for making a GET request:

```python
class SnippetCreateViewTest(TestCase):
    """
    Test the snippet create view
    """
    def setUp(self):
        self.user = UserFactory()
        self.factory = RequestFactory()

    def test_get(self):
        """
        Test GET requests
        """
        request = self.factory.get(reverse('snippet_create'))
        request.user = self.user
        response = SnippetCreateView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context_data['user'], self.user)
        self.assertEqual(response.context_data['request'], request)
```

First of all, we define a `setUp()` method that creates a user and an instance of `RequestFactory()` for use in the test. Note that I'm using Factory Boy to define `UserFactory` in order to make it easier to work with. Also, if you have more than one view to test, you should create a base class containing the `setUp()` method that your view tests inherit from.

Next, we have our test for making a GET request. Note that we're using the `reverse()` method to get the route for the view named `snippet_create`. You'll need to import this as follows if you're not yet using it:

```python
from django.core.urlresolvers import reverse
```

We then attach our user object to the request manually, and fetch the response by passing the request to the view as follows:

```python
    response = SnippetCreateView.as_view()(request)
```

Note that this is the syntax used for class-based views - we call the view's `as_view()` method. For a function-based view, the syntax is a bit simpler:

```python
    response = my_view(request)
```

We then test our response as usual. In this case, the view adds some additional context data, and we check that we can access that, as well as checking the status code.

Testing a POST request
----------------------

Testing a POST request is a little more challenging in this case because submitting the form will create a new `Snippet` object and we don't want to interact with the model layer at all if we can help it. We want to test the view in isolation, partly because it will be faster, and partly because it's a good idea. We can do this by mocking the `Snippet` model's `save()` method.

To do so, we need to import two things from the `mock` library. If you're using Python 3.4 or later, then `mock` is part of `unittest` as `unittest.mock`. Otherwise, it's a separate library you need to install with `pip`. Here's the import statement for those on Python 3.4 or later:

```python
from unittest.mock import patch, MagicMock
```

And for those on earlier versions:

```python
from mock import patch, MagicMock
```

Now, our test for the POST requests should look like this:

```python
    @patch('snippets.models.Snippet.save', MagicMock(name="save"))
    def test_post(self):
        """
        Test post requests
        """
        # Create the request
        data = {
            'title': 'My snippet',
            'content': 'This is my snippet'
        }
        request = self.factory.post(reverse('snippet_create'), data)
        request.user = self.user

        # Get the response
        response = SnippetCreateView.as_view()(request)
        self.assertEqual(response.status_code, 302)

        # Check save was called
        self.assertTrue(Snippet.save.called)
        self.assertEqual(Snippet.save.call_count, 1)
```

Note first of all the following line:

```python
    @patch('snippets.models.Snippet.save', MagicMock(name="save"))
```

Here we're saying that in this test, when the `save()` method of the `Snippet` model is called, it should instead call a mocked version, which lacks the functionality and only registers that it has been called and a few details about it.

Next, we put together the data to be passed through and create a POST request for it. As before, we attach the user to the request. We then pass the request through in the same way as for the GET request. We also check that the response code was 302, meaning that the user would be redirected elsewhere after the form was submitted correctly.

Finally, we assert that `Snippet.save.called` is true. `called` is a Boolean value, representing whether the method was called or not. We also check the value of `Snippet.save.call_count`, which is a count of the number of times the method was called - here we check that it's set to 1.

As you can see, while the request factory is a little harder than the Django test client to figure out, it's not too difficult once you get the hang of it. By combining it with judicious use of `mock`, you can easily test your views in isolation, and without having to interact with the database or set up any middleware, these tests will be much faster than those using the Django test client.
