---
date: '2010-05-03 18:23:39'
layout: post
title: "PassCrunch"
categories:
- javascript
comments: true
---

As an exercise to teach myself the basics of regular expressions in JavaScript I decided to implement a small function I called passCrunch to check how secure a password is. I implemented it based on the following principles:



	
  * First of all, check for a list of well-known easy to break passwords to foil a dictionary attack, and reject it if it's there.

	
  * Then check that it's at least 8 characters, and reject it if it's not.

	
  * Then implement a counter to measure how secure it is by various checks.

	
  * Then add to the rating if it's more than 12 characters.

	
  * Add to the rating if it contains lowercase letters.

	
  * Add to the rating if it contains uppercase letters.

	
  * Add to the rating if it contains numbers.

	
  * Add to the rating if it contains non-alphanumeric characters.

	
  * Finally, convert the result to a percentage score and return it as an integer.


The finished article's available [here](http://dl.dropbox.com/u/5031/passcrunch.zip) as a .zip file if you'd like to use it, or just take a look at the code. Be warned, it's quite long due to the fact that the list of insecure passwords I used had in excess of 3,000 entries in it! It includes a very simple HTML form which will allow you to submit a function and will return a score for it via an alert() dialogue. Feel free to use it if you wish!
