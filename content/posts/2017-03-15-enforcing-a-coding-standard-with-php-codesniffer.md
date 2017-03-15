---
title: "Enforcing a coding standard with PHP CodeSniffer"
date: 2017-03-15 21:37:11 +0000
categories:
- php
comments: true
---

We all start new projects with the best of intentions - it'll be clean, fully tested and work perfectly. Sadly as deadlines loom, it's all too easy to find yourself neglecting your code quality, and once it starts to degrade, getting it back becomes much harder. Many development teams try to adhere to a coding standard, but it can be hard to enforce on other people - it puts you in the uncomfortable position of nagging others all the time.

Fortunately, there's an easy solution that doesn't force everyone to use the same IDE. [PHP CodeSniffer](https://github.com/squizlabs/PHP_CodeSniffer) is a useful package that lets you specify a coding standard and then validate your code against it. That way, you can set up continuous integration and use that to remind people of errors. Better still, it also allows many errors to be fixed automatically.

To use it on your PHP project, run the following command:

```bash
$ composer require --dev squizlabs/php_codesniffer 
```

As this will only ever be used in development, you should use the `--dev` flag. We also need to specify the settings for our project. This example is for a module to be used with a Laravel application and should be saved as `phpcs.xml`:

```xml
<?xml version="1.0"?>
<ruleset name="PHP_CodeSniffer">
 <description>The coding standard for our project.</description>

 <file>app</file>
 <file>tests</file>


  <exclude-pattern>*/migrations/*</exclude-pattern>

 <arg value="np"/>

<rule ref="PSR2"/>
</ruleset>
```

Note the `<rule />` tag - this specifies that this project should be validated as PSR2. Also, note the `<file />` and `<exclude-pattern />` tags - these specify what files should and should not be checked.

With this in place, we're ready to run PHP CodeSniffer:

```bash
$ vendor/bin/phpcs
......................

Time: 45ms; Memory: 6Mb
```

In this case, our code validated successfully. However, if it doesn't, there's an easy way to tidy it up. Just run this command:

```bash
$ vendor/bin/phpcbf
```

That will fix many of the most common problems, and any others should be straightforward to fix.

PHP CodeSniffer makes it extremely straightforward to enforce a coding style. You can write custom rulesets or just use an existing one as you prefer, and it's easy to fix many common problems automatically. In fact, it makes it so easy that there's very little excuse *not* to meet the coding standard.
