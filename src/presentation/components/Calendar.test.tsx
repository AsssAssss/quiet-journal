import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { type Entry, createEntry } from '@/domain/entities/Entry';
import { Calendar } from './Calendar';

function render2026June(
  entries: Entry[] = [],
  onMonthChange: (m: Date) => void = () => {},
  onDayClick: (d: Date, items: Entry[]) => void = () => {},
) {
  return render(
    <Calendar
      month={new Date(2026, 5, 15)}
      entries={entries}
      onMonthChange={onMonthChange}
      onDayClick={onDayClick}
    />,
  );
}

describe('<Calendar />', () => {
  it('显示当前月份标签', () => {
    render2026June();
    expect(screen.getByTestId('calendar-month-label').textContent).toMatch(
      /2026 年 6 月/,
    );
  });

  it('点击上一月触发回调', async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render2026June([], onMonthChange);
    await user.click(screen.getByTestId('calendar-prev'));
    const call = onMonthChange.mock.calls[0]![0] as Date;
    expect(call.getMonth()).toBe(4); // May
  });

  it('点击下一月触发回调', async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render2026June([], onMonthChange);
    await user.click(screen.getByTestId('calendar-next'));
    const call = onMonthChange.mock.calls[0]![0] as Date;
    expect(call.getMonth()).toBe(6); // July
  });

  it('当月有条目时显示心情点', () => {
    const e = createEntry({
      title: 't',
      mood: 5,
      now: new Date(2026, 5, 10, 9, 0).getTime(),
    });
    render2026June([e]);
    expect(screen.getByTestId('calendar-day-dots-2026-06-10')).toBeInTheDocument();
  });

  it('同一日有 ≥2 条目时显示数量角标', () => {
    const t = new Date(2026, 5, 11, 9, 0).getTime();
    const entries = [
      createEntry({ title: 'a', now: t }),
      createEntry({ title: 'b', now: t + 1000 }),
      createEntry({ title: 'c', now: t + 2000 }),
    ];
    render2026June(entries);
    expect(screen.getByTestId('calendar-day-count-2026-06-11').textContent).toBe('3');
  });

  it('单条目不显示数量角标', () => {
    const e = createEntry({ title: 'x', now: new Date(2026, 5, 12).getTime() });
    render2026June([e]);
    expect(screen.queryByTestId('calendar-day-count-2026-06-12')).toBeNull();
  });

  it('点击有条目的日期触发 onDayClick', async () => {
    const user = userEvent.setup();
    const e = createEntry({
      title: 't',
      now: new Date(2026, 5, 10, 9, 0).getTime(),
    });
    const onDayClick = vi.fn();
    render2026June([e], () => {}, onDayClick);
    await user.click(screen.getByTestId('calendar-day-2026-06-10'));
    expect(onDayClick).toHaveBeenCalled();
    expect(onDayClick.mock.calls[0]![1]).toEqual([e]);
  });

  it('点击无条目日期不触发', async () => {
    const user = userEvent.setup();
    const onDayClick = vi.fn();
    render2026June([], () => {}, onDayClick);
    const btn = screen.getByTestId('calendar-day-2026-06-20');
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onDayClick).not.toHaveBeenCalled();
  });
});
