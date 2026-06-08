import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from '@/presentation/components/Calendar';
import { useEntryStore } from '@/presentation/state/entryStore';

export function CalendarPage() {
  const { entries, loaded, load } = useEntryStore();
  const [month, setMonth] = useState(() => new Date());
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
          onDayClick={(_d, dayEntries) => {
            if (dayEntries.length > 0) {
              navigate(`/entry/${dayEntries[0]!.id}`);
            }
          }}
        />
      </div>
    </div>
  );
}
