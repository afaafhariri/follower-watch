# Follower-Watch

A **privacy-first** tool that tells you which Instagram accounts don't follow you back — and who unfollowed you — using Meta's official data export. No Instagram password, no scraping, no third-party API access to your account: the only input is the data Meta itself hands you.

Sign in, upload the export zip Meta gives you, and see who doesn't follow you back — processed in memory, never stored.

> Prefer a set-and-forget nightly email instead of a browser? The headless pipeline that reads your Meta export straight from Google Drive lives in its own repository: [follower-watch-pipeline](https://github.com/afaafhariri/follower-watch-pipeline).

## How It Works

The backend parses two files from Meta's export (`connections/followers_and_following/followers_*.json` and `following.json`), builds the follower set and following list, and subtracts: anyone you follow who isn't in your follower set "doesn't follow you back."

> **Caveat:** a deactivated account disappears from Meta's export entirely, so it's indistinguishable from an unfollow. No export field exposes account status; every tool of this kind has the same false positive. A name that "unfollows" and later "re-follows" without action on their part is usually a deactivation/reactivation cycle.


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
├── frontend/                # React + TypeScript + MUI web UI
├── docker-compose.yml       # nginx + Go + Redis
└── README.md
```

## Getting Started

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

### Tests

```bash
cd backend && go test -v ./...
```

## Environment Variables

### Backend

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

## License

MIT License - see [LICENSE](LICENSE)
