# Follower Watch — Headless Watcher

A standalone, no-login version of the follower-watch backend. Instead of a web
UI where you upload the Meta export zip, this service reads the export that
Meta delivers to your **Google Drive** every day, diffs it against the previous
run, and **emails you who unfollowed you** — every night at 1:30 AM by default.

The analysis logic is the same as the main backend; only the input (Google
Drive instead of an uploaded zip) and the output (email instead of JSON
response) differ. There is no OAuth sign-in, no session, no Redis — everything
is configured through `.env`.

## Prerequisite: Meta → Google Drive export

In Instagram's *Accounts Center → Your information and permissions → Export
your information*, set up a recurring export of **Followers and following**
(JSON) to Google Drive. Meta then creates a folder in your Drive per export:

```
meta-2026-Aug-11-09-04-51/
  instagram-<username>-2026-08-11-xxxxxxxx/
    connections/
      followers_and_following/
        followers_1.json
        following.json
        ...
```

The watcher always picks the **newest** `meta-*` folder and skips a run if
that folder was already processed.

## Setup

### 1. Google credentials

**Option A — OAuth refresh token (recommended, works for any Drive):**

1. Create a project at https://console.cloud.google.com and enable the
   **Google Drive API**.
2. Configure the OAuth consent screen (User type: External) and set the
   publishing status to **In production**. If you leave it in "Testing",
   Google expires refresh tokens after 7 days and the nightly job dies.
   You'll see an "unverified app" warning when you grant access — that's
   expected for a personal app; it's your own project and your own data.
3. Create an OAuth client → type **Web application** → add redirect URI
   `http://localhost:8090/callback`.
4. Copy `.env.example` to `.env`, fill in `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET`, then run:

   ```bash
   go run . -authorize
   ```

   Open the printed URL, grant read-only Drive access, and paste the printed
   `GOOGLE_REFRESH_TOKEN` into `.env`.

**Option B — service account:** only if your `meta-*` folders are created
inside a fixed parent folder. Share that parent folder with the service
account's email and set `GOOGLE_SERVICE_ACCOUNT_FILE` to its JSON key path.

The watcher only requests the read-only Drive scope
(`https://www.googleapis.com/auth/drive.readonly`); it never modifies your
Drive.

### 2. Email

Any SMTP server with STARTTLS works. For Gmail: enable 2FA, create an
**App password** (https://myaccount.google.com/apppasswords), and use it as
`SMTP_PASS`. `EMAIL_TO` accepts a comma-separated list of recipients.

### 3. Run it

Locally:

```bash
go run . -once     # run the pipeline right now (good for testing)
go run .           # run forever, firing at CRON_SCHEDULE (default 1:30 AM)
```

With Docker Compose (from the repo root):

```bash
docker compose --profile watcher up -d watcher
```

The follower snapshot is stored in `DATA_DIR/state.json` (a named volume in
Docker) — keep it persistent, it's what unfollower detection compares against.
Set `TZ` so 1:30 AM means *your* 1:30 AM.

## What the email contains

- Who **unfollowed** you since the last processed export
- New followers since the last processed export
- The full list of accounts that don't follow you back
- Follower/following totals

The first run only records a baseline (there's nothing to diff yet);
unfollower tracking starts with the second export.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | A | Your OAuth client |
| `GOOGLE_REFRESH_TOKEN` | A | Output of `go run . -authorize` |
| `GOOGLE_SERVICE_ACCOUNT_FILE` | B | Path to a service-account JSON key |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | yes | SMTP server + credentials |
| `SMTP_PORT` | no | Default `587` |
| `EMAIL_FROM` / `EMAIL_TO` | no | Default to `SMTP_USER` |
| `CRON_SCHEDULE` | no | Default `30 1 * * *` (1:30 AM nightly) |
| `TZ` | no | Timezone for the schedule, e.g. `Asia/Colombo` |
| `DATA_DIR` | no | Where `state.json` lives (default `.`) |
| `AUTH_PORT` | no | Port for the `-authorize` callback (default `8090`) |
