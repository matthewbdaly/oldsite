---
title: "Building a location aware web app with GeoDjango"
date: 2016-03-26 13:21:29 +0000
categories:
- python
- django
- tdd
- postgres
- geo
- geodjango
comments: true
draft: true
---

PostgreSQL has excellent support for geographical data thanks to the PostGIS extension, and Django allows you to take full advantage of it. In this tutorial, I'll show you how to build a web app that allows users to search for gigs and events near them.

Requirements
------------

I've made the jump to Python 3, and if you haven't done so yet, I highly recommend it - it's not hard, and there's very few modules left that haven't been ported across. As such, this tutorial assumes you're using Python 3. You'll also need to have Git, PostgreSQL and PostGIS installed - I'll leave the details of doing so up to you as it varies by platform, but you can generally do so easily with a package manager on most Linux distros. On Mac OS X I recommend using Homebrew. If you're on Windows I think your best bet is probably to use a Vagrant VM.

We'll be using Django 1.9 - if by the time you read this a newer version of Django is out, it's quite possible that some things may have changed and you'll need to work around any problems caused. Generally search engines are the best place to look for this, and I'll endeavour to keep the resulting Github repository as up to date as I can, so try those if you get stuck.

Getting started
---------------

First of all, let's create our database. Make sure you're running as a user that has the required privileges to create users and databases for PostgreSQL and run the following command:

```bash
$ createdb gigfinder
```

This creates the database. Next, we create the user:

```bash
$ createuser -s giguser -P
```

You'll be prompted to enter a password for the new user. Next, we want to use the `psql` command-line client to interact with our new database:

```bash
$ psql gigfinder
```

This connects to the database. First, run this command to set up access to the database:

```sql
gigfinder=# GRANT ALL PRIVILEGES ON DATABASE gigfinder TO giguser;
```

Next, let's install the PostGIS extension:

```sql
gigfinder=# CREATE EXTENSION postgis;
```

Finally, disconnect with `\q`.

With our database set up, it's time to start work on our project. Let's create our virtualenv in a new folder:

```bash
$ pyvenv venv
```

Then activate it:

```bash
$ source venv/bin/activate
```

Then we install Django, along with our dependencies for hosting it on Heroku:

```bash
$ pip install django-toolbelt
```

And record our dependencies:

```bash
$ pip freeze > requirements.txt
```

Next, we create our application skeleton:

```bash
$ django-admin.py startproject gigfinder .
```

We'll also create a `.gitignore` file:

```bash
venv/
.DS_Store
*.swp
node_modules/
*.pyc
```

Let's commit our changes:

```bash
$ git init
$ git add .gitignore requirements/txt manage.py gigfinder
$ git commit -m 'Initial commit'
```

Next, let's create our first app, which we will call `gigs`:

```bash
$ python manage.py startapp gigs
```

We need to add our new app to the `INSTALLED_APPS` setting. While we're there we'll also add GIS support and set up the database connection. First, add the required apps to `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
	...
    'django.contrib.gis',
    'gigs',
]
```

Next, configure the database:

```python
DATABASES = {
    'default': {
         'ENGINE': 'django.contrib.gis.db.backends.postgis',
         'NAME': 'gigfinder',
         'USER': 'giguser',
         'PASSWORD': 'password',
    },
}
```

Let's run the migrations:

```bash
$ python manage.py migrate
Operations to perform:
  Apply all migrations: sessions, contenttypes, admin, auth
Running migrations:
  Rendering model states... DONE
  Applying contenttypes.0001_initial... OK
  Applying auth.0001_initial... OK
  Applying admin.0001_initial... OK
  Applying admin.0002_logentry_remove_auto_add... OK
  Applying contenttypes.0002_remove_content_type_name... OK
  Applying auth.0002_alter_permission_name_max_length... OK
  Applying auth.0003_alter_user_email_max_length... OK
  Applying auth.0004_alter_user_username_opts... OK
  Applying auth.0005_alter_user_last_login_null... OK
  Applying auth.0006_require_contenttypes_0002... OK
  Applying auth.0007_alter_validators_add_error_messages... OK
  Applying sessions.0001_initial... OK
```

And create our superuser account:

```bash
$ python manage.py createsuperuser
```

Now, we'll commit our changes:

```bash
$ git add gigfinder/ gigs/
$ git commit -m 'Created gigs app'
[master e72a846] Created gigs app
 8 files changed, 24 insertions(+), 3 deletions(-)
 create mode 100644 gigs/__init__.py
 create mode 100644 gigs/admin.py
 create mode 100644 gigs/apps.py
 create mode 100644 gigs/migrations/__init__.py
 create mode 100644 gigs/models.py
 create mode 100644 gigs/tests.py
 create mode 100644 gigs/views.py
```

