---
title: "Adding comments to models in Laravel"
date: 2018-01-07 17:21:50 +0000
categories:
- php
- laravel
- comments
comments: true
---

[Laravel Comments](https://github.com/matthewbdaly/laravel-comments) is a package I recently released that allows you to add comments to any model in your application. Possible models you could use it to enable comments on might include:

* Blog posts
* Forum posts
* Issues on an issue tracker

It's loosely inspired by Django's comments system.

Installation
------------

Run this command to install it:

```bash
$ composer require matthewbdaly/laravel-comments
```

You will also need to run `php artisan migrate` to create the appropriate tables.

Making a model commentable
--------------------------

Add the following trait to a model to make it commentable:

```php
Matthewbdaly\LaravelComments\Eloquent\Traits\Commentable
```

The comments table uses a polymorphic relation, so it should be possible to attach it to pretty much any model. The model should now have a `comments` relation, allowing you to get the comments for a model instance.

Displaying the comments
-----------------------

Obviously you can just render the comments in a view you can create yourself, but it's usually going to be more convenient to use the existing view, even if just as a starting point, which includes the ability to submit new comments and flag existing ones. Include it in your views as follows:

```php
@include('comments::comments', ['parent' => $post])
```

The argument passed to `parent` should be the model instance for which you want to display the comments form. Obviously, you can easily override this to use your own custom form instead.

The package also contains the following views:

* `comments::commentsubmitted`
* `comments::flagsubmitted`

These are basically just acknowledgement screens for when a comment has been submitted or flagged, and you'll probably want to override them.

The package also has its own routes and controller included for submitting comments and flags.

Using the models directly
-------------------------

Of course there's nothing stopping you creating your own routes and controllers for creating, viewing and flagging comments, and if, for instance, you wish to build a REST API that allows for adding comments to objects you can just use these models directly:

* `Matthewbdaly\LaravelComments\Eloquent\Models\Comment`
* `Matthewbdaly\LaravelComments\Eloquent\Models\Comment\Flag`

I recommend that you use my repositories, which are as follows:

* `Matthewbdaly\LaravelComments\Contracts\Repositories\Comment`
* `Matthewbdaly\LaravelComments\Contracts\Repositories\Comment\Flag`

These use `matthewbdaly/laravel-repositories` and so implement caching on the decorated repository, making it simple to ensure your models get cached appropriately. However, they aren't compulsory.

Events
------

You can set up listeners for the following events:

* `Matthewbdaly\LaravelComments\Events\CommentReceived`

Fired when a new comment is submitted. The package does not include any kind of validation of comments, so you can instead listen for this event and implement your own functionality to validate them (eg, check it with Akismet, check for links). That way you can easily customise how it handles potentially spammy comments for your own particular use case.

* `Matthewbdaly\LaravelComments\Events\CommentFlagged`

This event indicates that a comment has been flagged for moderator attention. You can use this event to send whatever notification is most appropriate (eg, email, Slack, SMS).
