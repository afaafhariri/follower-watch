# FollowerCount

A privacy-first web application that identifies Instagram users who don't follow you back. Built with Go (AWS Lambda), React/TypeScript (MUI), and deployed on AWS.

## 🔒 Privacy First

- **In-Memory Processing**: All data is processed entirely in RAM—nothing is ever written to disk
- **No Database**: We don't store any user data
- **No Logging**: Usernames and sensitive metadata are never logged to CloudWatch
- **Client-Side**: Results can be downloaded as CSV, generated entirely in your browser

## 🛠 Tech Stack

### Backend

- **Go 1.21+**: High-performance Lambda handler
- **AWS Lambda**: Serverless compute (ARM64/Graviton2)
- **API Gateway**: RESTful API with CORS

### Frontend

- **React 18**: Modern UI framework
- **TypeScript**: Type-safe development
- **Material UI (MUI) 7**: Component library
- **Vite**: Lightning-fast build tool
- **MUI X Data Grid**: High-performance data display

### Infrastructure

- **AWS SAM**: Infrastructure as Code
- **S3**: Static website hosting
- **CloudFront**: CDN with HTTPS

## 📁 Project Structure

```
follower-watch/
├── backend/                 # Go Lambda function
│   ├── main.go             # Lambda handler
│   ├── main_test.go        # Unit tests
│   ├── go.mod              # Go modules
│   └── Makefile            # Build commands
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── types/          # TypeScript types
│   │   ├── config/         # Configuration
│   │   └── App.tsx         # Main app component
│   ├── package.json
│   └── vite.config.ts
├── scripts/                # Build & deploy scripts
│   ├── deploy.sh           # Full deployment
│   └── dev.sh              # Local development
├── template.yaml           # AWS SAM template
└── samconfig.toml          # SAM configuration
```

## 🚀 Getting Started

### Prerequisites

- [Go 1.21+](https://golang.org/dl/)
- [Node.js 18+](https://nodejs.org/)
- [AWS CLI](https://aws.amazon.com/cli/)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

### Local Development

1. **Clone the repository**

   ```bash
   cd follower-watch
   ```

2. **Start the development environment**

   ```bash
   chmod +x scripts/dev.sh
   ./scripts/dev.sh
   ```

   This starts:
   - Backend on `http://localhost:3001`
   - Frontend on `http://localhost:3000`

3. **Or run separately**

   Backend:

   ```bash
   cd backend
   go run main.go  # For local testing
   # Or use SAM:
   sam local start-api --port 3001
   ```

   Frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Running Tests

```bash
cd backend
make test          # Run tests
make test-coverage # Run with coverage
```

## 🌐 Deployment

### Quick Deploy

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh prod
```

### Manual Deployment

1. **Build the backend**

   ```bash
   cd backend
   make build-arm  # For ARM64 Lambda
   ```

2. **Build the frontend**

   ```bash
   cd frontend
   VITE_API_URL=https://your-api-url npm run build
   ```

3. **Deploy with SAM**

   ```bash
   sam build
   sam deploy --guided  # First time
   sam deploy           # Subsequent deploys
   ```

4. **Deploy frontend to S3**
   ```bash
   aws s3 sync frontend/dist s3://your-bucket-name --delete
   ```

## 📋 How It Works

1. **User uploads** their Instagram data export (ZIP file)
2. **Backend receives** the file as a binary payload
3. **In-memory processing**:
   - Extract `following.json`
   - Extract all `followers_*.json` files
   - Build a HashSet of followers for O(1) lookup
   - Compare following list against followers set
4. **Return results** as JSON
5. **Frontend displays** results in a sortable data grid
6. **User can download** results as CSV

## 🔧 Configuration

### Environment Variables

Frontend (`.env`):

```env
VITE_API_URL=https://your-api-gateway-url
```

### SAM Parameters

| Parameter        | Description                         | Default |
| ---------------- | ----------------------------------- | ------- |
| `Stage`          | Deployment stage (dev/staging/prod) | `prod`  |
| `FrontendDomain` | CORS allowed origin                 | `*`     |

## 📊 API Reference

### POST /api/analyze

Upload a ZIP file for analysis.

**Request:**

- Content-Type: `application/zip`
- Body: Binary ZIP file

**Response:**

```json
{
  "success": true,
  "non_followers": [
    {
      "username": "example_user",
      "profile_url": "https://instagram.com/example_user",
      "followed_at": 1234567890
    }
  ],
  "total_following": 500,
  "total_followers": 450,
  "count": 75,
  "message": "Analysis complete"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Error message"
}
```

### Rate Limiting

- 10 requests per 5-minute window per IP
- HTTP 429 returned when exceeded

## 🛡 Security

- All connections use HTTPS
- CORS configured per environment
- Rate limiting prevents abuse
- No sensitive data logging
- Input validation for file type and size

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## ⚠️ Disclaimer

This tool is not affiliated with, endorsed by, or connected to Instagram or Meta Platforms, Inc. Use responsibly and in accordance with Instagram's Terms of Service.