Our first model
---------------

At this point, it's worth thinking about the models we plan for our app to have. First we'll have a `Venue` model that contains details of an individual venue, which will include a name and a geographical location. We'll also have an `Event` model that will represent an individual gig or event at a venue, and will include a name, date/time and a venue as a foreign key.

Before we start writing our first model, we need to write a test for it, but we also need to be able to create objects easily in our tests. We also want to be able to easily examine our objects, so we'll install iPDB and Factory Boy:

```bash
$ pip install ipdb factory-boy
$ pip freeze > requirements.txt
```

Next, we write a test for the `Venue` model:

```python
from django.test import TestCase
from gigs.models import Venue
from factory.fuzzy import BaseFuzzyAttribute
from django.contrib.gis.geos import Point
import factory.django, random

class FuzzyPoint(BaseFuzzyAttribute):
    def fuzz(self):
        return Point(random.uniform(-180.0, 180.0),
                     random.uniform(-90.0, 90.0))

# Factories for tests
class VenueFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Venue
        django_get_or_create = (
            'name',
            'location'
        )

    name = 'Wembley Arena'
    location = FuzzyPoint()

class VenueTest(TestCase):
    def test_create_venue(self):
        # Create the venue
        venue = VenueFactory()

        # Check we can find it
        all_venues = Venue.objects.all()
        self.assertEqual(len(all_venues), 1)
        only_venue = all_venues[0]
        self.assertEqual(only_venue, venue)

        # Check attributes
        self.assertEqual(only_venue.name, 'Wembley Arena')
```

