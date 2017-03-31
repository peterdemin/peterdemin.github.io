# Clean up old celery tasks from database

Celery prior to version 4 [provided Database broker](http://docs.celeryproject.org/en/3.1/getting-started/brokers/django.html)
which had poor perfomance but allowed to have background processing in Django without pains of operating RabbitMQ or Redis.

One subtliety of using it is that if no of workers is serving `celery` queue, database is going to grow pretty quickly.
`celery_taskmeta` table is storing all tasks ever scheduled through celery.
And once this table grows to millions of records, deleting them (on replicated database) is no longer viable, since transaction log will overflow causing the transaction to rollback.

One solution is to split records into small batches and delete each in it's own transaction.
I wrapped it in django management command:

```
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
```
Here's the gist: https://gist.github.com/peterdemin/aa3abb3a96e564e54771cc792f9159fa
