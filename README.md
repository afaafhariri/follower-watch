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
- **Firebase Hosting**: Static website hosting


The backend uses Google's functions-framework-go which allows:

- Local development with the same code that runs in production
- Easy testing with standard Go testing tools
- Portable functions that can run anywhere

## Project Structure

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
└── README.md
```

## Getting Started

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

## How It Works

1. **Export Your Instagram Data**
   - Go to Instagram Settings → Your Activity → Download Your Information
   - Select "Followers and Following", clear other selections and select download as JSON
   - Download the ZIP file

2. **Upload the ZIP**
   - Drag and drop or select your Instagram data ZIP file
   - The function processes everything in-memory

3. **View Results**
   - See a list of accounts that don't follow you back
   - Sort and search through the results

## License

MIT License - see [LICENSE](LICENSE)