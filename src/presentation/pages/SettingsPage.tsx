import { useEffect, useState } from 'react';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useVaultStore } from '@/presentation/state/vaultStore';
import {
  migrateBaseToEncrypted,
  migrateEncryptedToBase,
  reloadEntries,
} from '@/presentation/state/entryStore';
import { useSyncStore } from '@/presentation/state/syncStore';
import { useAuthStore } from '@/presentation/state/authStore';
import {
  isFileSystemSyncSupported,
} from '@/infrastructure/sync/fileSystemSyncAdapter';
import {
  clearDirHandle,
  loadDirHandle,
  saveDirHandle,
} from '@/infrastructure/storage/dirHandleStore';
import { ConfirmDialog } from '@/presentation/components/ConfirmDialog';
import { format } from 'date-fns';
import {
  DEFAULT_IDLE_MS,
  getIdleLockMs,
  setIdleLockMs,
} from '@/presentation/hooks/useIdleLock';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { status, setup, lock, disable } = useVaultStore();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-10 py-8 md:py-16">
      <h1 className="font-serif text-2xl mb-8">设置</h1>

      <section className="space-y-6">
        <div className="quiet-card p-6">
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="font-medium">外观</div>
              <div className="text-muted text-sm mt-1">浅色 / 深色；未选择时跟随系统</div>
            </div>
            <div className="flex gap-2" role="radiogroup" aria-label="主题">
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  role="radio"
                  aria-checked={theme === t}
                  onClick={() => setTheme(t)}
                  className={`quiet-btn ${theme === t ? '!border-ink' : ''}`}
                >
                  {t === 'light' ? '浅色' : '深色'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <PrivacySection
          status={status}
          onEnable={async (pwd) => {
            await setup(pwd);
            // vault unlocked 后，把现有明文条目加密回写
            await migrateBaseToEncrypted();
            await reloadEntries();
          }}
          onLock={lock}
          onDisable={async () => {
            // 关闭前需要先把加密条目解密回明文
            await migrateEncryptedToBase();
            await disable();
            await reloadEntries();
          }}
        />

        <SyncSection />
      </section>
    </div>
  );
}

interface PrivacySectionProps {
  status: ReturnType<typeof useVaultStore.getState>['status'];
  onEnable: (pwd: string) => Promise<void>;
  onLock: () => void;
  onDisable: () => Promise<void>;
}

function PrivacySection({ status, onEnable, onLock, onDisable }: PrivacySectionProps) {
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [idleMs, setIdleMsState] = useState<number>(() => getIdleLockMs());

  const enable = async () => {
    setErr(null);
    if (pwd1.length < 4) {
      setErr('主密码至少 4 位');
      return;
    }
    if (pwd1 !== pwd2) {
      setErr('两次输入不一致');
      return;
    }
    setBusy(true);
    try {
      await onEnable(pwd1);
      setPwd1('');
      setPwd2('');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="quiet-card p-6">
        <div className="flex items-start justify-between gap-6 mb-4">
          <div>
            <div className="font-medium">私密模式</div>
            <div className="text-muted text-sm mt-1">
              用主密码对正文进行 AES-256 本地加密。锁定后未输入密码无法读取。
            </div>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full shrink-0"
            style={{
              background: 'var(--accent-soft)',
              color: 'var(--text-muted)',
            }}
            data-testid="vault-status"
          >
            {labelOf(status)}
          </span>
        </div>

        {status === 'absent' && (
          <div className="space-y-3" data-testid="vault-setup">
            <input
              type="password"
              value={pwd1}
              onChange={(e) => setPwd1(e.target.value)}
              placeholder="主密码（至少 4 位）"
              className="quiet-input"
              aria-label="主密码"
              data-testid="vault-pwd1"
            />
            <input
              type="password"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              placeholder="再次输入主密码"
              className="quiet-input"
              aria-label="再次输入主密码"
              data-testid="vault-pwd2"
            />
            {err && (
              <div className="text-xs" style={{ color: 'var(--mood-6)' }} role="alert">
                {err}
              </div>
            )}
            <div className="text-xs text-muted leading-5">
              密码不会上传，无法找回。请用密码管理器妥善保管；忘记后已加密的条目无法恢复。
            </div>
            <button
              type="button"
              onClick={enable}
              disabled={busy}
              data-testid="vault-enable"
              className="quiet-btn"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg)',
                borderColor: 'transparent',
                opacity: busy ? 0.5 : 1,
              }}
            >
              {busy ? '正在加密所有条目…' : '开启私密模式'}
            </button>
          </div>
        )}

        {status === 'unlocked' && (
          <div className="space-y-3" data-testid="vault-unlocked">
            <div className="flex gap-2">
              <button
                type="button"
                className="quiet-btn"
                onClick={onLock}
                data-testid="vault-lock"
              >
                立即锁定
              </button>
              <button
                type="button"
                className="quiet-btn"
                onClick={() => setConfirmDisable(true)}
                data-testid="vault-disable"
              >
                关闭私密模式
              </button>
            </div>
            <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="text-sm mb-2">空闲自动锁定</div>
              <IdleLockSelector value={idleMs} onChange={setIdleMsState} />
              <div className="text-xs text-muted mt-2">
                当前：{describeIdle(idleMs)}（默认 {DEFAULT_IDLE_MS / 60_000} 分钟）
              </div>
            </div>
          </div>
        )}

        {status === 'locked' && (
          <div className="text-sm text-muted">已锁定。回到任意页面输入密码即可。</div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDisable}
        destructive
        title="关闭私密模式？"
        description="所有条目将解密回明文存储。该操作不会丢失数据，但加密保护会取消。"
        confirmLabel="关闭"
        onCancel={() => setConfirmDisable(false)}
        onConfirm={async () => {
          await onDisable();
          setConfirmDisable(false);
        }}
      />
    </>
  );
}

