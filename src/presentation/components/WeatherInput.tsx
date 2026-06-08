import type { Weather } from '@/domain/entities/Entry';

interface WeatherInputProps {
  value?: Weather;
  onChange: (next: Weather | undefined) => void;
}

export const WEATHERS: { code: string; label: string; icon: string }[] = [
  { code: 'sunny', label: '晴', icon: '☀' },
  { code: 'cloudy', label: '多云', icon: '☁' },
  { code: 'rainy', label: '雨', icon: '☂' },
  { code: 'snowy', label: '雪', icon: '❄' },
  { code: 'windy', label: '风', icon: '〜' },
  { code: 'foggy', label: '雾', icon: '≈' },
];

export function weatherLabel(code?: string): string {
  return WEATHERS.find((w) => w.code === code)?.label ?? '';
}

export function weatherIcon(code?: string): string {
  return WEATHERS.find((w) => w.code === code)?.icon ?? '';
}

export function WeatherInput({ value, onChange }: WeatherInputProps) {
  const selected = value?.code;
  const temp = value?.temp;

  const setCode = (code: string) => {
    onChange(code === selected ? undefined : { ...value, code });
  };

  const setTemp = (raw: string) => {
    const t = raw.trim();
    if (t === '') {
      onChange(value ? { ...value, temp: undefined } : undefined);
      return;
    }
    const num = Number(t);
    if (Number.isNaN(num)) return;
    onChange({ ...value, temp: num });
  };

  return (
    <div className="flex items-center gap-1 flex-wrap" data-testid="weather-input">
      {WEATHERS.map((w) => {
        const active = selected === w.code;
        return (
          <button
            key={w.code}
            type="button"
            aria-pressed={active}
            aria-label={w.label}
            title={w.label}
            data-testid={`weather-${w.code}`}
            onClick={() => setCode(w.code)}
            className="inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded transition-colors duration-quiet ease-quiet hover:bg-[var(--accent-soft)]"
            style={{
              background: active ? 'var(--accent-soft)' : 'transparent',
            }}
          >
            <span
              className="text-base leading-none"
              style={{
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {w.icon}
            </span>
            <span
              className="text-[10px] leading-none tracking-wider"
              style={{
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {w.label}
            </span>
          </button>
        );
      })}

      <div className="ml-3 flex items-baseline gap-1">
        <input
          type="number"
          inputMode="numeric"
          value={temp ?? ''}
          onChange={(e) => setTemp(e.target.value)}
          placeholder="--"
          aria-label="温度"
          data-testid="weather-temp"
          className="w-12 bg-transparent border-0 outline-none text-sm text-ink placeholder:text-muted/60 text-right"
        />
        <span className="text-xs text-muted">°C</span>
      </div>
    </div>
  );
}
