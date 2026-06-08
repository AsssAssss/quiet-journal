# Quiet · 安静日记

[![CI](https://github.com/AsssAssss/quiet-journal/actions/workflows/ci.yml/badge.svg)](https://github.com/AsssAssss/quiet-journal/actions/workflows/ci.yml)

一个简约不简单、低调有格调的 Web 端日记本。本地优先，可选加密，可选 WebDAV 同步。

## 主要能力

- 浅色 / 深色双主题，跟随系统或手动切换
- WYSIWYG 编辑器（Tiptap）：标题/列表/引用/代码块/分割线/**任务清单（可勾选）**
- 元数据：心情（6 档色点 + 文字）、天气（图标 + 温度）、标签（chip）
- 视图：时间线（按年-月分组）/ 日历（心情色点 + 当日条目数）/ 设置
- 全文搜索（MiniSearch，中文按字符 / 英文前缀+模糊）+ 标签筛选
- 私密模式：AES-GCM 256 + PBKDF2-SHA256（25 万次迭代），主密码本地解锁
- 空闲自动锁定（5 分钟 / 15 分钟 / 1 小时 / 关闭）
- WebDAV 双向同步（坚果云 / Nextcloud / 自建均可）；启用 vault 时上传的就是密文
- 命令面板（⌘K）+ 快捷键（⌘N / ⌘F / ⌘/）
- PWA：可"添加到主屏幕"，离线可写

## 快速开始

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # Vitest + 覆盖率
pnpm build        # 生产构建（输出 dist/）
pnpm preview      # 本地预览生产构建
```

## 架构（Clean Architecture）

```
src/
  domain/          纯领域，零框架依赖
    entities/        Entry, Vault
    repositories/    IEntryRepository, IVaultRepository, IRemoteSyncAdapter
    services/        IEncryptionService, ISearchIndex
    valueObjects/    EntryId, EncryptedBlob
  application/     用例（编排）
    usecases/        createEntry, updateEntry, ..., syncEntries, vaultUseCases
  infrastructure/  外部实现
    persistence/     Dexie 仓储 + EncryptingEntryRepository 装饰器
    crypto/          Web Crypto AES-GCM
    sync/            WebDAV 适配器
    search/          MiniSearch 索引
  presentation/    React + Tailwind
    pages/, components/, hooks/, state/
  shared/          logger, Result
```

依赖方向：`presentation → application → domain ← infrastructure`。

## 部署到 Cloudflare Pages（推荐）

1. 把这个仓库推到 GitHub
2. Cloudflare Dashboard → Pages → 创建项目 → 关联 GitHub 仓库
3. 构建设置：
   - Framework preset: `None`
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - Node version: 20（或更高）
4. 部署后会拿到 `https://quiet-journal-xxx.pages.dev`，可绑自有域名（CNAME）

部署后 PWA 自动生效，用户可"添加到主屏幕"。

> **数据隔离提示**（建议放到产品说明给用户看）：每个用户的数据存在各自浏览器的 IndexedDB 中，按域名隔离。朋友间分享网址 = 各用各的本子，互不可见。
> 跨设备同步靠用户自己配置 WebDAV。

## 数据安全模型

- 默认明文存 IndexedDB（按浏览器域名隔离）
- 启用「私密模式」后，标题/正文/天气会被 AES-GCM 加密；mood/tags/createdAt 保留明文用于筛选与统计
- 主密码不会被任何方式上传或保存；忘记 = 已加密的条目无法恢复（请用密码管理器保管）
- WebDAV 同步：直接传输 IndexedDB 中的底层存储形态（明文或密文），不在网络层再做额外加密；vault 启用时远端永远看不到明文

## 快捷键

| 快捷键 | 动作 |
|---|---|
| ⌘K / Ctrl+K | 命令面板 |
| ⌘N / Ctrl+N | 新建条目 |
| ⌘F / Ctrl+F | 搜索（聚焦时间线搜索栏） |
| ⌘/ / Ctrl+/ | 切换浅/深主题 |
| Esc | 关闭命令面板 / 取消选中 |

## 测试

```bash
pnpm test           # 单测 + 覆盖率
pnpm typecheck      # tsc -b --noEmit
pnpm test:e2e       # Playwright（需要先 pnpm exec playwright install chromium）
```

目标覆盖率：函数 / 行 / 语句 / 分支 均 ≥ 90%。
富文本编辑器与页面级编排不在单测覆盖范围内（依赖真实浏览器渲染，由 Playwright 覆盖）。
