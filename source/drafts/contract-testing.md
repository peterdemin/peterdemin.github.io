# Contract testing

## Preface

End-to-end cross-service testing is known to be expensive in maintenance, slow in running, and not scaling well.
An alternative approach is to keep tests limited to a single service, and use smart tooling provide the same level of test coverage.

I want to explore this approach and distill the core properties of the required tooling.

## Simple scenario

React frontend making calls to Django REST API backend.
All API calls can be made stateless - response depends only on the request and not on the history of previous calls.

Common approach is to run end-to-end tests using browser automation and a set of blessed database fixtures.
Database might be an SQLite for a simple test setup.
Or PostgreSQL (or whatever) to match production setup if running test in Docker containers.
To some extent, tests can run in parallel, if each test owns an isolated set of resources.

It doesn't really sound that bad and many projects run this just fine.
If the project grows beyond a few hundreds use cases, managing such system might become harder.
Some of the symptoms:

* CI taking half an hour to run.
* Spaghetti of database fixtures that no one understands.
* Tribal knowledge of headless browser limitations and workarounds.

Alternatively, the frontend-backend interaction can be covered using contract testing approach.

For these [lack of] constraints, React frontend uses VCR-like JSON files for a backend test double.
On the other side, Django backend uses the same JSON files to run regression tests (and update the baselines).

## Complex scenario


## Challenges of scale
