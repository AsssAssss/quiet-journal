import { NavLink } from 'react-router-dom';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useVaultStore } from '@/presentation/state/vaultStore';

const navItems = [
  { to: '/', label: '写作', icon: PenIcon },
  { to: '/timeline', label: '时间线', icon: TimelineIcon },
  { to: '/calendar', label: '日历', icon: CalendarIcon },
  { to: '/settings', label: '设置', icon: SettingsIcon },
];

export function Sidebar() {
  const { theme, toggle } = useTheme();
  const { status, lock } = useVaultStore();
  return (
    <aside
      className="flex h-full w-56 shrink-0 flex-col border-r"
      style={{ borderColor: 'var(--border)' }}
      aria-label="主导航"
    >
      <div className="px-5 pt-6 pb-4">
        <div className="font-serif text-lg tracking-wide">Quiet</div>
        <div className="text-xs text-muted mt-1">安静地记录</div>
      </div>

      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-quiet ease-quiet ${
                isActive
                  ? 'bg-accent-soft text-ink'
                  : 'text-muted hover:text-ink hover:bg-accent-soft/60'
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 pt-3 space-y-2">
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'k', metaKey: true }),
            )
          }
          className="quiet-btn w-full justify-between"
          aria-label="命令面板"
          data-testid="sidebar-cmdk"
        >
          <span>命令面板</span>
          <span className="text-muted text-xs">⌘K</span>
        </button>
        {status === 'unlocked' && (
          <button
            type="button"
            onClick={lock}
            className="quiet-btn w-full justify-between"
            aria-label="立即锁定"
            data-testid="sidebar-lock"
          >
            <span className="inline-flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
              </svg>
              立即锁定
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={toggle}
          className="quiet-btn w-full justify-between"
          aria-label="切换主题"
          data-testid="theme-toggle"
        >
          <span>{theme === 'dark' ? '深色' : '浅色'}</span>
          <span className="text-muted text-xs">⌘/</span>
        </button>
      </div>
    </aside>
  );
}

function PenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" strokeLinejoin="round" />
      <path d="M14 6l3 3" />
    </svg>
  );
}
function TimelineIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="6" cy="6" r="1.5" />
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="6" cy="18" r="1.5" />
      <path d="M10 6h10M10 12h10M10 18h6" strokeLinecap="round" />
    </svg>
  );
}
function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}
function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2.1-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2.1 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2.1 1.2L10 21h4l.5-2.6c.8-.3 1.5-.7 2.1-1.2l2.3.9 2-3.4-2-1.5c0-.4.1-.8.1-1.2z" />
    </svg>
  );
}
