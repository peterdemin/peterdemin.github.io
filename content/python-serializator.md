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

# Serialization framework layout

That's why I think about creating data-driven framework, that will allow us to define our data once
and have everything else automatically derived.

Let's imagine how data definition would look like using YAML format.
Definition should be succinct for common cases and extensible for every possible special case. 
So, we will describe document, that contains linked entities, with each entity having it's own set of fields.
Nothing special so far. Here is entity definition.

```yaml
Author:
    username: {type: String, max_length: 30}
    email: Email
    password: {type: String, private: true}
```

We define entity author, that has fields username, email and password.
Username and password use full notation and have type string.
Email uses short notation of type alone.
Also, username length is limited to 30 symbols and password field is marked as private.
Entity and type names use CamelCase notation and field names are lowercase.

For this definition, we can auto generate following Django model:

```py
from django.db import models

class Author(models.Model):
    username = models.CharField(max_length=30)
    email = models.EmailField()
    password = models.CharField(max_length=255)
```

And solr schema:

```xml
<fields>
  <field name="author_username" type="string" indexed="true" stored="true" required="true" />
  <field name="author_email" type="string" indexed="true" stored="true" required="true" />
</fields>
```

That easy! All generators are pluggable and customizable. But at this point we looked at simplistic
example of one entity.

# More complex example

Let's define blog. Blog has posts, authors, tags and annotations.

```yaml
Blog:
    posts: {list-of: Post}
    authors: {list-of: Author}
    tags: {list-of: Tag}
    annotation: String
Post:
    author: Author
    tags: {list-of: Tag}
    title: String
    body: String
    created: Datetime
    updated: Datetime
Author:
    username: {type: String, max_length: 30}
    email: Email
    password: {type: String, private: true}
Tag:
    title: String
```

We added more entity definitions with relations between them.