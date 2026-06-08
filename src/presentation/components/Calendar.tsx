import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useMemo } from 'react';
import type { Entry, Mood } from '@/domain/entities/Entry';

interface CalendarProps {
  month: Date;
  entries: Entry[];
  onMonthChange: (m: Date) => void;
  onDayClick?: (date: Date, entries: Entry[]) => void;
}

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export function Calendar({ month, entries, onMonthChange, onDayClick }: CalendarProps) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = new Date(d.getTime() + 86_400_000)) {
      out.push(d);
    }
    return out;
  }, [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const key = format(e.createdAt, 'yyyy-MM-dd');
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [entries]);

  const today = new Date();

  return (
    <div data-testid="calendar">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          className="quiet-btn h-8 px-3"
          onClick={() => onMonthChange(subMonths(month, 1))}
          aria-label="上一月"
          data-testid="calendar-prev"
        >
          ‹
        </button>
        <div className="font-serif text-lg" data-testid="calendar-month-label">
          {format(month, 'yyyy 年 M 月')}
        </div>
        <button
          type="button"
          className="quiet-btn h-8 px-3"
          onClick={() => onMonthChange(addMonths(month, 1))}
          aria-label="下一月"
          data-testid="calendar-next"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px text-xs text-muted mb-2">
        {WEEK_LABELS.map((w) => (
          <div key={w} className="py-1 text-center">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd');
          const dayEntries = byDay.get(key) ?? [];
          const inMonth = isSameMonth(d, month);
          const isToday = isSameDay(d, today);
          const moods = dayEntries
            .map((e) => e.mood)
            .filter((m): m is Mood => m !== undefined);
          const hasEntries = dayEntries.length > 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onDayClick?.(d, dayEntries)}
              disabled={!hasEntries}
              aria-label={`${format(d, 'M 月 d 日')} ${hasEntries ? `${dayEntries.length} 条记录` : ''}`}
              data-testid={`calendar-day-${key}`}
              className="relative flex aspect-square flex-col items-center justify-center rounded transition-colors duration-quiet ease-quiet"
              style={{
                background: hasEntries ? 'var(--surface)' : 'transparent',
                border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
                opacity: inMonth ? 1 : 0.35,
                cursor: hasEntries ? 'pointer' : 'default',
              }}
            >
              <span
                className="text-sm"
                style={{
                  color: isToday ? 'var(--accent)' : 'var(--text-primary)',
                  fontWeight: isToday ? 600 : 400,
                }}
              >
                {format(d, 'd')}
              </span>

              {/* 条目数角标（>=2 才显示） */}
              {dayEntries.length >= 2 && (
                <span
                  className="absolute top-1 right-1 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full text-[9px] font-medium px-1"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--bg)',
                  }}
                  data-testid={`calendar-day-count-${key}`}
                  aria-hidden
                >
                  {dayEntries.length}
                </span>
              )}

              {hasEntries && (
                <span
                  className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5"
                  data-testid={`calendar-day-dots-${key}`}
                >
                  {moods.length > 0 ? (
                    moods.slice(0, 3).map((m, i) => (
                      <span
                        key={i}
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ background: `var(--mood-${m})` }}
                      />
                    ))
                  ) : (
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: 'var(--text-muted)', opacity: 0.6 }}
                    />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="mt-6 pt-4 border-t flex items-center justify-center gap-3 flex-wrap text-[11px] text-muted" style={{ borderColor: 'var(--border)' }}>
        <span>心情</span>
        {[1, 2, 3, 4, 5, 6].map((m) => (
          <span key={m} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: `var(--mood-${m})` }}
            />
            {['低落', '平静', '一般', '不错', '愉悦', '兴奋'][m - 1]}
          </span>
        ))}
      </div>
    </div>
  );
}
