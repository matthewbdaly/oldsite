---
title: "Mutation testing with Infection"
date: 2018-09-13 20:10:09 +0100
categories:
- php
- testing
comments: true
---

Writing automated tests is an excellent way of catching bugs during development and maintenace of your application, not to mention the other benefits. However, it's hard to gauge the quality of your tests, particularly when you first start out. Coverage will give you a good idea of what code was actually run during the test, but it won't tell you if the test itself actually tests anything worthwhile.

[Infection](https://infection.github.io/) is a mutation testing framework. The documentation defines mutation testing as follows:

> Mutation testing involves modifying a program in small ways. Each mutated version is called a Mutant. To assess the quality of a given test set, these mutants are executed against the input test set to see if the seeded faults can be detected. If mutated program produces failing tests, this is called a killed mutant. If tests are green with mutated code, then we have an escaped mutant.

Infection works by running the test suite, carrying out a series of mutations on the source code in order to try to break the tests, and then collecting the results. The actual mutations carried out are not random - there is a set of mutations that get carried out every time, so results should be consistent. Ideally, all mutants should be killed by your tests - escaped mutants can indicate that either the line of mutated code is not tested, or the tests for that line are not very useful.

I decided to add mutation testing to my [Laravel shopping cart package](https://github.com/matthewbdaly/laravel-cart). In order to use Infection, you need to be able to generate code coverage, which means having either XDebug or phpdbg installed. Once Infection is installed (refer to the documentation for this), you can run this command in the project directory to configure it:

```bash
$ infection
```

Infection defaults to using PHPUnit for the tests, but it also supports PHPSpec. If you're using PHPSpec, you will need to specify the testing framework like this:

```bash
$ infection --test-framework=phpspec
```

Since PHPSpec doesn't support code coverage out of the box, you'll need to install a package for that - I used `leanphp/phpspec-code-coverage`.

On first run, you'll be prompted to create a configuration file. Your source directory should be straightforward to set up, but at the next step, if your project uses interfaces in the source directory, you should exclude them. The rest of the defaults should be fine.

I found that the first run gave a large number of uncovered results, but the second and later ones were more consistent - not sure if it's an issue with my setup or not. Running it gave me this:

```bash
$ infection
You are running Infection with xdebug enabled.
    ____      ____          __  _
   /  _/___  / __/__  _____/ /_(_)___  ____ 
   / // __ \/ /_/ _ \/ ___/ __/ / __ \/ __ \
 _/ // / / / __/  __/ /__/ /_/ / /_/ / / / /
/___/_/ /_/_/  \___/\___/\__/_/\____/_/ /_/
 
    0 [>---------------------------] < 1 secRunning initial test suite...

PHPUnit version: 6.5.13

   27 [============================] 3 secs

Generate mutants...

Processing source code files: 5/5
Creating mutated files and processes: 43/43
.: killed, M: escaped, S: uncovered, E: fatal error, T: timed out

...................MMM...M.......M.........          (43 / 43)

43 mutations were generated:
      38 mutants were killed
       0 mutants were not covered by tests
       5 covered mutants were not detected
       0 errors were encountered
       0 time outs were encountered

Metrics:
         Mutation Score Indicator (MSI): 88%
         Mutation Code Coverage: 100%
         Covered Code MSI: 88%

Please note that some mutants will inevitably be harmless (i.e. false positives).

Time: 21s. Memory: 12.00MB
```

Our test run shows 5 escaped mutants, and the remaining 38 were killed. We can view the results by looking at the generated `infection-log.txt`:

```txt
Escaped mutants:
================


1) /home/matthew/Projects/laravel-cart/src/Services/Cart.php:132    [M] DecrementInteger

--- Original
+++ New
@@ @@
     {
         $content = Collection::make($this->all())->map(function ($item) use($rowId) {
             if ($item['row_id'] == $rowId) {
-                if ($item['qty'] > 0) {
+                if ($item['qty'] > -1) {
                     $item['qty'] -= 1;
                 }
             }


2) /home/matthew/Projects/laravel-cart/src/Services/Cart.php:132    [M] OneZeroInteger

--- Original
+++ New
@@ @@
     {
         $content = Collection::make($this->all())->map(function ($item) use($rowId) {
             if ($item['row_id'] == $rowId) {
-                if ($item['qty'] > 0) {
+                if ($item['qty'] > 1) {
                     $item['qty'] -= 1;
                 }
             }


3) /home/matthew/Projects/laravel-cart/src/Services/Cart.php:132    [M] GreaterThan

--- Original
+++ New
@@ @@
     {
         $content = Collection::make($this->all())->map(function ($item) use($rowId) {
             if ($item['row_id'] == $rowId) {
-                if ($item['qty'] > 0) {
+                if ($item['qty'] >= 0) {
                     $item['qty'] -= 1;
                 }
             }


4) /home/matthew/Projects/laravel-cart/src/Services/Cart.php:133    [M] Assignment

--- Original
+++ New
@@ @@
         $content = Collection::make($this->all())->map(function ($item) use($rowId) {
             if ($item['row_id'] == $rowId) {
                 if ($item['qty'] > 0) {
-                    $item['qty'] -= 1;
+                    $item['qty'] = 1;
                 }
             }
             return $item;


5) /home/matthew/Projects/laravel-cart/src/Services/Cart.php:197    [M] OneZeroInteger

--- Original
+++ New
@@ @@
      */
     private function hasStringKeys(array $items)
     {
-        return count(array_filter(array_keys($items), 'is_string')) > 0;
+        return count(array_filter(array_keys($items), 'is_string')) > 1;
     }
     /**
      * Validate input

Timed Out mutants:
==================

Not Covered mutants:
====================
```

This displays the mutants that escaped, and include a diff of the changed code, so we can see that all of these involve changing the comparison operators.

The last one can be resolved easily because the comparison is superfluous - the result of `count()` can be evaluated as true or false by itself, so removing the `> 0` at the end in the test solves the problem quite neatly.

The other four mutations are somewhat harder. They all amend the `decrement` method's conditions, showing that a single assertion doesn't really fully check the behaviour. Here's the current test for that method:

```php
<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use Matthewbdaly\LaravelCart\Services\Cart;
use Mockery as m;

class CartTest extends TestCase
{
    /**
     * @dataProvider arrayProvider
     */
    public function testCanDecrementQuantity($data)
    {
        $data[0]['row_id'] = 'my_row_id_1';
        $data[1]['row_id'] = 'my_row_id_2';
        $newdata = $data;
        $newdata[1]['qty'] = 1;
        $session = m::mock('Illuminate\Contracts\Session\Session');
        $session->shouldReceive('get')->with('Matthewbdaly\LaravelCart\Services\Cart')->once()->andReturn($data);
        $session->shouldReceive('put')->with('Matthewbdaly\LaravelCart\Services\Cart', $newdata)->once();
        $uniqid = m::mock('Matthewbdaly\LaravelCart\Contracts\Services\UniqueId');
        $cart = new Cart($session, $uniqid);
        $this->assertEquals(null, $cart->decrement('my_row_id_2'));
    }
}
```

It should be possible to decrement it if the quantity is more than zero, but not to go any lower. However, our current test does not catch anything but decrementing it from 2 to 1, which doesn't fully demonstrate this. We therefore need to add a few more assertions to cover taking it down to zero, and then trying to decrement it again. Here's how we might do that.

```php
<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use Matthewbdaly\LaravelCart\Services\Cart;
use Mockery as m;

class CartTest extends TestCase
{
    /**
     * @dataProvider arrayProvider
     */
    public function testCanDecrementQuantity($data)
    {
        $data[0]['row_id'] = 'my_row_id_1';
        $data[1]['row_id'] = 'my_row_id_2';
        $newdata = $data;
        $newdata[1]['qty'] = 1;
        $session = m::mock('Illuminate\Contracts\Session\Session');
        $session->shouldReceive('get')->with('Matthewbdaly\LaravelCart\Services\Cart')->once()->andReturn($data);
        $session->shouldReceive('put')->with('Matthewbdaly\LaravelCart\Services\Cart', $newdata)->once();
        $uniqid = m::mock('Matthewbdaly\LaravelCart\Contracts\Services\UniqueId');
        $cart = new Cart($session, $uniqid);
        $this->assertEquals(null, $cart->decrement('my_row_id_2'));
        $newerdata = $newdata;
        $newerdata[1]['qty'] = 0;
        $session->shouldReceive('get')->with('Matthewbdaly\LaravelCart\Services\Cart')->once()->andReturn($newdata);
        $session->shouldReceive('put')->with('Matthewbdaly\LaravelCart\Services\Cart', $newerdata)->once();
        $this->assertEquals(null, $cart->decrement('my_row_id_2'));
        $session->shouldReceive('get')->with('Matthewbdaly\LaravelCart\Services\Cart')->once()->andReturn($newerdata);
        $session->shouldReceive('put')->with('Matthewbdaly\LaravelCart\Services\Cart', $newerdata)->once();
        $this->assertEquals(null, $cart->decrement('my_row_id_2'));
    }
}
```

If we re-run Infection, we now get a much better result:

```bash
$ infection
You are running Infection with xdebug enabled.
    ____      ____          __  _
   /  _/___  / __/__  _____/ /_(_)___  ____ 
   / // __ \/ /_/ _ \/ ___/ __/ / __ \/ __ \
 _/ // / / / __/  __/ /__/ /_/ / /_/ / / / /
/___/_/ /_/_/  \___/\___/\__/_/\____/_/ /_/
 
Running initial test suite...

PHPUnit version: 6.5.13

   22 [============================] 3 secs

Generate mutants...

Processing source code files: 5/5
Creating mutated files and processes: 41/41
.: killed, M: escaped, S: uncovered, E: fatal error, T: timed out

.........................................            (41 / 41)

41 mutations were generated:
      41 mutants were killed
       0 mutants were not covered by tests
       0 covered mutants were not detected
       0 errors were encountered
       0 time outs were encountered

Metrics:
         Mutation Score Indicator (MSI): 100%
         Mutation Code Coverage: 100%
         Covered Code MSI: 100%

Please note that some mutants will inevitably be harmless (i.e. false positives).

Time: 19s. Memory: 12.00MB
```

Code coverage only tells you what lines of code are actually executed - it doesn't tell you much about how effectively that line of code is tested. Infection gives you a different insight into the quality of your tests, helping to write better ones. I've so far found it very useful for getting feedback on the quality of my tests. It's interesting that PHPSpec tests seem to have a consistently lower proportion of escaped mutants than PHPUnit ones - perhaps the more natural workflow when writing specs with PHPSpec makes it easier to write good tests.
