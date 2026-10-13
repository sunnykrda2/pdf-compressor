"""
Zero-Loss Text & Vector PDF Optimization Engine
Preserves 100% of text fonts, charsets, glyphs, hyperlinks, and vector shapes.
Selectively resamples embedded raster images and optimizes PDF stream structures.
"""

import io
import os
import shutil
import subprocess
import time
import logging
from typing import Dict, Any, Optional, Tuple
from PIL import Image
import pymupdf as fitz
import pikepdf

logger = logging.getLogger("pdf_engine")
logging.basicConfig(level=logging.INFO)

PRESETS = {
    "extreme": {
        "dpi": 72,
        "quality": 50,
        "strip_metadata": True,
        "lossless_only": False,
        "name": "Extreme Compression"
    },
    "recommended": {
        "dpi": 150,
        "quality": 75,
        "strip_metadata": True,
        "lossless_only": False,
        "name": "Recommended / Balanced"
    },
    "print": {
        "dpi": 300,
        "quality": 90,
        "strip_metadata": False,
        "lossless_only": False,
        "name": "High Quality / Print Ready"
    },
    "lossless": {
        "dpi": 600,
        "quality": 95,
        "strip_metadata": False,
        "lossless_only": True,
        "name": "Lossless Stream Optimization"
    }
}


def find_ghostscript_binary() -> Optional[str]:
    """Check if Ghostscript is available on the system PATH or standard locations."""
    candidates = ["gswin64c", "gswin32c", "gs"]
    for cmd in candidates:
        if shutil.which(cmd):
            return cmd
    
    # Common Windows install directories
    common_paths = [
        r"C:\Program Files\gs\gs10.03.0\bin\gswin64c.exe",
        r"C:\Program Files\gs\gs10.02.1\bin\gswin64c.exe",
        r"C:\Program Files\gs\gs10.01.2\bin\gswin64c.exe",
        r"C:\Program Files\gs\gs9.56.1\bin\gswin64c.exe",
    ]
    for p in common_paths:
        if os.path.exists(p):
            return p
    return None