Note that we randomly generate our location - this is done as suggested in [this Stack Overflow post](http://stackoverflow.com/questions/32828890/using-factory-boy-with-geodjango-pointfields).

Now, running our tests brings up an expected error:

```bash
$ python manage.py test gigs
Creating test database for alias 'default'...
E
======================================================================
ERROR: gigs.tests (unittest.loader._FailedTest)
----------------------------------------------------------------------
ImportError: Failed to import test module: gigs.tests
Traceback (most recent call last):
  File "/usr/local/Cellar/python3/3.5.1/Frameworks/Python.framework/Versions/3.5/lib/python3.5/unittest/loader.py", line 428, in _find_test_path
    module = self._get_module_from_name(name)
  File "/usr/local/Cellar/python3/3.5.1/Frameworks/Python.framework/Versions/3.5/lib/python3.5/unittest/loader.py", line 369, in _get_module_from_name
    __import__(name)
  File "/Users/matthewdaly/Projects/gigfinder/gigs/tests.py", line 2, in <module>
    from gigs.models import Venue
ImportError: cannot import name 'Venue'


----------------------------------------------------------------------
Ran 1 test in 0.001s

FAILED (errors=1)
Destroying test database for alias 'default'...
```

Let's create our `Venue` model in `gigs/models.py`:

```python
from django.contrib.gis.db import models

class Venue(models.Model):
    """
    Model for a venue
    """
    pass
```

For now, we're just creating a simple dummy model. Note that we import `models` from `django.contrib.gis.db` instead of the usual place - this gives us access to the additional geographical fields.

If we run our tests again we get an error:

```bash
$ python manage.py test gigs
Creating test database for alias 'default'...
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/backends/utils.py", line 64, in execute
    return self.cursor.execute(sql, params)
psycopg2.ProgrammingError: relation "gigs_venue" does not exist
LINE 1: SELECT "gigs_venue"."id" FROM "gigs_venue" ORDER BY "gigs_ve...
                                      ^


The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "manage.py", line 10, in <module>
    execute_from_command_line(sys.argv)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/management/__init__.py", line 353, in execute_from_command_line
    utility.execute()
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/management/__init__.py", line 345, in execute
    self.fetch_command(subcommand).run_from_argv(self.argv)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/management/commands/test.py", line 30, in run_from_argv
    super(Command, self).run_from_argv(argv)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/management/base.py", line 348, in run_from_argv
    self.execute(*args, **cmd_options)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/management/commands/test.py", line 74, in execute
    super(Command, self).execute(*args, **options)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/management/base.py", line 399, in execute
    output = self.handle(*args, **options)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/management/commands/test.py", line 90, in handle
    failures = test_runner.run_tests(test_labels)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/test/runner.py", line 532, in run_tests
    old_config = self.setup_databases()
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/test/runner.py", line 482, in setup_databases
    self.parallel, **kwargs
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/test/runner.py", line 726, in setup_databases
    serialize=connection.settings_dict.get("TEST", {}).get("SERIALIZE", True),
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/backends/base/creation.py", line 78, in create_test_db
    self.connection._test_serialized_contents = self.serialize_db_to_string()
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/backends/base/creation.py", line 122, in serialize_db_to_string
    serializers.serialize("json", get_objects(), indent=None, stream=out)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/serializers/__init__.py", line 129, in serialize
    s.serialize(queryset, **options)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/serializers/base.py", line 79, in serialize
    for count, obj in enumerate(queryset, start=1):
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/backends/base/creation.py", line 118, in get_objects
    for obj in queryset.iterator():
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/models/query.py", line 52, in __iter__
    results = compiler.execute_sql()
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/models/sql/compiler.py", line 848, in execute_sql
    cursor.execute(sql, params)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/backends/utils.py", line 64, in execute
    return self.cursor.execute(sql, params)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/utils.py", line 95, in __exit__
    six.reraise(dj_exc_type, dj_exc_value, traceback)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/utils/six.py", line 685, in reraise
    raise value.with_traceback(tb)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/backends/utils.py", line 64, in execute
    return self.cursor.execute(sql, params)
django.db.utils.ProgrammingError: relation "gigs_venue" does not exist
LINE 1: SELECT "gigs_venue"."id" FROM "gigs_venue" ORDER BY "gigs_ve...
```

Let's update our model:

```python
from django.contrib.gis.db import models

class Venue(models.Model):
    """
    Model for a venue
    """
    name = models.CharField(max_length=200)
    location = models.PointField()
```

Then create our migration:

```bash
$ python manage.py makemigrations
Migrations for 'gigs':
  0001_initial.py:
    - Create model Venue
```

And run it:

```bash
$ python manage.py migrate
Operations to perform:
  Apply all migrations: gigs, sessions, contenttypes, auth, admin
Running migrations:
  Rendering model states... DONE
  Applying gigs.0001_initial... OK
```

Then if we run our tests:

```bash
$ python manage.py test gigs
Creating test database for alias 'default'...
.
----------------------------------------------------------------------
Ran 1 test in 0.362s

OK
Destroying test database for alias 'default'...
```

They should pass. Note that Django may complain about needing to delete the test database before running the tests, but this should not cause any problems. Let's commit our changes:

```bash
$ git add requirements.txt gigs/
$ git commit -m 'Venue model in place'
```

With our venue done, let's turn to our `Event` model. Amend `gigs/models.py` as follows:

```python
from django.test import TestCase
from gigs.models import Venue, Event
from factory.fuzzy import BaseFuzzyAttribute
from django.contrib.gis.geos import Point
import factory.django, random
from django.utils import timezone

class FuzzyPoint(BaseFuzzyAttribute):
    def fuzz(self):
        return Point(random.uniform(-180.0, 180.0),
                     random.uniform(-90.0, 90.0))

# Factories for tests
class VenueFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Venue
        django_get_or_create = (
            'name',
            'location'
        )

    name = 'Wembley Arena'
    location = FuzzyPoint()

class EventFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Event
        django_get_or_create = (
            'name',
            'venue',
            'datetime'
        )

    name = 'Queens of the Stone Age'
    datetime = timezone.now()

class VenueTest(TestCase):
    def test_create_venue(self):
        # Create the venue
        venue = VenueFactory()

        # Check we can find it
        all_venues = Venue.objects.all()
        self.assertEqual(len(all_venues), 1)
        only_venue = all_venues[0]
        self.assertEqual(only_venue, venue)

        # Check attributes
        self.assertEqual(only_venue.name, 'Wembley Arena')


class EventTest(TestCase):
    def test_create_event(self):
        # Create the venue
        venue = VenueFactory()

        # Create the event
        event = EventFactory(venue=venue)

        # Check we can find it
        all_events = Event.objects.all()
        self.assertEqual(len(all_events), 1)
        only_event = all_events[0]
        self.assertEqual(only_event, event)

        # Check attributes
        self.assertEqual(only_event.name, 'Queens of the Stone Age')
        self.assertEqual(only_event.venue.name, 'Wembley Arena')
```

Then we run our tests:

```bash
$ python manage.py test gigs
Creating test database for alias 'default'...
E
======================================================================
ERROR: gigs.tests (unittest.loader._FailedTest)
----------------------------------------------------------------------
ImportError: Failed to import test module: gigs.tests
Traceback (most recent call last):
  File "/usr/local/Cellar/python3/3.5.1/Frameworks/Python.framework/Versions/3.5/lib/python3.5/unittest/loader.py", line 428, in _find_test_path
    module = self._get_module_from_name(name)
  File "/usr/local/Cellar/python3/3.5.1/Frameworks/Python.framework/Versions/3.5/lib/python3.5/unittest/loader.py", line 369, in _get_module_from_name
    __import__(name)
  File "/Users/matthewdaly/Projects/gigfinder/gigs/tests.py", line 2, in <module>
    from gigs.models import Venue, Event
ImportError: cannot import name 'Event'


----------------------------------------------------------------------
Ran 1 test in 0.001s

FAILED (errors=1)
Destroying test database for alias 'default'...
```

As expected, this fails, so create an empty `Event` model in `gigs/models.py`:

```python
class Event(models.Model):
    """
    Model for an event
    """
    pass
```

Running the tests now will raise an error due to the table not existing:

```bash
$ python manage.py test gigs
Creating test database for alias 'default'...
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/backends/utils.py", line 64, in execute
    return self.cursor.execute(sql, params)
psycopg2.ProgrammingError: relation "gigs_event" does not exist
LINE 1: SELECT "gigs_event"."id" FROM "gigs_event" ORDER BY "gigs_ev...
                                      ^


The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "manage.py", line 10, in <module>
    execute_from_command_line(sys.argv)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/management/__init__.py", line 353, in execute_from_command_line
    utility.execute()
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/management/__init__.py", line 345, in execute
    self.fetch_command(subcommand).run_from_argv(self.argv)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/management/commands/test.py", line 30, in run_from_argv
    super(Command, self).run_from_argv(argv)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/management/base.py", line 348, in run_from_argv
    self.execute(*args, **cmd_options)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/management/commands/test.py", line 74, in execute
    super(Command, self).execute(*args, **options)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/management/base.py", line 399, in execute
    output = self.handle(*args, **options)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/management/commands/test.py", line 90, in handle
    failures = test_runner.run_tests(test_labels)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/test/runner.py", line 532, in run_tests
    old_config = self.setup_databases()
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/test/runner.py", line 482, in setup_databases
    self.parallel, **kwargs
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/test/runner.py", line 726, in setup_databases
    serialize=connection.settings_dict.get("TEST", {}).get("SERIALIZE", True),
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/backends/base/creation.py", line 78, in create_test_db
    self.connection._test_serialized_contents = self.serialize_db_to_string()
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/backends/base/creation.py", line 122, in serialize_db_to_string
    serializers.serialize("json", get_objects(), indent=None, stream=out)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/serializers/__init__.py", line 129, in serialize
    s.serialize(queryset, **options)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/serializers/base.py", line 79, in serialize
    for count, obj in enumerate(queryset, start=1):
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/backends/base/creation.py", line 118, in get_objects
    for obj in queryset.iterator():
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/models/query.py", line 52, in __iter__
    results = compiler.execute_sql()
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/models/sql/compiler.py", line 848, in execute_sql
    cursor.execute(sql, params)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/backends/utils.py", line 64, in execute
    return self.cursor.execute(sql, params)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/utils.py", line 95, in __exit__
    six.reraise(dj_exc_type, dj_exc_value, traceback)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/utils/six.py", line 685, in reraise
    raise value.with_traceback(tb)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/db/backends/utils.py", line 64, in execute
    return self.cursor.execute(sql, params)
django.db.utils.ProgrammingError: relation "gigs_event" does not exist
LINE 1: SELECT "gigs_event"."id" FROM "gigs_event" ORDER BY "gigs_ev...
```

So let's populate our model:

```python
class Event(models.Model):
    """
    Model for an event
    """
    name = models.CharField(max_length=200)
    datetime = models.DateTimeField()
    venue = models.ForeignKey(Venue)
```

And create our migration:

```bash
$ python manage.py makemigrations
Migrations for 'gigs':
  0002_event.py:
    - Create model Event
```

And run it:

```bash
$ python manage.py migrate
Operations to perform:
  Apply all migrations: auth, admin, sessions, contenttypes, gigs
Running migrations:
  Rendering model states... DONE
  Applying gigs.0002_event... OK
```

And run our tests:

```bash
$ python manage.py test gigs
Creating test database for alias 'default'...
..
----------------------------------------------------------------------
Ran 2 tests in 0.033s

OK
Destroying test database for alias 'default'...
```

Again, you may be prompted to delete the test database, but this should not be an issue.

With this done, let's commit our changes:

```bash
$ git add gigs
$ git commit -m 'Added Event model'
[master 47ba686] Added Event model
 3 files changed, 67 insertions(+), 1 deletion(-)
 create mode 100644 gigs/migrations/0002_event.py
```

Setting up the admin
--------------------

For an application like this, you'd expect the curators of the site to maintain the gigs and venues stored in the database, and that's an obvious use case for the Django admin. So let's set our models up to be available in the admin. Open up `gigs\admin.py and amend it as follows:

```python
from django.contrib import admin
from gigs.models import Venue, Event

admin.site.register(Venue)
admin.site.register(Event)
```

Now, if you start up the dev server as usual with `python manage.py runserver` and visit [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/), you can see that our `Event` and `Venue` models are now available. However, the string representations of them are pretty useless. Let's fix that. First, we amend our tests:

```python
from django.test import TestCase
from gigs.models import Venue, Event
from factory.fuzzy import BaseFuzzyAttribute
from django.contrib.gis.geos import Point
import factory.django, random
from django.utils import timezone

class FuzzyPoint(BaseFuzzyAttribute):
    def fuzz(self):
        return Point(random.uniform(-180.0, 180.0),
                     random.uniform(-90.0, 90.0))

# Factories for tests
class VenueFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Venue
        django_get_or_create = (
            'name',
            'location'
        )

    name = 'Wembley Arena'
    location = FuzzyPoint()

class EventFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Event
        django_get_or_create = (
            'name',
            'venue',
            'datetime'
        )

    name = 'Queens of the Stone Age'
    datetime = timezone.now()

class VenueTest(TestCase):
    def test_create_venue(self):
        # Create the venue
        venue = VenueFactory()

        # Check we can find it
        all_venues = Venue.objects.all()
        self.assertEqual(len(all_venues), 1)
        only_venue = all_venues[0]
        self.assertEqual(only_venue, venue)

        # Check attributes
        self.assertEqual(only_venue.name, 'Wembley Arena')

        # Check string representation
        self.assertEqual(only_venue.__str__(), 'Wembley Arena')


class EventTest(TestCase):
    def test_create_event(self):
        # Create the venue
        venue = VenueFactory()

        # Create the event
        event = EventFactory(venue=venue)

        # Check we can find it
        all_events = Event.objects.all()
        self.assertEqual(len(all_events), 1)
        only_event = all_events[0]
        self.assertEqual(only_event, event)

        # Check attributes
        self.assertEqual(only_event.name, 'Queens of the Stone Age')
        self.assertEqual(only_event.venue.name, 'Wembley Arena')

        # Check string representation
        self.assertEqual(only_event.__str__(), 'Queens of the Stone Age - Wembley Arena')
```

Next, we run our tests:

```bash
$ python manage.py test gigs
Creating test database for alias 'default'...
FF
======================================================================
FAIL: test_create_event (gigs.tests.EventTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/gigfinder/gigs/tests.py", line 74, in test_create_event
    self.assertEqual(only_event.__str__(), 'Queens of the Stone Age - Wembley Arena')
AssertionError: 'Event object' != 'Queens of the Stone Age - Wembley Arena'
- Event object
+ Queens of the Stone Age - Wembley Arena


======================================================================
FAIL: test_create_venue (gigs.tests.VenueTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/gigfinder/gigs/tests.py", line 52, in test_create_venue
    self.assertEqual(only_venue.__str__(), 'Wembley Arena')
AssertionError: 'Venue object' != 'Wembley Arena'
- Venue object
+ Wembley Arena


----------------------------------------------------------------------
Ran 2 tests in 0.059s

FAILED (failures=2)
Destroying test database for alias 'default'...
```

They fail as expected. So let's update `gigs/models.py`:

```python
from django.contrib.gis.db import models

class Venue(models.Model):
    """
    Model for a venue
    """
    name = models.CharField(max_length=200)
    location = models.PointField()

    def __str__(self):
        return self.name


class Event(models.Model):
    """
    Model for an event
    """
    name = models.CharField(max_length=200)
    datetime = models.DateTimeField()
    venue = models.ForeignKey(Venue)

    def __str__(self):
        return "%s - %s" % (self.name, self.venue.name)
```

For the venue, we just use the name. For the event, we use the event name and the venue name.

Now, we run our tests again:

```bash
$ python manage.py test gigs
Creating test database for alias 'default'...
..
----------------------------------------------------------------------
Ran 2 tests in 0.048s

OK
Destroying test database for alias 'default'...
```

Time to commit our changes:

```bash
$ git add gigs
$ git commit -m 'Added models to admin'
[master 65d051f] Added models to admin
 3 files changed, 15 insertions(+), 1 deletion(-)
```

Our models are now in place, so you may want to log into the admin and create a few venues and events so you can see it in action. Note that the location field for the `Venue` model creates a map widget that allows you to select a geographical location. It is a bit basic, however, so let's make it better. Let's install `django-floppyforms`:

```bash
$ pip install django-floppyforms
```

And add it to our requirements:

```bash
$ pip install -r requirements.txt
```

Then add it to `INSTALLED_APPS` in `gigfinder/setttings.py`:

```python
INSTALLED_APPS = [
    ...
    'django.contrib.gis',
    'gigs',
    'floppyforms',
]
```

Now we create a custom point widget for our admin, a custom form for the venues, and a custom venue admin:

```python
from django.contrib import admin
from gigs.models import Venue, Event
from django.forms import ModelForm
from floppyforms.gis import PointWidget, BaseGMapWidget

class CustomPointWidget(PointWidget, BaseGMapWidget):
    class Media:
        js = ('/static/floppyforms/js/MapWidget.js',)

class VenueAdminForm(ModelForm):
    class Meta:
        model = Venue
        fields = ['name', 'location']
        widgets = {
            'location': CustomPointWidget()
        }

class VenueAdmin(admin.ModelAdmin):
    form = VenueAdminForm

admin.site.register(Venue, VenueAdmin)
admin.site.register(Event)
```

Note in particular that we define the media for our widget so we can include some required Javascript. If you run the dev server again, you should see that the map widget in the admin is now provided by Google Maps, making it much easier to identify the correct location of the venue.

Time to commit our changes:

```bash
$ git add gigfinder/ gigs/ requirements.txt
$ git commit -m 'Customised location widget'
```

With our admin ready, it's time to move on to the user-facing part of the web app.

Creating our views
------------------

We will keep the front end for this app as simple as possible for the purposes of this tutorial, but of course you should feel free to expand upon this as you see fit. What we'll do is create a form that uses HTML5 geolocation to get the user's current geographical coordinates. It will then return events in the next week, ordered by how close the venue is.

How do we query the database to get this data? It's not too difficult, as shown in this example:

```bash
$ python manage.py shell
Python 3.5.1 (default, Mar 25 2016, 00:17:15)
Type "copyright", "credits" or "license" for more information.

IPython 4.1.2 -- An enhanced Interactive Python.
?         -> Introduction and overview of IPython's features.
%quickref -> Quick reference.
help      -> Python's own help system.
object?   -> Details about 'object', use 'object??' for extra details.

In [1]: from gigs.models import *

In [2]: from django.contrib.gis.geos import Point

In [3]: from django.contrib.gis.db.models.functions import Distance

In [4]: location = Point(52.3749159, 1.1067473, srid=4326)

In [5]: Venue.objects.all().annotate(distance=Distance('location', location)).order_by('distance')
Out[5]: [<Venue: Diss Corn Hall>, <Venue: Waterfront Norwich>, <Venue: UEA Norwich>, <Venue: Wembley Arena>]
```

I've set up a number of venues using the admin, one round the corner, two in Norwich, and one in London. I then imported the models, the `Point` class, and the `Distance` function, and created a `Point` object. Note that the `Point` is passed three fields - the first and second are the latitude and longitude, respectively, while the `srid` field takes a value of `4326`. This field represents the [Spatial Reference System Identifier](https://en.wikipedia.org/wiki/SRID) used for this query - we've gone for [WGS 84](https://en.wikipedia.org/wiki/World_Geodetic_System#WGS84), which is a common choice and is referred to with the SRID 4326.

Now, we want the user to be able to submit the form and get the 5 nearest events in the next week. We can get the date for this time next week as follows:

```python
In [6]: next_week = timezone.now() + timezone.timedelta(weeks=1)
```

Then we can get the events we want, sorted by distance, like this:

```python
In [7]: Event.objects.filter(datetime__lte=next_week).annotate(distance=Distance('venue__location', location)).order_by('distance')[0:2]
Out[7]: [<Event: Nirvana - Waterfront Norwich>, <Event: Primal Scream - UEA Norwich>]
```

With that in mind, let's write the test for our view. The view should contain a single form that accepts a user's geographical coordinates - for convenience we'll autocomplete this with HTML5 geolocation. On submit, the user should see a map displaying the location of the five closest events in the next week.

First, let's test the GET request. Amend `gigs/tests.py` as follows:

```python
from django.test import TestCase
from gigs.models import Venue, Event
from factory.fuzzy import BaseFuzzyAttribute
from django.contrib.gis.geos import Point
import factory.django, random
from django.utils import timezone
from django.test import RequestFactory
from django.core.urlresolvers import reverse
from gigs.views import LookupView

class FuzzyPoint(BaseFuzzyAttribute):
    def fuzz(self):
        return Point(random.uniform(-180.0, 180.0),
                     random.uniform(-90.0, 90.0))

# Factories for tests
class VenueFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Venue
        django_get_or_create = (
            'name',
            'location'
        )

    name = 'Wembley Arena'
    location = FuzzyPoint()

class EventFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Event
        django_get_or_create = (
            'name',
            'venue',
            'datetime'
        )

    name = 'Queens of the Stone Age'
    datetime = timezone.now()

class VenueTest(TestCase):
    def test_create_venue(self):
        # Create the venue
        venue = VenueFactory()

        # Check we can find it
        all_venues = Venue.objects.all()
        self.assertEqual(len(all_venues), 1)
        only_venue = all_venues[0]
        self.assertEqual(only_venue, venue)

        # Check attributes
        self.assertEqual(only_venue.name, 'Wembley Arena')

        # Check string representation
        self.assertEqual(only_venue.__str__(), 'Wembley Arena')


class EventTest(TestCase):
    def test_create_event(self):
        # Create the venue
        venue = VenueFactory()

        # Create the event
        event = EventFactory(venue=venue)

        # Check we can find it
        all_events = Event.objects.all()
        self.assertEqual(len(all_events), 1)
        only_event = all_events[0]
        self.assertEqual(only_event, event)

        # Check attributes
        self.assertEqual(only_event.name, 'Queens of the Stone Age')
        self.assertEqual(only_event.venue.name, 'Wembley Arena')

        # Check string representation
        self.assertEqual(only_event.__str__(), 'Queens of the Stone Age - Wembley Arena')


class LookupViewTest(TestCase):
    """
    Test lookup view
    """
    def setUp(self):
        self.factory = RequestFactory()

    def test_get(self):
        request = self.factory.get(reverse('lookup'))
        response = LookupView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed('gigs/lookup.html')
```

Let's run our tests:

```python
$ python manage.py test gigs
Creating test database for alias 'default'...
E
======================================================================
ERROR: gigs.tests (unittest.loader._FailedTest)
----------------------------------------------------------------------
ImportError: Failed to import test module: gigs.tests
Traceback (most recent call last):
  File "/usr/local/Cellar/python3/3.5.1/Frameworks/Python.framework/Versions/3.5/lib/python3.5/unittest/loader.py", line 428, in _find_test_path
    module = self._get_module_from_name(name)
  File "/usr/local/Cellar/python3/3.5.1/Frameworks/Python.framework/Versions/3.5/lib/python3.5/unittest/loader.py", line 369, in _get_module_from_name
    __import__(name)
  File "/Users/matthewdaly/Projects/gigfinder/gigs/tests.py", line 9, in <module>
    from gigs.views import LookupView
ImportError: cannot import name 'LookupView'


----------------------------------------------------------------------
Ran 1 test in 0.000s

FAILED (errors=1)
Destroying test database for alias 'default'...
```

Our first issue is that we can't import the view in the test. Let's fix that by amending `gigs/views.py`:

```python
from django.shortcuts import render
from django.views.generic.base import View

class LookupView(View):
    pass
```

Running the tests again results in the following:

```bash
$ python manage.py test gigs
Creating test database for alias 'default'...
.E.
======================================================================
ERROR: test_get (gigs.tests.LookupViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/gigfinder/gigs/tests.py", line 88, in test_get
    request = self.factory.get(reverse('lookup'))
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/urlresolvers.py", line 600, in reverse
    return force_text(iri_to_uri(resolver._reverse_with_prefix(view, prefix, *args, **kwargs)))
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/core/urlresolvers.py", line 508, in _reverse_with_prefix
    (lookup_view_s, args, kwargs, len(patterns), patterns))
django.core.urlresolvers.NoReverseMatch: Reverse for 'lookup' with arguments '()' and keyword arguments '{}' not found. 0 pattern(s) tried: []

----------------------------------------------------------------------
Ran 3 tests in 0.154s

FAILED (errors=1)
Destroying test database for alias 'default'...
```

We can't resolve the URL for our new view, so we need to add it to our URLconf. First of all, save this as `gigs/urls.py`:

```python
from django.conf.urls import url
from gigs.views import LookupView

urlpatterns = [
    # Lookup
    url(r'', LookupView.as_view(), name='lookup'),
]
```

Then amend `gigfinder/urls.py` as follows:

```python
from django.conf.urls import url
from gigs.views import LookupView

urlpatterns = [
    # Lookup
    url(r'', LookupView.as_view(), name='lookup'),
]
```

Then run the tests:

```bash
$ python manage.py test gigs
Creating test database for alias 'default'...
.F.
======================================================================
FAIL: test_get (gigs.tests.LookupViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/gigfinder/gigs/tests.py", line 90, in test_get
    self.assertEqual(response.status_code, 200)
AssertionError: 405 != 200

----------------------------------------------------------------------
Ran 3 tests in 0.417s

FAILED (failures=1)
Destroying test database for alias 'default'...
```

We get a 405 response because the view does not accept GET requests. Let's resolve that:

```python
from django.shortcuts import render_to_response
from django.views.generic.base import View

class LookupView(View):
    def get(self, request):
        return render_to_response('gigs/lookup.html')
```

If we run our tests now:

```bash
$ python manage.py test gigs
Creating test database for alias 'default'...
.E.
======================================================================
ERROR: test_get (gigs.tests.LookupViewTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/matthewdaly/Projects/gigfinder/gigs/tests.py", line 89, in test_get
    response = LookupView.as_view()(request)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/views/generic/base.py", line 68, in view
    return self.dispatch(request, *args, **kwargs)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/views/generic/base.py", line 88, in dispatch
    return handler(request, *args, **kwargs)
  File "/Users/matthewdaly/Projects/gigfinder/gigs/views.py", line 6, in get
    return render_to_response('gigs/lookup.html')
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/shortcuts.py", line 39, in render_to_response
    content = loader.render_to_string(template_name, context, using=using)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/template/loader.py", line 96, in render_to_string
    template = get_template(template_name, using=using)
  File "/Users/matthewdaly/Projects/gigfinder/venv/lib/python3.5/site-packages/django/template/loader.py", line 43, in get_template
    raise TemplateDoesNotExist(template_name, chain=chain)
django.template.exceptions.TemplateDoesNotExist: gigs/lookup.html

----------------------------------------------------------------------
Ran 3 tests in 0.409s

FAILED (errors=1)
Destroying test database for alias 'default'...
```

We see that the template is not defined. Save the following as `gigs/templates/gigs/includes/base.html`:

```django
<!DOCTYPE html>
<html>
    <head>
        <title>Gig finder</title>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" type="text/css" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css"></link>
    </head>
    <body>
        <h1>Gig Finder</h1>
        <div class="container">
            <div class="row">
                {% block content %}{% endblock %}
            </div>
        </div>
		<script src="https://code.jquery.com/jquery-2.2.2.min.js" integrity="sha256-36cp2Co+/62rEAAYHLmRCPIych47CvdM+uTBJwSzWjI=" crossorigin="anonymous"></script>
        <script language="javascript" type="text/javascript" src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script>
    </body>
</html>
```

And the following as `gigs/templates/gigs/lookup.html`:

```django
{% extends "gigs/includes/base.html" %}

{% block content %}
    <form role="form" action="/" method="post">{% csrf_token %}
        <div class="form-group">
            <label for="latitude">Latitude:</label>
            <input id="id_latitude" name="latitude" type="number" class="form-control"></input>
        </div>
        <div class="form-group">
            <label for="longitude">Longitude:</label>
            <input id="id_longitude" name="longitude" type="number" class="form-control"></input>
        </div>
        <input class="btn btn-primary" type="submit" value="Submit" />
    </form>
    <script language="javascript" type="text/javascript">
        navigator.geolocation.getCurrentPosition(function (position) {
            var lat = document.getElementById('id_latitude');
            var lon = document.getElementById('id_longitude');
            lat.value = position.coords.latitude;
            lon.value = position.coords.longitude;
        });
    </script>
{% endblock %}
```

Note the JavaScript to populate the latitude and longitude. Now, if we run our tests:

```bash
$ python manage.py test gigs
Creating test database for alias 'default'...
...
----------------------------------------------------------------------
Ran 3 tests in 1.814s

OK
Destroying test database for alias 'default'...
```

Success! We now render our form as expected. Time to commit:

```bash
$ git add gigs gigfinder
$ git commit -m 'Implemented GET handler'
```

Handling POST requests
----------------------

Now we need to be able to handle POST requests and return the appropriate results.
