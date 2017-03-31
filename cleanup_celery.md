# Clean up old celery tasks from database

Celery prior to version 4 [provided Database broker](http://docs.celeryproject.org/en/3.1/getting-started/brokers/django.html)
which had poor perfomance but allowed to have background processing in Django without pains of operating RabbitMQ or Redis.

One subtliety of using it is that if no of workers is serving `celery` queue, database is going to grow pretty quickly.
`celery_taskmeta` table is storing all tasks ever scheduled through celery.
And once this table grows to millions of records, deleting them (on replicated database) is no longer viable, since transaction log will overflow causing the transaction to rollback.

One solution is to split records into small batches and delete each in it's own transaction.
I wrapped it in django management command:

<script src="https://gist.github.com/peterdemin/aa3abb3a96e564e54771cc792f9159fa.js"></script>
