---
title: "How much difference does adding an index to a database table make?"
date: 2019-03-04 21:26:18 +0000
categories:
- sql
- performance
comments: true
---

For the last few weeks, I've been kept busy at work building out a new homepage for the legacy intranet system I maintain. The new homepage is built virtually from scratch with React, and has a completely new set of queries. In addition, I've also rebuilt the UI for the navigation to use React too. This has allowed me to bypass a lot of the worst code in the whole code base with the intent to get rid of it once the new home page is live - something I'm very pleased about!

As part of this, I built some new functionality to show items added in the last seven days. This section of the home page can be sorted by several parameters, including popularity. I also added the facility to expand that to 31 days via an AJAX request. However, the AJAX request was painfully slow, often taking 20-30 seconds. Also, the home page was quite slow to load in the first place, and examining the query time in Clockwork indicated that the culprit was the query for the new items.

Further examination of the query behind the new items (both on initial page load and the 31 day AJAX request) indicated that the problem was a join. Last year, one of my first tasks had been to add the facility to record a track for any media item when it was visited. This was accomplished using a polymorphic relationship. While Zend 1 doesn't have the kind of out-of-the-box support for polymorphic relationships that Laravel has, it's possible to fake it so I created a `tracks` table whose columns included `trackable_id` for the primary key of the tracked object, `trackable_type` for its class, and `user_id` for the ID of the user who visited it. Now, I was using that same table to determine the number of times each item had been viewed by joining it on each of the media items, which was the first time it was being read for anything other than a report generated in the admin, and performance was dog slow.

Once I'd established that removing that join from the query removed the performance issue, then it became apparent I was going to need to add an index to the `tracks` table. The table had got fairly large (low hundreds of thousands), so it had a lot to sort through. As the join used the `trackable_id` field to join onto the items added, that seemed like a good candidate, so I added the index there.

The results were dramatic, to put it mildly. The initial page load time dropped from 4.44s to 1.29s - around a third of the previous amount. For the AJAX request to fetch the last 31 day's new items, the results were even more impressive - the loading time dropped from 22.44s to 1.61s. Overall, figuring out which part of the query was causing the poor performance and resolving it took about ten minutes, and resulted in a staggering improvement.

If you don't have a particularly strong theoretical background with relational databases, knowledge of indices can fall by the wayside somewhat. However, as you can see from this example, if you have a particularly slow query, then adding an index can make a staggering difference, so it's really worth taking the time to understand a bit more about indices and when they can be useful.
