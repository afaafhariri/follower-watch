# Single image for production: the Go server serves both the API and the built
# frontend from one origin, which the Google sign-in cookie requires.
# (docker-compose.yml uses backend/Dockerfile and frontend/Dockerfile instead.)

FROM node:22-alpine AS frontend

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .

ENV VITE_API_URL=/api
RUN npm run build

FROM golang:1.25-alpine AS backend

WORKDIR /app

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .

RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/main.go

FROM alpine:3.19

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=backend /app/server .
COPY --from=frontend /app/dist ./static

ENV STATIC_DIR=/app/static
ENV PORT=8080

EXPOSE 8080

CMD ["./server"]
