# FollowerCount

A privacy-first web application that identifies Instagram users who don't follow you back. Built with Go (Cloud Functions) and React/TypeScript (MUI), deployed on Google Cloud Platform.

## 🔒 Privacy First

- **In-Memory Processing**: All data is processed entirely in RAM—nothing is ever written to disk
- **No Database**: We don't store any user data
- **No Logging**: Usernames and sensitive metadata are never logged
- **Client-Side**: Results can be downloaded as CSV, generated entirely in your browser

## 🛠 Tech Stack

### Backend

- **Go 1.21+**: High-performance Cloud Function
- **Cloud Functions (2nd gen)**: Serverless compute with automatic scaling
- **Functions Framework**: Google's official framework for portable functions

### Frontend

- **React 18**: Modern UI framework
- **TypeScript**: Type-safe development
- **Material UI (MUI) 7**: Component library
- **Vite**: Lightning-fast build tool
- **MUI X Data Grid**: High-performance data display

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

   Frontend:

   ```bash
   cd frontend
   npm install
   VITE_API_URL="http://localhost:8080" npm run dev
   ```

### Running Tests

```bash
cd backend
make test          # Run tests
make test-coverage # Run with coverage
```

## 🌐 Deployment

### Prerequisites

1. **Install gcloud CLI**

   ```bash
   # macOS
   brew install google-cloud-sdk

   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticate and set project**

   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Enable required APIs**

   ```bash
   gcloud services enable cloudfunctions.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   ```

### Deploy Cloud Function

```bash
./scripts/deploy.sh deploy
```

Or manually:

```bash
cd backend
make deploy
```

### Get Function URL

```bash
./scripts/deploy.sh info
# Or:
cd backend && make url
```

### Deploy Frontend

After deploying the backend, build the frontend with the function URL:

```bash
./scripts/deploy.sh frontend
```

Then deploy to Firebase Hosting (recommended):

```bash
npm install -g firebase-tools
firebase login
firebase init hosting  # Select your project, set public dir to frontend/dist
firebase deploy --only hosting
```

### Update CORS

After deploying the frontend, update the function's CORS settings:

```bash
cd backend
ALLOWED_ORIGINS="https://your-app.web.app" make deploy
```

### Other Commands

```bash
./scripts/deploy.sh info      # Get deployment info
./scripts/deploy.sh logs      # View function logs
./scripts/deploy.sh logs 100  # View last 100 logs
./scripts/deploy.sh delete    # Delete the function
```

## 📊 How It Works

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

## 💰 Cost Estimate

**Google Cloud Functions (2nd gen):**

- First 2 million invocations/month: Free
- Memory: 256MB
- Timeout: 60 seconds
- **Estimated cost: ~$0-5/month** for typical usage

**Firebase Hosting:**

- 10 GB storage: Free
- 360 MB/day bandwidth: Free
- **Typically free** for personal projects

## 🔧 Development

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
