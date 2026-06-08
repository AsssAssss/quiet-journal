import { type ReactNode, useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** 禁用确认按钮（Enter 也无效），用于二次确认场景 */
  confirmDisabled?: boolean;
  /** 额外内容（如二次确认输入框），渲染在 description 与按钮之间 */
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  destructive,
  confirmDisabled,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (!confirmDisabled) confirmRef.current?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key === 'Enter') {
        // 输入框内按 Enter 不触发确认（避免误提交）
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        if (!confirmDisabled) onConfirm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onCancel, onConfirm, confirmDisabled]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      data-testid="confirm-dialog"
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,.32)' }}
        onClick={onCancel}
        aria-hidden
      />
      <div
        className="relative quiet-card w-full max-w-sm p-6 shadow-lift"
        style={{ background: 'var(--surface-elevated)' }}
      >
        <h2 id="confirm-title" className="font-serif text-lg mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted leading-6 mb-4">{description}</p>
        )}
        {children && <div className="mb-5">{children}</div>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="quiet-btn"
            onClick={onCancel}
            data-testid="confirm-cancel"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => {
              if (!confirmDisabled) onConfirm();
            }}
            data-testid="confirm-ok"
            disabled={confirmDisabled}
            className="quiet-btn"
            style={{
              ...(destructive
                ? { background: 'var(--mood-6)', color: '#fff', borderColor: 'transparent' }
                : { background: 'var(--accent)', color: 'var(--bg)', borderColor: 'transparent' }),
              opacity: confirmDisabled ? 0.5 : 1,
              cursor: confirmDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
