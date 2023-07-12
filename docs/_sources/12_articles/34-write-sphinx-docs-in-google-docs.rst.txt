Write sphinx docs in Google Docs
================================

Problem

When a project is using Sphinx docs extensively, there's additional
friction for non-developers who need to contribute to documentation.

Solution

Write pages in Google Docs and automatically synchronize them to the
Sphinx source tree.

How to

Install gdocsync Python package:

pip install gdocsync

Import Google Docs pages that follow Johnny Decimal notation to the
source directory:

gdocsync source
