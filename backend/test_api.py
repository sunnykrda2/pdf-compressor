"""
API Integration Test for FastAPI Server
Tests endpoints directly using FastAPI TestClient (httpx/starlette)
"""

from fastapi.testclient import TestClient
from app import app
from test_compression import create_sample_pdf
import io


def test_api_endpoints():
    print("==================================================")
    print("STARTING FASTAPI ENDPOINTS TEST SUITE")
    print("==================================================")

    client = TestClient(app)

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    print("1. GET /api/health ->", health_data)
    assert health_data["status"] == "healthy"
    assert health_data["engines_available"]["pymupdf_pikepdf"] is True

    # 2. Presets
    res = client.get("/api/presets")
    assert res.status_code == 200
    presets = res.json()
    print("2. GET /api/presets -> Found presets:", list(presets.keys()))
    assert "extreme" in presets
    assert "recommended" in presets
    assert "print" in presets

    # 3. Compress PDF
    sample_pdf = create_sample_pdf()
    files = {
        "file": ("annual_report.pdf", io.BytesIO(sample_pdf), "application/pdf")
    }
    data = {
        "preset": "recommended",
        "custom_dpi": "150",
        "strip_metadata": "true",
        "engine": "mupdf_pikepdf",
        "return_stream": "false"
    }
    res = client.post("/api/compress", files=files, data=data)
    assert res.status_code == 200, f"Compress failed: {res.text}"
    comp_resp = res.json()
    file_id = comp_resp["file_id"]
    stats = comp_resp["stats"]
    print("3. POST /api/compress -> File ID:", file_id)
    print(f"   Original: {stats['original_size']} bytes, Compressed: {stats['compressed_size']} bytes (Saved: {stats['savings_percent']}%)")
    assert stats["savings_percent"] > 50

    # 4. Download compressed file
    dl_res = client.get(comp_resp["download_url"])
    assert dl_res.status_code == 200
    assert len(dl_res.content) == stats["compressed_size"]
    print("4. GET /api/download/{file_id} -> Successfully downloaded bytes:", len(dl_res.content))

    # 5. Check Privacy status
    priv_res = client.get("/api/privacy-status")
    assert priv_res.status_code == 200
    priv_data = priv_res.json()
    print("5. GET /api/privacy-status -> Active cached files:", priv_data["active_files_count"])
    assert priv_data["active_files_count"] >= 1

    # 6. Manual Wipe of file
    del_res = client.delete(f"/api/files/{file_id}")
    assert del_res.status_code == 200
    print("6. DELETE /api/files/{file_id} -> Scrubbed successfully")

    # 7. Verify file is gone
    dl_after = client.get(comp_resp["download_url"])
    assert dl_after.status_code == 404, "File should have been scrubbed!"
    print("7. GET after wipe -> 404 Not Found (Verified wiped from server memory/storage)")

    print("\n==================================================")
    print("ALL API ENDPOINT INTEGRATION TESTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    test_api_endpoints()
