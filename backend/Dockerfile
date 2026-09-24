FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files and sample data
COPY . .

# Run initial seed to prepare SQLite DB
RUN python seed.py

# Default port
ENV PORT=8000
EXPOSE 8000

# Start Uvicorn dynamically binding to $PORT provided by host
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
