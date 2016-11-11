---
layout: post
title: "A starting boilerplate for PHP development with Vagrant"
date: 2013-08-16 21:49
comments: true
categories: 
- Vagrant
---

I've recently started using [Vagrant](http://www.vagrantup.com/) for PHP development. It's an incredibly useful and convenient tool - never again will I have to faff about installing XAMPP on someone's laptop so they can demonstrate the new site, instead I can just install Vagrant and Virtualbox, clone the repository, and run `vagrant up`, and nip off and make a cuppa, safe in the knowledge that when I get back the install will be, if not done, then at least in progress. Also, it means it's easy to run the same OS for development and production.

I've used [PuPHPet](https://puphpet.com/) a bit, but I've found Puppet to be a little complex for what I wanted, so I switched to using the shell provisioner instead. As a starting point for future projects, I've thrown together a basic Vagrant configuration based on that provided by PuPHPet, that includes the following:

* A full LAMP stack, running on Ubuntu 12.04
* APC
* PHPMyAdmin
* Git
* A blank SQL file - this is automatically run on `vagrant up`, so you can place any commands needed to set up your database in here.
* msmtp - just amend the username and password in bootstrap.sh to point to a Gmail account and your web app should be able to send emails via that account quickly and easily

It's available [here](https://github.com/matthewbdaly/vagrant-php-dev-boilerplate), and if you haven't discovered the benefits of Vagrant yet, it would be a good place to start.
