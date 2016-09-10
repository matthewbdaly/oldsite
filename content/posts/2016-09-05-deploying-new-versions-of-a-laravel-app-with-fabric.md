---
title: "Deploying new versions of a Laravel app with Fabric"
date: 2016-09-05 22:22:16 +0100
categories:
- php
- python
- fabric
- laravel
- deployment
comments: true
---

[Envoy](https://laravel.com/docs/5.3/envoy) is the official way to run tasks on a remote server for Laravel apps. A typical Envoy task for deploying a new version might look like this:

```blade
@servers(['web' => 'matthew@server1.example.com'])

@task('deploy', ['on' => 'web'])
    cd /var/www
    sudo chown -R matthew:matthew .
    git pull origin master
    php artisan migrate
    php artisan view:clear
    composer dump-autoload
    sudo chown -R www-data:www-data .
    sudo supervisorctl restart mail-queue
@endtask
```

This would be defined in `Envoy.blade.php`. With this in place, and Envoy set up globally, you can then run `envoy run deploy` to run the `deploy` command.

However, Envoy requires the PHP SSH library, which I haven't been able to get working with PHP 7. Fortunately I was already familiar with [Fabric](http://www.fabfile.org/), which makes an excellent alternative as long as you don't mind writing the task in Python.

The same kind of task might look like this in a Fabric script, saved as `fabfile.py`:

```python
#!/usr/bin/env python
from fabric.api import local, env, run, sudo
from fabric.context_managers import cd, prefix

env.hosts = ['server1.example.com']
env.path = "/var/www"
env.user = "matthew"
env.password = "password"
# Or...
env.key_filename = '/path/to/ssh/key'

def deploy():
    """
    Deploy the latest version
    """
    # Push changes to Bitbucket
    local("git push origin master")

    # Switch to project directory
    with cd(env.path):
        # Change owner
        sudo('chown -R matthew:matthew .')

        # Pull changes to server
        run('git pull origin master')

        # Run migrations
        run('php artisan migrate')

        # Clear cached files
        run('php artisan view:clear')
        run('composer dump-autoload')

        # Change owner back
        sudo('chown -R www-data:www-data .')

        # restart mail queue
        sudo('supervisorctl restart mail-queue')
```

Then, assuming Fabric is already installed locally, you can run `fab deploy` to push up the latest revision.

Either of these solutions will do a fine job of deploying your app. If you do need to store user-specific data in your Fabric script, it's probably prudent to keep it out of version control.

Whichever way you choose, it's a really good idea to do what you can to automate deployment. It can be a boring, repetitive job, and both of these solutions make it much easier.
