FROM python:3.11-slim

WORKDIR /app

# Install minimal build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and dataset
COPY backend/ ./backend/
COPY data/ ./data/

# Set working directory to backend so app.main is directly importable
WORKDIR /app/backend
ENV PYTHONPATH=/app/backend

# Default port
ENV PORT=8000
EXPOSE 8000

# Start Uvicorn binding to the port provided by Railway ($PORT)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
