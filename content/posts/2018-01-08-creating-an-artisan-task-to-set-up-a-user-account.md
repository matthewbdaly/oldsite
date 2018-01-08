---
title: "Creating an Artisan task to set up a user account"
date: 2018-01-08 12:52:39 +0000
categories:
- php
- laravel
- artisan
comments: true
---

When working with any Laravel application that implements authentication, you'll need to set up a user account to be able to work with it. One way of doing that is to add a user in a seeder, but that's only really suitable if every user is going to use the same details.

Instead, you may want to create an Artisan command to set up the user account. Here's an example of a command that does that:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Hash;

class CreateUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'create:user';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Creates a single user';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        // Get user model from config
        $model = config('auth.providers.users.model');

        // Let user know what this will do
        $this->info('I\'ll ask you for the details I need to set up the user');

        // Get username
        $name = $this->ask('Please provide the username');

        // Get email
        $email = $this->ask('Please provide the email address');

        // Get password
        $password = $this->secret('Please provide the password');

        // Create model
        $user = new $model;
        $user->name = $name;
        $user->email = $email;
        $user->password = Hash::make($password);
        $user->save();
        $this->info('User saved');
    }
}
```

We fetch the user model from the config, before asking the user for the data we need. Then we insert it into the database and confirm it to the user.

Then we just need to register the command in `App\Console\Kernel.php`:

```php
    protected $commands = [
        \App\Console\Commands\CreateUser::class,
    ];
```

And we can run our command with `php artisan create:user`.
