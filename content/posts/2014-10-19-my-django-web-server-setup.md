---
layout: post
title: "My Django web server setup"
date: 2014-10-19 19:52:28 +0100
comments: true
categories: 
- python
- django
---

This isn't really part of my Django tutorial series (that has now definitely concluded!), but I thought I'd share the setup I generally use for deploying Django applications, partly for my own reference, and partly because it is quite complex, and those readers who don't wish to deploy to Heroku may want some guidance on how to deploy their new blogs to a VPS.

Operating system
----------------

This isn't actually that much of a big deal, but while I prefer Ubuntu on desktops, I generally use Debian Stable on servers, since it's fanatically stable.

Database server
---------------

For my first commercial Django app, I used MySQL. However, South had one or two issues with MySQL, and I figured that since using an ORM and migrations meant that I wouldn't need to write much SQL anyway, I might as well jump to PostgreSQL for the Django app I'm currently in the process of deploying at work. So far I haven't had any problems with it.

Web server
----------

It's customary to use two web servers with Django. One handles the static content, and reverse proxies everything else to a different port, where another web server serves the dynamic content.

For serving the static files, I use Nginx - it's generally considered to be faster than Apache for this use case. Here's a typical Nginx config file:

```nginx
server {
    listen 80;
    server_name example.com;
    client_max_body_size 50M;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    location /static {
        root /var/www/mysite;
    }

    location /media {
        root /var/www/mysite;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

For the application server, I use Gunicorn. You can install this with `pip install gunicorn`, then add it to `INSTALLED_APPS`. Then add the following config file to the root of your project:

```python
bind = "127.0.0.1:8000"
logfile = "/var/log/gunicorn.log"
loglevel = "debug"
workers = 3
```

You should normally set the number of workers to 2 times the number of cores on your machine, plus one.

In order to keep Gunicorn running, I use Supervisor. As the installation commands will depend on your OS, I won't give details here - your package manager of choice should have a suitable package available. Here's a typical Supervisor config file I might use for running Gunicorn for a Django app:

```bash
[program:mysite]
command=/var/www/mysite/venv/bin/gunicorn myapp.wsgi:application --workers=3
directory=/var/www/mysite/
user=nobody
autostart=true
autorestart=true
```

Once that's in place, you can easily add the new app:

```bash
$ sudo supervisorctl reread
$ sudo supervisorctl update
```

Then to start it:

```bash
$ sudo supervisorctl start mysite
```

Or stop it with:

```bash
$ sudo supervisorctl stop mysite
```

Or restart it:

```bash
$ sudo supervisorctl restart mysite
```

Celery
------

So far, both of the web apps I've built professionally have been ones where it made sense to use [Celery](http://www.celeryproject.org/) for some tasks. For the uninitiated, Celery lets you pass a task to a queue to be handled, rather than handling it within the context of the same HTTP request. This offers the following advantages:

* The user doesn't need to wait for the task to be completed before getting a response, improving performance
* It's more robust, since if the task fails, it can be automatically retried
* The task queue can be moved to another server if desired, making it easier to scale
* Scheduling tasks

I've used it in cases where I needed to send an email or a push notification, since these don't have to be done within the context of the same HTTP request, but need to be reliable.

I generally use RabbitMQ as my message queue. I'll leave setting this up as an exercise for the reader since it's covered pretty well in the Celery documentation, but like with Gunicorn, I use Supervisor to run the Celery worker. Here's a typical config file:

```bash
[program:celeryd]
command=/var/www/mysite/venv/bin/python manage.py celery worker
directory=/var/www/mysite/
user=nobody
autostart=true
autorestart=true
```

Then start it up:

```bash
$ sudo supervisorctl reread
$ sudo supervisorctl update
$ sudo supervisorctl start celeryd
```

I make no claims about how good this setup is, but it works well for me. I haven't yet had the occasion to deploy a Django app to anywhere other than Heroku that really benefited from caching, so I haven't got any tips to share about that, but if I were building a content-driven web app, I would use Memcached since it's well-supported.
