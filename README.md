# Follower-Watch

A **privacy-first** tool that tells you which Instagram accounts don't follow you back — and who unfollowed you — using Meta's official data export. No Instagram password, no scraping, no third-party API access to your account: the only input is the data Meta itself hands you.

It ships with **two backends that share the same analysis logic but deliver it in opposite ways**: an interactive web app you upload an export to, and a headless pipeline that checks your Google Drive every night and emails you the result.

## Why Two Backends?

The web app came first: you download your Meta export zip, upload it, and read the results in the browser. That's great for a one-off check, but it has a human in the loop — you have to remember to request the export, download it, and upload it.

Meta can also deliver the export **on a schedule straight to Google Drive**. That removes the last manual step and makes a fully automated pipeline possible: the headless backend reads the newest export from Drive every night, compares it with the previous night's snapshot, and emails you who unfollowed you. No UI, no sign-in, no server that users visit — just a scheduled job and your inbox.

| | `backend/` (web app) | `backend-headless/` (watcher) |
| --- | --- | --- |
| Interface | Browser (React frontend) | Email |
| Trigger | You upload a zip | Cloud Scheduler, nightly |
| Input | Meta export **zip** | Meta export **in Google Drive** |
| Auth | Google sign-in (protects the public endpoint) | None — single-owner deployment, secrets in `.env` |
| Detects | Who doesn't follow you back | Same, **plus who unfollowed / newly followed since last run** (see [Full vs incremental exports](#full-vs-incremental-exports)) |
| State | Redis cache (optional, for returning users) | `state.json` snapshot (required — unfollower detection is a diff over time) |
| Deploy | Docker Compose (nginx + Go + Redis) | Cloud Run Job + Cloud Scheduler, or Docker |

**Which one should you choose?**

- You want to check occasionally, or host a tool other people can use → **web app**.
- You want a set-and-forget personal daily report → **headless watcher**.
- They don't conflict: run both from the same repo if you like.

## How They Work

Both backends parse the same files from Meta's export (`connections/followers_and_following/followers_*.json` and `following.json`), build the follower set and following list, and subtract: anyone you follow who isn't in your follower set "doesn't follow you back."

> **Shared caveat:** a deactivated account disappears from Meta's export entirely, so it's indistinguishable from an unfollow. No export field exposes account status; every tool of this kind has the same false positive. A name that "unfollows" and later "re-follows" without action on their part is usually a deactivation/reactivation cycle.

### The web app (`backend/` + `frontend/`)

```
┌──────────┐     ┌───────────────┐     ┌──────────────┐     ┌───────────┐
│  Browser  │────▶│  Nginx (:80)  │────▶│  Go API      │────▶│  Redis    │
│           │◀────│  Frontend     │◀────│  (:8080)     │◀────│  (:6379)  │
└──────────┘     │  Static files │     │  OAuth +     │     │  Cache    │
                 │  /api → proxy │     │  Analysis    │     └───────────┘
                 └───────────────┘     └──────────────┘
```

1. Sign in with Google (the endpoint is public, so sign-in prevents abuse).
2. Upload your Meta export zip — it's processed **in memory** and never stored.
3. See, sort, and search the accounts that don't follow you back.
4. Your last result is optionally cached in Redis (30-day TTL, keyed by SHA-256-hashed email) so returning users see it without re-uploading.

### The headless watcher (`backend-headless/`)

```
Meta (daily export)                     nightly
        │                                  │
        ▼                                  ▼
┌───────────────┐   read-only    ┌───────────────────────┐   SMTP   ┌─────────┐
│ Google Drive  │───────────────▶│  watcher               │─────────▶│  Inbox  │
│ meta-<date>/… │   Drive API    │  parse → fold → mail   │          └─────────┘
└───────────────┘                └──────────┬────────────┘
                                            │ load / save
                                     ┌──────▼──────┐
                                     │ state.json  │  known follower set
                                     └─────────────┘
```

1. Meta's recurring export lands in your Drive as `meta-<date>/instagram-<user>-<date>/connections/followers_and_following/*.json`.
2. Each night the watcher lists every `meta-*` folder via the Drive API (read-only scope, authorized once with a refresh token) and processes the ones it hasn't seen, oldest first. Already-processed exports are skipped, so restarts never double-send, and a night that failed is caught up on the next run.
3. It runs the shared analysis and folds each export into the stored follower set — see below, because *how* it folds depends on what Meta actually sent.
4. It emails you once: new followers, unfollowers where they can be determined, the full not-following-back list, and totals — then saves the updated set. The first run only records a baseline.

#### Full vs incremental exports

