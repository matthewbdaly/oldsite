---
title: "Creating your own dependency injection container in PHP"
date: 2019-02-02 21:45:52 +0100
categories:
- php
comments: true
---

Dependency injection can be a difficult concept to understand in the early stages. Even when you're using it all the time, it can often seem like magic. However, it's really not all that complicated once you actually get into the nuts and bolts of it, and building your own container is a good way to learn more about how it works and how to use it.

In this tutorial, I'll walk you through creating a simple, minimal dependency injection container, using PHPSpec as part of a TDD workflow. While the end result isn't necessarily something I'd be happy using in a production environment, it's sufficient to understand the basic concept and make it feel less like a black box. Our container will be called Ernie (if you want to know why, it's a reference to a 90's era video game that had a character based on Eric Cantona called Ernie Container).

The first thing we need to do is set up our dependencies. Our container will implement PSR-11, so we need to include the interface that defines that. We'll also use PHP CodeSniffer to ensure code quality, and PHPSpec for testing. Your `composer.json` should look something like this:

```json
{
    "name": "matthewbdaly/ernie",
    "description": "Simple DI container",
    "type": "library",
    "require-dev": {
        "squizlabs/php_codesniffer": "^3.3",
        "phpspec/phpspec": "^5.0",
        "psr/container": "^1.0"
    },
    "license": "MIT",
    "authors": [
        {
            "name": "Matthew Daly",
            "email": "450801+matthewbdaly@users.noreply.github.com"
        }
    ],
    "require": {},
    "autoload": {
        "psr-4": {
            "Matthewbdaly\\Ernie\\": "src/"
        }
    }
}
```

We also need to put this in our `phpspec.yml` file:

```yml
suites:
    test_suite:
        namespace: Matthewbdaly\Ernie
        psr4_prefix: Matthewbdaly\Ernie
```

With that done, we can start working on our implementation.

Creating the exceptions
=======================

The PSR-11 specification defines two interfaces for exceptions, which we will implement before actually moving on to the container itself. The first of these is `Psr\Container\ContainerExceptionInterface`. Run the following command to create a basic spec for the exception:

```bash
$ vendor/bin/phpspec desc Matthewbdaly/Ernie/Exceptions/ContainerException
```

The generated specification for it at `spec/Exceptions/ContainerExceptionSpec.php` will look something like this:

```php
<?php

namespace spec\Matthewbdaly\Ernie;

use Matthewbdaly\Ernie\ContainerException;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;

class ContainerExceptionSpec extends ObjectBehavior
{
    function it_is_initializable()
    {
        $this->shouldHaveType(ContainerException::class);
    }
}
```

This is not sufficient for our needs. Our exception must also implement two interfaces:

* `Throwable`
* `Psr\Container\ContainerExceptionInterface`

The former can be resolved by inheriting from `Exception`, while the latter doesn't require any additional methods. Let's expand our spec to check for these:

```php
<?php

namespace spec\Matthewbdaly\Ernie\Exceptions;

use Matthewbdaly\Ernie\Exceptions\ContainerException;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;

class ContainerExceptionSpec extends ObjectBehavior
{
    function it_is_initializable()
    {
        $this->shouldHaveType(ContainerException::class);
    }

    function it_implements_interface()
    {
        $this->shouldImplement('Psr\Container\ContainerExceptionInterface');
    }

    function it_implements_throwable()
    {
        $this->shouldImplement('Throwable');
    }
}
```

Now run the spec and PHPSpec will generate the boilerplate exception for you:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/Ernie/Exceptions/ContainerException                                
  11  - it is initializable
      class Matthewbdaly\Ernie\Exceptions\ContainerException does not exist.

Matthewbdaly/Ernie/Exceptions/ContainerException                                  
  16  - it implements interface
      class Matthewbdaly\Ernie\Exceptions\ContainerException does not exist.

Matthewbdaly/Ernie/Exceptions/ContainerException                                
  21  - it implements throwable
      class Matthewbdaly\Ernie\Exceptions\ContainerException does not exist.

                                      100%                                       3
