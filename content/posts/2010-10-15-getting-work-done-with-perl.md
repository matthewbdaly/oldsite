---
date: '2010-10-15 20:39:10'
layout: post
slug: getting-work-done-with-perl
status: publish
title: Getting work done with Perl
wordpress_id: '545'
categories:
- perl
- python
comments: true
---

After my initial struggles with Perl, I now think I'm really starting to get to grips with the language. I generally find it a pain when you have to learn by building small but basically useless scripts - I always do best when building something useful.

As one of the exercises for my studies I had to open a database connection to a Microsoft Access database, but I wanted to do the exercise in Ubuntu (I've always preferred using Unix-like operating systems for programming, and thanks to apt-get it's a lot less grief installing additional libraries and modules as you need them) and couldn't get Perl to connect to the database properly, so I resolved to export it to either MySQL or SQLite.

I was able to export it to MySQL in the end using mdbtools, but I wasn't entirely happy with the end result. I resorted to re-exporting the data as a CSV file, then resolved to write a small Perl script to read the file, parse it using a regular expression to obtain the necessary information, then insert it into a new SQLite database.

Here's what I came up with:

```perl
#!/usr/bin/perl -w

use strict;
use DBI;

my $db = "dbi:SQLite:backend.db";

if (!(-e "backend.db"))
{
   print "Database does not exist. Creating it...";

   # Create the database
   my $dbh = DBI->connect($db) or die "Error in connecting to database! $DBI::errstr";
   my $createdb = $dbh->do("CREATE TABLE CARS( ID INTEGER PRIMARY KEY, YEAR INTEGER, MAKE VARCHAR(30), MODEL VARCHAR(30), COLOR VARCHAR(30), PRICE INTEGER);");
   $dbh->disconnect();
}

open(READFILE, "cartable.csv");

while()
{
   unless($_ =~ m/id,/)
   {
      m/\d+\,(\d{4})\,\"(\w+)\"\,\"(\w+)\"\,\"(\w+)\"\,\"(\d+)\"/;
      my $year = $1;
      my $make = $2;
      my $model = $3;
      my $color = $4;
      my $price = $5;

      my $dbh2 = DBI->connect($db) or die "Error in connecting to database! $DBI::errstr";
      my $insertdb = $dbh2->do("INSERT INTO CARS (YEAR, MAKE, MODEL, COLOR, PRICE) VALUES (\"$year\", \"$make\", \"$model\", \"$color\", \"$price\");");
      $dbh2->disconnect;
   }
}
close(READFILE);

print "Write completed!\n";
print "To demonstrate it works, we'll run a SELECT query against the database...\n";

# Read the database
my $readdb = DBI->connect($db);
my $dbselect = $readdb->prepare("SELECT * FROM CARS;");
$dbselect->execute;

# Print the results
print "ID\tYear\tMake\tModel\tColor\tPrice\n";
while(my @row = $dbselect->fetchrow_array)
{
   print "$row[0]\t$row[1]\t$row[2]\t$row[3]\t$row[4]\t$row[5]\n";
}

# Close the connection
$readdb->disconnect;
```

Apologies for the fact that the indentation doesn't seem to have copied across from Vim very well (can anyone recommend a good WordPress plugin for displaying code, none of the ones I've tried seem to be any good?). It works well, and it's also helped me grasp Perl's database API better.

I think I've got a better idea now of what Python and Perl are best at and when to use each. Perl is a great language, but the fact that a lot of it is implicit makes it a little harder to pick up at first than Python - for instance, the default variable, which is quite a good idea, but takes a little getting used to. Its regex support is great, and I like the database API, but I would find it a lot harder to do any object-oriented programming in Perl than in Python (which I guess is why [Moose](http://www.iinteractive.com/moose/) exists). I've found Perl very useful for quick and dirty scripts and as a glue language, but for longer scripts Python seems the better choice.
