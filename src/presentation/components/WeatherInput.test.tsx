import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WeatherInput } from './WeatherInput';

describe('<WeatherInput />', () => {
  it('点击天气码切换选中', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WeatherInput onChange={onChange} />);
    await user.click(screen.getByTestId('weather-sunny'));
    expect(onChange).toHaveBeenCalledWith({ code: 'sunny' });
  });

  it('再次点击已选中可清除', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WeatherInput value={{ code: 'rainy' }} onChange={onChange} />);
    await user.click(screen.getByTestId('weather-rainy'));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('输入温度回传 number', () => {
    const onChange = vi.fn();
    render(<WeatherInput value={{ code: 'sunny' }} onChange={onChange} />);
    const input = screen.getByTestId('weather-temp') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '25' } });
    expect(onChange).toHaveBeenLastCalledWith({ code: 'sunny', temp: 25 });
  });

  it('非数字温度不回传', () => {
    const onChange = vi.fn();
    render(<WeatherInput value={{ code: 'sunny' }} onChange={onChange} />);
    const input = screen.getByTestId('weather-temp') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('清空温度后回传 temp=undefined', () => {
    const onChange = vi.fn();
    render(<WeatherInput value={{ code: 'sunny', temp: 20 }} onChange={onChange} />);
    const input = screen.getByTestId('weather-temp') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith({ code: 'sunny', temp: undefined });
  });

  it('value 仅含温度无 code 时也能更新', () => {
    const onChange = vi.fn();
    render(<WeatherInput value={{ temp: 18 }} onChange={onChange} />);
    const input = screen.getByTestId('weather-temp') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '20' } });
    expect(onChange).toHaveBeenLastCalledWith({ temp: 20 });
  });

});
