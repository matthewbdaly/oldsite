---
title: "Catching debug statements in PHP"
date: 2017-11-06 12:00:18 +0000
categories:
- php
- codesniffer
comments: true
---

It's unfortunately quite easy to neglect to remove debugging statements in PHP code. I've done so many times myself, and it's not unknown for these to wind up in production. After I saw it happen again recently, I decided to look around for a way to prevent it happening.

[As mentioned earlier](/blog/2017/03/15/enforcing-a-coding-standard-with-php-codesniffer/), I generally use PHP CodeSniffer to enforce a coding standard on my projects, and it's easy to set it up and run it. With a little work, you can also use it to catch these unwanted debugging statements before they get committed.

First, you need to make sure `squizlabs/php_codesniffer` is included in your project's development dependencies in `composer.json`. Then, create a `phpcs.xml` file that looks something like this:

```xml
<?xml version="1.0"?>
<ruleset name="PHP_CodeSniffer">
	<description>Coding standard.</description>
	<file>src</file>
	<arg value="np"/>
	<rule ref="PSR2"/>
	<rule ref="Squiz.Commenting.FunctionComment" />
	<rule ref="Squiz.Commenting.FunctionCommentThrowTag" />
	<rule ref="Squiz.Commenting.ClassComment" />
	<rule ref="Squiz.PHP.ForbiddenFunctions">
		<properties>
			<property name="forbiddenFunctions" type="array" value="eval=>NULL,dd=>NULL,die=>NULL,var_dump=>NULL,sizeof=>count,delete=>unset,print=>echo,create_function=>NULL"/>
		</properties>
	</rule>
</ruleset>
```

The key is the rule `Squiz.PHP.ForbiddenFunctions`. This allows us to define a list of functions that are forbidden in our project. Typically this will be things like `die()`, `eval()`, `var_dump()` and `dd()`.

Now, this ruleset will catch the unwanted functions (as well as enforcing PSR2 and certain rules about comments), but we can't guarantee that we'll always remember to run it. We could run CodeSniffer in continuous integration (and this is a good idea anyway), but that doesn't stop us from committing code with those forbidden functions. We need a way to ensure that CodeSniffer runs on every commit and doesn't allow it to go ahead if it fails. To do that we can use a pre-commit hook. Save the following in your repository as `.git/hooks/pre-commit`:

```bash
vendor/bin/phpcs
```

Then run the following command to make it executable:

```bash
$ chmod +x .git/hooks/pre-commit
```

A pre-commit hook is run before every commit, and if it returns false, will not allow the commit to go ahead. That means that if CodeSniffer fails for any reason, we will have to go back and fix the problem before we can commit. If for some reason you do need to bypass this check, you can still do so by using the `--no-verify` flag with `git commit`.

The advantage of this method is that it's not dependent on any one IDE or editor, so it's widely applicable. However, if you're doing this sort of thing with Git hooks, you may want to look at some of the solutions for managing hooks, since `.git/hooks` is outside the actual Git repository.
