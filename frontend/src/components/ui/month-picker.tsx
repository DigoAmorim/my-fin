import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, type Locale } from 'date-fns';
import { cn } from '../../lib/utils';

type MonthPickerProps = {
  selectedMonth?: Date;
  onMonthSelect?: (date: Date) => void;
  locale?: Locale;
  previousYearLabel?: string;
  nextYearLabel?: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
};

const MONTHS = [
  { number: 0, name: 'Jan' },
  { number: 1, name: 'Feb' },
  { number: 2, name: 'Mar' },
  { number: 3, name: 'Apr' },
  { number: 4, name: 'May' },
  { number: 5, name: 'Jun' },
  { number: 6, name: 'Jul' },
  { number: 7, name: 'Aug' },
  { number: 8, name: 'Sep' },
  { number: 9, name: 'Oct' },
  { number: 10, name: 'Nov' },
  { number: 11, name: 'Dec' },
];

export function MonthPicker({
  selectedMonth,
  onMonthSelect,
  locale,
  previousYearLabel = 'Previous year',
  nextYearLabel = 'Next year',
  className,
  minDate,
  maxDate,
}: MonthPickerProps) {
  const [menuYear, setMenuYear] = React.useState(
    () => selectedMonth?.getFullYear() ?? new Date().getFullYear(),
  );

  const selectedYear = selectedMonth?.getFullYear();
  const selectedMonthIndex = selectedMonth?.getMonth();

  return (
    <div className={cn('w-[252px] p-3', className)}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label={previousYearLabel}
          disabled={minDate ? menuYear - 1 < minDate.getFullYear() : false}
          onClick={() => setMenuYear((year) => year - 1)}
          className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-transparent text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-2 py-1 text-sm font-medium text-foreground">{menuYear}</span>
        <button
          type="button"
          aria-label={nextYearLabel}
          disabled={maxDate ? menuYear + 1 > maxDate.getFullYear() : false}
          onClick={() => setMenuYear((year) => year + 1)}
          className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-transparent text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {MONTHS.map((month) => {
          const date = new Date(menuYear, month.number, 1);
          const isSelected = selectedYear === menuYear && selectedMonthIndex === month.number;
          const isBeforeMin = minDate && (
            menuYear < minDate.getFullYear()
            || (menuYear === minDate.getFullYear() && month.number < minDate.getMonth())
          );
          const isAfterMax = maxDate && (
            menuYear > maxDate.getFullYear()
            || (menuYear === maxDate.getFullYear() && month.number > maxDate.getMonth())
          );
          const isDisabled = Boolean(isBeforeMin || isAfterMax);

          return (
            <button
              key={month.number}
              type="button"
              disabled={isDisabled}
              aria-pressed={isSelected}
              onClick={() => onMonthSelect?.(date)}
              className={cn(
                'flex h-10 w-full items-center justify-center rounded-lg text-sm capitalize transition-colors disabled:pointer-events-none',
                isSelected
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'text-foreground hover:bg-muted/60 disabled:opacity-30',
              )}
            >
              {locale ? format(date, 'MMM', { locale }) : month.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

MonthPicker.displayName = 'MonthPicker';