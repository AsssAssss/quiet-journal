import { useState } from 'react';
import { useVaultStore } from '@/presentation/state/vaultStore';
import { reloadEntries } from '@/presentation/state/entryStore';

export function UnlockPage() {
  const { unlock, error } = useVaultStore();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    setLocalErr(null);
    try {
      await unlock(password);
      await reloadEntries();
    } catch {
      setLocalErr('密码不正确');
    } finally {
      setSubmitting(false);
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
          className="quiet-input mb-3 text-center"
        />

        {(localErr || error) && (
          <div
            className="text-xs text-center mb-3"
            style={{ color: 'var(--mood-6)' }}
            role="alert"
            data-testid="unlock-error"
          >
            {localErr ?? error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !password}
          data-testid="unlock-submit"
          className="quiet-btn w-full justify-center"
          style={{
            background: 'var(--accent)',
            color: 'var(--bg)',
            borderColor: 'transparent',
            opacity: submitting || !password ? 0.5 : 1,
          }}
        >
          {submitting ? '解锁中…' : '解锁'}
        </button>
      </form>
    </div>
  );
}
