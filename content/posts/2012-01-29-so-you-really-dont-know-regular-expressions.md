---
date: '2012-01-29 19:52:53'
layout: post
slug: so-you-really-dont-know-regular-expressions
status: publish
title: So you REALLY don't know regular expressions?
wordpress_id: '665'
categories:
- php
- programming
comments: true
---

Ever since I started my new job, I've noticed a curious phenomenon. I work with two wonderfully gifted programmers who both know PHP much better than I do, and I learn something new from them all the time. However, neither one of them really knows or uses regular expressions.

Now, as I learned Perl before I learned PHP, naturally I learned regular expressions quite early on in that process. In Perl, regular expressions are a huge part of the language - you simply cannot get away without learning them to some extent as they are used extensively in so many parts of the language.

Apparently I'm not the only one to notice this. Here's a quote I found on Stack Exchange:


> In earlier phases of my career (ie. pre-PHP), I was a Perl guru, and one major aspect of Perl gurudom is mastery of regular expressions.

> On my current team, I'm literally the only one of us who reaches for regex before other (usually nastier) tools. Seems like to the rest of the team they're pure magic. They'll wheel over to my desk and ask for a regex that takes me literally ten seconds to put together, and then be blown away when it works. I don't know--I've worked with them so long, it's just natural at this point.

> In the absence of regex-fluency, you're left with combinations of flow-control statements wrapping strstr and strpos statements, which gets ugly and hard to run in your head. I'd much rather craft one elegant regex than thirty lines of plodding string searching.

While I would hesitate to call myself a Perl guru (at best I would call myself intermediate with Perl), I would say I know enough about regular expressions that I can generally get useful work done with them.

