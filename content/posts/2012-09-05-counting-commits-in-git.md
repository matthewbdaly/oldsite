---
layout: post
title: "Counting Commits in Git"
date: 2012-09-05 00:13
comments: true
categories: 
- git
---

The other day I got to wondering about how I could quickly and easily count how many commits I was making to a specific Git repository every day.

Now, with the default log output, Git shows the date and time at the top of each entry. So in order to determine how many commits have been made to a given repository, all you need to do is determine today’s date, and see how many times that date appears in the log.

So, first task is to get the log. Then, we need to get today’s date, format it appropriately, and use grep to filter for just the lines containing that date. So, we use the date command to fetch the date, then pipe it into awk, which we use to format it the same way as Git does. We then use grep to filter out the lines that have the resulting date. Finally, we use wc to count the number of lines returned by grep.

Here’s what I came up with:

```bash
git log | grep "`date | awk '{print $1, $2, $3}'`" | wc -l
```

I’m not that great with tools like awk, so I’m quite proud of managing to do this. It’s quite handy to have around.
