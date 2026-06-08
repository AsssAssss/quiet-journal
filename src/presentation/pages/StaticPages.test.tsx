import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CalendarPage } from './CalendarPage';
import { TimelinePage } from './TimelinePage';

describe('静态占位页面', () => {
  it('日历页渲染标题', () => {
    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: '日历' })).toBeInTheDocument();
  });

  it('时间线页渲染标题', () => {
    render(
      <MemoryRouter>
        <TimelinePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: '时间线' })).toBeInTheDocument();
  });
});
