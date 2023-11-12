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

Alternatively, we could have a statically linked executable, that doesn't require any runtime library.
It's objectively less number of moving parts, but the deployment process is still about the same.

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

## Deployment process outline

1. Build an artifact.
2. Upload it to the target server.
3. Unpack (install) the new version.
4. Stop the old version.
5. Activate/start the new version.

## 1. Build Artifact

1. Executable.
   Artifact could contain a compiled binary, or a single script.
   The common idea is that we don't want to deploy the whole source code repo with docs and tests.
   We only need the code that runs in the production.

   Python ecosystem provides tools, like [pex](https://pex.readthedocs.io>), that convert a Python package to a single executable binary file.
   But do we need to make our service a package?
   As it is customary with Django projects, the source code doesn't follow the traditional package file structure and doesn't have packaging meta data, such as `setup.py` file.
   The build artifact can be just a tar ball with all of the sources (excluding tests and docs.)

   The same with Javascript projects. Node modules directory may or may not be a part of the build artifact.

   Either way, we need some form of a manifest that defines which files to include into the artifact.
   The manifest can be project-specific, or convention-style, which requires less boilerplate in cases where all projects are under your control.

2. Entry point. 
   A command to launch the executable, that can be put into a supervisor config of choice (Docker, SystemD, Upstart, what have you.)
   It could be just a path to the binary, or it might invoke a runtime (Python, NodeJS, etc.)

3. Activation command.
   A script that promotes the chosen version to be the current, stops the old version if present, and starts the new one.
   Running activation script for the older version rolls back the deployment.

## 2. Upload Artifact to Server
