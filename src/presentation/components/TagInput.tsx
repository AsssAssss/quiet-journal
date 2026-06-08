import { useState, type KeyboardEvent } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const t = draft.trim();
    setDraft('');
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
  };

  const remove = (t: string) => {
    onChange(value.filter((x) => x !== t));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      // Backspace 在空输入时删除最后一个标签
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className="flex items-center gap-1.5 flex-wrap"
      data-testid="tag-input"
    >
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'var(--accent-soft)', color: 'var(--text-muted)' }}
          data-testid={`tag-${t}`}
        >
          {t}
          <button
            type="button"
            onClick={() => remove(t)}
            aria-label={`移除标签 ${t}`}
            className="ml-0.5 -mr-0.5 hover:text-ink transition-colors duration-quiet ease-quiet"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
        placeholder={value.length === 0 ? (placeholder ?? '添加标签…') : ''}
        className="bg-transparent border-0 outline-none text-xs text-ink placeholder:text-muted/60 min-w-[80px] flex-1"
        data-testid="tag-input-field"
        aria-label="添加标签"
      />
    </div>
  );
}
