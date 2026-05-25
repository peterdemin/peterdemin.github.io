# Two-faced JSONField

My team develops a rather complex Django service, that uses
`django-jsonfield` in multiple places for some while.

Recently we added a new feature - sending invitation emails.
It was rather simple task, because we took magnificient `django-post-office`.
Everything went fine, until we realized that unit tests for models,
that has JSONFields started to fail with cryptic errors.

Turned out, that `django-post-office` depends on `jsonfield` package.
And this package is slightly different from the one we already use.
They conflict, because both packages install into `jsonfield` directory.
They have exactly the same public interface and are interchangeble in most cases.
And `pip` does nothing to handle or detect this conflict and mixes both
packages into single directory producing unpredictable Frankenshtein.

I dug a little summary on them:

1. Maintainer: Dan Koch
   Source: https://github.com/dmkoch/django-jsonfield
   Current Version: 2.0.2
   PyPI: https://pypi.python.org/pypi/jsonfield

2. Maintainer: Matthew Schinckel
   Source: https://bitbucket.org/schinckel/django-jsonfield
   Current version: 1.0.1
   PyPI: https://pypi.python.org/pypi/django-jsonfield

Post office uses the first one, by Dan Koch. It perfectly fulfills their needs.
But it doesn't work correctly with `django.utils.model_to_dict` - it
returns dumped JSON string representation, instead of object.

Here is the code responsible for this [mis]behavior:

https://github.com/dmkoch/django-jsonfield/blob/master/jsonfield/fields.py#L110

```
def value_from_object(self, obj, dump=True):
    value = super(JSONFieldBase, self).value_from_object(obj)
    if self.null and value is None:
        return None
    return self.dumps_for_display(value) if dump else value
```

It dumps value by default, while model_to_dict expects it
to return value unchanged.

JSONField by Matthew Schinckel doesn't override `value_from_object`
and works as Django expects.

Once we discovered the full story we had three options:

1. Switch from `django-post-office` to another library
   that doesn't have dependency conflicts.
2. Extract email sending to separate service and remove dependency conflict.
3. Inherit Koch's jsonfield and override problematic method. 

I went with option 3.
At the same time I opened a PR to `django-post-office`
to switch to the one and true `django-jsonfield`.
