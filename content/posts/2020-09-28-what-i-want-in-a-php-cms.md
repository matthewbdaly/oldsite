---
title: "What I want in a PHP CMS"
date: 2020-09-28 15:50:48 +0100
categories:
- php
- cms
comments: true
---

I maintain a custom PHP legacy CMS for a client, and have also been building a micro-CMS as a learning project, so I've spent quite a lot of time in the last few years thinking about how content should be managed, and how applications to manage it should work.

I've also at least tinkered with a few different content management systems down the years, and I've found it depressing how many times Wordpress has been the default choice, despite it being probably the worst CMS I've ever had the gross misfortune to use. The argument that "it's easy to install and use" doesn't really hold water given that in my experience most users setting up a new Wordpress site don't go through the five-minute install, but use their shared hosting provider's setup wizard, which typically also supports several other content management systems. Also, it just does not make sense to optimise a short five minute install that will never be repeated for that site over the rest of the workflow for maintaining the site, possibly for years - I'd rather have something that takes a bit more time to do the initial set up, but is easier to maintain.

So, what do I want in a PHP CMS? Here's my thoughts on my ideal CMS solution.

## Managed entirely with Composer

Creating a new site using a CMS should be as simple as running something like the following command:

```bash
$ composer create-project --prefer-dist my/cms newsite
```

And updating it should be as simple as running the following:

```bash
$ composer update
```

Installing a plugin should be a case of running this:

```bash
$ composer require my/plugin-foo
```

It should then be possible to activate the plugin simply by listing it in a config file.

As far as possible, *all* of the functionality of the CMS should be contained in a single "core" package, and plugins should be their own Composer packages that can be installed, and then switched on and off in a simple config file. The initial creation step should be a case of checking out a boilerplate that contains only the absolute minimum - a front controller, a starting configuration, front end tooling, and some views - and gets the rest of the functionality from the core package.

## Allow creating custom site boilerplates

It should be possible to create and publish alternative boilerplates.

For instance, if a CMS provides a default starting boilerplate that ships with Bootstrap, VueJS and Laravel Mix, I should be able to fork it, replace Bootstrap with Tailwind and Vue with React, and then use my version for future projects without having to spend a lot of time maintaining the fork.

Similarly, if there are certain plugins I use all the time, it should be possible to include those plugins as dependencies in my `composer.json` so that when I create a new project from my boilerplate, they're present right from the start and I don't have to faff around downloading and configuring them manually.

## Plugin API should work like a framework

The best practices we've all spent years learning shouldn't go out the window when working with a CMS. A good CMS should feel familiar if you've got some experience working in MVC frameworks, and it should embrace PSR standards. Adding a route should largely be a matter of writing a controller, mapping it to a route, and adding a view file, just as it would be in a framework

There's always going to be some things that need to be CMS-specific, because registering things like routes is more complex in a general purpose CMS than a custom web app as they can be defined in multiple arbitrary places. These can be handled by triggering events at various points in the CMS application's lifecycle, so that plugin authors can set up listeners to do things such as register routes, add new view helpers and so on.

## Focused exclusively on content, not presentation

I'm increasingly convinced that the ability to amend presentation in a CMS is a misfeature. The purpose of a CMS is to manage content, not presentation, and making it able to amend presentation potentially gives unskilled site owners enough rope to hang themselves with, while making it actively harder for us devs.

I've certainly seen enough sites that a client has completely messed up after being given access to change the presentation in Wordpress, and because it's stored in the database it's not possible to roll back the changes easily the way it would be if the styling was stored in version control. And it's definitely quicker for an experienced front end developer to edit a CSS file than to use Wordpress's own tools for amending styling.

## Use a proper templating system

As a templating language, PHP *sucks*:

* It's too easy to overlook escaping variables properly
* Handling partials is difficult
* There's always the temptation to put in more logic than is advisable in the view layer, especially when deadlines are tight

Using a dedicated templating language, rather than a full programming language, in the view layer, means that entire classes of issues can be completely eradicated from the layer of the application that the developers who work with the CMS have the most dealings with. Developers are forced to move more complex logic into dedicated helpers, and can't just leave it in the template "until we have time to clear it up", which is often never.

Twig is solid, reliable, fast, easy to extend, and similar enough to other templating languages such as Handlebars and Django's templates that if you've used any of those you can adapt easily, and it should probably be your first choice. Blade is also a solid choice, and if you want something whose syntax is not dissimilar to PHP you should probably consider Plates.

## Configuration with version control in mind

Wordpress does this particularly badly because it actively encourages storing sensitive data, such as database credentials, in a PHP file (which is then kept in the web root...). A good, solid way to store configuration details in PHP is to store generic details (for instance, a list of the active plugins, which will be the same for production and the local copy developers run) for that project in either a YAML or PHP file, and store install-specific details in either a `.env` file, or as environment variables.

## Custom content types

It should be easy to create a new content type, and define specific fields for that content type. For instance, if I'm building a recipe site, I should be able to define a Recipe type that has the following attributes:

* Ingredients
* Cover image
* Title
* Method

Then all Recipe instances should have those attributes, and it shouldn't be necessary to bastardise a different content type to make it work properly. It should also be possible to lock down the ability to create custom content types so it's either limited to admins, or they're defined in code, so end users can't create arbitrary content types.

## Custom taxonomies

