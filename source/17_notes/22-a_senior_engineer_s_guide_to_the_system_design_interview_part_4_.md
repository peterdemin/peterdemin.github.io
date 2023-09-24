# A Senior Engineer's Guide to the System Design Interview (Part 4)

Article: <https://interviewing.io/guides/system-design-interview/part-four>

## Notes

- Going through example designs as an exercise for the framework.
- Using Pastebin as a simplest example.
- Gather requirements:
    - Starting with functional requirements. Objects and their interactions.
    - The data is immutable for simplicity.
    - Extra considerations: analytics, monetization, legal.
    - Non-functional requirements: availability, consistency, durability, scalability, latency.
    - Check with interviewer if you missed something.
    - Estimates are used to justify building a complex distributed system.
      Ask your interviewer if they’d like to see some calculations.
    - Estimate storage and bandwidth. Use 100K seconds per day (15% error).
- Data Types, API and Scale:
    - Using NoSQL database, because transactions and joins are not needed.
    - Explaining API as RESTful, because there's no batching, streaming, and push notifications.
    - Iterating to add mutability.
- Design:
    ???
- Suddenly, topic switches to a distributed Unique ID generation.
- A lot of math to say "use 128-bit keys, possibly UUID4."
- Jump to "AOL Instant Messenger."
- Functional requirements: have auth, send messages.
- Non-functional requirements: eventual consistency, high availability, durability.
- Skipped data types, API, and scale.
- Design. Classic sandwich: load-balancer, middleware, sharded replicated database.
- Jump to "Design Ticketmaster" (Trying on my own before reading.)
    - Organizers create events.
    - People buy tickets and attend events.
    - Entities: organizer, person, event, ticket.
    - Functional requirements:
        - Organizer creates event and sets the numbers and kinds of available tickets.
        - Organizer can list their (immutable) events.
        - Person can list and filter (search) available events.
        - Person can purchase a ticket for an event. Reservation?
        - Person can view purchase history.
        - Venue stuff can punch tickets.
        - Extra: return tickets, cancel events, change events, transfer tickets.
    - Non-functional requirements:
        - Strict consistency: no double-booking.
        - High availability.
        - Fast purchase, event creation can be slower.
        - High durability for upcoming events. Not so much for past events.
    - Data storage:
        - Organizer: contract, collateral.
        - Events: date, description, images, videos. Comments?
        - Venues: sitting plan.
        - Tickets: price, amount, type/name, sit number, virtual.
        - People: email, payment method, notifications, promotions.
        - SQL database for structured data, Blob storage for media.
        - Seat occupancy cache.
        - Shard by event.
    - API:
        - POST /event/
        - GET /event/{event_id}/
        - GET /event/{event_id}/ticket/
        - POST /event/{event_id}/ticket/
        - GET /event/{event_id}/ticket/{ticket_id}/
        - GET /ticket/
        - GET /search/event/?location=...&dates=...
    - Scalability:
        - Traffic is spiky, hot events will have thousands of users trying to by tickets as as they're available.
        - 10K RPM for sales.
        - Several events launching at the same time.
        - Read-only fallback
        - Synchronous replication from leader
        - Replicas close-by
    - Design:
       - Services
        ```{eval-rst}
        .. digraph:: services

            edge [color="#808080", arrowsize=.6, penwidth=3, minlen=3];
            node [shape=box, fontname="DIN Next, sans-serif", style="rounded,filled", penwidth=5, fillcolor="#8010d0", color="#f0f0f0", fontcolor=white,  margin="0.35" fontweight=bold]
            bgcolor="#f0f0f0";

            User -> "Load Balancer" -> Backend -> "SQL Database"
            User -> CDN -> "Blob storage"
            Backend -> "Blob storage"
            Backend -> Cache
            User -> CDN -> Cache (pub/sub)
        ```

       - Database
        ```{eval-rst}
        .. digraph:: database

            edge [color="#808080", arrowsize=.6, penwidth=3, minlen=3];
            node [shape=box, fontname="DIN Next, sans-serif", style="rounded,filled", penwidth=5, fillcolor="#8010d0", color="#f0f0f0", fontcolor=white,  margin="0.35" fontweight=bold]
            bgcolor="#f0f0f0";

            Users
            Events
            Seats
            Tickets

            Users -> Seats [label="1 to many"]
            Users -> Tickets [label="1 to many"]
            Events -> Seats [label="1 to many"]
            Events -> Tickets [label="1 to many"]
            Tickets -> Seats [label="1 to 1"]
        ```
       - Tickets:
          - event_id
          - seat_id
          - reserved_by
          - reserved_at
          - purchased_by

## Conclusion

Exercises helped with understanding the steps of the framework better.
Following the process demonstrates a systematic approach to design.
Guide references to differences between junior, senior, and staff engineers,
but doesn't provide a good framework for what you should be looking out for
to demonstrate your seniority.

## Links to follow

- [Birthday paradox](https://brilliant.org/wiki/birthday-paradox/)
- [BASE and ACID](https://phoenixnap.com/kb/acid-vs-base)
- CAP
