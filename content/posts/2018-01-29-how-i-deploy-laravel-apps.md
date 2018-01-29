---
title: "How I deploy Laravel apps"
date: 2018-01-29 22:00:35 +0000
categories:
- php
- laravel
comments: true
---

A while back I provided details of the web server setup I used for Django applications. Nowadays I tend to use Laravel most of the time, so I thought I'd share an example of the sort of setup I use to deploy that.

Server OS
---------

As before I generally prefer Debian Stable where possible. If that's not possible for any reason then the current Ubuntu LTS is an acceptable substitute.

Web server
----------

My usual web server these days is Nginx with PHP 7 or better via FPM. I generally use HTTP2 where possible, with SSL via Let's Encrypt.

Here's my typical Nginx config:

```json
fastcgi_cache_path /etc/nginx/cache levels=1:2 keys_zone=my-app:100m inactive=60m;
fastcgi_cache_key "$scheme$request_method$host$request_uri";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' https://placehold.it; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ; font-src 'self' https://themes.googleusercontent.com; frame-src 'none'; object-src 'none'";
server_tokens off;

server {
    listen 80;
    listen [::]:80;
    server_name my-app.domain;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    include snippets/ssl-my-app.domain.conf;
    include snippets/ssl-params.conf;
    client_max_body_size 50M;
    fastcgi_param HTTP_PROXY "";

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    root /var/www/my-app.domain/current/public;
    index index.php index.html index.htm;

    server_name my-app.domain;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        try_files $uri /index.php =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/var/run/php/php7.0-fpm-my-app.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_cache my-app;
        fastcgi_cache_valid 200 60m;
    }

    location ~ /.well-known {
        allow all;
    }

    location ~* \.(?:manifest|appcache|html?|xml|json)$ {
	    expires -1;
	    gzip on;
	    gzip_vary on;
	    gzip_types application/json text/xml application/xml;
    }

    location ~* \.(?:rss|atom)$ {
	    expires 1h;
	    add_header Cache-Control "public";
	    gzip on;
	    gzip_vary on;
	    gzip_types application/xml+rss;
    }

    location ~* \.(?:jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc)$ {
	    expires 1M;
	    access_log off;
	    add_header Cache-Control "public";
    }

    location ~* \.(?:css|js)$ {
	    expires 1y;
	    access_log off;
	    add_header Cache-Control "public";
	    gzip on;
	    gzip_vary on;
	    gzip_types text/css application/javascript text/javascript;
    }
}
```

The times for FastCGI caching tend to vary in practice - sometimes it's not appropriate to use it all, while for others it can be cached for some time.

It's generally fairly safe to cache CSS and JS for a long time with a Laravel app if you're using Mix to version those assets, so I feel comfortable caching them for a year. Images are a bit dicier, but still don't change often so a month seems good enough.

I'll typically give each application its own pool, which means copying the file at `/etc/php/7.0/fpm/pool.d/www.conf` to another file in the same directory, amending the pool name and path to set a new location for the socket, and then restarting Nginx and PHP-FPM. Here are the fields that should be changed:

```ini
; Start a new pool named 'www'.
; the variable $pool can be used in any directive and will be replaced by the
; pool name ('www' here)
[my-app.domain]
...
listen = /var/run/php/php7.0-fpm-my-app.sock
```

Database
--------

I'm a fan of PostgreSQL - it's stricter than MySQL/MariaDB, and has some very useful additional field types, so where possible I prefer to use it over MySQL or MariaDB.

Cache and session backend
-------------------------

Redis is my usual choice here - I make heavy use of cache tags so I need a backend for the cache that supports them, and Memcached doesn't seem to have as much inertia as Redis these days. Neither needs much in the way of configuration, but you can get a slight speed boost by using phpiredis.

Queue
-----

I sometimes use Redis for this too, but it can be problematic if you're using Redis as the queue and broadcast backend, so these days I'm more likely to use Beanstalk and keep Redis for other stuff. I use Supervisor for running the queue worker, and this is an example of the sort of configuration I would use:

```ini
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/artisan queue:work --sleep=3 --tries=3
autostart=true
autorestart=true
user=www-data
numprocs=8
redirect_stderr=true
stdout_logfile=/var/log/worker.log
```

This is fairly standard for Laravel applications.

Scheduler
---------

I often make use of the Laravel scheduled tasks system. Here's the typical cron job that would be used for that:

```cron
* * * * * php /var/www/artisan schedule:run >> /dev/null 2>&1
```

Again, this is standard for Laravel applications. It runs the scheduler every minute, and the scheduler then determines if it needs to do something.

Provisioning
------------

To set all this up, I'll generally use Ansible. In addition to this, I'll generally also set up fail2ban to block various attacks via both HTTP and SSH.


