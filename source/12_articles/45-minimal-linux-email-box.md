# How to set up a receiving email server on a Linux machine

## Context

Most of the time, I'm happy with my Gmail.
It has nice clients, filters out spam okay, and integrates with Google Calendar.
But sometimes, companies will only give me their special content if I pass them my work email.
Whether this content is valuable or not is a separate question.
Here, I explain the technical solution to getting a mailbox on your custom domain.
(Assuming you already host a Linux server on your domain and have access to everything.)

## Configure Linux

1. Install and configure postfix

   ```
   sudo apt install postfix -y
   ```

2. Configure the hostname. Update the following strings in `/etc/postfix/main.cf`:

   ```
   myhostname = mail.demin.dev
   mydestination = $myhostname localhost.$mydomain localhost $mydomain
   ```

3. If your username is not the same as the desired email, add an alias:

   ```
   $ cat /etc/aliases
   postmaster:    peterdemin
   peter:    peterdemin
   ```

4. Start the server:

   ```
   sudo systemctl start postfix
   ```

5. Make sure the mail daemon listens on port 25:

   ```
   $ sudo lsof -Pni:25
   COMMAND  PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
   master  4116 root   13u  IPv4  76561      0t0  TCP *:25 (LISTEN)
   master  4116 root   14u  IPv6  76562      0t0  TCP *:25 (LISTEN)
   ```

## Open ports in Firewall settings

TCP port to open: `25`
IP range: `0.0.0.0/0`

Email infrastructure uses other ports as well, but we don't need them:
IMAP: `143`, `993`, SMTP for sending emails from this server: `465`, `587`.

## Add DNS record

Consider you want to have an email address: `peter@demin.dev`.
And the IP address of the machine running the mail agent is `35.237.50.91`.

1. MX record:
   - Host name: demin.dev
   - Type: MX
   - TTL: 1 hour
   - Data: 10 mail.demin.dev.

2. Mail server A record:
   - Host name: mail.demin.dev
   - Type: A
   - TTL: 1 hour
   - Data: 35.237.50.91 

## Check emails

All incoming emails are appended to this file:

```
less /var/spool/mail/${USER}
```

## Disable the mail server when you don't need it

Just disable the firewall rule, and you can keep everything else intact.

## The content

I don't mean to pirate it, but since I had to go to such a great lengths to get them,
here are the books I downloaded using my custom domain email address:

- [Architecting event-driven API-first platforms to build Everything-as-a-Service](/_static/aws-eaas.pdf)
- [CockroachDB The Definitive Guide](/_static/cockroachdb.pdf)
- [CockroachDB The Engineer’s Survival GUIDE](/_static/survival.pdf)
