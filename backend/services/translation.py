"""翻译映射服务：应用字段翻译到影片数据"""
from database import get_translation
from typing import Any


def _translate_item(original: str, mapping: dict[str, str]) -> str:
    """单个字段翻译，有映射返回译文，无映射返回原文"""
    if not original or not mapping:
        return original
    return mapping.get(original, original)


def apply_translation(content_id: str, data: dict) -> dict:
    """对影片数据应用翻译映射，返回带 translated_ 前缀字段的副本"""
    if not content_id or not data:
        return data
    data = dict(data)

    # per-content_id 映射（标题翻译等）
    content_mapping = get_translation(content_id)

    # === actress ===
    if "actresses" in data and isinstance(data["actresses"], list):
        for actress in data["actresses"]:
            if not isinstance(actress, dict):
                continue
            # 尝试多个可能的 name 字段
            for name_key in ["name_ja", "name_en", "name_kanji", "name_romaji", "name"]:
                orig = actress.get(name_key)
                if orig:
                    # 优先用 per-content_id 的 actress 映射，否则用 global actress 映射
                    actress_map = {}
                    if content_mapping:
                        actress_map = content_mapping.get("actress", {})
                    if not actress_map:
                        global_map = get_translation(orig)
                        if global_map:
                            actress_map = global_map.get("actress", {})
                    translated = _translate_item(orig, actress_map)
                    actress[f"{name_key}_translated"] = translated
                    break

    # === category ===
    if "categories" in data and isinstance(data["categories"], list):
        for cat in data["categories"]:
            if not isinstance(cat, dict):
                continue
            name = cat.get("name_ja") or cat.get("name_en") or cat.get("name")
            if name:
                cat_map = {}
                if content_mapping:
                    cat_map = content_mapping.get("category", {})
                if not cat_map:
                    global_map = get_translation(name)
                    if global_map:
                        cat_map = global_map.get("category", {})
                translated = _translate_item(name, cat_map)
                cat["name_translated"] = translated

    # === series ===
    if "series" in data and isinstance(data["series"], dict):
        name = data["series"].get("name")
        if name:
            series_map = {}
            if content_mapping:
                series_map = content_mapping.get("series", {})
            if not series_map:
                global_map = get_translation(name)
                if global_map:
                    series_map = global_map.get("series", {})
            translated = _translate_item(name, series_map)
            data["series"]["name_translated"] = translated

    # === maker ===
    if "maker" in data and isinstance(data["maker"], dict):
        name = data["maker"].get("name")
        if name:
            maker_map = {}
            if content_mapping:
                maker_map = content_mapping.get("maker", {})
            translated = _translate_item(name, maker_map)
            data["maker"]["name_translated"] = translated

    # === label ===
    if "label" in data and isinstance(data["label"], dict):
        name = data["label"].get("name")
        if name:
            label_map = {}
            if content_mapping:
                label_map = content_mapping.get("label", {})
            translated = _translate_item(name, label_map)
            data["label"]["name_translated"] = translated

    # === title ===
    title_map = {}
    if content_mapping:
        title_map = content_mapping.get("title", {})
    for title_key in ["title_en", "title_ja"]:
        orig = data.get(title_key)
        if orig:
            translated = _translate_item(orig, title_map)
            data[f"{title_key}_translated"] = translated

    return data
