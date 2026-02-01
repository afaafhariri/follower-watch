# FollowerCount

A **privacy-first** web application that identifies Instagram users who don't follow you back. Data is processed entirely in RAM—nothing is ever written to disk and we never store any data.

## Tech Stack

### Backend

- **Go 1.21+**: High-performance Cloud Function

### Frontend

- **React** with **TypeScript**
- **Material UI (MUI) 7**: Component library

### Infrastructure

- **Google Cloud Functions**: Serverless backend (2nd generation)
- **Firebase Hosting**: (Recommended) Static site hosting with CDN
- **Cloud Storage**: Alternative static hosting option

## 📁 Project Structure

```
follower-watch/
├── backend/                 # Go Cloud Function
│   ├── function.go         # Main function handler
│   ├── function_test.go    # Unit tests
│   ├── go.mod              # Go modules
│   ├── Makefile            # Build commands
│   └── cmd/                # Local development
│       └── main.go         # Functions framework runner
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── types/          # TypeScript types
│   │   ├── config/         # Configuration
│   │   └── App.tsx         # Main app component
│   ├── package.json
│   └── vite.config.ts
├── scripts/                # Build & deploy scripts
│   ├── deploy.sh           # GCP deployment
│   └── dev.sh              # Local development
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- [Go 1.21+](https://golang.org/dl/)
- [Node.js 18+](https://nodejs.org/)
- [gcloud CLI](https://cloud.google.com/sdk/docs/install)

### Local Development

1. **Clone the repository**

   ```bash
   cd follower-watch
   ```

2. **Start the development environment**

   ```bash
   ./scripts/dev.sh
   ```

   This starts:
   - Cloud Functions emulator on `http://localhost:8080`
   - Frontend on `http://localhost:3000`

3. **Or run separately**

   Backend:

   ```bash
   cd backend
   make run
   ```

   0r

   ```bash
   cd backend
   PORT=8080 go run cmd/main.go
   ```

   Frontend:

   ```bash
   cd frontend
   npm install
   VITE_API_URL="api" npm run dev
   ```

### Running Tests

```bash
cd backend
make test          # Run tests
make test-coverage # Run with coverage
```

## How It Works

1. **Export Your Instagram Data**
   - Go to Instagram Settings → Your Activity → Download Your Information
   - Select "Followers and Following" and download as JSON
   - Download the ZIP file

2. **Upload the ZIP**
   - Drag and drop or select your Instagram data ZIP file
   - The function processes everything in-memory

3. **View Results**
   - See a list of accounts that don't follow you back
   - Sort and search through the results
   - Download as CSV if needed

## Cost Estimate

**Google Cloud Functions (2nd gen):**

- First 2 million invocations/month: Free
- Memory: 256MB
- Timeout: 60 seconds
- **Estimated cost: ~$0-5/month** for typical usage

**Firebase Hosting:**

- 10 GB storage: Free
- 360 MB/day bandwidth: Free
- **Typically free** for personal projects

## Development

### Project Structure

The backend uses Google's functions-framework-go which allows:

- Local development with the same code that runs in production
- Easy testing with standard Go testing tools
- Portable functions that can run anywhere

### Environment Variables

**Backend:**

- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)
- `PORT`: Server port (default: 8080)
- `FUNCTION_TARGET`: Function name for local dev

**Frontend:**

- `VITE_API_URL`: Backend function URL

## 📝 License

MIT License - see [LICENSE](LICENSE)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request
