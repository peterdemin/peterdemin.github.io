# Ignominious Python timezones

A good old timezone battle.

Here's the glitch. If your local timezone is US/Pacific (PST):

```
>>> from pytz import timezone
>>> TIMEZONE = timezone("America/Los_Angeles")

>>> datetime.datetime(2025, 1, 1).astimezone(TIMEZONE).isoformat()
'2025-01-01T00:00:00-08:00'

>>> datetime.datetime(2025, 1, 1, tzinfo=TIMEZONE).isoformat()
'2025-01-01T00:00:00-07:53'
```

Same code running with the local timezone set to UTC (like on a server):

```
>>> datetime.datetime(2025, 1, 1).astimezone(TIMEZONE).isoformat()
'2024-12-31T16:00:00-08:00'

>>> datetime.datetime(2025, 1, 1, tzinfo=TIMEZONE).isoformat()
'2025-01-01T00:00:00-07:53'
```

Python documentation on [astimezone](https://docs.python.org/3/library/datetime.html#datetime.datetime.astimezone):

> `datetime.astimezone(tz=None)`
>
> Return a datetime object with new tzinfo attribute tz, adjusting the date and time data so the result is the same UTC time as self, but in tz’s local time.
>
> If provided, tz must be an instance of a tzinfo subclass, and its utcoffset() and dst() methods must not return None.
> If self is naive, it is presumed to represent time in the system time zone.
>
> If called without arguments (or with tz=None) the system local time zone is assumed for the target time zone.
> The .tzinfo attribute of the converted datetime instance will be set to an instance of timezone with the zone name and offset obtained from the OS.
>
> If self.tzinfo is tz, self.astimezone(tz) is equal to self: no adjustment of date or time data is performed.
> Else the result is local time in the time zone tz, representing the same UTC time as self:
> after astz = dt.astimezone(tz), astz - astz.utcoffset() will have the same date and time data as dt - dt.utcoffset().
>
> If you merely want to attach a timezone object tz to a datetime dt
> without adjustment of date and time data, use dt.replace(tzinfo=tz).
> If you merely want to remove the timezone object from an aware datetime dt
> without conversion of date and time data, use dt.replace(tzinfo=None).

Let's apply this doc to the examples.
For the user device case, having local timezone set to PST,
`datetime.datetime(2025, 1, 1)` is a naive datetime, having `self.tzinfo=None`,
no adjustment of date or time data is performed, because the target timezone is the same as local:

```
>>> datetime.datetime(2025, 1, 1).astimezone(TIMEZONE).isoformat()
'2025-01-01T00:00:00-08:00'
```

Okay. when timezone is passed directly as tzinfo, we get the weird offset:

```
>>> datetime.datetime(2025, 1, 1, tzinfo=TIMEZONE).isoformat()
'2025-01-01T00:00:00-07:53'
```

The reason is explained on [SO](https://stackoverflow.com/a/50613134/135079):

> A pytz timezone class does not represent a single offset from UTC, it represents a geographical area which,
> over the course of history, has probably gone through several different UTC offsets.
> The oldest offset for a given zone, representing the offset from before time zones were standardized
> (in the late 1800s, most places) is usually called "LMT" (Local Mean Time),
> and it is often offset from UTC by an odd number of minutes.

In other words, this is not the intended usage, `pytz.timezone` is incompatible with datetime's `tzinfo`.
Another quote, from `pytz`:

> Unfortunately using the tzinfo argument of the standard datetime constructors
> "does not work" with pytz for many timezones.

Unfortunately, indeed.

And for the last mystery, when server runs with local timezone set to UTC:

```
>>> datetime.datetime(2025, 1, 1).astimezone(TIMEZONE).isoformat()
'2024-12-31T16:00:00-08:00'
```

The naive datetime inherits UTC timezone from the environment, so the result is shifted by 8 hours back.

The proper way of attaching timezone information to a naive datetime is using `pytz.localize`:

```
>>> pytz.timezone('US/Pacific').localize(datetime.datetime(2025, 1, 1)).isoformat()
'2025-01-01T00:00:00-08:00'
```

And if you try following Python docs and use `dt.replace`, you'll see the same pytz incompatibility:

```
>>> datetime.datetime(2025, 1, 1).replace(tzinfo=pytz.timezone('US/Pacific')).isoformat()
'2025-01-01T00:00:00-07:53'
```
