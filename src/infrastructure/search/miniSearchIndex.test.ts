import { describe, expect, it } from 'vitest';
import { createEntry, updateEntry } from '@/domain/entities/Entry';
import { MiniSearchIndex, makeSnippet } from './miniSearchIndex';

function entries() {
  return [
    updateEntry(createEntry({ title: '今日工作记录', now: 1000 }), {
      plainText: '今天写了日记本的搜索功能，调通了 MiniSearch',
      tags: ['工作', '编程'],
      now: 2000,
    }),
    updateEntry(createEntry({ title: '周末闲笔', now: 3000 }), {
      plainText: '吃了拉面，看了一部电影',
      tags: ['生活'],
      now: 4000,
    }),
    updateEntry(createEntry({ title: 'Daily', now: 5000 }), {
      plainText: 'Refactor entry store with zustand',
      tags: ['refactor'],
      now: 6000,
    }),
  ];
}

describe('MiniSearchIndex', () => {
  it('空查询返回空', () => {
    const idx = new MiniSearchIndex();
    idx.rebuild(entries());
    expect(idx.search('')).toEqual([]);
    expect(idx.search('   ')).toEqual([]);
  });

  it('中文按字符命中', () => {
    const idx = new MiniSearchIndex();
    idx.rebuild(entries());
    const hits = idx.search('搜索');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.entry.title).toBe('今日工作记录');
  });

  it('英文前缀匹配', () => {
    const idx = new MiniSearchIndex();
    idx.rebuild(entries());
    const hits = idx.search('refac');
    expect(hits[0]!.entry.title).toBe('Daily');
  });

  it('按 tag 命中', () => {
    const idx = new MiniSearchIndex();
    idx.rebuild(entries());
    const hits = idx.search('生活');
    expect(hits[0]!.entry.title).toBe('周末闲笔');
  });

  it('rebuild 后旧条目不再命中', () => {
    const idx = new MiniSearchIndex();
    idx.rebuild(entries());
    expect(idx.search('拉面').length).toBeGreaterThan(0);
    idx.rebuild([]);
    expect(idx.search('拉面')).toEqual([]);
  });

  it('snippet 中包含 <mark> 高亮', () => {
    const idx = new MiniSearchIndex();
    idx.rebuild(entries());
    const hits = idx.search('搜索');
    expect(hits[0]!.snippet).toContain('<mark>');
  });
});

describe('makeSnippet', () => {
  it('空文本返回空', () => {
    expect(makeSnippet('', 'x')).toBe('');
  });
  it('未命中也返回前 win 字', () => {
    expect(makeSnippet('abcdef', 'xyz', 3)).toBe('abc');
  });
  it('查询只有空白时返回前 win 字', () => {
    expect(makeSnippet('hello world', '   ', 5)).toBe('hello');
  });
  it('命中后高亮命中字符', () => {
    const out = makeSnippet('hello world', 'world');
    expect(out).toContain('<mark>w</mark>');
    expect(out).toContain('<mark>d</mark>');
  });
});
