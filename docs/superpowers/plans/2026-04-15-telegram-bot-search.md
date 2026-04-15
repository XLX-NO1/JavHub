# Telegram Bot 影片检索功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用户发 `/search 番号/关键词`，Bot 返回封面卡片 + 详细文字，支持翻页/下载确认/详情/订阅。

**Architecture:** 核心交互使用 `sendPhoto` + `caption`，翻页和按钮交互全部 `editMessageCaption` 原地更新，状态编码进 `callback_data`。

**Tech Stack:** python-telegram-bot v20, httpx, JavInfoApi

---

## 文件概览

| 文件 | 职责 |
|---|---|
| `backend/telegram_bot/keyboards.py` | 所有 InlineKeyboard 键盘定义 |
| `backend/telegram_bot/handlers/search.py` | search 命令 + 翻页/详情/确认 callback |
| `backend/telegram_bot/bot.py` | 注册 CallbackQueryHandler |

---

## Task 1: keyboard 补全

**Modify:** `backend/telegram_bot/keyboards.py`

- [ ] **Step 1: 查看现有 keyboards.py 全文**

```bash
cat backend/telegram_bot/keyboards.py
```

- [ ] **Step 2: 添加搜索结果卡片键盘（第一页）**

```python
def search_card_keyboard(keyword: str, page: int, total_pages: int, has_actress: bool = False) -> InlineKeyboardMarkup:
    """搜索结果卡片底部的翻页+操作按钮"""
    prev_callback = f"search:{keyword}:{page-1}" if page > 1 else "noop"
    next_callback = f"search:{keyword}:{page+1}" if page < total_pages else "noop"

    rows = [
        [
            InlineKeyboardButton("◀", callback_data=prev_callback),
            InlineKeyboardButton(f"第{page}页/共{total_pages}页", callback_data="noop"),
            InlineKeyboardButton("▶", callback_data=next_callback),
        ],
    ]
    if has_actress:
        rows.append([
            InlineKeyboardButton("🎬 下载", callback_data=f"confirm:{keyword}:{page}"),
            InlineKeyboardButton("📋 详情", callback_data=f"detail:{keyword}:{page}"),
            InlineKeyboardButton("⭐ 订阅", callback_data=f"subscribe:{keyword}:{page}"),
        ])
    else:
        rows.append([
            InlineKeyboardButton("🎬 下载", callback_data=f"confirm:{keyword}:{page}"),
            InlineKeyboardButton("📋 详情", callback_data=f"detail:{keyword}:{page}"),
        ])
    return InlineKeyboardMarkup(rows)
```

- [ ] **Step 3: 添加下载确认键盘**

```python
def confirm_download_keyboard(content_id: str, keyword: str, page: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("✅ 确认下载", callback_data=f"dl:{content_id}:{keyword}:{page}"),
            InlineKeyboardButton("❌ 取消", callback_data=f"search:{keyword}:{page}"),
        ]
    ])
```

- [ ] **Step 4: 添加详情键盘**

```python
def detail_keyboard(content_id: str, keyword: str, page: int, has_actress: bool = False) -> InlineKeyboardMarkup:
    rows = [
        [
            InlineKeyboardButton("🎬 下载", callback_data=f"confirm_dl:{content_id}:{keyword}:{page}"),
            InlineKeyboardButton("🔄 返回搜索", callback_data=f"search:{keyword}:{page}"),
        ]
    ]
    if has_actress:
        rows.append([
            InlineKeyboardButton("⭐ 订阅演员", callback_data=f"subscribe:{keyword}:{page}"),
        ])
    return InlineKeyboardMarkup(rows)
```

- [ ] **Step 5: 添加返回搜索键盘**

```python
def back_to_search_keyboard(keyword: str, page: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🔄 返回搜索", callback_data=f"search:{keyword}:{page}")]
    ])
```

- [ ] **Step 6: Commit**

```bash
git add backend/telegram_bot/keyboards.py
git commit -m "feat(telegram): add search card, confirm, detail, back keyboards"
```

---

## Task 2: 重写 search_handler

**Modify:** `backend/telegram_bot/handlers/search.py`

- [ ] **Step 1: 查看现有 search.py 全文**

```bash
cat backend/telegram_bot/handlers/search.py
```

- [ ] **Step 2: 替换为新的 search_handler**

