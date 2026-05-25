# Cognitive load is what matters

Article: <https://techbeacon.com/app-dev-testing/forget-monoliths-vs-microservices-cognitive-load-what-matters>

## Notes

- Article splits cognitive load into three categories:
  1. Intrinsic - fundamental aspect of the problem space. Example: How is a class defined in Java?
  2. Extraneous - superfluous tasks unrelated directly to the problem. Example: How do I deploy this component, again?
  3. Germane - the high-value core aspects of the task. Example: How should this service interact with that service?
- Intrinsic cognitive load can be minimized by improving pattern matching through experience. 
- Extraneous cognitive load should be eliminated through better tooling.
- Germane cognitive load is what provides most value, team should optimize to spend most effort there.
- Limiting the team to own only subsysten within its cognitive capacity creates a "team-shaped" architecture that is supportable and operatable.
- Ways to minimize extraneous cognitive:
    - Explicitly define used platforms and components.
    - Eliminate obscure commands or arcane configuration options.
    - Avoid waiting for another team to provision infrastructure or to update configurations through tickets.
- Organize teams to minimize cognitive load:
    - Well-defined team interaction patterns: collaboration, x-as-a-service, and facilitating.
    - Independent stream-aligned teams.
    - Thinnest viable platform. Could be a single wiki page that defines which cloud provider services to use.
- Internal platform virtues:
    - API-first: Empower dev teams to innovate on platform features via automation.
    - Self-service over gatekeepers: Help dev teams determine their own workflow.
    - Declarative over imperative: Prefer "what" over "how."
    - Build with empathy: Understand the needs and frustrations of people using the platform.

## Conclusion

The article expands on the notion of stream-aligned teams defining the most important aspects through a lense of cognitive load.
Target autonomous independent teams, and easy to use tooling.
All the same points could be made without mentioning cognitive load, as they are common sense.
But probably, identifying the common underlying issue helps to think about it in a holistic way.

## Links to follow

- [Managing Cognitive Load for Team Learning](https://12devsofxmas.co.uk/2015/12/day-3-managing-cognitive-load-for-team-learning/)
