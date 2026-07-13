# Postman

Import both files once (Postman → Import → Files). Every later phase adds requests to the same collection rather than shipping a new one.

- `nexuscrm.postman_collection.json` — the requests.
- `nexuscrm-local.postman_environment.json` — the machine they run against, plus the credentials the auth requests send. Select it in the environment picker, top right.

## Before you start

Run the API: `pnpm --filter api dev`. The environment points `baseUrl` at `http://localhost:3001`; duplicate it and change that one value to talk to a deployed API. The collection carries the same defaults, so it also works with no environment selected — an environment wins over a collection variable of the same name, which is exactly what makes staging a copy of one file.

`userId` and `orgId` are deliberately **not** in the environment: the test scripts write them as collection variables after a login, and an environment variable of the same name would shadow what they wrote.

`password` is stored as a `secret` variable, so Postman keeps it out of exports and out of shared workspaces.

## The session is a cookie, not a header

There is no bearer token to copy: `/auth/register` and `/auth/login` return `Set-Cookie: access_token` and `refresh_token`, both `httpOnly`, and Postman's cookie jar sends them back to the same host on its own (spec §6). Register or log in once, and every other request is authenticated.

If a request comes back 401 because the 15-minute access token expired, the collection's post-response script calls `POST /auth/refresh` for you — send the request again and it works. `POST /auth/logout` clears the jar, so what follows it is genuinely unauthenticated.

## Things worth trying by hand

- Call `/auth/register` twice: the second one is `403 auth.registrationClosed`. That endpoint bootstraps the instance and then locks itself (spec §6.1).
- Register with a password under 8 characters: `422`, with `issues[0].path = "password"` and `params.minimum = 8`.
- Save a `refresh_token` cookie value, rotate once with `/auth/refresh`, then replay the saved one: `401 auth.refreshTokenReused`, and every session that user holds is revoked.

## Errors

Every failure has the same shape — `{ code, message, params?, issues? }` — and `code` is the i18n key the frontend translates. `message` is English and is only there for logs.
