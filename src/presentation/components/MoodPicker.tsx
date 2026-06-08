import type { Mood } from '@/domain/entities/Entry';

interface MoodPickerProps {
  value?: Mood;
  onChange: (next: Mood | undefined) => void;
}

export const MOODS: { value: Mood; label: string }[] = [
  { value: 1, label: '低落' },
  { value: 2, label: '平静' },
  { value: 3, label: '一般' },
  { value: 4, label: '不错' },
  { value: 5, label: '愉悦' },
  { value: 6, label: '兴奋' },
];

export function moodLabel(m: Mood): string {
  return MOODS.find((x) => x.value === m)?.label ?? '';
}

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="心情"
      className="flex items-center gap-1"
      data-testid="mood-picker"
    >
      {MOODS.map((m) => {
        const active = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={m.label}
            title={m.label}
            data-testid={`mood-${m.value}`}
            onClick={() => onChange(active ? undefined : m.value)}
            className="group inline-flex flex-col items-center gap-1 px-2 py-1 rounded transition-colors duration-quiet ease-quiet hover:bg-[var(--accent-soft)]"
          >
            <span
              className="inline-block h-5 w-5 rounded-full transition-transform duration-quiet ease-quiet"
              style={{
                background: `var(--mood-${m.value})`,
                boxShadow: active
                  ? '0 0 0 2px var(--bg), 0 0 0 3px var(--accent)'
                  : 'none',
                opacity: value === undefined || active ? 1 : 0.55,
              }}
            />
            <span
              className="text-[10px] leading-none tracking-wider"
              style={{
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
