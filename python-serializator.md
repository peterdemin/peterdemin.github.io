Title: Mutant - Data Schema Generator
Date: 2016-03-16

# Preface

My team was developing simple storage service, that aggregates data from number of not so simple storages.
All service does is receiving and serving documents, that can be represented as dictionaries and lists (json serializable). It used SQL database for persistent storage and Solr for fast querying and caching.
As this definition sounds simple, it took ridiculously long time to implement it.
Even that we took Django with Rest Framework we had a lot of things to do.
And now, when we want to add new field, we have to change code in 6 places:

  * Database ORM models;
  * RestFramework serializer models and fields;
  * FilterBackend configuration;
  * Solr schema;
  * Cerberus validation rules;

That's way too easy to forget about one place.

# Data Definition Language and Code Generator

That's why I think about creating data-driven framework, that will allow us to define our data once
and have everything else automatically derived.

Let's imagine how data definition would look like using YAML format.
Definition should be brief for common cases and extensible for every possible special case. 
So, we will describe document, that contains linked entities, with each entity having it's own set of fields.
Nothing special so far. Here is entity definition.

```yaml
Author:
    username: {type: String, max_length: 30, primary-key: true}
    email: Email
    password: {type: String, private: true}
```

We define entity author, that has fields username, email and password.
Username and password use full notation and have type string.
Email uses short notation of type alone.
Also, username length is limited to 30 symbols and it is marked as primary key for Author.
Password field is marked as private.
Entity and type names use CamelCase notation and field names are lowercase.

So there could be some simple generator, that makes Python classes for definitions:

```py
>>> definition = load_yaml("author.yaml")
>>> Author = make_class(definition)
>>> peter = Author(username="peter", email="peter@data-driven.com", password="secret")
>>> peter
<Author username="peter">
```

Not very useful, but it shows the idea. For people familiar with Django ORM,
we can auto generate following Django model:

```py
from django.db import models


class Author(models.Model):
    username = models.CharField(primary_key=True, max_length=30)
    email = models.EmailField()
    password = models.CharField(max_length=255)
```

And for solr schema:

```xml
<fields>
  <field name="author_username" type="string" indexed="true" stored="true" required="true" />
  <field name="author_email" type="string" indexed="true" stored="true" required="true" />
</fields>
```

That easy! Well, I'll need to find a way to make generators extendable.
But at this point we looked at simplistic example of one entity.

# More complex example

Let's define blog. Blog has posts, authors, tags and annotations.

```yaml
Blog:
    posts: {list-of: Post, own: true}
    authors: {list-of: Author, link-through: Post}
    tags: {list-of: Tag, link-through: Post}
    annotation: String
Post:
    author: Author
    tags: {list-of: Tag}
    title: String
    body: Text
    created: {type: Datetime, auto-set-on: create}
    updated: {type: Datetime, auto-set-on: update}
Author:
    username: {type: String, max_length: 30, primary-key: true}
    email: Email
    password: {type: String, private: true}
Tag:
    title: String
```

We added more entity definitions with relations between them.
Let's dig into relations.
As you may see, Author and Tag entities are connected to both Post and Blog.
But `link-through` key disambiguates relationship, so that Blog does not contain Tags directly.

Schematically defined entity relations can be represented with this diagram:

```
Blog (1 -> *) Post
Post (* -> 1) Author
Post (* -> *) Tag
```

One Blog can have many Posts, but each Post belong to exactly on Blog (One-to-Many relationship),
because Blog.posts are defined as list with `own` flag set to `true`.
Each Post has one Author, but Author can have many Posts - that what happens when declaring simple field.
And finally each Post can have many Tags and each Tag can be attached to many posts (Many-to-Many).

Looks like used YAML structure is versatile enough for given task.
