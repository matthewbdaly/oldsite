---
title: "Simplify your tests with anonymous classes"
date: 2018-10-20 14:48:05 +0100
categories:
- php
comments: true
---

Anonymous classes were added in PHP7, but so far I haven't made all that much use of them. However, recently I've been working on building a simple dependency injection container for learning purposes. This uses the PHP Reflection API to determine how to resolve dependencies. For instance, if it's asked for a class for which one of the dependencies required by the constructor is an instance of the `DateTime` class, it should create an instance, and then pass it into the constructor automatically when instantiating the class. Then it should return the newly created class.

Mocking isn't really a suitable approach for this use case because the container needs to return a concrete class instance to do its job properly. You could just create a series of fixture classes purely for testing purposes, but that would mean either defining more than one class in a file (violating PSR-2), or defining a load of fixture classes in separate files, meaning you'd have to write a lot of boilerplate, and you'd have to move between several different files to understand what's going on in the test.

Anonymous classes allow you a means to write simple classes for tests inline, as in this example for retrieving a very basic class. The tests use PHPSpec:

```php7
<?php

namespace spec\Vendor\Package;

use Vendor\Package\MyClass;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;
use DateTime;

class MyClassSpec extends ObjectBehavior
{
    function it_can_resolve_registered_dependencies()
    {
        $toResolve = new class {
        };
        $this->set('Foo\Bar', $toResolve);
        $this->get('Foo\Bar')->shouldReturnAnInstanceOf($toResolve);
    }
}
```
    
You can also define your own methods inline. Here we implement the `invoke()` magic method so that the class is a callable:

```php7
<?php

class MyClassSpec extends ObjectBehavior
{
    function it_can_resolve_registered_invokable()
    {
        $toResolve = new class {
            public function __invoke() {
                return new DateTime;
            }
        };
        $this->set('Foo\Bar', $toResolve);
        $this->get('Foo\Bar')->shouldReturnAnInstanceOf('DateTime');
    }
}
```
    
You can also define a constructor. Here, we're getting the class name of a newly created anonymous class that accepts an instance of `DateTime` as an argument to the constructor. Then, we can resolve a new instance out of the container:

```php7
<?php

class MyClassSpec extends ObjectBehavior
{
    function it_can_resolve_dependencies()
    {
        $toResolve = get_class(new class(new DateTime) {
            public $datetime;
            public function __construct(DateTime $datetime)
            {
                $this->datetime = $datetime;
            }
        });
        $this->set('Foo\Bar', $toResolve);
        $this->get('Foo\Bar')->shouldReturnAnInstanceOf($toResolve);
    }
}
```

For classes that will extend an existing class or implement an interface, you can define those inline too. Or you can include a trait:

```php7
<?php

class MyClassSpec extends ObjectBehavior
{
    function it_can_resolve_dependencies()
    {
        $toResolve = get_class(new class(new DateTime) extends Foo implements Bar {
            public $datetime;
            public function __construct(DateTime $datetime)
            {
                $this->datetime = $datetime;
            }

            use MyTrait;
        });
        $this->set('Foo\Bar', $toResolve);
        $this->get('Foo\Bar')->shouldReturnAnInstanceOf($toResolve);
    }
}
```

In cases where the functionality is contained in a trait or abstract class, and you might need to add little or no additional functionality, this is a lot less verbose than creating a class the conventional way.

None of this is stuff you can't do without anonymous classes, but by defining these sort of disposable fixture classes inline in your tests, you're writing the minimum amount of code necessary to implement your test, and it's logical to define it inline since it's only ever used in the tests. One thing to bear in mind is that anonymous classes are created and instantiated at the same time, so you can't easily create a class and then instantiate an instance of it separately. However, you can instantiate one, then use the `get_class()` function to get its class name and use that to resolve it, which worked well for my use case.

Another use case for anonymous classes is testing traits or abstract classes. I generally use Mockery as my mocking solution with PHPUnit tests, but I've sometimes missed the `getMockForTrait()` method from PHPUnit. However, another option is to instantiate an anonymous class that includes that trait for testing purposes:

```php7
<?php

$item = new class() {
    use MyTrait;
};
```

This way, your test class is as minimal as possible, and you can test the trait/abstract class in a fairly isolated fashion.
