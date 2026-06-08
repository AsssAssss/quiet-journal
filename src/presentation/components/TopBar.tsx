interface TopBarProps {
  onMenuClick: () => void;
}

/**
 * 移动端顶部 bar（< md 显示）。
 * 桌面端 sidebar 常驻，此组件不渲染。
 */
export function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <div
      className="md:hidden sticky top-0 z-20 flex items-center gap-3 h-12 px-3 border-b backdrop-blur"
      style={{
        borderColor: 'var(--border)',
        background: 'color-mix(in srgb, var(--bg) 88%, transparent)',
      }}
      data-testid="topbar"
    >
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="打开菜单"
        data-testid="topbar-menu"
        className="inline-flex h-8 w-8 items-center justify-center rounded text-muted hover:text-ink transition-colors"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>
      <div className="font-serif text-base">Quiet</div>
    </div>
  );
}
