# A Senior Engineer's Guide to the System Design Interview (Part 2)

Article: <https://interviewing.io/guides/system-design-interview/part-two>

## Notes

1. The interviewer is asking themselves: "Could this person get an MVP off the ground?".
2. It's more important to cover everything than to explain small thing in detail.
   "I'm going to skip going into details for now, but if we want, we can come back to it later."
3. Good design is less important than being able to talk about the trade-offs.
4. Check in at major milestones, but not at every single decision. Milestones:
    - Finalized requirements.
    - Finished high-level design.
5. Ball-park computations are helpful, but wasting time if they are not used later.
6. Fundamental concepts:
   1. API: REST, RPC, GraphQL.
   2. Databases: SQL, NoSQL.
   3. Scaling: Vertical, horizontal.
   4. Load balancers: Round-robin, least connections.
   5. Caching: Write-through, write-behind, invalidation.
   6. Queues: at least once, at most once, ordering guarantees.
   7. Indexing: B-tree, hash.
   8. Failovers: Lost updates, leader failure detection, split-brain.
   9. Replication: sync, async.
   10. Consistent hashing: faster node number changes, log(nodes) lookups.

## Conclusion

- Don't go down a rabbit hole, get high-level design first.
- High-level design is usually a diagram that includes subsystems and their interactions.
- A walkthrough for important end-to-end scenarios.

## Links to follow

- [Part 3](https://interviewing.io/guides/system-design-interview/part-three)
- [Log-structured merge-tree](https://en.wikipedia.org/wiki/Log-structured_merge-tree)
- [SSTable](https://www.scylladb.com/glossary/sstable/)
- [AWS RDS Sharding](https://aws.amazon.com/blogs/database/sharding-with-amazon-relational-database-service/)
