#!/usr/bin/env python
# -*- coding: utf-8 -*- #
from __future__ import unicode_literals

AUTHOR = 'Peter Demin'
SITENAME = 'Yet Another Developer Blog'
SITEURL = ''

PATH = 'content'
STATIC_PATHS = ['images']

TIMEZONE = 'EST'

DEFAULT_LANG = 'en'

# Feed generation is usually not desired when developing
FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None

# Blogroll
LINKS = (
    ('Pelican', 'http://getpelican.com/'),
)

# Social widget
SOCIAL = (
    ('GitHub', 'https://github.com/peterdemin'),
    ('LinkedIn', 'https://www.linkedin.com/in/peterdemin'),
)

DEFAULT_PAGINATION = False

# Uncomment following line if you want document-relative URLs when developing
RELATIVE_URLS = True

TYPOGRIFY = True
