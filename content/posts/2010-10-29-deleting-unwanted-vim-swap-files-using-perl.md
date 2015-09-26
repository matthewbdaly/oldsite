---
date: '2010-10-29 20:49:49'
layout: post
slug: deleting-unwanted-vim-swap-files-using-perl
status: publish
title: Deleting unwanted Vim swap files using Perl
wordpress_id: '585'
categories:
- perl
comments: true
---

Yesterday I realised that I had somehow managed to scatter Vim swap files all across the Dropbox folder I use to share Perl and Python scripts I'd written between several computers, and it would be a good idea to clear them up. I didn't like the idea of using grep to search for them and manually deleting them, so I decided this was the ideal opportunity to write a Perl script to do it for me!

I came up with the following:

```perl
#!/usr/bin/perl -w

use strict;
use Cwd;

sub searchDir
{
    # Subroutine to scan a directory looking for Vim swap files
    # Get directory to read and current directory
    my $readdir = shift;
    my $startdir = cwd();

    # Change directory to the target one
    chdir($readdir) or die "Unable to open $readdir! $!\n";
    print "Scanning contents of directory $startdir\n";

    # Open the directory and grab the names of all the files and folders in it
    opendir(DIR, ".") or die "Unable to open current directory! $!\n";
    my @entries = readdir(DIR) or die "Unable to read directory! $!\n";
    closedir(DIR);

    # Loop through the files and folders in the directory
    foreach my $entry (@entries)
    {
        # Skip this one and the one above it in the filesystem hierarchy
        next if($entry eq ".");
        next if($entry eq "..");

        # If a file is a directory, call the searchDir subroutine recursively in order to scan it
        if(-d $entry)
        {
            searchDir($entry);
            next;
        }

        # Use a regular expression to check to see if the current file starts with a period, and ends with .swp - if it does, it's a Vim swap file
        if($entry =~ m/^\..*\.swp$/)
        {
            # Inform the user that a Vim swap file has been found and print out the path to it
            print "Found a Vim swap file!\n";
            my $swppath = cwd();
            print "It's the file $entry in $swppath.\n";
            my $fullpath = $swppath . "/" . $entry;
            print "The full path is $fullpath.\n";

            # Prompt the user to delete the file
            print "Do you wish to delete this file? (Y/N)\t";
            chomp(my $reply = );
            if($reply =~ m/y/i)
            {
                print "Deleting $fullpath...\n";
                unlink($fullpath);
            }
        }
    }

    chdir($startdir);
}

# Get directory to begin the search
print "Enter directory to start search: ";
chomp(my $beginSearch = );

# call searchDir to start the search
searchDir($beginSearch);
```

Thankfully, I've now discovered the [Preserve Code Formatting plugin](https://wordpress.org/extend/plugins/preserve-code-formatting/) for WordPress, which seems to do a good job at making the code look presentable!

This isn't perfect - it uses recursion to examine subdirectories, and when I ran it on my /home folder it somehow wound up in /sys on my Ubuntu machine and I ended up getting a deep recursion warning (a little research suggests this happens when it goes over 100 directories in). However, it seems to work fine for scanning individual folders in my /home directory, and that's all I really wanted anyway.

I love how Perl makes writing this kind of simple script so easy. It's a great language for that kind of systems administration task.
