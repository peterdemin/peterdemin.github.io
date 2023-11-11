# Deployments from scratch

In this article I attempt to think through software deployment from the first principles.
It's getting harder and harder each year to find any deployment strategy online that doesn't
involve having a Kubernetes cluster running inside of virtual machines in the cloud.

I target a different use-case though.
I have a single physical server in a single location, that needs to run a couple of services.
I'm the only software developer on a team, and I don't need to change the code much often.
I want the set up to be simple, without extra moving parts.

## Deploy object

So what is this thing we're deploying?
It's a handful of source code files, that are executed inside of their language runtime.
Runtime comes with a set of third-party dependencies, of course.

## Desired properties

1. Transparency. Being able to SSH to the server and observe what's going on.
2. Simplicity. No unnecessary levels of abstractions, that introduce new failure modes.
   (Why does my code run locally, but breaks inside of container in production?)
3. Speed. The size of the code is tiny, really. Deploying new version should be a matter of seconds.
4. Reliability. We shouldn't lose data even in case of a fatal hardware failure.

## Non-goals

1. Resource isolation. We run our software on our hardware, no need to isolate and compartmentalize for the sake of security.
2. Security. All people who make changes to the software also have sudo permissions on the production server.
3. Scalability. The usage is stable, bound by physical factors, and doesn't spike.
   We don't need to spin up 30 times more compute in a few minutes. The whole thing is handled by a single server.
4. High availability. If something breaks, someone will come and fix it. Few days of downtime once in a decade is okay.
