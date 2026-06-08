# Quiet Journal · 后端（PocketBase）

PocketBase 单二进制 + SQLite，承担用户注册/登录、跨设备同步。
**端到端加密在客户端完成**：vault 启用时后端永远看不到正文。

## 目录结构

```
backend/
  pb_migrations/   # collection schema（启动自动应用）
  pb_hooks/        # JS 钩子：注册限流、payload 大小校验、配额
  pb_data/         # 运行时数据（SQLite + 上传文件，gitignore）
  Dockerfile       # 单服务镜像
  docker-compose.yml
  Caddyfile        # 反代 + 自动 HTTPS + CORS
```

## 本地启动（无 Docker）

```bash
# 1) 下载 PocketBase 二进制（macOS arm64 示例）
wget https://github.com/pocketbase/pocketbase/releases/download/v0.28.4/pocketbase_0.28.4_darwin_arm64.zip
unzip pocketbase_0.28.4_darwin_arm64.zip
chmod +x pocketbase

# 2) 启动
./pocketbase serve

# 3) 浏览管理台
open http://127.0.0.1:8090/_/
```

首次访问会要求创建超级管理员账号。

## 本地启动（Docker）

```bash
docker compose up -d pocketbase   # 只起 PB，不起 Caddy
# 访问 http://127.0.0.1:8090/_/
```

## 生产部署

1. 改 `Caddyfile` 中的域名为你的域名，并把 `Access-Control-Allow-Origin` 改成前端域名
2. 解析 A 记录到服务器
3. `docker compose up -d`
4. Caddy 自动申请 Let's Encrypt 证书

## 集合（schema）

### users（PB 内置）
- 强制邮箱验证（管理台 → Settings → Auth providers → Email/Password → Require email verification）

### entries
- `id` (text PK)：客户端 EntryId（由前端指定）
- `user` (relation→users, required, cascade)
- `payload` (text)：完整 Entry JSON（vault 启用时其中是 EncryptedBlob）
- `entry_updated_at` (number, indexed)：客户端 updatedAt（LWW 用）
- 访问规则：`@request.auth.id != '' && user = @request.auth.id`

## 防滥用

`pb_hooks/main.pb.js` 已实现：
- 每 IP 每小时注册 ≤ 5 次
- 单 payload ≤ 256KB
- 单用户条目 ≤ 10k

进一步：
- 前端注册页接 Cloudflare Turnstile（可在 hook 中校验 token）
- Caddy / Cloudflare 层做 IP 限流
- 监控：PB 管理台日志

## 健康检查

`GET /api/health` → 200 即可。前端 `PocketBaseSyncAdapter.ping()` 走这个。
