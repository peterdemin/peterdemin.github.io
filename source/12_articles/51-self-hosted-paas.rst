Self-hosted PaaS
================

Every time a developer sneezes there's 3 new PaaS projects spawning.

-  `Coolify <https://coolify.io/>`__
-  `/u/zittoone <https://www.reddit.com/u/zittoone/>`__/'s\ `  <https://github.com/acouvreur/sablier>`__\ `sablier <https://github.com/acouvreur/sablier>`__
-  `Exoframe <https://github.com/exoframejs/exoframe/>`__
-  `CapRover <https://github.com/caprover/caprover/>`__
-  `Sailor <https://github.com/mardix/sailor>`__
-  `Tsuru <https://github.com/tsuru/tsuru>`__
-  `Kubero <https://github.com/kubero-dev/kubero>`__
-  `Devtron <https://github.com/devtron-labs/devtron>`__
-  `Otomi <https://github.com/redkubes/otomi-core>`__
-  `Podi <https://github.com/coderofsalvation/podi>`__
-  `Convox <https://github.com/convox>`__
-  `Hookah <https://github.com/bruj0/hookah>`__

Source: `Reddit
comment <https://www.reddit.com/r/selfhosted/comments/zv2t4s/comment/j1tp2uq/?utm_source=share&utm_medium=web2x&context=3>`__

More from
`TechTarget <https://www.techtarget.com/searchcloudcomputing/feature/6-open-source-PaaS-options-developers-should-know>`__:

​​\ **Top 6 open source PaaS tools**

There are a number of popular open source PaaS options on the market
today, each with its own unique twist. The tools listed below are six of
the most popular -- or increasingly popular -- projects that engineering
teams are using to abstract the complexities of infrastructure
management while
still\ `  <https://www.techtarget.com/searchdatacenter/post/4-ways-data-center-operations-must-adapt-to-the-cloud-era>`__\ `embracing
the power of the
cloud <https://www.techtarget.com/searchdatacenter/post/4-ways-data-center-operations-must-adapt-to-the-cloud-era>`__.

.. _h.gbggszmu3t4u:

**1. CapRover**
~~~~~~~~~~~~~~~

CapRover is a popular free and open source PaaS originally released in
2017. Built using TypeScript, CapRover is extremely easy to use,
requiring only a few commands to get started. Because it's powered by
Docker, nearly any application can be deployed to CapRover with minimal
overhead thanks to CapRover's own Captain Definition file format. This
file outlines all of the resources and other dependencies required to
successfully run the underlying application.

Although getting started with CapRover is incredibly straightforward,
what makes it really stand out is its built-in marketplace of one-click
applications. This makes deploying common technologies such as WordPress
and MySQL very simple, which reduces the overall complexity of deploying
an application to CapRover.

.. _h.o6k9im8o6wrw:

**Key features**
~~~~~~~~~~~~~~~~

-  Automatic SSL certificate provisioning from Let's Encrypt
-  Local\ `  <https://www.techtarget.com/searchwindowsserver/definition/command-line-interface-CLI>`__\ `command-line
   interface <https://www.techtarget.com/searchwindowsserver/definition/command-line-interface-CLI>`__ (CLI)
   client for automation
-  Web-based graphical user interface (GUI) for ease of use
-  Supports all Docker-based applications
-  Built-in marketplace for one-click deploys of other popular open
   source applications

.. _h.3t1dlq96lbt1:

**2. Cloud Foundry**
~~~~~~~~~~~~~~~~~~~~

Cloud Foundry is a powerful platform that uses the scalability of
Kubernetes to create a simple yet performant PaaS option. Deployed using
BOSH -- its own cross-platform tool for deploying and managing
large-scale cloud-based software -- Cloud Foundry provides developer
tooling that reduces the overhead of deploying software to a Kubernetes
cluster without compromising quality or speed.

A more low-level tool than CapRover, Cloud Foundry is primarily managed
using a custom CLI and takes a modular approach to its own service
marketplace, which can be enhanced with features such as log streaming
and single sign-on support. Although the service marketplace can deploy
things such as databases, what makes it particularly interesting is that
it can also broker communications
to\ `  <https://www.techtarget.com/searchapparchitecture/tip/What-are-the-types-of-APIs-and-their-differences>`__\ `third-party
APIs <https://www.techtarget.com/searchapparchitecture/tip/What-are-the-types-of-APIs-and-their-differences>`__ such
as GitHub and AWS.

.. _h.55bj2w8xkgij:

**Key features**
~~~~~~~~~~~~~~~~

-  CLI client for integrating into existing build tools
-  Flexible infrastructure support through BOSH stemcells
-  Support for most major programming languages and custom buildpacks
-  Built-in service marketplace for enhancing deployment functionality

.. _h.k9umlrjx0vp6:

**3. Dokku**
~~~~~~~~~~~~

Dokku is a simple, headless PaaS platform that prides itself on its low
profile and ease of use. A CLI-only implementation, Dokku's usability
feels highly inspired by Heroku's own tooling. Although Dokku is a
popular, low-overhead PaaS, what really makes it stand out is its plugin
architecture.

