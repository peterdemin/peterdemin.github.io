# Get notified on credit balance changes

I like to know what my credit card balance is.
And I don't want to visit all online bank accounts every day.
So I automated this process. In a secure and reusable way.

Meet [Kibitzr](https://kibitzr.github.io/) - Self-hosted web scrapper,
that can login to online bank account just like you do and extract balance.
Then it will check, if it changed from the last time it send notification.
Finally it will send you a message via SMS, e-mail, Telegram, Slack, gitter, you-name-it.

## How is it different from existing solutions?

First, it is free. It's also open-source. And it's written in Python.

Second, it's self-hosted. You don't have to trust any third-party with your bank account credentials.

Kibitzr is configured through YAML file. It means, that you can share snippets for different banks in plain text.
One writes the snippet for his bank, whole community benefits.

## So how do I check my balance at X?

Here is the snippet for Discover bank. Save it in `kibitzr.yml`:

```yaml
checks:
  - name: Discover
    url: https://www.discover.com/
    form:
        - id: userid
          creds: discover.username
        - id: password
          creds: discover.password
        - id: log-in-button
          click: true
    transform:
        - css: .current-balance
        - text
        - changes: verbose
    notify:
        - slack
    error: ignore
    period: 6 hours
```

And put your credentials in `kibitzr-creds.yml`:

```yaml
discover:
  username: john
  password: doe!32#$
```

Launch with:

```bash
$ kibitzr run
```

Note how credentials file is individual while check definition is general.
There are existing check snippets for Bank of America, Discover, American Express and adding new is a matter of minutes.

If you like the idea and want to be a part of Kibitzr community, please drop a line at [Gitter Lobby](https://gitter.im/kibitzr/Lobby) or join [discussion on HackerNews](https://news.ycombinator.com/item?id=14275953)