A one-time Meta export contains your **complete** follower list. A *recurring* export usually does not: `followers_1.json` carries only the followers gained since the previous export — often one or two entries — while `following.json` still arrives complete. Some nights a file is missing altogether.

Reading an incremental export as though it were a full snapshot is catastrophic: two followers against a stored 700 looks exactly like 698 people unfollowing you at once. So each export is classified before it is used:

- **Full snapshot** — the follower list replaces the stored set, and the difference between them is a real unfollower report.
- **Incremental** — the new names are added to the stored set, and the report says nothing about unfollowers, because a feed that only ever adds names cannot show someone leaving.

When the classification is borderline the export is treated as incremental: missing one night's unfollower report costs far less than inventing several hundred departures. Unfollower detection therefore happens whenever a full export arrives — either because your recurring export is configured to send everything, or because you requested a one-time export, which the watcher picks up automatically.

Full setup (Google Cloud project, `-authorize` flow, SMTP, scheduling, deployment options) is in **[backend-headless/README.md](backend-headless/README.md)**.

## Project Structure

```
follower-watch/
├── backend/                 # Web-app backend: Go HTTP server
│   ├── instagram.go        # Core analysis (zip parsing, non-followers)
│   ├── facebook.go         # Facebook export analysis
│   ├── auth.go             # Google OAuth & session management
│   ├── cache.go            # Redis caching layer
│   ├── handlers.go         # Cached-result API handlers
│   └── cmd/main.go         # HTTP server entrypoint
├── backend-headless/        # Watcher: no UI, no sign-in
│   ├── main.go             # Entrypoint: -dry-run / -authorize flags
│   ├── pipeline.go         # One run: fetch → fold in → report → save
│   ├── drive.go            # Google Drive traversal & download
│   ├── parse.go            # Export parsing (mirrors backend/instagram.go)
│   ├── analyze.go          # Full-vs-incremental classification, set math
│   ├── state.go            # state.json persistence
│   ├── mailer.go           # SMTP report delivery
│   └── authorize.go        # One-time OAuth flow → refresh token
├── frontend/                # React + TypeScript + MUI web UI
├── docker-compose.yml       # web app stack + opt-in `watcher` profile
└── README.md
```

## Getting Started

### Web app

**Prerequisites:** [Node.js 18+](https://nodejs.org/), [Go 1.21+](https://golang.org/dl/), [Docker](https://docs.docker.com/get-docker/) (optional).

1. **Google OAuth setup** — in the [Google Cloud Console](https://console.cloud.google.com/), create an OAuth 2.0 Client ID (type: Web application) with redirect URI `http://localhost:8080/auth/google/callback` (local) or `https://yourdomain.com/auth/google/callback` (production).

2. **Local development:**

   ```bash
   docker run -d --name redis -p 6379:6379 redis:alpine   # optional; caching degrades gracefully
   cd backend && cp .env.example .env                     # fill in OAuth credentials
   go run cmd/main.go
   ```

   In a second terminal: `cd frontend && npm install && npm run dev`, then open http://localhost:3000.

3. **Docker deployment** — create a root `.env` with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL`, `SESSION_SECRET`, `FRONTEND_URL`, then:

   ```bash
   docker compose up --build -d
   ```

### Headless watcher

```bash
cd backend-headless
cp .env.example .env        # fill in Google + SMTP credentials
go run . -authorize          # one-time: mints the Drive refresh token
go run . -once               # test run: fetches, analyzes, emails now
```

Run it forever with `go run .` (in-process cron), via Docker:

```bash
docker compose --profile watcher up -d watcher
```

…or serverlessly (Cloud Run Job + Cloud Scheduler + a GCS bucket for state runs comfortably in the free tier). Step-by-step instructions: [backend-headless/README.md](backend-headless/README.md).

### Tests

```bash
cd backend && go test -v ./...
cd backend-headless && go test -v ./...
```

## Environment Variables

### Web app backend

| Variable | Description | Required |
| --- | --- | --- |
| `PORT` | Server port | No (default: `8080`) |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | No (default: `*`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `GOOGLE_REDIRECT_URL` | OAuth callback URL | Yes |
| `SESSION_SECRET` | Key for signing session cookies | Yes |
| `FRONTEND_URL` | URL to redirect after login | No (default: `/`) |
| `REDIS_URL` | Redis connection URI | No (default: `redis://localhost:6379`) |

### Frontend (build time)

| Variable | Description | Required |
| --- | --- | --- |
| `VITE_API_URL` | Backend API URL prefix | No (default: `/api`) |

### Headless watcher

See the table in [backend-headless/README.md](backend-headless/README.md#environment-variables) — Google Drive credentials, SMTP settings, schedule, and state location.

## License

MIT License - see [LICENSE](LICENSE)
