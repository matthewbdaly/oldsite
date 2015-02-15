---
date: '2010-10-27 00:15:33'
layout: post
slug: a-couple-of-things-i-love-about-perl
status: publish
title: A couple of things I love about Perl
wordpress_id: '574'
categories:
- perl
---

In the time that I've been learning Perl, I've slowly grown to appreciate the strengths of the language more and more. There's two things in particular that I like about Perl. Once that I really don't think anyone is going to be surprised by is CPAN. It's a fantastic resource - there are a huge quantity of Perl modules available for virtually any task under the sun, and they're incredibly useful.

The other is just how good the documentation is - I've never considered myself to be someone who learns terribly well from Unix man pages, but perldoc seems to have very good documentation indeed, including that for CPAN modules. Also, it helps that if you don't do well with the man page format, you have the option of running podwebserver and getting the documentation formatted as web pages.

To give an example, I'm particularly interested in all kinds of network programming, be it web development, IRC, Jabber or whatever, and I'd heard of the Net::IRC module so I decided to start using it to create a simple IRC bot (yes, I know I should really be using POE::Component::IRC instead!). Using the information gleaned from perldoc Net::IRC it was easy to get started writing a bot, and I've now come up with the following simple bot:

```perl
#!/usr/bin/perl -w

use strict;
use Net::IRC;

my $irc = new Net::IRC;
my $nick = "mattsbot";
my $server = "irc.freenode.net";
my $channel = "#botpark";
my $port = 6667;
my $ircname = "My wonderful bot";
my $owner = "mattbd"; 

sub on_connect
{
   my $self = shift;

   print "Joining $channel\n";
   $self->join($channel);
   $self->privmsg($channel,"Ready to go!");
}

sub on_disconnect
{
	my $self = shift;
	$self->join($channel);
	$self->privmsg($channel, "Sorry about that - dropped out for a sec.");
} 

sub on_join
{
	# Get the connection and event objects
	my ($conn, $event) = @_;

	# Get the nick that just joined
	my $newnick = $event->{nick};

	# Greet the new nick
	$conn->privmsg($channel, "Hello, $newnick! I'm a greeting bot!");
}

sub on_msg
{
	# Get the connection and event objects
	my ($conn, $event) = @_;

	# Get nick of messaging user
	my $messager = $event->{nick};

	# Respond negatively
	$conn->privmsg($messager, "Sorry, I'm just a bot. Please don't message me!");
}

sub on_public
{
	# Get the connection and event objects
	my ($conn, $event) = @_;

	# Get nick of messaging user
	my $messager = $event->{nick};

	# Get text of message
	my $text = $event->{args}[0];

	# Check to see if text contains name of bot - if so message the user negatively
	if($text =~ m/$nick/)
	{
		$conn->privmsg($channel, "Sorry, $messager,I'm just a simple bot!");
	}
}

my $conn = $irc->newconn(Nick =>$nick,Server=>$server,Port=>$port,Ircname=>$ircname);
$conn->add_global_handler('376', \&on;_connect);
$conn->add_global_handler('disconnect', \&on;_disconnect);
$conn->add_global_handler('msg', \&on;_msg);
$conn->add_global_handler('join', \&on;_join);
$conn->add_global_handler('msg', \&on;_msg);
$conn->add_global_handler('public', \&on;_public);
$irc->start();
```

Now, this bot isn't exactly hugely capable - all it does is greet new joiners, and tell you to leave it alone if you try to talk to it, but it was pretty easy to code it, thanks to the documentation, and it's a good base to build on. From here, it's easy to extend the on_public and on_msg subroutines to deal with other messages - for instance, I could use a regular expression to look for "!respond" in the text of the message and if it's found, respond with any appropriate text.

I've hard-coded the appropriate details into the script in this case to make it quicker and easier to test it, but it would be trivial to change it to either accept settings passed as arguments from the command line, or have it grab these from a separate text file.

My initial doubts about Perl are really wearing off. It's a powerful language and one that, now I've picked up the basic syntax, I'm having little trouble getting work done with. 
