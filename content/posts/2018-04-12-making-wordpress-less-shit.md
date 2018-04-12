---
title: "Making Wordpress less shit"
date: 2018-04-12 23:57:05 +0100
categories:
- wordpress
comments: true
---

I'm not going to sugarcoat it. As a developer, I think Wordpress is shit, and I'm not alone in that opinion. Its code base dates from a time before many of the developments of the last few years that have hugely improved PHP as a language, as well as the surrounding ecosystem such as Composer and PSR-FIG, and it's likely it couldn't adopt many of those without making backward-incompatible changes that would affect its own ecosystem of plugins and themes. It actively forces you to write code that is far less elegant and efficient than what you might write with a proper framework such as Laravel, and the quality of many of the plugins and themes around is dire.

Unfortunately, it's also difficult to avoid. Over a quarter of all websites run Wordpress, and most developers will have to work with it at some point in their careers. However, there are ways that you can improve your experience when working with Wordpress somewhat. In this post I'm going to share some methods you can use to make Wordpress less painful to use.

This isn't a post about the obvious things like "Use the most recent version of PHP you can", "Use SSL", "Install this plugin", "Use Vagrant/Lando" etc - I'm assuming you already know stuff like that for bog standard Wordpress development. Nor is it about actually developing Wordpress plugins or themes. Instead, this post is about bringing your Wordpress development workflow more into line with how you develop with MVC frameworks like Laravel, so that you have a better experience working with and maintaining Wordpress sites. We can't solve the fundamental issues with Wordpress, but we can take some steps to make it easier to work with.

Use Bedrock
-----------

[Bedrock](https://roots.io/bedrock/) is still Wordpress, but reorganized so that:

* The Wordpress core, plugins and themes can be managed with Composer for easier updates
* The configuration can be done with a `.env` file that can be kept out of version control, rather than putting it in `wp-config.php`
* The web root is isolated to limit access to the files

In short, it optimizes Wordpress for how modern developers work. Arguably that's at the expense of site owners, since it makes it harder for non-developers to manage the site, however for any Wordpress site that's sufficiently complex to need development work done that's a trade-off worth making. I've been involved in projects where Wordpress got used alongside an MVC framework for some custom functionality, and in my experience it caused a world of problems when updating plugins and themes because version control would get out of sync, so moving that to use Composer to manage them instead would have been a huge win.

Using Bedrock means that if you have a parent theme you use all the time, or custom plugins of your own, you can install them using Composer by adding the Git repositories to your `composer.json`, making it easier to re-use functionality you've already developed. It also makes recovery easier in the event of the site being compromised, because the files outside the vendor directory will be in version control, and you can delete the vendor directory and re-run `composer install` to replace the rest. By comparison, with a regular Wordpress install, if it's compromised you can't always be certain you've got all of the files that have been changed. Also, keeping Wordpress up to date becomes a simple matter of running `composer update` regularly, verifying it hasn't broken anything, and then deploying it to production.

Bedrock uses [WPackagist](https://wpackagist.org/), which regularly scans the Wordpress Subversion repository for plugins and themes, so at least for plugins and themes published on the Wordpress site, it's easy to install them. Paid plugins may be more difficult - I'd be inclined to put those in a private Git repository and install them from there, although I'd be interested to know if anyone else uses another method for that.

If you can't use Bedrock, use WP CLI
------------------------------------

If for any reason you can't use Bedrock for a site, then have a look at [WP CLI](https://wp-cli.org/). On the server, you can use it to install and manage both plugins and themes, as well as the Wordpress core.

It's arguably even more useful locally, as it can be used to generate scaffolding for plugins, themes (including child themes based on an existing theme), and components such as custom post types or taxonomies. In short, if you do any non-trivial amount of development with Wordpress you'll probably find a use for it. Even if you can use Bedrock, you're likely to find WP CLI handy for the scaffolding.

Upgrade the password encryption
-------------------------------

I said this wouldn't be about using a particular plugin, but this one is too important. Wordpress's password hashing still relies on MD5, which is *far* too weak to be considered safe. Unfortunately, Wordpress still supports PHP versions as old as 5.2, and until they drop it they can't really switch to something more secure.

[wp-password-bcrypt](https://roots.io/plugins/bcrypt-password/) overrides the password functionality of Wordpress to use Bcrypt, which is what modern PHP applications use. As a result, the hashes are considerably stronger. Given that Wordpress is a common target for hackers, it's prudent to ensure your website is as secure as you can possibly make it.

If you use Bedrock, it uses this plugin by default, so it's already taken care of for you.

Use a proper templating system
------------------------------

PHP is a weird hybrid of a programming language and a templating system. As such, it's all too easy to wind up with too much logic in your view layer, so it's a good idea to use a proper templating system if you can. Unfortunately, Wordpress doesn't support that out of the box.

However, there are some third-party solutions for this. [Sage](https://roots.io/sage/) uses Laravel's Blade templating system (and also comes with Webpack preconfigured), while [Timber](https://www.upstatement.com/timber/) lets you use Twig.

Use the Wordpress REST API for AJAX where you can
-------------------------------------------------

Version 4.7 of Wordpress introduced the [Wordpress REST API](https://v2.wp-api.org/), allowing the data to be exposed via RESTful endpoints. As a result, it should now be possible to build more complex and powerful user interfaces for that data. For instance, if you were using Wordpress to build a site for listing items for sale, you could create a single-page web app for the front end using React.js and Redux, and use the API to submit it, then show the submitted items.

I'm not a fan of the idea the Wordpress developers seem to have of trying to make it some kind of all-singing, all-dancing universal platform for the web, and the REST API seems to be part of that idea, but it does make it a lot easier than it was in the past to do something a bit out of the ordinary with Wordpress. In some cases it might be worth using Wordpress as the backend for a [headless CMS](https://en.wikipedia.org/wiki/Headless_CMS), and the REST API makes that a practical approach. For simpler applications that just need to make a few AJAX calls, using the REST API is generally going to be more elegant and practical than any other approach to AJAX with Wordpress. It's never going to perform as well or be as elegant as a custom-built REST API, but it's definitely a step forward compared to the hoops you used to have to jump through to handle AJAX requests in Wordpress.

Summary
-------

Wordpress is, and will remain for the foreseeable future, a pain in the backside to develop for compared to something like Laravel, and I remain completely mystified by the number of people who seem to think it's the greatest thing since sliced bread. However, it is possible to make things better if you know how - it's just that some of this stuff seems to be relatively obscure. In particular, discovering Bedrock is potentially game-changing because it makes it so much easier to keep the site under version control.
