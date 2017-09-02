---
title: "Making internal requests with Laravel"
date: 2017-09-02 14:45:27 +0100
categories:
- php
- laravel
comments: true
---

Recently I've been working on a Phonegap app that needs to work offline. The nature of relational databases can often make this tricky if you're dealing with related objects and you're trying to retrofit it to something that wasn't built with this use case in mind.

Originally my plan was to push each request that would have been made to a queue in WebSQL, and then on reconnect, make every request individually. It quickly became apparent, however, that this approach had a few problems:

* If one request failed, the remaining requests had to be stopped from executing
* It didn't allow for storing the failed transactions in a way that made them easy to retrieve

Instead, I decided to create a single `sync` endpoint for the API that would accept an object containing all the requests that would be made, and then step through each one. If it failed, it would get the failed request and all subsequent ones in the object, and store them in the database. That way, even if the data didn't sync correctly, it wasn't lost, and if necessary it could be resolved manually.

Since the necessary API endpoints already existed, and were thoroughly tested, it was not a good idea to start duplicating that functionality. Instead, I implemented the functionality to carry out internal requests, and I thought I'd share how you can do this.

For any service you may build for your Laravel applications, it's a good idea to create an interface for it first:

```php
<?php

namespace App\Contracts;

interface MakesInternalRequests
{
    /**
     * Make an internal request
     *
     * @param string $action   The HTTP verb to use.
     * @param string $resource The API resource to look up.
     * @param array  $data     The request body.
     * @return \Illuminate\Http\Response
     */
    public function request(string $action, string $resource, array $data = []);
}
```

That way you can resolve the service using dependency injection, making it trivial to replace it with a mock when testing.

Now, actually making an internal request is pretty easy. You get the app instance (you can do so by resolving it using dependency injection as I do below, or call the `app()` helper. Then you put together the request you want to make and pass it as an argument to the app's `handle()` method:

```php
<?php

namespace App\Services;

use Illuminate\Http\Request;
use App\Contracts\MakesInternalRequests;
use Illuminate\Foundation\Application;
use App\Exceptions\FailedInternalRequestException;

/**
 * Internal request service
 */
class InternalRequest implements MakesInternalRequests
{
    /**
     * The app instance
     *
     * @var $app
     */
    protected $app;

    /**
     * Constructor
     *
     * @param Application $app        The app instance.
     * @return void
     */
    public function __construct(Application $app)
    {
        $this->app = $app;
    }

    /**
     * Make an internal request
     *
     * @param string $action   The HTTP verb to use.
     * @param string $resource The API resource to look up.
     * @param array  $data     The request body.
     * @throws FailedInternalRequestException Request could not be synced.
     * @return \Illuminate\Http\Response
     */
    public function request(string $action, string $resource, array $data = [])
    {
        // Create request
        $request = Request::create('/api/' . $resource, $action, $data, [], [], [
            'HTTP_Accept'             => 'application/json',
        ]);

        // Get response
        $response = $this->app->handle($request);
        if ($response->getStatusCode() >= 400) {
            throw new FailedInternalRequestException($request, $response);
        }

        // Dispatch the request
        return $response;
    }
}
```

Also note that I've created a custom exception, called `FailedInternalRequestException`. This is fired if the status code returned from the internal requests is greater than or equal to 400 (thus denoting an error):

```php
<?php

namespace App\Exceptions;

use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Exception for when a bulk sync job fails
 */
class FailedInternalRequestException extends \Exception
{
    /**
     * Request instance
     *
     * @var $request
     */
    protected $request;

    /**
     * Response instance
     *
     * @var $response
     */
    protected $response;

    /**
     * Constructor
     *
     * @param Request  $request  The request object.
     * @param Response $response The response object.
     * @return void
     */
    public function __construct(Request $request, Response $response)
    {
        parent::__construct();
        $this->request = $request;
        $this->response = $response;
    }

    /**
     * Get request object
     *
     * @return Request
     */
    public function getRequest()
    {
        return $this->request;
    }

    /**
     * Get response object
     *
     * @return Response
     */
    public function getResponse()
    {
        return $this->response;
    }
}
```

You can catch this exception in an appropriate place and handle it as you wish. Now, if you import the internal request class as `$dispatcher`, you can just call `$dispatcher->request($action, $resource, $data)`, where `$action` is the HTTP verb, `$resource` is the API resource to send to, and `$data` is the data to send.

It's actually quite rare to have to do this. In this case, because this was a REST API and every request made to it was changing the state of the application (there were no GET requests, only POST, PUT, PATCH and DELETE), it made sense to just break down the request body and do internal requests against the existing API, since otherwise I'd have to duplicate the existing functionality. I would not recommend this approach for something like fetching data to render a page on the server side, as there are more efficient ways of accomplishing it. In all honesty I can't think of any other scenario where this would genuinely be the best option. However, it worked well for my use case and allowed me to implement this functionality quickly and simply.
