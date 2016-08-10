---
title: "An introduction to managing your servers with Ansible"
date: 2016-08-10 09:40:56 +0100
categories:
- ansible
- sysadmin
- python
comments: true
---

If, like me, you're a web developer who sometimes also has to wear a sysadmin's hat, then you'll probably be coming across the same set of tasks each time you set up a new server. These may include:

* Provisioning new servers on cloud hosting providers such as Digital Ocean
* Setting up Cloudflare
* Installing a web server, database and other required packages
* Installing an existing web application, such as Wordpress
* Configuring the firewall and Fail2ban
* Keeping existing servers up to date

These can get tedious and repetitive fairly quickly - who genuinely wants to SSH into each server individually and run the updates regularly? Also, if done manually, there's a danger of the setup for each server being inconsistent. Shell scripts will do this, but aren't easy to read and not necessarily easy to adapt to different operating systems. You need a way to be able to manage multiple servers easily, maintain a series of reusable "recipes" and do it all in a way that's straightforward to read - in other words, a configuration management system.

There are others around, such as Chef, Puppet, and Salt, but my own choice is [Ansible](https://www.ansible.com/). Here's why I went for Ansible:

* Playbooks and roles are defined as YAML, making them fairly straightforward to read and understand
* It's written in Python, making it easy to create your own modules that leverage existing Python modules to get things done
* It's distributed via `pip`, making it easy to install
* It's doesn't require you to install anything new on the servers, so you can get started straight away as soon as you can access a new server
* It has modules for interfacing with cloud services such as Digital Ocean and Amazon Web Services

Ansible is very easy to use, but you do still need to know what is actually going on to get the best out of it. It's intended as a convenient abstraction on top of the underlying commands, not a replacement, and you should know how to do what you want to do manually before you write an Ansible playbook to do it.

Setting up
----------

You need to have Python 2 available. Ansible doesn't yet support Python 3 (Grr...) so if you're using an operating system that has switched to Python 3, such as Arch Linux, you'll need to have Python 2 installed as well. Assuming you have `pip` installed, then run this command to install it:

```bash
$ sudo pip install ansible
```

Or for users on systems with Python 3 as the main Python:

```bash
$ sudo pip2 install ansible
```

For Windows users, you'll want to drop `sudo`. On Unix-like OS's that don't have `sudo` installed, drop it and run the command as root.


