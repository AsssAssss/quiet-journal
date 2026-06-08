import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createEntry, updateEntry } from '@/domain/entities/Entry';
import { DayEntriesSheet } from './DayEntriesSheet';

const t1 = new Date(2026, 5, 8, 9, 30).getTime();
const t2 = new Date(2026, 5, 8, 14, 0).getTime();

function twoEntries() {
  return [
    updateEntry(createEntry({ title: '早晨', now: t1 }), {
      plainText: '清晨第一条',
      mood: 5,
      weather: { code: 'sunny', temp: 22 },
      tags: ['日常'],
      now: t1 + 10,
    }),
    updateEntry(createEntry({ title: '午后', now: t2 }), {
      plainText: '午饭后的随笔',
      now: t2 + 10,
    }),
  ];
}

describe('<DayEntriesSheet />', () => {
  it('open=false 不渲染', () => {
    render(
      <DayEntriesSheet
        open={false}
        date={new Date(2026, 5, 8)}
        entries={twoEntries()}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByTestId('day-entries-sheet')).toBeNull();
  });

  it('date=null 不渲染', () => {
    render(
      <DayEntriesSheet
        open
        date={null}
        entries={[]}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByTestId('day-entries-sheet')).toBeNull();
  });

  it('展示日期标题与条目数', () => {
    render(
      <DayEntriesSheet
        open
        date={new Date(2026, 5, 8)}
        entries={twoEntries()}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/2026 年 6 月 8 日/)).toBeInTheDocument();
    expect(screen.getByText('2 条记录')).toBeInTheDocument();
  });

  it('点击条目触发 onSelect', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const entries = twoEntries();
    render(
      <DayEntriesSheet
        open
        date={new Date(2026, 5, 8)}
        entries={entries}
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByTestId(`day-sheet-item-${entries[1]!.id}`));
    expect(onSelect).toHaveBeenCalledWith(entries[1]);
  });

  it('Esc 关闭', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <DayEntriesSheet
        open
        date={new Date(2026, 5, 8)}
        entries={twoEntries()}
        onSelect={() => {}}
        onClose={onClose}
      />,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('点击关闭按钮触发 onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <DayEntriesSheet
        open
        date={new Date(2026, 5, 8)}
        entries={twoEntries()}
        onSelect={() => {}}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByTestId('day-sheet-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('展示天气与标签摘要', () => {
    render(
      <DayEntriesSheet
        open
        date={new Date(2026, 5, 8)}
        entries={twoEntries()}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/晴/)).toBeInTheDocument();
    expect(screen.getByText('#日常')).toBeInTheDocument();
  });
});
