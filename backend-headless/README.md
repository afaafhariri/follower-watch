# Follower Watch — Headless Watcher

A standalone, no-login version of the follower-watch backend. Instead of a web
UI where you upload the Meta export zip, this service reads the export that
Meta delivers to your **Google Drive**, folds it into the follower set it
remembers, and **emails you the report**.

The analysis in `parse.go` mirrors the main backend's (`backend/instagram.go`):
the same file names, the same JSON shapes, the same not-following-back rule.
Only the input (Google Drive instead of an uploaded zip) and the output (email
instead of a JSON response) differ. There is no OAuth sign-in, no session, no
Redis; everything is configured through `.env`.

The watcher runs the pipeline **once and exits**. It does not schedule itself:
use Cloud Scheduler, cron, or launchd.

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

The watcher processes every `meta-*` folder it has not seen yet, oldest first,
and skips ones already folded in. A night that failed is therefore caught up on
the next run rather than lost — which matters, because an export you never
process is an export whose new followers you never learn about.

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
go run . -dry-run   # print the report without emailing or touching state
go run .            # run for real: email the report, save state
```

`-dry-run` is the safe way to check a change: it reads Drive, builds the exact
email, prints it, and leaves everything else alone.

With Docker Compose (from the repo root):

```bash
docker compose --profile watcher run --rm watcher
```

The follower set is stored in `DATA_DIR/state.json` (a named volume in Docker).
Keep it persistent — it is what every report is measured against.

### 4. Schedule it

The watcher exits after one run, so something external has to start it. The
deployed setup is a Cloud Run job triggered by Cloud Scheduler, built straight
from this directory:

```bash
gcloud run jobs deploy follower-watch --source backend-headless --region us-central1 --command ./watcher --args=-once
```

Set the job's `--max-retries=0`: a retry after a partial failure could send the
report twice, and a missed night is picked up by the next run anyway.

## Full vs incremental exports

A one-time Meta export contains your **complete** follower list. A *recurring*
export usually does not: `followers_1.json` carries only the followers gained
since the previous export — often one or two entries — while `following.json`
still arrives complete, and some nights a file is missing altogether.

Reading an incremental export as a full snapshot is catastrophic: two followers
against a stored 700 looks exactly like 698 people unfollowing you at once. So
every export is classified first:

| Export | Follower set | Unfollowers |
| --- | --- | --- |
| **Full snapshot** | replaced by the export's list | real diff against the previous set |
| **Incremental** | export's names added to the stored set | not reported — the feed only ever adds names |

Borderline cases are treated as incremental on purpose: missing one night's
unfollower report costs far less than inventing several hundred departures.

## What the email contains

- New followers since the last processed export
- Who **unfollowed** you — when the export was a full snapshot
- The full list of accounts that don't follow you back
- Follower/following totals, and which kind of export this was

After an incremental export the not-following-back list is built from the last
full snapshot plus every update since, so it can only *understate*: everyone
listed genuinely doesn't follow you back, but someone who quietly unfollowed
may be missing until the next full export.

The first run only records a baseline; tracking starts from the next export.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | A | Your OAuth client |
| `GOOGLE_REFRESH_TOKEN` | A | Output of `go run . -authorize` |
| `GOOGLE_SERVICE_ACCOUNT_FILE` | B | Path to a service-account JSON key |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | yes | SMTP server + credentials |
| `SMTP_PORT` | no | Default `587` |
| `EMAIL_FROM` / `EMAIL_TO` | no | Default to `SMTP_USER` |
| `DATA_DIR` | no | Where `state.json` lives (default `.`) |
| `AUTH_PORT` | no | Port for the `-authorize` callback (default `8090`) |
