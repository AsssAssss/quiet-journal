import { Route, Routes, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/presentation/components/Sidebar/Sidebar';
import { TopBar } from '@/presentation/components/TopBar';
import { EditorPage } from '@/presentation/pages/EditorPage';
import { TimelinePage } from '@/presentation/pages/TimelinePage';
import { CalendarPage } from '@/presentation/pages/CalendarPage';
import { SettingsPage } from '@/presentation/pages/SettingsPage';
import { UnlockPage } from '@/presentation/pages/UnlockPage';
import { NotFoundPage } from '@/presentation/pages/NotFoundPage';
import { CommandPalette } from '@/presentation/components/CommandPalette/CommandPalette';
import { ErrorBoundary } from '@/presentation/components/ErrorBoundary';
import { useTheme } from '@/presentation/hooks/useTheme';
import { useIdleLock } from '@/presentation/hooks/useIdleLock';
import { mod, useShortcuts } from '@/presentation/hooks/useShortcuts';
import { useVaultStore } from '@/presentation/state/vaultStore';
import { useEntryStore } from '@/presentation/state/entryStore';
import { useEffect, useState } from 'react';

export function App() {
  const { toggle } = useTheme();
  const { status, init } = useVaultStore();
  const navigate = useNavigate();
  const { create } = useEntryStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  useIdleLock();

  // 全局快捷键
  useShortcuts(
    [
      // ⌘K 命令面板（即便在输入框中也可以打开）
      {
        match: (e) => mod(e) && e.key === 'k',
        run: () => setPaletteOpen(true),
      },
      // ⌘/ 切主题
      {
        match: (e) => mod(e) && e.key === '/',
        run: toggle,
      },
      // ⌘N 新建条目
      {
        match: (e) => mod(e) && e.key.toLowerCase() === 'n' && !e.shiftKey,
        run: async () => {
          const e = await create();
          navigate(`/entry/${e.id}`);
        },
      },
      // ⌘F 聚焦搜索（路由到时间线，并尝试聚焦搜索框）
      {
        match: (e) => mod(e) && e.key.toLowerCase() === 'f',
        run: () => {
          navigate('/timeline');
          setTimeout(() => {
            const input = document.querySelector<HTMLInputElement>(
              '[data-testid="search-input"]',
            );
            input?.focus();
          }, 50);
        },
      },
    ],
    true, // 即使在输入框里这些 modifier 组合也允许
  );

  if (status === 'unknown') {
    return <div className="h-full" />;
  }
  if (status === 'locked') {
    return <UnlockPage />;
  }

  return (
    <ErrorBoundary>
      <div className="flex h-full">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto min-w-0">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <Routes>
            <Route path="/" element={<EditorPage />} />
            <Route path="/entry/:id" element={<EditorPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </ErrorBoundary>
  );
}
