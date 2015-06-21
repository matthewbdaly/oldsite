---
title: "Getting django-behave and Celery to work together"
date: 2015-06-17 20:34:08 +0100
categories:
- python
- django
- behave
- celery
---

I ran into a small issue today. I'm working on a Django app which uses Celery to handle certain tasks that don't need to return a response within the context of the HTTP request. I also wanted to use `django_behave` for running BDD tests. The trouble is that both `django_behave` and Celery provide their own custom test runners that extend the default Django test runner, and so it looked like I might have to choose between the two.

However, it turned out that the Celery one was actually very simple, with only a handful of changes needing to be made to the default test runner to make it work with Celery. I was therefore able to create my own custom test runner that inherited from `DjangoBehaveTestSuiteRunner` and applied the changes necessary to get Celery working with it. Here is the test runner I wrote, which was saved as `myproject/runner.py`:

```python
from django.conf import settings
from djcelery.contrib.test_runner import _set_eager
from django_behave.runner import DjangoBehaveTestSuiteRunner

class CeleryAndBehaveRunner(DjangoBehaveTestSuiteRunner):
    def setup_test_environment(self, **kwargs):
        _set_eager()
        settings.BROKER_BACKEND = 'memory'
        super(CeleryAndBehaveRunner, self).setup_test_environment(**kwargs)
```

To use it, you need to set the test runner in `settings.py`

```python
TEST_RUNNER = 'myproject.runner.CeleryAndBehaveRunner'
```

Once that was done, my tests worked flawlessly with Celery, and the Behave tests ran as expected.