```python
from telegram_bot.keyboards import (
    search_card_keyboard,
    confirm_download_keyboard,
    detail_keyboard,
    back_to_search_keyboard,
)

async def search_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """处理 /search 命令：发送封面卡片第一页"""
    if not context.args:
        await update.message.reply_text("用法：/search <番号或关键词>\n例：/search abc-123")
        return

    keyword = " ".join(context.args).strip()
    page = 1
    page_size = 3

    info_client = get_info_client()
    result = await info_client.search_videos(q=keyword, page=page, page_size=page_size)
    total = result.get("total_count", 0)
    data = result.get("data", [])

    if total == 0 or not data:
        await update.message.reply_text(f"未找到「{keyword}」相关影片")
        return

    total_pages = (total + page_size - 1) // page_size

    # 发第一页（取第一条的封面）
    first = data[0]
    caption = _build_caption(first, keyword, page, total_pages)
    cover_url = first.get("jacket_full_url") or first.get("jacket_thumb_url")

    if cover_url:
        await update.message.reply_photo(
            photo=cover_url,
            caption=caption,
            parse_mode="HTML",
            reply_markup=search_card_keyboard(keyword, page, total_pages, bool(first.get("actress_name"))),
        )
    else:
        await update.message.reply_text(
            text=caption,
            parse_mode="HTML",
            reply_markup=search_card_keyboard(keyword, page, total_pages, bool(first.get("actress_name"))),
        )


def _build_caption(video: dict, keyword: str, page: int, total_pages: int) -> str:
    """构建影片 caption"""
    content_id = video.get("content_id") or video.get("dvd_id", "")
    title = video.get("title_ja_translated") or video.get("title_ja") or "无标题"
    release = video.get("release_date", "-")
    runtime = video.get("runtime_mins", "-")
    actress = video.get("actress_name", "-")

    return (
        f"🎬 <code>{content_id}</code>\n"
        f"📌 {title}\n"
        f"📅 {release} | ⏱ {runtime}分钟\n"
        f"👤 {actress}\n"
        f"─────────────────\n"
        f"[第{page}页/共{total_pages}页]"
    )


def _build_detail_caption(video: dict) -> str:
    """构建详情 caption"""
    content_id = video.get("content_id") or video.get("dvd_id", "")
    title_ja = video.get("title_ja", "-")
    title_cn = video.get("title_ja_translated") or "-"
    release = video.get("release_date", "-")
    runtime = video.get("runtime_mins", "-")
    actress = video.get("actress_name", "-")
    category = video.get("category_name", "-")
    maker = video.get("maker_name", "-")
    summary = video.get("summary", "-")

    return (
        f"🎬 <code>{content_id}</code>\n"
        f"📌 {title_ja}\n"
        f"📌 {title_cn}\n"
        f"📅 发行日期：{release}\n"
        f"⏱ 时长：{runtime}分钟\n"
        f"🏷 题材：{category}\n"
        f"🏭 工作室：{maker}\n"
        f"👤 演员：{actress}\n"
        f"📝 {summary}"
    )
```

- [ ] **Step 3: 添加 callback_handler 入口（临时占位，先不注册 bot.py）**

在 `search.py` 末尾添加：

