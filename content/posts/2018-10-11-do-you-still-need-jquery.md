---
title: "Do you still need jQuery?"
date: 2018-10-11 09:21:58 +0100
categories:
- javascript
- jquery
comments: true
---

There was a time not so long ago when jQuery was ubiquitous. It was used on almost every website as a matter of course, to the point that many HTML boilerplates included a reference to the CDN.

However, more and more I think it's probably unnecessary for two main use cases:

jQuery is probably unnecessary for many web apps with simple Javascript
-----------------------------------------------------------------------

When jQuery first appeared, IE6 was commonplace, and browser API's were notoriously inconsistent. jQuery was very useful in ironing out those inconsistencies and helping to make the developer's experience a bit better.

Nowadays, that's no longer the case. Internet Explorer is on its way out, with IE11 being the only version still supported by Microsoft, and it's becoming increasingly hard to justify support for older versions, especially with mobile browsers forming a bigger than ever chunk of the market. We'll probably need to continue supporting IE11 for a good long while, and possibly IE10 for some time too, but these aren't anything like as bad to work with as IE6. It's worth noting that newer versions of jQuery are also dropping support for these older browsers, so in many ways it actually does less than it used to.

[This is the usual thrust of articles on whether you should still be using jQuery](http://lmgtfy.com/?q=do+you+still+need+jquery) so I'm not going to go over this matter , but for many smaller web apps, jQuery is no longer necessary, and a lot of developers have a tendency to keep using it when it's probably not required.

jQuery is insufficient for web apps with complex Javascript
-----------------------------------------------------------

Nowadays, there's a lot of web applications that have moved big chunks of functionality from the server side to the client side. Beyond a certain (and quite small) level of complexity, jQuery just doesn't do enough to cut it. For me personally, the nature of the projects I work on means that this is a far, far bigger issue than the first one.

I used to work predominantly with Phonegap, which meant that a lot of functionality traditionally done on the server side had to be moved to the client side, and for that jQuery was never sufficient. My first Phonegap app started out using jQuery, but it quickly became obvious that it was going to be problematic. It wound up as a huge mass of jQuery callbacks and Handlebars templates, which was almost impossible to test and hard to maintain. Given this experience, I resolved to switch to a full-fledged Javascript framework next time I built a mobile app, and for the next one I chose Backbone.js, which still used jQuery as a dependency, but made things more maintainable by giving a structure that it didn't have before, which was the crucial difference.

The more modern generation of Javascript frameworks such as Vue and React, go further in making jQuery redundant. Both of these implement a so-called Virtual DOM, which is used to calculate the minimum changes required to re-render the element in question. Subsequently using jQuery to mutate the DOM would cause problems because it would get out of sync with the Virtual DOM - in fact, in order to get a jQuery plugin working in the context of a React component, you have to actively prevent React from touching the DOM, thereby losing most of the benefits of using React in the first place. You usually see better results from using a React component designed for that purpose (or writing one, which React makes surprisingly simple), than from trying to shoehorn a jQuery plugin into it.

They also make a lot of things that jQuery does trivially easy - for instance, if you want to conditionally show and hide content in a React component, it's just a case of building it to hide that content based on a particular value in the props or state, or filtering a list is just a case of applying a filter to the array containing the data and setting the state as appropriate.

In short, for single-page web apps or other ones with a lot of Javascript, you should look at other solutions first, and not just blithely assume jQuery will be up to the task. It's technically possible to build this sort of web app using jQuery, but it's apt to turn into a morass of spaghetti code unless approached with a great deal of discipline, one that sadly many developers don't have, and it doesn't exactly make it easy to promote code reuse. These days, I prefer React for complex web apps, because it makes it extremely intuitive to break my user interface up into reusable components, and test them individually. Using React would be overkill on brochure-style sites (unless you wanted to build it with something like Gatsby), but for more complex apps it's often a better fit than jQuery.

So when should you use jQuery?
------------------------------

In truth, I'm finding it harder and harder to justify using it at all on new builds. I use it on my personal site because that's built on Bootstrap 3 and so depends on jQuery, but for bigger web apps I'm generally finding myself moving to React, which renders it not just unnecessary for DOM manipulation, but counter-productive to use it. Most of what I do is big enough to justify something like React, and it generally results in code that is more declarative, easier to test and reason about, and less repetitive. Using jQuery for an application like this is probably a bad idea, because it's difficult (not impossible, mind, if you follow some of the advice [here](https://learn.jquery.com/code-organization/), use a linter and consider using a proper client-side templating system alongside jQuery) to build an elegant and maintainable Javascript-heavy application.

As a rule of thumb, I find anything which is likely to require more than a few hundred lines of Javascript to be written, is probably complex enough that jQuery isn't sufficient, and I should instead consider something like React.

I doubt it'd be worth the bother of ripping jQuery out of a legacy application and rewriting the whole thing to not require it, but for new builds I would think very hard about:

* Whether jQuery is sufficient, or you'd be better off using something like React, Vue or Angular
* If it is sufficient, whether it's actually necessary

In all honesty, I don't think using it when it's technically not necessary is as much of a big deal as the issue of using it when it's not really sufficient. Yes, downloading a library you technically don't need for a page is a bad practice, and it does make your site slower and harder for users on slow mobile connections, but there are ways to mitigate that such as CDN's, caching and minification. If you build a web app using jQuery alone when React, Vue or Angular would be more suitable, you're probably going to have to write a lot more code that will be difficult to maintain, test and understand. Things like React were created to solve the problems that arose when developers built complex client-side applications with jQuery, and are therefore a good fit for bigger applications. The complex setup does mean they have a threshold below which it's not worth the bother of using them, but past that threshold they result in better, more maintainable, more testable and more reusable code.

Now React is cool, you hate jQuery, you hipster...
--------------------------------------------------

Don't be a prat. Bitter experience has taught me that for a lot of my own personal use cases, jQuery is insufficient. It doesn't suck, it's just insufficient. If for your use case, jQuery *is* sufficient, then that's fine. All I'm saying is that when a web app becomes sufficiently complex, jQuery can begin to cause more problems than it solves, and that for a sufficiently complex web app you should consider other solutions.

I currently maintain a legacy application that includes thousands of lines of Javascript. Most of it is done with jQuery and some plugins, and it's resulted in some extremely repetitive jQuery callbacks that are hard to maintain and understand, and impossible to test. Recently I was asked to add a couple of modals to the admin interface, and rather than continuing to add them using jQuery and adding more spaghetti code, I instead opted to build them with React. During the process of building the first modal, I produced a number of components for different elements of the UI. Then, when I built the second one, I refactored those components to be more generic, and moved some common functionality into a higher-order component so that it could be reused. Now, if I need to add another modal, it will be trivial because I already have those components available, and I can just create a new component for the modal, import those components that I need, wrap it in the higher-order component if necessary, and that's all. I can also easily test those components in isolation. In short, I've saved myself some work in the long run by writing it to use a library that was a better fit.

It's not like using jQuery inevitably results in unmaintainable code, but it does require a certain amount of discipline to avoid it. A more opinionated library such as React makes it far, far harder to create spaghetti code, and makes code reuse natural in a way that jQuery doesn't.
