# Scaling the Practice of Architecture, Conversationally

Article: <https://martinfowler.com/articles/scaling-architecture-conversationally.html>

## Problem

- Article starts at the situation where there exists a small group of architects, that are a bottleneck to decision process.
- Additionaly, the existing process involves a handoff between the architect drawing abstract diagrams, and an engineer implementing the design.
- The organization structure contradicts a simple truth:
  architecture in the heads of those writing the code, that is the most important.
  As Alberto Brandolini said: "It is the developer's assumptions which get shipped to production".

## Solution

- Introduce the Advice Process: anyone can make an architectural decision, but they must follow the process. In essense they create a document of a particular structure, outlining the proposition, and seek an advice from affected parties.
- Affected parties for each aspect of the decision making are documented as a checklist: this person for security, this for UX, that for analytics, etc.
- The Process consists of four parts:
  1. A thinking and recording tool;
  2. A time and place for conversations;
  3. A light to illuminate and guide towards a unified direction (Team-sourced Architectural Principles);
  4. A means to sense the current technical landscape and climate.
- They must document the advices received, and explore the alternatives, documenting them meticulously in the same doc.
- They don't need to actually follow each advice, and the chosen solution can contradict them.
- Org holds weekly, hour-long Architecture Advisory Forum ("AAF") primarily to seek and give advice in public, so the *architectural principles* dissiminate through the company.
- AAF is not the only place to seek advice. In the early stage of ADR, 1-1s are more efficient and allow building up a solid ADR for a quicker AAF meeting. On the other hand, AAF meeting can result in follow-up 1-1s to explore the alternatives deeper.
- Teams explicitly flag in their ADRs is not just the principles which apply, but also when their decision conflicts with one or more principles.
- (Then article went on to explaining the mechanics and benefits of running an in-house tech radar.
  That didn't resonate with me, maybe I'll revisit it later.)

## Pitfals

- Architectural failures are integral part of the decision making.
  The team feels safe to re-visit, and share the learnings.
  It embraces them, calling them out specifically and celebrating them in the AAF.
  This is a key aspect of building a learning culture.
- Some decisions never make it to ADR and AAF for many good reasons.
  When this happens, it's important to treat is as a learning opportunity, instead of falling back to old ways and taking control.
- Team (?) makes sure influence is balanced and not based on reputation, tenure or place in the hierarchy.
  Making sure quieter contributors are heard.

## Conclusion

- Advice Process is not looking for consensus, but for a broad range of inputs and voices.

## Links to follow

- [Architectural Decision Records](https://www.thoughtworks.com/radar/techniques/lightweight-architecture-decision-records)
- [Examples of ADRs](https://web.archive.org/web/20210506014629/https://upmo.com/dev/decisions/0010-som-synthetic-monitoring.html)
- [Spikes](http://www.extremeprogramming.org/rules/spike.html)
- Book by John Lewis ["Software Engineering Principles"](http://engineering-principles.onejl.uk/).
- [Architectural Fitness Functions](https://www.thoughtworks.com/radar/techniques/architectural-fitness-function)
