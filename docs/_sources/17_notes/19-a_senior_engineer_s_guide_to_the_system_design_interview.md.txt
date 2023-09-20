# A Senior Engineer's Guide to the System Design Interview

Article: <https://interviewing.io/guides/system-design-interview>

## Notes

1. It's a common saying: "there are no correct answers".
   What it omits is that there are certainly incorrect ones.
2. You have to show your interviewer that you:
    a. Understand the fundamentals of a system (end to end).
    b. Should be able to name and explain at a high level each part of the system.
    c. Describe the tradeoffs you make.
    d. Find a solution.
3. High signals:
    a. A broad, base-level understanding of system design fundamentals.
    b. Back-and-forth about problem constraints and parameters.
    c. Well-reasoned, qualified decisions based on engineering trade-offs.
    d. A holistic view of a system and its users.
4. Low signals:
    a. Assumptions about the prompt.
    b. Specific answers with ironclad certainty.
    c. A predefined path from the beginning to end of the problem.
    d. Strictly technical considerations.
5. The initial prompt has many gaps. The first task is to uncover and fill them.
   The common questions to ask:
   - Who are the users, who many?
   - What are the entities in play? What are their interactions?
   - How big is the data?
   - What is the expected traffic?
6. Well-reasoned, qualified decisions based on engineering trade-offs.
7. Interviewers test for approach and first-principles thinking.
   They don't test for knowledge and experience with particular technology.
   But then, the two are connected, and you can't really do one without another.
8. The format of the interview is a talk, but just talking won't get you nowhere.
   You must engage in deep thinking and take your time before you speak.
9. Everything interviewer says is a hint.
   Whether a question or a comment, it's an important signal.
   Missing a cue is a red flag in the scorecard.
   Don't ignore anything.
   If you can't act on the new information immediately, acknowledge it and get back to it later.
10. Don't push back, don't disagree.
    Even if you're right, this most likely will be a low light in the scorecard.
11. Demonstrate collaborative attitude by asking questions and seeking feedback.
    Try to establish a tone as if you were working through a problem with a coworker rather than proving yourself to an interviewer.
12. Senior candidates are expected to drive the interview.
    As if they are the interviewer themselves.
13. Be general about technologies.
    It's best to avoid any brand names, unless are you are an industry expert and go far on internals and comparison to competitors.
    Don't say DynamoDB, say NoSQL database, or Key-Value store.
    Don't say Kafka, say queue.
    Even when Kafka is a good choice, calling it out is a low signal on the scorecard.
14. When talking about database in particular, call out the tradeoffs of SQL vs NoSQL.
    Because, that's what people love to hear.
    Again, don't say Postgres or Cassandra.
15. After explaining the choice and pros and cons, make a decision.
    You can alter it later, but the choice has to be made.
16. Making a decision without explaining the choice is a low light on the scorecard.
17. Explaining the choice without making a decision is a low light on the scorecard.

## Conclusion

1. Interviewer tries to fill in a scorecard for the candidate's character based on a single data point.
2. That's impossible, obviously. So, they use proxies.
3. Did the candidate understand the fundamentals of a system by filling the prompt gaps?
4. Did they name and explain at a high level each part of the system.
5. Did they describe the tradeoffs?
6. Were they receptive to feedback?
7. Did they drive the interview process?

## Links to follow

- [How to conduct a system design interview](https://robertovitillo.com/how-to-conduct-a-system-design-interview/)
- [Part 2](https://interviewing.io/guides/system-design-interview/part-two)
