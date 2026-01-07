# My RSS feed reader setup

I run a [CommaFeed](https://github.com/Athou/commafeed) instance on a free-tier Google Cloud Platform virtual machine.
It's a Google Reader-inspired self-hosted personal RSS reader.

I'm not using Docker, in part because the VM has only 0.25 CPU and, in part, because I like simple things.

## Setup

CommaFeed service runs under a SystemD Unit using a separate system user with a home directory:

```
sudo useradd -rms /sbin/nologin commafeed
sudo -u commafeed wget -O /home/commafeed/commafeed \
    https://github.com/Athou/commafeed/releases/download/5.12.1/commafeed-5.12.1-h2-linux-x86_64-runner
sudo chmod +x /home/commafeed/commafeed
```

(Check the [releases page](https://github.com/Athou/commafeed/releases/latest) to get the latest native binary for your operating system).

## Reverse proxy

Nginx has a section dedicated to proxy pass feed subdomain to a localhost port:

`/etc/nginx/sites-available/default`:

```nginx
server {
    server_name feed.demin.dev;
    location / {
      proxy_pass http://127.0.0.1:8082;
      proxy_set_header  X-Forwarded-Proto https;
      proxy_set_header Host $http_host;
    }
}
```

## SystemD Unit

`/etc/systemd/system/commafeed.service`:

```systemd
[Unit]
Description=A bloat-free feed reader
After=local-fs.target network.target

[Service]
User=commafeed
Group=commafeed
WorkingDirectory=/home/commafeed
ExecStart=/home/commafeed/commafeed
SyslogIdentifier=commafeed
Restart=always

[Install]
WantedBy=multi-user.target
```

## Backup

I don't care about the posts I haven't read enough to automate the database backup.
I wouldn't want to lose the extensive library of feeds I aggregated over many years, though.
So my solution is to just export the [OPML file](./71-opml.xml) whenever I think about how I don't want to lose it.

## The treasure

Here's the list of feeds from the OPML file in alphabetical order:

- [Adam Johnson](https://adamj.eu/tech/atom.xml)
- [Andrew Nesbitt](https://nesbitt.io/feed.xml)
- [Armin Ronacher's Thoughts and Writings](https://lucumr.pocoo.org/feed.atom)
- [Blogs on John's Website](https://johnthenerd.com/blog/index.xml)
- [Cerebralab - Blog](https://cerebralab.com/feed.xml)
- [Copper • A blog about conductive layers](https://alinpanaitiu.com/index.xml)
- [Dan Luu](https://danluu.com/atom.xml)
- [Dan McKinley](https://mcfunley.com/feed.xml)
- [Hynek Schlawack](https://hynek.me/index.xml)
- [Irrational Exuberance](https://lethain.com/feeds.xml)
- [Jack](https://cep.dev/posts/index.xml)
- [Jade Rubick](https://www.rubick.com/rss.xml)
- [Jamie Adams](https://jamieadams.click/index.xml)
- [Jascha’s blog](https://sohl-dickstein.github.io/feed.xml)
- [Kevin Cox's Blog](https://kevincox.ca/feed.atom)
- [Kevin Kelly](https://kk.org/feed)
- [Kobzol’s blog](https://kobzol.github.io/feed.xml)
- [Lu's blog](https://blog.the-pans.com/rss/)
- [Martin Fowler](https://martinfowler.com/feed.atom)
- [Matt Rickard](https://matt-rickard.com/rss)
- [Maurycy's blog](https://maurycyz.com/index.xml)
- [Max Chernyak](https://max.engineer/feed.rss)
- [Mert Bulan](https://mertbulan.com/feed.xml)
- [Mumbling about computers](https://blog.davidv.dev/rss.xml)
- [Nathan Barry](https://nathan.rs/posts/index.xml)
- [Nicola Iarocci](https://nicolaiarocci.com/index.xml)
- [Peter Demin](https://peter.demin.dev/life.xml) (that's me!)
- [Posts on Max Woolf's Blog](https://minimaxir.com/post/index.xml)
- [Posts on Nikita Lapkov](https://laplab.me/posts/index.xml)
- [Shtetl-Optimized](https://scottaaronson.blog/?feed=rss2)
- [Speculative Branches](https://specbranch.com/index.xml)
- [The Clean Code Blog](http://blog.cleancoder.com/atom.xml)
- [The Technium (Kevin Kelly)](https://feedpress.me/TheTechnium)
- [Today Hynek Learned on Hynek Schlawack](https://hynek.me/til/index.xml)
- [Trekhleb.dev RSS Feed](https://trekhleb.dev/rss.xml)
- [Two-Wrongs](https://entropicthoughts.com/feed)
- [Vladislav Supalov](https://vsupalov.com/index.xml)
- [Will Webberley's Blog](https://wilw.dev/rss.xml)
- [Xe's Blog](https://christine.website/blog.rss)
- [Yegor Bugayenko](https://www.yegor256.com/rss.xml)
- [chriskiehl.com](https://chriskiehl.com/rss.xml)
- [codahale.com](https://codahale.com/atom.xml)
- [dbsmasher corner](https://blog.dbsmasher.com/feed.xml)
- [journal.stuffwithstuff.com](https://journal.stuffwithstuff.com/rss.xml)
- [morling.dev -- Blog](https://www.morling.dev/blog/index.xml)
- [people, ideas, machines](https://joshs.bearblog.dev/feed/)
- [phiresky's blog](https://phiresky.github.io/blog/rss)
- [samir : coffee → nonsense](https://functional.computer/feed.xml)
- [seangoedecke.com RSS feed](https://www.seangoedecke.com/rss.xml)
- [sobolevn’s personal blog](https://sobolevn.me/feed.xml)
- [the website of jyn](https://jyn.dev/atom.xml)
- [thesephist](https://thesephist.com/index.xml)
- [tonsky.me](https://tonsky.me/atom.xml)
- [uninformativ.de (en)](https://www.uninformativ.de/blog/feeds/en.atom)
- [マリウス](https://xn--gckvb8fzb.com/index.xml)
