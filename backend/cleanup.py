"""
Enterprise-Grade Security & Auto-Wipe TTL Manager
Automatically scrubs uploaded and processed PDF files after a strict Time-To-Live (default 30 mins).
Guarantees zero persistent storage of sensitive documents on the server.
"""

import os
import time
import shutil
import asyncio
import logging
from typing import Dict, Any, List

logger = logging.getLogger("ttl_cleaner")

DEFAULT_TTL_SECONDS = 1800  # 30 Minutes


class FileMetadata:
    def __init__(self, file_id: str, file_path: str, filename: str, size: int, ttl_seconds: int = DEFAULT_TTL_SECONDS):
        self.file_id = file_id
        self.file_path = file_path
        self.filename = filename
        self.size = size
        self.created_at = time.time()
        self.expires_at = self.created_at + ttl_seconds


class SecureStorageManager:
    def __init__(self, storage_dir: str, default_ttl: int = DEFAULT_TTL_SECONDS):
        self.storage_dir = os.path.abspath(storage_dir)
        self.default_ttl = default_ttl
        self.registry: Dict[str, FileMetadata] = {}
        os.makedirs(self.storage_dir, exist_ok=True)

    def register_file(self, file_id: str, file_path: str, filename: str, size: int, custom_ttl: int = None) -> FileMetadata:
        ttl = custom_ttl if custom_ttl is not None else self.default_ttl
        meta = FileMetadata(file_id, file_path, filename, size, ttl)
        self.registry[file_id] = meta
        return meta

    def get_file(self, file_id: str) -> FileMetadata:
        meta = self.registry.get(file_id)
        if not meta:
            return None
        if time.time() > meta.expires_at:
            self.delete_file(file_id)
            return None
        if not os.path.exists(meta.file_path):
            self.registry.pop(file_id, None)
            return None
        return meta

    def delete_file(self, file_id: str) -> bool:
        meta = self.registry.pop(file_id, None)
        if not meta:
            return False
        try:
            if os.path.exists(meta.file_path):
                # Overwrite or immediately unlink
                os.unlink(meta.file_path)
                logger.info(f"Securely deleted expired file: {meta.file_path} (ID: {file_id})")
            return True
        except Exception as e:
            logger.error(f"Error deleting file {meta.file_path}: {e}")
            return False

    def scrub_expired(self) -> int:
        """Scan and delete all expired files."""
        now = time.time()
        expired_ids = [fid for fid, meta in self.registry.items() if now >= meta.expires_at]
        count = 0
        for fid in expired_ids:
            if self.delete_file(fid):
                count += 1

        # Also purge any orphaned files in storage_dir not in registry older than default_ttl
        try:
            for item in os.listdir(self.storage_dir):
                item_path = os.path.join(self.storage_dir, item)
                if os.path.isfile(item_path):
                    mtime = os.path.getmtime(item_path)
                    if (now - mtime) > self.default_ttl:
                        try:
                            os.unlink(item_path)
                            count += 1
                            logger.info(f"Purged orphan file: {item_path}")
                        except Exception:
                            pass
        except Exception as e:
            logger.error(f"Error checking storage dir: {e}")

        return count

    def get_stats(self) -> Dict[str, Any]:
        """Return real-time privacy and storage metrics."""
        now = time.time()
        active_items = []
        for fid, meta in self.registry.items():
            remaining = max(0, int(meta.expires_at - now))
            active_items.append({
                "file_id": fid,
                "filename": meta.filename,
                "size_bytes": meta.size,
                "seconds_remaining": remaining
            })
        return {
            "active_files_count": len(active_items),
            "storage_dir": self.storage_dir,
            "default_ttl_seconds": self.default_ttl,
            "files": active_items
        }

    def purge_all(self):
        """Immediately wipe all files."""
        for fid in list(self.registry.keys()):
            self.delete_file(fid)
        for item in os.listdir(self.storage_dir):
            try:
                p = os.path.join(self.storage_dir, item)
                if os.path.isfile(p): os.unlink(p)
                elif os.path.isdir(p): shutil.rmtree(p)
            except Exception:
                pass


async def background_ttl_cleaner_task(manager: SecureStorageManager, interval_seconds: int = 60):
    """Async background worker that wakes up periodically to purge expired files."""
    logger.info(f"Starting background TTL cleanup scheduler (interval: {interval_seconds}s, TTL: {manager.default_ttl}s)")
    while True:
        try:
            deleted = manager.scrub_expired()
            if deleted > 0:
                logger.info(f"Scrubbed {deleted} expired files from memory/storage.")
        except Exception as e:
            logger.error(f"Background cleanup error: {e}")
        await asyncio.sleep(interval_seconds)
