FROM python:3.10-slim

# Install system dependencies for document conversions (LibreOffice) and OCR (Tesseract)
RUN apt-get update && apt-get install -y \
    libreoffice \
    tesseract-ocr \
    libtesseract-dev \
    ffmpeg \
    imagemagick \
    ghostscript \
    build-essential \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