It should be possible to define your own custom taxonomies for content. Continuing the Recipe example above, we should be able to define three sorts of taxonomy:

* Dietary requirements (eg vegetarian, vegan, gluten-free etc)
* Meal (eg breakfast, lunch, dinner, snacks)
* Region (eg Indian, Chinese, Italian)

A taxonomy should be appropriately named, and again it shouldn't be necessary to abuse generic categories and tags to categorise content. As with the content types, it should also be possible to lock them down.

## A better solution than rich text for managing content

Rich text is not a great solution for more complex page layouts, and tends to be abused horribly to do all sorts of things. There's a tendency to dump things like snippets for Google Maps, tables, galleries, Javascript widgets and many more into rich text. This means that it also loses the semantic value of the content - rather than being a paragraph, then a map of the local area, then a photo carousel, then another paragraph, it's just a single blob of text. This can't be easily migrated to another solution if, say, you decide to swap Google Maps for Open Streetmap, and change one carousel for another, without going through and manually replacing every map and carousel, which is a chore.

Wagtail isn't a PHP CMS, but [it has an interesting approach to rich text handling](https://torchbox.com/blog/rich-text-fields-and-faster-horses/) for complex content, inspired by [Sir Trevor](https://madebymany.github.io/sir-trevor-js/), based around blocks of different types. The Gutenberg editor in Wordpress 5.0 and up isn't a million miles away from this, either. For simpler sites, it's probably better to limit users to a Markdown editor and add helpers for adding more complex functionality directly in the template, such as a gallery helper.

## A decent command-line runner

There are always going to be certain tasks that are best done from the command line. A decent CMS should have a command line tool that:

* Allows appropriate admin tasks, such as going into maintenance mode and flushing caches, to be done from the command line
* Can be easily extended by plugin authors to add their own commands
* Assists developers when working locally, such as by generating boilerplate when necessary (so, for instance, you can run a command to generate the skeleton for a new plugin)

There's no excuse not to do this when building a CMS. Symfony's console component is solid, easy to work with, and a good base for whatever commands you need to write.

## Headless as an option

The rise of headless CMS's, both as a service and as software packages, hasn't surprised me. Nowadays it's quite common to have to publish the same content to multiple channels, which might be one or more websites, as well as mobile apps, and it makes sense to be able to centralise that content in one place rather than have to copy it in some fashion.

It's therefore very useful to have an API that can retrieve that content for republishing. The same API can also be used with Javascript libraries like React and Vue to build sophisticated frontends that consume that data.

## Which solutions do this best?

You'll probably have got the idea at this point that Wordpress isn't my first choice. It was created in a different era, and hasn't kept up well compared to many of its contemporaries, and there are many technical issues with it that are at this point effectively impossible to ever fix. For instance, you could potentially store the post meta in the same table as the rest of the post data by using a JSON field in current versions of MySQL, which would make it more performant, but it seems unlikely it could ever be migrated across to use that solution.

Frustratingly, its mindshare means it's erroneously seen as some kind of "gold standard" by inexperienced developers and non-technical clients, and there seems to be a common misconception that it's the only solution that lets users update the content themselves (when in fact that's the whole point of ANY CMS). Using Bedrock and a theme system like Sage that supports a proper templating system helps solve some of the problems with Wordpress, but not all.

I have tried a few solutions that come very close to what I want:

* [Bolt](https://bolt.cm/) seems from what I've seen so far to be effectively a "better Wordpress" in that the interface and functionality is broadly familiar to anyone already used to Wordpress, but it uses Twig, is built in Symfony, and has a proper command-line runner. I haven't tried it since version 4 was released a few days back, so I will probably give it a spin before long.
* [Grav](https://getgrav.org/) looks like a great solution for brochure sites. I've long thought that these sites, which often run on shared hosting, don't really need a database-backed solution, and a flat-file solution is probably a better bet in most cases. Grav is simple to set up and configure, has a decent admin interface, and uses Twig for the views, making it easy to theme.
* [Statamic](https://statamic.com/) is my current favourite and ticks almost all of the boxes mentioned above. It's built on Laravel, and can be added to an existing Laravel site if required. It also allows you access to the full power of the underlying framework if you need it, and ships with a decent front-end boilerplate that includes Tailwind. The only downside compared to Wordpress is that it's a paid-for solution, but the price is entirely reasonable, and if it's for a client build you'll not only save on all the premium plugins you don't need, but you'll probably save time on the site build.

Payment shouldn't be an issue if you're doing client work, unless the cost is huge. You're getting paid for building something, and if buying an off-the-shelf product saves you time, it's well worth it. Back when Laravel Nova was first released, a lot of people were complaining that it wasn't free, but that was neither here nor there - the cost is only equivalent to a few hours of an experienced developer's time, and it would take a lot longer to build out the same functionality, and the same is true of any half-decent CMS. In the early days of the web, one company I used to work for sold [a CMS that was considered cheap by the standards of the time](http://www.wordserver.co.uk/) at £495, plus £96 a year, for the entry level version - Statamic is significantly cheaper than that.

It's always a good idea to be aware of the various CMS options around. Wordpress isn't a great solution and there are plenty of options that are technically better, easier to use, more secure, and work out cheaper when you consider the total cost of ownership. I'll probably be favouring Statamic for the foreseeable future when building content-based websites, but that doesn't mean I won't look elsewhere from time to time.
