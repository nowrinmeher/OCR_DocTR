import os
import io
import base64
import time
from typing import List, Optional, Tuple
import torch
import numpy as np
from PIL import Image
import pypdfium2 as pdfium
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from backend.ocr_engine import DocTROCREngine

app = FastAPI(
    title="DocTR Intelligent OCR Studio",
    description="High-Precision Word Detection and Recognition powered by custom docTR models",
    version="2.0.0"
)

# Enable CORS for local development and web access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "Models")
STATIC_DIR = os.path.join(BASE_DIR, "static")
SAMPLES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples")

DET_MODEL_PATH = os.path.join(MODELS_DIR, "db_resnet50_best_V2.pt")
REC_MODEL_PATH = os.path.join(MODELS_DIR, "crnn_vgg16_bn_best_English.pt")

ocr_engine: Optional[DocTROCREngine] = None

@app.on_event("startup")
def startup_event():
    global ocr_engine
    if ocr_engine is None:
        ocr_engine = DocTROCREngine(
            det_path=DET_MODEL_PATH,
            rec_path=REC_MODEL_PATH
        )

def load_file_to_images(file_bytes: bytes, filename: str) -> Tuple[List[np.ndarray], List[str]]:
    """Convert uploaded bytes (PDF or Image) to a list of (RGB numpy array, base64 data URI)."""
    ext = os.path.splitext(filename.lower())[1]
    images_np = []
    images_b64 = []
    
    if ext == ".pdf":
        pdf = pdfium.PdfDocument(file_bytes)
        for page_idx in range(len(pdf)):
            page = pdf.get_page(page_idx)
            # Render page at 2x scale for crisp OCR (144 DPI)
            pil_image = page.render(scale=2.0).to_pil().convert("RGB")
            np_arr = np.array(pil_image)
            images_np.append(np_arr)
            
            # Base64 encode
            buf = io.BytesIO()
            pil_image.save(buf, format="JPEG", quality=90)
            b64_str = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")
            images_b64.append(b64_str)
    else:
        try:
            pil_image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            np_arr = np.array(pil_image)
            images_np.append(np_arr)
            
            buf = io.BytesIO()
            # Determine format
            save_format = "PNG" if ext == ".png" else "JPEG"
            pil_image.save(buf, format=save_format, quality=92)
            mime = "image/png" if ext == ".png" else "image/jpeg"
            b64_str = f"data:{mime};base64," + base64.b64encode(buf.getvalue()).decode("utf-8")
            images_b64.append(b64_str)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")
            
    return images_np, images_b64

@app.get("/api/status")
async def get_status():
    gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "None (CPU Mode)"
    return {
        "status": "online",
        "detection_model": "DBNet (ResNet-50 backbone) - db_resnet50_best_V2.pt",
        "recognition_model": "CRNN (VGG-16 BN backbone) - crnn_vgg16_bn_best_English.pt",
        "cuda_available": torch.cuda.is_available(),
        "device": str(ocr_engine.device if ocr_engine else "Not initialized"),
        "gpu_name": gpu_name,
        "vocab_size": len(ocr_engine.vocab) if ocr_engine else 170
    }

@app.get("/api/samples")
async def list_samples():
    return {
        "samples": [
            {
                "id": "sample_invoice",
                "name": "Corporate Invoice",
                "filename": "sample_invoice.png",
                "description": "Multi-item invoice with invoice ID, customer address, line items, and totals."
            },
            {
                "id": "sample_receipt",
                "name": "Retail Coffee Receipt",
                "filename": "sample_receipt.png",
                "description": "Standard point-of-sale receipt with itemized charges and prices."
            }
        ]
    }

@app.post("/api/ocr")
async def run_ocr(file: UploadFile = File(...)):
    if ocr_engine is None:
        raise HTTPException(status_code=503, detail="OCR engine is not initialized yet.")
    
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        
    try:
        images_np, images_b64 = load_file_to_images(file_bytes, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decode document: {str(e)}")
        
    if not images_np:
        raise HTTPException(status_code=400, detail="No readable pages found in file.")
        
    result = ocr_engine.process_images(images_np)
    
    # Attach page image data URIs for client rendering
    for idx, page in enumerate(result["pages"]):
        page["image_data"] = images_b64[idx]
        
    result["filename"] = file.filename
    return JSONResponse(content=result)

@app.post("/api/ocr-sample/{sample_id}")
async def run_ocr_sample(sample_id: str):
    if ocr_engine is None:
        raise HTTPException(status_code=503, detail="OCR engine is not initialized yet.")
        
    sample_file = os.path.join(SAMPLES_DIR, f"{sample_id}.png")
    if not os.path.exists(sample_file):
        raise HTTPException(status_code=404, detail=f"Sample '{sample_id}' not found.")
        
    with open(sample_file, "rb") as f:
        file_bytes = f.read()
        
    images_np, images_b64 = load_file_to_images(file_bytes, f"{sample_id}.png")
    result = ocr_engine.process_images(images_np)
    
    for idx, page in enumerate(result["pages"]):
        page["image_data"] = images_b64[idx]
        
    result["filename"] = f"{sample_id}.png"
    return JSONResponse(content=result)

# Mount static folder
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
async def root():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "DocTR OCR Server is running. Static index.html not found yet."}
