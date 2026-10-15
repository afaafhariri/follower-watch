# Single image for production: the Go server serves both the API and the built
# frontend from one origin, which the Google sign-in cookie requires.
# (docker-compose.yml uses server/Dockerfile and web/Dockerfile instead.)

FROM node:22-alpine AS frontend

WORKDIR /app

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ .

ENV VITE_API_URL=/api
RUN npm run build

FROM golang:1.25-alpine AS backend

WORKDIR /app

COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server/ .

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
