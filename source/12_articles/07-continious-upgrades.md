# Continuous upgrading

An important part of software engineering, as opposed to programming, is keeping up with supported versions of third-party dependency versions. The most modern open source libraries maintain just a single supported branch. It means that all bug fixes and security patches are applied only to the latest version. 

On the other side of scales are breaking changes. New versions of a library may remove required functionality, or change behavior in an unexpected way. 

The main question becomes, how often do we need to check for upgrades and how quick do we need to react. I found it helpful to split all packages into 3 groups:

1. Mature packages with small interface area. The contract can unit tested directly, or indirectly, as a part internal library. CI should give enough confidence in doing major version upgrades without any manual checks. Upgrades can be fully automated and run daily or weekly. 
2. Big packages, where whole API surface can’t be covered. For example, UI frameworks. The only way to make sure the version works as expected is to spin up the whole service and eye ball all integration points. Doing even patch upgrades is costly in engineering time and prone to human error. Those are best done more rarely, quarterly or once a year. 
3. Fast moving huge services, like Airflow or Jupiter hub, Python or Node.js. Those are hard to test locally, and likely require deployment to staging environment to be manually tested. Coincidentally, upgrades are likely to need non trivial migrations and may break existing persisted data. Upgrading efforts should be included in quarterly goals. Additionally, transitive dependency version constraints may conflict or block upgrades of other packages. 