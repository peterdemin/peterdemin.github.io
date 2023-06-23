# Compute time deltas with Python

Given a `times.txt` file in this format:

```
16:45:59.965 16:45:59.546
16:45:59.963 16:45:59.546
16:45:59.393 16:45:59.381
...

```

This Python script will print out the deltas between the times in the first and the second column as integer milliseconds:


```python
TODAY = datetime.date.today()

def parse(time_str: str) -> datetime.datetime:
    return datetime.datetime.combine(TODAY, datetime.time.fromisoformat(time_str))

def delta(end: str, start: str) -> int:
    return (parse(end) - parse(start)).microseconds // 1000

with open('times.txt') as fobj:
    for line in fobj:
        print(delta(*line.split()))
```
