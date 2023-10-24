Write sphinx docs in Google Docs
================================

.. _h.ocfpud4jd4yz:

Problem
-------

When a project is using Sphinx docs extensively, there's additional
friction for non-developers who need to contribute to documentation.

.. _h.kc4acwvmshuf:

Solution
--------

Write pages in Google Docs and automatically synchronize them to the
Sphinx source tree.

.. _h.59qgzyaaripi:

How to
------

Install gdocsync Python package:

pip install gdocsync

Import Google Docs pages that follow Johnny Decimal notation to the
source directory:

gdocsync source

|image1|

.. |image1| image:: images/image1.png
