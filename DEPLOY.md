# JavHub 部署指南

## 环境要求

| 组件 | 版本要求 | 说明 |
|------|----------|------|
| Docker | 20.10+ | [安装教程](https://docs.docker.com/get-docker/) |
| Docker Compose | 2.0+ | [安装教程](https://docs.docker.com/compose/install/) |
| Git | 任意版本 | 克隆代码用 |

## 快速部署 (一键启动)

```bash
# 1. 克隆项目
git clone https://github.com/XLX-NO1/JavHub.git
cd JavHub

# 2. 下载 JavInfoApi 子模块
git clone https://github.com/Kongmei-ovo/JavInfoApi.git JavInfoApi

# 3. 配置环境变量 (可选)
cp .env.example .env
# 编辑 .env 设置数据库密码等

# 4. 一键启动
docker-compose up -d

# 5. 查看服务状态
docker-compose ps

# 6. 查看日志
docker-compose logs -f
```

启动后访问：
- **前端**: http://localhost:3000
- **后端 API**: http://localhost:8000
- **JavInfoApi**: http://localhost:8080
- **API 文档**: http://localhost:8080/docs

---

## 详细配置

### 1. 数据库初始化 (必须)

JavInfoApi 需要 PostgreSQL 数据库和数据。

#### 方式 A: Docker Compose 自动启动 (推荐)

修改 `.env` 文件：

```bash
DB_PASSWORD=your_secure_password
```

docker-compose 会自动创建 PostgreSQL 容器。

#### 方式 B: 手动下载 r18 数据

1. 访问 https://r18.dev/dumps 下载数据库 dumps
2. 导入数据到 PostgreSQL:

```bash
# 连接数据库
psql -h localhost -U kongmei -d r18 -W

# 导入 dump 文件
\i /path/to/r18_dump.sql
```

### 2. JavInfoApi 配置

JavInfoApi 依赖数据库，无数据库则无法正常工作。

**环境变量** (可通过 `.env` 或 docker-compose 环境变量设置):

| 变量 | 默认值 | 说明 |
|------|--------|------|
| DB_HOST | postgres | 数据库主机 |
| DB_PORT | 5432 | 数据库端口 |
| DB_USER | kongmei | 数据库用户 |
| DB_PASSWORD | (必填) | 数据库密码 |
| DB_NAME | r18 | 数据库名 |
| SERVER_PORT | 8080 | API 服务端口 |

### 3. JavHub 后端配置

编辑 `config.yaml`:

```yaml
# JavInfoApi 元数据服务 (必填)
javinfo:
  api_url: "http://javinfoapi:8080"  # Docker 容器内用服务名
  timeout: 30

# Metatube 补充数据服务 (可选)
metatube:
  host: "154.23.255.204"  # 已部署的 Metatube 服务
  port: 8081
  token: ""               # 如有认证 token

# OpenList 下载服务 (可选)
openlist:
  api_url: "https://your-openlist.com"
  username: "your-username"
  password: "your-password"
  default_path: "/115/AV"

# Emby 媒体库 (可选)
emby:
  api_url: "http://your-emby:8096"
  api_key: "your-api-key"

# Telegram 通知 (可选)
telegram:
  bot_token: "your-bot-token"
  allowed_user_ids:
    - "your-user-id"

# 爬虫配置
crawler:
  user_agent: "Mozilla/5.0 ..."
  request_interval: 3

# 定时任务
scheduler:
  subscription_check_hour: 2

# 通知设置
notification:
  enabled: true
  telegram: true
  auto_download_notify: true
  download_complete_notify: true
  new_movie_notify: true
```

### 4. Metatube 服务

Metatube 服务已部署在 `154.23.255.204:8081`，用于补充元数据（summary、director、score）。

如需本地部署 Metatube，请参考其官方文档。

---

## 服务架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户浏览器                              │
│                   http://localhost:3000                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                        Nginx                                │
│                   (端口 80 / 3000)                          │
│  ┌─────────────┐           ┌─────────────┐                  │
│  │  静态资源    │           │  /api 转发   │                  │
│  │  Vue SPA    │           │  → backend  │                  │
│  └─────────────┘           └─────────────┘                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    JavHub Backend                           │
│                   (FastAPI, 端口 8000)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   路由模块    │  │   服务模块    │  │   外部客户端   │      │
│  │ videos       │  │ cache        │  │ info_client  │      │
│  │ actresses    │  │ downloader   │  │ metatube     │      │
│  │ makers       │  │ notification│  │ emby_client  │      │
│  │ ...          │  │ openlist    │  │ openlist     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────┬─────────────────┬─────────────────────────────┘
            │                 │
            ▼                 ▼
┌────────────────────┐  ┌────────────────────────────────────┐
│    JavInfoApi      │  │         Metatube Server             │
│  (Go, 端口 8080)   │  │     (154.23.255.204:8081)          │
│  ┌──────────────┐  │  │                                    │
│  │   PostgreSQL  │  │  │  补充: summary/director/score      │
│  │   查询接口    │  │  │                                    │
│  └──────────────┘  │  │                                    │
└─────────┬──────────┘  └────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL                               │
│                   (端口 5432)                                │
│              ┌──────────────────┐                           │
│              │      r18         │                           │
│              │   数据库         │                           │
│              └──────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 常用命令

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
docker-compose logs -f backend    # 只看后端日志
docker-compose logs -f javinfoapi  # 只看 JavInfoApi 日志

# 重启服务
docker-compose restart backend

# 重新构建镜像
docker-compose build --no-cache

# 停止所有服务
docker-compose down

# 停止并删除数据卷 (慎用!)
docker-compose down -v

# 进入容器调试
docker-compose exec backend sh
docker-compose exec postgres psql -U kongmei -d r18
```

---

## 端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 3000 | Frontend (Nginx) | 前端页面访问 |
| 5432 | PostgreSQL | 数据库 (仅本地) |
| 8000 | Backend (FastAPI) | 后端 API (仅本地) |
| 8080 | JavInfoApi | 元数据 API (仅本地) |

如需远程访问，将对应端口映射到公网即可。

---

## 常见问题

### Q1: JavInfoApi 启动失败，提示连接数据库失败

**原因**: PostgreSQL 未启动或数据库不存在。

**解决**:
1. 确保 PostgreSQL 容器运行中: `docker-compose ps postgres`
2. 等待 PostgreSQL 就绪: `docker-compose logs postgres`
3. 检查数据库是否创建: `docker-compose exec postgres psql -U kongmei -l`

### Q2: 后端提示 "Cannot connect to JavInfoApi"

**原因**: JavInfoApi 未就绪或地址配置错误。

**解决**:
1. 检查 JavInfoApi 健康状态: `curl http://localhost:8080/api/v1/videos?page=1`
2. 确认 `config.yaml` 中 `javinfo.api_url` 为 `http://javinfoapi:8080`
3. 查看后端日志: `docker-compose logs backend`

### Q3: 搜索无结果

**原因**: 数据库为空 (未导入 r18 数据)。

**解决**:
1. 从 https://r18.dev/dumps 下载数据
2. 导入数据库
3. 重启 JavInfoApi: `docker-compose restart javinfoapi`

### Q4: 端口被占用

**解决**:
```bash
# 查看端口占用
lsof -i :3000
lsof -i :8000
lsof -i :8080

# 修改 docker-compose.yml 中的端口映射
ports:
  - "3001:80"  # 改用 3001
```

### Q5: 前端无法访问后端 API

**原因**: Nginx 代理配置问题。

**解决**:
1. 确认 backend 容器运行正常
2. 检查 nginx.conf 中 proxy_pass 配置
3. 查看 nginx 日志: `docker-compose logs frontend`

---

## 数据备份

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U kongmei r18 > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker-compose exec -T postgres psql -U kongmei r18 < backup_20240101.sql
```

---

## 开发模式 (非 Docker)

```bash
# 后端
cd backend
pip install -r requirements.txt
cp config.yaml.example config.yaml
# 编辑 config.yaml
uvicorn main:app --reload --port 8000

# 前端
cd frontend
npm install
npm run dev

# JavInfoApi
cd JavInfoApi
cp .env.example .env
# 编辑 .env
go build -o JavInfoApi .
./JavInfoApi
```

---

_最后更新: 2026-04-17_
