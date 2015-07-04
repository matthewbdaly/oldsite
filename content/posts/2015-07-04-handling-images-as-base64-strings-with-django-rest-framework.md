---
title: "Handling images as base64 strings with Django REST Framework"
date: 2015-07-04 13:01:40 +0100
categories:
- python
- django
- djangorestframework
---

I'm currently working on a Phonegap app that involves taking pictures and uploading them via a REST API. I've done this before, and I found at that time that the best way to do so was to fetch the image as a base-64 encoded string and push that up, rather than the image file itself. However, the last time I did so, I was using Tastypie to build the API, and I've since switched over to Django REST Framework as my API toolkit of choice.

It didn't take long to find [this gist](https://gist.github.com/yprez/7704036) giving details of how to do so, but it didn't work as is, partly because I was using Python 3, and partly because the `from_native` method has gone as at Django REST Framework 3.0. It was, however, straightforward to adapt it to work. Here's my solution:

```python
import base64, uuid
from django.core.files.base import ContentFile
from rest_framework import serializers


# Custom image field - handles base 64 encoded images
class Base64ImageField(serializers.ImageField):
    def to_internal_value(self, data):
        if isinstance(data, str) and data.startswith('data:image'):
            # base64 encoded image - decode
            format, imgstr = data.split(';base64,') # format ~= data:image/X,
            ext = format.split('/')[-1] # guess file extension
            id = uuid.uuid4()
            data = ContentFile(base64.b64decode(imgstr), name = id.urn[9:] + '.' + ext)
        return super(Base64ImageField, self).to_internal_value(data)
```

This solution will handle both base 64 encoded strings and image files. Then, just use this field as normal.
