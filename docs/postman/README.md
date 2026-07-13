# Postman

`nexuscrm.postman_collection.json` — import it once (Postman → Import → File). Every later phase adds requests to the same file rather than shipping a new one.

## Before you start

Run the API: `pnpm --filter api dev`. The collection points at `http://localhost:3001` through the `baseUrl` collection variable; change that one value to talk to a deployed environment.

## The session is a cookie, not a header

There is no bearer token to copy: `/auth/register` and `/auth/login` return `Set-Cookie: access_token` and `refresh_token`, both `httpOnly`, and Postman's cookie jar sends them back to the same host on its own (spec §6). Register or log in once, and every other request is authenticated.

If a request comes back 401 because the 15-minute access token expired, the collection's post-response script calls `POST /auth/refresh` for you — send the request again and it works. `POST /auth/logout` clears the jar, so what follows it is genuinely unauthenticated.

## Things worth trying by hand

- Call `/auth/register` twice: the second one is `403 auth.registrationClosed`. That endpoint bootstraps the instance and then locks itself (spec §6.1).
- Register with a password under 8 characters: `422`, with `issues[0].path = "password"` and `params.minimum = 8`.
- Save a `refresh_token` cookie value, rotate once with `/auth/refresh`, then replay the saved one: `401 auth.refreshTokenReused`, and every session that user holds is revoked.

## Errors

Every failure has the same shape — `{ code, message, params?, issues? }` — and `code` is the i18n key the frontend translates. `message` is English and is only there for logs.
