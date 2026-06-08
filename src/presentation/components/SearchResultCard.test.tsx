import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { createEntry, updateEntry } from '@/domain/entities/Entry';
import { SearchResultCard } from './SearchResultCard';

function renderCard(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe('<SearchResultCard />', () => {
  it('展示标题、片段、心情、天气、标签', () => {
    const e = updateEntry(createEntry({ title: 't', now: 1 }), {
      mood: 5,
      weather: { code: 'sunny', temp: 22 },
      tags: ['工作'],
      plainText: '一些文字',
      now: 2,
    });
    renderCard(<SearchResultCard entry={e} snippet="<mark>命</mark>中" />);
    expect(screen.getByText('t')).toBeInTheDocument();
    expect(screen.getByText(/22/)).toBeInTheDocument();
    expect(screen.getByText(/晴/)).toBeInTheDocument();
    expect(screen.getByText('#工作')).toBeInTheDocument();
  });

  it('未命名条目用占位', () => {
    const e = createEntry({});
    renderCard(<SearchResultCard entry={e} snippet="x" />);
    expect(screen.getByText('未命名')).toBeInTheDocument();
  });
});