class PDFCompressorEngine:
    """
    High-performance, Zero-loss Text/Vector PDF compression engine.
    """

    @staticmethod
    def compress_pdf_bytes(
        pdf_bytes: bytes,
        preset: str = "recommended",
        custom_dpi: Optional[int] = None,
        custom_quality: Optional[int] = None,
        strip_metadata: Optional[bool] = None,
        engine_mode: str = "mupdf_pikepdf" # 'mupdf_pikepdf', 'ghostscript', or 'auto'
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Compress PDF stream in-memory without losing text crispness or vector integrity.
        """
        start_time = time.time()
        orig_size = len(pdf_bytes)

        # Resolve parameters
        cfg = PRESETS.get(preset, PRESETS["recommended"]).copy()
        dpi = custom_dpi if custom_dpi is not None else cfg["dpi"]
        quality = custom_quality if custom_quality is not None else cfg["quality"]
        do_strip = strip_metadata if strip_metadata is not None else cfg["strip_metadata"]
        lossless_only = cfg.get("lossless_only", False)

        gs_binary = find_ghostscript_binary()
        if engine_mode == "ghostscript" and not gs_binary:
            logger.warning("Ghostscript requested but not installed. Falling back to native PyMuPDF+Pikepdf.")
            engine_mode = "mupdf_pikepdf"
        elif engine_mode == "auto":
            # Native PyMuPDF is faster and doesn't require subprocess or disk writes
            engine_mode = "mupdf_pikepdf"

        if engine_mode == "ghostscript" and gs_binary:
            compressed_bytes, stats = PDFCompressorEngine._compress_with_ghostscript(
                pdf_bytes, gs_binary, preset, dpi
            )
        else:
            compressed_bytes, stats = PDFCompressorEngine._compress_native(
                pdf_bytes, dpi, quality, do_strip, lossless_only
            )

        compressed_size = len(compressed_bytes)
        # If compressed result happens to be larger, return the original
        if compressed_size > orig_size:
            logger.info("Compressed file was larger than original; returning original.")
            compressed_bytes = pdf_bytes
            compressed_size = orig_size

        saved_bytes = max(0, orig_size - compressed_size)
        savings_percent = round((saved_bytes / orig_size) * 100, 2) if orig_size > 0 else 0.0

        stats.update({
            "original_size": orig_size,
            "compressed_size": compressed_size,
            "saved_bytes": saved_bytes,
            "savings_percent": savings_percent,
            "duration_seconds": round(time.time() - start_time, 3),
            "engine_used": engine_mode if engine_mode != "ghostscript" else "Ghostscript",
            "dpi": dpi,
            "quality": quality,
            "metadata_stripped": do_strip
        })

        return compressed_bytes, stats

    @staticmethod
    def _compress_native(
        pdf_bytes: bytes,
        target_dpi: int,
        target_quality: int,
        strip_meta: bool,
        lossless_only: bool
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Native zero-loss pipeline using PyMuPDF + pikepdf:
        1. PyMuPDF inspects image XObjects, resamples raster images only if density exceeds target_dpi,
           and replaces image streams.
        2. PikePDF optimizes object streams, deduplicates objects, and strips metadata.
        Text, vectors, fonts, outlines, and links remain untouched!
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_count = len(doc)
        images_processed = 0
        images_downsampled = 0

        if not lossless_only:
            processed_xrefs = set()
            for page_index in range(page_count):
                page = doc[page_index]
                image_list = page.get_images(full=True)

                for img_info in image_list:
                    xref = img_info[0]
                    if xref in processed_xrefs:
                        continue
                    processed_xrefs.add(xref)
                    images_processed += 1

                    try:
                        base_image = doc.extract_image(xref)
                        if not base_image:
                            continue

                        image_bytes = base_image["image"]
                        image_ext = base_image["ext"]
                        width = base_image["width"]
                        height = base_image["height"]

                        # Estimate display size on page to determine effective DPI
                        rects = page.get_image_rects(xref)
                        if rects:
                            display_rect = rects[0]
                            disp_w = max(1.0, display_rect.width)
                            disp_h = max(1.0, display_rect.height)
                            current_dpi_x = (width / disp_w) * 72.0
                            current_dpi_y = (height / disp_h) * 72.0
                            effective_dpi = max(current_dpi_x, current_dpi_y)
                        else:
                            effective_dpi = 300.0  # default fallback estimate

                        # Only downsample if effective DPI exceeds target_dpi
                        scale = target_dpi / effective_dpi if effective_dpi > target_dpi else 1.0

                        pil_img = Image.open(io.BytesIO(image_bytes))

                        # If scale < 0.95 or recompressing JPEG with lower quality
                        new_w = max(1, int(width * scale))
                        new_h = max(1, int(height * scale))

                        should_resize = (new_w < width and new_h < height)
                        
                        out_io = io.BytesIO()
                        # Convert RGBA to RGB for JPEG if no transparent alpha is actually used
                        if pil_img.mode in ("RGBA", "LA") and pil_img.getextrema()[-1][0] == 255:
                            pil_img = pil_img.convert("RGB")

                        if pil_img.mode == "RGB":
                            if should_resize:
                                pil_img = pil_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                            pil_img.save(out_io, format="JPEG", quality=target_quality, optimize=True)
                            new_image_bytes = out_io.getvalue()
                        elif pil_img.mode == "RGBA":
                            if should_resize:
                                pil_img = pil_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                            pil_img.save(out_io, format="PNG", optimize=True)
                            new_image_bytes = out_io.getvalue()
                        else:
                            # Grayscale or 1-bit
                            if should_resize:
                                pil_img = pil_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                            pil_img.save(out_io, format="JPEG" if pil_img.mode != "1" else "PNG", optimize=True)
                            new_image_bytes = out_io.getvalue()

                        # Only replace if new bytes are strictly smaller
                        if len(new_image_bytes) < len(image_bytes) * 0.95:
                            # Use PyMuPDF's update_stream or replace_image
                            # fitz.Document._update_stream(xref, new_image_bytes)
                            page.replace_image(xref, stream=new_image_bytes)
                            images_downsampled += 1

                    except Exception as e:
                        logger.debug(f"Image xref {xref} skipped: {e}")
                        continue

        if strip_meta:
            doc.set_metadata({})

        # First pass output with aggressive garbage collection and deflated streams
        intermediate_io = io.BytesIO()
        doc.save(
            intermediate_io,
            garbage=4,
            deflate=True,
            deflate_images=True,
            deflate_fonts=True,
            clean=True,
            ascii=False
        )
        doc.close()
        intermediate_bytes = intermediate_io.getvalue()

        # Second pass: PikePDF stream linearizer & object deduplication
        try:
            with pikepdf.open(io.BytesIO(intermediate_bytes)) as pike_doc:
                if strip_meta:
                    with pike_doc.open_metadata() as meta:
                        meta.clear()
                    if "/Metadata" in pike_doc.Root:
                        del pike_doc.Root["/Metadata"]

                final_io = io.BytesIO()
                pike_doc.save(
                    final_io,
                    compress_streams=True,
                    object_stream_mode=pikepdf.ObjectStreamMode.generate,
                    recompress_flate=True
                )
                final_bytes = final_io.getvalue()
        except Exception as e:
            logger.warning(f"Pikepdf optimization pass failed: {e}. Using intermediate PyMuPDF result.")
            final_bytes = intermediate_bytes

        return final_bytes, {
            "page_count": page_count,
            "images_processed": images_processed,
            "images_downsampled": images_downsampled
        }

    @staticmethod
    def _compress_with_ghostscript(
        pdf_bytes: bytes,
        gs_bin: str,
        preset: str,
        dpi: int
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Ghostscript fallback compression ensuring text & vector fonts are preserved.
        """
        import tempfile
        gs_preset_map = {
            "extreme": "/screen",
            "recommended": "/ebook",
            "print": "/printer",
            "lossless": "/prepress"
        }
        gs_setting = gs_preset_map.get(preset, "/ebook")

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as in_file, \
             tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as out_file:
            in_path = in_file.name
            out_path = out_file.name
            in_file.write(pdf_bytes)
            in_file.flush()

        try:
            cmd = [
                gs_bin,
                "-sDEVICE=pdfwrite",
                "-dCompatibilityLevel=1.5",
                f"-dPDFSETTINGS={gs_setting}",
                "-dNOPAUSE",
                "-dQUIET",
                "-dBATCH",
                "-dEmbedAllFonts=true",
                "-dSubsetFonts=true",
                "-dCompressFonts=true",
                "-dColorImageDownsampleType=/Bicubic",
                f"-dColorImageResolution={dpi}",
                "-dGrayImageDownsampleType=/Bicubic",
                f"-dGrayImageResolution={dpi}",
                f"-sOutputFile={out_path}",
                in_path
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            with open(out_path, "rb") as f:
                compressed_bytes = f.read()

            return compressed_bytes, {
                "page_count": -1,
                "images_processed": -1,
                "images_downsampled": -1
            }
        finally:
            if os.path.exists(in_path):
                try: os.unlink(in_path)
                except Exception: pass
            if os.path.exists(out_path):
                try: os.unlink(out_path)
                except Exception: pass
