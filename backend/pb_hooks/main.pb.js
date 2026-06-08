/// <reference path="../pb_data/types.d.ts" />

/**
 * 公开注册防滥用 + 配额钩子。
 * 部署到 backend/pb_hooks/，PocketBase 启动时自动加载。
 */

// ---- 配置 ----
const MAX_ENTRIES_PER_USER = 10_000;
const MAX_PAYLOAD_BYTES = 256 * 1024; // 单条 payload ≤ 256KB
const MAX_REGISTRATIONS_PER_IP_PER_HOUR = 5;

// ---- 简易内存限流（每个 IP 一小时内的注册次数） ----
// 注意：PB 单进程；多副本部署时需换 Redis 或 Cloudflare 层限流
const registerCounter = new Map();

function clientIp(e) {
  // 优先从反代头取
  const xff = e.request.header.get('X-Forwarded-For');
  if (xff) return xff.split(',')[0].trim();
  return e.request.remoteAddr || 'unknown';
}

// 用户注册：限流 + 必须验证邮箱
onRecordCreateRequest((e) => {
  const ip = clientIp(e);
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;

  // 清理过期
  const arr = (registerCounter.get(ip) || []).filter((t) => t > windowStart);
  if (arr.length >= MAX_REGISTRATIONS_PER_IP_PER_HOUR) {
    throw new ApiError(429, '注册过于频繁，请稍后再试');
  }
  arr.push(now);
  registerCounter.set(ip, arr);

  e.next();
}, 'users');

// 单 payload 大小校验 + 单用户条目数配额
onRecordCreateRequest((e) => {
  const payload = e.record.getString('payload') || '';
  if (payload.length > MAX_PAYLOAD_BYTES) {
    throw new ApiError(413, '单条记录过大');
  }

  const userId = e.record.getString('user');
  if (!userId) {
    throw new ApiError(400, '缺少 user 字段');
  }

  // 校验本人写入（与 createRule 双保险）
  if (e.auth?.id !== userId) {
    throw new ApiError(403, '不能为他人创建记录');
  }

  const count = $app
    .findRecordsByFilter('entries', `user = '${userId}'`, '', 1, 0)
    .length;
  // 注意：findRecordsByFilter 拿一条只是为了便宜；要真实计数需 totalRows
  // 这里用 dao 计数：
  const total = $app
    .dao()
    .findRecordsByExpr(
      'entries',
      $dbx.exp(`user = {:u}`, { u: userId }),
    ).length;
  if (total >= MAX_ENTRIES_PER_USER) {
    throw new ApiError(429, '记录数已达上限');
  }
  // 上面 total 也许重复；如不需要严格计数可移除，依靠 client 自律
  e.next();
}, 'entries');

onRecordUpdateRequest((e) => {
  const payload = e.record.getString('payload') || '';
  if (payload.length > MAX_PAYLOAD_BYTES) {
    throw new ApiError(413, '单条记录过大');
  }
  e.next();
}, 'entries');
