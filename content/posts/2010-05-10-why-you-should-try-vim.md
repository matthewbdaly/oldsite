---
date: '2010-05-10 20:15:24'
layout: post
slug: why-you-should-try-vim
status: publish
title: Why you should try Vim
wordpress_id: '438'
categories:
- programming
comments: true
---

I'm a huge fan of the Vim text editor. I have the key bindings burned so deep into my head I keep reaching for the Escape key at work when I want to move around in a document in Microsoft Word, or hitting J to try and move down. In short, I'm incurably hooked on this wonderfully powerful text editor, and if you're still using something like gedit, TextEdit, or (god forbid!) Notepad, then I want to get you to think hard about switching to Vim!

I first started using Vim nearly two years ago. At the time, I had a fair grasp of HTML, but hadn't really gotten into programming as such. I had my Eee PC 2G Surf with me most of the time, but didn't have regular access to the Internet, and didn't have a full-sized laptop available for much of the time. The main text editor I'd used to date was Kate in KDE3.5.

One day I decided that, for lack of anything else to do, I was going to run through the Vim tutorial (accessed by entering `vimtutor`) in a terminal on my Eee PC. It was weird to start with, but I soon got used to the unusual-seeming key bindings. As a touch-typist, Vim worked really well for me since it meant I didn't have to move my hands off the keyboard at all, and the arcane-sounding keys soon became second nature. When I started work on the Site Development Foundations part of my CIW Foundation course, naturally I used Vim, and it worked well for both HTML and CSS documents, and of course the more I used it the more proficient at it I became.

Then when I first started learning Python, Vim really came into its own. The syntax highlighting is a real help, it's extremely fast to move around in and edit a document, and the auto-completion, while perhaps not quite as good as that in a language-specific IDE, was good enough for most purposes. I've since used Vim for coding in HTML, CSS, Python, JavaScript and C, as well as editing configuration files in various Unix-like operating systems, and it's been an excellent editor for all of these. I've barely scratched the surface of what it can do, and I already couldn't imagine using anything else.

So, why should you use Vim? Here are just a few of the reasons.

**Vim is everywhere**

If you're running Mac OS X, a CLI-only version of Vim is included, and you can get a graphical version called MacVim as well if you need it. Most Linux distributions include either Vim or another vi clone by default, and if not it's available from your distribution's repositories. If you're running another Unix flavour, again you almost certainly have Vim or another vi clone, and if not you can get one. And if you're on Windows you can grab a copy too. If you use a text editor like Kate, gedit, or so on, then you can't guarantee you can get it on other platforms. With Vim you can.

Also, the fact that Vim is a CLI application means that even if you have to edit something via SSH or Telnet, you still have access to a text editor you know well and can work just as well as you would with a GUI.

**Vim is flexible**

If you're using Vim, you can rely on it to edit files in virtually any programming or markup language you like, making it easy to adapt. Learning Ruby? You can do it in Vim. Now you want to learn Java? Again, Vim will do the job. By allowing you to use a familiar environment for virtually any programming language you may want to learn, Vim means you'll be productive quicker in a new language than you would be if you had to use a different text editor to the one you've used before.

**Vim is fast**

If you know how much faster touch-typing is than hunt-and-peck typing, then you'll have some idea of why Vim is faster than regular typing. Because Vim uses the home row for navigation, and in general is designed so you move your fingers as little as possible, it's faster than just about any other text editor you can name. The key bindings are deceptively simple to remember for the most part, as it's your fingers that need to remember them, not you brain.

Vim doesn't require the use of a mouse to navigate, nor does it require you to move your hand to the cursor keys. It also allows you to jump through a document as many times as you want - for instance, to go down 9 lines, you just enter `9j`. And it's easy to search for specific words and navigate to them.

**Vim is easy to customise**

By editing your .vimrc configuration file, you can easily modify how Vim works for your own needs. You can easily change settings to suit your working habits better, such as setting it to work with a mouse, add line numbers, change the colour scheme for syntax highlighting, change the key bindings etc. Vim can also be extend by use of scripts and plugins. Once you have it set up the way you want, it's easy to move all your settings to another computer.

**Vim always has a way to make things easier**

One of the best things about Vim is that, because it's a solid, mature product, someone's usually thought of a way to do whatever you want to do, quickly and easily. For instance, recently I was writing a JavaScript function to rate passwords for security, and I decided to get a list of bad passwords off the Web. I soon found one, but it was in excess of three thousand entries long, and I had to edit it to put them all into an array as individual strings, enclosed by quotes and separated by commas, ideally each on a line by themselves. This would have been an incredibly tedious task if I had to do it manually, so I did a little digging and discovered how to create a macro in Vim. This made it trivial to perform this task with only a few keypresses.

**Vim is tightly integrated with the command line**

Vim makes it easy to run other shell commands without leaving, by entering `:!`, followed by the command you want to run from the shell. This means it's easy to run or compile a program you've just written without leaving Vim, so you don't lose your place. When you're done, you're sent straight back into Vim, exactly where you left off.

**Vim behaves like a GUI application**

Yes, Vim may normally be a command-line application, but it still manages to pack in many of the niceties of graphical applications. You can split the screen horizontally or vertically, or open new files in new tabs. It's even possible to use it with a mouse in most cases.

These are just a few of the reasons why I love Vim, and if you haven't already tried it, or if you're still using a less-powerful text editor, then I urge you to give it a go. Yes, the learning curve can be a bit steep, but it's well worth it in terms of boosting your productivity. It works well for hand-coding HTML and CSS, or for programming in almost any language you can think of. You can get started today - if you're using Linux or Mac OS X, it's almost certainly already there waiting for you, and on Windows it's just a download away. Try launching the tutorial by entering `vimtutor` in the shell, and work through it, and you'll find yourself getting used to it surprisingly quickly. Or why not try [Cream](http://cream.sourceforge.net/), essentially a preconfigured version of Vim that has a shallower learning curve? If you use a text editor at all, you really should give Vim a try.
