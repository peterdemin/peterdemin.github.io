# Checkpoint framework

## Idea

### Context

In service-oriented architecture one user action (or scenario)
involves services calling other services, creating a tree of calls.
It's hard to tell what are the exact inputs and output for each call
without having access to the detailed logs.
And almost impossible to tell what are the possible inputs to something
sitting in between of other services just by looking at the code.

In well-designed architecture, each component knows very little about other.
It helps with managing complexity, and changing each component separately.
Contrary to the component, its developer needs to understand the overall system
to make the right design choices, and foresee problems.
But when looking at the code, a new team member can only infer what components know,
not what they need to know.
This knowledge lives in documentation and heads of people who built the system.

### Problem

When looking at underdocumented untested component,
it's sometimes hard to tell what are the example inputs and expected outputs.
Component here means an API, a class, or a function.

### Solution

Have checkpoint annotations throughout the code, that record inputs and outputs of the components.
The checkpoint system runs more or less fixed set of scenarios, and records data as it passes through each checkpoint.
The recorded data is made available to the code as static test assets.

The recording is automated and regular.
Developers add new scenarios to cover new features.
When the inputs or outputs of the existing checkpoint change, the test assets are automatically updated, and the developers are alerted about the change (along with the result of the test run).

### Design

The checkpoint service has two parts:

1. Ingestion API, that receives checkpoint data from product components, and stores them to a database.
2. User Interface to review the stored checkpoint trees and export them as test assets.

Each language runtime that exports checkpoints has framework-specific library.
The library has a few parts:

1. Expose a control endpoint that enables/disables checkpointing.
2. Instrument the web framework to automatically record request and response data.
3. Instrument the client library to record outbound requests.
4. Instrument SQL framework to record raw queries and their output.
5. Provide decorator to checkpoint critical parts of the internal processing.
6. Testing-time library to load the previously recorded assets.

### Similarity with Open Telemetry

[Open Telemetry](https://opentelemetry.io/docs/what-is-opentelemetry/) provides similar functionality but with a different focus.
It captures performance metrics while having limited payload.
The purpose is to provide visibilty into the production runtime.

The checkpoint, on the other hand, is disabled most of the time,
only recording complete data flow in a more focused setting.
The performance is not critical during the recording sessions.

### Similarity with VCR-like test libraries

[VCR.py](https://vcrpy.readthedocs.io/en/latest/) partially implements the checkpoint system,
but lacks cross-service interactions.
Focusing on the outbound calls, it helps with canning integration tests, improving reliability.
It also helps with catching a drift in external API output.
The test assets also serve as a documentation for the parts of code that a paricularly opaque in what passes through them.

### Contract testing aspect

Contract testing is a related concept, that uses the recorded API calls, and allows isolated testing of cross-service interactions.
It doesn't define the process of acquiring the test assets, and catching the drift, though.

## Limitations

After trying to apply checkpoint framework prototype to a big and messy project, I discovered a few setbacks.
The common issue for all of them was non-determinism.
The same HTTP request produces different result when repeated, or executed on the next day.
The reason for that is usage of random identifiers and timestamps.
It's possible to record all API calls, and all database access.
But if application is generating different queries every time, mocking becomes complicated.

Consider the following example:

```python
def good_luck_contract_testing():
    return random.random() > 0.5
```

Another challenge is read&write persistence layer, particularly cache.
The first read returns nothing, the second read for the same key returns something because there was a write call in between.
It seems that for the persistence layer, database fixtures is a better approach.
However, generating such fixtures for each recording is a separate challenge.

## Conclusion

The checkpoint framework is currently on pause until I find a project where it's useful.

## Links

Few projects I found while researching ideas for the checkpoint framework:

1. https://docs.pact.io - Contract testing for HTTP and message integrations.
2. https://pypi.org/project/pytest-snapshot/ - Pytest plugin for snapshot testing.
3. https://github.com/ditrit/specimen - Yaml-based data-driven testing.

My implementation for the checkpoint framework is open-sourced here: https://github.com/peterdemin/i8t
