Title: Beauty of Python's collections module
Date: Sun Mar 6 15:16:19 EST 2016
Category: Python

Python is [famed](https://en.wikipedia.org/wiki/Duck_typing#In_Python) for embracing duck typing.
It is nice idea in a number of ways, allowing functions to work equally well with
lists, sets, dictionary keys, or whatever user-defined object if it provides `__iter__` method.
However sometimes we want to distinguish between types of arguments.
Good example is recursive operations on nested structures.
Consider function, that recursively deletes all dictionary items with `None` values.

Here is how it could be written for reduced non-recursive case:

    def without_empty(data):
        return {key: value
                for key, value in data.items()
                if value is not None}

Now if we want to remove `None` values in nested dictionaries, we will add recursion:

    def without_empty(data):
        return {key: without_empty(value)
                for key, value in data.items()
                if value is not None}

Obviosly this new function will not work, because if value is not a dict,
`AttributeError` will be raised in call to `items` method.

So function need some way to distinguish between dictionaries and other values.
Naive duck-typing solution could look like this:

    def without_empty(data):
        if hasattr(data, 'items'):
            return {key: without_empty(value)
                    for key, value in data.items()
                    if value is not None}
        else:
            return data

So far so good, checking with nested dictionary gives correct result:

    >>> without_empty({1: {2: None, 4: 5}, 3: None})
    {1: {4: 5}}

However, what if function has to support lists of dictionaries too?
Current version will just ignore None values in lists:

    >>> without_empty([{1: None}])
    [{1: None}]

Let's add check for lists:

    def without_empty(data):
        if hasattr(data, 'items'):
            return {key: without_empty(value)
                    for key, value in data.items()
                    if value is not None}
        elif hasattr(data, '__iter__'):
            return [without_empty(item)
                    for item in data]
        else:
            return data

Function works fine, giving expected result for complex case:

    >>> without_empty({1: [6, {2: None, 7: 8}], 3: None})
    {1: [6, {7: 8}]}

But code now is hard to follow and tricky to update.
Because second condition is depending on the first one - both `dict` and `list` provide `__iter__` method.
Also first check uses public method `items`, but second - internal helper `__iter__`,
which looks like hacking.

And here comes [collections.abc] (Just [collections] in Python 2) providing number of
abstract base classes that can be used to test whether a class provides a particular interface;
for example, whether it is hashable or whether it is a sequence.

Here is version of our function, that utilizes abstract classes:

    from collections import Mapping, Set, Sequence

    def without_empty(data):
        if isinstance(data, Mapping):
            return {key: without_empty(value)
                    for key, value in data.items()
                    if value is not None}
        elif isinstance(data, (Sequence, Set)):
            return [without_empty(item)
                    for item in data]
        else:
            return data

At this point you may have question, how is it possible that built-in
`dict` class is an instance of some deep burried `collections.abc.Mapping`?
The answer is easy: it is not. And that's why I decided to write about this module.

In Python it is type's responsiblity to decide if some object instantiates it.
The mechanics are descrived in detail in documentation to [abc] module.

In short abstract base class defines must define method `__subclasshook__`,
which may look something like this for Mapping class:

    @classmethod
    def __subclasshook__(cls, C):
        if cls is Mapping:
            if any('items' in B.__dict__
                   for B in C.__mro__):
                return True
        return NotImplemented

`isinstance` calls this method and magic happens - object becomes
an instance of a class that it never heard of.

[collections.abc]: https://docs.python.org/3.6/library/collections.abc.html
[collections]: https://docs.python.org/2.7/library/collections.html
[abc]: https://docs.python.org/3.6/library/abc.html
