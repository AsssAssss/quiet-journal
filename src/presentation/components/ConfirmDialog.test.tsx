import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('<ConfirmDialog />', () => {
  it('open=false 不渲染', () => {
    render(
      <ConfirmDialog
        open={false}
        title="x"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('open=true 渲染标题、描述、按钮', () => {
    render(
      <ConfirmDialog
        open
        title="确认删除"
        description="不可恢复"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText('确认删除')).toBeInTheDocument();
    expect(screen.getByText('不可恢复')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-ok')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-cancel')).toBeInTheDocument();
  });

  it('点击确认 / 取消触发对应回调', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open title="t" onConfirm={onConfirm} onCancel={onCancel} />,
    );
    await user.click(screen.getByTestId('confirm-ok'));
    expect(onConfirm).toHaveBeenCalled();
    await user.click(screen.getByTestId('confirm-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('Esc 触发取消，Enter 触发确认', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open title="t" onConfirm={onConfirm} onCancel={onCancel} />,
    );
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(onConfirm).toHaveBeenCalled();
  });

  it('点击遮罩取消', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="t"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    // 遮罩是 dialog 内的第一个 div（aria-hidden）
    const dialog = screen.getByTestId('confirm-dialog');
    const overlay = dialog.querySelector('[aria-hidden="true"]') as HTMLElement;
    await user.click(overlay);
    expect(onCancel).toHaveBeenCalled();
  });
});
