# Mutable types in Pydantic default values

## Observation

When going through FastAPI documentation, one thing caught my eye and raised a wave of butthurt from the past.

[Path Operation Configuration](https://fastapi.tiangolo.com/tutorial/path-operation-configuration/#summary-and-description) chapter references Pydantic model.
In the model, it defines a `tags` field with a default set to an empty `set()`.

```python
from pydantic import BaseModel

class Item(BaseModel):
    tags: set[str] = set()
```

In Python sets are mutable, and default values are initialized in-place during initial parsing.
Which means, that the same `set` object will be used for all future instances of `Item`.

Except, it won't. A quick check to confirm it:

```python
In [1]: from pydantic import BaseModel

In [2]: class Item(BaseModel):
   ...:     tags: set[str] = set()
   ...:

In [4]: item = Item()

In [5]: item2 = Item()

In [6]: item.tags.add('x')

In [7]: item2.tags
Out[7]: set()
```

How's that possible? The answer is, of course, inside of Pydantic internals.

## Investigation

Here's the implementation of [FieldInfo.get_default](https://github.com/pydantic/pydantic/blob/v2.4.2/pydantic/fields.py#L493-L511) method:

```python
if self.default_factory is None:
    return _utils.smart_deepcopy(self.default)
elif call_default_factory:
    return self.default_factory()
else:
    return None
```

We can see, that unless explicitely overriden, a field uses `smart_deepcopy` to provide a default value for the new instance.

And here's what [smart_deepcopy](https://github.com/pydantic/pydantic/blob/v2.4.2/pydantic/_internal/_utils.py#L301-L317) does:

```python
def smart_deepcopy(obj: Obj) -> Obj:
    """Return type as is for immutable built-in types
    Use obj.copy() for built-in empty collections
    Use copy.deepcopy() for non-empty collections and unknown objects.
    """
    obj_type = obj.__class__
    if obj_type in IMMUTABLE_NON_COLLECTIONS_TYPES:
        return obj  # fastest case: obj is immutable and not collection therefore will not be copied anyway
    try:
        if not obj and obj_type in BUILTIN_COLLECTIONS:
            # faster way for empty collections, no need to copy its members
            return obj if obj_type is tuple else obj.copy()  # tuple doesn't have copy method
    except (TypeError, ValueError, RuntimeError):
        # do we really dare to catch ALL errors? Seems a bit risky
        pass

    return deepcopy(obj)  # slowest way when we actually might need a deepcopy
```

It checks a ~list~ set of known immutable types, that are safe for being defaults.
And it has a set of builtin collections that can be copied fast when empty.
And for all the rest it's using `deepcopy`.

## Reflection

Pydantic models have a different implicit way of handling default values.
Unlike Python, Pydantic favors correctness over performance.
Arguably, Pydantic's behavior is more forgiving for beginners.
If someone is just starting to learn Python by the way of building FastAPI backends,
they might save themselves hard times debugging cross-request data leakage.

As a down-side, they might learn a wrong lesson about default values in Python.
Using mutable object as a default value for a function parameter is still a dangerous bug
everywhere outside of Pydantic fields definition.

And for the experienced Python developers, this means increased [intrinsic cognitive load](/17_notes/11-cognitive_load_is_what_matters.md) to distinguish implicit behavior inside and outside of Pydantic.

## Recommendation

When using mutable objects as Pydantic fields' default value, use `default_factory` to highlight the dynamic nature of the object, and make the handling explicit.
Example:

```
from pydantic import BaseModel

class Item(BaseModel):
    tags: set[str] = Field(default_factory=set)
```

