import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
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
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => confirmRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      else if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onCancel, onConfirm]);

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
          <p className="text-sm text-muted leading-6 mb-5">{description}</p>
        )}
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
            onClick={onConfirm}
            data-testid="confirm-ok"
            className="quiet-btn"
            style={
              destructive
                ? { background: 'var(--mood-6)', color: '#fff', borderColor: 'transparent' }
                : { background: 'var(--accent)', color: 'var(--bg)', borderColor: 'transparent' }
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
