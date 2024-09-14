import flask
import requests
from i8t.client import IntrospectClient, IntrospectDecorator, introspect
from i8t.instrument.flask_introspect import FlaskIntrospect
from i8t.instrument.requests_introspect import RequestsIntrospect

app = flask.Flask(__name__)


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


@introspect
def process(payload):
    return {"square": payload.get("number", 0) ** 2}


if __name__ == "__main__":
    introspect_client = IntrospectClient(
        session=requests.Session(),
        api_url="https://api.demin.dev/i8t/t",
        name="app",
    )
    FlaskIntrospect(introspect_client).register(app)
    RequestsIntrospect(introspect_client).register()
    IntrospectDecorator(introspect_client).register()
    app.run(debug=True)
