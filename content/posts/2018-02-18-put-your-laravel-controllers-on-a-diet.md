---
title: "Put your Laravel controllers on a diet"
date: 2018-02-18 18:10:10 +0000
categories:
- php
- laravel
comments: true
---

MVC frameworks are a tremendously useful tool for modern web development. They offer easy ways to carry out common tasks, and enforce a certain amount of structure on a project.

However, that doesn't mean using them makes you immune to bad practices, and it's quite easy to wind up falling into certain anti-patterns. Probably the most common is the Fat Controller.

What is a fat controller?
-------------------------

When I first started out doing professional web development, CodeIgniter 2 was the first MVC framework I used. While I hadn't used it before, I was familiar with the general concept of MVC. However, I didn't appreciate that when referring to the model layer as a place for business logic, that wasn't necessarily the same thing as the database models.

As such, my controllers became a dumping ground for anything that didn't fit into the models. If it didn't interact with the database, I put it in the controller. They quickly became bloated, with many methods running to hundreds of lines of code. The code base became hard to understand, and when I was under the gun on projects I found myself copying and pasting functionality between controllers, making the situation even worse. Not having an experienced senior developer on hand to offer criticism and advice, it was a long time before I realised that this was a problem or how to avoid it.

Why are fat controllers bad?
----------------------------

Controllers are meant to be simple glue code that receives requests and returns responses. Anything else should be handed off to the model layer. As noted above, however, that's not the same as putting it in the models. Your model layer can consist of many different classes, not just your Eloquent models, and you should not fall into the trap of thinking your application should consist of little more than models, views and controllers.

Placing business logic in controllers can be bad for many reasons:

* Code in controllers can be difficult to write automated tests for
* Any logic in a controller method may need to be repeated elsewhere if the same functionality is needed for a different route, unless it's in a private or protected method that is called from elsewhere, in which case it's very hard to test in isolation
* Placing it in the controller makes it difficult to pull out and re-use on a different project
* Making your controller methods too large makes them complex and hard to follow

As a general rule of thumb, I find that 10 lines of code for any one method for a controller is where it starts getting a bit much. That said, it's not a hard and fast rule, and for very small projects it may not be worthwhile. But if a project is large and needs to be maintained for any reasonable period of time, you should take the trouble to ensure your controllers are as skinny as is practical.

Nowadays Laravel is my go-to framework and I've put together a number of strategies for avoiding the fat controller anti-pattern. Here's some examples of how I would move various parts of the application out of my controllers.

Validation
----------

Laravel has a nice, easy way of getting validation out of the controllers. Just create a custom [form request](https://laravel.com/docs/5.6/validation#form-request-validation) for your input data, as in this example:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'email' => 'required|email'
        ];
    }
}
```

Then type-hint the form request in the controller method, instead of `Illuminate\Http\Request`:

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateRequest;

class HomeController extends Controller
{
    public function store(CreateRequest $request)
    {
		// Process request here..
    }
}
```

Database access and caching
---------------------------

For non-trivial applications I normally use [decorated repositories](/blog/2017/03/01/decorating-laravel-repositories/) to handle caching and database access in one place. That way my caching and database layers are abstracted out into separate classes, and caching is nearly always handled seamlessly without having to do much work.

Complex object creation logic
-----------------------------

If I have a form or API endpoint that needs to:

* Create more than one object
* Transform the incoming data in some way
* Or is non-trivial in any other way

I will typically pull it out into a separate persister class. First, you should create an interface for this persister class:

```php
<?php

namespace App\Contracts\Persisters;

use Illuminate\Database\Eloquent\Model;

interface Foo
{
    /**
     * Create a new Model
     *
     * @param array $data
     * @return Model
     */
    protected function create(array $data);

    /**
     * Update the given Model
     *
     * @param array $data
     * @param Model $model
     * @return Model
     */
    protected function update(array $data, Model $model);
}
```

Then create the persister class itself:

```php
<?php

namespace App\Persisters;

use Illuminate\Database\Eloquent\Model;
use App\Contracts\Repositories\Foo as Repository;
use App\Contracts\Persisters\Foo as FooContract;
use Illuminate\Database\DatabaseManager;
use Carbon\Carbon;

class Foo implements FooContract
{
    protected $repository;

    protected $db;

    public function __construct(DatabaseManager $db, Repository $repository)
    {
        $this->db = $db;
        $this->repository = $repository;
    }

    /**
     * Create a new Model
     *
     * @param array $data
     * @return Model
     */
    protected function create(array $data)
    {
        $this->db->beginTransaction();
        $model = $this->repository->create([
			 'date' => Carbon::parse($data['date'])->toDayDateTimeString(),
        ]);
        $this->db->commit();
        return $model;
    }

    /**
     * Update the given Model
     *
     * @param array $data
     * @param Model $model
     * @return Model
     */
    protected function update(array $data, Model $model)
    {
        $this->db->beginTransaction();
        $updatedmodel = $this->repository->update([
			 'date' => Carbon::parse($data['date'])->toDayDateTimeString(),
			 $model
        ]);
        $this->db->commit();
        return $updatedmodel;
    }
}
```

