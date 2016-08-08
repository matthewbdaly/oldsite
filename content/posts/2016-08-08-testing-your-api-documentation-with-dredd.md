---
title: "Testing your API documentation with Dredd"
date: 2016-08-08 17:05:00 +0100
categories:
- api
- documentation
- php
- lumen
- laravel
- testing
comments: true
---

Documenting your API is something most developers agree is generally a Good Thing, but it's a pain in the backside, and somewhat boring to do. What you really need is a tool that allows you to specify the details of your API before you start work, generate documentation from that specification, and test your implementation against that specification.

Fortunately, such a tool exists. The [Blueprint](https://apiblueprint.org/) specification allows you to document your API using a Markdown-like syntax. You can then create HTML documentation using a tool like [Aglio](https://github.com/danielgtaylor/aglio) or [Apiary](https://apiary.io/), and test it against your implementation using [Dredd](https://github.com/apiaryio/dredd).

In this tutorial we'll implement a very basic REST API using the Lumen framework. We'll first specify our API, then we'll implement routes to match the implementation. In the process, we'll demonstrate the Blueprint specification in action.

Getting started
---------------

Assuming you already have PHP 5.6 or better and Composer installed, run the following command to create our Lumen app skeleton:

```bash
$ composer create-project --prefer-dist laravel/lumen demoapi
```

Once it has finished installing, we'll also need to add the Dredd hooks:

```bash
$ cd demoapi
$ composer require ddelnano/dredd-hooks-php
```

We need to install Dredd. It's a Node.js tool, so you'll need to have that installed. We'll also install Aglio to generate HTML versions of our documentation:

```bash
$ npm install -g aglio dredd
```

We also need to create a configuration file for Dredd, which you can do by running `dredd init`. Or you can just copy the one below:

```yml
dry-run: null
hookfiles: null
language: php
sandbox: false
server: 'php -S localhost:3000 -t public/'
server-wait: 3
init: false
custom:
  apiaryApiKey: ''
names: false
only: []
reporter: apiary
output: []
header: []
sorted: false
user: null
inline-errors: false
details: false
method: []
color: true
level: info
timestamp: false
silent: false
path: []
hooks-worker-timeout: 5000
hooks-worker-connect-timeout: 1500
hooks-worker-connect-retry: 500
hooks-worker-after-connect-wait: 100
hooks-worker-term-timeout: 5000
hooks-worker-term-retry: 500
hooks-worker-handler-host: localhost
hooks-worker-handler-port: 61321
config: ./dredd.yml
blueprint: apiary.apib
endpoint: 'http://localhost:3000'
```

If you choose to run `dredd init`, you'll see prompts for a number of things, including:

* The server command
* The blueprint file name
* The endpoint
* Any Apiary API key
* The language you want to use

There are Dredd hooks for many languages, so if you're planning on building a REST API in a language other than PHP, don't worry - you can still test it with Dredd, you'll just get prompted to install different hooks..

Note the `hookfiles` section, which specifies a hookfile to run during the test in order to set up the API. We'll touch on that in a moment. Also, note the `server` setting - this specifies the command we should call to run the server. In this case we're using the PHP development server.

If you're using Apiary with your API (which I highly recommend), you can also set the following parameter to ensure that every time you run Dredd, it submits the results to Apiary:

```yml
custom:
  apiaryApiKey: <API KEY HERE>
  apiaryApiName: <API NAME HERE>
```

Hookfiles
---------

As mentioned, the hooks allow you to set up your API. In our case, we'll need to set up some fixtures for our tests.  Save this file at `tests/dredd/hooks/hookfile.php`:

```php
<?php

use Dredd\Hooks;
use Illuminate\Support\Facades\Artisan;

require __DIR__ . '/../../../vendor/autoload.php';

$app = require __DIR__ . '/../../../bootstrap/app.php';

$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

Hooks::beforeAll(function (&$transaction) use ($app) {
   putenv('DB_CONNECTION=sqlite');
   putenv('DB_DATABASE=:memory:');
   Artisan::call('migrate:refresh');
   Artisan::call('db:seed');
});
Hooks::beforeEach(function (&$transaction) use ($app) {
   Artisan::call('migrate:refresh');
   Artisan::call('db:seed');
});
```

Before the tests run, we set the environment up to use an in-memory SQLite database. We also migrate and seed the database, so we're working with a clean database. As part of this tutorial, we'll create seed files for the fixtures we need in the database.

This hookfile assumes that the user does not need to be authenticated to communicate with the API. If that's not the case for your API, you may want to include something like this in your hookfile's `beforeEach` callback:

```php
   $user = App\User::first();
   $token = JWTAuth::fromUser($user);
   $transaction->request->headers->Authorization = 'Bearer ' . $token;
```

Here we're using the [JWT Auth](https://github.com/tymondesigns/jwt-auth) package for Laravel to authenticate users of our API, and we need to set the `Authorization` header to contain a valid JSON web token for the given user. If you're using a different method, such as HTTP Basic authentication, you'll need to amend this code to reflect that.

With that done, we need to create the Blueprint file for our API. Recall the following line in `dredd.yml`:

```yml
blueprint: apiary.apib
```

This specifies the path to our documentation. Let's create that file:

```bash
$ touch apiary.apib
```

Once this is done, you should be able to run Dredd:

```bash
$ dredd
info: Configuration './dredd.yml' found, ignoring other arguments.
info: Using apiary reporter.
info: Starting server with command: php -S localhost:3000 -t public/
info: Waiting 3 seconds for server command to start...
warn: Parser warning in file 'apiary.apib': (warning code undefined) Could not recognize API description format. Falling back to API Blueprint by default.
info: Beginning Dredd testing...
complete: Tests took 619ms
complete: See results in Apiary at: https://app.apiary.io/public/tests/run/4aab4155-cfc4-4fda-983a-fea280933ad4
info: Sending SIGTERM to the backend server
info: Backend server was killed
```

With that done, we're ready to start work on our API.

Our first route
------------------

Dredd is not a testing tool in the usual sense. Under no circumstances should you use it as a substitute for something like PHPUnit - that's not what it's for. It's for ensuring that your documentation and your implementation remain in sync. However, it's not entirely impractical to use it as a Behaviour-driven development tool in the same vein as Cucumber or Behat - you can use it to plan out the endpoints your API will have, the requests they accept, and the responses they return, and then verify your implementation against the documentation.

We will only have a single endpoint, in order to keep this tutorial as simple and concise as possible. Our endpoint will expose products for a shop, and will allow users to fetch, create, edit and delete products. Note that we won't be implementing any kind of authentication, which in production is almost certainly not what you want - we're just going for the simplest possible implementation.

First, we'll implement getting a list of products:

```markdown
FORMAT: 1A

# Demo API

# Products [/api/products]
Product object representation

## Get products [GET /api/products]
Get a list of products

+ Request (application/json)

+ Response 200 (application/json)
    + Body

            {
                "id": 1,
                "name": "Purple widget",
                "description": "A purple widget",
                "price": 5.99,
                "attributes": {
                    "colour": "Purple",
                    "size": "Small"
                }
            }
```

A little explanation is called for. First the `FORMAT` section denotes the version of the API. Then, the `# Demo API` section denotes the name of the API.

Next, we define the `Products` endpoint, followed by our first method. Then we define what should be contained in the request, and what the response should look like. Blueprint is a little more complex than that, but that's sufficient to get us started.

Then we run `dredd` again:

```bash
$ dredd.yml
info: Configuration './dredd.yml' found, ignoring other arguments.
info: Using apiary reporter.
info: Starting server with command: php -S localhost:3000 -t public/
info: Waiting 3 seconds for server command to start...
info: Beginning Dredd testing...
fail: GET /api/products duration: 61ms
info: Displaying failed tests...
fail: GET /api/products duration: 61ms
fail: headers: Header 'content-type' has value 'text/html; charset=UTF-8' instead of 'application/json'
body: Can't validate real media type 'text/plain' against expected media type 'application/json'.
statusCode: Status code is not '200'

request: 
method: GET
uri: /api/products
headers: 
    Content-Type: application/json
    User-Agent: Dredd/1.5.0 (Linux 4.4.0-31-generic; x64)

body: 



expected: 
headers: 
    Content-Type: application/json

body: 
{
  "id": 1,
  "name": "Purple widget",
  "description": "A purple widget",
  "price": 5.99,
  "attributes": {
    "colour": "Purple",
    "size": "Small"
  }
}
statusCode: 200


actual: 
statusCode: 404
headers: 
    host: localhost:3000
    connection: close
    x-powered-by: PHP/7.0.8-0ubuntu0.16.04.2
    cache-control: no-cache
    date: Mon, 08 Aug 2016 10:30:33 GMT
    content-type: text/html; charset=UTF-8

body: 
<!DOCTYPE html>
<html>
    <head>
        <meta name="robots" content="noindex,nofollow" />
        <style>
            /* Copyright (c) 2010, Yahoo! Inc. All rights reserved. Code licensed under the BSD License: http://developer.yahoo.com/yui/license.html */
            html{color:#000;background:#FFF;}body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,h5,h6,pre,code,form,fieldset,legend,input,textarea,p,blockquote,th,td{margin:0;padding:0;}table{border-collapse:collapse;border-spacing:0;}fieldset,img{border:0;}address,caption,cite,code,dfn,em,strong,th,var{font-style:normal;font-weight:normal;}li{list-style:none;}caption,th{text-align:left;}h1,h2,h3,h4,h5,h6{font-size:100%;font-weight:normal;}q:before,q:after{content:'';}abbr,acronym{border:0;font-variant:normal;}sup{vertical-align:text-top;}sub{vertical-align:text-bottom;}input,textarea,select{font-family:inherit;font-size:inherit;font-weight:inherit;}input,textarea,select{*font-size:100%;}legend{color:#000;}
            html { background: #eee; padding: 10px }
            img { border: 0; }
            #sf-resetcontent { width:970px; margin:0 auto; }
                        .sf-reset { font: 11px Verdana, Arial, sans-serif; color: #333 }
            .sf-reset .clear { clear:both; height:0; font-size:0; line-height:0; }
            .sf-reset .clear_fix:after { display:block; height:0; clear:both; visibility:hidden; }
            .sf-reset .clear_fix { display:inline-block; }
            .sf-reset * html .clear_fix { height:1%; }
            .sf-reset .clear_fix { display:block; }
            .sf-reset, .sf-reset .block { margin: auto }
            .sf-reset abbr { border-bottom: 1px dotted #000; cursor: help; }
            .sf-reset p { font-size:14px; line-height:20px; color:#868686; padding-bottom:20px }
            .sf-reset strong { font-weight:bold; }
            .sf-reset a { color:#6c6159; cursor: default; }
            .sf-reset a img { border:none; }
            .sf-reset a:hover { text-decoration:underline; }
            .sf-reset em { font-style:italic; }
            .sf-reset h1, .sf-reset h2 { font: 20px Georgia, "Times New Roman", Times, serif }
            .sf-reset .exception_counter { background-color: #fff; color: #333; padding: 6px; float: left; margin-right: 10px; float: left; display: block; }
            .sf-reset .exception_title { margin-left: 3em; margin-bottom: 0.7em; display: block; }
            .sf-reset .exception_message { margin-left: 3em; display: block; }
            .sf-reset .traces li { font-size:12px; padding: 2px 4px; list-style-type:decimal; margin-left:20px; }
            .sf-reset .block { background-color:#FFFFFF; padding:10px 28px; margin-bottom:20px;
                -webkit-border-bottom-right-radius: 16px;
                -webkit-border-bottom-left-radius: 16px;
                -moz-border-radius-bottomright: 16px;
                -moz-border-radius-bottomleft: 16px;
                border-bottom-right-radius: 16px;
                border-bottom-left-radius: 16px;
                border-bottom:1px solid #ccc;
                border-right:1px solid #ccc;
                border-left:1px solid #ccc;
            }
            .sf-reset .block_exception { background-color:#ddd; color: #333; padding:20px;
                -webkit-border-top-left-radius: 16px;
                -webkit-border-top-right-radius: 16px;
                -moz-border-radius-topleft: 16px;
                -moz-border-radius-topright: 16px;
                border-top-left-radius: 16px;
                border-top-right-radius: 16px;
                border-top:1px solid #ccc;
                border-right:1px solid #ccc;
                border-left:1px solid #ccc;
                overflow: hidden;
                word-wrap: break-word;
            }
            .sf-reset a { background:none; color:#868686; text-decoration:none; }
            .sf-reset a:hover { background:none; color:#313131; text-decoration:underline; }
            .sf-reset ol { padding: 10px 0; }
            .sf-reset h1 { background-color:#FFFFFF; padding: 15px 28px; margin-bottom: 20px;
                -webkit-border-radius: 10px;
                -moz-border-radius: 10px;
                border-radius: 10px;
                border: 1px solid #ccc;
            }
        </style>
    </head>
    <body>
                    <div id="sf-resetcontent" class="sf-reset">
                <h1>Sorry, the page you are looking for could not be found.</h1>
                                        <h2 class="block_exception clear_fix">
                            <span class="exception_counter">1/1</span>
                            <span class="exception_title"><abbr title="Symfony\Component\HttpKernel\Exception\NotFoundHttpException">NotFoundHttpException</abbr> in <a title="/home/matthew/Projects/demoapi/vendor/laravel/lumen-framework/src/Concerns/RoutesRequests.php line 450" ondblclick="var f=this.innerHTML;this.innerHTML=this.title;this.title=f;">RoutesRequests.php line 450</a>:</span>
                            <span class="exception_message"></span>
                        </h2>
                        <div class="block">
                            <ol class="traces list_exception">
       <li> in <a title="/home/matthew/Projects/demoapi/vendor/laravel/lumen-framework/src/Concerns/RoutesRequests.php line 450" ondblclick="var f=this.innerHTML;this.innerHTML=this.title;this.title=f;">RoutesRequests.php line 450</a></li>
       <li>at <abbr title="Laravel\Lumen\Application">Application</abbr>->handleDispatcherResponse(<em>array</em>('0')) in <a title="/home/matthew/Projects/demoapi/vendor/laravel/lumen-framework/src/Concerns/RoutesRequests.php line 387" ondblclick="var f=this.innerHTML;this.innerHTML=this.title;this.title=f;">RoutesRequests.php line 387</a></li>
       <li>at <abbr title="Laravel\Lumen\Application">Application</abbr>->Laravel\Lumen\Concerns\{closure}() in <a title="/home/matthew/Projects/demoapi/vendor/laravel/lumen-framework/src/Concerns/RoutesRequests.php line 636" ondblclick="var f=this.innerHTML;this.innerHTML=this.title;this.title=f;">RoutesRequests.php line 636</a></li>
       <li>at <abbr title="Laravel\Lumen\Application">Application</abbr>->sendThroughPipeline(<em>array</em>(), <em>object</em>(<abbr title="Closure">Closure</abbr>)) in <a title="/home/matthew/Projects/demoapi/vendor/laravel/lumen-framework/src/Concerns/RoutesRequests.php line 389" ondblclick="var f=this.innerHTML;this.innerHTML=this.title;this.title=f;">RoutesRequests.php line 389</a></li>
       <li>at <abbr title="Laravel\Lumen\Application">Application</abbr>->dispatch(<em>null</em>) in <a title="/home/matthew/Projects/demoapi/vendor/laravel/lumen-framework/src/Concerns/RoutesRequests.php line 334" ondblclick="var f=this.innerHTML;this.innerHTML=this.title;this.title=f;">RoutesRequests.php line 334</a></li>
       <li>at <abbr title="Laravel\Lumen\Application">Application</abbr>->run() in <a title="/home/matthew/Projects/demoapi/public/index.php line 28" ondblclick="var f=this.innerHTML;this.innerHTML=this.title;this.title=f;">index.php line 28</a></li>
    </ol>
</div>

            </div>
    </body>
</html>



complete: 0 passing, 1 failing, 0 errors, 0 skipped, 1 total
complete: Tests took 533ms
[Mon Aug  8 11:30:33 2016] 127.0.0.1:44472 [404]: /api/products
complete: See results in Apiary at: https://app.apiary.io/public/tests/run/0153d5bf-6efa-4fdb-b02a-246ddd75cb14
info: Sending SIGTERM to the backend server
info: Backend server was killed
```

Our route is returning HTML, not JSON, and is also raising a 404 error. So let's fix that. First, let's create our `Product` model at `app/Product.php`:

```php
<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    //
}
```

Next, we need to create a migration for the database tables for the `Product` model:

```bash
$ php artisan make:migration create_product_table
Created Migration: 2016_08_08_105737_create_product_table
```

This will create a new file under `database/migrations`. Open this file and paste in the following:

```php
<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateProductTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Create products table
        Schema::create('products', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name');
            $table->text('description');
            $table->float('price');
            $table->json('attributes');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Drop products table
        Schema::drop('products');
    }
}
```

Note that we create fields that map to the attributes our API exposes. Also, note the use of the JSON field. In databases that support it, like PostgreSQL, it uses the native JSON support, otherwise it works like a text field. Next, we run the migration to create the table:

```bash
$ php artisan migrate
Migrated: 2016_08_08_105737_create_product_table
```

With our model done, we now need to ensure that when Dredd runs, there is some data in the database, so we'll create a seeder file at `database/seeds/ProductSeeder`:

```php
<?php

use Illuminate\Database\Seeder;
use Carbon\Carbon;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Add product
        DB::table('products')->insert([
            'name' => 'Purple widget',
            'description' => 'A purple widget',
            'price' => 5.99,
            'attributes' => json_encode([
                'colour' => 'purple',
                'size' => 'Small'
            ]),
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);
    }
}
```

You also need to amend `database/seeds/DatabaseSeeder` to call it:

```php
<?php

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $this->call('ProductSeeder');
    }
}
```

I found I also had to run the following command to find the new seeder:

```bash
$ composer dump-autoload
```

Then, call the seeder:

```bash
$ php artisan db:seed
Seeded: ProductSeeder
```

We also need to enable Eloquent, as Lumen disables it by default. Uncomment the following line in `bootstrap/app.php`:

```php
$app->withEloquent();
```

With that done, we can move onto the controller.

Creating the controller
-----------------------

Create the following file at `app/Http/Controllers/ProductController`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Product;

class ProductController extends Controller
{
    private $product;

    public function __construct(Product $product) {
        $this->product = $product;
    }

    public function index()
    {
        // Get all products
        $products = $this->product->all();

        // Send response
        return response()->json($products, 200);
    }
}
```

This implements the `index` route. Note that we inject the `Product` instance into the controller. Next, we need to hook it up in `app/Http/routes.php`:

```php
<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It is a breeze. Simply tell Lumen the URIs it should respond to
| and give it the Closure to call when that URI is requested.
|
*/

$app->get('/api/products', 'ProductController@index');
```

Then we run Dredd again:

```bash
$ dredd
info: Configuration './dredd.yml' found, ignoring other arguments.
info: Using apiary reporter.
info: Starting server with command: php -S localhost:3000 -t public/
info: Waiting 3 seconds for server command to start...
info: Beginning Dredd testing...
[Mon Aug  8 12:36:28 2016] 127.0.0.1:45466 [200]: /api/products
fail: GET /api/products duration: 131ms
info: Displaying failed tests...
fail: GET /api/products duration: 131ms
fail: body: At '' Invalid type: array (expected object)

request: 
method: GET
uri: /api/products
headers: 
    Content-Type: application/json
    User-Agent: Dredd/1.5.0 (Linux 4.4.0-31-generic; x64)

body: 



expected: 
headers: 
    Content-Type: application/json

body: 
{
  "id": 1,
  "name": "Purple widget",
  "description": "A purple widget",
  "price": 5.99,
  "attributes": {
    "colour": "Purple",
    "size": "Small"
  }
}
statusCode: 200


actual:
statusCode: 200
headers:
    host: localhost:3000
    connection: close
    x-powered-by: PHP/7.0.8-0ubuntu0.16.04.2
    cache-control: no-cache
    content-type: application/json
    date: Mon, 08 Aug 2016 11:36:28 GMT

body:
[ 
  { 
    "id": 1,
    "name": "Purple widget",
    "description": "A purple widget",
    "price": "5.99",
    "attributes": "{\"colour\":\"purple\",\"size\":\"Small\"}",
    "created_at": "2016-08-08 11:32:24",
    "updated_at": "2016-08-08 11:32:24"
  }
]



complete: 0 passing, 1 failing, 0 errors, 0 skipped, 1 total
complete: Tests took 582ms
complete: See results in Apiary at: https://app.apiary.io/public/tests/run/83da2d67-c846-4356-a3b8-4d7c32daa7ef
info: Sending SIGTERM to the backend server
info: Backend server was killed
```

Whoops, looks like we made a mistake here. The index route returns an array of objects, but we're looking for a single object in the blueprint. We also need to wrap our attributes in quotes, and add the `created_at` and `updated_at` attributes. Let's fix the blueprint:

```markdown
FORMAT: 1A

# Demo API

# Products [/api/products]
Product object representation

## Get products [GET /api/products]
Get a list of products

+ Request (application/json)

+ Response 200 (application/json)
    + Body

            [
                {
                    "id": 1,
                    "name": "Purple widget",
                    "description": "A purple widget",
                    "price": 5.99,
                    "attributes": "{\"colour\": \"Purple\",\"size\": \"Small\"}",
                    "created_at": "*",
                    "updated_at": "*"
                }
            ]
```

Let's run Dredd again:

```bash
$ dredd
info: Configuration './dredd.yml' found, ignoring other arguments.
info: Using apiary reporter.
info: Starting server with command: php -S localhost:3000 -t public/
info: Waiting 3 seconds for server command to start...
info: Beginning Dredd testing...
pass: GET /api/products duration: 65ms
complete: 1 passing, 0 failing, 0 errors, 0 skipped, 1 total
complete: Tests took 501ms
[Mon Aug  8 13:05:54 2016] 127.0.0.1:45618 [200]: /api/products
complete: See results in Apiary at: https://app.apiary.io/public/tests/run/7c23d4ae-aff2-4daf-bbdf-9fd76fc58b97
info: Sending SIGTERM to the backend server
info: Backend server was killed
```

And now we can see that our test passes.

Next, we'll implement a test for fetching a single product:

```markdown
## Get a product [GET /api/products/1]
Get a single product

+ Request (application/json)

+ Response 200 (application/json)
    + Body

            {
              "id": 1,
              "name": "Purple widget",
              "description": "A purple widget",
              "price": 5.99,
              "attributes": "{\"colour\": \"Purple\",\"size\": \"Small\"}",
              "created_at": "*",
              "updated_at": "*"
            }
```

Note the same basic format - we define the URL that should be fetched, the content of the request, and the response, including the status code.

Let's hook up our route in `app/Http/routes.php`:

```php
$app->get('/api/products/{id}', 'ProductController@show');
```

And add the `show()` method to the controller:

```php
    public function show($id)
    {
        // Get individual product
        $product = $this->product->findOrFail($id);

        // Send response
        return response()->json($product, 200);
    }
```

Running Dredd again should show this method has been implemented:

```bash
$ dredd
info: Configuration './dredd.yml' found, ignoring other arguments.
info: Using apiary reporter.
info: Starting server with command: php -S localhost:3000 -t public/
info: Waiting 3 seconds for server command to start...
info: Beginning Dredd testing...
pass: GET /api/products duration: 66ms
[Mon Aug  8 13:21:31 2016] 127.0.0.1:45750 [200]: /api/products
pass: GET /api/products/1 duration: 17ms
complete: 2 passing, 0 failing, 0 errors, 0 skipped, 2 total
complete: Tests took 521ms
[Mon Aug  8 13:21:31 2016] 127.0.0.1:45752 [200]: /api/products/1
complete: See results in Apiary at: https://app.apiary.io/public/tests/run/bb6d03c3-8fad-477c-b140-af6e0cc8b96c
info: Sending SIGTERM to the backend server
info: Backend server was killed
```

That's our read support done. We just need to add support for `POST`, `PATCH` and `DELETE` methods.

Our remaining methods
---------------------

Let's set up the test for our `POST` method first:

```markdown
## Create products [POST /api/products]
Create a new product

+ name (string) - The product name
+ description (string) - The product description
+ price (float) - The product price
+ attributes (string) - The product attributes

+ Request (application/json)
    + Body

            {
                "name": "Blue widget",
                "description": "A blue widget",
                "price": 5.99,
                "attributes": "{\"colour\": \"blue\",\"size\": \"Small\"}"
            }

+ Response 201 (application/json)
    + Body

            {
              "id": 2,
              "name": "Blue widget",
              "description": "A blue widget",
              "price": 5.99,
              "attributes": "{\"colour\": \"blue\",\"size\": \"Small\"}",
              "created_at": "*",
              "updated_at": "*"
            }
```

Note we specify the format of the parameters that should be passed through, and that our status code should be 201, not 200 - this is arguably a more correct choice for creating a resource. Be careful of the whitespace - I had some odd issues with it. Next, we add our route:

```php
$app->post('/api/products', 'ProductController@store');
```

And the `store()` method in the controller:

```php
    public function store(Request $request)
    {
        // Validate request
        $valid = $this->validate($request, [
            'name' => 'required|string',
            'description' => 'required|string',
            'price' => 'required|numeric',
            'attributes' => 'string',
        ]);

        // Create product
        $product = new $this->product;
        $product->name = $request->input('name');
        $product->description = $request->input('description');
        $product->price = $request->input('price');
        $product->attributes = $request->input('attributes');

        // Save product
        $product->save();

        // Send response
        return response()->json($product, 201);
    }
```

Note that we validate the attributes, to ensure they are correct and that the required ones exist. Running Dredd again should show the route is now in place:

```bash
$ dredd
info: Configuration './dredd.yml' found, ignoring other arguments.
info: Using apiary reporter.
info: Starting server with command: php -S localhost:3000 -t public/
info: Waiting 3 seconds for server command to start...
info: Beginning Dredd testing...
pass: GET /api/products duration: 69ms
[Mon Aug  8 15:17:35 2016] 127.0.0.1:47316 [200]: /api/products
pass: GET /api/products/1 duration: 18ms
[Mon Aug  8 15:17:35 2016] 127.0.0.1:47318 [200]: /api/products/1
pass: POST /api/products duration: 42ms
complete: 3 passing, 0 failing, 0 errors, 0 skipped, 3 total
complete: Tests took 575ms
[Mon Aug  8 15:17:35 2016] 127.0.0.1:47322 [201]: /api/products
complete: See results in Apiary at: https://app.apiary.io/public/tests/run/cb5971cf-180d-47ed-abf4-002378941134
info: Sending SIGTERM to the backend server
info: Backend server was killed
```

Next, we'll implement `PATCH`. This targets an existing object, but accepts parameters in the same way as `POST`:

```markdown
## Update existing products [PATCH /api/products/1]
Update an existing product

+ name (string) - The product name
+ description (string) - The product description
+ price (float) - The product price
+ attributes (string) - The product attributes

+ Request (application/json)
    + Body

            {
                "name": "Blue widget",
                "description": "A blue widget",
                "price": 5.99,
                "attributes": "{\"colour\": \"blue\",\"size\": \"Small\"}"
            }

+ Response 200 (application/json)
    + Body

            {
              "id": 2,
              "name": "Blue widget",
              "description": "A blue widget",
              "price": 5.99,
              "attributes": "{\"colour\": \"blue\",\"size\": \"Small\"}",
              "created_at": "*",
              "updated_at": "*"
            }
```

We add our new route:

```php
$app->patch('/api/products/{id}', 'ProductController@update');
```

And our `update()` method:

```php
    public function update(Request $request, $id)
    {
        // Validate request
        $valid = $this->validate($request, [
            'name' => 'string',
            'description' => 'string',
            'price' => 'numeric',
            'attributes' => 'string',
        ]);

        // Get product
        $product = $this->product->findOrFail($id);

        // Update it
        if ($request->has('name')) {
            $product->name = $request->input('name');
        }
        if ($request->has('description')) {
            $product->description = $request->input('description');
        }
        if ($request->has('price')) {
            $product->price = $request->input('price');
        }
        if ($request->has('attributes')) {
            $product->attributes = $request->input('attributes');
        }

        // Save product
        $product->save();

        // Send response
        return response()->json($product, 200);
    }
```

Here we can't guarantee every parameter will exist, so we test for it. We run Dredd again:

```bash
$ dredd
info: Configuration './dredd.yml' found, ignoring other arguments.
info: Using apiary reporter.
info: Starting server with command: php -S localhost:3000 -t public/
info: Waiting 3 seconds for server command to start...
info: Beginning Dredd testing...
pass: GET /api/products duration: 74ms
[Mon Aug  8 15:27:14 2016] 127.0.0.1:47464 [200]: /api/products
pass: GET /api/products/1 duration: 19ms
[Mon Aug  8 15:27:14 2016] 127.0.0.1:47466 [200]: /api/products/1
pass: POST /api/products duration: 36ms
[Mon Aug  8 15:27:14 2016] 127.0.0.1:47470 [201]: /api/products
[Mon Aug  8 15:27:14 2016] 127.0.0.1:47474 [200]: /api/products/1
pass: PATCH /api/products/1 duration: 34ms
complete: 4 passing, 0 failing, 0 errors, 0 skipped, 4 total
complete: Tests took 2579ms
complete: See results in Apiary at: https://app.apiary.io/public/tests/run/eae98644-44ad-432f-90fc-5f73fa674f66
info: Sending SIGTERM to the backend server
info: Backend server was killed
```

One last method to implement - the `DELETE` method. Add this to `apiary.apib`:

```markdown
## Delete products [DELETE /api/products/1]
Delete an existing product

+ Request (application/json)

+ Response 200 (application/json)
    + Body

            {
                "status": "Deleted"
            }
```

Next, add the route:

```php
$app->delete('/api/products/{id}', 'ProductController@destroy');
```

And the `destroy()` method in the controller:

```php
    public function destroy($id)
    {
        // Get product
        $product = $this->product->findOrFail($id);

        // Delete product
        $product->delete();

        // Return empty response
        return response()->json(['status' => 'deleted'], 200);
    }
```

And let's run Dredd again:

```bash
$ dredd
info: Configuration './dredd.yml' found, ignoring other arguments.
info: Using apiary reporter.
info: Starting server with command: php -S localhost:3000 -t public/
info: Waiting 3 seconds for server command to start...
info: Beginning Dredd testing...
pass: GET /api/products duration: 66ms
[Mon Aug  8 15:57:44 2016] 127.0.0.1:48664 [200]: /api/products
pass: GET /api/products/1 duration: 19ms
[Mon Aug  8 15:57:44 2016] 127.0.0.1:48666 [200]: /api/products/1
pass: POST /api/products duration: 45ms
[Mon Aug  8 15:57:44 2016] 127.0.0.1:48670 [201]: /api/products
pass: PATCH /api/products/1 duration: 24ms
[Mon Aug  8 15:57:44 2016] 127.0.0.1:48674 [200]: /api/products/1
pass: DELETE /api/products/1 duration: 27ms
complete: 5 passing, 0 failing, 0 errors, 0 skipped, 5 total
complete: Tests took 713ms
[Mon Aug  8 15:57:44 2016] 127.0.0.1:48678 [200]: /api/products/1
complete: See results in Apiary at: https://app.apiary.io/public/tests/run/a3e11d59-1dad-404b-9319-61ca5c0fcd15
info: Sending SIGTERM to the backend server
info: Backend server was killed
```

Our REST API is now finished.

Generating HTML version of your documentation
---------------------------------------------

Now we have finished documenting and implementing our API, we need to generate an HTML version of it. One way is to use `aglio`:

```bash
$ aglio -i apiary.apib -o output.html
```

This will write the documentation to `output.html`. There's also scope for choosing different themes if you wish.

You can also use Apiary, which has the advantage that they'll create a stub of your API so that if you need to work with the API before it's finished being implemented, you can use that as a placeholder.

Summary
-------

The Blueprint language is a useful way of documenting your API, and makes it simple enough that it's hard to weasel out of doing so. It's worth taking a closer look at [the specification](https://apiblueprint.org/) as it goes into quite a lot of detail. It's hard to ensure that the documentation and implementation remain in sync, so it's a good idea to use Dredd to ensure that any changes you make don't invalidate the documentation. With Aglio or Apiary, you can easily convert the documentation into a more attractive format.

You'll find the source code for this demo API [on Github](https://github.com/matthewbdaly/demoapi), so if you get stuck, take a look at that. I did have a fair few issues with whitespace, so bear that in mind if it behaves oddly. I've also noticed a few quirks, such as Dredd not working properly if a route returns a 204 response code, which is why I couldn't use that for deleting - this [appears to be a bug](https://github.com/apiaryio/dredd/issues/468), but hopefully this will be resolved soon.

I'll say it again, Dredd is not a substitute for proper unit tests, and under no circumstances should you use it as one. However, it can be very useful as a way to plan how your API will work and ensure that it complies with that plan, and to ensure that the implementation and documentation don't diverge. Used as part of your normal continuous integration setup, Dredd can make sure that any divergence between the docs and the application is picked up on and fixed as quickly as possible, while also making writing documentation less onerous.
