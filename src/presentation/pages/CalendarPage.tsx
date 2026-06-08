import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from '@/presentation/components/Calendar';
import { DayEntriesSheet } from '@/presentation/components/DayEntriesSheet';
import { useEntryStore } from '@/presentation/state/entryStore';
import type { Entry } from '@/domain/entities/Entry';

export function CalendarPage() {
  const { entries, loaded, load } = useEntryStore();
  const [month, setMonth] = useState(() => new Date());
  const [dayPick, setDayPick] = useState<{ date: Date; entries: Entry[] } | null>(
    null,
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-10 py-8 md:py-16">
      <h1 className="font-serif text-xl md:text-2xl mb-6">日历</h1>
      <div className="quiet-card p-3 md:p-6">
        <Calendar
          month={month}
          entries={entries}
          onMonthChange={setMonth}
          onDayClick={(date, dayEntries) => {
            if (dayEntries.length === 0) return;
            if (dayEntries.length === 1) {
              navigate(`/entry/${dayEntries[0]!.id}`);
              return;
            }
            setDayPick({ date, entries: dayEntries });
          }}
        />
      </div>

      <DayEntriesSheet
        open={dayPick !== null}
        date={dayPick?.date ?? null}
        entries={dayPick?.entries ?? []}
        onSelect={(e) => {
          setDayPick(null);
          navigate(`/entry/${e.id}`);
        }}
        onClose={() => setDayPick(null)}
      />
    </div>
  );
}
