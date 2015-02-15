---
layout: post
title: "Dumping WordPress for Octopress"
date: 2012-05-31 21:25
comments: true
categories: 
- wordpress
- octopress
---

Lately I've gotten more and more fed up with WordPress as a blogging platform. It's certainly a great content management system, and for non-technical bloggers it's absolutely perfect, but I've been increasingly finding myself hitting barriers that make it harder than it should be to get stuff done. It's just not the best platform for blogging about web development.

Take my recent series of Django tutorials, for example. You wouldn't believe the amount of time I spent trying to format some of the code properly in TinyMCE for those. Furthermore, the end result, even though the theme was a custom one I'd built myself that was somewhat optimised for showing off code, wasn't exactly great.

In my opinion, Markdown is a far better option for writing blog posts in than using a rich text editor like TinyMCE. You normally have a pretty good idea what the end results will look like, and it's generally well-formatted HTML. Also, it means I can easily write my blog posts in Vim.

Octopress was therefore an obvious choice. It's absolutely brilliant for sharing code - compared to WordPress, code samples look *stunning*. Also, because it generates static HTML, it loads an awful lot faster than WordPress does, and the default theme is extremely nice. So that's what I've gone for.

The only issue is that my web host are a bit funny about offering SSH access, so I've resorted to FTP-ing the files across, which isn't ideal. Still, it's not that big an issue, and I'll have to see how it goes with Octopress. I do have a low-end VPS I could point this domain name at instead and run it from there if necessary, so I can always resort to that if this is too cumbersome.