Take the following example in Perl (edited somewhat as it didn't play nice with TinyMCE):

```perl
$fruit = "apple,banana,cherry";
print $fruit;
@fruit = split(/,/,$fruit);
foreach(@fruit)
{
    print $_."\n";
}
apple,banana,cherry
apple
banana
cherry
```

Now, this code should be fairly easy to understand, even if you don't really know Perl. $fruit is a string containing "apple,banana,cherry". The split() function takes two arguments, a regular expression defining the character(s) that are used to separate the parts of the string you want to put into an array, and the string you want to split. This returns the array @fruit, which consists of three strings, "apple', "banana", and "cherry".

In PHP, you can do pretty much the same thing, using the explode() function:

```php
<?php
$fruit = "apple,banana,cherry";
echo $fruit."\n";
$fruitArray = explode(",",$fruit);
foreach($fruitArray as $fruitArrayItem)
{
    echo $fruitArrayItem."\n";
}
?>
apple,banana,cherry
apple
banana
cherry
```

As you can see, they work in pretty much the same way here. Both return basically the same output, and the syntax for using the appropriate functions for splitting the strings is virtually identical.

However, it's once things get a bit more difficult that it becomes obvious how much more powerful regular expressions are. Say you're dealing with a string that's similar to that above, but may use different characters to separate the elements. For instance, say you've obtained the data that you want to pass through into an array from a text file and it's somewhat inconsistent - perhaps the information you want is separated by differing amounts and types of whitespace, or different characters. The explode() function simply won't handle that (at least, not without a lot of pain). But with Perl's split() function, that's no problem. Here's how you might deal with input that had different types and quantities of whitespace as a separator:

```perl
@fruit = split(/\s+/,$fruit);
```

Yes, it's that simple! The \s metacharacter matches any type of whitespace, and the + modifier means that it will match one or more times. Now you can very easily convert the contents of that string into an array.

Or say you want to convert an entire string of text, with all kinds of punctuation and whitespace, into an array, but only keep the actual words. This wouldn't be practical with explode(), but with split() it's easy:

```perl
@fruit = split(/\W+/,$fruit);
```

The \W metacharacter matches any non-word character (ie anything other than a-z, A-Z or 0-9), and again the + modifier means that it will match one or more times.

And of course, regular expressions are useful for many more tasks than this that, while possible with most language's existing string functions, can get very nasty quite quickly. Say you want to match a UK postcode to check that it's valid (note that for the sake of simplicity, I'm going to ignore BFPO and GIR postcodes). These use a format of one or two letters, followed by one digit, then may have an additional digit or letter, then a space, then a digit, then two letters. This would be a nightmare to check using most language's native string functions, but with a regex in Perl, it's relatively simple:

```perl
my $postcode = "NR1 1NP";
if($postcode =~ m/^[a-zA-Z]{1,2}\d{1}(|[a-zA-Z0-9]{1})(|\s+)\d{1}\w{2}$/)
{
    print "It matched!\n";
}
```

And if you wanted to return the first part of the postcode if it matched as well, that's simple too:

```perl
my $postcode = "NR1 1NP";
if($postcode =~ s/^([a-zA-Z]{1,2}\d{1}(|[a-zA-Z0-9]{1}))(|\s+)\d{1}\w{2}$/$1/)
{
    print "It matched! $postcode\n";
}
```

Now, you may say "But that's in Perl! I'm using PHP!'. Well, regular expressions are an extremely powerful part of PHP that are very useful, they're just not as central to the language as they are in Perl. PHP actually has two distinct types of regular expressions - POSIX-extended regular expressions, and Perl-compatible regular expressions (or PCRE). However, POSIX-extended regular expressions were deprecated from PHP 5.3 onwards, so it's not really worth taking the time to learn them when PCRE will do exactly the same thing and is going to be around for the future. Furthermore, most other programming languages also support Perl-compatible regular expressions, so they're fairly portable between languages, and once you've learned them in one language, you can easily use them in another. In other words, if you learn how to work with regular expressions in Perl, you can very easily transfer that knowledge to most other programming languages that support regular expressions.

In the first example given above, we can replace explode() with preg_split, and the syntax is virtually identical to split() in Perl, with the only difference being the name of the function and that the pattern to match is wrapped in double quotes:

```php
<?php
$fruit = "apple,banana,cherry";
echo $fruit."\n";
$fruitArray = preg_split("/,/",$fruit);
foreach($fruitArray as $fruitArrayItem)
{
    echo $fruitArrayItem."\n";
}
?>
apple,banana,cherry
apple
banana
cherry
```

Along similar lines, if we want to check if a string matches a pattern, we can use preg_match(), and if we want to search and replace, we can use preg_replace(). PHP's regular expression support is not appreciably poorer than Perl's, even if it's less central to the language as a whole.

> But regular expressions are slower than PHP's string functions!

Yes, that's true. So it's a mistake to use regular expressions for something that can be handled quickly and easily using string functions. For instance, if in the following string you wanted to replace the word "cow" with "sheep":

> The cow jumped over the moon

You could use something like this:

```php
<?php
$text = "The cow jumped over the moon";
$text = preg_replace("/cow/","sheep",$text);
?>
```

However, because here you are only looking to match literal characters, you don't need to use a regular expression. Just use the following:

```php
<?php
$text = str_replace("cow","sheep",$text);
?>
```

But, if you have to do some more complex pattern matching, you have to start using strpos to get the location of specific characters and returning substrings between those characters, and it gets very messy, very quickly indeed. In those cases, while I haven't done any kind of benchmarking on it, it stands to reason that quite quickly you'll reach a point where a regex would be faster.

However, for a number of common tasks, such as validating email addresses and URLs, there's another way and you don't need to resort to regular expressions, or faffing about with loads of string functions. The filter_var() function can be used for validating or sanitising email addresses and URLs, among other things, so this is worth using instead of writing a regex. If you're using a framework such as CodeIgniter, you may have access to its native functions for validating this kind of thing, so you should use those instead.

> But regular expressions are ugly and make for less readable code!

Not really. They seem intimidating to the newcomer, and very few people can just glance at a regex and instantly know what it does. But with regexes, you can often do complex things in far fewer lines of code than would be needed to accomplish the same thing using just PHP's string functions. If you can do something in a line or two using string functions, it's probably best to do that. But after that, things go downhill very quickly.

Once you learn them, regular expressions really are not that hard, and you'll probably find enough things to use them for that you'll get plenty of practice at them. They're certainly more readable to anyone with even a modicum of experience using them than line after line of flow-control statements.

> But you shouldn't be using regular expressions for parsing HTML or XML!

Quite true. Regular expressions are the wrong tool for that. You should probably use an existing library of some kind for that.

> Some people, when confronted with a problem, think "I know, I'll use regular expressions." Now they have two problems.

Ah, yes, surely one of the most misused quotes on the web! Again, regular expressions are not the right tool for every job, and there's a lot of tasks they get used for, and quite frankly, shouldn't be. Most of us who know regular expressions have been known to use them for things we probably shouldn't (I actually only just stumbled across filter_var, so I've done my share of validating email addresses using regexes, and I'm as guilty as anyone else of overusing them). But there's still plenty of stuff you should use it for when what you need to do can't be accomplished quickly and easily using string functions.

Regular expressions are not inherently evil. They're a tool like any other. What is bad is using them for things where a simple alternative exists. However, they are still extremely useful, and there's plenty of valid use cases for them.
