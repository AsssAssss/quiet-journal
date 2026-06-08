import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { type Entry, entryDisplayTitle } from '@/domain/entities/Entry';
import { moodLabel } from './MoodPicker';
import { weatherIcon, weatherLabel } from './WeatherInput';

interface SearchResultCardProps {
  entry: Entry;
  snippet: string;
}

export function SearchResultCard({ entry, snippet }: SearchResultCardProps) {
  return (
    <Link
      to={`/entry/${entry.id}`}
      className="block quiet-card p-5 hover:shadow-lift transition-shadow duration-quiet ease-quiet"
      data-testid={`search-result-${entry.id}`}
    >
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {entry.mood !== undefined && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: `var(--mood-${entry.mood})` }}
              title={moodLabel(entry.mood)}
            />
          )}
          <div className="font-serif text-lg text-ink truncate">
            {entryDisplayTitle(entry)}
          </div>
        </div>
        <time className="text-xs text-muted shrink-0">
          {format(entry.createdAt, 'yyyy-MM-dd')}
        </time>
      </div>
      <div
        className="text-sm text-muted line-clamp-2"
        // 受信任来源 —— snippet 由我们生成，仅包含 <mark>
        dangerouslySetInnerHTML={{ __html: snippet }}
      />

      {(entry.weather || entry.tags.length > 0) && (
        <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
          {entry.weather && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-soft)', color: 'var(--text-muted)' }}
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
  );
}
