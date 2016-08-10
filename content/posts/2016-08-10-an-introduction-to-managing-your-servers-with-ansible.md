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

Our first Ansible command
-------------------------

We'll demonstrate Ansible in action with a Vagrant VM. Drop the following `.Vagrantfile` into your working directory:

```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "debian/jessie64"
  config.vm.network "forwarded_port", guest: 80, host: 8080
end
```

Then fire up the VM:

```bash
$ vagrant up
```

This VM will be our test bed for running Ansible. If you prefer, you can use a remote server instead.

Next, we'll configure Ansible. Save this as `ansible.cfg`:

```conf
[defaults]
hostfile = inventory
remote_user = vagrant
private_key_file = .vagrant/machines/default/virtualbox/private_key
```

In this case the remote user is `vagrant` because we're using Vagrant, but to manage remote machines you would need to change this to the name of the account that you use on the server. The value of `private_key_file` will also normally be something like `/home/matthew/.ssh/id_rsa.pub`, but here we're using the Vagrant-specific key.

Note the `hostfile` entry - this points to the list of hosts you want to manage with Ansible. Let's create this next. Save the following as `inventory`:

```conf
testserver ansible_ssh_host=127.0.0.1 ansible_ssh_port=2222
```

Note that we explicitly need to set the port here because we're using Vagrant. Normally it will default to port 22. A typical entry for a remote server might look like this:

```conf
example.com ansible_ssh_host=192.168.56.101
```

Note also that we can refer to hosts by the name we give it, which can be as meaningful (or not) as you want.

Let's run our first command:

```bash
$ ansible all -m ping
testserver | SUCCESS => {
    "changed": false,
    "ping": "pong"
}
```

We called Ansible with the hosts set to `all`, therefore every host in the inventory was contacted. We used the `-m` flag to say we were calling a module, and then specified the `ping` module. Ansible therefore pinged each server in turn.

We can call ad-hoc commands using the `-a` flag, as in this example:

```bash
$ ansible all -a "uptime"
testserver | SUCCESS | rc=0 >>
 17:26:57 up 19 min,  1 user,  load average: 0.00, 0.04, 0.13
```

This command gets the uptime for the server. If you only want to run the command on a single server, you can specify it by name:

```bash
$ ansible testserver -a "uptime"
testserver | SUCCESS | rc=0 >>
 17:28:21 up 20 min,  1 user,  load average: 0.02, 0.04, 0.13
```

Here we specified the server as `testserver`. What about if you want to specify more than one server, but not all of them? You can create groups of servers in `inventory`, as in this example:

```conf
[webservers]
testserver ansible_ssh_host=127.0.0.1 ansible_ssh_port=2222
example.com ansible_ssh_host=192.168.56.101
```

You could then call the following to run the `uptime` command on all the servers in the `webservers` group:

```bash
$ ansible webservers -a "uptime"
```

If you want to run the command as a different user, you can do so:

```bash
$ ansible testserver -a "uptime" -u bob
```

Note that for running `uptime` we haven't specified the `-m` flag. This is because the `command` module is the default, but it's very basic and doesn't support shell variables. For more complex interactions you might need to use the `shell` module, as in this example:

```bash
$ ansible testserver -m shell -a 'echo $PATH'
testserver | SUCCESS | rc=0 >>
/usr/local/bin:/usr/bin:/bin:/usr/games
```

For installing a package on Debian or Ubuntu, you might use the `apt` module:

