"""
DMM 图片 URL 映射工具 — 与 frontend/src/utils/imageUrl.js 保持一致
将低清 ps.jpg 封面转为 awsimgsrc.dmm.co.jp 高清 pl.jpg
"""

import re
from typing import Optional


def _pad_content_id(content_id: str) -> str:
    """将内容 ID 的数字部分补零到5位（仅当数字部分 < 10000）"""
    def repl(m):
        prefix, num = m.group(1), m.group(2)
        return prefix + num.zfill(5) if len(prefix) < 5 else m.group(0)
    return re.sub(r'^([a-z]+)(\d+)$', repl, content_id, flags=re.IGNORECASE)


def _is_tk_series(content_id: str) -> bool:
    """判断是否为 TK 系列（使用旧库 dig/mono/movie）"""
    return bool(re.match(r'^[a-z]{5,}\d+$', content_id, re.IGNORECASE))


def _extract_content_id(jacket_url: Optional[str]) -> Optional[str]:
    """从低清 jacket_thumb_url 提取 content_id"""
    if not jacket_url:
        return None
    m = re.search(r'/([a-z0-9]+)(?:ps|pl)\.jpg$', jacket_url, re.IGNORECASE)
    return m.group(1) if m else None


def jacket_full_url(jacket_url: Optional[str]) -> Optional[str]:
    """
    构建高清竖版大图 URL (pl.jpg)
    awsimgsrc.dmm.co.jp/pics_dig/digital/video/{id}/{id}pl.jpg
    兜底：awsimgsrc.dmm.co.jp/dig/mono/movie/{raw_id}/{raw_id}pl.jpg
    """
    if not jacket_url:
        return None
    content_id = _extract_content_id(jacket_url)
    if not content_id:
        return jacket_url

    if _is_tk_series(content_id):
        return f"https://awsimgsrc.dmm.co.jp/dig/mono/movie/{content_id}/{content_id}pl.jpg"

    padded = _pad_content_id(content_id)
    if padded != content_id:
        return f"https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/{padded}/{padded}pl.jpg"
    return f"https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/{content_id}/{content_id}pl.jpg"


def jacket_thumb_url(jacket_url: Optional[str]) -> Optional[str]:
    """低清横版缩略图 URL（直接从库取，不做转换）"""
    if not jacket_url:
        return None
    return jacket_url