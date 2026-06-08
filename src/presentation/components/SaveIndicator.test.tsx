import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SaveIndicator } from './SaveIndicator';

describe('<SaveIndicator />', () => {
  it.each(['idle', 'pending', 'saving', 'saved', 'error'] as const)(
    '渲染 %s 状态',
    (status) => {
      render(<SaveIndicator status={status} savedAt={null} />);
      expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', status);
    },
  );

  it('saved + savedAt 显示时间', () => {
    const ts = new Date(2026, 0, 1, 14, 32).getTime();
    render(<SaveIndicator status="saved" savedAt={ts} />);
    expect(screen.getByText(/已保存/)).toBeInTheDocument();
    expect(screen.getByText(/14:32/)).toBeInTheDocument();
  });
});
