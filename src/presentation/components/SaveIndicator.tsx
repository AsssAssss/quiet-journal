import type { SaveStatus } from '@/presentation/hooks/useAutoSave';
import { format } from 'date-fns';

interface SaveIndicatorProps {
  status: SaveStatus;
  savedAt: number | null;
}

const dotBase = 'inline-block h-1.5 w-1.5 rounded-full transition-all duration-quiet ease-quiet';

export function SaveIndicator({ status, savedAt }: SaveIndicatorProps) {
  return (
    <span
      className="inline-flex items-center gap-2 text-xs text-muted select-none"
      data-testid="save-indicator"
      data-status={status}
    >
      <span
        className={dotBase}
        style={{
          background:
            status === 'error'
              ? 'var(--mood-6)'
              : status === 'saved'
                ? 'var(--accent)'
                : 'var(--text-muted)',
          opacity: status === 'pending' || status === 'saving' ? 0.6 : 1,
          transform: status === 'pending' || status === 'saving' ? 'scale(1.2)' : 'scale(1)',
        }}
        aria-hidden
      />
      <span>{label(status, savedAt)}</span>
    </span>
  );
}

function label(status: SaveStatus, savedAt: number | null): string {
  switch (status) {
    case 'idle':
      return '准备就绪';
    case 'pending':
      return '即将保存';
    case 'saving':
      return '保存中…';
    case 'saved':
      return savedAt ? `已保存 · ${format(savedAt, 'HH:mm')}` : '已保存';
    case 'error':
      return '保存失败';
  }
}
