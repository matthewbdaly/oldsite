---
title: "Understanding the pipeline pattern"
date: 2018-10-05 19:36:16 +0100
categories:
- php
- designpatterns
comments: true
---

In a previous post, I used the pipeline pattern to demonstrate processing letters using optical recognition and machine learning. The pipeline pattern is something I've found very useful in recent months. For a sequential series of tasks, this approach can make your code easier to understand by allowing you to break it up into simple, logical steps which are easy to test and understand individually. If you're familiar with pipes and redirection in Unix, you'll be aware of how you can chain together multiple, relatively simple commands to carry out some very complex transformations on data.

A few months back, I was asked to build a webhook for a Facebook lead form at work. One of my colleagues was having to manually export CSV data from Facebook for the data, and then import it into a MySQL database and a Campaign Monitor mailing list, which was an onerous task, so they asked me to look at more automated solutions. I wound up building a webhook with Lumen that would go through the following steps:

* Get the lead ID's from the webhook
* Pull the leads from the Facebook API using those ID's
* Process the raw data into a more suitable format
* Save the data to the database
* Push the data to Campaign Monitor

Since this involved a number of discrete steps, I chose to implement each step as a separate stage. That way, each step was easy to test in isolation, and it was easily reusable. As it turned out, this approach saved us because Facebook needed to approve this app (and ended up rejecting it - their documentation at the time wasn't clear on implementing server-to-server apps, making it hard to meet their guidelines), so we needed an interim solution. I instead wrote an Artisan task for importing the file from a CSV, which involved the following steps:

* Read the rows from the CSV file
* Format the CSV data into the desired format
* Save the data to the database
* Push the data to Campaign Monitor

This meant that two of the existing steps could be reused, as is, without touching the code or tests. I just added two new classes to read the data and format the data, and the Artisan command, which simply called the various pipeline stages, *and that was all*. In this post, I'll demonstrate how I implemented this.

While there is more than one implementation of this available, and it wouldn't be hard to roll your own, I generally use the PHP League's [Pipeline package](https://pipeline.thephpleague.com/), since it's simple, solid and well-tested. Let's say our application has three steps:

* Format the request data
* Save the data
* Push it to a third party service.

We therefore need to write a stage for each step in the process. Each one must be a callable, such as a closure, a callback, or a class that implements the `__invoke()` magic method. I usually go for the latter as it allows you to more easily inject dependencies into the stage via its constructor, making it easier to use and test. Here's what our first stage might look like:

```php
<?php

namespace App\Stages;

use Illuminate\Support\Collection;

class FormatData
{
    public function __invoke(Collection $data): Collection
    {
        return $data->map(function ($item) {
            return [
                'name' => $item->fullname,
                'email' => $item->email
            ];
        });
    }
}
```

This class does nothing more than receive a collection, and format the data as expected. We could have it accept a request object instead, but I opted not to because I felt it made more sense to pass the data in as a collection so it's not tied to an HTTP request. That way, it can also handle data passed through from a CSV file using an Artisan task, and the details of how it receives the data in the first place are deferred to the class that calls the pipeline in the first place. Note this stage also returns a collection, for handling by the next step:

```php
<?php

namespace App\Stages;

use App\Lead;
use Illuminate\Support\Collection;

class SaveData
{
    public function __invoke(Collection $data): Collection
    {
        return $data->map(function ($item) {
            $lead = new Lead;
            $lead->name = $item->name;
            $lead->email = $item->email;
            $lead->save();
            return $lead;
        }
    }
}
```

This step saves each lead as an Eloquent model, and returns a collection of the saved models, which are passed to the final step:

```php
<?php

namespace App\Stages;

use App\Contracts\Services\MailingList;
use Illuminate\Support\Collection;

class AddDataToList
{
    protected $list;

    public function __construct(MailingList $list)
    {
        $this->list = $list;
    }

    public function __invoke(Collection $data)
    {
        return $data->each(function ($item) {
            $this->list->add([
                'name' => $item->name,
                'email' => $item->email
            ]);
        });
    }
}
```

This step uses a wrapper class for a mailing service, which is passed through as a dependency in the constructor. The `__invoke()` method then loops through each Eloquent model and uses it to fetch the data, which is then added to the list. With our stages complete, we can now put them together in our controller:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Stages\FormatData;
use App\Stages\SaveData;
use App\Stages\AddDataToList;
use League\Pipeline\Pipeline;
use Illuminate\Support\Collection;

class WebhookController extends Controller
{
    public function store(Request $request, Pipeline $pipeline, FormatData $formatData, SaveData $savedata, AddDataToList $addData)
    {
        try {
            $data = Collection::make($request->get('data'));
            $pipe = $pipeline->pipe($formatData)
                ->pipe($saveData)
                ->pipe($addData);
            $pipe->process($data);
        } catch (\Exception $e) {
            // Handle exception
        }
    }
}
```

As mentioned above, we extract the request data (assumed to be an array of data for a webhook), and convert it into a collection. Then, we put together our pipeline. Note that we use dependency injection to fetch the steps - feel free to use method or constructor injection as appropriate. We instantiate our pipeline, and call the `pipe()` method multiple times to add new stages.

Finally we pass the data through to our pipe for processing by calling the `process()` method, passing in the initial data. Note that we can wrap the whole thing in a `try...catch` statement to handle exceptions, so if something happens that would mean we would want to cease processing at that point, we can throw an exception in the stage and handle it outside the pipeline.

This means that our controller is kept very simple. It just gets the data as a collection, then puts the pipeline together and passes the data through. If we subsequently had to write an Artisan task to do something similar from the command line, we could fetch the data via a CSV reader class, and then pass it to the same pipeline. If we needed to change the format of the initial data, we could replace the `FormatData` class with a single separate class with very little trouble.

Another thing you can do with the League pipeline package, but I haven't yet had the occasion to try, is use `League\Pipeline\PipelineBuilder` to build pipelines in a more dynamic fashion. You can make steps conditional, as in this example:

```php
<?php

use League\Pipeline\PipelineBuilder;

$builder = (new PipelineBuilder)
    ->add(new FormatData);
if ($data['type'] = 'foo') {
    $builder->add(new HandleFooType);
}
$builder->add(new SaveData);
$pipeline = $builder->build();
$pipeline->process($data);
```

The pipeline pattern isn't appropriate for every situation, but for anything that involves a set of operations on the same data, it makes a lot of sense, and can make it easy to break larger operations into smaller steps that are easier to understand, test, and re-use.
