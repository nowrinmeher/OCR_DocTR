# Use official lightweight Python image
FROM python:3.10-slim

# Prevent Python from writing .pyc and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    HOME=/home/user

# Install system dependencies required for OpenCV, PyPDFium2, and document processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (UID 1000) for Hugging Face Spaces security standard
RUN useradd -m -u 1000 user
WORKDIR /app

# Install CPU-optimized PyTorch first for fast downloads and high compatibility
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install remaining python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY --chown=user:user . /app

# Ensure cache and app directories are writable
RUN mkdir -p /home/user/.cache && chown -R user:user /home/user /app

# Switch to non-root user
USER user

# Expose Hugging Face default port
EXPOSE 7860

# Start FastAPI server on 0.0.0.0:7860
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "7860"]
