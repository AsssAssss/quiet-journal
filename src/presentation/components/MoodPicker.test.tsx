import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MoodPicker } from './MoodPicker';

describe('<MoodPicker />', () => {
  it('渲染六个心情点', () => {
    render(<MoodPicker onChange={() => {}} />);
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByTestId(`mood-${i}`)).toBeInTheDocument();
    }
  });

  it('点击未选中时回传值', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoodPicker onChange={onChange} />);
    await user.click(screen.getByTestId('mood-3'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('再次点击已选中的可清除', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoodPicker value={4} onChange={onChange} />);
    await user.click(screen.getByTestId('mood-4'));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('六个心情的文字标签常驻', () => {
    render(<MoodPicker onChange={() => {}} />);
    for (const label of ['低落', '平静', '一般', '不错', '愉悦', '兴奋']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('aria-checked 反映当前值', () => {
    render(<MoodPicker value={2} onChange={() => {}} />);
    expect(screen.getByTestId('mood-2')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('mood-1')).toHaveAttribute('aria-checked', 'false');
  });
});
