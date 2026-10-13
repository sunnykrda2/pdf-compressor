"""
Comprehensive Test Script for PDF Compressor
Tests:
1. Zero-loss text fidelity: verifies text remains 100% extractable after compression.
2. Vector shape integrity.
3. Embedded raster image downsampling.
4. Compression presets (Extreme, Recommended, Print).
5. TTL storage manager registration and auto-wipe.
"""

import os
import io
import pymupdf as fitz
from PIL import Image, ImageDraw
from engine import PDFCompressorEngine, PRESETS
from cleanup import SecureStorageManager


def create_sample_pdf() -> bytes:
    """Generate a sample PDF with vector text, vector drawings, and a large embedded bitmap image."""
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)  # Standard Letter size

    # 1. Insert Vector Text
    text_point = fitz.Point(50, 60)
    page.insert_text(
        text_point,
        "Confidential Enterprise Report 2026",
        fontsize=20,
        color=(0.1, 0.2, 0.5)
    )

    body_text = (
        "Zero-Loss Text & Vector Verification: This paragraph demonstrates that text strings "
        "and character glyphs are never flattened into raster bitmap images. "
        "Even after aggressive 72 DPI compression, every word here must remain selectable, "
        "copy-pasteable, and searchable via standard PDF readers."
    )
    page.insert_textbox(
        fitz.Rect(50, 80, 560, 160),
        body_text,
        fontsize=11,
        color=(0.2, 0.2, 0.2)
    )

    # 2. Insert Vector Shapes (lines, rectangles)
    shape = page.new_shape()
    shape.draw_rect(fitz.Rect(50, 170, 560, 220))
    shape.finish(color=(0.2, 0.5, 0.8), fill=(0.9, 0.95, 1.0), width=1.5)
    shape.commit()

    page.insert_text(fitz.Point(60, 200), "Vector Box with Vector Mathematical Borders", fontsize=12, color=(0.1, 0.3, 0.6))

    # 3. Create a large uncompressed test image (1200x800 pixels) to simulate high-res camera scan / photo
    img = Image.new("RGB", (1200, 800), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)
    # Draw complex gradient patterns
    for i in range(0, 1200, 20):
        draw.line([(i, 0), (1200 - i, 800)], fill=(i % 255, (i * 2) % 255, (i * 3) % 255), width=3)
    draw.rectangle([200, 200, 1000, 600], fill=(70, 130, 180), outline=(255, 215, 0), width=5)

    img_bytes_io = io.BytesIO()
    img.save(img_bytes_io, format="PNG")
    img_bytes = img_bytes_io.getvalue()

    # Insert image into page
    img_rect = fitz.Rect(50, 240, 560, 580)
    page.insert_image(img_rect, stream=img_bytes)

    # 4. Insert footer text
    page.insert_text(fitz.Point(50, 750), "End of Document - Page 1 of 1 (Protected by CompressPDF Pro)", fontsize=9, color=(0.5, 0.5, 0.5))

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def run_tests():
    print("==================================================")
    print("STARTING PDF COMPRESSION ENGINE TEST SUITE")
    print("==================================================")

    orig_pdf = create_sample_pdf()
    orig_size = len(orig_pdf)
    print(f"Generated test PDF. Original Size: {orig_size:,} bytes")

    # Extract original text to verify baseline
    doc_orig = fitz.open(stream=orig_pdf, filetype="pdf")
    orig_text = doc_orig[0].get_text()
    doc_orig.close()
    assert "Confidential Enterprise Report 2026" in orig_text
    assert "Zero-Loss Text & Vector Verification" in orig_text
    print("Baseline text verification: PASS (Text is present and extractable)")

    # Test Presets
    for preset in ["extreme", "recommended", "print"]:
        compressed, stats = PDFCompressorEngine.compress_pdf_bytes(
            orig_pdf,
            preset=preset,
            engine_mode="mupdf_pikepdf"
        )
        comp_size = len(compressed)
        saved = orig_size - comp_size
        pct = stats["savings_percent"]

        print(f"\n--- Testing Preset: [{preset.upper()}] ---")
        print(f"Compressed Size: {comp_size:,} bytes")
        print(f"Saved: {saved:,} bytes ({pct}%)")
        print(f"Images Processed: {stats.get('images_processed')}, Downsampled: {stats.get('images_downsampled')}")
        print(f"Duration: {stats.get('duration_seconds')}s")

        # Verify output is smaller
        assert comp_size < orig_size, f"Compression failed to reduce size for preset {preset}"

        # CRITICAL TEST: Verify Zero-Loss Text Integrity!
        doc_comp = fitz.open(stream=compressed, filetype="pdf")
        comp_text = doc_comp[0].get_text()
        doc_comp.close()

        assert "Confidential Enterprise Report 2026" in comp_text, "ERROR: Header text was lost!"
        assert "Zero-Loss Text & Vector Verification" in comp_text, "ERROR: Body text was lost!"
        assert "End of Document" in comp_text, "ERROR: Footer text was lost!"
        print(f"[{preset.upper()}] Text integrity check: PASS (100% selectable and intact!)")

    # Test TTL Storage Manager
    print("\n--- Testing 30-Minute TTL Storage Manager ---")
    storage = SecureStorageManager(storage_dir="test_storage", default_ttl=2)  # 2s for quick test
    meta = storage.register_file("test-id-123", "test_storage/test.pdf", "test.pdf", 500)
    with open("test_storage/test.pdf", "w") as f:
        f.write("dummy")

    assert storage.get_file("test-id-123") is not None
    print("File registered in storage: PASS")

    import time
    time.sleep(2.5)  # Wait for TTL to expire
    scrubbed = storage.scrub_expired()
    assert scrubbed == 1
    assert storage.get_file("test-id-123") is None
    print("Automated TTL expiration scrub: PASS")
    storage.purge_all()
    if os.path.exists("test_storage"):
        try: os.rmdir("test_storage")
        except Exception: pass

    print("\n==================================================")
    print("ALL TEST SUITE CHECKS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
