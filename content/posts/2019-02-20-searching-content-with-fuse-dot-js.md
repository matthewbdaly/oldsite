---
title: "Searching content with Fuse.js"
date: 2019-02-20 17:25:58 +0000
categories:
- javascript
- search
- json
comments: true
---

Search is a problem I'm currently taking a big interest in. The legacy project I maintain has an utterly abominable search facility, one that I'm eager to replace with something like Elasticsearch. But smaller sites that are too small for Elasticsearch to be worth the bother can still benefit from having a decent search implementation. Despite some recent improvements, relational databases aren't generally that good a fit for search  because they don't really understand the concept of relevance - you can't easily order something by how good a match it is, and your database may not deal with fuzzy matching well.

I'm currently working on a small flat-file CMS as a personal project. It's built with PHP, but it's intended to be as simple as possible, with no database, no caching service, and certainly no search service, so it needs something small and simple, but still effective for search.

In the past I've used Lunr.js on my own site, and it works very well for this use case. However, it's problematic for this case as the index needs to be generated in Javascript on the server side, and adding Node.js to the stack for a flat-file PHP CMS is not really an option. What I needed was something where I could generate the index in any language I chose, load it via AJAX, and search it on the client side. I recently happened to stumble across [Fuse.js](https://fusejs.io/), which was pretty much exactly what I was after.

Suppose we have the following index:

```json
[  
   {  
      "title":"About me",
      "path":"about/"
   },
   {  
      "title":"Meet the team",
      "path":"about/meet-the-team/"
   },
   {  
      "title":"Alice",
      "path":"about/meet-the-team/alice/"
   },
   {  
      "title":"Bob",
      "path":"about/meet-the-team/bob/"
   },
   {  
      "title":"Chris",
      "path":"about/meet-the-team/chris/"
   },
   {  
      "title":"Home",
      "path":"index/"
   }
]
```

This index can be generated in any way you see fit. In this case, the page content is stored in Markdown files with YAML front matter, so I wrote a Symfony console command which gets all the Markdown files in the content folder, parses them to get the titles, and retrieves the path. You could also retrieve other items in front matter such as categories or tags, and the page content, and include that in the index. The data then gets converted to JSON and saved to the index file. As you can see, there's nothing special about this JSON - these two fields happen to be the ones I've chosen.

Now we can load the JSON file via AJAX, and pass it to a new Fuse instance. You can search the index using the `.search()` method, as shown below:

```javascript
import Fuse from 'fuse.js';
window.$ = window.jQuery = require('jquery');

$(document).ready(function () {
  window.$.getJSON('/storage/index.json', function (response) {
    const fuse = new Fuse(response, {
      keys: ['title'],
      shouldSort: true
    });
    $('#search').on('keyup', function () {
      let result = fuse.search($(this).val());

      // Output it
      let resultdiv = $('ul.searchresults');
      if (result.length === 0) {
        // Hide results
        resultdiv.hide();
      } else {
        // Show results
        resultdiv.empty();
        for (let item in result.slice(0,4)) {
          let searchitem = '<li><a href="' + result[item].path + '">' + result[item].title + '</a></li>';
          resultdiv.append(searchitem);
        }
        resultdiv.show();
      }
    });
  });
});
```

The really great thing about Fuse.js is that it can search just about any JSON content, making it extremely flexible. For a site with a MySQL database, you could generate the JSON from one or more tables in the database, cache it in Redis or Memcached indefinitely until such time as the content changes again, and only regenerate it then, making for an extremely efficient client-side search that doesn't need to hit the database during normal operation. Or you could generate it from static files, as in this example. It also means the backend language is not an issue, since you can easily generate the JSON file in PHP, Javascript, Python or any other language.

As you can see, it's pretty straightforward to use Fuse.js to create a working search field out of the box, but the website lists a number of options allowing you to customise the search for your particular use case, and I'd recommend looking through these if you're planning on using it on a project.
