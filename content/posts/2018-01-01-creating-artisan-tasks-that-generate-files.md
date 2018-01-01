---
title: "Creating Artisan tasks that generate files"
date: 2018-01-01 16:06:21 +0000
categories:
- php
- artisan
- laravel
comments: true
---

While the documentation for creating Artisan tasks is generally pretty good, it doesn't really touch on creating tasks that generate new files. The only way to figure it out was to go digging through the source code. In this case, I was building an Artisan command to create Fractal transformers as part of a package I'm working on.

There's a specialised class for generating files at `Illuminate\Console\GeneratorCommand`, which your command class should extend instead of `Illuminate\Console\Command`. In addition to the usual properties such as the signature and description, you also need to specify `$type` to give the type of class being generated. Also, note that the constructor is different, so if you use `php artisan make:console` to create the boilerplate for this command, you'll need to delete the constructor.

```php
<?php

namespace Matthewbdaly\MyPackage\Console\Commands;

use Illuminate\Console\GeneratorCommand;
use Symfony\Component\Console\Input\InputArgument;

class TransformerMakeCommand extends GeneratorCommand
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'make:transformer {name : The required name of the transformer class}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a Fractal transformer';

    /**
     * The type of class being generated.
     *
     * @var string
     */
    protected $type = 'Fractal transformer';

    /**
     * Get the stub file for the generator.
     *
     * @return string
     */
    protected function getStub()
    {
        return __DIR__.'/stubs/transformer.stub';
    }

    /**
     * Get the console command arguments.
     *
     * @return array
     */
    protected function getArguments()
    {
        return [
            ['name', InputArgument::REQUIRED, 'The name of the command.'],
        ];
    }

    /**
     * Get the default namespace for the class.
     *
     * @param  string  $rootNamespace
     * @return string
     */
    protected function getDefaultNamespace($rootNamespace)
    {
        return $rootNamespace.'\Transformers';
    }
}
```

Note the `getDefaultNamespace()` method. If your class will live directly under the `app` folder this is not necessary. Otherwise, it needs to return the root namespace, with the folder structure you want after it. Here my class will live under `app\Transformers`, so I've set it to reflect that.

Also, note the `getStub()` method. This tells Artisan that it should use the specified stub file as the basis for our class. Below you'll find the stub file I used for my transformer:

```php
<?php

namespace DummyNamespace;

use Matthewbdaly\MyPackage\Transformers\BaseTransformer;
use Illuminate\Database\Eloquent\Model;

class DummyClass extends BaseTransformer
{
    public function transform(Model $model)
    {
        return [
            'id'            => (int) $model->id,
        ];
    }
}
```

Note that the `DummyNamespace` and `DummyClass` fields will be overwritten with the correct values.

Once this Artisan command is registered in the usual way, you can then run it as follows:

```bash
$ php artisan make:transformer Example
```

And it will generate a boilerplate class something like this:

```php
<?php

namespace App\Transformers;

use Matthewbdaly\MyPackage\Transformers\BaseTransformer;
use Illuminate\Database\Eloquent\Model;

class Example extends BaseTransformer
{
    public function transform(Model $model)
    {
        return [
            'id'            => (int) $model->id,
        ];
    }
}
```

You can then replace the model with your own one as necessary, and add any further content to this class.
