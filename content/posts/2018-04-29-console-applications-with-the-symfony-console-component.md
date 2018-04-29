---
title: "Console applications with the Symfony Console component"
date: 2018-04-29 20:59:27 +0100
categories:
- php
- symfony
- console
comments: true
---

Recently I've had the occasion to add a series of console commands to a legacy application. This can be made straightforward by using the Symfony console component. In this post I'll demonstrate how to write a simple console command for clearing a cache folder.

The first step is to install the Console component:

```bash
$ composer require symfony/console
```

Then we write the main script for the application. I usually save mine as `console` - note that we don't want to have to type out a file extension, so instead we use the shebang:

```php
#!/user/bin/env php
<?php

require __DIR__.'/vendor/autoload.php';

use Symfony\Component\Console\Application;

define('CONSOLE_ROOT', __DIR__);
$app = new Application();

$app->run();
```

In this case, I've defined `CONSOLE_ROOT` as the directory in which the console command is run - that way, the commands can use it to refer to the application root.

We can then run our console application as follows:

```bash
$ php console
Console Tool

Usage:
  command [options] [arguments]

Options:
  -h, --help            Display this help message
  -q, --quiet           Do not output any message
  -V, --version         Display this application version
      --ansi            Force ANSI output
      --no-ansi         Disable ANSI output
  -n, --no-interaction  Do not ask any interactive question
  -v|vv|vvv, --verbose  Increase the verbosity of messages: 1 for normal output, 2 for more verbose output and 3 for debug

Available commands:
  help  Displays help for a command
  list  Lists commands
```

This displays the available commands, but you'll note that there are none except for `help` and `list`. We'll remedy that. First, we'll register a command:

```php
$app->add(new App\Console\ClearCacheCommand);
```

This has to be done in `console`, after we create `$app`, but before we run it.

Don't forget to update the autoload section of your `composer.json` to register the namespace:

```json
    "autoload": {
        "psr-4": {
            "App\\Console\\": "src/Console/"
        }
    },
```

Then create the class for that command. This class must extend `Symfony\Component\Console\Command\Command`, and must have two methods:

* `configure()`
* `execute()`

In addition, the `execute()` method must accept two arguments, an instance of `Symfony\Component\Console\Input\InputInterface`, and an instance of `Symfony\Component\Console\Output\OutputInterface`. There are used to retrieve input and display output.

Let's write our command:

```php
<?php

namespace App\Console;

use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class ClearCacheCommand extends Command
{
    protected function configure()
    {
        $this->setName('cache:clear')
             ->setDescription('Clears the cache')
             ->setHelp('This command clears the application cache');
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $dir = CONSOLE_ROOT.DIRECTORY_SEPARATOR.'cache';
        $this->deleteTree($dir);
        $output->writeln('Cache cleared');
    } 

    private function deleteTree($dir)
    {
        $files = array_diff(scandir($dir), array('.','..')); 
        foreach ($files as $file) { 
            (is_dir("$dir/$file")) ? $this->deleteTree("$dir/$file") : unlink("$dir/$file"); 
        } 
        return rmdir($dir); 
    }
}
```

As you can see, in the `configure()` method, we set the name, description and help text for the command.

The `execute()` method is where the actual work is done. In this case, we have some code that needs to be called recursively, so we have to pull it out into a private method. Once that's done we use `$output->writeln()` to write a line to the output.

Now, if we run our console task, we should see our new command:

```bash
$ php console
Console Tool

Usage:
  command [options] [arguments]

Options:
  -h, --help            Display this help message
  -q, --quiet           Do not output any message
  -V, --version         Display this application version
      --ansi            Force ANSI output
      --no-ansi         Disable ANSI output
  -n, --no-interaction  Do not ask any interactive question
  -v|vv|vvv, --verbose  Increase the verbosity of messages: 1 for normal output, 2 for more verbose output and 3 for debug

Available commands:
  help         Displays help for a command
  list         Lists commands
 cache
  cache:clear  Clears the cache
```

And we can see it in action too:

```bash
$ php console cache:clear
Cache cleared
```

For commands that need to accept additional arguments, you can define them in the `configure()` method:

```php
$this->addArgument('file', InputArgument::REQUIRED, 'Which file do you want to delete?')
```

Then, you can access it in the `execute()` method using `InputInterface`:

```php
$file = $input->getArgument('file');
```

This tutorial is just skimming the surface of what you can do with the Symfony Console components - indeed, many other console interfaces, such as Laravel's Artisan, are built on top of it. If you have a legacy application built in a framework that lacks any sort of console interface, such as CodeIgniter, then you can quite quickly produce basic console commands for working with that application. The [documentation is very good](https://symfony.com/doc/current/console.html), and with a little work you can soon have something up and running.
