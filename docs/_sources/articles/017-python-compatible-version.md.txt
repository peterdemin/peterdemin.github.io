# Subtleties of Python compatible release version specifier

Python's most popular package management system - [pip](https://pypi.python.org/pypi/pip) - comes
to great help to developers and IMHO is significant part of Python's popularity.

Popular way of defining project's dependencies is using `requirements.txt` file.
For example:

    Jinja2
    PyYAML
    inflect
    six

But given solution has a serious flow - it does not define which version of package to use.
And there are [strong arguments](http://nvie.com/posts/pin-your-packages/) against this approach.
Briefly, in the long run each dependency is going to have backward incompatible release.

Python has monstrous [PEP-0440](https://www.python.org/dev/peps/pep-0440/) that describes
how to compose package version.
One thing that not widely known is that version scheme is
much more complex than 3 integers divided by dots.
Here is format definition:

```
    [N!]N(.N)*[{a|b|rc}N][.postN][.devN][+<local version label>]
```

This allows crazy stuff like `3!0.10.1.3.112314rc100500.post7dev42+deadbeef`

For end products it the most reliable solution is to pinpoint exact version using `==` operator,
so that requirements.txt becomes:

    Jinja2==2.8
    PyYAML==3.11
    inflect==0.2.5
    six==1.10.0

Here I want to advertise [pip-tools](https://github.com/nvie/pip-tools) which helps
to virtually hard-pin latest available versions.

Of course you don't want to do this for libraries.
Pip supports nice version operator called "compatible release" and it is written as `~=`.
It is tempting to think about as nearly equal. **But it's not**.
Imagine [django](https://docs.djangoproject.com/) extension,
which is known to work only with django version 1.7.
The obvious thing would be to write `django ~= 1.7`.
**WRONG**. This expression is [equivalent](https://www.python.org/dev/peps/pep-0440/#compatible-release)
to `django >= 1.7, == 1.*`, that matches every version up to major release of `django 2.0`.
Instead one should write `django ~= 1.7.0` which converts to `django >= 1.7.0, == 1.7.*`.