const IDLE_PRESETS = [
  { ms: 0, label: '关闭' },
  { ms: 5 * 60_000, label: '5 分钟' },
  { ms: 15 * 60_000, label: '15 分钟' },
  { ms: 60 * 60_000, label: '1 小时' },
];

function describeIdle(ms: number): string {
  if (ms <= 0) return '不自动锁定';
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} 分钟`;
  if (m % 60 === 0) return `${m / 60} 小时`;
  return `${Math.floor(m / 60)} 小时 ${m % 60} 分钟`;
}

interface IdleLockSelectorProps {
  value: number;
  onChange: (ms: number) => void;
}

function IdleLockSelector({ value, onChange }: IdleLockSelectorProps) {
  const isPreset = IDLE_PRESETS.some((p) => p.ms === value);
  const customMinutes =
    !isPreset && value > 0 ? String(Math.round(value / 60_000)) : '';
  const [draft, setDraft] = useState<string>(customMinutes);

  useEffect(() => {
    setDraft(customMinutes);
  }, [customMinutes]);

  const apply = (raw: string) => {
    setDraft(raw);
    const m = Number(raw);
    if (Number.isFinite(m) && m >= 1 && m <= 1440) {
      const ms = m * 60_000;
      setIdleLockMs(ms);
      onChange(ms);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {IDLE_PRESETS.map((opt) => {
          const active = value === opt.ms;
          return (
            <button
              key={opt.ms}
              type="button"
              className="quiet-btn"
              onClick={() => {
                setIdleLockMs(opt.ms);
                onChange(opt.ms);
              }}
              style={{
                background: active ? 'var(--accent)' : undefined,
                color: active ? 'var(--bg)' : undefined,
                borderColor: active ? 'transparent' : undefined,
              }}
              data-testid={`idle-lock-${opt.ms}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted text-xs">自定义</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={1440}
          value={draft}
          onChange={(e) => apply(e.target.value)}
          placeholder="1 – 1440"
          aria-label="自定义自动锁定分钟数"
          data-testid="idle-lock-custom"
          className="quiet-input w-28"
        />
        <span className="text-muted text-xs">分钟</span>
        {!isPreset && value > 0 && (
          <span
            className="text-xs"
            style={{ color: 'var(--accent)' }}
            data-testid="idle-lock-custom-active"
          >
            已生效
          </span>
        )}
      </div>
    </div>
  );
}