Built entirely as a collection of well-structured plugins, Dokku can be
extended easily to install dependencies within a single application
repository -- such as databases and caching services -- while also
enabling support for additional features such as Let's
Encrypt\ `  <https://www.techtarget.com/searchsecurity/tip/SSL-certificate-best-practices-for-2020-and-beyond>`__\ `SSL
certificate
registration <https://www.techtarget.com/searchsecurity/tip/SSL-certificate-best-practices-for-2020-and-beyond>`__ and
even automated Slack notifications.

.. _h.apb99td190pn:

**Key features**
~~~~~~~~~~~~~~~~

-  CLI client for integrating into existing build tools
-  `Git
   push-based <https://www.theserverside.com/blog/Coffee-Talk-Java-News-Stories-and-Opinions/How-to-push-an-existing-project-to-GitHub>`__ deployment
   strategy à la Heroku
-  Extensive plugin architecture
-  Built-in Docker support for advanced usage

.. _h.ht81a4dass84:

**4. OKD**
~~~~~~~~~~

The open source core that powers Red Hat's OpenShift commercial PaaS
tool, OKD is an
enhanced\ `  <https://www.techtarget.com/searchitoperations/tip/Run-Kubernetes-at-the-edge-with-these-K8s-distributions>`__\ `distribution
of
Kubernetes <https://www.techtarget.com/searchitoperations/tip/Run-Kubernetes-at-the-edge-with-these-K8s-distributions>`__ optimized
for developer-centric functionality such as continuous development and
multi-tenant deployment. Designed to run any Kubernetes workload, OKD is
built with team usability in mind.

With both a web console and CLI, OKD creates a centralized hub for
managing everything from the underlying technology stack to the team and
organization. Although OKD emphasizes that this isn't a fork of
Kubernetes, but instead a sister of it, it's clearly put a lot of
thought into the features it offers on top of Kubernetes itself.

.. _h.7q39lnlodqt8:

**Key features**
~~~~~~~~~~~~~~~~

-  Native support for Lightweight Directory Access Protocol, Active
   Directory and OAuth
-  Multi-tenancy support
-  Automated Git-based deployment hooks
-  CLI and GUI interfaces for building and monitoring applications

.. _h.1l8vply9owdv:

**5. Porter**
~~~~~~~~~~~~~

A newcomer to the scene, Porter is a Kubernetes-powered PaaS
that\ `  <https://techcrunch.com/2021/07/30/platform-as-a-service-startup-porter-aims-to-become-go-to-platform-for-deploying-managing-cloud-based-apps/>`__\ `launched
in
2020 <https://techcrunch.com/2021/07/30/platform-as-a-service-startup-porter-aims-to-become-go-to-platform-for-deploying-managing-cloud-based-apps/>`__ with
a goal of bringing the Heroku experience to a developer's preferred
cloud provider. An open source platform with self-hosting capabilities,
Porter is a well-crafted tool with a beautifully designed web dashboard
that has as much form as it has function.

What makes Porter particularly interesting is its monetization model,
which follows the traditional path of an open source core powering a
managed service with a few more features, but with a little twist.
Rather than running all of the infrastructure itself, Porter
automatically provisions a Kubernetes cluster on a user's preferred
cloud provider, giving total control over the underlying infrastructure
-- and Porter abstracts all of the Kubernetes complexity to ease
adoption.

.. _h.2hl6e5omnctt:

**Key features**
~~~~~~~~~~~~~~~~

-  CLI and GUI interfaces for deploying and managing applications
-  Built-in support for AWS, Google Cloud Platform
   and\ `  <https://www.techtarget.com/searchcloudcomputing/tip/Dive-into-DigitalOcean-Droplets-and-App-Platform>`__\ `Digital
   Ocean <https://www.techtarget.com/searchcloudcomputing/tip/Dive-into-DigitalOcean-Droplets-and-App-Platform>`__
-  Built-in marketplace for one-click add-ons such as databases and
   caching services
-  Native Docker and buildpack support

.. _h.sd2dw1c6kcgi:

**6. Rancher**
~~~~~~~~~~~~~~

Although Rancher bills itself as more of a Kubernetes-as-a-service tool
than a PaaS, its history as a PaaS tool earns it a place on this list.
Offering a wide range of functionality for deploying and managing
Kubernetes clusters across a number of clouds -- including VMware
vSphere -- Rancher is designed to assist the deployment and management
of Kubernetes clusters without getting in the way.

Similarly to the other PaaS tools on this list, Rancher offers a wealth
of additional features for managing users, clusters and organizations in
a central location. Although its command-line tool acts as an extension
of the existing kubectl tool, its GUI provides some excellent helper
functions
to\ `  <https://www.techtarget.com/searchcloudcomputing/ehandbook/Practical-advice-on-cloud-application-management>`__\ `deploy
and manage cloud
applications <https://www.techtarget.com/searchcloudcomputing/ehandbook/Practical-advice-on-cloud-application-management>`__.

.. _h.3k4un5q6yl3q:

**Key features**
~~~~~~~~~~~~~~~~

-  Simple Docker-based deployment
-  Multi-cloud support through multiple Kubernetes cluster management
-  CLI and GUI interfaces for managing applications
