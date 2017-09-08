---
title: "Installing Nginx Unit on Ubuntu"
date: 2017-09-08 22:05:04 +0100
categories:
- php
- nginx
comments: true
---

Recently Nginx announced the release of the first beta of [Unit](https://www.nginx.com/products/nginx-unit/), an application server that supports Python, PHP and Go, with support coming for Java, Node.js and Ruby.

The really interesting part is that not only does it support more than one language, but Unit can be configured by making HTTP requests, rather than by editing config files. This makes it potentially very interesting to web developers like myself who have worked in multiple languages - I could use it to serve a Python or PHP web app, simply by making different requests during the setup process. I can see this being a boon for SaaS providers - you could pick up the language from a file, much like the `runtime.txt` used by Heroku, and set up the application on the fly.

It's currently in public beta, and there are packages for Ubuntu, so I decided to try it out. I've created the Ansible role below to set up Unit on an Ubuntu 16.04 server or VM:

```yml
---
- name: Install keys
  apt_key: url=http://nginx.org/keys/nginx_signing.key state=present

- name: Setup main repo
  apt_repository: repo='deb http://nginx.org/packages/mainline/ubuntu/ xenial nginx' state=present

- name: Setup source rep
  apt_repository: repo='deb-src http://nginx.org/packages/mainline/ubuntu/ xenial nginx' state=present

- name: Update system
  apt: upgrade=full update_cache=yes

- name: Install dependencies
  apt: name={{ item }} state=present
  with_items:
    - nginx
    - unit
    - golang
    - php-dev
    - php7.0-dev
    - libphp-embed
    - libphp7.0-embed
    - python-dev
    - python3
    - python3-dev
    - php7.0-cli
    - php7.0-mcrypt
    - php7.0-pgsql
    - php7.0-sqlite3
    - php7.0-opcache
    - php7.0-curl
    - php7.0-mbstring
    - php7.0-dom
    - php7.0-xml
    - php7.0-zip
    - php7.0-bcmath

- name: Copy over Nginx configuration
  copy: src=nginx.conf dest=/etc/nginx/sites-available/default owner=root group=root mode=0644
```

Note the section that copies over the Nginx config file. Here is that file:

```nginx
upstream unit_backend {
	server 127.0.0.1:8300;
}

server {
	listen 80 default_server;
	listen [::]:80 default_server ipv6only=on;
	fastcgi_param HTTP_PROXY ""; 

	access_log /var/log/nginx/access.log;
	error_log /var/log/nginx/error.log;

	root /var/www/public;
	index index.php index.html index.htm;

	server_name server_domain_or_IP;

	location / { 
		try_files $uri $uri/ /index.php?$query_string;
	}   

	location ~ \.php$ {
		try_files $uri /index.php =404;
		proxy_pass http://unit_backend;
		proxy_set_header Host $host;
	}   
}
```

This setup proxies all dynamic requests to the Unit backed in a similar fashion to how it would normally pass it to PHP-FPM.

There were still a few little issues. It doesn't exactly help that the Nginx package provided with this repository isn't quite the same as the one in Ubuntu by default - not only is it the unstable version, but it doesn't set up the `sites-available` and `sites-enabled` folders, so I had to do that manually. I also had an issue with Systemd starting the process (at `/run/control.unit.sock`) with permissions that didn't allow Nginx to access it. I'm not that familiar with Systemd so I wound up just setting the permissions of the file manually, but that doesn't persist between restarts. I expect this issue isn't that big a deal to someone more familiar with Systemd, but I haven't been able to resolve it yet.

I decided to try it out with a Laravel application. I created a new Laravel app and set it up with the web root at `/var/www`. I then saved the following configuration for it as `app.json`:

```json
{
    "listeners": {
        "*:8300": {
            "application": "myapp"
        }
    },
    "applications": {
        "myapp": {
            "type": "php",
            "workers": 20,
            "user": "www-data",
            "group": "www-data",
            "root": "/var/www/public",
            "index": "index.php"
        }
    }
}
```

This is fairly basic, but a good example of how you configure an application with Unit. The `listener` section maps a port to an application, while the `applications` section defines an application called `myapp`. In this case, we specify that the type should be `php`. Note that each platform has slightly different options - for instance, the Python type doesn't have the `index` or `root` options, instead having the `path` option, which specifies the path to the `wsgi.py` file.

I then ran the following command to upload the file:

```bash
$ curl -X PUT -d @app.json --unix-socket /run/control.unit.sock http://localhost
```

Note that we send it direct to the Unix socket file - this way we don't have to expose the API to the outside. After this was done, the Laravel app began working as expected.

We can then make a GET request to view the configured applications:

```bash
$ curl --unix-socket /run/control.unit.sock http://localhost/
{
        "listeners": {
                "*:8300": {
                        "application": "saas"
                }
        },

        "applications": {
                "saas": {
                        "type": "php",
                        "workers": 20,
                        "user": "www-data",
                        "group": "www-data",
                        "root": "/var/www/public",
                        "index": "index.php"
                }
        }
}
```

It's also possible to update and delete existing applications via the API using PUT and DELETE requests.

Final thoughts
--------------

This is *way* to early to be considering seriously using Unit in production. It's only just been released as a public beta, and it's a bit fiddly to set up. However, it has an enormous amount of promise.

One thing I can't really see right now is whether it's possible to use a virtualenv with it for Python applications. In the Python community it's standard practice to use Virtualenv to isolate the dependencies for individual applications, and it's not clear how I'd be able to go about using this, if it is possible. For deploying Python applications, lack of virtualenv support would be a deal breaker, and I hope this gets clarified soon.

I'd also be curious to see benchmarks of how it compares to something like PHP-FPM. It's quite possible that it may be less performant than other solutions. However, I will keep a close eye on this in future.
