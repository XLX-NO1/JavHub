# ============================================
# JavInfoApi - Go + PostgreSQL 元数据 API
# ============================================
FROM golang:1.23-alpine AS builder

WORKDIR /app

# 安装 build 依赖
RUN apk add --no-cache git

# 复制源码
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# 构建
RUN CGO_ENABLED=0 GOOS=linux go build -o JavInfoApi .

# ============================================
# 运行阶段
# ============================================
FROM alpine:3.19

WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache ca-certificates tzdata

# 复制二进制文件
COPY --from=builder /app/JavInfoApi .

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:8080/api/v1/videos?page=1\&page_size=1 || exit 1

# 运行
CMD ["./JavInfoApi"]
