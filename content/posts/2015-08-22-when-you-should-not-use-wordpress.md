---
title: "When you should not use Wordpress"
date: 2015-08-22 19:32:34 +0100
categories: 
- wordpress
---

I must admit, I've had a rather bad experience with WordPress recently. The site in question was an e-commerce site, built with WordPress and WooCommerce. In development, we originally put the site on shared hosting, but after a while the hosting company told us off because it was using too much database space, so we moved to a VPS earlier than we normally would. With the benefit of hindsight, we probably should have seen that as the first warning sign.

Then, once the site was up and running on the VPS, it got slower and slower, and eventually the server was killing MySQL off because it was using too many resources. I decided to install a benchmarking plugin and investigate why it was so slow. On loading the home page, it became obvious why the site was so slow - there were in excess of 300 queries on the home page. Looking elsewhere, some other pages were even worse, with one making over 1,000 queries!

At this point, I was practically hyperventilating. If I had written a web app that made that many queries on one page from scratch, I'd be seriously considering whether I was cut out for this industry. With an off-the-shelf CMS, you do have to accept some degree of bloat as a trade-off for quicker development time, but these numbers beggar belief.

I was able to mitigate this to some extent. First, I cut down the number of products shown on individual pages and audited the installed plugins, removing ones we could do without. This still left a lot more queries than I liked.

