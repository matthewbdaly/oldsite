---
title: "Broadcasting events with Laravel and Socket.io"
date: 2016-05-14 21:00:00 +0100
categories:
- laravel
- php
- node.js
- redis
- socket.io
comments: true
---

PHP frameworks like Laravel aren't really set up to handle real-time events properly, so if you want to build a real-time app, you're generally better off with another platform, such as Node.js. However, if that only forms a small part of your application, you may still prefer to work with PHP. Fortunately it's fairly straightforward to hand off the real-time aspects of your application to a dedicated microservice written using Node.js and still use Laravel to handle the rest of the functionality.

Here I'll show you how I built a Laravel app that uses a separate Node.js script to handle sending real-time updates to the user.

Events in Laravel
-----------------

In this case, I was building a REST API to serve as the back end for a Phonegap app that allowed users to message each other. The API includes an endpoint that allows users to create and fetch messages. Now, in theory, we could just repeatedly poll the endpoint for new messages, but that would be inefficient. What we needed was a way to notify users of new messages in real time, which seemed like the perfect opportunity to use Socket.io.

Laravel comes with a simple, but robust system that allows you to broadcast events to a Redis server. Another service can then listen for these events and carry out jobs on them, and there is no reason why this service has to be written in PHP. This makes it easy to decouple your application into smaller parts. In essence the functionality we wanted was as follows:

* Receive message
* Push message to Redis
* Have a separate service pick up message on Redis
* Push message to clients

First off, we need to define an event in our Laravel app. You can create a boilerplate with the following Artisan command:

```bash
$ php artisan make:event NewMessage
```

This will create the file `app/Events/NewMessage.php`. You can then customise this as follows:

```php
<?php

namespace App\Events;

use App\Events\Event;
use App\Message;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class NewMessage extends Event implements ShouldBroadcast
{
    use SerializesModels;

    public $message;

    /**
     * Create a new event instance.
     *
     * @return void
     */
    public function __construct(Message $message)
    {
        // Get message
        $this->message = $message;
    }

    /**
     * Get the channels the event should be broadcast on.
     *
     * @return array
     */
    public function broadcastOn()
    {
        return ['room_'.$this->message->room_id];
    }
}
```

This particular event is a class that accepts a single argument, which is an instance of the `Message` model. This model includes an attribute of `room_id` that is used to determine which room the message is posted to - note that this is returned in the `broadcastOn()` method.

When we want to trigger our new event, we can do so as follows:

```php
use App\Events\NewMessage;
Event::fire(new NewMessage($message));
```

Here, `$message` is the saved Eloquent object containing the message. Note the use of `SerializesModels` - this means that the Eloquent model is serialised into JSON when broadcasting the event.

We also need to make sure Redis is set as our broadcast driver. Ensure the Composer package `predis/predis` is installed, and set `BROADCAST_DRIVER=redis` in your `.env` file. Also, please note that I found that setting `QUEUE_DRIVER=redis` in `.env` as well broke the broadcasting system, so it looks like you can't use Redis as both a queue and a broadcasting system unless you set up multiple connections.


Next, we need another server-side script to handle processing the received events and pushing the messages out. In my case, this was complicated by the fact that we were using HTTPS, courtesy of Let's Encrypt. I installed the required dependencies for the Node.js script as follows:

```bash
$ npm install socket.io socket.io-client ioredis --save-dev
```

Here's an example Node.js script for processing the events:

```javascript
var fs = require('fs');
var pkey = fs.readFileSync('/etc/letsencrypt/live/example.com/privkey.pem');
var pcert = fs.readFileSync('/etc/letsencrypt/live/example.com/fullchain.pem')

var options = {
  key: pkey,
  cert: pcert
};

var app = require('https').createServer(options);
var io = require('socket.io')(app);

var Redis = require('ioredis');
var redis = new Redis();

app.listen(9000, function() {
    console.log('Server is running!');
});

function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200);
    res.end('');
}

io.on('connection', function(socket) {
    //
});

redis.psubscribe('*', function(err, count) {
    //
});

redis.on('pmessage', function(subscribed, channel, message) {
    message = JSON.parse(message);
    console.log('Channel is ' + channel + ' and message is ' + message);
    io.emit(channel, message.data);
});
```

Note we use the `https` module instead of the `http` one, and we pass the key and certificate as options to the server. This server runs on port 9000, but feel free to move it to any arbitrary port you wish. In production, you'd normally use something like Supervisor or systemd to run a script like this as a service.

Next, we need a client-side script to connect to the Socket.io instance and handle any incoming messages. Here's a very basic example that just dumps them to the browser console:

```javascript
var url = window.location.protocol + '//' + window.location.hostname;
var socket = io(url, {
  'secure': true,
  'reconnect': true,
  'reconnection delay': 500,
  'max reconnection attempts': 10
});
var chosenEvent = 'room_' + room.id;
socket.on(chosenEvent, function (data) {
  console.log(data);
});
```

Finally, we need to configure our web server. I'm using Nginx with PHP-FPM and PHP 7, and this is how I configured it:

```nginx
upstream websocket {
	server 127.0.0.1:9000;
}

server {
	listen         80;
	server_name example.com;
	return 301 https://$host$request_uri;
}

server {
	listen 443 ssl;
	server_name example.com;
	ssl on;
	ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
	ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
	proxy_set_header Host $host;
	proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	proxy_set_header X-Forwarded-Proto $scheme;
	proxy_set_header X-Real-IP $remote_addr;
	ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
	ssl_prefer_server_ciphers on;
	ssl_ciphers 'EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH';
	client_max_body_size 50M;
	server_tokens off;
	add_header X-Frame-Options SAMEORIGIN;
	add_header X-Content-Type-Options nosniff;
	add_header X-XSS-Protection "1; mode=block";

	root /var/www/public;
	index index.php index.html index.htm;

	location / {
		try_files $uri $uri/ /index.php?$query_string;
		gzip on;
		gzip_proxied any;
		gzip_types text/plain text/css application/javascript application/x-javascript text/xml application/xml application/xml-rss text/javascript text/js application/json;
		expires 1y;
		charset utf-8;
	}

	location ~ \.php$ {
		try_files $uri /index.php =404;
		fastcgi_split_path_info ^(.+\.php)(/.+)$;
		fastcgi_pass unix:/var/run/php/php7.0-fpm.sock;
		fastcgi_index index.php;
		fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
		include fastcgi_params;
	}

	location ~ /.well-known {
		root /var/www/public;
		allow all;
	}

	location /socket.io {
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";
		proxy_http_version 1.1;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header Host $host;
		proxy_pass https://websocket;
	}
}
```

Any requests to `/socket.io` are proxied to port 9000, where our chat handling script is listening. Note that we allow the HTTPS connection to be upgraded to a WebSocket one.

Once that's done, you just need to restart your PHP application and Nginx, and start running your chat script, and everything should be working fine. If it isn't, the command `redis-cli monitor` is invaluable in verifying that the event is being published correctly.

Summary
-------

Getting this all working together did take quite a bit of trial and error, but that was mostly a matter of configuration. Actually implementing this is pretty straightforward, and it's an easy way to add some basic real-time functionality to an existing Laravel application.
