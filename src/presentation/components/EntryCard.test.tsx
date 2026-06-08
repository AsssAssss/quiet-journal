import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { createEntry, updateEntry } from '@/domain/entities/Entry';
import { EntryCard } from './EntryCard';

function renderCard(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe('<EntryCard />', () => {
  it('显示标题、时间、空白占位', () => {
    const e = createEntry({ title: '今日', now: new Date(2026, 5, 1, 9, 0).getTime() });
    renderCard(<EntryCard entry={e} />);
    expect(screen.getByText('今日')).toBeInTheDocument();
    expect(screen.getByText(/空白的一天/)).toBeInTheDocument();
  });

  it('显示标签（带 # 前缀）', () => {
    const e = updateEntry(createEntry({ title: 't', now: 1000 }), {
      tags: ['工作', '随笔'],
      now: 2000,
    });
    renderCard(<EntryCard entry={e} />);
    expect(screen.getByText('#工作')).toBeInTheDocument();
    expect(screen.getByText('#随笔')).toBeInTheDocument();
  });

  it('显示心情圆点与文字', () => {
    const e = updateEntry(createEntry({ title: 't', now: 1000 }), {
      mood: 5,
      now: 2000,
    });
    renderCard(<EntryCard entry={e} />);
    expect(screen.getByTestId(`entry-mood-${e.id}`)).toBeInTheDocument();
    expect(screen.getByText('愉悦')).toBeInTheDocument();
  });

  it('显示天气芯片', () => {
    const e = updateEntry(createEntry({ title: 't', now: 1000 }), {
      weather: { code: 'sunny', temp: 25 },
      now: 2000,
    });
    renderCard(<EntryCard entry={e} />);
    const chip = screen.getByTestId(`entry-weather-${e.id}`);
    expect(chip.textContent).toMatch(/晴/);
    expect(chip.textContent).toMatch(/25/);
  });

  it('使用 plainText 作为预览', () => {
    const e = updateEntry(createEntry({ title: 't', now: 1000 }), {
      plainText: '第一行\n第二行',
      now: 2000,
    });
    renderCard(<EntryCard entry={e} />);
    expect(screen.getByText(/第一行 第二行/)).toBeInTheDocument();
  });

  it('未传 onDelete 时不渲染删除按钮', () => {
    const e = createEntry({ title: 't' });
    renderCard(<EntryCard entry={e} />);
    expect(screen.queryByRole('button', { name: /删除/ })).toBeNull();
  });

  it('点击删除按钮触发回调，且不会跳转链接', async () => {
    const user = userEvent.setup();
    const e = createEntry({ title: 't' });
    const onDelete = vi.fn();
    renderCard(<EntryCard entry={e} onDelete={onDelete} />);
    const btn = screen.getByTestId(`delete-entry-${e.id}`);
    await user.click(btn);
    expect(onDelete).toHaveBeenCalledWith(e);
  });
});
