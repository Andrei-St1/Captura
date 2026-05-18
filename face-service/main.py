import asyncio
import base64
import os
import uuid
import httpx
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from insightface.app import FaceAnalysis

app = FastAPI()

face_app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
face_app.prepare(ctx_id=0, det_size=(640, 640), det_thresh=0.35)


class DetectRequest(BaseModel):
    mediaId: str
    albumId: str
    imageUrl: str


class DetectBatchRequest(BaseModel):
    items: list[DetectRequest]


class FaceResult(BaseModel):
    id: str
    mediaId: str
    albumId: str
    descriptor: list[float]
    box: dict
    cropB64: str


@app.get("/health")
def health():
    return {"ok": True}


async def _detect_one(req: DetectRequest) -> list[FaceResult]:
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.get(req.imageUrl)
            r.raise_for_status()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch image: {e}")

    import cv2
    img_array = np.frombuffer(r.content, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img is None:
        return []

    # Run inference off the event loop so concurrent requests don't serialize
    faces = await asyncio.to_thread(face_app.get, img)
    h, w = img.shape[:2]

    results = []
    for face in faces:
        x1, y1, x2, y2 = face.bbox.astype(int)

        # Crop with padding for a natural face thumbnail
        pad_x = int((x2 - x1) * 0.30)
        pad_y = int((y2 - y1) * 0.35)
        cx1 = max(0, x1 - pad_x)
        cy1 = max(0, y1 - pad_y)
        cx2 = min(w, x2 + pad_x)
        cy2 = min(h, y2 + pad_y)
        crop = img[cy1:cy2, cx1:cx2]
        crop_sq = cv2.resize(crop, (80, 80))
        _, buf = cv2.imencode(".jpg", crop_sq, [cv2.IMWRITE_JPEG_QUALITY, 85])
        crop_b64 = base64.b64encode(buf).decode()

        results.append(FaceResult(
            id=str(uuid.uuid4()),
            mediaId=req.mediaId,
            albumId=req.albumId,
            descriptor=face.normed_embedding.tolist(),
            box={
                "x": max(0.0, x1 / w),
                "y": max(0.0, y1 / h),
                "w": min(1.0, (x2 - x1) / w),
                "h": min(1.0, (y2 - y1) / h),
            },
            cropB64=crop_b64,
        ))
    return results


@app.post("/detect", response_model=list[FaceResult])
async def detect(req: DetectRequest):
    return await _detect_one(req)


@app.post("/detect-batch", response_model=list[FaceResult])
async def detect_batch(req: DetectBatchRequest):
    results = []
    for item in req.items:
        results.extend(await _detect_one(item))
    return results


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