1 specs
3 examples (3 broken)
23ms

                                                                                
  Do you want me to create `Matthewbdaly\Ernie\Exceptions\ContainerException`   
  for you?                                                                      
                                                                         [Y/n]
y
Class Matthewbdaly\Ernie\Exceptions\ContainerException created in /home/matthew/Projects/ernie-clone/src/Exceptions/ContainerException.php.

Matthewbdaly/Ernie/Exceptions/ContainerException                                
  16  - it implements interface
      expected an instance of Psr\Container\ContainerExceptionInterface, but got
      [obj:Matthewbdaly\Ernie\Exceptions\ContainerException].

Matthewbdaly/Ernie/Exceptions/ContainerException                                
  21  - it implements throwable
      expected an instance of Throwable, but got
      [obj:Matthewbdaly\Ernie\Exceptions\ContainerException].

            33%                                     66%                          3
1 specs
3 examples (1 passed, 2 failed)
36ms
```

It's failing, but we expect that. We need to update our exception to extend the base PHP exception, and implement `Psr\Container\ContainerExceptionInterface`. Let's do that now:

```php
<?php

namespace Matthewbdaly\Ernie\Exceptions;

use Psr\Container\ContainerExceptionInterface;
use Exception;

class ContainerException extends Exception implements ContainerExceptionInterface
{
}
```

Let's re-run the spec:

```bash
$ vendor/bin/phpspec run
                                      100%                                       3
1 specs
3 examples (3 passed)
24ms
```

The second exception we need to implement is `Psr\Container\NotFoundExceptionInterface` and it's a similar story. Run the following command to create the spec:

```bash
$ vendor/bin/phpspec desc Matthewbdaly/Ernie/Exceptions/NotFoundException
```

Again, the spec needs to be amended to verify that it's a throwable and implements the required interface:

```php
<?php

namespace spec\Matthewbdaly\Ernie\Exceptions;

use Matthewbdaly\Ernie\Exceptions\NotFoundException;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;

class NotFoundExceptionSpec extends ObjectBehavior
{
    function it_is_initializable()
    {
        $this->shouldHaveType(NotFoundException::class);
    }

    function it_implements_interface()
    {
        $this->shouldImplement('Psr\Container\NotFoundExceptionInterface');
    }

    function it_implements_throwable()
    {
        $this->shouldImplement('Throwable');
    }
}
```

For the sake of brevity I've left out the output, but if you run `vendor/bin/phpspec run` you'll see it fail due to the fact that the generated class doesn't implement the required interfaces. Amend `src/Exceptions/NotFoundException` as follows:

```php
<?php

namespace Matthewbdaly\Ernie\Exceptions;

use Psr\Container\NotFoundExceptionInterface;
use Exception;

class NotFoundException extends Exception implements NotFoundExceptionInterface
{
}
```

Running `vendor/bin/phpspec run` should now see it pass. Now let's move on to the container class...

Building the container
======================

Run the following command to create the container spec:

```bash
$ vendor/bin/phpspec desc Matthewbdaly/Ernie/Container
```

However, the default generated spec isn't sufficient. We need to check it implements the required interface:

```php
<?php

namespace spec\Matthewbdaly\Ernie;

use Matthewbdaly\Ernie\Container;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;

class ContainerSpec extends ObjectBehavior
{
    function it_is_initializable()
    {
        $this->shouldHaveType(Container::class);
    }

    function it_implements_interface()
    {
        $this->shouldImplement('Psr\Container\ContainerInterface');
    }
}
```

Now, if we run PHPSpec, we'll generate our class:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/Ernie/Container                                                    
  11  - it is initializable
      class Matthewbdaly\Ernie\Container does not exist.

Matthewbdaly/Ernie/Container                                                      
  16  - it implements interface
      class Matthewbdaly\Ernie\Container does not exist.

                            75%                                     25%          8
3 specs
8 examples (6 passed, 2 broken)
404ms

                                                                                
  Do you want me to create `Matthewbdaly\Ernie\Container` for you?              
                                                                         [Y/n] 
y
Class Matthewbdaly\Ernie\Container created in /home/matthew/Projects/ernie-clone/src/Container.php.

Matthewbdaly/Ernie/Container                                                      
  16  - it implements interface
      expected an instance of Psr\Container\ContainerInterface, but got
      [obj:Matthewbdaly\Ernie\Container].

                                 87%                                     12%     8
3 specs
8 examples (7 passed, 1 failed)
40ms
```

