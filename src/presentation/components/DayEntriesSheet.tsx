import { useEffect } from 'react';
import { format } from 'date-fns';
import { type Entry, entryDisplayTitle } from '@/domain/entities/Entry';
import { moodLabel } from './MoodPicker';
import { weatherIcon, weatherLabel } from './WeatherInput';

interface DayEntriesSheetProps {
  open: boolean;
  date: Date | null;
  entries: Entry[];
  onSelect: (entry: Entry) => void;
  onClose: () => void;
}

/**
 * 日历点击某一天时弹出的"当日笔记"列表浮层。
 * 单条由调用方直接跳转，本组件只处理 ≥ 2 条的情况。
 */
export function DayEntriesSheet({
  open,
  date,
  entries,
  onSelect,
  onClose,
}: DayEntriesSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !date) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-sheet-title"
      data-testid="day-entries-sheet"
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,.32)' }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative quiet-card w-full max-w-md max-h-[80vh] flex flex-col shadow-lift"
        style={{ background: 'var(--surface-elevated)' }}
      >
        <div
          className="px-5 pt-5 pb-3 border-b flex items-baseline justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 id="day-sheet-title" className="font-serif text-lg">
            {format(date, 'yyyy 年 M 月 d 日')}
          </h2>
          <span className="text-xs text-muted">{entries.length} 条记录</span>
        </div>

        <div className="overflow-y-auto py-1">
          {entries.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelect(e)}
              data-testid={`day-sheet-item-${e.id}`}
              className="w-full text-left px-5 py-3 transition-colors duration-quiet ease-quiet hover:bg-[var(--accent-soft)]"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  {e.mood !== undefined && (
                    <span
                      className="inline-block h-2 w-2 rounded-full shrink-0"
                      style={{ background: `var(--mood-${e.mood})` }}
                      title={moodLabel(e.mood)}
                      aria-hidden
                    />
                  )}
                  <div className="font-serif text-base text-ink truncate">
                    {entryDisplayTitle(e)}
                  </div>
                </div>
                <time className="text-xs text-muted shrink-0">
                  {format(e.createdAt, 'HH:mm')}
                </time>
              </div>
              {e.plainText && (
                <div className="text-xs text-muted line-clamp-1 mb-1">
                  {e.plainText.split('\n').find((l) => l.trim().length > 0) ??
                    '空白的一天'}
                </div>
              )}
              {(e.weather || e.tags.length > 0) && (
                <div className="flex flex-wrap gap-1 text-[11px] text-muted">
                  {e.weather && (
                    <span>
                      {weatherIcon(e.weather.code)}{' '}
                      {weatherLabel(e.weather.code) || '天气'}
                      {e.weather.temp !== undefined && ` ${e.weather.temp}°`}
                    </span>
                  )}
                  {e.tags.map((t) => (
                    <span key={t}>#{t}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>

        <div
          className="px-5 py-3 border-t flex justify-end"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            type="button"
            className="quiet-btn"
            onClick={onClose}
            data-testid="day-sheet-close"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
