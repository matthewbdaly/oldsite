---
title: "How I added search to my site with Lunr.js"
date: 2015-04-18 15:05:41 +0100
categories:
- grunt
- nodejs
- javascript
- lunr
---

As I mentioned a while back, I recently switched the search on my site from Google's site-specific search to [Lunr.js](http://lunrjs.com/). Since my site is built with a static site generator, I can't implement search using database queries, and I was keen to have an integrated search method that would be fast and not require server-side scripting, and Lunr.js seemed to fit the bill.

The first task in implementing it was to generate the index. As I wrote the Grunt task that generates the blog, I amended that task to generate an index at the same time as I generated the posts. I installed Lunr.js with the following command:

```bash
npm install lunr --save
```

I then imported it in the task, and set up the field names:

```javascript
    var lunr = require('lunr');

    searchIndex = lunr(function () {
        this.field('title', { boost: 10 });
        this.field('body');
        this.ref('href');
    });
```

This defined fields for the title, body, and hyperlink, and set the hyperlink as the reference. The variable `searchIndex` represents the Lunr index.

Next, I looped through the posts, and passed the appropriate details to be added to the index:

```javascript
    for (post in post_items) {
        var doc = {
            'title': post_items[post].meta.title,
            'body': post_items[post].post.rawcontent,
            'href': post_items[post].path
        };
        store[doc.href] = {
            'title': doc.title
        };
        searchIndex.add(doc);
    }
```

At this point, `post_items` represents an array of objects, with each object representing a blog post. Note that the `body` field is set to the value of the item's attribute `post.rawcontent`, which represents the raw Markdown rather than the compiled HTML.

I then store the title in the `store` object, so that it can be accessed using the `href` field as a key.

I then do the same thing when generating the pages:

```javascript
    // Add them to the index
    var doc = {
        'title': data.meta.title,
        'body': data.post.rawcontent,
        'href': permalink + '/'
    };
    store[doc.href] = {
        'title': data.meta.title
    };
    searchIndex.add(doc);
```

Note that this is already inside the loop that generates the pages, so I don't include that.

We then write the index to a file:

```javascript
    // Write index
    grunt.file.write(options.www.dest + '/lunr.json', JSON.stringify({
        index: searchIndex.toJSON(),
        store: store
    }));
```

That takes care of generating our index, but we need to implement some client-side code to handle the search. We need to include Lunr.js on the client side as well, (I recommend using Bower to do so), alongside jQuery. If you include both, the following code should do the trick:

```javascript
$(document).ready(function () {
    'use strict';

    // Set up search
    var index, store;
    $.getJSON('/lunr.json', function (response) {

        // Create index
        index = lunr.Index.load(response.index);

        // Create store
        store = response.store;

        // Handle search
        $('input#search').on('keyup', function () {
            // Get query
            var query = $(this).val();

            // Search for it
            var result = index.search(query);

            // Output it
            var resultdiv = $('ul.searchresults');
            if (result.length === 0) {
                // Hide results
                resultdiv.hide();
            } else {
                // Show results
                resultdiv.empty();
                for (var item in result) {
                    var ref = result[item].ref;
                    var searchitem = '<li><a href="' + ref + '">' + store[ref].title + '</a></li>';
                    resultdiv.append(searchitem);
                }
                resultdiv.show();
            }
        });
    });
}); 
```

This should be easy to understand. On load, we fetch and parse the `lunr.json` file from the server, and load the index. We then set up an event handler for the `keyup` event on an input with the ID of `search`. We get the value of the input, and query our index, and we loop through our results and display them.

I was pleased with how straightforward it was to implement search with Lunr.js, and it works well. It's also a lot faster than any server-side solution since the index is generated during the build process, and is loaded with the test of the site, so the only factor in the speed of the response is how quick your browser executes JavaScript. You could probably also use it with a Node.js application by generating the index dynamically, although you'd probably want to cache it to some extent.
