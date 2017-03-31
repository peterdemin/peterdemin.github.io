# Clean up old celery tasks from database

Celery prior to version 4 [provided Database broker](http://docs.celeryproject.org/en/3.1/getting-started/brokers/django.html)
which had poor perfomance but allowed to have background processing in Django without pains of operating RabbitMQ or Redis.