The next step was to enable caching. I installed Memcached and Varnish (incidentally, if you haven't used Varnish before, you should check it out - it can make a huge difference for slow sites). I then installed and configured W3 Total Cache to work with them. This didn't solve the fundamental problem of the initial page loads being too database-intensive, but it did mean that the result was cached for some time afterwards, making things easier on subsequent users.

This still wasn't enough, however. The admin was still very slow, and often crashed. I actually wound up having to write a shell script that would check to see if MySQL was running and restart it if it wasn't, and set up a cron job to run it every minute, just to ensure I wasn't having to restart it myself. The issue was only really dealt with once we upped the specs on the VPS from 1GB RAM and 1 core to 3GB RAM and 2 cores, which should really have been overkill for something like WordPress.

As it turned out, the issue wasn't exactly helped by the fact that someone had been making an unusually persistent attempt to brute-force `wp-login.php`. I was able to mitigate this by password-protecting it in the `.htaccess` file and adding some custom rules to fail2ban But the fundamental problem remained that the resources used by WordPress to load a single page were grossly excessive.

Since then, we've continued to have some difficulties with it. There are some rather arcane criteria for calculating the shipping costs, and implementing them has been a real uphill struggle. We've also had to deal with breakages in the theme when updating WooCommerce, and other painful issues. It feels at times like the site will never be "done done".

Now, I've had some issues with WordPress before, but this was by far the nastiest I'd ever seen, and it made me think very hard about when we should and should not consider WordPress as a solution. In hindsight, it would have been much easier to use Laravel to build the site from scratch - it would have made for a much leaner, more efficient site, updating the templates would have been a breeze, and implementing additional functionality would have been straightforward.

NB: I'm trying hard to make sure this is NOT one of those "WordPress sucks" blog posts. I'll admit that I agree with many of the points from a lot of those, and I abandoned WordPress for my own site a long time ago in favour of a static site generator, but there are times when it is appropriate to use it. What I'm trying to do here is to help others avoid making the mistakes we did recently by giving some advice on when you should and should not use WordPress. Of course, your mileage may vary.

Why was WordPress inappropriate here?
-------------------------------------

With the benefit of hindsight, I can say that WordPress was definitely not the right solution in this case, and I will be advising against using it in similar circumstances. But why was it inappropriate?

* **Less flexible than rolling a custom solution** - While the ecosystem of plugins and themes make it possible to use WordPress for a lot of use cases outside the core functionality of the platform, those plugins and themes aren't infinitely flexible. If you want to do something one way and the plugin you're using doesn't support that, you're out of luck unless you can fork the plugin or write a new one.
* **Dependence on third party plugins** - While we were working on the site, WooCommerce made some changes that broke the theme we were using. We were using a child theme, but updating the parent theme alone didn't fix it - we had to then apply some of the changes to the child theme as well, which was extremely fiddly. As a result, we're now very wary about updating plugins and themes. Yet we don't dare put it off too long, because in my experience attempts to break into WordPress are common, and if you fail to install an upgrade that fixes a vulnerability in good time, you can easily find yourself getting a phone call about a site having been hacked (as I did in December last year).
* **Poor performance** - This is a big one, and I have therefore broken it down further:
  * **Loading styling from the database** - Many of the high end, customisable themes have large numbers of configuration options that can be used to style the site. The downside of these is that it creates additional queries to the database to fetch that data. Unless you have some form of caching in place, that data is loaded for every single request to the front end, generating a significant number of additional queries. You can mitigate this by rolling your own custom WordPress theme for the site, however.
  * **Too many queries** - My experience has been that as a general rule of thumb, it's much quicker to make a smaller number of more complex queries to a database than to make a larger number of simple queries. If you build a custom web app, you will always know exactly what data you want to retrieve on a particular page and through careful use of joins, can retrieve exactly the data you need with as few queries as possible. Being a generic solution, WordPress doesn't know exactly what data you need on any one page, and so may fetch the data using an excessive number of queries. It may also fetch data you don't actually need.
  * **Suboptimal database layout** - The database schema for WordPress was originally created with a blog in mind, and may not always be optimal for your particular use case.
  * **Caching is not a silver bullet** - You can do a lot to improve performance by installing Memcached and Varnish, and configuring a caching plugin to work with them. However, this doesn't solve the problem of the excessive number of queries, it only mitigates the effects somewhat. Not everything can be cached, and the expensive queries will still have to be run at some point. Caching only increases the time between the queries. Also, configuring Varnish in particular can be something of a black art, and it's easy to miss something and find out some functionality or other hasn't been working.

WordPress has a lot of technical limitations and deficiencies from a programmer's point of view. For all that, it works, it's easy to set up, and there's a wide variety of plugins and themes available, so it's often an appropriate choice. While the performance is poorer than I would like, the harsh truth is that often it doesn't matter - if your site isn't serving a huge amount of page requests, a few extra queries don't actually make all that much difference (within reason, of course). My concern is that use of WordPress when it's entirely inappropriate is widespread.

Is WordPress being overused?
----------------------------

![Archer - WordPress? The Dane Cook of content management systems?](/static/images/wordpress-dane-cook.jpg)

I suspect I'm running the risk of being branded a hipster for saying this ("Now it's popular, you hate WordPress..."), but the fact that WordPress is widespread and popular does not mean that it's the best solution for your project. Nor does the fact that it's technically possible to use it for your project.

A few years ago, I built a now-defunct site and mobile app for a client that monitored web pages, or product prices on web pages, for changes, and notified the user when a change occurred. It was built using CodeIgniter 2, and had an integrated blog. At one point, the client was unhappy because it wasn't built with WordPress, believing that this was the reason why few people were signing up. To use WordPress for this project would have involved building the additional functionality, including the API for the mobile app, as a plugin, which would have slowed down development considerably - in my experience it's generally much harder to build something as a WordPress plugin than using an MVC framework due to the lack of separation of concerns, which makes the code base more confusing.

This is a good example of the alarming trend I've noticed in the last few years whereby a large number of people seem to be under the mistaken impression that WordPress is some kind of all-singing, all-dancing general purpose solution for building websites. I suspect that the reason for this may be that WordPress is commonplace enough that people outside of the web industry have often heard of it, and therefore they often ask for it since it's what they've heard of, not knowing whether or not it's actually appropriate for their needs. What isn't always apparent to non-developers is that it's often considerably easier for a developer to implement the core functionality of WordPress using a modern MVC framework than it is for them to implement the other functionality using WordPress, and as the functionality is being built with your exact use case in mind, the user interface is often more straightforward than the WordPress admin. Also, the WordPress privilege system can make it difficult for you to limit the user to just the functionality you want them to have, resulting in a situation where either you give the users a potentially dangerous level of access, or force them to contact you to make certain changes, making more work for you.

I've heard plenty of people say things like "WordPress is a framework" and "A competent developer can build anything with WordPress". These claims are utter hogwash. A competent developer is smart enough to recognise that WordPress is not a one-size fits all solution and it's not always appropriate to use it - you can easily spend more time trying to get it to do something off the beaten track than it would take to build that functionality from scratch. I think the way that Automattic are trying to promote WordPress as an application framework is a really bad idea - trying to use it for this is much more cumbersome than using a modern PHP framework like Laravel.

Even if you ignore the technical deficiencies of WordPress, it is too opinionated to be a good solution for use as a framework, and as such you'll spend a lot of time trying to work around the existing implementations of existing functionality when they don't quite meet your requirements.

Conclusion
----------

For all its flaws, WordPress is very useful. It's generally a good choice for blogs, brochure-style sites, and small e-commerce solutions where the client is not too fussy about the details of how it works. For virtually every other situation, I plan on looking elsewhere in future.
