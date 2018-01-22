---
title: "Deploying your Laravel application with Deployer"
date: 2018-01-22 12:00:14 +0000
categories:
- php
- laravel
- deployment
comments: true
---

Deployment processes have a nasty tendency to be a mish-mash of cobbled-together scripts or utilities in many web shops, with little or no consistency in practice between them. As a result, it's all too easy for even the most experienced developer to mess up a deployment.

I personally have used all kinds of bodged-together solutions. For a while I used Envoy scripts to deploy my Laravel apps, but then there was an issue with the SSH library in PHP 7 that made it impractical to use it. Then I adopted Fabric, which I'd used before for deploying Django apps and will do fine for deploying PHP apps too, but it wasn't much more sophisticated than using shell scripts for deployment purposes. There are third-party services like Deploybot, but these are normally quite expensive for what they are.

A while back I heard of [Deployer](https://deployer.org/), but I didn't have the opportunity to try it until recently on a personal project as I was working somewhere that had its own in-house deployment process. It's a PHP-specific deployment tool with recipes for deploying applications built with various frameworks and CMS's, including Laravel, Symfony, CodeIgniter and Drupal.

Installing Deployer
-------------------

Deployer is installed as a `.phar` file, much like you would with Composer:

```bash
$ curl -LO https://deployer.org/deployer.phar
$ mv deployer.phar /usr/local/bin/dep
$ chmod +x /usr/local/bin/dep
```

With that done, you should be able to run the following command in your project's directory to create a Deployer script:

```bash
$ dep init
```

In response, you should see a list of project types:

```bash
  Welcome to the Deployer config generator  
                                            


 This utility will walk you through creating a deploy.php file.
 It only covers the most common items, and tries to guess sensible defaults.

 Press ^C at any time to quit.

 Please select your project type [Common]:
  [0] Common
  [1] Laravel
  [2] Symfony
  [3] Yii
  [4] Yii2 Basic App
  [5] Yii2 Advanced App
  [6] Zend Framework
  [7] CakePHP
  [8] CodeIgniter
  [9] Drupal
 >
```

Here I chose Laravel as I was deploying a Laravel project. I was then prompted for the repository URL - this will be filled in with the origin remote if the current folder is already a Git repository:

```bash
Repository [git@gitlab.com:Group/Project.git]:
 > 
```

You'll also see a message about contributing anonymous usage data. After answering this, the file `deploy.php` will be generated:

```php
<?php
namespace Deployer;

require 'recipe/laravel.php';

// Configuration

set('repository', 'git@gitlab.com:Group/Project.git');
set('git_tty', true); // [Optional] Allocate tty for git on first deployment
add('shared_files', []);
add('shared_dirs', []);
add('writable_dirs', []);


// Hosts

host('project.com')
    ->stage('production')
    ->set('deploy_path', '/var/www/project.com');
    
host('beta.project.com')
    ->stage('beta')
    ->set('deploy_path', '/var/www/project.com');  


// Tasks

desc('Restart PHP-FPM service');
task('php-fpm:restart', function () {
    // The user must have rights for restart service
    // /etc/sudoers: username ALL=NOPASSWD:/bin/systemctl restart php-fpm.service
    run('sudo systemctl restart php-fpm.service');
});
after('deploy:symlink', 'php-fpm:restart');

// [Optional] if deploy fails automatically unlock.
after('deploy:failed', 'deploy:unlock');

// Migrate database before symlink new release.

before('deploy:symlink', 'artisan:migrate');
```

By default it has two hosts, `beta` and `production`, and you can refer to them by these names. You can also add or remove hosts, and amend the existing ones. Note the deploy path as well - this sets the place where the application gets deployed to.

Note that it's set up to expect the server to be using PHP-FPM and Nginx by default, so if you're using Apache you may need to amend the command to restart the server. Also, note that if like me you're using PHP 7 on a distro like Debian that also has PHP 5 around, you'll probably need to change the references to `php-fpm` as follows:

```php
desc('Restart PHP-FPM service');
task('php-fpm:restart', function () {
    // The user must have rights for restart service
    // /etc/sudoers: username ALL=NOPASSWD:/bin/systemctl restart php-fpm.service
    run('sudo systemctl restart php7.0-fpm.service');
});
after('deploy:symlink', 'php-fpm:restart');
```

You will also need to make sure the `acl` package is installed - on Debian and Ubuntu you can install it as follows:

```bash
$ sudo apt-get install acl
```

Now, the recipe for deploying a Laravel app will include the following:

* Pulling from the Git remote
* Updating any Composer dependencies to match `composer.json`
* Running the migrations
* Optimizing the application

In addition, one really great feature Deployer offers is rollbacks. Rather than checking out your application directly into the project root you specify, it numbers each release and deploys it in a separate folder, before symlinking that folder to the project root as `current`. That way, if a release cannot be deployed successfully, rather than leaving your application in an unfinished state, Deployer will symlink the previous version so that you still have a working version of your application.

If you have configured Deployer for that project, you can deploy using the following command where `production` is the name of the host you're deploying to:

```bash
$ dep deploy production
```

The output will look something like this:

```bash
✔ Executing task deploy:prepare
✔ Executing task deploy:lock
✔ Executing task deploy:release
➤ Executing task deploy:update_code
Counting objects: 761, done.
Compressing objects: 100% (313/313), done.
Writing objects: 100% (761/761), done.
Total 761 (delta 384), reused 757 (delta 380)
Connection to linklater.shellshocked.info closed.
✔ Ok
✔ Executing task deploy:shared
✔ Executing task deploy:vendors
✔ Executing task deploy:writable
✔ Executing task artisan:storage:link
✔ Executing task artisan:view:clear
✔ Executing task artisan:cache:clear
✔ Executing task artisan:config:cache
✔ Executing task artisan:optimize
✔ Executing task artisan:migrate
✔ Executing task deploy:symlink
✔ Executing task php-fpm:restart
✔ Executing task deploy:unlock
✔ Executing task cleanup
✔ Executing task success
Successfully deployed!
```

As you can see, we first of all lock the application and pull the latest version from the Git remote. Next we copy the files shared between releases (eg the `.env` file, the `storage/` directory etc), update the dependencies, and make sure the permissions are correct. Next we link the storage, clear all the cached content, optimize our app, and migrate the database, before we set up the symlink. Finally we restart the web server and unlock the application.

In the event you discover a problem after deploy and need to rollback manually, you can do so with the following command:

```bash
$ dep rollback production
```

That makes it easy to ensure that in the event of something going wrong, you can quickly switch back to an earlier version with zero downtime.

Deployer has made deployments a lot less painful for me than any other solution I've tried. The support for rollbacks means that if something goes wrong it's trivial to switch back to an earlier revision.
