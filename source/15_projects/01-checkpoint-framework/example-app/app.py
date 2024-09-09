import time
from functools import wraps
from datetime import datetime

import requests
from flask import Flask, g, request

app = Flask(__name__)

# CHECKPOINT_API_URL = "https://cp.demin.dev/v1/checkpoints"
CHECKPOINT_API_URL = "http://127.0.0.1:8000/checkpoints"


def send_checkpoint(data):
    try:
        response = requests.post(CHECKPOINT_API_URL, json=data)
        if response.status_code != 200:
            print(f"Failed to send checkpoint: {response.text}")
    except Exception as e:
        print(f"Error sending checkpoint: {str(e)}")


@app.before_request
def before_request():
    g.start_time = time.time()


@app.after_request
def after_request(response):
    end_time = time.time()
    elapsed_time = end_time - g.start_time

    checkpoint_data = {
        "service_name": "flask-service",
        "timestamp": datetime.utcnow().isoformat(),
        "input": {
            "method": request.method,
            "url": request.url,
            "headers": dict(request.headers),
            "body": request.get_data(as_text=True),
        },
        "output": {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "body": response.get_data(as_text=True),
        },
        "metadata": {"processing_time": elapsed_time},
    }

    # Send checkpoint asynchronously
    send_checkpoint(checkpoint_data)

    return response


# Original request method from requests
original_request_method = requests.Session.request


def instrumented_request(self, method, url, **kwargs):
    # Capture start time
    start_time = time.time()

    try:
        # Make the original request
        response = original_request_method(self, method, url, **kwargs)
        if url == CHECKPOINT_API_URL:
            return response

        # Capture end time and compute duration
        end_time = time.time()
        duration = end_time - start_time

        # Build checkpoint data
        checkpoint_data = {
            "service_name": "requests-library",
            "timestamp": datetime.utcnow().isoformat(),
            "input": {
                "method": method,
                "url": url,
                "headers": dict(kwargs.get("headers", {})),
                "body": kwargs.get("data", None),
            },
            "output": {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": response.text,
            },
            "metadata": {"request_duration": duration},
        }

        # Send checkpoint data
        send_checkpoint(checkpoint_data)

        return response

    except Exception as e:
        # Handle errors and send failure data
        end_time = time.time()

        checkpoint_data = {
            "service_name": "requests-library",
            "timestamp": datetime.utcnow().isoformat(),
            "input": {
                "method": method,
                "url": url,
                "headers": dict(kwargs.get("headers", {})),
                "body": kwargs.get("data", None),
            },
            "output": {"error": str(e)},
            "metadata": {"request_duration": end_time - start_time},
        }

        send_checkpoint(checkpoint_data)
        raise


# Monkey-patch the requests library
requests.Session.request = instrumented_request


def checkpoint_decorator(service_name="generic-service"):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Capture start time
            start_time = time.time()

            try:
                # Capture function input
                input_data = {"args": args, "kwargs": kwargs}

                # Execute the original function
                result = func(*args, **kwargs)

                # Capture end time
                end_time = time.time()

                # Build checkpoint data
                checkpoint_data = {
                    "service_name": service_name,
                    "timestamp": datetime.utcnow().isoformat(),
                    "input": input_data,
                    "output": result,
                    "metadata": {"execution_duration": end_time - start_time},
                }

                # Send checkpoint
                send_checkpoint(checkpoint_data)

                return result

            except Exception as e:
                # Handle exceptions and send checkpoint for failure
                end_time = time.time()

                checkpoint_data = {
                    "service_name": service_name,
                    "timestamp": datetime.utcnow().isoformat(),
                    "input": {"args": args, "kwargs": kwargs},
                    "output": {"error": str(e)},
                    "metadata": {"execution_duration": end_time - start_time},
                }

                send_checkpoint(checkpoint_data)
                raise

        return wrapper

    return decorator


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
    return {"message": process(request.json)}


@checkpoint_decorator()
def process(payload):
    return {'square': payload.get('number', 0) ** 2}


if __name__ == "__main__":
    app.run(debug=True)
