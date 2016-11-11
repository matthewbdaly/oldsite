---
layout: post
title: "Falling back to local copies of jQuery and jQuery Mobile"
date: 2012-08-13 19:54
comments: true
categories: 
- javascript
- jquery
- jquerymobile
---

I use jQuery Mobile a lot at work, and it's brilliant. For quickly knocking together a high-quality user interface that works well on mobile devices, it's unbeatable.

Like many web developers, I favour using a CDN-hosted version of both jQuery and jQuery Mobile, because it makes it more likely that the user won't have to download the appropriate files as their web browser has already cached them. However, by doing this you run the risk of your site being negatively affected if the CDN provider goes down for any length of time. So, I think it's a good idea to have a fallback for both jQuery and jQuery Mobile.

I spent a while looking and finally managed to come up with a solution that works well, and borrows heavily from [a similar solution for jQuery UI by Tim James](http://timjames.me/jquery-and-jquery-ui-fallbacks). First of all, load the stylesheets and JavaScript files as usual:

```html
<link rel="stylesheet" href="http://code.jquery.com/mobile/1.1.1/jquery.mobile.structure-1.1.1.min.css" />
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js"></script>
<script src="http://code.jquery.com/mobile/1.1.1/jquery.mobile-1.1.1.min.js"></script>
```

Below this, place the following inside another set of script tags:
```javascript
if (typeof jQuery == 'undefined')
{
    document.write(unescape("%3Cscript src='http://path-to-jquery.min.js' type='text/javascript'%3E%3C/script%3E"));
}
```

 If jQuery is not defined, this will write another set of script tags that will load the local copy of jQuery. Now, inside a second set of script tags, place the following code:
```javascript
if(typeof $.mobile == 'undefined')
{
    document.write(unescape("%3Cscript src='http://path-to-jquery-mobile.min.js' type='text/javascript'%3E%3C/script%3E"));
}

$(function() {
    if($('.ui-helper-hidden:first').is(':visible') === true){
        $('<link rel="stylesheet" type="text/css" href="http://path-to-jquery-mobile-structure.min.css" />').appendTo('head');
    }
});
```

This won't work if it's placed in the same set of script tags as the code above, because it requires that jQuery be working already. The first part works similarly to the jQuery fallback - if jQuery Mobile is not defined, it writes a new script tag. The second relies on an element in the DOM with a class of ui-helper-hidden, which jQuery Mobile would hide by default if it were loaded. If it is visible, the jQuery Mobile structure CSS file has not been loaded and so a link to the local copy of the stylesheet is created.  Of course, this means you have to create this element, so add the following code to the very top of the body, directly under the opening body tag:

```handlebars
<div class='ui-helper-hidden'></div>
```

If you download copies of the appropriate files and set the paths to them correctly, you should now be able to enjoy all the advantages of using a CDN for hosting jQuery and jQuery Mobile while also having the security of knowing that if the CDN goes down, your application will still work fine. Exactly the same approach will work with jQuery UI as well.
