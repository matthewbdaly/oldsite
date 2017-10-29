---
title: "Creating an Azure storage adapter for Laravel"
date: 2016-10-24 00:25:27 +0100
categories:
- php
- laravel
comments: true
---

UPDATE: This post has now been superseded by [this one](/blog/2017/10/29/an-azure-filesystem-integration-for-laravel/) as I've released this integration as a package.

About a year ago I was working on my first non-trivial Laravel application. The client had, for their own reasons, wanted to use Microsoft's Azure platform, particularly for its blob storage functionality, which is somewhat comparable to Amazon S3. Now, Laravel has the excellent `Storage` facade  that allows consistent access to both local files and those stored on various file hosting services, which is built on top of [Flysystem](https://flysystem.thephpleague.com/). Flysystem has an Azure driver, but the Laravel storage doesn't include support for it, so at the time I resigned myself to using Flysystem directly, which wasn't actually that bad, but not ideal.

A few days ago I stumbled across [this section of the Laravel documentation](https://laravel.com/docs/5.1/filesystem#custom-filesystems), which had me kicking myself. It's actually trivially easy to implement a custom filesystem for Laravel if it already has a Flysystem adapter, as demonstrated in their Dropbox implementation in the docs. Using this as a guide, I was able to produce the following service provider for using Azure as a storage backend very quickly:

```php
<?php

namespace App\Providers;

use Storage;
use League\Flysystem\Filesystem;
use Illuminate\Support\ServiceProvider;
use League\Flysystem\Azure\AzureAdapter;
use WindowsAzure\Common\ServicesBuilder;

class AzureStorageServiceProvider extends ServiceProvider
{
    /**
     * Perform post-registration booting of services.
     *
     * @return void
     */
    public function boot()
    {
		Storage::extend('azure', function($app, $config) {
			$endpoint = sprintf(
				'DefaultEndpointsProtocol=https;AccountName=%s;AccountKey=%s',
                $config['name'],
                $config['key']
			);

			$blobRestProxy = ServicesBuilder::getInstance()->createBlobService($endpoint);
			return new Filesystem(new AzureAdapter($blobRestProxy, $config['container']));
		});
	}

	/**
	 * Register bindings in the container.
	 *
	 * @return void
	 */
	public function register()
	{
		//
	}
}
```

This should be saved as `app/Providers/AzureStorageServiceProvider.php`. You also need to add this to the list of service providers in `config/app.php`:

```php
        App\Providers\AzureStorageServiceProvider::class,
```

And add this to `config/filesystems.php`:

```php
        'azure' => [
            'driver'    => 'azure',
            'name'      => env('STORAGE_NAME'),
            'key'       => env('STORAGE_KEY'),
            'container' => env('STORAGE_CONTAINER'),
        ],
```

I like to also set my storage backend using environment variables in this file, as in this example:

```php
    'default' => env('STORAGE_BACKEND', 'local'),
```

That way we can easily set a different backend for testing, development and production so we don't upload files when running PHPUnit. You can also keep your other config settings in your `.env` file, which is always a better idea than keeping it under version control. You also need to install the `microsoft/windowsazure` and `league/flysystem-azure` packages via Composer for this to work.

As I've since changed jobs it's unlikely I'll ever actually use this Azure integration in production - it's not a service I'd choose of my own accord to use. However, since it's so straightforward to implement an adapter like this I imagine I may be doing something similar - I'm currently working on a web app that uses MongoDB for some of its data and currently stores files locally, so it might make sense to create a GridFS integration along similar lines. It may also be useful for someone else, so feel free to use it if you wish.
