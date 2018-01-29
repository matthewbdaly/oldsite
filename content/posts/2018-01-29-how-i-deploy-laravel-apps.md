---
title: "How I deploy Laravel apps"
date: 2018-01-29 21:03:35 +0000
categories:
- php
- laravel
comments: true
---

Web server
----------

My usual web server these days is Nginx with PHP 7 or better via FPM. I generally use HTTP2 where possible, with SSL via Let's Encrypt.

Here's my typical Nginx config:

```json
fastcgi_cache_path /etc/nginx/cache levels=1:2 keys_zone=laravel-blog:100m inactive=60m;
fastcgi_cache_key "$scheme$request_method$host$request_uri";

server {
    listen 80;
    listen [::]:80;
    server_name linklater.shellshocked.info;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    include snippets/ssl-linklater.shellshocked.info.conf;
    include snippets/ssl-params.conf;

    fastcgi_param HTTP_PROXY "";

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    root /var/www/linklater.shellshocked.info/current/public;
    index index.php index.html index.htm;

    server_name linklater.shellshocked.info;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        try_files $uri /index.php =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/var/run/php/php7.0-fpm-linklater.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_cache laravel-blog;
        fastcgi_cache_valid 200 60m;
    }

    location ~ /.well-known {
        allow all;
    }

    location ~* \.(?:manifest|appcache|html?|xml|json)$ {
	    expires -1;
    }

    location ~* \.(?:rss|atom)$ {
	    expires 1h;
	    add_header Cache-Control "public";
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
    }
}
```

It's generally fairly safe to cache CSS and JS for a long time with a Laravel app if you're using Mix to version those assets, so I feel comfortable caching them for a year. Image are a bit dicier, but still don't change often so a month seems good enough.

I'll typically give each application its own pool, which means copying the file at `/etc/php/7.0/fpm/pool.d/www.conf` to another file in the same directory, amending the pool name and path to set a new location for the socket, and then restarting Nginx and PHP-FPM. Here are the fields that should be changed:

```ini
; Start a new pool named 'www'.
; the variable $pool can be used in any directive and will be replaced by the
; pool name ('www' here)
[linklater.shellshocked.info]
...
listen = /var/run/php/php7.0-fpm-linklater.sock
```

Database
--------

I'm a fan of PostgreSQL - it's stricter than MySQL/MariaDB, and has some very useful additional field types, so where possible I prefer to use it over MySQL or MariaDB.

Cache and session backend
-------------------------

Redis is my usual choice here - I make heavy use of cache tags so I need a backend for the cache that supports them, and Memcached doesn't seem to have as much inertia as Redis these days.

Queue
-----

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

Scheduler
---------

```cron
* * * * * php /var/www/artisan schedule:run >> /dev/null 2>&1
```
