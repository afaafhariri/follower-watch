# Follower-Watch

A **privacy-first** web application that identifies Instagram users who don't follow you back. Analysis results are optionally cached in Redis (keyed by SHA-256 hashed email) so returning users can view their last results without re-uploading.

## Tech Stack

### Backend

- **Go 1.21+**: High-performance HTTP server
- **Google OAuth2**: Authentication via Google accounts

### Frontend

- **React** with **TypeScript**
- **Material UI (MUI) 7**: Component library

### Infrastructure

- **Docker** + **Docker Compose**: Containerized deployment
- **Nginx**: Frontend reverse proxy
- **Redis**: Caching layer for last analysis results (30-day TTL)

## Project Structure

```
follower-watch/
├── backend/                 # Go HTTP server
│   ├── function.go         # Core analysis handler
│   ├── auth.go             # Google OAuth & session management
│   ├── cache.go            # Redis caching layer
│   ├── handlers.go         # Cached result API handlers
│   ├── function_test.go    # Unit tests
│   ├── go.mod              # Go modules
│   ├── Dockerfile          # Backend container
│   └── cmd/                # Server entrypoint
│       └── main.go         # HTTP server with routing
├── backend-headless/       # Headless watcher (no login): reads the Meta
│                           # export from Google Drive nightly and emails
│                           # the unfollower report — see its README.md
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── types/          # TypeScript types
│   │   ├── config/         # Configuration
│   │   └── App.tsx         # Main app component
│   ├── package.json
│   ├── vite.config.ts
│   ├── Dockerfile          # Frontend container
│   └── nginx.conf          # Nginx configuration
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Go 1.21+](https://golang.org/dl/) (for local backend development)
- [Docker](https://docs.docker.com/get-docker/) (for containerized deployment)

### Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client IDs**
5. Set application type to **Web application**
6. Add authorized redirect URIs:
   - Local: `http://localhost:8080/auth/google/callback`
   - Docker: `http://localhost/auth/google/callback`
   - Production: `https://yourdomain.com/auth/google/callback`
7. Copy the **Client ID** and **Client Secret** to your `.env` file

### Local Development

1. **Clone the repository**

   ```bash
   cd follower-watch
   ```

2. **Start Redis** (required for caching)

   ```bash
   docker run -d --name redis -p 6379:6379 redis:alpine
   ```

3. **Set up the backend**

   ```bash
   cd backend
   cp .env.example .env   # Create your local environment file
   # Edit .env with your Google OAuth credentials
   go run cmd/main.go     # Start the server
   ```

4. **Start the frontend** (in a new terminal)

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. Open http://localhost:3000 in your browser

> **Note:** If Redis is not running, the app still works — caching is gracefully disabled.

### Running Tests

```bash
cd backend
go test -v ./...
```

## Containerized Deployment (Docker)

### Quick Start

1. **Create a `.env` file** in the project root:

   ```env
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URL=http://localhost/auth/google/callback
   SESSION_SECRET=your-random-secret-key
   FRONTEND_URL=http://localhost
   ```

2. **Build and start**:

   ```bash
   docker compose up --build -d
   ```

3. Open http://localhost in your browser

### Production Deployment

For production, update the `.env` with your domain:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=https://yourdomain.com/auth/google/callback
SESSION_SECRET=a-strong-random-secret
FRONTEND_URL=https://yourdomain.com
```

Update `ALLOWED_ORIGINS` in `docker-compose.yml` to match your domain, then:

```bash
docker compose up --build -d
```

### Architecture

```
┌──────────┐     ┌───────────────┐     ┌──────────────┐     ┌───────────┐
│  Browser  │────▶│  Nginx (:80)  │────▶│  Go API      │────▶│  Redis    │
│           │◀────│  Frontend     │◀────│  (:8080)     │◀────│  (:6379)  │
└──────────┘     │  Static files │     │  OAuth +     │     │  Cache    │
                 │  /api → proxy │     │  Analysis    │     └───────────┘
                 └───────────────┘     └──────────────┘
```

- **Frontend container**: Nginx serves the React build and proxies `/api/*` and `/auth/*` to the backend
- **Backend container**: Go HTTP server handles authentication and file analysis
- **Redis container**: Stores cached analysis results per user (30-day TTL, keyed by SHA-256 hashed email)

## How It Works

1. **Sign In**
   - Sign in with your Google account (required to prevent abuse)

2. **Export Your Instagram Data**
   - Go to Instagram Settings → Your Activity → Download Your Information
   - Select "Followers and Following", clear other selections and select download as JSON
   - Download the ZIP file

3. **Upload the ZIP**
   - Drag and drop or select your Instagram data ZIP file
   - Your uploaded files are processed in-memory and never stored

4. **View Results**
   - See a list of accounts that don't follow you back
   - Sort and search through the results
   - Your last analysis is cached — returning users see their previous results automatically
   - Use "Clear cached data" to remove your stored results at any time

## Headless Watcher (automated nightly emails)

Prefer zero uploads? [backend-headless/](backend-headless/README.md) is a
standalone, no-login variant: set up Meta's recurring export to Google Drive,
deploy the watcher with your own credentials in `.env`, and it checks Drive
every night at 1:30 AM and emails you who unfollowed you since the last
export. Run it with:

```bash
docker compose --profile watcher up -d watcher
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
| `REDIS_URL` | Redis connection URI | No (default: `redis://localhost:6379`, Docker: `redis://redis:6379`) |

### Frontend (Build Time)

| Variable | Description | Required |
| --- | --- | --- |
| `VITE_API_URL` | Backend API URL prefix | No (default: `/api`) |

## License

MIT License - see [LICENSE](LICENSE)
