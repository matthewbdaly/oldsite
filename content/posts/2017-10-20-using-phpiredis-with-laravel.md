---
title: "Using phpiredis with Laravel"
date: 2017-10-20 22:55:26 +0100
categories:
- php
- laravel
- redis
comments: true
---

Laravel has support out of the box for using Redis. However, by default it uses a Redis client written in PHP, which will always be a little slower than one written in C. If you're making heavy use of Redis, it may be worth using the [phpiredis](https://github.com/nrk/phpiredis) extension to squeeze a little more performance out of it.

I'm using PHP 7.0 on Ubuntu Zesty and I installed the dependencies with the following command:

```bash
$ sudo apt-get install libhiredis-dev php-redis php7.0-dev
```

Then I installed phpiredis as follows:

```bash
git clone https://github.com/nrk/phpiredis.git && \
       cd phpiredis && \
       phpize && \
       ./configure --enable-phpiredis && \
       make && \
       sudo make install
```

Finally, I configured Redis to use phpiredis in the `redis` section of `config/database.php` for a Laravel app:

```php
    'redis' => [

        'cluster' => false,

        'default' => [
            'host'     => env('REDIS_HOST', 'localhost'),
            'password' => env('REDIS_PASSWORD', null),
            'port'     => env('REDIS_PORT', 6379),
            'database' => 0,
            'options' => [
                'connections' => [
                    'tcp' => 'Predis\Connection\PhpiredisStreamConnection', // PHP streams
                    'unix' => 'Predis\Connection\PhpiredisSocketConnection', // ext-socket
                ],
            ]
        ],
    ],
```

Now, I'm going to be honest - in a casual comparison I couldn't see much difference in terms of speed. I would probably only bother with setting this up on a site where high Redis performance was absolutely necessary. If you just want a quicker cache response it might make more sense to put Varnish in front of the site instead. However, in cases where Redis gets used heavily, it's probably worth doing.