Now, as we can see, this class doesn't implement the interface. Let's remedy that:

```php
<?php

namespace Matthewbdaly\Ernie;

use Psr\Container\ContainerInterface;

class Container implements ContainerInterface
{
}
```

Now, if we run the tests, they should fail because the class needs to add the required methods:

```bash
$ vendor/bin/phpspec run
✘ Fatal error happened while executing the following 
    it is initializable 
    Class Matthewbdaly\Ernie\Container contains 2 abstract methods and must therefore be declared abstract or implement the remaining methods (Psr\Container\ContainerInterface::get, Psr\Container\ContainerInterface::has) in /home/matthew/Projects/ernie-clone/src/Container.php on line 7 
```

If you use an editor or IDE that allows you to implement an interface automatically, you can run it to add the required methods. I use PHPActor with Neovim, and used the option in the Transform menu to implement the contract:

```php
<?php

namespace Matthewbdaly\Ernie;

use Psr\Container\ContainerInterface;

class Container implements ContainerInterface
{
    /**
     * {@inheritDoc}
     */
    public function get($id)
    {
    }

    /**
     * {@inheritDoc}
     */
    public function has($id)
    {
    }
}
```

Running `vendor/bin/phpspec run` should now make the spec pass, but the methods don't actually do anything yet. If you read the spec for PSR-11, you'll see that `has()` returns a boolean to indicate whether a class can be instantiated or not, while `get()` will either return an instance of the specified class, or throw an exception. We will add specs that check that built-in classes can be returned by both, and unknown classes display the expected behaviour. We'll do both at once, because in both cases, the functionality to actually resolve the required class will be deferred to a single resolver method, and these methods will not do all that much as a result:

```php
    function it_has_simple_classes()
    {
        $this->has('DateTime')->shouldReturn(true);
    }

    function it_does_not_have_unknown_classes()
    {
        $this->has('UnknownClass')->shouldReturn(false);
    }

    function it_can_get_simple_classes()
    {
        $this->get('DateTime')->shouldReturnAnInstanceOf('DateTime');
    }

    function it_returns_not_found_exception_if_class_cannot_be_found()
    {
        $this->shouldThrow('Matthewbdaly\Ernie\Exceptions\NotFoundException')
            ->duringGet('UnknownClass');
    }
```

These tests verify that:

* `has()` returns `true` when called with the always-present `DateTime` class
* `has()` returns `false` for the undefined `UnknownClass`
* `get()` successfully instantiates an instance of `DateTime`
* `get()` throws an exception if you try to instantiate the undefined `UnknownClass`

Running the specs will raise errors:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/Ernie/Container                                                      
  21  - it has simple classes
      expected true, but got null.

Matthewbdaly/Ernie/Container                                                    
  26  - it does not have unknown classes
      expected false, but got null.

Matthewbdaly/Ernie/Container                                                    
  31  - it can get simple classes
      expected an instance of DateTime, but got null.

Matthewbdaly/Ernie/Container                                                    
  36  - it returns not found exception if class cannot be found
      expected to get exception / throwable, none got.

                         66%                                     33%             12
3 specs
12 examples (8 passed, 4 failed)
98ms
```

Let's populate these empty methods:

```php
<?php

namespace Matthewbdaly\Ernie;

use Psr\Container\ContainerInterface;
use Matthewbdaly\Ernie\Exceptions\NotFoundException;
use ReflectionClass;
use ReflectionException;

class Container implements ContainerInterface
{
    /**
     * {@inheritDoc}
     */
    public function get($id)
    {
        $item = $this->resolve($id);
        return $this->getInstance($item);
    }

    /**
     * {@inheritDoc}
     */
    public function has($id)
    {
        try {
            $item = $this->resolve($id);
        } catch (NotFoundException $e) {
            return false;
        }
        return $item->isInstantiable();
    }

