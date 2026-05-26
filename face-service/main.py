import modal

app = modal.App("face-service")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libglib2.0-0", "libgl1", "libgomp1", "cmake", "build-essential", "gcc", "g++")
    .pip_install(
        "fastapi==0.115.0",
        "httpx==0.27.2",
        "numpy==1.26.4",
        "insightface==0.7.3",
        "onnxruntime==1.19.2",
        "opencv-python-headless==4.10.0.84",
    )
    .run_commands(
        # Bake the model into the image — containers start warm, no download delay
        'python -c "from insightface.app import FaceAnalysis; '
        "fa = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider']); "
        'fa.prepare(ctx_id=0, det_size=(640, 640))"'
    )
)


@app.function(image=image, scaledown_window=300)
@modal.concurrent(max_inputs=5)
@modal.asgi_app()
def serve():
    import asyncio
    import base64
    import uuid

    import cv2
    import httpx
    import numpy as np
    from fastapi import FastAPI, HTTPException
    from insightface.app import FaceAnalysis
    from pydantic import BaseModel

    web_app = FastAPI()

    # Loaded once per container, reused across all concurrent requests
    fa = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    fa.prepare(ctx_id=0, det_size=(640, 640), det_thresh=0.35)

    class DetectRequest(BaseModel):
        mediaId: str
        albumId: str
        imageUrl: str

    async def _detect_one(req: DetectRequest) -> list:
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                r = await client.get(req.imageUrl)
                r.raise_for_status()
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to fetch image: {e}")

        img_array = np.frombuffer(r.content, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            return []

        faces = await asyncio.to_thread(fa.get, img)
        h, w = img.shape[:2]

        results = []
        for face in faces:
            x1, y1, x2, y2 = face.bbox.astype(int)
            pad_x = int((x2 - x1) * 0.30)
            pad_y = int((y2 - y1) * 0.35)
            cx1 = max(0, x1 - pad_x)
            cy1 = max(0, y1 - pad_y)
            cx2 = min(w, x2 + pad_x)
            cy2 = min(h, y2 + pad_y)
            # Force square before resize to avoid stretching
            side = max(cx2 - cx1, cy2 - cy1)
            if cx2 - cx1 < side:
                expand = side - (cx2 - cx1)
                cx1 = max(0, cx1 - expand // 2)
                cx2 = min(w, cx1 + side)
                cx1 = max(0, cx2 - side)
            if cy2 - cy1 < side:
                expand = side - (cy2 - cy1)
                cy1 = max(0, cy1 - expand // 2)
                cy2 = min(h, cy1 + side)
                cy1 = max(0, cy2 - side)
            crop = img[cy1:cy2, cx1:cx2]
            crop_sq = cv2.resize(crop, (96, 96))
            _, buf = cv2.imencode(".jpg", crop_sq, [cv2.IMWRITE_JPEG_QUALITY, 85])
            crop_b64 = base64.b64encode(buf).decode()

            results.append({
                "id": str(uuid.uuid4()),
                "mediaId": req.mediaId,
                "albumId": req.albumId,
                "descriptor": face.normed_embedding.tolist(),
                "box": {
                    "x": max(0.0, x1 / w),
                    "y": max(0.0, y1 / h),
                    "w": min(1.0, (x2 - x1) / w),
                    "h": min(1.0, (y2 - y1) / h),
                },
                "cropB64": crop_b64,
            })
        return results

    @web_app.get("/health")
    def health():
        return {"ok": True}

    @web_app.post("/detect")
    async def detect(req: DetectRequest):
        return await _detect_one(req)

    @web_app.post("/detect-batch")
    async def detect_batch(body: dict):
        results = []
        for item in body.get("items", []):
            req = DetectRequest(**item)
            results.extend(await _detect_one(req))
        return results

    return web_app
