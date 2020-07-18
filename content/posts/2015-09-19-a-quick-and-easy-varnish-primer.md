---
title: "A quick and easy Varnish primer"
date: 2015-09-19 19:42:17 +0100
categories:
- varnish
- performance
comments: true
---

As I [mentioned in an earlier post](/blog/2015/08/22/when-you-should-not-use-wordpress/), I recently had the occasion to use Varnish to improve the performance of a website that otherwise would have been unreliable and unusably slow due to WordPress making an excessive number of queries. The difference it made was nothing short of staggering, and I'm not exaggerating when I say it saved the day. I now use Ansible for provisioning new WordPress sites, and Varnish is now a standard part of my WordPress site setup playbook.

However, Varnish can be quite fiddly to configure, and it was something of a baptism of fire for me to learn how to configure it appropriately for this use case. I did make a few mistakes that caused problems down the line, so I thought I'd share the details of how I got it working for that particular site.

What is Varnish?
----------------

From [the website](https://www.varnish-cache.org/about):

> Varnish Cache is a web application accelerator also known as a caching HTTP reverse proxy. You install it in front of any server that speaks HTTP and configure it to cache the contents. Varnish Cache is really, really fast. It typically speeds up delivery with a factor of 300 - 1000x, depending on your architecture.

In other words, you run it on the usual HTTP or HTTPS port, move your usual web server to a different port, and configure it, and it will cache web pages so they can be served more quickly to subsequent visitors.

Be warned - Varnish is not something where you can generally stick with the default settings. The default behaviour does make a lot of sense, but in practice almost no-one will be able to get away with leaving the configuration unchanged.

Installing Varnish
------------------

If you're using Debian or a derivative such as Ubuntu, Varnish is available via `apt-get`:

```bash
$ sudo apt-get install varnish
```

You may also want to install the documentation:

```bash
$ sudo apt-get install varnish-doc
```

If you're using Apache I'd also recommend installing `libapache2-mod-rpaf` and enabling it with `sudo a2enmod rpaf` - without this, Apache will log all incoming requests as coming from the same server.

I'm assuming you already have a normal web server installed. I'll assume you're using Apache, but it shouldn't be hard to adapt these instructions to work with Nginx. I'm also assuming that the site you want to use Varnish for is a WordPress site with WooCommerce and W3 Total Cache installed. However, this is only for example purposes. If you want to use Varnish for a different web app, you'll need to plan your caching strategy around that web app yourself.

Please also note that this is using Varnish 4.0, which is the version available with Debian Jessie. If you're using an older operating system, you may have Varnish 3.0 in the repositories - be warned, the configuration language changed in Varnish 4.0, so the examples here will not work with older versions of Varnish.

By default, Varnish runs on port 6081, which is fine for testing it out, but once you want to go live it's not what you want. When it's time to go live, you'll need to open up `/etc/default/varnish` and edit the value of `DAEMON_OPTS` to something like this:

```bash
DAEMON_OPTS="-a :80 \
             -T localhost:6082 \
             -f /etc/varnish/default.vcl \
             -S /etc/varnish/secret \
             -s malloc,256m"
```

Note that the `-a` flag represents the port Varnish is running on.

If you're using an operating system that uses `systemd`, such as Debian Jessie, this alone won't be sufficient. Create a new file at `/etc/systemd/system/varnish.service` and enter the following:

```bash
[Unit]
Description=Varnish HTTP accelerator

[Service]
Type=forking
LimitNOFILE=131072
LimitMEMLOCK=82000
ExecStartPre=/usr/sbin/varnishd -C -f /etc/varnish/default.vcl
ExecStart=/usr/sbin/varnishd -a :80 -T localhost:6082 -f /etc/varnish/default.vcl -S /etc/varnish/secret -s malloc,256m
ExecReload=/usr/share/varnish/reload-vcl

[Install]
WantedBy=multi-user.target
```

Next, we need to move our web server to a different port. We'll use port 8080. Replace the contents of `/etc/apache2/ports.conf` with this:

```apache
# If you just change the port or add more ports here, you will likely also
# have to change the VirtualHost statement in
# /etc/apache2/sites-enabled/000-default
# This is also true if you have upgraded from before 2.2.9-3 (i.e. from
# Debian etch). See /usr/share/doc/apache2.2-common/NEWS.Debian.gz and
# README.Debian.gz

NameVirtualHost *:8080
Listen 8080

<IfModule mod_ssl.c>
    # If you add NameVirtualHost *:443 here, you will also have to change
    # the VirtualHost statement in /etc/apache2/sites-available/default-ssl
    # to <VirtualHost *:443>
    # Server Name Indication for SSL named virtual hosts is currently not
    # supported by MSIE on Windows XP.
    Listen 443
</IfModule>

<IfModule mod_gnutls.c>
    Listen 443
</IfModule>
```

You'll also need to change the ports for the individual site files under `/etc/apache2/sites-available`, as in this example:

```apache
<VirtualHost *:8080>
    ServerAdmin webmaster@localhost

    DocumentRoot /var/www
    <Directory />
        Options FollowSymLinks
        AllowOverride All
    </Directory>
    <Directory /var/www/>
        Options FollowSymLinks MultiViews
        AllowOverride All
        Order allow,deny
        allow from all
    </Directory>

    ScriptAlias /cgi-bin/ /usr/lib/cgi-bin/
    <Directory "/usr/lib/cgi-bin">
        AllowOverride None
        Options +ExecCGI -MultiViews +SymLinksIfOwnerMatch
        Order allow,deny
        Allow from all
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/error.log

    # Possible values include: debug, info, notice, warn, error, crit,
    # alert, emerg.
    LogLevel warn

    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```

Writing our VCL file
--------------------

Next, we come to our Varnish configuration proper, which resides at `/etc/varnish/default.vcl`. The `vcl` stands for Varnish Configuration Language, and it has a syntax somewhat reminiscent of C.

The default behaviour for Varnish is as follows:

* It does not cache requests that contain cookie or authorisation headers
* It does not cache requests which the backend HTTP server indicates should not be cached
* It will only cache GET and HEAD requests

This behaviour is unlikely to meet your needs. We'll therefore work through the Varnish config file I wrote for this WordPress site in the hope that it will teach you enough to adapt it to your own needs.

```bash
vcl 4.0;

backend default {
    .host = "127.0.0.1";
    .port = "8080";
}

acl purge {
    "127.0.0.1";
    "localhost";
}

sub vcl_recv {

    # Never cache PUT, PATCH, DELETE or POST requests
    if (req.method == "PUT" || req.method == "PATCH" || req.method == "DELETE" || req.method == "POST") {
        return (pass);
    }

    # Never cache cart, account, checkout or addons
    if (req.url ~ "^/(cart|my-account|checkout|addons)") {
        return (pass);
    }

    # Never cache adding to cart
    if ( req.url ~ "\?add-to-cart=" ) {
        return (pass);
    }

    # Never cache admin or login
    if ( req.url ~ "^/wp-(admin|login|cron)" ) {
        return (pass);
    }

    # Never cache WooCommerce API
    if ( req.url ~ "wc-api" ) {
        return (pass);
    }

    # Remove has_js and CloudFlare/Google Analytics __* cookies and statcounter is_unique
    set req.http.Cookie = regsuball(req.http.Cookie, "(^|;\s*)(_[_a-z]+|has_js|is_unique)=[^;]*", "");
    # Remove a ";" prefix, if present.
    set req.http.Cookie = regsub(req.http.Cookie, "^;\s*", "");

    # Remove the wp-settings-1 cookie
    set req.http.Cookie = regsuball(req.http.Cookie, "wp-settings-1=[^;]+(; )?", "");

    # Remove the wp-settings-time-1 cookie
    set req.http.Cookie = regsuball(req.http.Cookie, "wp-settings-time-1=[^;]+(; )?"
            , "");

    # Remove the wp test cookie
    set req.http.Cookie = regsuball(req.http.Cookie, "wordpress_test_cookie=[^;]+(; )?", "");

    # Static content unique to the theme can be cached (so no user uploaded images)
    # The reason I don't take the wp-content/uploads is because of cache size on bigger blogs
    # that would fill up with all those files getting pushed into cache
    if (req.url ~ "wp-content/themes/" && req.url ~ "\.(css|js|png|gif|jp(e)?g)") {
        unset req.http.cookie;
    }

    # Even if no cookies are present, I don't want my "uploads" to be cached due to their potential size
    if (req.url ~ "/wp-content/uploads/") {
        return (pass);
    }

    # any pages with captchas need to be excluded
    if (req.url ~ "^/contact/")
    {
        return(pass);
    }

    # Check the cookies for wordpress-specific items
    if (req.http.Cookie ~ "wordpress_" || req.http.Cookie ~ "comment_") {
        # A wordpress specific cookie has been set
        return (pass);
    }

    # allow PURGE from localhost
    if (req.method == "PURGE") {
        if (!client.ip ~ purge) {
            return(synth(405, "Not allowed."));
        }
        return (purge);
    }

    # Force lookup if the request is a no-cache request from the client
    if (req.http.Cache-Control ~ "no-cache") {
        return (pass);
    }

    # Try a cache-lookup
    return (hash);
}

sub vcl_backend_response {
    set beresp.grace = 5m;
}
```

Let's take a closer look at the first part of the config:

```bash
vcl 4.0;

backend default {
    .host = "127.0.0.1";
    .port = "8080";
}
```

Here we define that we're using version 4.0 of VCL, and that the host to use as a back end is port 8080 on the same server. If your normal HTTP server is running on a different port, you will need to set it here. Also, note that you can use a different host as the backend.

```bash
acl purge {
    "127.0.0.1";
    "localhost";
}
```

We also set which hosts can trigger a purge of the cache, namely `localhost` and `127.0.0.1`. The web app hosted on the server can then make an HTTP `PURGE` request to a given path, which will clear that path from the cache. In our case, W3 Total Cache supports this - if it's a custom web app, you'll need to implement this functionality yourself to clear the cache when new content is added.

Next, we start the `vcl_recv` subroutine. This is where we define our rules for deciding whether or not to serve content from the cache. Let's look at our first rule:

```bash
sub vcl_recv {

    # Never cache PUT, PATCH, DELETE or POST requests
    if (req.method == "PUT" || req.method == "PATCH" || req.method == "DELETE" || req.method == "POST") {
        return (pass);
    }
```

Here, we declare that we should never cache any `PUT`, `PATCH`, `DELETE` or `POST` requests, on the basis that these change the state of the application. This ensures that things like contact forms will work as expected.

Note that we're getting the value of `req.method` to determine the HTTP verb used. The `req` object has many other properties we'll see being used.

```bash
    # Never cache cart, account, checkout or addons
    if (req.url ~ "^/(cart|my-account|checkout|addons)") {
        return (pass);
    }

    # Never cache adding to cart
    if ( req.url ~ "\?add-to-cart=" ) {
        return (pass);
    }

    # Never cache admin or login
    if ( req.url ~ "^/wp-(admin|login|cron)" ) {
        return (pass);
    }

    # Never cache WooCommerce API
    if ( req.url ~ "wc-api" ) {
        return (pass);
    }
```

Next, we define a series of regular expressions, and if the URL (represented by `req.url`) matches that regex, then the request is passed straight through to Apache without Varnish getting involved. In this case, we never want to cache the following sections:

* The shopping cart, checkout, addons page or account page
* The Add to cart button
* The WordPress admin and login screen, and cron requests
* The WooCommerce API

You'll need to consider which parts of your site must always serve the latest content and which don't need everything to be fully up to date. Typically admin areas any anything interactive must not be cached, while the front page is usually fine.

```bash
    # Remove has_js and CloudFlare/Google Analytics __* cookies and statcounter is_unique
    set req.http.Cookie = regsuball(req.http.Cookie, "(^|;\s*)(_[_a-z]+|has_js|is_unique)=[^;]*", "");
    # Remove a ";" prefix, if present.
    set req.http.Cookie = regsub(req.http.Cookie, "^;\s*", "");

    # Remove the wp-settings-1 cookie
    set req.http.Cookie = regsuball(req.http.Cookie, "wp-settings-1=[^;]+(; )?", "");

    # Remove the wp-settings-time-1 cookie
    set req.http.Cookie = regsuball(req.http.Cookie, "wp-settings-time-1=[^;]+(; )?"
            , "");

    # Remove the wp test cookie
    set req.http.Cookie = regsuball(req.http.Cookie, "wordpress_test_cookie=[^;]+(; )?", "");

```

Cookies, even ones set on the client side such as those for Google Analytics, can prevent content from being cached. To prevent this, you need to configure Varnish to discard these cookies before passing them on to Apache. In this case, we want to exclude Google Analytics and various WordPress cookies.

```bash
    # Static content unique to the theme can be cached (so no user uploaded images)
    if (req.url ~ "wp-content/themes/" && req.url ~ "\.(css|js|png|gif|jp(e)?g)") {
        unset req.http.cookie;
    }
```

Here we allow static content that's part of the site theme to be cached since that doesn't change often, so we unset the cookies for that request.

```bash
    # Even if no cookies are present, I don't want my "uploads" to be cached due to their potential size
    if (req.url ~ "/wp-content/uploads/") {
        return (pass);
    }
```

Here we prevent any user-uploaded content from being cached, since that can change often.

```bash
    # any pages with captchas need to be excluded
    if (req.url ~ "^/contact/")
    {
        return(pass);
    }
```

Captchas must obviously never be cached since that will break them. In this case, we assume that the contact form has a captcha, so it gets excluded from the cache.

```bash
    # Check the cookies for wordpress-specific items
    if (req.http.Cookie ~ "wordpress_" || req.http.Cookie ~ "comment_") {
        # A wordpress specific cookie has been set
        return (pass);
    }
```

Here we check for remaining WordPress-specific cookies. These would indicate that a user is signed in, in which case we may want to serve them all the latest content rather than displaying content from the cache.

```bash
    # allow PURGE from localhost
    if (req.method == "PURGE") {
        if (!client.ip ~ purge) {
            return(synth(405, "Not allowed."));
        }
        return (purge);
    }
```

Remember where we allowed the local server to clear the cache? This section actually carries out the purge when it receives a request from an authorised client.

```bash
    # Force lookup if the request is a no-cache request from the client
    if (req.http.Cache-Control ~ "no-cache") {
        return (pass);
    }
```

Here we check to see if the `Cache-Control` HTTP header is set to `no-cache`. If so, we pass it straight through to Apache.

```bash
    # Try a cache-lookup
    return (hash);
}
```

This is the last rule under `vcl_recv`, because it only reaches this point if the request has got past all the other rules. It tries to fetch the page from the cache. If the page is not in the cache, it passes it on to Apache and will cache the response.

```bash
sub vcl_backend_response {
    set beresp.grace = 5m;
}
```

This is where we set how long responses are cached for. Here we've set it to 5 minutes.

With that done, we should be ready to restart Varnish and Apache. If you are using an operating system with `systemd`, then the following commands should restart Apache and Varnish:

```bash
$ sudo systemctl reload apache2.service
$ sudo systemctl reload varnish.service
```

For those not yet using `systemd`, try this instead:

```bash
$ sudo service apache2 restart
$ sudo service varnish restart
```

If you then visit your site and inspect the HTTP headers using your browser's dev tools, you'll notice the new HTTP header `X-Varnish` in the response. This tells you that Varnish is up and running. If you make sure you're logged out, you should hopefully see that if you load a page, and then load it again, the second response is noticeably quicker.

Installing and configuring Varnish is a relatively quick and easy way of helping your website scale to be able to serve many more users, and if the site becomes popular all of a sudden, it can make a huge difference as to whether the site can stand up to the load or not. If you need more information on how to configure Varnish for your own needs, I recommend consulting the excellent [documentation](https://www.varnish-cache.org/docs/4.0/).
