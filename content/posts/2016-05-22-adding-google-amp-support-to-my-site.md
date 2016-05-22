---
title: "Adding Google AMP support to my site"
date: 2016-05-22 23:29:34 +0100
categories:
- html
- amp
comments: true
---

You may have heard of Google's [AMP Project](https://www.ampproject.org/), which allows you to create mobile-optimized pages using a subset of HTML. After seeing the sheer speed at which you can load an AMP page (practically instantaneous in many cases), I was eager to see if I could apply it to my own site.

I still wanted to retain the existing functionality for my site, such as comments and search, so I elected not to rewrite the whole thing to make it AMP-compliant. Instead, I opted to create AMP versions of every blog post, and link to them from the original. This preserves the advantages of AMP since search engines will be able to discover it from the header of the original, while allowing those wanting a richer experience to view the original, where the comments are hosted. You can now view the AMP version of any post by appending `amp/` to its URL.

The biggest problem was the images in the post body, as the `<img>` tag needs to be replaced by the `<amp-img>` tag, which also requires an explicit height and width. I wound up amending the renderer for AMP pages to render an image tag as an empty string, since I have only ever used one image in the post body and I think I can live without them.

It's also a bit of a pain styling it as it will be awkward to use Bootstrap. I've therefore opted to skip Bootstrap for now and write my own fairly basic theme for the AMP pages instead.

It'll be interesting to see what effect having the AMP versions of the pages available will have on my site in terms of search results. It obviously takes some time before the page gets crawled, and until then the AMP version won't be served from the CDN used by AMP, so I really can't guess what effect it will have right now.
