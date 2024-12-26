# Session Authentication and Single-Page Applications

TL;DR: Don't use session authentication in cross-domain AJAX clients, it's a world of pain.
Just go with `Authorization: Bearer <token>` header and be at peace.

## Context

This is something that I learned the hard way, during completion of a take-home assignment.
I would expect the most the full-stack developers to know this, but I haven't found an in-depth explanation on the web.
The tech stack is Django REST Framework and React combo.
React frontend runs on a separate port in the local developer environment to support hot-reloading.
In production, frontend is served from CDN, and API is hosted on a separate subdomain.

## Session Authentication in Django

Using Django terminology, "session" in a nutshell:

1. When user makes the first request to the server,
   Django session middleware generates a new anonymous session token.
2. The session data is available for read and write in Django views through `request.session` object.
3. Before returning response, session middleware persists session data to the cache.
4. Session middleware attaches the session token to the response as a cookie, for example: `sessionid=ovf4pg0a42vxxw7nptty5m6663h6uiky`.
5. On subsequent requests, browser sends the cookie back to the server.
6. Server fetches session data from a cache.

(Django has other flavors, such as Database-stored session data, and signed cookies,
but they both are inferior performance-wise, and are rare in production.)

Session authentication basically means that `request.session["user_id"]` is populated in login view.
Django provides convenient attribute `request.user` that fetches the `User` model by the `user_id`.

To summarise:

1. The Django sessions framework is entirely, and solely, cookie-based.
2. Cookie contains a session ID – not the data itself.

## Session Authentication in Django REST Framework

Django REST Framework provides SessionAuthentication built on top of Django cookie-based sessions.

The documentation has a hint:

> "Session authentication is appropriate for AJAX clients that are running in the same session context as your website."
> -- [Authentication in Django REST Framework](https://www.django-rest-framework.org/api-guide/authentication/)

What "the same session context as your website" means is that the API must be served at the same domain as frontend.

Okay, but does it mean that it won't work in cross-origin setup?
Great question! And a deep rabit hole...

## Cross-Origin Resource Sharing (CORS)

CORS headers allow server to configure what domains (origins) are allowed to send AJAX requests. 
In absence of response header explicitly stating that this domain is approved, the browser rejects the response.

Thank you, browser. The confusion of this situation comes from the developer unawareness of the possible attacks.
Naive server doesn't care about the domain. Naive frontend doesn't care about the domain.
But intermediary browser cares a lot, and it makes sure frontend won't sneak any request.

Let's say, we serve frontend Javascript from https://www.acme.com and API is hosted at https://api.acme.com.

Or, in a local developer setting, Javascript is at http://localhost:3000 and API is at http://localhost:8000.
It may look like the localhost domain is the same, but the browser actually considers port number as a part of domain.

-- Okay, okay, we set the headers:

```
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: https://www.acme.com
```

That would do for the production. But not for local development.

## Cross-Origin Troubles in Local Development

In local environment, we have frontend and backend served from `localhost`, but from different ports.
Let's say `3000` for the frontend, and `8000` for the backend.

> **PRO TIP**: If your frontend is just and HTML file open from the disk as `file:///...`,
> add `"null"` to the allowed origins on your dev server.

Session authentication kinda works if you login on the backend port directly.
The cookie is set for `localhost:8000`, and the browser passes it to server for every AJAX request coming from `localhost:3000` origin.

-- What if you try to login through AJAX?

Not so much. Requests reach the server, existing cookies for the API domain are attached.
Server is happy, response arrives back to the frontend.
Except `Set-cookie` headers. Those get stripped by browser.

I haven't found a definitive explanation.
Some point to presence of port number.
Some to `localhost` not having two dots, and therefore not being a proper domain name.
I don't know exactly what is it, but I tried every solution I found on the web, and got nowhere.

The cookie is not set for the frontend origin.
It's not set for API domain either.
It just goes nowhere.

Let me clarify:

1. Browser attaches existing cookies when making requests to cross-origin API.
2. API server responds back with `Set-Cookie` header.
3. No error or warning is logged in the browser, but the cookie is dropped (only for `localhost`).
4. On the next request to the API server the old cookies are sent.

## Solution 1: Don't Use Cookies

Don't use cookie-based authentication when building websites with cross-origin AJAX.
Use [Token authentication](https://www.django-rest-framework.org/api-guide/authentication/#tokenauthentication) instead.
If Django REST Framework's token authentication is too basic, try [Django REST Knox](https://jazzband.github.io/django-rest-knox/auth/).

-- But what about CSRF?

Cross-site request forgery is an attack that tricks the victim into submitting a malicious request.
It works only in the context of cookie-based authentication, where browser automatically injects user's credentials in the requests.

In token authentication, the credentials are sent explicitly by the client in HTTP `Authorization` header.
Hence, there's no need protect the session from hijacking.

## Solution 2: Use HTTP Proxy Locally to Make AJAX Same-Origin

These troubles don't exist in production.
When serving from a proper domain and standard HTTPS port, CORS headers work as expected.

For the local development, you can set up a proxy, so that HTTP requests are sent to the same-origin frontend `localhost:3000`,
and proxied to `localhost:8000` from there.
The CORS protection is implemented only in the browser, and doesn't exist in server-to-server API calls (such as proxy).
