import os
import sys
import json
import posixpath

from jinja2 import Template


template = Template("""
# {{ title }} ({{ year }})

Genres: {{ genres | join(", ") }}

![poster]({{ images.poster }})

{% for lang in torrents -%}
  {{ lang }}:
  {% for res in torrents[lang] -%}
    [{{ res }}]({{ torrents[lang][res]["url"] }})
  {% endfor %}
{% endfor %}

{{ synopsis }}
""".strip())

toc = []

with open("pct.json", encoding='utf-8') as fp:
    for line in fp:
        movie_data = json.loads(line)
        title = movie_data.get('title')
        slug = movie_data['slug']
        print(movie_data['slug'])
        md = template.render(**movie_data)
        shards = slug[:2]
        path = os.path.join('md', slug[0], slug[1], slug + '.md')
        url = posixpath.join('md', slug[0], slug[1], slug + '.html')
        dirpath = os.path.dirname(path)
        if not os.path.exists(dirpath):
            os.makedirs(dirpath)
        with open(path, 'wt', encoding='utf-8') as fp:
            fp.write(md)
        toc.append(
            (title, url)
        )

with open("popcorn-time.md", 'wt', encoding='utf-8') as tocfp:
    tocfp.writelines([
        "[{title}]({url})\n\n".format(title=title, url=url)
        for title, url in toc
    ])