# Small-scale Deployment Options

The common best practice these days for deploying software seems to be a Kubernetes cluster with CI/CD pipeline attached.
While reasonable and battle-proof for an enterprise, this solution could carry a heavy overhead for small scale.
Small as in a single-server on-premise deployments.
The development team consists of one or a few engineers, who have direct access to the production server(s) and are responsible for all aspects of the project.
For the sake of examples I'll use a Python service.
But the same process should be portable to other languages.

## Development Experience Aspects in Consideration

- End-to-end time for the deployment of the new version.
  End-to-end meaning from changes committed to git, to startup in prod.
- Total time for a rollback to previous version.
- Ability to deploy manually, side-stepping CI/CD.
- Complexity of bootstrapping a new deployment environment.

## Git Push

Heroku-like open-source self-hosted single-node PaaS projects:

- [Sailor](https://github.com/mardix/sailor)
- [Dokku](https://dokku.com/)

The pros of this approach are:
- On the client-side, the deployment is just a quick `git push` command.
- The project is built on the host where it's run, so no headache around OS-level binary dependencies compatibility.

- End-to-end time for the deployment of the new version: **very low**, only incremental changes need to be transfered on network.
- Total time for a rollback to previous version: **very low**, local git checkout doesn't incure any network costs.
- Ability to deploy manually, side-stepping CI/CD: **hard**, only committed and pushed version can be deployed.
- Complexity of bootstrapping a new deployment environment: **low**, could be a shell script.

## Git Pull

In a high-level, the git pull approach means having a code repo cloned to the prod server.
The deployment is basically running this script:

```bash
git pull
sudo systemctl restart my.service
```

- End-to-end time for the deployment of the new version: **very low**, only incremental changes need to be transfered on network.
- Total time for a rollback to previous version: **very low**, local git checkout doesn't incure any network costs.
- Ability to deploy manually, side-stepping CI/CD: **easy**, given the developer has SSH access to the server.
- Complexity of bootstrapping a new deployment environment: **very low**, could be a shell script.

The downsides of this approach:
- Production server has to have development tools installed, that wouldn't otherwise be needed.
- Server has to have network access and store the credentials for the source code repo.
- Production server stores files that are not needed during runtime, such as test files and assets.

## Rsync

Similar to git pull with core aspects being almost the same.
Upsides:
- Production server doesn't development tools, or access to code repo.
- rsync command can be set to avoid sending unnecessary files.

Downsides:
- Risk of not sending the required files.

## Custom Tar Balls

This mode adds a few steps to the deployment process - building the deployment artifacts (my.tar.gz), and unpacking on the server.

- End-to-end time for the deployment of the new version: **low**, the whole project is transfered for each deployment.
- Total time for a rollback to previous version: **very low**, the previous version can be kept on the server for a quick switch.
- Ability to deploy manually, side-stepping CI/CD: **easy**, given the build script is independent from CI/CD environment.
- Complexity of bootstrapping a new deployment environment: **low**, could be a shell script, but has to include version switching.

Downsides:
- Considerable amount of bicycle reinvention.
  Tar balls need to have a custom versioning scheme, and a way to activate target version.
  While every aspect is simple, the add up to overall project complexity and increase new engineer onboarding time.

## Runtime-specific Packages

A twist on the custom tar balls, using Python wheels, or what have you.

Downsides:
- Different deployment for each language runtime.

## OS-specific Packages

A twist on runtime-specific packages, but building .deb or .rpm artifacts.
The build stage is more involved, but the OS provides a standard way of performing common operations, addressing the downsides of custom tar balls approach.

## Docker Containers

Streamlines common operations, but requires docker runtime, and makes it somewhat harder to hack on the software in production.
Docker registry is optional, and can be replaced by running `docker save` and `docker load` commands.

## Virtual Machines

A spin on the docker containers, providing higher level of isolation, but incuring significant overhead in performance and memory usage.

## Deep Dive into Custom Tar Balls

The main downside is the version management and all the custom tooling required to be built and learned to run the process.
This can be circumvented by creating a general-purpose well-documented tooling.

The tool has support following deployment aspects:

1. Deployment artifact creation.
   The common approach is some form of a manifest file, that contains a list of glob patterns to match the runtime files.
2. Transfer of the artifact to the target server.
3. Artifact installation.
4. Version management and switching (activation/roll back).
5. Runtime dependency management.
6. Initial server bootstrapping.

TBD