```bash
$ ansible testserver -m apt -a "name=git state=present" --become
testserver | SUCCESS => {
    "cache_update_time": 0,
    "cache_updated": false,
    "changed": true,
    "stderr": "",
    "stdout": "Reading package lists...\nBuilding dependency tree...\nReading state information...\nThe following extra packages will be installed:\n  git-man liberror-perl\nSuggested packages:\n  git-daemon-run git-daemon-sysvinit git-doc git-el git-email git-gui gitk\n  gitweb git-arch git-cvs git-mediawiki git-svn\nThe following NEW packages will be installed:\n  git git-man liberror-perl\n0 upgraded, 3 newly installed, 0 to remove and 83 not upgraded.\nNeed to get 4552 kB of archives.\nAfter this operation, 23.5 MB of additional disk space will be used.\nGet:1 http://httpredir.debian.org/debian/ jessie/main liberror-perl all 0.17-1.1 [22.4 kB]\nGet:2 http://httpredir.debian.org/debian/ jessie/main git-man all 1:2.1.4-2.1+deb8u2 [1267 kB]\nGet:3 http://httpredir.debian.org/debian/ jessie/main git amd64 1:2.1.4-2.1+deb8u2 [3262 kB]\nFetched 4552 kB in 1s (3004 kB/s)\nSelecting previously unselected package liberror-perl.\r\n(Reading database ... \r(Reading database ... 5%\r(Reading database ... 10%\r(Reading database ... 15%\r(Reading database ... 20%\r(Reading database ... 25%\r(Reading database ... 30%\r(Reading database ... 35%\r(Reading database ... 40%\r(Reading database ... 45%\r(Reading database ... 50%\r(Reading database ... 55%\r(Reading database ... 60%\r(Reading database ... 65%\r(Reading database ... 70%\r(Reading database ... 75%\r(Reading database ... 80%\r(Reading database ... 85%\r(Reading database ... 90%\r(Reading database ... 95%\r(Reading database ... 100%\r(Reading database ... 32784 files and directories currently installed.)\r\nPreparing to unpack .../liberror-perl_0.17-1.1_all.deb ...\r\nUnpacking liberror-perl (0.17-1.1) ...\r\nSelecting previously unselected package git-man.\r\nPreparing to unpack .../git-man_1%3a2.1.4-2.1+deb8u2_all.deb ...\r\nUnpacking git-man (1:2.1.4-2.1+deb8u2) ...\r\nSelecting previously unselected package git.\r\nPreparing to unpack .../git_1%3a2.1.4-2.1+deb8u2_amd64.deb ...\r\nUnpacking git (1:2.1.4-2.1+deb8u2) ...\r\nProcessing triggers for man-db (2.7.0.2-5) ...\r\nSetting up liberror-perl (0.17-1.1) ...\r\nSetting up git-man (1:2.1.4-2.1+deb8u2) ...\r\nSetting up git (1:2.1.4-2.1+deb8u2) ...\r\n",
    "stdout_lines": [
        "Reading package lists...",
        "Building dependency tree...",
        "Reading state information...",
        "The following extra packages will be installed:",
        "  git-man liberror-perl",
        "Suggested packages:",
        "  git-daemon-run git-daemon-sysvinit git-doc git-el git-email git-gui gitk",
        "  gitweb git-arch git-cvs git-mediawiki git-svn",
        "The following NEW packages will be installed:",
        "  git git-man liberror-perl",
        "0 upgraded, 3 newly installed, 0 to remove and 83 not upgraded.",
        "Need to get 4552 kB of archives.",
        "After this operation, 23.5 MB of additional disk space will be used.",
        "Get:1 http://httpredir.debian.org/debian/ jessie/main liberror-perl all 0.17-1.1 [22.4 kB]",
        "Get:2 http://httpredir.debian.org/debian/ jessie/main git-man all 1:2.1.4-2.1+deb8u2 [1267 kB]",
        "Get:3 http://httpredir.debian.org/debian/ jessie/main git amd64 1:2.1.4-2.1+deb8u2 [3262 kB]",
        "Fetched 4552 kB in 1s (3004 kB/s)",
        "Selecting previously unselected package liberror-perl.",
        "(Reading database ... ",
        "(Reading database ... 5%",
        "(Reading database ... 10%",
        "(Reading database ... 15%",
        "(Reading database ... 20%",
        "(Reading database ... 25%",
        "(Reading database ... 30%",
        "(Reading database ... 35%",
        "(Reading database ... 40%",
        "(Reading database ... 45%",
        "(Reading database ... 50%",
        "(Reading database ... 55%",
        "(Reading database ... 60%",
        "(Reading database ... 65%",
        "(Reading database ... 70%",
        "(Reading database ... 75%",
        "(Reading database ... 80%",
        "(Reading database ... 85%",
        "(Reading database ... 90%",
        "(Reading database ... 95%",
        "(Reading database ... 100%",
        "(Reading database ... 32784 files and directories currently installed.)",
        "Preparing to unpack .../liberror-perl_0.17-1.1_all.deb ...",
        "Unpacking liberror-perl (0.17-1.1) ...",
        "Selecting previously unselected package git-man.",
        "Preparing to unpack .../git-man_1%3a2.1.4-2.1+deb8u2_all.deb ...",
        "Unpacking git-man (1:2.1.4-2.1+deb8u2) ...",
        "Selecting previously unselected package git.",
        "Preparing to unpack .../git_1%3a2.1.4-2.1+deb8u2_amd64.deb ...",
        "Unpacking git (1:2.1.4-2.1+deb8u2) ...",
        "Processing triggers for man-db (2.7.0.2-5) ...",
        "Setting up liberror-perl (0.17-1.1) ...",
        "Setting up git-man (1:2.1.4-2.1+deb8u2) ...",
        "Setting up git (1:2.1.4-2.1+deb8u2) ..."
    ]
}
```

Here we specify that a particular package should be `state=present` or `state=absent`. Also, note the `--become` flag, which allows us to become root. If you're using an RPM-based Linux distro, you can use the `yum` module in the same way.

