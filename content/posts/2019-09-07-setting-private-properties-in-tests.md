---
title: "Setting private properties in tests"
date: 2019-09-07 20:16:47 +0100
categories:
- php
- tdd
comments: true
---

Sometimes when writing a test, you come across a situation where you need to set a private field that's not accessible through any existing route. For instance, I've been working with Doctrine a bit lately, and since the ID on an entity is generated automatically, it should not be possible to change it via a setter, but at the same time, we sometimes have the need to set it in a test.

Fortunately, there is a way to do that. Using PHP's reflection API, you can temporarily mark a property on an object as accessible, so as to be able to set it without either passing it to the constructor or creating a setter method that will only ever be used by the test. We first create a `ReflectionClass` instance from the object, then get the property. We mark it as accessible, and then set the value on the instance, as shown below:

```php
<?php declare(strict_types = 1);

namespace Tests\Unit;

use Tests\TestCase;
use Project\Document;
use ReflectionClass;

final class DocumentTest extends TestCase
{
    public function testGetId()
    {
        $doc = new Document();
        $reflect = new ReflectionClass($doc);
        $id = $reflect->getProperty('id');
        $id->setAccessible(true);
        $id->setValue($doc, 1);
        $this->assertEquals(1, $doc->getId());
    }
}
```

If you're likely to need this in more than one place, you may want to pull this functionality out into a trait for reuse:

```php
<?php declare(strict_types = 1);

namespace Tests\Traits;

use ReflectionClass;

trait SetsPrivateProperties
{
    /**
     * Sets a private property
     *
     * @param mixed $object
     * @param string $property
     * @param mixed $value
     * @return void
     */
    public function setPrivateProperty($object, string $property, $value)
    {
        $reflect = new ReflectionClass($object);
        $prop = $reflect->getProperty($property);
        $prop->setAccessible(true);
        $prop->setValue($object, $value);
        $prop->setAccessible(false);
    }
}
```

Then your test can be simplified as follows:

```php
<?php declare(strict_types = 1);

namespace Tests\Unit;

use Tests\TestCase;
use Project\Document;
use Tests\Traits\SetsPrivateProperties;

final class DocumentTest extends TestCase
{
    use SetsPrivateProperties;

    public function testGetId()
    {
        $doc = new Document();
        $this->setPrivateProperty($doc, 'id', 1);
        $this->assertEquals(1, $doc->getId());
    }
}
```

While this is a slightly contrived and limited example, and this situation is quite rare, I've found it to be a useful technique under certain circumstances.
