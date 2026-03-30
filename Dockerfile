# --- Stage 1: Build Frontend ---
FROM node:22-alpine AS web-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# --- Stage 2: Python Backend ---
FROM python:3.12-slim
WORKDIR /app

# Install build dependencies for any compiled python packages
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Create non-root user and group
RUN groupadd --gid 1000 ytmuser && \
    useradd --uid 1000 --gid ytmuser --shell /bin/bash --create-home ytmuser

# Copy Python files
COPY pyproject.toml ./
COPY src/ ./src/

# Install the package
RUN pip install --no-cache-dir -e "."

# Copy built frontend
COPY --from=web-builder /app/web/dist ./web/dist

# Create data directory and set ownership
RUN mkdir -p /app/data && chown -R ytmuser:ytmuser /app

# Switch to non-root user
USER ytmuser

VOLUME ["/app/data"]

EXPOSE 8080

CMD ["uvicorn", "ytmusicianship.api.main:app", "--host", "0.0.0.0", "--port", "8080"]
