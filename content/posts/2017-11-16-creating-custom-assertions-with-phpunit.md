---
title: "Creating custom assertions with PHPUnit"
date: 2017-11-16 15:15:50 +0000
categories:
- php
- tdd
- testing
- phpunit
comments: true
---

Today I've been working on a library I'm building for making it easier to build RESTful API's with Laravel. It uses an abstract RESTful controller, which inherits from the default Laravel controller, and I wanted to verify that the instantiated controller includes all the traits from the base controller.

However, there was a problem. The only practical way to verify that a class includes a trait is with the `class_uses()` function, but this doesn't work if the class inherits from a parent that includes these traits. As the class is abstract, it can't be instantiated directly, so you must either create a dummy class just for testing that extends it, or mock the class, and that means that `class_uses()` won't work. As a result, I needed to first get the parent class, then call `class_uses()` on that, which is possible, but a bit verbose to do repeatedly for several tests.

Fortunately it's quite easy to create your own custom assertions in PHPUnit. I started out by setting up the test with the assertion I wanted to have:

```php
<?php

namespace Tests\Unit\Http\Controllers;

use Tests\TestCase;
use Mockery as m;

class RestfulControllerTest extends TestCase
{
    public function testTraits()
    {
        $controller = m::mock('Matthewbdaly\Harmony\Http\Controllers\RestfulController')->makePartial();
        $this->assertParentHasTrait('Illuminate\Foundation\Bus\DispatchesJobs', $controller);
        $this->assertParentHasTrait('Illuminate\Foundation\Validation\ValidatesRequests', $controller);
        $this->assertParentHasTrait('Illuminate\Foundation\Auth\Access\AuthorizesRequests', $controller);
    }
}
```

Actually implementing the assertion is fairly straightforward. You simply add the assertion as a method on the base test case you're using. and accept whatever arguments are required, plus a final argument of `$message = ''`. Then you call `self::assertThat()`, as demonstrated below:

```php
    public function assertParentHasTrait($trait, $class, $message = '')
    {
        $parent = get_parent_class($class);
        $traits = class_uses($parent);
        self::assertThat(in_array($trait, $traits), self::isTrue(), $message);
    }
```

In this case we're asserting that the specified trait appears in the list of traits on the parent class. Note the use of `self::isTrue()` - this just verifies that the response is truthy.

Using this method it's quite easy to create custom assertions, which can help make your tests less verbose and easier to read.
