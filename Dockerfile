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

# Copy Python files
COPY pyproject.toml ./
COPY src/ ./src/

# Install the package
RUN pip install --no-cache-dir -e "."

# Copy built frontend
COPY --from=web-builder /app/web/dist ./web/dist

# Ensure data directory exists (bind-mounted at runtime)
RUN mkdir -p /app/data

VOLUME ["/app/data"]

EXPOSE 8080

CMD ["uvicorn", "ytmusicianship.api.main:app", "--host", "0.0.0.0", "--port", "8080"]
