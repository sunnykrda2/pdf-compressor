"""
FastAPI Server for PDF Compression & Enterprise Privacy Management
"""

import os
import uuid
import asyncio
from contextlib import asynccontextmanager
from typing import Optional, List
import zipfile
import io

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import Response, FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from engine import PDFCompressorEngine, PRESETS, find_ghostscript_binary
from cleanup import SecureStorageManager, background_ttl_cleaner_task

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "temp_storage")
storage_manager = SecureStorageManager(STORAGE_DIR, default_ttl=1800)  # 30 minutes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background cleanup task
    cleaner_task = asyncio.create_task(background_ttl_cleaner_task(storage_manager, interval_seconds=60))
    yield
    # Cleanup task on shutdown
    cleaner_task.cancel()
    storage_manager.purge_all()


app = FastAPI(
    title="Enterprise PDF Compressor API",
    description="Zero-loss text & vector PDF compression with in-memory processing and automated 30-min TTL scrubber.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vite dev server (typically port 5173 / localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    gs_bin = find_ghostscript_binary()
    stats = storage_manager.get_stats()
    return {
        "status": "healthy",
        "engines_available": {
            "pymupdf_pikepdf": True,
            "ghostscript": bool(gs_bin),
            "ghostscript_path": gs_bin
        },
        "default_ttl_minutes": 30,
        "security_policy": "Zero persistent storage, automatic RAM/disk wipe after TTL (30 min)",
        "active_cached_files": stats["active_files_count"]
    }


@app.get("/api/presets")
def get_presets():
    return PRESETS


@app.post("/api/compress")
async def compress_single_pdf(
    file: UploadFile = File(...),
    preset: str = Form("recommended"),
    custom_dpi: Optional[int] = Form(None),
    custom_quality: Optional[int] = Form(None),
    strip_metadata: bool = Form(True),
    engine: str = Form("mupdf_pikepdf"),
    return_stream: bool = Form(False)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        compressed_bytes, stats = PDFCompressorEngine.compress_pdf_bytes(
            pdf_bytes=pdf_bytes,
            preset=preset,
            custom_dpi=custom_dpi,
            custom_quality=custom_quality,
            strip_metadata=strip_metadata,
            engine_mode=engine
        )

        file_id = str(uuid.uuid4())
        out_filename = f"compressed_{file.filename}"
        out_path = os.path.join(STORAGE_DIR, f"{file_id}.pdf")

        with open(out_path, "wb") as f:
            f.write(compressed_bytes)

        storage_manager.register_file(
            file_id=file_id,
            file_path=out_path,
            filename=out_filename,
            size=len(compressed_bytes)
        )

        if return_stream:
            return Response(
                content=compressed_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="{out_filename}"',
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                    "X-Saved-Percent": str(stats["savings_percent"])
                }
            )

        return {
            "status": "success",
            "file_id": file_id,
            "original_filename": file.filename,
            "compressed_filename": out_filename,
            "download_url": f"/api/download/{file_id}",
            "stats": stats
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compression failed: {str(e)}")


@app.post("/api/compress-batch")
async def compress_batch(
    files: List[UploadFile] = File(...),
    preset: str = Form("recommended"),
    custom_dpi: Optional[int] = Form(None),
    custom_quality: Optional[int] = Form(None),
    strip_metadata: bool = Form(True),
    engine: str = Form("mupdf_pikepdf")
):
    results = []
    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            continue
        pdf_bytes = await file.read()
        try:
            comp_bytes, stats = PDFCompressorEngine.compress_pdf_bytes(
                pdf_bytes=pdf_bytes,
                preset=preset,
                custom_dpi=custom_dpi,
                custom_quality=custom_quality,
                strip_metadata=strip_metadata,
                engine_mode=engine
            )
            file_id = str(uuid.uuid4())
            out_filename = f"compressed_{file.filename}"
            out_path = os.path.join(STORAGE_DIR, f"{file_id}.pdf")
            with open(out_path, "wb") as f:
                f.write(comp_bytes)
            storage_manager.register_file(file_id, out_path, out_filename, len(comp_bytes))
            results.append({
                "file_id": file_id,
                "original_filename": file.filename,
                "compressed_filename": out_filename,
                "download_url": f"/api/download/{file_id}",
                "stats": stats
            })
        except Exception as e:
            results.append({
                "original_filename": file.filename,
                "error": str(e)
            })

    return {"results": results}


@app.get("/api/download/{file_id}")
async def download_file(file_id: str):
    meta = storage_manager.get_file(file_id)
    if not meta:
        raise HTTPException(status_code=404, detail="File expired or not found. TTL has expired.")

    return FileResponse(
        path=meta.file_path,
        filename=meta.filename,
        media_type="application/pdf",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@app.delete("/api/files/{file_id}")
def wipe_file(file_id: str):
    success = storage_manager.delete_file(file_id)
    return {"success": success, "message": "File wiped immediately from server storage."}


@app.post("/api/wipe-all")
def wipe_all():
    storage_manager.purge_all()
    return {"success": True, "message": "All temporary files have been permanently scrubbed."}


@app.get("/api/privacy-status")
def privacy_status():
    return storage_manager.get_stats()
