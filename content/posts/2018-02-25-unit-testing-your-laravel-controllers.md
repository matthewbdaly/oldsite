---
title: "Unit testing your Laravel controllers"
date: 2018-02-25 15:50:44 +0000
categories:
- php
- laravel
- tdd
comments: true
---

In [my previous post](/blog/2018/02/18/put-your-laravel-controllers-on-a-diet/) I mentioned some strategies for refactoring Laravel controllers to move unnecessary functionality elsewhere. However, I didn't cover testing them. In this post I will demonstrate the methodology I use for testing Laravel controllers.

Say we have the following method in a controller:

```php
public function store(Request $request)
{    
        $document = new Document($request->only([
            'title', 
            'text', 
        ]));
        $document->save();

        event(new DocumentCreated($document));

        return redirect()->route('/');
}
```

This controller method does three things:

* Return a response
* Create a model instance
* Fire an event

Our tests therefore need to pass it all its external dependencies and check it carries out the required actions.

First we fake the event facade:

```php
    Event::fake();
```

Next, we create an instance of `Illuminate\Http\Request` to represent the HTTP request passed to the controller:

```php
    $request = Request::create('/store', 'POST',[
        'title' 	=> 	'foo',
        'text' 	=> 	'bar',
    ]);
```

If you're using a custom form request class, you should instantiate that in exactly the same way.

Then, instantiate the controller, and call the method, passing it the request object:

```php
    $controller = new MyController();
    $response = $controller->store($request);
```

You can then test the response from the controller. You can test the status code like this:

```php
    $this->assertEquals(302, $response->getStatusCode());
```

You may also need to check the content of the response matches what you expect to see, by retrieving `$response->getBody()->getContent()`.

Next, retrieve the newly created model instance, and verify it exists:

```php
    $document = Document::where('title', 'foo')->first();
    $this->assertNotNull($document);
```

You can also use `assertEquals()` to check the attributes on the model if appropriate. Finally, you check the event was fired:

```php
    Event::assertDispatched(DocumentCreated::class, function ($event) use ($document) { 
        return $event->document->id === $document->id; 
    });
```

This test should not concern itself with any functionality triggered by the event, only that the event gets triggered. The event should have separate unit tests in which the event is triggered, and then the test verifies it carried out the required actions.

Technically, these don't quite qualify as being unit tests because they hit the database, but they should cover the controller adequately. To make them true unit tests, you'd need to implement the repository pattern for the database queries rather than using Eloquent directly, and mock the repository, so you can assert that the mocked repository receive the right data and have it return the expected response.

Here is how you might do that with Mockery:

```php
$mock = Mockery::mock('App\Contracts\Repositories\Document');
$mock->shouldReceive('create')->with([
	'title'	=>		'foo',
	'text'	=>		'bar',
])->once()->andReturn(true);
$controller = new MyController($mock);
```

As long as your controllers are kept as small as possible, it's generally not too hard to test them. Unfortunately, fat controllers become almost impossible to test, which is another good reason to avoid them.