    private function resolve($id)
    {
        try {
            return (new ReflectionClass($id));
        } catch (ReflectionException $e) {
            throw new NotFoundException($e->getMessage(), $e->getCode(), $e);
        }
    }

    private function getInstance(ReflectionClass $item)
    {
        return $item->newInstance();
    }
}
```

As you can see, both the `has()` and `get()` methods need to resolve a string ID to an actual class, so that common functionality is stored in a private method called `resolve()`. This uses the [PHP Reflection API](http://php.net/manual/en/book.reflection.php) to resolve the class name to an actual class. We pass the string ID into a constructor of `ReflectionClass`, and the `resolve()` method will either return the created instance of `ReflectionClass`, or throw an exception.

For the uninitiated, `ReflectionClass` allows you to reflect on the object whose fully qualified class name is passed to the constructor, in order to interact with that class programmatically. The methods we will use include:

* `isInstantiable` - confirms whether or not the class can be instantiated (for instance, traits and abstract classes can't)
* `newInstance` - creates a new instance of the item in question, as long as it has no dependencies in the constructor
* `newInstanceArgs` - creates a new instance, using the arguments passed in
* `getConstructor` - allows you to get information about the constructor

The Reflection API is pretty comprehensive, and I would recommend reading the documentation linked to above if you want to know more.

For the `has()` method, we check that the resolved class is instantiable, and return the result of that. For the `get()` method, we use `getInstance()` to instantiate the item and return that, throwing an exception if that fails.

Registering objects
===================

In its current state, the container doesn't allow you to set an item. To be useful, we need to be able to specify that an interface or string should be resolved to a given class, or for cases where we need to pass in scalar parameters, such as a database object, to specify how a concrete instance of that class should be instantiated. To that end, we'll create a new `set()` public method that will allow a dependency to be set. Here are the revised specs including this:

```php
<?php

namespace spec\Matthewbdaly\Ernie;

use Matthewbdaly\Ernie\Container;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;
use DateTime;

class ContainerSpec extends ObjectBehavior
{
    function it_is_initializable()
    {
        $this->shouldHaveType(Container::class);
    }

    function it_implements_interface()
    {
        $this->shouldImplement('Psr\Container\ContainerInterface');
    }

    function it_has_simple_classes()
    {
        $this->has('DateTime')->shouldReturn(true);
    }

    function it_does_not_have_unknown_classes()
    {
        $this->has('UnknownClass')->shouldReturn(false);
    }

    function it_can_get_simple_classes()
    {
        $this->get('DateTime')->shouldReturnAnInstanceOf('DateTime');
    }

    function it_returns_not_found_exception_if_class_cannot_be_found()
    {
        $this->shouldThrow('Matthewbdaly\Ernie\Exceptions\NotFoundException')
            ->duringGet('UnknownClass');
    }

    function it_can_register_dependencies()
    {
        $toResolve = new class {
        };
        $this->set('Foo\Bar', $toResolve)->shouldReturn($this);
    }

    function it_can_resolve_registered_dependencies()
    {
        $toResolve = new class {
        };
        $this->set('Foo\Bar', $toResolve);
        $this->get('Foo\Bar')->shouldReturnAnInstanceOf($toResolve);
    }
    
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
    
    function it_can_resolve_registered_callable()
    {
        $toResolve = function () {
            return new DateTime;
        };
        $this->set('Foo\Bar', $toResolve);
        $this->get('Foo\Bar')->shouldReturnAnInstanceOf('DateTime');
    }

