import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NotFoundPage } from './NotFoundPage';

describe('<NotFoundPage />', () => {
  it('展示提示与回链', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('找不到这一页')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '回到时间线' })).toHaveAttribute(
      'href',
      '/timeline',
    );
  });
});
