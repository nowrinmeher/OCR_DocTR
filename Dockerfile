# Use official lightweight Python image
FROM python:3.10-slim

# Prevent Python from writing .pyc and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install modern Debian 12 compatible system dependencies for OpenCV and PyPDFium2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install CPU-optimized PyTorch first for fast downloads and high compatibility
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install remaining python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Generate synthetic samples
RUN python backend/generate_samples.py

# Expose server port (defaults to 8000, Render overrides with $PORT)
EXPOSE 8000

# Start FastAPI server binding dynamically to $PORT (Render / Cloud standard)
CMD sh -c "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8000}"
