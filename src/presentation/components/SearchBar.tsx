interface SearchBarProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 h-9 rounded-md"
      style={{ background: 'var(--accent-soft)' }}
      data-testid="search-bar"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 text-muted shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-4-4" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '搜索标题、正文或标签'}
        aria-label="搜索"
        data-testid="search-input"
        className="bg-transparent border-0 outline-none text-sm text-ink placeholder:text-muted/70 flex-1"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="清空"
          className="text-muted hover:text-ink text-xs"
          data-testid="search-clear"
        >
          ×
        </button>
      )}
    </div>
  );
}
