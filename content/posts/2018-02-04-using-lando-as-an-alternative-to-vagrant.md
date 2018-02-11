---
title: "Using Lando as an alternative to Vagrant"
date: 2018-02-04 00:12:16 +0000
categories:
- docker
- virtualisation
comments: true
---

Although Vagrant is very useful for ensuring consistency between development environments, it's quite demanding on system resources. Running a virtual machine introduces quite a bit of overhead, and it can be troublesome to provision.

This week I was introduced to [Lando](https://docs.devwithlando.io/) as an alternative to Vagrant. Rather than running a virtual machine like Vagrant does by default, Lando instead spins up Docker containers for the services you need, meaning it has considerably less overhead than Vagrant. It also includes presets for a number of frameworks and CMS's, including:

* Drupal 7
* Drupal 8
* Wordpress
* Laravel

Considering that Vagrant needs quite a bit of boilerplate to set up the server for different types of projects, this gives Lando an obvious advantage. The only issue I've had with it is that it's been unreliable when I've had to use it on Windows, which I don't do much anyway.

Getting started
---------------

Lando requires that you have Docker installed. Once that's done you can download and install it fro the website. Then you can run `lando init` to set it up:

```bash
$ lando init
? What recipe do you want to use? wordpress
? Where is your webroot relative to the init destination? .
? What do you want to call this app? wp-site

NOW WE'RE COOKING WITH FIRE!!!
Your app has been initialized!

Go to the directory where your app was initialized and run
`lando start` to get rolling.

Check the LOCATION printed below if you are unsure where to go.

Here are some vitals:

 NAME      wp-site                                               
 LOCATION  /home/matthew/Projects/wp-site                        
 RECIPE    wordpress                                             
 DOCS      https://docs.devwithlando.io/tutorials/wordpress.html 
```

Here I've chosen the `wordpress` recipe, in the current directory, with the name `wp-site`. This generates the following file as `.lando.yml`:

```yml
name: wp-site
recipe: wordpress
config:
  webroot: .
```

Then, if we run `lando start`, it will set up the required services:

```bash
$ lando start
landoproxyhyperion5000gandalfedition_proxy_1 is up-to-date
Creating network "wpsite_default" with the default driver
Creating volume "wpsite_appserver" with default driver
Creating volume "wpsite_data" with default driver
Creating volume "wpsite_data_database" with default driver
Creating wpsite_appserver_1 ... 
Creating wpsite_database_1 ... 
Creating wpsite_database_1
Creating wpsite_appserver_1 ... done
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 4454k  100 4454k    0     0  3288k      0  0:00:01  0:00:01 --:--:-- 3290k
OS:     Linux 4.13.0-32-generic #35-Ubuntu SMP Thu Jan 25 09:13:46 UTC 2018 x86_64
Shell:  
PHP binary:     /usr/local/bin/php
PHP version:    7.1.13
php.ini used:   
WP-CLI root dir:        phar://wp-cli.phar
WP-CLI vendor dir:      phar://wp-cli.phar/vendor
WP_CLI phar path:       /tmp
WP-CLI packages dir:
WP-CLI global config:   
WP-CLI project config:  
WP-CLI version: 1.5.0

BOOMSHAKALAKA!!!

Your app has started up correctly.
Here are some vitals:

 APPSERVER URLS  https://localhost:32802
                 http://localhost:32803
                 http://wp-site.lndo.site
                 https://wp-site.lndo.site

```

Note the `APPSERVER URLS` section - the site can be accessed locally via HTTP or HTTPS. For this recipe, it also installs WP CLI.

If we run `docker ps`, we can see that it's running three Docker containers:

```bash
CONTAINER ID        IMAGE                         COMMAND                  CREATED             STATUS              PORTS                                                               NAMES
2e920e152091        devwithlando/php:7.1-apache   "/lando-entrypoint.s…"   16 minutes ago      Up 16 minutes       0.0.0.0:32803->80/tcp, 0.0.0.0:32802->443/tcp                       wpsite_appserver_1
82ea60b1214f        mysql:latest                  "/lando-entrypoint.s…"   16 minutes ago      Up 16 minutes       0.0.0.0:32801->3306/tcp                                             wpsite_database_1
e51d831199d7        traefik:1.3-alpine            "/lando-entrypoint.s…"   About an hour ago   Up About an hour    0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp, 0.0.0.0:58086->8080/tcp   landoproxyhyperion5000gandalfedition_proxy_1
```

Apache lives in one container, MySQL in another, while the third runs Traefik, a lightweight load balancer, which listens on port 80. Traefik does the work of redirecting HTTP requests to the right place.

As I've been unhappy with the amount of resources Vagrant uses for a while, and I usually run Ubuntu (making using Docker straightforward), I'm planning on using Lando extensively in future. It's lighter and faster to set up, and has sane defaults for most of the frameworks and CMS's I use regularly, making it generally quicker and easier to work with.
