---
date: '2011-02-21 22:26:13'
layout: post
slug: more-on-my-mini-server
status: publish
title: More on my mini server
wordpress_id: '622'
categories:
- server
---

While I was very pleased to get a proper Linux distro working on my Pogoplug, the Arch-based Plugbox Linux was never really my cup of tea. While it's a fine distro, I always felt that Debian would have been a much better fit. Partly this is because Debian has established a strong history of being a solid, stable distro that would carry on working no matter what, whereas Arch is more bleeding-edge. Also, Debian has a colossal repository that included a lot of software I wanted that wasn't in the Arch repositories and I couldn't get to install or compile from source, such as procmail and Squirrelmail. Debian also has strong support for many different processor architectures, including armel. Finally, being an Ubuntu user on the desktop, Debian is a distro that feels much more familiar to me.

So I eventually gave up on running Plugbox Linux and took the opportunity of the release of Debian Squeeze to install it on my Pogoplug, thanks to [this tutorial](http://jeff.doozan.com/debian/). With that done, I set about adding my favourite applications. Byobu is a really handy tool that makes GNU screen significantly more intuitive and useful, so that's always one of the first things to go on, and one that I'd really missed in Plugbox. I've now gotten my mail server working again, with the addition of procmail as my mail filter and Squirrelmail to give me a web interface. I've also set up Leafnode on there as I'd really like to learn more about Usenet, and I'm beginning to get the hang of using slrn to read it.

It's amazing how much running my own server has taught me about security. I was staggered to see the sheer number of attempts by script kiddies to connect via SSH to my Pogoplug, and it really made me start thinking about security in a way I'd never bothered beforehand. I've installed denyhosts to block atttempts to brute-force the password, and made sure I chose a good password. I've also set OpenSSH to listen on a different port, which should hopefully decrease the number of login attempts substantially (I presume most of these were just script kiddies scanning large blocks of IP addresses looking for hosts with port 22 open), and have disabled root login (as at right now my login is the only one that is allowed via SSH, so if anyone does bother to do a more thorough scan and try to connect to the port I'm running SSH on, they'll need to guess my username AND password, and do so before denyhosts kicks them off - a pretty tall order).

The whole concept of "plug servers" is one I really like, and my experience with the Pogoplug has been extremely good - it's an inexpensive and extremely hackable device that has been an absolute pleasure to use.
