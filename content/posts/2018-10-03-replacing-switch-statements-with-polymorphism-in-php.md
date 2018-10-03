---
title: "Replacing switch statements with polymorphism in PHP"
date: 2018-10-03 23:07:33 +0100
categories:
- php
- designpatterns
- refactoring
comments: true
---

For the last few months, I've been making a point of picking up on certain antipatterns, and ways to avoid or remove them. One I've seen a lot recently is unnecessary large switch-case or if-else statements. For instance, here is a simplified example of one of these, which renders links to different objects:

```php
<?php

switch ($item->getType()) {
    case 'audio':
        $media = new stdClass;
        $media->type = 'audio';
        $media->duration = $item->getLength();
        $media->name = $item->getName();
        $media->url = $item->getUrl();
    case 'video':
        $media = new stdClass;
        $media->type = 'video';
        $media->duration = $item->getVideoLength();
        $media->name = $item->getTitle();
        $media->url = $item->getUrl();
}
return '<a href="'.$media->url.'" class="'.$media->type.'" data-duration="'.$media->duration.'">'.$media->name.'</a>';
```

There are a number of problems with this, most notably the fact that it's doing a lot of work to try and create a new set of objects that behave consistently. Instead, your objects should be polymorphic - in other words, you should be able to treat the original objects the same.

While strictly speaking you don't need one, it's a good idea to create an interface that defines the required methods. That way, you can have those objects implement that interface, and be certain that they have all the required methods:

```php
<?php

namespace App\Contracts;

interface MediaItem
{
    public function getLength(): int;

    public function getName(): string;

    public function getType(): string;

    public function getUrl(): string;
}
```

Then, you need to implement that interface in your objects. It doesn't matter if the implementations are different, as long as the methods exist. That way, objects can define how they return a particular value, which is simpler and more logical than defining it in a large switch-case statement elsewhere. It also helps to prevent duplication. Here's what the audio object might look like:


```php
<?php

namespace App\Models;

use App\Contracts\MediaItem;

class Audio implements MediaItem
{
    public function getLength(): int
    {
        return $this->length;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function getUrl(): string
    {
        return $this->url;
    }
}
```

And here's a similar example of the video object:

```php
<?php

namespace App\Models;

use App\Contracts\MediaItem;

class Video implements MediaItem
{
    public function getLength(): int
    {
        return $this->getVideoLength();
    }

    public function getName(): string
    {
        return $this->getTitle();
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function getUrl(): string
    {
        return $this->url;
    }
}
```

With that done, the code to render the links can be greatly simplified:

```php
<?php
return '<a href="'.$item->getUrl().'" class="'.$item->getType().'" data-duration="'.$item->getLength().'">'.$media->getName().'</a>';
```

Because we can use the exact same methods and get consistent responses, yet also allow for the different implementations within the objects, this approach allows for much more elegant and readable code. Different objects can be treated in the same way without the need for writing extensive if or switch statements.

I haven't had the occasion to do so, but in theory this approach is applicable in other languages, such as Javascript or Python (although these languages don't have the concept of interfaces). Since discovering the swtch statement antipattern and how to replace it with polymorphism, I've been able to remove a lot of overly complex code.
