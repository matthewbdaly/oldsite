---
title: "Don't use stdClass"
date: 2020-02-09 10:10:48 +0000
categories:
- php
comments: true
---

The digital agency I work for specialises in marketing, so some of my work tends to relate to mailing lists. This week I was asked to look at an issue on a Laravel-based export system built by a co-worker who left a few months ago. This particular application pulled data from the Campaign Monitor API about campaigns, and it returned the data as instances of `stdClass`, something that I'm not terribly happy about.

Now, this was an implementation detail of the Campaign Monitor PHP SDK, which is old and creaky (to say the least...) and doesn't exactly abide by modern best practices. However, the legacy application I maintain also does this (there's a *lot* of stuff that needs sorting out on it, and sadly replacing the `stdClass` instances is a *long* way down the list), so I thought it was an interesting subject for a blog post. I consider using `stdClass`, even just as a dumb container for data, to be an antipattern, and I thought it would be useful to explain my thoughts on this.

Why shouldn't I use stdClass?
=============================

Readability
-----------

One of the first things I learned about throwing exceptions is that they should be meaningful. It's trivial to define a named exception and use that to specify the type of exception, and you can then capture exceptions to handle them differently elsewhere in the application. For instance, a validation error is entirely due to a user submitting the wrong details, and should therefore be handled in an entirely different manner to the database going down.

The same is applicable to an object. If an API client returns an instance of `stdClass`, that doesn't tell me anything about what that object is. If I need to pass it elsewhere in a large application, it may become very difficult to understand what it represents without tracking it back to where it came from, which will slow me down. If instead I use a named class, the name can convey what it represents. It may seem like overkill to create a class that adds no new functionality, but the mere fact that it has a name makes your code more meaningful and easier to understand. I can also add DocBlock comments to describe it further.

Of course, just giving something a generic name like `Container` isn't much of an improvement, and coming up with meaningful names for classes and methods is notoriously hard. As always, give some serious thoughts into what your objects represent and attempt to give them names that will make it easy to understand what they are if you look at the code base again six months down the line.

Type hinting
------------

A related argument is that it makes type hinting more useful. You *can* type hint `stdClass`, but as noted above it tells someone working on the code receiving it very little about where it's come from, or what it represents. By using a named class, such as `App\Api\Response\Item`, you're making it much clearer that that object represents an individual item returned from an API, and others developers working on the same code base (including your future self, who may not necessarily remember all of the details of how you're implementing it now), will have less trouble understanding what is going on.

New functionality
-----------------

Finally, are you sure you don't want to add any functionality? PHP includes a number of interfaces that can be *extremely* useful for working with this sort of data.

First off, the `ArrayAccess` interface allows you to access an object's values using array syntax, which can be useful. Also, implementing either `Iterator` or `IteratorAggregate` will allow you to iterate over the object using a `foreach` loop. The `Countable` interface is less useful, since all it does is let you get the number of items, but it's sometimes handy. Finally, the `Serializable` interface lets you serialize an object so it can be stored in a suitable medium, which can sometimes be useful.

The same also applies to some of the magic methods. The `__toString()` method, in particular, can be useful for returning a suitable string-based representation of an object - for instance, if it represents an item in a database, it might be appropriate to use this to return the ID of the item, or a text representation of it (eg title for a blog post, or product name for a product in an e-commerce site). The `__get()` and `__set()` magic methods may be a bit more dubious, but they can be useful if your object is intended to just be a dumb container as they allow you to make the properties on the object private, but keep them accessible without writing explicit getters and setters. I'd also suggest adding `__debugInfo()` to objects unless you have a good reason not to, as when you're debugging it can be hard to see the wood for the trees, and returning only the most pertinent data can make your job a *lot* easier.

Of course, you don't have to implement all this functionality from scratch for every class. It often makes sense to create an abstract class that implements this sort of basic container functionality, and then base all your container classes on that, overriding it when necessary.

Summary
-------

Hopefully, this has made it clear how compelling it is to use named classes instead of `stdClass`, and how much benefit you can get from not just using named classes, but creating your own base container class for them. I'm of the opinion that PHP should probably make `stdClass` abstract to prevent them from being used like this, and indeed I'm seriously considering the idea of creating a Codesniffer sniff to detect instances of `stdClass` being instantiated and raise them as an error.
