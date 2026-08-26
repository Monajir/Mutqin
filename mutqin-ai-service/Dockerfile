FROM python:3.11-slim

# ffmpeg/libsndfile needed by librosa for audio decoding (m4a, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
# quran-content.db is intentionally NOT baked into the image — mount it at
# runtime (see README "Deploying" section) so content updates don't require
# a rebuild.

ENV QURAN_DB_PATH=/data/quran-content.db
ENV ASR_DEVICE=cpu

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready', timeout=4)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
