---
title: "Easy static asset versioning in PHP"
date: 2016-11-26 21:40:39 +0000
categories:
- php
- static
comments: true
---

It's prudent to cache static assets such as images, Javascript and CSS to improve performance, but that raises the issue of changes not being reflected in your site due to visitor's browsers retaining the cached versions. Many content management systems and frameworks already handle this for you (such as Laravel's Elixir build system), but what if you have to work with a legacy application that doesn't do this?

Fortunately there's a quite easy solution in PHP. Using the `filemtime()` function described [here](http://php.net/manual/en/function.filemtime.php), we can get a Unix timestamp for when a file was last altered. This is perfect to use to identify when a file last changed, because by appending a new query string to the file name when loading it, we can trick the browser into thinking it's a new file when it's not, as in this example for a CodeIgniter application:

```php
<link rel="stylesheet" type="text/css" href="<?=$path?>?v=<?=filemtime($path)?>">
```

   Obviously, this is a bit repetitive, so you may want to refactor this into some kind of template helper to make it easier to use, but the underlying principle applies to most programming languages. For instance, if you wanted to do so in a Handlebars template, you might want to create a helper something like this:

```javascript
var fs = require('fs');
var Handlebars = require('handlebars');
Handlebars.registerHelper('version', function (path) {
   return path + '?v=' + fs.statSync(path).mtime.getTime();
});
```

Where more robust solutions such as Elixir are already available, I'd advise making full use of them. However, this technique is a quick and easy way to implement versioning for static assets in existing projects.
