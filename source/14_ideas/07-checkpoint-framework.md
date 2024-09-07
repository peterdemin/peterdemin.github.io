# Checkpoint framework

## Context

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

## Problem

When looking at underdocumented untested component, it's sometimes hard to tell what are the example
inputs and expected outputs.
Component here means an API, a class, or a function.

## Solution

Have checkpoint annotations throughout the code, that record inputs and outputs of the components.
The checkpoint system runs more or less fixed set of scenarios, and records data as it passes through each checkpoint.
The recorded data is made available to the code as static test assets.

The recording is automated and regular.
Developers add new scenarios to cover new features.
When the inputs or outputs of the existing checkpoint change, the test assets are automatically updated, and the developers are alerted about the change (along with the result of the test run).