    function it_can_resolve_if_registered_dependencies_instantiable()
    {
        $toResolve = new class {
        };
        $this->set('Foo\Bar', $toResolve);
        $this->has('Foo\Bar')->shouldReturn(true);
    }
}
```

This needs to handle quite a few scenarios, so there are several tests we have in place. These verify that:

* The `set()` method returns an instance of the container class, to allow for method chaining
* When a dependency is set, calling `get()` returns an instance of that class
* When a concrete class that has the `__invoke()` magic method set is passed to `set()`, it is invoked and the response returned.
* When the value passed through is a callback, the callback is resolved and the response returned
* When a dependency is set, calling `has()` for it returns the right value

Note that we use anonymous classes for testing - I've written about these before and they're very useful in this context because they allow us to create a simple class inline for testing purposes.

Running the specs should result in us being prompted to generate the `set()` method, and failing afterwards:

```bash
$ vendor/bin/phpspec run
Matthewbdaly/Ernie/Container                                                    
  42  - it can register dependencies
      method Matthewbdaly\Ernie\Container::set not found.

Matthewbdaly/Ernie/Container                                                    
  49  - it can resolve registered dependencies
      method Matthewbdaly\Ernie\Container::set not found.

Matthewbdaly/Ernie/Container                                                    
  57  - it can resolve registered invokable
      method Matthewbdaly\Ernie\Container::set not found.

Matthewbdaly/Ernie/Container                                                    
  68  - it can resolve registered callable
      method Matthewbdaly\Ernie\Container::set not found.

Matthewbdaly/Ernie/Container                                                    
  77  - it can resolve if registered dependencies instantiable
      method Matthewbdaly\Ernie\Container::set not found.

                          70%                                     29%            17
3 specs
17 examples (12 passed, 5 broken)
316ms
                                                                                
  Do you want me to create `Matthewbdaly\Ernie\Container::set()` for you?       
                                                                         [Y/n]
y
  Method Matthewbdaly\Ernie\Container::set() has been created.

Matthewbdaly/Ernie/Container                                                    
  42  - it can register dependencies
      expected [obj:Matthewbdaly\Ernie\Container], but got null.

Matthewbdaly/Ernie/Container                                                    
  49  - it can resolve registered dependencies
      exception [exc:Matthewbdaly\Ernie\Exceptions\NotFoundException("Class Foo\Bar does not exist")] has been thrown.

Matthewbdaly/Ernie/Container                                                    
  57  - it can resolve registered invokable
      exception [exc:Matthewbdaly\Ernie\Exceptions\NotFoundException("Class Foo\Bar does not exist")] has been thrown.

Matthewbdaly/Ernie/Container                                                    
  68  - it can resolve registered callable
      exception [exc:Matthewbdaly\Ernie\Exceptions\NotFoundException("Class Foo\Bar does not exist")] has been thrown.

Matthewbdaly/Ernie/Container                                                    
  77  - it can resolve if registered dependencies instantiable
      expected true, but got false.

                          70%                              11%        17%        17
3 specs
17 examples (12 passed, 2 failed, 3 broken)
90ms
```

First, we need to set up the `set()` method properly, and define a property to contain the stored services:

```php
    private $services = [];

    public function set(string $key, $value)
    {
        $this->services[$key] = $value;
        return $this;
    }
```

This fixes the first spec, but the resolver needs to be amended to handle cases where the ID is set manually:

```php
    private function resolve($id)
    {
        try {
            $name = $id;
            if (isset($this->services[$id])) {
                $name = $this->services[$id];
                if (is_callable($name)) {
                    return $name();
                }
            }
            return (new ReflectionClass($name));
        } catch (ReflectionException $e) {
            throw new NotFoundException($e->getMessage(), $e->getCode(), $e);
        }
    }
```

This will allow us to resolve classes set with `set()`. However, we also want to resolve any callables, such as callbacks or classes that implement the `__invoke()` magic method, which means that sometimes `resolve()` will return the result of the callable instead of an instance of `ReflectionClass`. Under those circumstances we should return the item directly:

```php
    public function get($id)
    {
        $item = $this->resolve($id);
        if (!($item instanceof ReflectionClass)) {
            return $item;
        }
        return $this->getInstance($item);
    }
