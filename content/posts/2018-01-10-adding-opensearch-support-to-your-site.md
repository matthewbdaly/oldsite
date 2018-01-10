---
title: "Adding OpenSearch support to your site"
date: 2018-01-10 22:07:27 +0000
categories:
- search
comments: true
---

For the uninitiated, OpenSearch is the technology that lets you enter a site's URL, and then press Tab to start searching on that site - you can see it in action on this site. It's really useful, and quite easy to implement if you know how.

OpenSearch relies on having a particular XML file available. Here's the `opensearch.xml` file for this site:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns:moz="http://www.mozilla.org/2006/browser/search/"
   xmlns="http://a9.com/-/spec/opensearch/1.1/">
   <ShortName>matthewdaly.co.uk</ShortName>
   <Description>Search matthewdaly.co.uk</Description>
   <InputEncoding>UTF-8</InputEncoding>
   <Url method="get" type="text/html"
      template="http://www.google.com/search?q={searchTerms}&amp;sitesearch=matthewdaly.co.uk"/>
</OpenSearchDescription>
```

In this case, as this site uses a static site generator I can't really do the search on the site, so it's handed off to a Google site-specific search, but the principle is the same. The three relevant fields are as follows:

* `ShortName` - The short name of the site (this should usually just be the domain name)
* `Description` - A human-readable description such as `Search mysite.com`
* `Url` - Specifies the HTTP method that should be used to search (`GET` or `POST`), and a template for the URL. The search is automatically inserted where `{searchTerms}` appears

A more typical example of the `Url` field might be as follows:

```xml
   <Url method="get" type="text/html"
      template="http://www.example.com/search?q={searchTerms}"/>
```

Normally you will be pointing the template to your site's own search page. Note that OpenSearch doesn't actually do any searching itself - it just tells your browser where to send your search request.

With that file saved as `opensearch.xml`, all you have to do is add it to the `<head>` in your HTML:

```html
<link href="/opensearch.xml" rel="search" title="Search title" type="application/opensearchdescription+xml">
```

And that should be all you need to do to get OpenSearch working.

For Laravel sites, I've recently created a [package for implementing Opensearch](https://github.com/matthewbdaly/laravel-opensearch) that should help as well. With that you need only install the package, and set the fields in the config to point at your existing search page, in order to get OpenSearch working.
