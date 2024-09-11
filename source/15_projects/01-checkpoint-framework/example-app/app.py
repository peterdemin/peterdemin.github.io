import time
import json
import logging
from functools import wraps

import requests
import flask

app = flask.Flask(__name__)
logger = logging.getLogger(__name__)

# CHECKPOINT_API_URL = "https://api.demin.dev/cp/checkpoints/example"
CHECKPOINT_API_URL = "http://127.0.0.1:8000/cp/checkpoints/example"


class CheckpointClient:
    def __init__(self, session: requests.Session, api_url: str, name: str) -> None:
        self.api_url = api_url
        self._session = session
        self._name = name

    def send(self, data):
        try:
            response = self._session.post(self.api_url, json=data)
            if response.status_code != 200:
                logger.error("Failed to send checkpoint: %r", response.text)
        except Exception as e:
            logger.exception("Error sending checkpoint")

    def make_checkpoint(self, location: str, input_data: dict, output_data: dict, duration: float) -> None:
        return {
            "location": f"{self._name}/{location}",
            "timestamp": time.time(),
            "input": json.dumps(input_data),
            "output": json.dumps(output_data),
            "metadata": {"duration": duration},
        }


class FlaskCheckpoint:
    def __init__(self, client: CheckpointClient) -> None:
        self._client = client

    def register(self, app: flask.Flask) -> None:
        app.before_request(self.before_request)
        app.after_request(self.after_request)

    def before_request(self) -> None:
        flask.g.start_time = time.time()

    def after_request(self, response: flask.Response) -> flask.Response:
        self._client.send(self._client.make_checkpoint(
            "flask",
            {
                "method": flask.request.method,
                "url": flask.request.url,
                "headers": dict(flask.request.headers),
                "body": flask.request.get_data(as_text=True),
            },
            {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": response.get_data(as_text=True),
            },
            time.time() - flask.g.start_time,
        ))
        return response


class RequestsCheckpoint:
    def __init__(self, client: CheckpointClient) -> None:
        self._client = client
        self._original_request = requests.Session.request
        self._session = requests.Session()

    def register(self) -> None:
        requests.Session.request = self.instrumented_request

    def instrumented_request(self, method, url, **kwargs):
        if url == self._client.api_url:
            return self._original_request(self._session, method, url, **kwargs)
        start_time = time.time()
        try:
            response = self._original_request(self._session, method, url, **kwargs)
        except Exception as e:
            self._client.send(self._client.make_checkpoint(
                "requests",
                {
                    "method": method,
                    "url": url,
                    "headers": dict(kwargs.get("headers", {})),
                    "body": kwargs.get("data", None),
                },
                {"error": str(e)},
                time.time() - start_time,
            ))
            raise
        self._client.send(self._client.make_checkpoint(
            "requests",
            {
                "method": method,
                "url": url,
                "headers": dict(kwargs.get("headers", {})),
                "body": kwargs.get("data", None),
            },
            {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": response.text,
            },
            time.time() - start_time,
        ))
        return response


class CheckpointDecorator:
    instance = None

    def __init__(self, client: CheckpointClient) -> None:
        self._client = client

    def register(self) -> None:
        self.__class__.instance = self

    def wrapper(self, func, *args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
        except Exception as e:
            self._client.send(self._client.make_checkpoint(
                func.__name__,
                {"args": args, "kwargs": kwargs},
                {"error": str(e)},
                time.time() - start_time,
            ))
            raise
        self._client.send(self._client.make_checkpoint(
            func.__name__,
            {"args": args, "kwargs": kwargs},
            result,
            time.time() - start_time,
        ))
        return result


def checkpoint_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if CheckpointDecorator.instance:
            return CheckpointDecorator.instance.wrapper(func, *args, **kwargs)
        return func(*args, **kwargs)
    return wrapper


@app.route("/example", methods=["GET", "POST"])
def example_route():
    requests.post(
        app.url_for("another", _external=True),
        json={"number": 7},
        timeout=1.0,
    )
    return {"message": "This is an example route."}


@app.route("/another", methods=["GET", "POST"])
def another():
    return {"message": process(flask.request.json)}


@checkpoint_decorator
def process(payload):
    return {'square': payload.get('number', 0) ** 2}


if __name__ == "__main__":
    checkpoint_client = CheckpointClient(requests.Session(), CHECKPOINT_API_URL, "app")
    FlaskCheckpoint(checkpoint_client).register(app)
    RequestsCheckpoint(checkpoint_client).register()
    CheckpointDecorator(checkpoint_client).register()
    app.run(debug=True)
