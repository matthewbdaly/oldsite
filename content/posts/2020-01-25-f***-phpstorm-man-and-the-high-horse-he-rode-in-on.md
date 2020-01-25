---
title: "F*** PHPStorm Man and the high horse he rode in on"
date: 2020-01-25 22:25:17 +0000
categories:
- programming
comments: true
---

There's a particularly unpleasant type of programmer that exists, and you've probably met him, either online or in person. I call him **PHPStorm Man**.

NB: Despite the name I've chosen, I'm not singling out users of PHPStorm in particular about this. The first time I encountered PHPStorm Man in person, he was using Sublime Text, and you will find PHPStorm Men using all different editors and IDEs. PHPStorm Man is an archetype defined not by any particular piece of software, but by a common bad attitude, and given that I work primarily with PHP these days, I've most often encountered this kind of behaviour from PHPStorm users (or at least, people claiming to be PHPStorm users, since at least online you can't discount the possibility that they're trolls). Users of other languages may well see this behaviour most prominently from those who use some other editor or IDE, but the same underlying phenomenon is at work, whether we call him PHPStorm Man, Eclipse Man, Vim Man or PyCharm Man.

Who is PHPStorm Man?
--------------------

![The hero we really, really don't need](/static/images/phpstorm-man.jpg)

PHPStorm Man (and he *will* almost certainly be a man - while it could be just because our industry is male-dominated, I've *never* known a woman to behave like this, and I strongly suspect it's nothing more than an industry-specific example of the common phenomenon of [mansplaining](https://en.wikipedia.org/wiki/Mansplaining)) doesn't know squat about your editor or IDE. He just knows his is superior, and he wants you to know it, regardless of the evidence.

His knowledge of your editor is probably either non-existent, grossly outdated, plain ill-informed or second-hand (probably from another PHPStorm Man). If he's advocating an IDE, he'll likely equate all text editors with Notepad - he may claim the advantages of his one over yours include such fundamentals as syntax highlighting and autocompletion.

He'll boast about some feature his editor has that yours doesn't, even if it does. If your editor lacks that functionality out of the box, but can add it via a plugin, apparently that doesn't count because although you're intelligent enough to build a working web app, somehow installing and configuring that plugin is an insurmountable burden (yet mysteriously turning off all the stuff you don't need in *his* editor is quick and easy). If it does do that out of the box, he'll probably find some bullshit reason why his editor's implementation is better, even if it's something as pointless and irrelevant as "it's been around longer". He'll likely claim, with absolutely no evidence whatsoever, or indeed in the presence of evidence to the contrary, that you'd be more productive if you only used his editor.

In short, if you aren't using his editor or IDE of choice, you're a troglodyte living in a dung hut.

PHPStorm man in the wild
------------------------

I had an encounter with PHPStorm Man in person a while back. Just over two years ago I started a new job, which as it turned out didn't last long after I caught the flu that was going around in late 2017 my first week. On the second day, shortly after going over something with me, the senior dev sent me the following message on Slack:

> I noticed you're using Vim. Have you tried using Sublime Text?

I responded that I had, and chose not to use it. There followed a long string of messages along the following lines:

> Him: Sublime Text has X!

> Me: I have that

> Him: Well Sublime Text also has Y!

> Me: I have that too, via a plugin

> Him: Well, Sublime Text doesn't need a plugin for that

> Me: Irrelevant since the plugin is already installed and configured, and I know how to use it

> Him: Well, what about this?

> Me: That sounds cool, so I just found a plugin to do that and installed it

> Him: And this?

> Me: I have absolutely no need for that

> Him: Well, Vim is old, Sublime Text is new!

> Me: Actually, this is Neovim, which is technically newer than Sublime Text

> Him: Well, Sublime Text is a GUI application

> Me: Exactly. That makes it slower and forces me to use the mouse, aggravating my RSI. I use the terminal because it's more efficient

> Him: Well, I don't mind what you use...(despite the evidence of that entire conversation)

With the benefit of hindsight, what I *should* have responded with was this:

> I'm an experienced, professional web developer of over six years, and I chose my editor based on years of personal experience, and have chosen my plugins and configuration based on what's useful to me, and continue to do so to this day. I don't appreciate you talking down to me like a child.

Why I personally don't use an IDE
---------------------------------

In my case, I have a particularly good reason not to use *any* GUI application to develop in. Before I was a developer, I worked for an insurance company in a customer service role, and I didn't have access to the sort of decent quality keyboards and mice developers habitually use, as well as having output goals linked to discipline and bonus/salary raises and having to use custom internal applications on Windows XP, with dreadful keyboard support. As a result I developed a degree of RSI in both hands, which I've found is aggravated by using any application that requires me to use a mouse extensively - I'm generally OK if I only have to type, but reaching for the mouse all the time quickly becomes tiring, and soon after painful.

For that reason I've developed a workflow that's strongly dependent on the command line - I use Neovim in the terminal, alongside Byobu so that I can run multiple tabs and switch between them quickly without touching the mouse. Moving to a more GUI-oriented workflow would require me to use the mouse more than I do now, which would probably become physically painful quite quickly. Using an editor or IDE which I found made me more prone to further flare-ups of RSI could have serious consequences for my long-term health, and could potentially be career-ending. If I worked somewhere that mandated a particular IDE that didn't work well for me, I'd *have* to either negotiate an exception on health and safety grounds or quit.

I'm also of the personal opinion that much of the functionality of an IDE should not be, in principle, tied to that IDE, but should instead be the province of more general purpose tools that can used, not merely in any editor or IDE but, where appropriate, on a continuous integration server. For instance, language servers provide a tool-agnostic way for any IDE or editor to implement functionality such as completion or navigation, and linters such as ESLint can integrate into any half-decent editor or run in a CI environment. Since these tend to be open source projects, whereas IDE's are normally commercial offerings, they're less vulnerable to suddenly disappearing and leaving users high and dry.

There's also a lot of functionality in an IDE that I rarely, if ever, use. There's no point including and starting up an FTP client as part of my editor if I'm never going to use it, as it slows the application down, and nor should I have to root around trying to turn off functionality I'm never going to have to use. For a lot of other functionality, there are more powerful standalone applications that I'm used to such as Postman or MySQL Workbench, and I'll use them as and when I need them - I gain nothing by having them integrated with my editor.

I also like to be able to use the same editor everywhere. I still occasionally dabble in Python, so a language-specific IDE wouldn't be suitable when switching between languages. I also sometimes work on personal projects on an HP Stream netbook running Xubuntu, which is fine for small PHP projects that don't require a database server or any web server other than the PHP dev server. I can happily run Neovim on that, but there's no way it could run an IDE at an acceptable speed.

Last of all, screen real estate is an issue. I don't like interfaces that are too busy - I *cannot stand* having anything, *at all* on my desktop for any length of time at all, and any interface that has too much on screen at once is distracting. I will typically have Neovim open in a terminal, with the NERDTree file finder open on the left, and two panels split in the main body, and that's all. A big factor in my productivity is how much code I can see at once, and having too much screen real estate taken up by menus and sidebars is counterproductive - with Neovim there's almost nothing getting in the way.

I personally have had to give this sort of explanation many, many times as to why I use first Vim and then Neovim, and indeed part of the motivation behind writing this post is that I'm sick to death of having to explain myself over and over again and will now be able to merely direct them to this article. Thanks to tools like PHPActor, vim-ale and FZF, I don't feel like there's anything I'm missing out on that an IDE would give me, and Psalm is very good at catching type errors without being tied to any one IDE, but that doesn't stop people telling me I'm missing out on features I already have. Any time I come across a feature I think is cool, I go through the following process:

* Find cool feature
* Find plugin that implements said feature
* Install plugin by adding a single line to my Neovim config and running `:PlugUpdate`
* Add a few lines of config
* Start using feature

Using an IDE *would* eliminate the middle three steps, but I don't find those onerous - we're talking about the work of five minutes, which is insignificant compared to the time taken to learn to use the feature effectively. And a feature you don't use is one that you still have to start up if it's present, so making it an opt-in plugin is often a better way to go.

Every other developer will have their own version of this story. Some will have stayed mostly static in their editor choices, while others will be changing all the time - indeed, I've sometimes used other editors for specific tasks in the past. In short, everyone has their own reasons for using their editor of choice, and it's *appallingly* arrogant to assume that their reasons for using a particular one are less valid than yours.

Am I PHPStorm Man?
------------------

As I've said before, this behaviour is not confined to PHPStorm users, nor is it in any way universal among them. If you use PHPStorm and enjoy it, then fine, rock on. If you use a different editor or IDE, then that's fine too - I don't have a problem with that, and nor should your colleagues or line manager. Using any one editor or IDE *does not* make you PHPStorm Man. What makes you PHPStorm Man is the patronising attitude.

In the example given above, what made the senior dev PHPStorm Man was not the initial enquiry as to whether I'd tried Sublime Text, but the fact that he wouldn't leave it be when confronted with evidence that I either had, could easily obtain, or didn't need the functionality of his editor in mine, and that he was talking down to an experienced developer like a child.

Obviously, this isn't a new development - editor wars have long been a feature of our industry, as has the divide between IDE and editor users. But that doesn't mean I, and no doubt others, don't get utterly sick of it.

How not to be PHPStorm Man
--------------------------

When talking to users of other editors or IDE's about the subject of those tools, you should always bear this in mind:

* If they use a different tool to you, they probably know a hell of a lot more about it than you do, and are unlikely to take kindly to you ignorantly telling them what it can and can't do
* Mastering an editor or IDE can take years, and if they're already invested in one, it's incredibly arrogant to just assume that they're less productive in it than they would be in yours - even if they would (and that's almost certainly debatable), it would take some time to adjust.
* They've probably had this conversation many times before, and are sick of hearing it, especially if they have a few years experience under their belt
* Not every feature you use is useful to them
* No-one minds seeing a cool feature, so feel free to demonstrate it, but bear in mind that it's almost certainly not limited to that platform - if it's suffficiently cool, someone *will* have made it available as a plugin on most of the major editors and IDE's. If they like it, the most likely scenario is that they'll look to add that feature to their own editor via a plugin
* Just because it makes you more productive, doesn't mean that it would make them more productive
* It's perfectly possible to enforce consistent code styles and catch errors using standalone tools such as PHP CodeSniffer, Psalm, or ESLint, and these tools can be integrated in *any* editor, triggered with Git hooks, or run with continuous integration.

Now, it has to be said that sometimes there *are* some people who plod on with painfully outdated tools, like Notepad. But those tools tend to be limited to either commercial offerings that are no longer mainained or supported, or ones that lack any sort of plugin or extension system, making them limited in terms of how they can integrate with other services, so they're fairly easy to spot. However, making a particular editor or IDE compulsory is going to be disruptive. If you're in a leadership position, one way to resolve this is to simply require that everyone's editor have certain functionality - for instance, if you specify that everyone's editor must allow integration with PHP CodeSniffer and support for `.editorconfig`, then anyone using a legacy editor that can't support those will need to move away from it, but they'll be able to pick one that suits them, rather than be forced into one they may well dislike. Editors and IDE's don't produce proprietary formats the way word processors do - they work with common formats, and if prominent open-source projects can enforce a consistent coding standard with many different editors there's absolutely no reason why your colleagues can't do so too,

Summary
-------

This post is a bit of an angry rant, but at the same time it shouldn't be taken *too* seriously. As I said, despite the name *PHPStorm Man*, it's not specifically about users of any one editor or IDE, but about the widespread, patronising attitude many developers have about editors and IDE's other than their own in general.

Someone using a different IDE or editor is absolutely none of your business unless you're their line manager or you work on the same code base, and even then it should only be an issue if it causes a clear effect on their productivity or the quality of their code. If that's not the case, keep your nose out.
