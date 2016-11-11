---
layout: post
title: "Changing date format from DD/MM/YYYY to YYYY-MM-DD in Vim"
date: 2014-09-28 19:53:34 +0100
comments: true
categories: 
- vim
- regex
---

Recently I had the occasion to reformat a load of dates in Vim from `DD/MM/YYYY` to `YYYY-MM-DD`. In Vim, this is quite simple:

```viml
:%s/\(\d\{2}\)\/\(\d\{2}\)\/\(\d\{4}\)/\3-\2-\1/g
```

This should be easy to adapt to reformatting other date formats.