function SyncSection() {
  const {
    config,
    status,
    lastSyncAt,
    lastResult,
    error,
    loadConfig,
    saveConfig,
    test,
    sync,
  } = useSyncStore();
  const auth = useAuthStore();
  const [kind, setKind] = useState<'pocketbase' | 'webdav' | 'filesystem'>(
    'filesystem',
  );
  const [fsFolderName, setFsFolderName] = useState<string>('');
  const [fsPicking, setFsPicking] = useState(false);
  const fsSupported = isFileSystemSyncSupported();
  // PocketBase 表单
  const [pbUrl, setPbUrl] = useState('');
  const [pbEmail, setPbEmail] = useState('');
  const [pbPassword, setPbPassword] = useState('');
  const [pbPasswordConfirm, setPbPasswordConfirm] = useState('');
  const [pbMode, setPbMode] = useState<'signin' | 'signup'>('signin');
  // WebDAV 表单
  const [davUrl, setDavUrl] = useState('');
  const [davUsername, setDavUsername] = useState('');
  const [davPassword, setDavPassword] = useState('');

  useEffect(() => {
    loadConfig();
    auth.init();
  }, [loadConfig]);

  useEffect(() => {
    if (!config) return;
    setKind(config.kind);
    if (config.kind === 'webdav') {
      setDavUrl(config.baseUrl);
      setDavUsername(config.username);
      setDavPassword(config.password);
    } else if (config.kind === 'pocketbase') {
      setPbUrl(config.baseUrl);
    } else if (config.kind === 'filesystem') {
      setFsFolderName(config.folderName);
    }
  }, [config]);

  // 启动时检查本地文件夹 handle 是否仍有效
  useEffect(() => {
    if (!fsSupported) return;
    void loadDirHandle().then((h) => {
      if (h) setFsFolderName(h.name);
    });
  }, [fsSupported]);

  const pickFolder = async () => {
    setFsPicking(true);
    try {
      const handle = await (
        window as Window & {
          showDirectoryPicker?: (opts?: {
            mode?: 'read' | 'readwrite';
          }) => Promise<FileSystemDirectoryHandle>;
        }
      ).showDirectoryPicker?.({ mode: 'readwrite' });
      if (!handle) return;
      // 立即请求 readwrite 权限
      const perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        throw new Error('未授予读写权限');
      }
      await saveDirHandle(handle);
      setFsFolderName(handle.name);
      saveConfig({ kind: 'filesystem', folderName: handle.name });
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return; // 用户取消
      window.alert((e as Error).message || '选择失败');
    } finally {
      setFsPicking(false);
    }
  };

  const clearFolder = async () => {
    await clearDirHandle();
    setFsFolderName('');
    saveConfig(null);
  };

  return (
    <div className="quiet-card p-6">
      <div className="flex items-start justify-between gap-6 mb-4">
        <div>
          <div className="font-medium">同步</div>
          <div className="text-muted text-sm mt-1">
            将日记同步到自建后端或 WebDAV，跨设备访问。
          </div>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full shrink-0"
          style={{ background: 'var(--accent-soft)', color: 'var(--text-muted)' }}
          data-testid="sync-status"
        >
          {syncStatusLabel(status)}
        </span>
      </div>

      {/* 后端类型切换 */}
      <div className="flex flex-wrap gap-2 mb-4" role="radiogroup" aria-label="同步后端类型">
        {(['filesystem', 'pocketbase', 'webdav'] as const).map((k) => {
          const active = kind === k;
          const disabled = k === 'filesystem' && !fsSupported;
          const label =
            k === 'pocketbase'
              ? '自建后端（PocketBase）'
              : k === 'webdav'
                ? 'WebDAV'
                : '本地文件夹';
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => setKind(k)}
              data-testid={`sync-kind-${k}`}
              className="quiet-btn"
              style={{
                ...(active
                  ? {
                      background: 'var(--accent)',
                      color: 'var(--bg)',
                      borderColor: 'transparent',
                    }
                  : {}),
                opacity: disabled ? 0.4 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
              title={
                disabled
                  ? '此浏览器不支持 File System Access API（仅 Chrome / Edge / Brave 桌面端）'
                  : undefined
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {kind === 'filesystem' ? (
        <div className="space-y-3">
          <div className="text-muted text-xs leading-5">
            选一个本地文件夹（如 <code>~/Documents/Quiet</code>），每条日记会写入该文件夹下的
            <code className="mx-0.5 px-1 rounded" style={{ background: 'var(--accent-soft)' }}>
              entries/&lt;id&gt;.jdiary
            </code>
            。即使浏览器清缓存也不会丢失（文件夹放进 iCloud Drive / OneDrive / Syncthing 还能白嫖同步）。
          </div>
          {fsFolderName ? (
            <div
              className="flex items-center justify-between gap-3 px-3 py-2 rounded"
              style={{ background: 'var(--accent-soft)' }}
            >
              <div className="text-sm min-w-0">
                <div className="text-muted text-xs">当前文件夹</div>
                <div className="font-mono truncate">{fsFolderName}/</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  className="quiet-btn"
                  onClick={pickFolder}
                  disabled={fsPicking}
                  data-testid="fs-change"
                >
                  {fsPicking ? '请选择…' : '更换'}
                </button>
                <button
                  type="button"
                  className="quiet-btn"
                  onClick={() => void clearFolder()}
                  data-testid="fs-clear"
                >
                  断开
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="quiet-btn"
              onClick={pickFolder}
              disabled={fsPicking}
              data-testid="fs-pick"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg)',
                borderColor: 'transparent',
                opacity: fsPicking ? 0.5 : 1,
              }}
            >
              {fsPicking ? '请选择文件夹…' : '选择文件夹'}
            </button>
          )}
        </div>
      ) : kind === 'pocketbase' ? (
        <div className="space-y-3">
          <input
            type="url"
            value={pbUrl}
            onChange={(e) => setPbUrl(e.target.value)}
            placeholder="后端地址，如 https://quiet-api.example.com"
            aria-label="后端地址"
            className="quiet-input"
            data-testid="pb-url"
          />
          {auth.token && auth.user ? (
            <div className="flex items-center justify-between text-sm">
              <span>
                已登录：<span className="text-ink">{auth.user.email}</span>
                {!auth.user.verified && (
                  <span className="text-xs ml-2" style={{ color: 'var(--mood-4)' }}>
                    （邮箱未验证）
                  </span>
                )}
              </span>
              <button
                type="button"
                className="quiet-btn"
                onClick={() => auth.signOut()}
                data-testid="pb-signout"
              >
                退出登录
              </button>
            </div>
          ) : (
            <>
              <input
                type="email"
                value={pbEmail}
                onChange={(e) => setPbEmail(e.target.value)}
                placeholder="邮箱"
                aria-label="邮箱"
                className="quiet-input"
                data-testid="pb-email"
              />
              <input
                type="password"
                value={pbPassword}
                onChange={(e) => setPbPassword(e.target.value)}
                placeholder="密码"
                aria-label="密码"
                className="quiet-input"
                data-testid="pb-password"
              />
              {pbMode === 'signup' && (
                <input
                  type="password"
                  value={pbPasswordConfirm}
                  onChange={(e) => setPbPasswordConfirm(e.target.value)}
                  placeholder="再次输入密码"
                  aria-label="再次输入密码"
                  className="quiet-input"
                  data-testid="pb-password-confirm"
                />
              )}
              {auth.error && (
                <div className="text-xs" style={{ color: 'var(--mood-6)' }} role="alert">
                  {auth.error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="quiet-btn"
                  disabled={!pbUrl || !pbEmail || !pbPassword || auth.loading}
                  data-testid="pb-submit"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--bg)',
                    borderColor: 'transparent',
                    opacity:
                      !pbUrl || !pbEmail || !pbPassword || auth.loading ? 0.5 : 1,
                  }}
                  onClick={async () => {
                    try {
                      if (pbMode === 'signin') {
                        await auth.signIn(pbUrl, pbEmail, pbPassword);
                      } else {
                        await auth.signUp(pbUrl, pbEmail, pbPassword, pbPasswordConfirm);
                      }
                      // 登录成功后自动保存同步配置
                      saveConfig({ kind: 'pocketbase', baseUrl: pbUrl });
                    } catch {
                      /* error 已写入 store */
                    }
                  }}
                >
                  {auth.loading ? '处理中…' : pbMode === 'signin' ? '登录' : '注册'}
                </button>
                <button
                  type="button"
                  className="quiet-btn"
                  onClick={() =>
                    setPbMode(pbMode === 'signin' ? 'signup' : 'signin')
                  }
                  data-testid="pb-mode-toggle"
                >
                  {pbMode === 'signin' ? '没有账号？注册' : '已有账号？登录'}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-muted text-xs leading-5 mb-1">
            提示：浏览器直连 WebDAV 通常被 CORS 拦截，需自建反代或开启 CORS。
          </div>
          <input
            type="url"
            value={davUrl}
            onChange={(e) => setDavUrl(e.target.value)}
            placeholder="WebDAV 地址，如 https://dav.example.com/quiet/"
            aria-label="WebDAV 地址"
            className="quiet-input"
            data-testid="sync-url"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={davUsername}
              onChange={(e) => setDavUsername(e.target.value)}
              placeholder="用户名"
              aria-label="用户名"
              className="quiet-input"
              data-testid="sync-username"
            />
            <input
              type="password"
              value={davPassword}
              onChange={(e) => setDavPassword(e.target.value)}
              placeholder="应用密码"
              aria-label="应用密码"
              className="quiet-input"
              data-testid="sync-password"
            />
          </div>
          <button
            type="button"
            className="quiet-btn"
            disabled={!davUrl || !davUsername || !davPassword}
            onClick={() =>
              saveConfig({
                kind: 'webdav',
                baseUrl: davUrl,
                username: davUsername,
                password: davPassword,
              })
            }
            data-testid="sync-save"
            style={{
              opacity: !davUrl || !davUsername || !davPassword ? 0.5 : 1,
            }}
          >
            保存 WebDAV 配置
          </button>
        </div>
      )}

      {error && (
        <div className="text-xs mt-3" style={{ color: 'var(--mood-6)' }} role="alert">
          {error}
        </div>
      )}

      {lastSyncAt && (
        <div className="text-xs text-muted mt-3">
          上次同步：{format(lastSyncAt, 'yyyy-MM-dd HH:mm')}
          {lastResult &&
            `　·　上传 ${lastResult.uploaded} 下载 ${lastResult.downloaded}`}
        </div>
      )}

      <div className="flex gap-2 pt-3 mt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          className="quiet-btn"
          disabled={!config || status === 'testing'}
          onClick={test}
          data-testid="sync-test"
          style={{ opacity: !config || status === 'testing' ? 0.5 : 1 }}
        >
          {status === 'testing' ? '测试中…' : '测试连接'}
        </button>
        <button
          type="button"
          className="quiet-btn"
          disabled={!config || status === 'syncing'}
          onClick={sync}
          data-testid="sync-now"
          style={{
            background: 'var(--accent)',
            color: 'var(--bg)',
            borderColor: 'transparent',
            opacity: !config || status === 'syncing' ? 0.5 : 1,
          }}
        >
          {status === 'syncing' ? '同步中…' : '立即同步'}
        </button>
        {config && (
          <button
            type="button"
            className="quiet-btn ml-auto"
            onClick={() => {
              saveConfig(null);
              setDavUrl('');
              setDavUsername('');
              setDavPassword('');
              setPbUrl('');
            }}
            data-testid="sync-clear"
          >
            清除配置
          </button>
        )}
      </div>
    </div>
  );
}

function syncStatusLabel(s: ReturnType<typeof useSyncStore.getState>['status']) {
  switch (s) {
    case 'idle':
      return '未连接';
    case 'testing':
      return '测试中';
    case 'syncing':
      return '同步中';
    case 'ok':
      return '正常';
    case 'error':
      return '错误';
  }
}

function labelOf(s: PrivacySectionProps['status']): string {
  switch (s) {
    case 'unknown':
      return '...';
    case 'absent':
      return '未开启';
    case 'locked':
      return '已锁定';
    case 'unlocked':
      return '已解锁';
  }
}
