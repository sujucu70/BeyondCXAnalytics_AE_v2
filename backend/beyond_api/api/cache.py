# beyond_api/api/cache.py
"""
Server-side cache for CSV files.
Stores the uploaded CSV file and metadata for later re-analysis.
"""
from __future__ import annotations

import json
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from beyond_api.security import get_current_user

router = APIRouter(
    prefix="/cache",
    tags=["cache"],
)

# Directory for cache files - use platform-appropriate default
def _get_default_cache_dir() -> Path:
    """Get a platform-appropriate default cache directory."""
    env_cache_dir = os.getenv("CACHE_DIR")
    if env_cache_dir:
        return Path(env_cache_dir)

    # On Windows, check if C:/data/cache exists (legacy location)
    # Otherwise use a local .cache directory relative to the backend
    # On Unix/Docker, use /data/cache
    if sys.platform == "win32":
        # Check legacy location first (for backwards compatibility)
        legacy_cache = Path("C:/data/cache")
        if legacy_cache.exists():
            return legacy_cache
        # Fallback to local .cache directory in the backend folder
        backend_dir = Path(__file__).parent.parent.parent
        return backend_dir / ".cache"
    else:
        return Path("/data/cache")

CACHE_DIR = _get_default_cache_dir()
CACHED_FILE = CACHE_DIR / "cached_data.csv"
METADATA_FILE = CACHE_DIR / "metadata.json"
DRILLDOWN_FILE = CACHE_DIR / "drilldown_data.json"

# Log cache directory on module load
import logging
logger = logging.getLogger(__name__)
logger.info(f"[Cache] Using cache directory: {CACHE_DIR}")
logger.info(f"[Cache] Drilldown file path: {DRILLDOWN_FILE}")


class CacheMetadata(BaseModel):
    fileName: str
    fileSize: int
    recordCount: int
    cachedAt: str
    costPerHour: float


def ensure_cache_dir():
    """Create cache directory if it doesn't exist."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def count_csv_records(file_path: Path) -> int:
    """Count records in CSV file (excluding header)."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            # Count lines minus header
            return sum(1 for _ in f) - 1
    except Exception:
        return 0


@router.get("/check")
def check_cache(current_user: str = Depends(get_current_user)):
    """
    Check if there's cached data available.
    Returns metadata if cache exists, null otherwise.
    """
    if not METADATA_FILE.exists() or not CACHED_FILE.exists():
        return JSONResponse(content={"exists": False, "metadata": None})

    try:
        with open(METADATA_FILE, "r") as f:
            metadata = json.load(f)
        return JSONResponse(content={"exists": True, "metadata": metadata})
    except Exception as e:
        return JSONResponse(content={"exists": False, "metadata": None, "error": str(e)})


@router.get("/file")
def get_cached_file_path(current_user: str = Depends(get_current_user)):
    """
    Returns the path to the cached CSV file for internal use.
    """
    if not CACHED_FILE.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No cached file found"
        )
    return JSONResponse(content={"path": str(CACHED_FILE)})


@router.get("/download")
def download_cached_file(current_user: str = Depends(get_current_user)):
    """
    Download the cached CSV file for frontend parsing.
    Returns the file as a streaming response.
    """
    from fastapi.responses import FileResponse

    if not CACHED_FILE.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No cached file found"
        )

    return FileResponse(
        path=CACHED_FILE,
        media_type="text/csv",
        filename="cached_data.csv"
    )


