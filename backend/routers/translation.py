from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
import json
import io

from database import get_all_translations, import_translations, get_translation_count

router = APIRouter(prefix="/api/v1/translations", tags=["translations"])

VALID_TYPES = {"actress", "category", "series", "title"}


@router.get("/export/{mapping_type}")
async def export_translations(mapping_type: str):
    """导出指定类型的翻译映射 JSON"""
    if mapping_type not in VALID_TYPES:
        raise HTTPException(400, f"type must be one of: {', '.join(VALID_TYPES)}")
    data = get_all_translations(mapping_type)
    content = json.dumps(data, ensure_ascii=False, indent=2)
    buffer = io.BytesIO(content.encode("utf-8"))
    filename = f"translations_{mapping_type}.json"
    return StreamingResponse(
        buffer,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/import/{mapping_type}")
async def import_trans(mapping_type: str, file: UploadFile = File(...)):
    """导入翻译映射 JSON（merge upsert）"""
    if mapping_type not in VALID_TYPES:
        raise HTTPException(400, f"type must be one of: {', '.join(VALID_TYPES)}")
    try:
        content = await file.read()
        data = json.loads(content.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise HTTPException(400, f"Invalid JSON: {e}")
    if not isinstance(data, dict):
        raise HTTPException(400, "JSON must be an object")
    count = import_translations(mapping_type, data)
    return {"success": True, "imported": count, "type": mapping_type}


@router.get("/stats/{mapping_type}")
async def translation_stats(mapping_type: str):
    """获取翻译统计"""
    if mapping_type not in VALID_TYPES:
        raise HTTPException(400, f"type must be one of: {', '.join(VALID_TYPES)}")
    count = get_translation_count(mapping_type)
    return {"type": mapping_type, "count": count}


@router.get("/stats")
async def all_stats():
    """获取所有翻译类型的统计"""
    return {t: get_translation_count(t) for t in VALID_TYPES}
