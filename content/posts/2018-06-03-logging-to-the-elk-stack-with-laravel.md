---
title: "Logging to the ELK stack with Laravel"
date: 2018-06-03 16:30:54 +0100
categories:
- php
- laravel
- logging
comments: true
---

Logging to text files is the simplest and most common logging setup for web apps, and it works fine for relatively small and simple applications. However, it does have some downsides:

* It's difficult to make the log files accessible - normally users have to SSH in to read them.
* The tools used to filter and analyse log files have a fairly high technical barrier to access - grep and sed are not exactly easy for non-programmers to pick up, so business information can be hard to get.
* It's hard to visually identify trends in the data.
* Log files don't let you know immediately when something urgent happens
* You can't access logs for different applications through the same interface.

For rare, urgent issues where you need to be informed immediately they occur, it's straightforward to log to an instant messaging solution such as Slack or Hipchat. However, these aren't easily searchable, and can only be used for the most important errors (otherwise, there's a risk that important data will be lost in the noise). There are third-party services that allow you to search and filter your logs, but they can be prohibitively expensive.

The [ELK stack](https://www.elastic.co/elk-stack) has recently gained a lot of attention as a sophisticated solution for logging application data. It consists of:

* Logstash for processing log data
* Elasticsearch as a searchable storage backend
* Kibana as a web interface

By making the log data available using a powerful web interface, you can easily expose it to non-technical users. Kibana also comes with powerful tools to aggregate and filter the data. In addition, you can run your own instance, giving you a greater degree of control (as well as possibly being more cost-effective) compared to using a third-party service.

In this post I'll show you how to configure a Laravel application to log to an instance of the ELK stack. Fortunately, Laravel uses the popular Monolog logging library by default, which is relatively easy to get to work with the ELK stack. First, we need to install support for the GELF logging format:

```bash
$ composer require graylog2/gelf-php
```

Then, we create a custom logger class:

```php
<?php

namespace App\Logging;

use Monolog\Logger;
use Monolog\Handler\GelfHandler;
use Gelf\Publisher;
use Gelf\Transport\UdpTransport;

class GelfLogger
{
    /**
     * Create a custom Monolog instance.
     *
     * @param  array  $config
     * @return \Monolog\Logger
     */
    public function __invoke(array $config)
    {
        $handler = new GelfHandler(new Publisher(new UdpTransport($config['host'], $config['port'])));
        return new Logger('main', [$handler]);
    }
}
```

Finally, we configure our application to use this as our custom driver and specify the host and port in `config/logging.php`:

```php
        'custom' => [
            'driver' => 'custom',
            'via' => App\Logging\GelfLogger::class,
            'host' => '127.0.0.1',
            'port' => 12201,
        ],
```

You can then set up whatever logging channels you need for your application, and specify whatever log level you feel is appropriate.

Please note that this requires at least Laravel 5.6 - this file doesn't exist in Laravel 5.5 and earlier, so you may have more work on your hands to integrate it with older versions.

If you already have an instance of the ELK stack set up on a remote server that's already set up to accept input as GELF, then you should be able to point it at that and you'll be ready to go. If you just want to try it out, I've been using a [Docker-based project](https://github.com/deviantony/docker-elk) that makes it straightforward to run the whole stack locally. However, you will need to amend `logstash/pipeline/logstash.conf` as follows to allow it to accept log data:

```json
input {
	tcp {
		port => 5000
	}
   gelf {
       port => 12201
       type => gelf
       codec => "json"
   }
}

## Add your filters / logstash plugins configuration here

output {
	elasticsearch {
		hosts => "elasticsearch:9200"
	}
}
```

Then you can start it up using the instructions in the repository and it should be ready to go. Now, if you run the following command from Tinker:

```php
Log::info('Just testing');
```

Then if you access the web interface, you should be able to find that log message without any difficulty.

Now, this only covers the Laravel application logs. You may well want to pass other logs through to Logstash, such as Apache, Nginx or MySQL logs, and a quick Google should be sufficient to find ideas on how you might log for these services. Creating visualisations with Kibana is a huge subject, and the existing documentation covers that quite well, so if you're interested in learning more about that I'd recommend reading the documentation and having a play with the dashboard.
