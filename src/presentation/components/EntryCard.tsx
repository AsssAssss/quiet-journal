import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { type Entry, entryDisplayTitle } from '@/domain/entities/Entry';
import { moodLabel } from './MoodPicker';
import { weatherIcon, weatherLabel } from './WeatherInput';

interface EntryCardProps {
  entry: Entry;
  onDelete?: (entry: Entry) => void;
}

export function EntryCard({ entry, onDelete }: EntryCardProps) {
  const preview =
    entry.plainText.split('\n').filter((l) => l.trim().length > 0).slice(0, 2).join(' ') ||
    '空白的一天';

  const handleDelete: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(entry);
  };

  const hasMeta = entry.mood !== undefined || entry.weather !== undefined || entry.tags.length > 0;

  return (
    <div className="group relative">
      <Link
        to={`/entry/${entry.id}`}
        data-testid={`entry-card-${entry.id}`}
        className="block quiet-card p-5 hover:shadow-lift transition-shadow duration-quiet ease-quiet"
      >
        <div className="flex items-baseline justify-between gap-4 mb-2 pr-7">
          <div className="flex items-center gap-2.5 min-w-0">
            {entry.mood !== undefined && (
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: `var(--mood-${entry.mood})` }}
                title={moodLabel(entry.mood)}
                aria-label={`心情 ${moodLabel(entry.mood)}`}
                data-testid={`entry-mood-${entry.id}`}
              />
            )}
            <div className="font-serif text-lg text-ink truncate">{entryDisplayTitle(entry)}</div>
          </div>
          <time className="text-xs text-muted shrink-0">
            {format(entry.createdAt, 'MM-dd HH:mm')}
          </time>
        </div>
        <div className="text-sm text-muted line-clamp-2">{preview}</div>

        {hasMeta && (
          <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
            {entry.mood !== undefined && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: 'var(--accent-soft)', color: 'var(--text-muted)' }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: `var(--mood-${entry.mood})` }}
                />
                {moodLabel(entry.mood)}
              </span>
            )}
            {entry.weather !== undefined && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: 'var(--accent-soft)', color: 'var(--text-muted)' }}
                data-testid={`entry-weather-${entry.id}`}
              >
                <span>{weatherIcon(entry.weather.code)}</span>
                <span>{weatherLabel(entry.weather.code) || '天气'}</span>
                {entry.weather.temp !== undefined && <span>{entry.weather.temp}°</span>}
              </span>
            )}
            {entry.tags.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-full"
                style={{ background: 'var(--accent-soft)', color: 'var(--text-muted)' }}
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </Link>

      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label="删除该条目"
          data-testid={`delete-entry-${entry.id}`}
          className="absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded text-muted opacity-0 group-hover:opacity-100 hover:text-ink focus:opacity-100 focus:outline-none transition-all duration-quiet ease-quiet"
          style={{ background: 'transparent' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 7h14M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
