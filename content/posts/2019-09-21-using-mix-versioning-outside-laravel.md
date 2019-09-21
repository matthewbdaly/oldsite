---
title: "Using Mix versioning outside Laravel"
date: 2019-09-21 11:30:50 +0100
categories:
- php
- laravel
comments: true
---

Laravel Mix is a really convenient front end scaffold, and not just in the context of a Laravel application. Last year, I added it to a legacy application I maintain, with positive results, and I'm including it in a CMS I'm working on.

However, I've always had issues trying to implement versioning outside a Laravel application. I've used the timestamp technique described [here](https://matthewdaly.co.uk/blog/2016/11/26/easy-static-asset-versioning-in-php/) a lot in the past, but nowadays I do most of my work in a Lando container, and I've had a lot of issues with timestamp changes not being picked up, forcing me to restart my container regularly when working on front-end assets. Switching to using Mix versioning seemed like a good way to resolve that issue, but of course the `mix()` helper isn't available elsewhere.

Fortunately, its not all that hard to implement your own solution. Under the bonnet, Mix versioning works as follows:

* The build generates an array of compiled static assets, with the key being the path to the asset, and the value being the path with a query string appended, and then saves it as `mix-manifest.json`
* The `mix()` helper loads the `mix-manifest.json` file, converts it to JSON, fetches the array entry by path, and then returns the appropriate value for passing back from the helper

With that in mind, I wrote the following Twig filter to handle assets versioned with Mix:

```php
<?php declare(strict_types=1);

namespace Project\Core\Views\Filters;

use Exception;

final class Mix
{
    public function __invoke(string $path): string
    {
        $manifest = json_decode(file_get_contents('mix-manifest.json'), true);
        if (! array_key_exists("/" . $path, $manifest)) {
            throw new Exception(
                "Unable to locate Mix file: {$path}"
            );
        }
        if (!file_exists($path)) {
            throw new Exception('Included file does not exist');
        }
        return $manifest["/" . $path];
    }
}
```

This works on the basis that the web root is set in the `public/` folder, and that the compiled CSS and Javascript files are placed there - if that's not the case you may need to adapt this accordingly.

You also need to add the `version()` call to your `webpack.mix.js`:

```javascript
const mix = require('laravel-mix');

/*
 |--------------------------------------------------------------------------
 | Mix Asset Management
 |--------------------------------------------------------------------------
 |
 | Mix provides a clean, fluent API for defining some Webpack build steps
 | for your Laravel application. By default, we are compiling the Sass
 | file for the application as well as bundling up all the JS files.
 |
 */

mix
  .setPublicPath('public/')
  .js('resources/js/app.js', 'public/js')
  .sass('resources/sass/app.scss', 'public/css')
  .version();
```

Then, when you instantiate Twig, you can add the new filter using something like this:

```php
$twig = new Environment($container->get('Twig\Loader\FilesystemLoader'), $config);
$mix = $container->get('Project\Core\Views\Filters\Mix');
$twig->addFilter(new TwigFilter('mix', $mix));
```

Now, the filter should be usable in your Twig views as shown:

```twig
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

    <link rel="stylesheet" href="{{ 'css/app.css'| mix }}" />

    <title>{{ title }}</title>
  </head>
  <body>
    {% include 'header.html' %}
    {% block body %}
    {% endblock %}

    <script src="{{ 'js/app.js'| mix }}"></script>
  </body>
</html>
```

If you're using a different framework or templating system, there should be a way to create helpers, and it should be possible to implement this technique fairly easily. I was able to do so in the context of a legacy Zend application, so it should be possible with other legacy frameworks like CodeIgniter.
