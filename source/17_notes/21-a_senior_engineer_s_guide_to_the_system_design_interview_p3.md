# A Senior Engineer's Guide to the System Design Interview (Part 3)

Article: <https://interviewing.io/guides/system-design-interview/part-three>

## Notes

System design interview framework.

1. Gather requirements
    - Functional requirements:
      - Identify the main objects and their relations.
      - What attributes do these objects have? Are they mutable?
      - Think about access patterns. "Given object X, return all related objects Y."
        Consider the cross product of all related objects.
      - List all the requirements you’ve identified and validate with your interviewer.
      - Suggest complimentary features to demonstrate user-orientation.
    - Non-functional requirements:
      - Performance:
        - Synchronous user-facing workflows.
        - Most frequently-accessed workflows.
      - Availability:
        - Tradeoffs with cost and consistency.
      - Security
2. Data Types, API and Scale
    - List of Data Types we need to store: structured, blobs, media.
    - API for these data types, HTTP verb with endpoint path for each access pattern.
    - Scale of the data and requests the system needs to serve.
        - Tell your interviewer: "It seems like we've identified the main requirements,
          we have an API in place, and we know how the distribution of requests looks.
          If I were designing this system for real, I’d probably want to do some
          back-of-the-envelope math to estimate the number of requests
          and average volume of data we need to store.
          Do you want me to do the math or do you want me to skip it?"
        - Ballpark estimate for reads and writes per minute.
          Traffic in MB per minute.
          Storage growth in MB per minute.
3. Design
    - Tell your interviewer: "I'm going to start drawing some boxes.
      I'm just thinking out loud for now, so don't hold me to any of this.
      We can come back to it later."
    - Data storage.
        - Mention using blob storage for storing binary large objects.
        - SQL vs NoSQL dance:
            - Do we need strong consistency?
            - Do we have large volumes of unstructured data?
            - Pick one, justify the choice, move on.
        - Iterate on the storage design:
            - Add table for each entity.
            - See if all access patterns are supported.
            - Add fields/tables.
            - Check for performance bottlenecks.
              Stating your rationale followed by a subtle "what do you think?" or
              "let me know if you think I’m approaching this the wrong way"
              is the perfect balance between being independent but also collaborative.
            - Optimize read speed using prepopulated tables.
    - Microservices.
        - Caches.
        - Queues.
        - Load balancers.
    - Monitoring:
        - Metrics.
        - Alerts.
        - Logging.

## Conclusion

The process explained in the article is very close to what I experienced in interviews with many companies.
But the more I think about it, calling this a "system design interview" is a misnomer.
The term is so vague, that you can't tell what's expected of you unless you've read this guide.
The main objective seems to convince the interviewer about your seniority by the way you briefly handwave complex topics.
Just like with the coding interview, system design interview has very little to do with how you go about day-to-day work.
It's a separate skill, the ritual that shows that you've prepared for the interview process.

## Links to follow

- [Part 4](https://interviewing.io/guides/system-design-interview/part-four)
