# Multi-stage Dockerfile for SOSMIT application
# Build stage for Go backend
FROM golang:1.24-bookworm AS backend-build
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/api

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
    && rm -rf /var/lib/apt/lists/*


# Create app directory
WORKDIR /app

# Copy backend binary
COPY --from=backend-build /app/backend/server ./server

# Copy template files
COPY backend/templates /app/templates

# Create uploads directory structure
RUN mkdir -p uploads/asset_condition_photos uploads/server-assets

# Expose backend port
EXPOSE 8080

# Set default environment variables (can be overridden by docker-compose)
ENV GIN_MODE=release

# Start backend server
CMD ["./server"]
