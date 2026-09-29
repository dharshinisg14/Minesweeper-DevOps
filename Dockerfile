# ========================================================
# Stage 1: Build & Unit Test Stage (Node.js Alpine)
# ========================================================
FROM node:20-alpine AS test-runner

WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching
COPY app/package*.json ./

# Install development dependencies for Jest testing
RUN npm install --quiet

# Copy application source code and test files
COPY app/ ./

# Execute automated unit test suite during Docker build
# If any unit tests fail, Docker build aborts immediately
RUN npm test

# ========================================================
# Stage 2: Production Web Server Stage (Nginx Alpine)
# ========================================================
FROM nginx:1.27-alpine-slim AS production

LABEL maintainer="DevOps Team <devops@example.com>" \
      description="Production container image for Minesweeper Clone web application" \
      version="1.0.0"

# Remove default Nginx welcome page and configs
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy custom high-performance Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy tested web assets from test-runner stage
COPY --from=test-runner /app/index.html /usr/share/nginx/html/
COPY --from=test-runner /app/style.css /usr/share/nginx/html/
COPY --from=test-runner /app/script.js /usr/share/nginx/html/
COPY --from=test-runner /app/minesweeper-game.js /usr/share/nginx/html/

# Set proper ownership and permissions
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Configure Docker container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1/healthz || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