```

Note that because the `__invoke()` method is automatically called in any concrete class specified in the second argument to `set()`, it's only possible to resolve classes that define an `__invoke()` method if they are passed in as string representations. The following PsySh session should make it clear what this means:

```php
>>> use Matthewbdaly\Ernie\Container;
>>> $c = new Container;
=> Matthewbdaly\Ernie\Container {#2307}
>>> class TestClass { public function __invoke() { return "Called"; }}
>>> $c->get('TestClass');
=> TestClass {#2319}
>>> $c->set('Foo\Bar', 'TestClass');
=> Matthewbdaly\Ernie\Container {#2307}
>>> $c->get('Foo\Bar');
=> TestClass {#2309}
>>> $c->set('Foo\Bar', new TestClass);
=> Matthewbdaly\Ernie\Container {#2307}
>>> $c->get('Foo\Bar');
=> "Called"
```

As you can see, if we pass in the fully qualified class name of a class that defines an `__invoke()` method, it can be resolved as expected. However, if we pass a concrete instance of it to `set()`, it will be called and will return the response from that. This may not be the behaviour you want for your own container.

According to [this issue on the PHP League's Container implementation](https://github.com/thephpleague/container/issues/113), it was also an issue for them, so seeing as this is just a toy example I'm not going to lose any sleep over it. Just something to be aware of if you use this post as the basis for writing your own container.

Resolving dependencies
======================

One thing is missing from our container. Right now it should be able to instantiate pretty much any class that has no dependencies, but these are quite firmly in the minority. To be useful, a container should be able to resolve all of the dependencies for a class automatically.

Let's add a spec for that:

```php
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
```

Here we have to be a bit crafty. Anonymous classes are defined and instantiated at the same time, so we can't pass it in as an anonymous class in the test. Instead, we call the anonymous class and get its name, then set that as the second argument to `set()`. Then we can verify that the returned object is an instance of the same class.

Running this throws an error:

```php
$ vendor/bin/phpspec run
Matthewbdaly/Ernie/Container                                                    
  86  - it can resolve dependencies
      exception [err:ArgumentCountError("Too few arguments to function class@anonymous::__construct(), 0 passed and exactly 1 expected")] has been thrown.

                                    94%                                          18
3 specs
18 examples (17 passed, 1 broken)
60ms
```

This is expected. Our test class accepts an instance of `DateTime` in the constructor as a mandatory dependency, so instantiating it fails. We need to update the `getInstance()` method so that it can handle pulling in any dependencies:

```php
    private function getInstance(ReflectionClass $item)
    {
        $constructor = $item->getConstructor();
        if (is_null($constructor) || $constructor->getNumberOfRequiredParameters() == 0) {
            return $item->newInstance();
        }
        $params = [];
        foreach ($constructor->getParameters() as $param) {
            if ($type = $param->getType()) {
                $params[] = $this->get($type->getName());
            }
        }
        return $item->newInstanceArgs($params);
    }
```

Here, we use the Reflection API to get the constructor. If there's no constructor, or it has no required parameters, we just return a new instance of the reflected class as before.

Otherwise, we loop through the required parameters. For each parameter, we get the string representation of the type specified for that parameter, and retrieve an instance of it from the container. Afterwards, we use those parameters to instantiate the object.

Let's run the specs again:

```bash
$ vendor/bin/phpspec run
                                      100%                                       18
3 specs
18 examples (18 passed)
51ms
```

Our container is now complete. We can:

* Resolve simple classes out of the box
* Set arbitrary keys to resolve to particular classes, or the result of callables, so as to enable mapping interfaces to concrete implementations, or resolve classes that require specific non-object parameters, such as PDO
* Resolve complex classes with multiple dependencies

Not too bad for just over 100 lines of PHP...

Final thoughts
==============

As I've said, this is a pretty minimal example of a dependency injection container, and I wouldn't advise using this in production when there are so many existing, mature solutions available. I have no idea how the performance would stack up against existing solutions, or whether there are any issues with it, and quite frankly that's besides the point - this is intended as a learning exercise to understand how dependency injection containers in general work, not as an actual useful piece of code for production. If you want an off-the-shelf container, I'd point you in the direction of `league/container`, which has served me well.

You can find the code for this tutorial on [GitHub](https://github.com/matthewbdaly/ernie), so if you have any problems, you should take a look there to see where the problem lies. Of course, if you go on to create your own kick-ass container based on this, do let me know!
