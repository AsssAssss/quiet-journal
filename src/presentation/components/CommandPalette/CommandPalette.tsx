import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useEntryStore } from '@/presentation/state/entryStore';
import { useVaultStore } from '@/presentation/state/vaultStore';
import { useSyncStore } from '@/presentation/state/syncStore';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: '操作' | '导航' | '安全' | '主题';
  run: () => void | Promise<void>;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { toggle, setTheme } = useTheme();
  const { create } = useEntryStore();
  const { status: vaultStatus, lock } = useVaultStore();
  const { sync, config: syncConfig } = useSyncStore();

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [
      {
        id: 'new-entry',
        label: '新建条目',
        hint: '⌘N',
        group: '操作',
        run: async () => {
          const e = await create();
          navigate(`/entry/${e.id}`);
        },
      },
      {
        id: 'go-timeline',
        label: '前往时间线',
        group: '导航',
        run: () => navigate('/timeline'),
      },
      {
        id: 'go-calendar',
        label: '前往日历',
        group: '导航',
        run: () => navigate('/calendar'),
      },
      {
        id: 'go-settings',
        label: '前往设置',
        group: '导航',
        run: () => navigate('/settings'),
      },
      {
        id: 'theme-toggle',
        label: '切换浅色 / 深色',
        hint: '⌘/',
        group: '主题',
        run: toggle,
      },
      {
        id: 'theme-light',
        label: '主题：浅色',
        group: '主题',
        run: () => setTheme('light'),
      },
      {
        id: 'theme-dark',
        label: '主题：深色',
        group: '主题',
        run: () => setTheme('dark'),
      },
    ];
    if (vaultStatus === 'unlocked') {
      list.push({
        id: 'lock',
        label: '立即锁定',
        group: '安全',
        run: lock,
      });
    }
    if (syncConfig) {
      list.push({
        id: 'sync',
        label: '立即同步（WebDAV）',
        group: '操作',
        run: sync,
      });
    }
    return list;
  }, [navigate, toggle, setTheme, create, vaultStatus, lock, sync, syncConfig]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [query, commands]);

  // 把 active 限制在合法范围
  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered.length, active]);

  if (!open) return null;

  const exec = async (c: Command) => {
    onClose();
    await c.run();
  };

  const onKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const c = filtered[active];
      if (c) await exec(c);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="命令面板"
      data-testid="command-palette"
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,.32)' }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-lg quiet-card overflow-hidden shadow-lift"
        style={{ background: 'var(--surface-elevated)' }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="键入命令…"
          aria-label="命令"
          data-testid="cmdk-input"
          className="w-full bg-transparent border-0 outline-none px-5 py-4 text-base text-ink placeholder:text-muted/70"
          style={{ borderBottom: '1px solid var(--border)' }}
        />
        <div className="max-h-[50vh] overflow-y-auto py-2" role="listbox">
          {filtered.length === 0 ? (
            <div className="text-sm text-muted px-5 py-6 text-center">没有匹配项</div>
          ) : (
            renderGroups(filtered, active, exec)
          )}
        </div>
      </div>
    </div>
  );
}

function renderGroups(
  cmds: Command[],
  active: number,
  exec: (c: Command) => void | Promise<void>,
) {
  const groups = new Map<string, Command[]>();
  for (const c of cmds) {
    const arr = groups.get(c.group) ?? [];
    arr.push(c);
    groups.set(c.group, arr);
  }
  let runningIdx = 0;
  return Array.from(groups.entries()).map(([group, items]) => (
    <div key={group} className="py-1">
      <div className="px-5 pt-2 pb-1 text-[11px] tracking-widest text-muted">
        {group}
      </div>
      {items.map((c) => {
        const idx = runningIdx++;
        const isActive = idx === active;
        return (
          <button
            key={c.id}
            type="button"
            role="option"
            aria-selected={isActive}
            onClick={() => void exec(c)}
            data-testid={`cmdk-item-${c.id}`}
            className="w-full flex items-center justify-between gap-3 px-5 py-2 text-sm text-left transition-colors duration-quiet ease-quiet"
            style={{
              background: isActive ? 'var(--accent-soft)' : 'transparent',
              color: 'var(--text-primary)',
            }}
          >
            <span>{c.label}</span>
            {c.hint && <span className="text-xs text-muted shrink-0">{c.hint}</span>}
          </button>
        );
      })}
    </div>
  ));
}
