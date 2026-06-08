import { useEffect, useState } from 'react';
import { useVaultStore } from '@/presentation/state/vaultStore';
import { reloadEntries, wipeAllEntries } from '@/presentation/state/entryStore';
import { ConfirmDialog } from '@/presentation/components/ConfirmDialog';

const RESET_CONFIRM_WORD = 'RESET';

export function UnlockPage() {
  const { unlock, resetVault, failedAttempts, lockoutUntil, error } = useVaultStore();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [resetOpen, setResetOpen] = useState(false);
  const [resetWord, setResetWord] = useState('');
  const [resetting, setResetting] = useState(false);

  const inLockout = lockoutUntil !== null && now < lockoutUntil;
  const remainSec = inLockout
    ? Math.max(0, Math.ceil((lockoutUntil! - now) / 1000))
    : 0;

  // 冷却中每秒刷新倒计时
  useEffect(() => {
    if (!inLockout) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inLockout]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || inLockout) return;
    setSubmitting(true);
    setLocalErr(null);
    try {
      await unlock(password);
      await reloadEntries();
    } catch (err) {
      setLocalErr((err as Error).message || '密码不正确');
    } finally {
      setSubmitting(false);
    }
  };

  const onReset = async () => {
    if (resetWord !== RESET_CONFIRM_WORD) return;
    setResetting(true);
    try {
      await resetVault(wipeAllEntries);
      await reloadEntries();
      setResetOpen(false);
      setResetWord('');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm"
        data-testid="unlock-form"
      >
        <div className="mb-8 text-center">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-full mb-4"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl mb-2">日记本已上锁</h1>
          <p className="text-sm text-muted">输入主密码以继续</p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="主密码"
          autoFocus
          aria-label="主密码"
          data-testid="unlock-password"
          disabled={inLockout}
          className="quiet-input mb-3 text-center"
          style={{ opacity: inLockout ? 0.5 : 1 }}
        />

        {inLockout ? (
          <div
            className="text-xs text-center mb-3"
            style={{ color: 'var(--mood-6)' }}
            role="alert"
            data-testid="unlock-lockout"
          >
            尝试次数过多，{formatMMSS(remainSec)} 后可再试
          </div>
        ) : (localErr || error) ? (
          <div
            className="text-xs text-center mb-3"
            style={{ color: 'var(--mood-6)' }}
            role="alert"
            data-testid="unlock-error"
          >
            {localErr ?? error}
            {failedAttempts > 0 && (
              <span className="ml-1 opacity-70">（已失败 {failedAttempts} 次）</span>
            )}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !password || inLockout}
          data-testid="unlock-submit"
          className="quiet-btn w-full justify-center"
          style={{
            background: 'var(--accent)',
            color: 'var(--bg)',
            borderColor: 'transparent',
            opacity: submitting || !password || inLockout ? 0.5 : 1,
          }}
        >
          {submitting ? '解锁中…' : '解锁'}
        </button>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            data-testid="unlock-forgot"
            className="text-xs text-muted hover:text-ink transition-colors duration-quiet ease-quiet underline-offset-4 hover:underline"
          >
            忘记主密码？
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={resetOpen}
        destructive
        title="重置日记本"
        description="主密码无法找回。继续将永久删除所有已加密的条目，并清除主密码设置，之后你可以用新密码重新开始。"
        confirmLabel={resetting ? '重置中…' : '永久删除'}
        cancelLabel="取消"
        confirmDisabled={resetWord !== RESET_CONFIRM_WORD || resetting}
        onCancel={() => {
          setResetOpen(false);
          setResetWord('');
        }}
        onConfirm={() => void onReset()}
      >
        <label className="block text-xs text-muted mb-1.5">
          请输入{' '}
          <code
            className="px-1 rounded mx-0.5"
            style={{ background: 'var(--accent-soft)' }}
          >
            {RESET_CONFIRM_WORD}
          </code>{' '}
          以确认（区分大小写）
        </label>
        <input
          type="text"
          value={resetWord}
          onChange={(e) => setResetWord(e.target.value)}
          data-testid="unlock-reset-word"
          className="quiet-input"
          placeholder={RESET_CONFIRM_WORD}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
      </ConfirmDialog>
    </div>
  );
}

function formatMMSS(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
