---
title: "The trouble with integrated static analysis"
date: 2020-02-12 22:40:15 +0000
categories:
- php
comments: true
---

I've always been a big fan in general of tools that provide feedback about the quality of my code. The development role in which I spent the most time was one in which I had no peer feedback or mentoring at all, and while I could definitely have done with more peer review than I had, automated tools helped fill the gap a little bit. When I started building my first Phonegap app, about a year after I started programming professionally, it used *far* more Javascript than I'd ever used before, and JSLint was very helpful in instilling good practices at that early stage in my career.

In addition, I often find that using an automated tool largely eliminates the issue of ego - if your colleague Bob tells you something is a bad practice, you can potentially dismiss it as "That's just Bob's preferences", whereas an automated tool is potentially much more objective. Nowadays, my typical set of static analysis tools on a project includes:

* ESLint
* Flow
* PHP CodeSniffer
* Psalm

However, I'm always dubious of using any static analysis tool that's tightly integrated with a particular editor or IDE. In this post, I will explain my reasoning.

In-editor feedback
==================

Having instant feedback on the quality of your code is tremendously useful. Sure, you can run something like CodeSniffer from the command line and see what the problems are, but that's nowhere near as useful as having it actually *in* your code. If you work on a legacy code base, there's no way in hell you can wade through a long list of output in the terminal and fix them without losing the will to live. By comparison, actually seeing something flagged as an error where it actually occurs makes the mental cost of fixing it much smaller - you can see it in context, and can usually therefore resolve it more easily.

However, that doesn't explicitly require that any one tool form an integral part of the editor. Most editors can hand off linting and static analysis to other, standalone tools, and doing so offers the following advantages:

* Less dependence on a given development environment - it's always a struggle if you wind up stuck using a development environment you dislike (I grew to utterly despise Netbeans in my first role), but if you can use generic feedback tools that can be integrated with just about any editor, your team can use the development environment that suits them most, while still all benefiting from the feedback these tools provide
* These tools tend to be open source, meaning you have the security of knowing that if the creator ceases maintaining it, either someone else may pick up the baton, or you can choose to fork it yourself. If a commercial IDE provider ceases trading, it's likely you won't be able to use their offering at all at some point in the future.

Nowadays I use vim-ale in Neovim, and that provides real-time feedback for a number of linters and static analysis tools, including all those I mentioned above. I have comprehensive information on any issues in my code, and because any configuration is in simple text files that form part of the repository, it's easy to update those settings for all developers working on the project to ensure consistency. 

It's possible that an integrated solution *might* offer a few advantages in terms of tighter integration with autocompletion and other functionality allowing for it, but whether they outweigh the tradeoffs mentioned here is dependent entirely on the implementation and how useful it is for any one team.

Continuous integration to the rescue
===================================

There's another issue I have with this sort of tightly integrated static analysis, which is probably the biggest, and that is that the feedback is available only at the level of an individual developer, not the team.

It's great providing all this feedback to developers, but what if they just ignore it? Not all developers have had the sort of experience that leads one to really appreciate the value of coding standards and type hints, particularly if they've worked primarily on small or greenfield projects, or in environments where the emphasis was on churning out large quantities of work, and getting developers to tidy up the sort of issues these tools identify can sometimes be a tough sell when faced with code which, at least superficially, works.

Suppose you take on a new developer and ask them to work alone on a particular project for several months. Due to your own workload you can't easily schedule code reviews with them, so you don't see what they're writing until they're done. Then you take a look at what they've written and it's full of issues that the IDE caught, but the developer either didn't bother to fix, or didn't know how to. What they've done may well work, but they've introduced a huge morass of technical debt that will slow down future development for the foreseeable future.

If your static analysis tools work only in the context of a given editor or IDE, then if the new dev introduce issues in the code base and doesn't resolve them because they don't know how, or don't see the value, then the first you knows about it is when you clone the repo yourself and open it up. With a solution that runs in a CI environment, you can catch any reduction in code quality when it's pushed. Sure, code reviews can do that too, but that requires manual input in a way that not every team is willing to spare, whereas a CI server, once set up, is largely self sustaining. And you could run one tool locally and another in a CI environment, but you can't be sure they'll necessarily catch all the same issues.

Now consider the same scenario if you're using a separate code quality tool that's integrated both into the editor, and your continuous integration workflow. Obviously, it will depend on your personal CI setup, but once code quality either begins to drop, or drops below a given level, the CI server will mark the build as failed, and you'll be alerted. You can therefore then raise the issue with the new dev before it gets out of hand, and provide whatever support they need to resolve the problem there and then.

I personally maintain a legacy project in which, at one point prior to my arrival, a junior dev introduced an enormous amount of technical debt after working on it alone for six months. An integrated linter or static analysis tool probably wouldn't have stopped that from happening, for the reasons stated above, but if a similar tool were part of the CI workflow, it could have been flagged as an issue much earlier and dealt with. Yes, leaving a junior dev unsupported and unsupervised for that length of time isn't a great idea, but it happens, particularly in busy environments such as agencies. A good CI setup lets you see if someone is adding these kinds of issues, and act to nip it in the bud before it becomes too much of a problem, which is ultimately good for that developer's career.

Peer pressure can also be a strong motivating factor under these circumstances. By simply displaying a metric, you encourage people's natural competitiveness, so displaying code quality stats in your CI dashboard will encourage your team to do better in this regard, and no-one wants to be visibly seen to be letting the team down by producing substandard code.

For these reasons, where possible for feedback on code quality, I would always prefer to rely on a standalone tool that can be integrated with an editor, or used as part of a continuous integration workflow, as opposed to any IDE-specific functionality.
