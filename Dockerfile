# Multi-stage Dockerfile for SOSMIT application
# Build stage for Go backend
FROM golang:1.24-bookworm AS backend-build
WORKDIR /app/backend

# Dependency files
COPY backend/go.mod backend/go.sum ./

# Install dependencies
# --mount=type=cache saves them outside the image so we can reuse them when rebuilding
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Actual go code
# Only rebuilds when any .go files are changed (or any file in the backend/)
COPY backend/ ./

# Build with cache mounts
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/api

# Production stage with wkhtmltopdf
FROM debian:bookworm-slim AS production
ENV DEBIAN_FRONTEND=noninteractive

# Install wkhtmltopdf and required dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    wkhtmltopdf \
    ca-certificates \
    fonts-dejavu \
    fonts-liberation \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy backend binary and template views
COPY --from=backend-build /app/backend/server ./server
COPY backend/templates /app/templates

# Create uploads directory structure
RUN mkdir -p uploads/asset_condition_photos uploads/server-assets

# Expose backend port
EXPOSE 8080

# Set default environment variables (can be overridden by docker-compose)
ENV GIN_MODE=release TZ=Asia/Jakarta

# Start backend server
CMD ["./server"]
