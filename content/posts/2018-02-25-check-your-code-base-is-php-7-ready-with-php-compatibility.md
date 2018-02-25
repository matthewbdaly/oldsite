---
title: "Check your code base is PHP 7 ready with PHP Compatibility"
date: 2018-02-25 17:22:34 +0000
categories:
- php
comments: true
---

I've recently started a new job and as part of that I'm working on a rather substantial legacy code base. In fact, it was so legacy that it was still in Subversion - needless to say the very first thing I did was migrate it to Git. One of the jobs on our radar for this code base is to migrate it to from PHP 5.4 to 5.6, and subsequently to PHP 7. I've been using it locally in 5.6 without issue so far, but I've also been looking around for an automated tool to help catch potential problems.

I recently discovered [PHP Compatibility](https://github.com/wimg/PHPCompatibility) which is a set of sniffs for PHP CodeSniffer that can be used to detect code that will be problematic in a particular PHP version. As I use CodeSniffer extensively already, it's a good fit for my existing toolset.

To install it, add the following dependencies to your `composer.json`:

```json
    "require-dev": {
        "dealerdirect/phpcodesniffer-composer-installer": "^0.4.3",
        "squizlabs/php_codesniffer": "^2.5",
        "wimg/php-compatibility": "^8.1"
    },
```

Then update your `phpcs.xml` to look something like this:

```xml
<ruleset name="PHP_CodeSniffer">
   <description>The coding standard for my app.</description>
   <file>./</file>
   <arg value="np"/>
   <rule ref="PSR2"/>
   <rule ref="PHPCompatibility"/>
   <config name="testVersion" value="7.2-"/>
</ruleset>
```

As you can see, it's possible to use it alongside existing coding standards such as PSR2. Note the `testVersion` config key - the value specified is the PHP version we're testing against. Here we're specifying PHP 7.2.

Obviously, the very best way to guard against breakages in newer versions of PHP is to have a comprehensive test suite, but legacy code bases by definition tend to have little or no tests. By using PHP Compatibility, you should at least be able to catch syntax problems without having to audit the code base manually.
