import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { DexieEntryRepository } from '@/infrastructure/persistence/dexieEntryRepository';
import { setEntryRepo } from '@/presentation/state/entryStore';
import { DexieVaultRepository } from '@/infrastructure/persistence/dexieVaultRepository';
import { setVaultDeps } from '@/presentation/state/vaultStore';

function renderApp(initial = '/timeline') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <App />
    </MemoryRouter>,
  );
}

async function ready() {
  await waitFor(() => {
    expect(screen.getAllByText('Quiet').length).toBeGreaterThan(0);
  });
}

describe('<App />', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    window.localStorage.clear();
    setEntryRepo(new DexieEntryRepository(`app-${Math.random().toString(36).slice(2)}`));
    setVaultDeps({ repo: new DexieVaultRepository(`vault-${Math.random().toString(36).slice(2)}`) });
  });

  it('渲染侧栏与时间线空状态', async () => {
    renderApp('/timeline');
    await ready();
    await waitFor(() => {
      expect(screen.getByText(/还没有记录/)).toBeInTheDocument();
    });
  });

  it('点击主题按钮切换 dark class', async () => {
    const user = userEvent.setup();
    renderApp('/timeline');
    await ready();
    const btn = screen.getByTestId('theme-toggle');
    const initiallyDark = document.documentElement.classList.contains('dark');
    await user.click(btn);
    expect(document.documentElement.classList.contains('dark')).toBe(!initiallyDark);
  });

  it('点击导航跳转到设置', async () => {
    const user = userEvent.setup();
    renderApp('/timeline');
    await ready();
    await user.click(screen.getByRole('link', { name: /设置/ }));
    expect(screen.getByRole('heading', { name: '设置' })).toBeInTheDocument();
  });

  it('⌘/ 快捷键触发主题切换', async () => {
    const user = userEvent.setup();
    renderApp('/timeline');
    await ready();
    const before = document.documentElement.classList.contains('dark');
    await user.keyboard('{Meta>}/{/Meta}');
    expect(document.documentElement.classList.contains('dark')).toBe(!before);
  });

  it('点击新条目后跳转到编辑器', async () => {
    const user = userEvent.setup();
    renderApp('/timeline');
    await ready();
    await waitFor(() => screen.getByTestId('new-entry'));
    await user.click(screen.getByTestId('new-entry'));
    await waitFor(() => {
      expect(screen.getByTestId('entry-title')).toBeInTheDocument();
    });
  });
});
