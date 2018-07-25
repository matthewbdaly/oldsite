---
title: "Better strings in PHP"
date: 2018-07-25 22:25:17 +0100
categories:
- php
comments: true
---

One of the weaknesses of PHP as a programming language is the limitations of some of the fundamental types. For instance, a string in PHP is a simple value, rather than an object, and doesn't have any methods associated with it. Instead, to manipulate a string, you have to call all manner of functions. By comparison, in Python, not only can you call methods on a string, and receive a new string as the response, making them easily chainable, but you can also iterate through a string, as in this example:

```python
>>> a = 'foo'
>>> a.upper()
'FOO'
>>> a.lower()
'foo'
>>> for letter in a:
...   print(letter)
... 
f
o
o
```

A little while back, I read Adam Wathan's excellent book *Refactoring to Collections*, which describes how you can use a collection implementation (such as the one included with Laravel) to replace convoluted array manipulation with simpler, chainable calls to a collection object. Using this approach, you can turn something like this:

```php
$result = array_filter(
	array_map(function ($item) {
		return $item->get('foo');
	}, $items),
	function ($item) {
		return $item->bar == true;
});
```

Or, even worse, this:

```php
$result1 = array_map(function ($item) {
	return $item->get('foo');
}, $items);
$result2 = array_filter($result1, function ($item) {
	return $item->bar == true;
});
```

Into this:

```php
$result = Collection::make($items)
	->map(function ($item) {
		return $item->get('foo');
	})->filter(function ($item) {
		return $item->bar == true;
	})->toArray();
```

Much cleaner, more elegant, and far easier to understand.

A while back, after some frustration with PHP's native strings, I started wondering how practical it would be to produce a string implementation that was more like the string objects in languages like Python and Javascript, with inspiration from collection implementations such as that used by Laravel. I soon discovered that it was very practical, and with a bit of work it's not hard to produce your own, more elegant string class.

The most fundamental functionality required is to be able to create a string object, either by passing a string to the constructor or calling a static method. Our string class should be able to do both:

```php
<?php

class Str
{
	protected $string;

	public function __construct(string $string = '')
	{
		$this->string = $string;
	}

	public static function make(string $string)
	{
		return new static($string);
	}
}
```

Making it iterable
------------------

To be able to get the length of a string, it needs to implement the [`Countable`](http://php.net/manual/en/class.countable.php) interface:

```php
use Countable;

class Str implements Countable
{
	...
    public function count()
    {
        return strlen($this->string);
    }
}
```

To access it as an array, it needs to implement the [`ArrayAccess`](http://php.net/manual/en/class.arrayaccess.php) interface:

```php
...
use ArrayAccess;

class Str implements Countable, ArrayAccess
{
	...
    public function offsetExists($offset)
    {
        return isset($this->string[$offset]);
    }

    public function offsetGet($offset)
    {
        return isset($this->string[$offset]) ? $this->string[$offset] : null;
    }

    public function offsetSet($offset, $value)
    {
        if (is_null($offset)) {
            $this->string[] = $value;
        } else {
            $this->string[$offset] = $value;
        }
    }

    public function offsetUnset($offset)
    {
        $this->string = substr_replace($this->string, '', $offset, 1);
    }
}
```

And to make it iterable, it needs to implement the [`Iterator`](http://php.net/manual/en/class.iterator.php) interface:

```php
use Iterator;

class Str implements Countable, ArrayAccess, Iterator
{
	...
    public function current()
    {
        return $this->string[$this->position];
    }

    public function key()
    {
        return $this->position;
    }

    public function next()
    {
        ++$this->position;
    }

    public function rewind()
    {
        $this->position = 0;
    }

    public function valid()
    {
        return isset($this->string[$this->position]);
    }
}
```

Making it work as a string
--------------------------

To be useful, it also needs to be possible to actually use it as a string - for instance, you should be able to do this:

```php
$foo = Str::make('I am the very model of a modern major general');
echo $foo;
```

Fortunately, the [`__toString()`](http://php.net/manual/en/language.oop5.magic.php#object.tostring) magic method allows this:

```php
    public function __toString()
    {
        return $this->string;
    }
```

Adding methods
--------------

With that functionality in place, you can then start adding support for the methods you need in your string objects. If you're looking to be able to use the same functionality as existing PHP methods, you can call those functions inside your methods. However, be sure to return a new instance of your string object from each method - that way, you can continually chain them:

```php
    public function replace($find, $replace)
    {
        return new static(str_replace($find, $replace, $this->string));
    }

    public function toUpper()
    {
        return new static(strtoupper($this->string));
    }

    public function toLower()
    {
        return new static(strtolower($this->string));
    }

    public function trim()
    {
        return new static(trim($this->string));
    }

    public function ltrim()
    {
        return new static(ltrim($this->string));
    }

    public function rtrim()
    {
        return new static(rtrim($this->string));
    }
```

Now, you can write something like this:

```php
return Str::make('I am the very model of a modern major general  ')
	->trim()
	->replace('modern major general', 'scientist Salarian')
	->toLower();
```

While you could do this with PHP's native string functions alone, it would be a lot less elegant. In addition, if you have other, more complex string manipulations that you often do in a particular application, it may make sense to write a method for that so that your string objects can encapsulate that functionality for easier reuse.

As our string objects are iterable, we can also do this:

```php
>>> $foo = Str::make('foo');
>>> foreach ($foo as $letter) { echo "$letter\n"; }
f
o
o
```

If you have an application that does some complex string manipulation, having a string utility class like this can make for much more expressive, elegant and easy-to-comprehend code than PHP's native string functions. If you want to see a working implementation for this, check out my proof of concept collection and string utility library [Proper](https://github.com/matthewbdaly/proper).