Then you can set up the persister in a service provider so that type-hinting the interface returns the persister:

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        //
    }

    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
       $this->app->bind(
			'App\Contracts\Persisters\Foo',
			'App\Persisters\Foo',
       });
    }
}
```

This approach means that complex logic, such as creating multiple related objects, can be handled in a consistent way, even if it needs to be called from multiple places.

Triggering actions as a result of something
-------------------------------------------

[Events](https://laravel.com/docs/5.6/events) are tailor-made for this use case, and Laravel documents them very well, so I won't repeat it here. Suffice to say, if something needs to happen, but the response sent by the application doesn't necessarily depend on it returning something immediately, then it's probably worth considering making it an event. If it's going to be called from multiple places, it's even more worthwhile.

For instance, if you have a contact form, it's worth taking the time to create an event for when a new contact is received, and handle proessing the contact within the listener for that event. Also, doing so means you can queue that event and have it handled outside the context of the application, so that it responds to the user more quickly. If you're sending an acknowledgement email for a new user registration, you don't need to wait for that email to be sent before you return the response, so queueing it can improve response times.

Interacting with third-party services
-------------------------------------

If you have some code that needs to interact with a third-party service or API, it can get quite complex, especially if you need to process the content in some way. It therefore makes sense to pull that functionality out into a separate class.

For instance, say you have some code in your controller that uses an HTTP client to fetch some data from a third-party API and display it in the view:

```php
public function index(Request $request)
{
   $data = $this->client->get('http://api.com/api/items');
   $items = [];
   foreach ($data as $k => $v) {
		 $item = [
           'name' => $v['name'],
			  'description' => $v['data']['description'],
			  'tags' => $v['data']['metadata']['tags']
		 ];
		 $items[] = $item;
   }
   return view('template', [
       'items' => $items
   ]);
}
```

This is a very small example (and a lot simpler than most real-world instances of this issue), but it illustrates the principle. Not only does this code bloat the controller, it might also be used elsewhere in the application, and we don't want to copy and paste it elsewhere - therefore it makes sense to extract it to a service class.

```php
<?php

namespace App\Services

use GuzzleHttp\ClientInterface as GuzzleClient;

class Api
{
   protected $client;

   public function __construct(GuzzleClient $client)
   {
      $this->client = $client;
   }

	public function fetch()
	{
      $data = $this->client->get('http://api.com/api/items');
      $items = [];
      foreach ($data as $k => $v) {
			$item = [
           'name' => $v['name'],
			  'description' => $v['data']['description'],
			  'tags' => $v['data']['metadata']['tags']
		 	];
		 	$items[] = $item;
      }
      return $items;
	}
}
```

Our controller can then type-hint the service and refactor that functionality out of the method:

```php
public function __construct(App\Services\Api $api)
{
    $this->api = $api;
}
public function index(Request $request)
{
   $items = $this->api->fetch();
   return view('template', [
       'items' => $items
   ]);
}
```

Including common variables in the view
------------------------------------------

If data is needed in more than one view (eg show the user's name on every page when logged in), consider using [view composers](https://laravel.com/docs/5.6/views#view-composers) to retrieve this data rather than fetching them in the controller. That way you're not having to repeat that logic in more than one place.

Formatting content for display
------------------------------

Logically this belongs in the view layer, so you should [write a helper](/blog/2018/01/09/creating-laravel-helpers/) to handle things like formatting dates. For more complex stuff, such as formatting HTML, you should be doing this in Blade (or another templating system, if you're using one) - for instance, when generating an HTML table, you should consider [using a view partial](https://laravel.com/docs/5.6/blade#rendering-views-for-collections) to loop through them. For particularly tricky functionality, you have the option of [writing a custom Blade directive](https://laravel.com/docs/5.6/blade#extending-blade).

The same applies for rendering other content - for rendering JSON you should consider using [API resources](https://laravel.com/docs/5.6/eloquent-resources) or [Fractal](https://fractal.thephpleague.com/) to get any non-trivial logic for your API responses out of the controller. Blade templates can also work for non-HTML content such as XML.

Anything else...
----------------

These examples are largely to get you started, and there will be occasions where something doesn't fall into any of the above categories. However, the same principle applies. Your controllers should stick to just receiving requests and sending responses, and anything else should normally be deferred to other classes.

Fat controllers make developer's lives very difficult, and if you want your code base to be easily maintainable, you should be willing to refactor them ruthlessly. Any functionality you can pull out of the controller becomes easier to reuse and test, and as long as you name your classes and methods sensibly, they're easier to understand.
