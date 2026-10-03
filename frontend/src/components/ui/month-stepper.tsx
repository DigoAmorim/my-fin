import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MonthPicker } from './month-picker';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { resolveDateLocales } from '../../lib/date-locales';

type MonthStepperProps = {
  value: string;
  onChange: (yearMonth: string) => void;
  locale?: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
  previousYearLabel: string;
  nextYearLabel: string;
};

function toMonthDate(value: string): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function MonthStepper({
  value,
  onChange,
  locale = 'pt-BR',
  previousMonthLabel,
  nextMonthLabel,
  previousYearLabel,
  nextYearLabel,
}: MonthStepperProps) {
  const [open, setOpen] = useState(false);
  const selectedMonth = toMonthDate(value);
  const { dateFnsLocale } = resolveDateLocales(locale);
  const formattedLabel = format(selectedMonth, 'MMMM yyyy', { locale: dateFnsLocale });
  const label = formattedLabel.charAt(0).toLocaleUpperCase(locale) + formattedLabel.slice(1);
  const compactLabel = selectedMonth.toLocaleDateString(locale, { month: '2-digit', year: 'numeric' });

  const shiftMonth = (offset: number) => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + offset, 1);
    onChange(toYearMonth(date));
  };

  return (
    <div className="flex min-w-0 items-center gap-1">
      <button
        type="button"
        aria-label={previousMonthLabel}
        onClick={() => shiftMonth(-1)}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={label}
            title={label}
            className="inline-flex min-w-0 items-center justify-center truncate rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/50 sm:min-w-[160px] sm:px-3"
          >
            <span className="sm:hidden">{compactLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-auto p-0">
          <MonthPicker
            locale={dateFnsLocale}
            selectedMonth={selectedMonth}
            previousYearLabel={previousYearLabel}
            nextYearLabel={nextYearLabel}
            onMonthSelect={(date) => {
              onChange(toYearMonth(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <button
        type="button"
        aria-label={nextMonthLabel}
        onClick={() => shiftMonth(1)}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}