# Unified Dockerfile for Render deployment
# Builds both frontend and backend, serves via nginx

# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend/ .

# Build with API pointing to /api
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ============================================
# Stage 2: Build Backend
# ============================================
FROM python:3.11-slim AS backend-build

WORKDIR /app/backend

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY backend/pyproject.toml ./
RUN pip install --upgrade pip && pip install .

# Copy backend code
COPY backend/ .

# ============================================
# Stage 3: Final Image with Nginx
# ============================================
FROM python:3.11-slim

# Install nginx, supervisor, and bash
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from backend-build
COPY --from=backend-build /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-build /usr/local/bin /usr/local/bin

# Copy backend code
WORKDIR /app/backend
COPY --from=backend-build /app/backend .

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Create cache directory
RUN mkdir -p /data/cache && chmod 777 /data/cache

# Nginx configuration
RUN rm /etc/nginx/sites-enabled/default
COPY <<'NGINX' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;

    # Frontend static files
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

# Supervisor configuration
COPY <<'SUPERVISOR' /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:backend]
command=python -m uvicorn beyond_api.main:app --host 127.0.0.1 --port 8000
directory=/app/backend
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
SUPERVISOR

# Environment variables
ENV BASIC_AUTH_USERNAME=beyond
ENV BASIC_AUTH_PASSWORD=beyond2026
ENV CACHE_DIR=/data/cache
ENV PYTHONUNBUFFERED=1

# Render uses PORT environment variable (default 10000)
ENV PORT=10000
EXPOSE 10000

# Start script that configures nginx to use $PORT
COPY <<'STARTSCRIPT' /start.sh
#!/bin/bash
# Replace port 80 with $PORT in nginx config
sed -i "s/listen 80/listen $PORT/" /etc/nginx/conf.d/default.conf
# Start supervisor
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
STARTSCRIPT

RUN chmod +x /start.sh

CMD ["/start.sh"]
