# Follower-Watch

A **privacy-first** web application that identifies Instagram users who don't follow you back. Data is processed entirely in RAM—nothing is ever written to disk and we never store any data.

<div align="center">
  <img src="frontend/public/instagram-color-svgrepo-com.png" alt="FollowerWatch Logo" width="96" height="96">
</div>

## Tech Stack

### Backend

- **Go 1.21+**: High-performance Cloud Function

### Frontend

- **React** with **TypeScript**
- **Material UI (MUI) 7**: Component library

### Infrastructure

- **Google Cloud Functions**: Serverless backend (2nd generation)
- **Cloud Storage**: Static website hosting

## 📁 Project Structure

```
follower-watch/
├── backend/                 # Go Cloud Function
│   ├── function.go         # Main function handler
│   ├── function_test.go    # Unit tests
│   ├── go.mod              # Go modules
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
├── DEPLOYMENT.md           # Deployment instructions
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Go 1.21+](https://golang.org/dl/) (for local backend development)

### Local Development

1. **Clone the repository**

   ```bash
   cd follower-watch
   ```

2. **Set up the backend**

   ```bash
   cd backend
   cp .env.example .env   # Create your local environment file
   go run cmd/main.go     # Start the server
   ```

3. **Start the frontend** (in a new terminal)

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open http://localhost:3000 in your browser

### Running Tests

```bash
cd backend
go test -v ./...
```

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment instructions using Google Cloud Console.

**Quick Overview:**

1. Deploy backend code to **Google Cloud Functions** via the console
2. Build frontend locally with `npm run build`
3. Upload `dist/` folder to **Cloud Storage** bucket
4. Configure CORS settings

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

## Cost Estimate

**Google Cloud Functions (2nd gen):**

- First 2 million invocations/month: Free
- Memory: 256MB
- Timeout: 60 seconds
- **Estimated cost: ~$0-5/month** for typical usage

**Cloud Storage:**

- 5 GB storage: Free
- 1 GB/day egress: Free
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

**Frontend (Build Time):**

- `VITE_API_URL`: Backend function URL

## 📝 License

MIT License - see [LICENSE](LICENSE)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request