Finally, let's use the `git` module to check out a project on the server:

```bash
$ ansible testserver -m git -a "repo=https://github.com/matthewbdaly/django_tutorial_blog_ng.git dest=/home/vagrant/example version=HEAD"
testserver | SUCCESS => {
    "after": "3542098e3b01103db4d9cfc724ba3c71c45cb314",
    "before": null,
    "changed": true,
    "warnings": []
}
```

Here we check out a Git repository. We specify the repo, destination and version.

You can call any installed Ansible module in an ad-hoc fashion in the same way. Refer to the documentation for a list of modules.

Playbooks
---------

Ad-hoc commands are useful, but they don't offer much extra over using SSH. Playbooks allow you to define a repeatable set of cammands for a particular use case. In this example, I'll show you how to write a playbook that does the following:

* Installs and configures Nginx
* Clones the repository for my site into the web root

This is sufficiently complex to demonstrate some more of the functionality of Ansible, while also demonstrating playbooks in action.

Create a new folder called `playbooks`, and inside it save the following as `sitecopy.yml`:

```yml
---
- name: Copy personal website
  hosts: testserver
  become: True
  tasks:
    - name: Install Nginx
      apt: name=nginx update_cache=yes
    - name: Copy config
      copy: >
        src=files/nginx.conf
        dest=/etc/nginx/sites-available/default
    - name: Activate config
      file: >
        dest=/etc/nginx/sites-enabled/default
        src=/etc/nginx/sites-available/default
        state=link
    - name: Delete /var/www directory
      file: >
        path=/var/www
        state=absent
    - name: Clone repository
      git: >
        repo=https://github.com/matthewbdaly/matthewbdaly.github.io.git
        dest=/var/www
        version=HEAD
    - name: Restart Nginx
      service: name=nginx state=restarted
```

Note the `name` fields - these are comments that will show up in the output when each step is run. First we use the `apt` module to install Nginx, then we copy over the config file and activate it, then we empty the existing `/var/www` and clone the repository, and finally we restart Nginx.

Also, note the following fields:

* `hosts` defines the hosts affected
* `become` specifies that the commands are run using `sudo`

We also need to create the config for Nginx. Create the `files` directory under `playbooks` and save this file as `playbooks/files/nginx.conf`:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server ipv6only=on;

    root /var/www;
    index index.html index.htm;

    server_name localhost;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Obviously if your Nginx config will be different, feel free to amend it as necessary. Finally, we run the playbook using the `ansible-playbook` command:

```bash
$ ansible-playbook playbooks/sitecopy.yml

PLAY [Copy personal website] ***************************************************

TASK [setup] *******************************************************************
ok: [testserver]

TASK [Install Nginx] ***********************************************************
changed: [testserver]

TASK [Copy config] *************************************************************
changed: [testserver]

TASK [Activate config] *********************************************************
changed: [testserver]

TASK [Delete /var/www directory] ***********************************************
changed: [testserver]

TASK [Clone repository] ********************************************************
changed: [testserver]

TASK [Restart Nginx] ***********************************************************
changed: [testserver]

PLAY RECAP *********************************************************************
testserver                 : ok=7    changed=6    unreachable=0    failed=0

```

If we had a playbook that we wanted to run on only a subset of the hosts it applied to, we could use the `-l` flag, as in this example:

```bash
$ ansible-playbook playbooks/sitecopy.yml -l testserver
```

Using these same basic concepts, you can invoke many different Ansible modules to achieve many different tasks. You can spin up new servers on supported cloud hosting companies, you can set up a known good fail2ban config, you can configure your firewall, and many more tasks. As your playbooks get bigger, it's worth moving sections into separate roles that get invoked within multiple playbooks, in order to reduce repetition.

Summary
-------

Ansible is an extremely useful tool for managing servers, but to get the most out of it you have to put in a fair bit of work reading the [documentation](https://docs.ansible.com/) and writing your own playbooks for your own use cases. It's simple to get started with, and if you're willing to put in the time writing your own playbooks then in the long run you'll save yourself a lot of time and grief by making it easy to set up new servers and administer existing ones. Hopefully this has given you a taster of what you can do with Ansible - from here on the documentation is worth a look as it lists all of the modules that ship with Ansible. If there's a particular task you dread, such as setting up a mail server, then Ansible is a very good way to automate that away so it's easier next time.

My experience is that it's best to make an effort to try to standardise on two or three different stacks for different purposes, and create Ansible playbooks for those stacks. For instance, I've tended to use PHP 5, Apache, MySQL, Memcached and Varnish for Wordpress sites, and PHP 7, Nginx, Redis and PostgreSQL for Laravel sites. That way I know that any sites I build with Laravel will be using that stack. Knowing my servers are more consistent makes it easier to work with them and identify problems.
