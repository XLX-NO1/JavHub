from fastapi import APIRouter, Query
from typing import Any
from modules.info_client import get_info_client
from services.translation import apply_translation

router = APIRouter(prefix="/api/v1/actresses", tags=["actresses"])

@router.get("")
async def list_actresses(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict[str, Any]:
    client = get_info_client()
    return await client.list_actresses(page=page, page_size=page_size)

@router.get("/{actress_id}")
async def get_actress(actress_id: int) -> dict[str, Any]:
    client = get_info_client()
    return await client.get_actress(actress_id)

@router.get("/{actress_id}/videos")
async def get_actress_videos(
    actress_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict[str, Any]:
    client = get_info_client()
    result = await client.get_actress_videos(actress_id, page=page, page_size=page_size)
    if result.get("data"):
        result["data"] = [_apply_translation(item) for item in result["data"]]
    return result

def _apply_translation(data: dict) -> dict:
    content_id = data.get("content_id") or data.get("dvd_id", "").replace("-", "").replace("_", "").lower()
    if not content_id:
        return data
    return apply_translation(content_id, data)