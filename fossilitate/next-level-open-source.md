# Filling the gap in open source supply chain

![Flowers field](flower.jpg)
Photo by [Brian Garcia](https://unsplash.com/@brianverde?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)

Private companies, big or small, love open source software.
Primarily, because it allows them to move faster.
If company makes a website, it doesn't need to start with developing a web framework.
Instead, open source world provides a vast variety of frameworks for every programming language there is.
Engineers can focus on unique value proposition and offload routine work to libraries, developed and maintained
outside of the organization and basically at no cost to the company.

Companies that choose to open a part of their software stack, get a good reputation among
other developers, better candidates for HR and even free contributions from community.

Arguably, humanity as a whole greatly benefits from open source, as common problems can be solved once,
and reused by everyone. Popular frameworks report adoption by thousands of companies worldwide.

One may say, that open source is the best thing that ever happened to software.
But of course, nothing is perfect, and the reality brings in the complexity.

![Rain](rain.jpg)
Photo by [Rowan Heuvel](https://unsplash.com/@insolitus?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)

When company chooses to adopt an open source package, it takes a risk.
Part of the product becomes owned and controlled by someone outside of the company.
If the package maintainer looses interest, the project might get stuck in the past.
Abandoned projects do not receive upgrades when underlying technology changes.
Also, bugs and security vulnerabilities may stay open for a long time.

But even if the library is live and maintained, the author is working on it in their's free time and supported only by good will.
Fixing a bug in code is 1-step process.
But to fix it in third-party library, one has to go through code review with a stranger and wait for the next public release.

New features are hard to get in too, as many maintainers try to keep their projects simple and avoid feature bloat.
Persuading the author, that their library needs additional functionality is a task of its own.

![Sun](sun.jpg)
Photo by [Photoholgic](https://unsplash.com/@photoholgic?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)

The solution to all of these problems exists and is a part core part of the open source philosophy.
It's called fork.
Anyone can copy an open source library, change it, and use start using the new version.
The patch may take time to get merged in the upstream repository, and get released publicly,
but the fork will have it immediately.
Private forks trade the speed of change with the burden of maintaining patched software and managing private artifacts.
Now company pays for using the open source with engineer's time - the scarcest resource it has.
If upstream makes new release, the patch has to be reapplied on top of it, oftentimes after adapting, testing and debugging. 
If company chooses not to keep up with the upstream, it gets stuck with an old unsupported version.

But not all is doom and gloom. Because now companies have an option to outsource third-party forks maintainance.
Effectively trading engineering time with cash.
Fossility is the first SaaS to offer paid support for open source packages.

Fossility makes this possible by covering 3 fronts:

1. Private companies pay monthly subscription to Fossility.
2. Fossility partners with open source maintainers to ensure timely resolution of clients' issues.
3. Client gets access to a private artifactory with forked third-party libraries.
4. Fossility maintains private forks until the patches are merged and released in upstream packages.
5. Fossility pays open source maintainers to work on client's issues.

---

# Outline

## Upsides

* Open source is the best way to move faster as a whole.
* Less reinventing the wheel.
* Free contributions.

## Downsides

* Part of the product is owned and maintained by someone outside of the company.
* Bug fixes are slower to get to the production, because of the release cycle.
* Feature requests may get no attention, or be rejected.
* Library may get completely abandoned.

## Solution

* Partner with open source library maintainers.
* Provide bounties to maintainers for working on issues needed by the clients.
* Maintain private artifactory for fork releases.
* Private releases a faster to incorporate new patches.
* Private releases with backported bug fixes.

SaaS

