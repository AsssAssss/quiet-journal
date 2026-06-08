import { describe, expect, it } from 'vitest';
import {
  EntryValidationError,
  createEntry,
  entryDisplayTitle,
  updateEntry,
} from './Entry';

describe('Entry', () => {
  it('createEntry 默认空文档 + 空标签 + 同时间戳', () => {
    const e = createEntry({ now: 1_700_000_000_000 });
    expect(e.title).toBe('');
    expect(e.tags).toEqual([]);
    expect(e.createdAt).toBe(1_700_000_000_000);
    expect(e.updatedAt).toBe(1_700_000_000_000);
    expect(e.contentJson).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
  });

  it('createEntry 去除重复与空白标签', () => {
    const e = createEntry({ tags: ['a', ' a ', '', 'b'] });
    expect(e.tags).toEqual(['a', 'b']);
  });

  it('createEntry trim 标题', () => {
    const e = createEntry({ title: '  hi  ' });
    expect(e.title).toBe('hi');
  });

  it('updateEntry 仅修改给定字段并更新 updatedAt', () => {
    const e = createEntry({ now: 1000 });
    const e2 = updateEntry(e, { title: '新标题', now: 2000 });
    expect(e2.title).toBe('新标题');
    expect(e2.updatedAt).toBe(2000);
    expect(e2.createdAt).toBe(1000);
    expect(e2.tags).toEqual([]);
  });

  it('updateEntry mood/weather 传 null 可清除', () => {
    const e = createEntry({ mood: 3, weather: { code: 'sunny' } });
    const e2 = updateEntry(e, { mood: null, weather: null });
    expect(e2.mood).toBeUndefined();
    expect(e2.weather).toBeUndefined();
  });

  it('updateEntry updatedAt 早于 createdAt 抛错', () => {
    const e = createEntry({ now: 2000 });
    expect(() => updateEntry(e, { now: 1000 })).toThrow(EntryValidationError);
  });

  it('updateEntry 默认 now 为当前时间', () => {
    const e = createEntry({ now: 1000 });
    const e2 = updateEntry(e, { title: 'x' });
    expect(e2.updatedAt).toBeGreaterThanOrEqual(e.createdAt);
  });

  it('entryDisplayTitle 优先用 title，否则用首段', () => {
    const a = createEntry({ title: 'A' });
    expect(entryDisplayTitle(a)).toBe('A');
    const b = createEntry({ plainText: '\n第一行内容\n第二行' });
    expect(entryDisplayTitle(b)).toBe('第一行内容');
    const c = createEntry({});
    expect(entryDisplayTitle(c)).toBe('未命名');
  });

  it('entryDisplayTitle 长首段截断到 40 字符', () => {
    const long = 'x'.repeat(80);
    const e = createEntry({ plainText: long });
    expect(entryDisplayTitle(e)).toHaveLength(40);
  });
});
