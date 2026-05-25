# Expect the unexpected when excepting Pickling Exceptions

## Background

Python's builtin [pickle](https://docs.python.org/3/library/pickle.html) module allows saving and restoring object hierarchies.
Given that (almost) everything is an Object in Python, this feature enables a lot of imaginative uses.

Here I cover a gotcha, that arises when you try to pickle a user-defined Exception class with a overriden `__init__` signature.

Normally, inheritance with initializer override works well in Python.
To illustrate this, here is an example of user-defined class pickling:


```python
In [1]: import pickle
In [2]: class A:
   ...:     def __init__(self, x):
   ...:         self.x = x
   ...:

In [3]: pickle.dumps(A(1))
Out[3]: b'\x80\x04\x95\x1f\x00\x00\x00\x00\x00\x00\x00\x8c\x08__main__\x94\x8c\x01A\x94\x93\x94)\x81\x94}\x94\x8c\x01x\x94K\x01sb.'

In [4]: pickle.loads(pickle.dumps(A(1)))
Out[4]: <__main__.A at 0x1036abd60>
```

And here's pickling with inheritance:

```python
In [7]: class B(A):
   ...:     def __init__(self, x, y):
   ...:         self.y = y
   ...:         super().__init__(x)
   ...:

In [8]: pickle.loads(pickle.dumps(B(1, 2))).x
Out[8]: 1

In [9]: pickle.loads(pickle.dumps(B(1, 2))).y
Out[9]: 2
```

Also, `Exception` are perfectly picklable, too:

```python
In [10]: pickle.loads(pickle.dumps(Exception("abc")))
Out[10]: Exception('abc')
```

## Problem

The issue arises when inheriting from the `Exception` class:

```python
In [11]: class E(Exception):
    ...:     def __init__(self, m, x):
    ...:         self.x = x
    ...:         super().__init__(m)
    ...:

In [12]: pickle.loads(pickle.dumps(E('abc', 42)))
---------------------------------------------------------------------------
TypeError                                 Traceback (most recent call last)
Cell In[12], line 1
----> 1 pickle.loads(pickle.dumps(E('abc', 42)))

TypeError: __init__() missing 1 required positional argument: 'x'
```

The reason for this is that `BaseException` [overrides](https://github.com/python/cpython/blob/5a90de0d4cbc151a6deea36a27eb81b192410e56/Objects/exceptions.c#L142-L150) `__reduce__` method:

```C
/* Pickling support */
static PyObject *
BaseException_reduce(PyBaseExceptionObject *self, PyObject *Py_UNUSED(ignored))
{
    if (self->args && self->dict)
        return PyTuple_Pack(3, Py_TYPE(self), self->args, self->dict);
    else
        return PyTuple_Pack(2, Py_TYPE(self), self->args);
}
```

where `self->args` is the positional arguments passed to the `BaseException.__init__` method,
which is obviously different from arguments passed to `E`. 

This means, that all classes that inherit from Exception must have the same set of positinal arguments.

## Solution One

The `__reduce__` method can return a [great deal of different options](https://docs.python.org/3/library/pickle.html#object.__reduce__).
In this case, it returns the class type (`Py_TYPE(self)`), the args (`self->args`), and the state (`self->dict`).

In this case, we don't need the state, as the `__init__` defines it completely.
The simple override looks like this:

```python
In [11]: from typing import Tuple

In [12]: class E(Exception):
    ...:     def __init__(self, m, x):
    ...:         super().__init__(m)
    ...:         self.x = x
    ...:
    ...:     def __reduce__(self) -> Tuple[type, tuple]:
    ...:         return (self.__class__, (self.args[0], self.x))
    ...:

In [13]: pickle.loads(pickle.dumps(E('abc', 42)))
Out[13]: __main__.E('abc')

In [24]: pickle.loads(pickle.dumps(E('abc', 42))).x
Out[24]: 42
```

This works, but the string representation of `E` contains only the argument passed to base `Exception`.

## Solution Two

Alternatively, pass all arguments in the overriden class to base.

```python
In [14]: class E(Exception):
    ...:     def __init__(self, m, x):
    ...:         super().__init__(m, x)
    ...:

In [15]: pickle.loads(pickle.dumps(E('abc', 42)))
Out[15]: __main__.E('abc', 42)
```

If you have more classes in the inheritance chain, you need to make sure they all work with the same arguments.
