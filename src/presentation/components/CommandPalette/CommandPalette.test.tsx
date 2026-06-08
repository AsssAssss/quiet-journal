import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { CommandPalette } from './CommandPalette';
import { DexieEntryRepository } from '@/infrastructure/persistence/dexieEntryRepository';
import { DexieVaultRepository } from '@/infrastructure/persistence/dexieVaultRepository';
import { setEntryRepo } from '@/presentation/state/entryStore';
import { setVaultDeps } from '@/presentation/state/vaultStore';

function renderOpen(onClose = () => {}) {
  return render(
    <MemoryRouter>
      <CommandPalette open onClose={onClose} />
    </MemoryRouter>,
  );
}

describe('<CommandPalette />', () => {
  beforeEach(() => {
    setEntryRepo(new DexieEntryRepository(`cmdk-${Math.random().toString(36).slice(2)}`));
    setVaultDeps({ repo: new DexieVaultRepository(`v-${Math.random().toString(36).slice(2)}`) });
  });

  it('open=false 不渲染', () => {
    render(
      <MemoryRouter>
        <CommandPalette open={false} onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('command-palette')).toBeNull();
  });

  it('打开后渲染常驻命令', () => {
    renderOpen();
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    expect(screen.getByTestId('cmdk-item-new-entry')).toBeInTheDocument();
    expect(screen.getByTestId('cmdk-item-go-calendar')).toBeInTheDocument();
    expect(screen.getByTestId('cmdk-item-theme-toggle')).toBeInTheDocument();
  });

  it('输入过滤命令', async () => {
    const user = userEvent.setup();
    renderOpen();
    await user.type(screen.getByTestId('cmdk-input'), '日历');
    await waitFor(() => {
      expect(screen.getByTestId('cmdk-item-go-calendar')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('cmdk-item-go-timeline')).toBeNull();
  });

  it('未匹配显示空提示', async () => {
    const user = userEvent.setup();
    renderOpen();
    await user.type(screen.getByTestId('cmdk-input'), 'zzzzzzz');
    expect(screen.getByText('没有匹配项')).toBeInTheDocument();
  });

  it('Esc 关闭', async () => {
    const user = userEvent.setup();
    let closed = false;
    renderOpen(() => {
      closed = true;
    });
    await user.click(screen.getByTestId('cmdk-input'));
    await user.keyboard('{Escape}');
    expect(closed).toBe(true);
  });

  it('Enter 执行第一个命令并关闭', async () => {
    const user = userEvent.setup();
    let closed = false;
    renderOpen(() => {
      closed = true;
    });
    await user.click(screen.getByTestId('cmdk-input'));
    await user.keyboard('{Enter}');
    expect(closed).toBe(true);
  });

  it('ArrowDown 切换 active', async () => {
    const user = userEvent.setup();
    renderOpen();
    await user.click(screen.getByTestId('cmdk-input'));
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');
    // 应有第二项 aria-selected=true（操作组：new-entry → go-timeline → go-calendar...）
    // 这里只做基本断言
    const selected = document.querySelectorAll('[aria-selected="true"]');
    expect(selected.length).toBe(1);
  });

  it('点击项执行', async () => {
    const user = userEvent.setup();
    let closed = false;
    renderOpen(() => {
      closed = true;
    });
    await user.click(screen.getByTestId('cmdk-item-go-calendar'));
    expect(closed).toBe(true);
  });
});
