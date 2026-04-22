import os
import uuid
import httpx
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from insightface.app import FaceAnalysis

app = FastAPI()

face_app = FaceAnalysis(name="buffalo_sc", providers=["CPUExecutionProvider"])
face_app.prepare(ctx_id=0, det_size=(640, 640))


class DetectRequest(BaseModel):
    mediaId: str
    albumId: str
    imageUrl: str


class FaceResult(BaseModel):
    id: str
    mediaId: str
    albumId: str
    descriptor: list[float]
    box: dict


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/detect", response_model=list[FaceResult])
async def detect(req: DetectRequest):
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

    faces = face_app.get(img)
    h, w = img.shape[:2]

    results = []
    for face in faces:
        x1, y1, x2, y2 = face.bbox.astype(int)
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
        ))

    return results


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