@router.post("/file")
async def save_cached_file(
    csv_file: UploadFile = File(...),
    fileName: str = Form(...),
    fileSize: int = Form(...),
    costPerHour: float = Form(...),
    current_user: str = Depends(get_current_user)
):
    """
    Save uploaded CSV file to server cache.
    """
    ensure_cache_dir()

    try:
        # Save the CSV file
        with open(CACHED_FILE, "wb") as f:
            while True:
                chunk = await csv_file.read(1024 * 1024)  # 1 MB chunks
                if not chunk:
                    break
                f.write(chunk)

        # Count records
        record_count = count_csv_records(CACHED_FILE)

        # Save metadata
        metadata = {
            "fileName": fileName,
            "fileSize": fileSize,
            "recordCount": record_count,
            "cachedAt": datetime.now().isoformat(),
            "costPerHour": costPerHour,
        }
        with open(METADATA_FILE, "w") as f:
            json.dump(metadata, f)

        return JSONResponse(content={
            "success": True,
            "message": f"Cached file with {record_count} records",
            "metadata": metadata
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving cache: {str(e)}"
        )


@router.get("/drilldown")
def get_cached_drilldown(current_user: str = Depends(get_current_user)):
    """
    Get the cached drilldownData JSON.
    Returns the pre-calculated drilldown data for fast cache usage.
    """
    logger.info(f"[Cache] GET /drilldown - checking file: {DRILLDOWN_FILE}")
    logger.info(f"[Cache] File exists: {DRILLDOWN_FILE.exists()}")

    if not DRILLDOWN_FILE.exists():
        logger.warning(f"[Cache] Drilldown file not found at: {DRILLDOWN_FILE}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No cached drilldown data found"
        )

    try:
        with open(DRILLDOWN_FILE, "r", encoding="utf-8") as f:
            drilldown_data = json.load(f)
        logger.info(f"[Cache] Loaded drilldown with {len(drilldown_data)} skills")
        return JSONResponse(content={"success": True, "drilldownData": drilldown_data})
    except Exception as e:
        logger.error(f"[Cache] Error reading drilldown: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading drilldown data: {str(e)}"
        )


@router.post("/drilldown")
async def save_cached_drilldown(
    drilldown_json: str = Form(...),
    current_user: str = Depends(get_current_user)
):
    """
    Save drilldownData JSON to server cache.
    Called by frontend after calculating drilldown from uploaded file.
    Receives JSON as form field.
    """
    logger.info(f"[Cache] POST /drilldown - saving to: {DRILLDOWN_FILE}")
    logger.info(f"[Cache] Cache directory: {CACHE_DIR}")
    ensure_cache_dir()
    logger.info(f"[Cache] Cache dir exists after ensure: {CACHE_DIR.exists()}")

    try:
        # Parse and validate JSON
        drilldown_data = json.loads(drilldown_json)
        logger.info(f"[Cache] Parsed drilldown JSON with {len(drilldown_data)} skills")

        # Save to file
        with open(DRILLDOWN_FILE, "w", encoding="utf-8") as f:
            json.dump(drilldown_data, f)

        logger.info(f"[Cache] Drilldown saved successfully, file exists: {DRILLDOWN_FILE.exists()}")
        return JSONResponse(content={
            "success": True,
            "message": f"Cached drilldown data with {len(drilldown_data)} skills"
        })
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving drilldown data: {str(e)}"
        )


@router.delete("/file")
def clear_cache(current_user: str = Depends(get_current_user)):
    """
    Clear the server-side cache (CSV, metadata, and drilldown data).
    """
    try:
        if CACHED_FILE.exists():
            CACHED_FILE.unlink()
        if METADATA_FILE.exists():
            METADATA_FILE.unlink()
        if DRILLDOWN_FILE.exists():
            DRILLDOWN_FILE.unlink()
        return JSONResponse(content={"success": True, "message": "Cache cleared"})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing cache: {str(e)}"
        )


# Keep old endpoints for backwards compatibility but mark as deprecated
@router.get("/interactions")
def get_cached_interactions_deprecated(current_user: str = Depends(get_current_user)):
    """DEPRECATED: Use /cache/file instead."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint is deprecated. Use /cache/file with re-analysis instead."
    )


@router.post("/interactions")
def save_cached_interactions_deprecated(current_user: str = Depends(get_current_user)):
    """DEPRECATED: Use /cache/file instead."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint is deprecated. Use /cache/file instead."
    )