```python
async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """统一处理所有搜索相关 callback"""
    query = update.callback_query
    await query.answer()

    data = query.data
    if not data:
        return

    # 解析 callback_data: action:arg1:arg2:...
    parts = data.split(":")
    action = parts[0]

    if action == "search":
        keyword = parts[1]
        page = int(parts[2])
        await _send_search_page(query, keyword, page)

    elif action == "confirm":
        keyword = parts[1]
        page = int(parts[2])
        await _show_confirm(query, keyword, page)

    elif action == "detail":
        keyword = parts[1]
        page = int(parts[2])
        await _show_detail(query, keyword, page)

    elif action in ("dl", "confirm_dl"):
        content_id = parts[1]
        keyword = parts[2]
        page = int(parts[3])
        await _do_download(query, content_id, keyword, page)

    elif action == "back":
        keyword = parts[1]
        page = int(parts[2])
        await _send_search_page(query, keyword, page)


async def _send_search_page(query_or_msg, keyword: str, page: int) -> None:
    """发送某一页的搜索结果"""
    page_size = 3
    info_client = get_info_client()
    result = await info_client.search_videos(q=keyword, page=page, page_size=page_size)
    total = result.get("total_count", 0)
    data = result.get("data", [])

    if not data:
        await (query_or_msg.edit_message_text if hasattr(query_or_msg, 'edit_message_text') else query_or_msg.message.edit_text)(
            text=f"未找到「{keyword}」相关影片"
        )
        return

    total_pages = (total + page_size - 1) // page_size
    first = data[0]
    caption = _build_caption(first, keyword, page, total_pages)
    cover_url = first.get("jacket_full_url") or first.get("jacket_thumb_url")

    try:
        if cover_url:
            await query_or_msg.edit_message_media(
                media=InputMediaPhoto(media=cover_url, caption=caption, parse_mode="HTML"),
                reply_markup=search_card_keyboard(keyword, page, total_pages, bool(first.get("actress_name"))),
            )
        else:
            await query_or_msg.edit_message_text(
                text=caption,
                parse_mode="HTML",
                reply_markup=search_card_keyboard(keyword, page, total_pages, bool(first.get("actress_name"))),
            )
    except Exception:
        # fallback: 发新消息
        await query_or_msg.message.reply_text(caption, parse_mode="HTML")


async def _show_confirm(query, keyword: str, page: int) -> None:
    """显示下载确认"""
    page_size = 3
    info_client = get_info_client()
    result = await info_client.search_videos(q=keyword, page=page, page_size=page_size)
    data = result.get("data", [])
    if not data:
        return
    first = data[0]
    content_id = first.get("content_id") or first.get("dvd_id", "")
    title = first.get("title_ja_translated") or first.get("title_ja", "")

    caption = f"🎬 <code>{content_id}</code>\n📌 {title}\n确认下载这部影片？"
    cover_url = first.get("jacket_full_url") or first.get("jacket_thumb_url")
    try:
        if cover_url:
            await query.edit_message_media(
                media=InputMediaPhoto(media=cover_url, caption=caption, parse_mode="HTML"),
                reply_markup=confirm_download_keyboard(content_id, keyword, page),
            )
        else:
            await query.edit_message_text(
                text=caption,
                parse_mode="HTML",
                reply_markup=confirm_download_keyboard(content_id, keyword, page),
            )
    except Exception:
        pass


async def _show_detail(query, keyword: str, page: int) -> None:
    """显示详情"""
    page_size = 3
    info_client = get_info_client()
    result = await info_client.search_videos(q=keyword, page=page, page_size=page_size)
    data = result.get("data", [])
    if not data:
        return
    first = data[0]
    content_id = first.get("content_id") or first.get("dvd_id", "")
    # 补充完整详情
    detail = await info_client.get_video(content_id)
    caption = _build_detail_caption(detail)
    cover_url = detail.get("jacket_full_url") or detail.get("jacket_thumb_url")
    try:
        if cover_url:
            await query.edit_message_media(
                media=InputMediaPhoto(media=cover_url, caption=caption, parse_mode="HTML"),
                reply_markup=detail_keyboard(content_id, keyword, page, bool(detail.get("actress_name"))),
            )
        else:
            await query.edit_message_text(
                text=caption,
                parse_mode="HTML",
                reply_markup=detail_keyboard(content_id, keyword, page, bool(detail.get("actress_name"))),
            )
    except Exception:
        pass


async def _do_download(query, content_id: str, keyword: str, page: int) -> None:
    """确认下载"""
    # 调用下载接口
    try:
        from routers.download import create_download_by_content_id
        await create_download_by_content_id(content_id)
        text = f"✅ <code>{content_id}</code> 已加入下载队列"
    except Exception as e:
        text = f"❌ 下载失败：{str(e)}"

    try:
        await query.edit_message_text(
            text=text,
            parse_mode="HTML",
            reply_markup=back_to_search_keyboard(keyword, page),
        )
    except Exception:
        pass
```

**注意**：`InputMediaPhoto` 需要 import：
```python
from telegram.helpers import InputMediaPhoto
```

- [ ] **Step 4: Commit**

```bash
git add backend/telegram_bot/handlers/search.py
git commit -m "feat(telegram): rewrite search handler with pagination and callbacks"
```

---

## Task 3: 注册 CallbackQueryHandler 到 bot.py

**Modify:** `backend/telegram_bot/bot.py`

- [ ] **Step 1: 查看 bot.py 全文**

```bash
cat backend/telegram_bot/bot.py
```

- [ ] **Step 2: 添加 CallbackQueryHandler 注册**

找到 `app.add_handler(CallbackQueryHandler(download_callback))`，在这行**之后**添加：

```python
from telegram_bot.handlers.search import callback_handler as search_callback_handler

# ... 其他 handler 注册之后

app.add_handler(CallbackQueryHandler(search_callback_handler))
```

- [ ] **Step 3: Commit**

```bash
git add backend/telegram_bot/bot.py
git commit -m "feat(telegram): register search callback handler in bot.py"
```

---

## Task 4: 本地测试（Demo）

- [ ] **Step 1: 启动后端**

```bash
cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 18080 &
```

- [ ] **Step 2: 用 curl 验证 JavInfoApi 搜索正常**

```bash
curl "http://localhost:8080/api/v1/videos/search?q=abc-123&page=1&page_size=3"
```

- [ ] **Step 3: 启动 telegram bot**（确保 TELEGRAM_BOT_TOKEN 配置好）

```bash
cd backend && python -m telegram_bot.bot
```

- [ ] **Step 4: Telegram 私聊 Bot，发 `/search abc-123`，验证返回封面卡片**

- [ ] **Step 5: 测试翻页按钮 [◀] [▶]**

- [ ] **Step 6: 测试「📋 详情」按钮**

- [ ] **Step 7: 测试「🎬 下载」→「✅ 确认下载」**

---

## 验证点

| 功能 | 验证 |
|---|---|
| `/search abc-123` | Bot 回复带封面图的第一页结果 |
| 封面图片 | 能加载，显示正确 |
| 翻页 | 点击 [▶] 能更新到下一页，封面不变 |
| 详情 | 点击后显示完整影片信息 |
| 下载确认 | 点击下载 → 确认键盘 → 确认后显示「已加入下载队列」 |
| 返回搜索 | 能回到搜索结果卡片 |
