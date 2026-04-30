FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libglib2.0-0 libgl1 libgomp1 \
    cmake build-essential gcc g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download insightface model at build time so first request is fast
RUN python -c "from insightface.app import FaceAnalysis; a = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider']); a.prepare(ctx_id=0)"

COPY main.py .

EXPOSE 8000
CMD ["python", "main.py"]
