import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TagInput } from './TagInput';

describe('<TagInput />', () => {
  it('回车提交新标签', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);
    await user.click(screen.getByTestId('tag-input-field'));
    await user.keyboard('工作{Enter}');
    expect(onChange).toHaveBeenCalledWith(['工作']);
  });

  it('逗号也提交', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);
    await user.click(screen.getByTestId('tag-input-field'));
    await user.keyboard('a,');
    expect(onChange).toHaveBeenCalledWith(['a']);
  });

  it('空白与重复不入', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={['a']} onChange={onChange} />);
    await user.click(screen.getByTestId('tag-input-field'));
    await user.keyboard('   {Enter}');
    await user.keyboard('a{Enter}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('点击 × 移除标签', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={['a', 'b']} onChange={onChange} />);
    await user.click(screen.getByLabelText('移除标签 a'));
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('Backspace 在空输入时删除最后一个标签', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={['a', 'b']} onChange={onChange} />);
    await user.click(screen.getByTestId('tag-input-field'));
    await user.keyboard('{Backspace}');
    expect(onChange).toHaveBeenCalledWith(['a']);
  });

  it('失焦时提交剩余文本', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);
    const input = screen.getByTestId('tag-input-field');
    await user.click(input);
    await user.keyboard('草稿');
    await user.tab();
    expect(onChange).toHaveBeenCalledWith(['草稿']);
  });
});
