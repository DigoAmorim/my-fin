import { useState } from 'react';
import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subYears,
  setMonth as setDateMonth,
  setYear as setDateYear,
  type Locale,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

type CalendarProps = {
  selected?: Date;
  defaultMonth?: Date;
  locale?: Locale;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
};

type View = 'days' | 'months' | 'years';
const YEAR_PAGE_SIZE = 12;

export function Calendar({
  selected,
  defaultMonth,
  locale,
  onSelect,
  className,
}: CalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => defaultMonth ?? selected ?? new Date());
  const [view, setView] = useState<View>('days');

  const currentYear = viewMonth.getFullYear();
  const yearPageStart = Math.floor(currentYear / YEAR_PAGE_SIZE) * YEAR_PAGE_SIZE;

  const goPrevious = () => {
    if (view === 'days') setViewMonth(subMonths(viewMonth, 1));
    else if (view === 'months') setViewMonth(subYears(viewMonth, 1));
    else setViewMonth(subYears(viewMonth, YEAR_PAGE_SIZE));
  };
  const goNext = () => {
    if (view === 'days') setViewMonth(addMonths(viewMonth, 1));
    else if (view === 'months') setViewMonth(addYears(viewMonth, 1));
    else setViewMonth(addYears(viewMonth, YEAR_PAGE_SIZE));
  };

  const headerLabel =
    view === 'days'
      ? format(viewMonth, 'LLLL yyyy', { locale })
      : view === 'months'
        ? format(viewMonth, 'yyyy', { locale })
        : `${yearPageStart} – ${yearPageStart + YEAR_PAGE_SIZE - 1}`;

  const onHeaderClick = () => {
    if (view === 'days') setView('months');
    else if (view === 'months') setView('years');
  };

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calendarStart = startOfWeek(monthStart, { locale });
  const calendarEnd = endOfWeek(monthEnd, { locale });

  const weeks: Date[][] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    const week: Date[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const weekdayLabels: string[] = [];
  for (let weekdayIndex = 0; weekdayIndex < 7; weekdayIndex += 1) {
    weekdayLabels.push(format(addDays(calendarStart, weekdayIndex), 'EEEEEE', { locale }));
  }

  return (
    <div className={cn('w-[252px] p-3', className)}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrevious}
          aria-label="Previous"
          className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-transparent text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={onHeaderClick}
          disabled={view === 'years'}
          className={cn(
            'rounded-md px-2 py-1 text-sm font-medium text-foreground capitalize transition-colors',
            view !== 'years' && 'cursor-pointer hover:bg-muted/60',
            view === 'years' && 'cursor-default',
          )}
        >
          {headerLabel}
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Next"
          className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-transparent text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {view === 'days' && (
        <>
          <div className="mb-1 grid grid-cols-7">
            {weekdayLabels.map((label, weekdayIndex) => (
              <div key={weekdayIndex} className="py-1 text-center text-[11px] font-medium text-muted-foreground">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weeks.map((week, weekIndex) =>
              week.map((date, dayIndex) => {
                const inMonth = isSameMonth(date, viewMonth);
                const isSelected = selected && isSameDay(date, selected);
                const isCurrentDay = isToday(date);

                return (
                  <button
                    key={`${weekIndex}-${dayIndex}`}
                    type="button"
                    onClick={() => onSelect?.(date)}
                    aria-pressed={!!isSelected}
                    className={cn(
                      'inline-flex size-8 items-center justify-center rounded-lg text-sm transition-colors',
                      !inMonth && 'text-muted-foreground/40',
                      inMonth && !isSelected && 'text-foreground hover:bg-muted/60',
                      isCurrentDay && !isSelected && 'bg-accent font-medium text-accent-foreground',
                      isSelected && 'bg-primary font-semibold text-primary-foreground',
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              }),
            )}
          </div>
        </>
      )}

      {view === 'months' && (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 12 }).map((_, monthIndex) => {
            const monthDate = setDateMonth(viewMonth, monthIndex);
            const isCurrentMonth = selected
              && selected.getFullYear() === monthDate.getFullYear()
              && selected.getMonth() === monthIndex;

            return (
              <button
                key={monthIndex}
                type="button"
                onClick={() => {
                  setViewMonth(monthDate);
                  setView('days');
                }}
                className={cn(
                  'h-10 rounded-lg text-sm capitalize transition-colors',
                  isCurrentMonth
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : 'text-foreground hover:bg-muted/60',
                )}
              >
                {format(monthDate, 'MMM', { locale })}
              </button>
            );
          })}
        </div>
      )}

      {view === 'years' && (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: YEAR_PAGE_SIZE }).map((_, yearIndex) => {
            const year = yearPageStart + yearIndex;
            const isCurrentYear = selected && selected.getFullYear() === year;

            return (
              <button
                key={year}
                type="button"
                onClick={() => {
                  setViewMonth(setDateYear(viewMonth, year));
                  setView('months');
                }}
                className={cn(
                  'h-10 rounded-lg text-sm transition-colors',
                  isCurrentYear
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : 'text-foreground hover:bg-muted/60',
                )}
              >
                {year}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}