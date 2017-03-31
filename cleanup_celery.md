# Clean up old celery tasks from database

Celery prior to version 4 [provided Database broker](http://docs.celeryproject.org/en/3.1/getting-started/brokers/django.html)
which had poor perfomance but allowed to have background processing in Django without pains of operating RabbitMQ or Redis.

One subtliety of using it is that if no of workers is serving `celery` queue, database is going to grow pretty quickly.
`celery_taskmeta` table is storing all tasks ever scheduled through celery.
And once this table grows to millions of records, deleting them (on replicated database) is no longer viable, since transaction log will overflow causing the transaction to rollback.

One solution is to split records into small batches and delete each in it's own transaction.
Choosing batch size is a nice problem - too small will make script run longer than necessary, while too big will result in error like:

```
Msg 9002, Level 17, State 2, Line 3
The transaction log for database 'Database' is full due to 'LOG_BACKUP'.
```

I adapted [Nagle's algorithm](https://en.wikipedia.org/wiki/Nagle%27s_algorithm) to this task:

* On successfull deletion batch size is increased by 5%
* On failure it is decreased by 50%

I wrapped it in django management command:

```python
import time

from django.core.management.base import BaseCommand
from django.db.models import Max, Min
from django.db.utils import ProgrammingError
from djcelery.models import TaskMeta


class Command(BaseCommand):
    help = 'Delete old celery tasks'

    def handle(self, *args, **options):
        result = TaskMeta.objects.aggregate(Max('id'), Min('id'))
        id_min, id_max = result['id__min'], result['id__max']
        self.stdout.write(
            "Total: %r, ranging from %r to %r"
            % (TaskMeta.objects.count(), id_min, id_max)
        )
        if id_min is None or id_max is None:
            self.stdout.write("Nothing to do, exiting")
            return
        id_max -= 100
        self.stdout.write("Decreased finish down to %d" % id_max)
        step = 100
        start = id_min
        while start < id_max:
            finish = start + step
            try:
                deleted, _ = TaskMeta.objects.filter(id__gte=start, id__lt=finish).delete()
                self.stdout.write(
                    "For range %d-%d deleted %d objects"
                    % (start, finish, deleted)
                )
                step = int(step * 1.05)
                start = finish
            except ProgrammingError as exc:
                self.stderr.write(str(exc))
                time.sleep(60)
                step = max(10, step / 2)
        return
```
Here's the gist: https://gist.github.com/peterdemin/aa3abb3a96e564e54771cc792f9159fa

Here is the log for batch size adaptation:

```
...
For range 771389-809999 deleted 38610 objects
For range 809999-850539 deleted 40540 objects
For range 850539-893106 deleted 42567 objects
('42000', "[42000] [FreeTDS][SQL Server]The transaction log for database 'Database' is full due to 'LOG_BACKUP'. (9002) (SQLExecDirectW)")
('42000', "[42000] [FreeTDS][SQL Server]The transaction log for database 'Database' is full due to 'LOG_BACKUP'. (9002) (SQLExecDirectW)")
('42000', "[42000] [FreeTDS][SQL Server]The transaction log for database 'Database' is full due to 'LOG_BACKUP'. (9002) (SQLExecDirectW)")
For range 893106-898692 deleted 5586 objects
For range 898692-904557 deleted 5865 objects
...
```

On the first error batch size decreased to 21283, on the second to 10641, on the third to 5586.
Each time giving server a minute to recover.
