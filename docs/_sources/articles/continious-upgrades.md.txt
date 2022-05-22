# Continuous upgrading

An important part of software engineering, as opposed to programming, is keeping up with supported versions of third-party dependency versions. The most modern open source libraries maintain just a single supported branch. It means that all bug fixes and security patches are applied only to the latest version. 

On the other side of scales are breaking changes. New versions of a library may remove required functionality, or change behavior in an unexpected way. 

The main question becomes, how often do we need to check for upgrades and how quick do we need to react. I found it helpful to split all packages into 3 groups:

1. Mature packages with small interface area. 