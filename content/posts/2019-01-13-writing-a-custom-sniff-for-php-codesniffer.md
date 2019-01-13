---
title: "Writing a custom sniff for PHP CodeSniffer"
date: 2019-01-13 18:50:45 +0000
categories:
- php
- codesniffer
comments: true
---

I've recently come around to the idea that [in PHP all classes should be final by default](https://matthiasnoback.nl/2018/09/final-classes-by-default-why/), and have started doing so as a matter of course. However, when you start doing something like this it's easy to miss a few files that haven't been updated, or forget to do it, so I wanted a way to detect PHP classes that are not set as either abstract or final, and if possible, set them as final automatically. I've mentioned before that I use PHP CodeSniffer extensively, and that has the capability to both find and resolve deviations from a coding style, so last night I started looking into the possibility of creating a coding standard for this. It took a little work to understand how to do this so I thought I'd use this sniff as a simple example.

The first part is to set out the directory structure. There's a very specific layout you have to follow for PHP CodeSniffer:

* The folder for the standard must have the name of the standard, and be in the source folder set by Composer (in this case, `src/AbstractOrFinalClassesOnly`.
* This folder must contain a `ruleset.xml` file defining the name and description of the standard, and any other required content.
* Any defined sniffs must be in a `Sniffs` folder.

The `ruleset.xml` file was fairly simple in this case, as this is a very simple standard:

```xml
<?xml version="1.0"?>
<ruleset name="AbstractOrFinalClassesOnly">
    <description>Checks all classes are marked as either abstract or final.</description>
</ruleset>
```

The sniff is intended to do the following:

* Check all classes have either the `final` keyword or the `abstract` keyword set
* When running the fixer, make all classes without the `abstract` keyword final

First of all, our class must implement the interface `PHP_CodeSniffer\Sniffs\Sniff`, which requires the following methods:

```php
    public function register(): array;

    public function process(File $file, $position): void;
```

Note that `File` here is an instance of `PHP_CodeSniffer\Files\File`. The first method registers the code the sniff should operate on. Here we're only interested in classes, so we return an array containing `T_CLASS`. This is defined in the [list of parser tokens used by PHP](https://secure.php.net/manual/en/tokens.php), and represents classes and objects:

```php
    public function register(): array
    {
        return [T_CLASS];
    }
```

For the `process()` method, we receive two arguments, the file itself, and the position. We need to keep a record of the tokens we check for, so we do so in a private property:

```php
    private $tokens = [
        T_ABSTRACT,
        T_FINAL,
    ];
```

Then, we need to find the error:

```php
        if (!$file->findPrevious($this->tokens, $position)) {
            $file->addFixableError(
                'All classes should be declared using either the "abstract" or "final" keyword',
                $position - 1,
                self::class
            );
        }
```

We use `$file` to get the token before `class`, and pass the `$tokens` property as a list of acceptable values. If the preceding token is not either `abstract` or `final`, we add a fixable error. The first argument is the string error message, the second is the location, and the third is the class of the sniff that has failed.

That will catch the issue, but won't actually fix it. To do that, we need to get the fixer from the file object, and call its `addContent()` method to add the `final` keyword. We amend `process()` to extract the fixer, add it as a property, and then call the `fix()` method when we come across a fixable error:

```php
    public function process(File $file, $position): void
    {
        $this->fixer = $file->fixer;
        $this->position = $position;

        if (!$file->findPrevious($this->tokens, $position)) {
            $file->addFixableError(
                'All classes should be declared using either the "abstract" or "final" keyword',
                $position - 1,
                self::class
            );
            $this->fix();
        }
    }
```

Then we define the `fix()` method:

```php
    private function fix(): void
    {
        $this->fixer->addContent($this->position - 1, 'final ');
    }
```

Here's the finished class:

```php
<?php declare(strict_types=1);

namespace Matthewbdaly\AbstractOrFinalClassesOnly\Sniffs;

use PHP_CodeSniffer\Sniffs\Sniff;
use PHP_CodeSniffer\Files\File;

/**
 * Sniff for catching classes not marked as abstract or final
 */
final class AbstractOrFinalSniff implements Sniff
{
    private $tokens = [
        T_ABSTRACT,
        T_FINAL,
    ];

    private $fixer;

    private $position;

    public function register(): array
    {
        return [T_CLASS];
    }

    public function process(File $file, $position): void
    {
        $this->fixer = $file->fixer;
        $this->position = $position;

        if (!$file->findPrevious($this->tokens, $position)) {
            $file->addFixableError(
                'All classes should be declared using either the "abstract" or "final" keyword',
                $position - 1,
                self::class
            );
            $this->fix();
        }
    }

    private function fix(): void
    {
        $this->fixer->addContent($this->position - 1, 'final ');
    }
}
```

I've made the resulting standard [available via Github](https://github.com/matthewbdaly/abstract-or-final-sniff).

This is a bit rough and ready and I'll probably refactor it a bit when I have time, but it's proven fairly easy to create this sniff, except for the fact I had to go rooting around various tutorials that weren't all that clear. Hopefully this example is a bit simpler and easier to follow.
