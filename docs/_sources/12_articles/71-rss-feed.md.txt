# My RSS feed reader setup

I run a [CommaFeed](https://github.com/Athou/commafeed) instance on a free-tier Google Cloud Platform virtual machine.
It's a Google Reader-inspired self-hosted personal RSS reader.

CommaFeed service runs as a SystemD Unit under a separate system user with a home directory.

## User setup

```
$ lslogins commafeed
Username:                           commafeed
UID:                                112
Gecos field:
Home directory:                     /home/commafeed
Shell:                              /usr/sbin/nologin
No login:                           yes
Primary group:                      commafeed
GID:                                117
Hushed:                             no
Running processes:                  1
```

## Configuration

Most of the configuration is the default, with the database pointing to an H2 file.
I have Redis configured, but I'm not running Redis itself. Go figure.

```yaml
# ~commafeed/config.yml
# CommaFeed settings
# ------------------
app:
  # url used to access commafeed
  publicUrl: https://feed.demin.dev/

  # wether to allow user registrations
  allowRegistrations: false

  # create a demo account the first time the app starts
  createDemoAccount: false

  # put your google analytics tracking code here
  googleAnalyticsTrackingCode:

  # put your google server key (used for youtube favicon fetching)
  googleAuthKey:

  # number of http threads
  backgroundThreads: 3

  # number of database updating threads
  databaseUpdateThreads: 1

  # settings for sending emails (password recovery)
  smtpHost:
  smtpPort:
  smtpTls: false
  smtpUserName:
  smtpPassword:
  smtpFromAddress:

  # wether this commafeed instance has a lot of feeds to refresh
  # leave this to false in almost all cases
  heavyLoad: false

  # minimum amount of time commafeed will wait before refreshing the same feed
  refreshIntervalMinutes: 5

  # wether to enable pubsub
  # probably not needed if refreshIntervalMinutes is low
  pubsubhubbub: false

  # if enabled, images in feed entries will be proxied through the server instead of accessed directly by the browser
  # useful if commafeed is usually accessed through a restricting proxy
  imageProxyEnabled: false

  # database query timeout (in milliseconds), 0 to disable
  queryTimeout: 0

  # time to keep unread statuses (in days), 0 to disable
  keepStatusDays: 0

  # entries to keep per feed, old entries will be deleted, 0 to disable
  maxFeedCapacity: 500

  # cache service to use, possible values are 'noop' and 'redis'
  cache: noop

  # announcement string displayed on the main page
  announcement:

# Database connection
# -------------------
# for MySQL
# driverClass is com.mysql.jdbc.Driver
# url is jdbc:mysql://localhost/commafeed?autoReconnect=true&failOverReadOnly=false&maxReconnects=20&rewriteBatchedStatements=true
#
# for PostgreSQL
# driverClass is org.postgresql.Driver
# url is jdbc:postgresql://localhost:5432/commafeed
#
# for Microsoft SQL Server
# driverClass is net.sourceforge.jtds.jdbc.Driver
# url is jdbc:jtds:sqlserver://localhost:1433/commafeed;instance=<instanceName, remove if not needed>

database:
  driverClass: org.h2.Driver
  url: jdbc:h2:/home/commafeed/db;mv_store=false
  user: sa
  password: sa
  properties:
    charSet: UTF-8
  validationQuery: "/* CommaFeed Health Check */ SELECT 1"
  minSize: 1
  maxSize: 50
  maxConnectionAge: 30m

server:
  applicationConnectors:
    - type: http
      port: 8082
  adminConnectors:
    - type: http
      port: 8084

logging:
  level: WARN
  loggers:
    com.commafeed: INFO
    liquibase: INFO
    io.dropwizard.server.ServerFactory: INFO
  appenders:
    - type: console
    - type: file
      currentLogFilename: log/commafeed.log
      threshold: ALL
      archive: true
      archivedLogFilenamePattern: log/commafeed-%d.log
      archivedFileCount: 5
      timeZone: EST

# Redis pool configuration
# (only used if app.cache is 'redis')
# -----------------------------------
redis:
  host: localhost
  port: 6379
  password:
  timeout: 2000
  database: 0
  maxTotal: 500
```

## Reverse proxy

Nginx has a section dedicated to the feed subdomain.
It is nothing fancy, just a proxy pass to a localhost port defined under `applicationConnectors`:

```nginx
server {
    server_name feed.demin.dev;

    listen [::]:443 ssl; # managed by Certbot
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/demin.dev-0003/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/demin.dev-0003/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    location / {
      proxy_pass http://127.0.0.1:8082;
      proxy_set_header  X-Forwarded-Proto https;
      proxy_set_header Host $http_host;
    }

}
```

You may notice that `adminConnectors` are not even exposed.
I don't think I ever saw what's there.

## SystemD Unit

The runtime doesn't use Docker, in part because the VM has only 0.1 CPU and, in part, because I like simple things.
It's just a `commafeed.jar` downloaded from the official [release page](https://github.com/Athou/commafeed/releases).

```bash
sudo ln -s ~commafeed/commafeed.service /etc/systemd/system/commafeed.service
```

```systemd
[Unit]
Description=A bloat-free feed reader
After=local-fs.target network.target

[Service]
User=commafeed
Group=commafeed
WorkingDirectory=/home/commafeed
ExecStart=/usr/bin/java -Djava.net.preferIPv4Stack=true -server -jar commafeed.jar server config.yml
SyslogIdentifier=commafeed
Restart=always

[Install]
WantedBy=multi-user.target
```

## Backup

I don't care about the list of links I haven't read yet enough to automate the database backup.
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
